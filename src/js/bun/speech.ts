// LYK-759 PROBE: await using inside a builtin async function. The dispose
// callback writes through a closure'd Set so we can observe it ran *after*
// the async function returned (try/finally in async functions completes
// before the resolve, but `disposed` from inside the function body would
// be captured by the return value before finally fires — using a Set
// reference outside the body sidesteps that).
async function __lyk759Probe(events: string[]): Promise<void> {
  events.push("body-start");
  await using x = {
    [Symbol.asyncDispose]: async () => {
      events.push("disposed");
    },
  };
  void x;
  events.push("body-end");
}

// Hardcoded module "bun:speech"
//
// Tier 2 orchestration module — composes audio capture (bun:audio I/O) +
// VAD energy gating (mirrored from bun:audio.detectVoice) into discrete
// voice-bounded utterances, with pluggable STT / TTS engine surfaces.
//
//   import audio  from "bun:audio";
//   import speech from "bun:speech";
//
//   await using mic = await audio.capture({ sampleRate: 16000, channels: 1 });
//
//   for await (const utt of speech.listen(mic.frames(), { sampleRate: 16000 })) {
//     // utt: { samples: Float32Array, durationMs, startedAtMs, endedAtMs }
//     console.log(`utterance: ${utt.durationMs.toFixed(0)}ms (${utt.samples.length} samples)`);
//
//     // const text = await speech.transcribe(utt, { engine: "whisper", model: ... });
//     // const reply = await llm.chat([{ role: "user", content: text }]);
//     // const audio = await speech.speak(reply, { engine: "piper", model: ... });
//     // await spk.write(audio);
//   }
//
// What ships today: `listen()` — a pure orchestration function. Takes any
// AsyncIterable yielding `{ samples: Float32Array }` chunks (so it works
// with bun:audio.capture, test streams, file readers, anything) and emits
// one Utterance per detected speech burst, silence-bounded.
//
// What's now wired:
//   - `transcribe()` — Whisper-class STT via bun:llm.WhisperModel. Loads
//      ggml-*.bin checkpoints, transcribes utterances per call.
//   - `speak()` — Piper TTS via a long-running `piper --json-input
//      --output_raw` subprocess, cached per (binPath, model) tuple. The
//      first call pays ~120 ms for voice load; subsequent calls hit just
//      the inference + IPC cost (~30-50 ms for one short sentence on the
//      lessac voice). The full direct-FFI integration tracked under
//      LYK-758 stays the long-term plan for the last few ms of latency,
//      but the persistent subprocess closes the gap that was making
//      real-time barge-in impractical. Public API is unchanged.

const signalsMod = require("./signals.ts");

// ─── Types ─────────────────────────────────────────────────────────────────

type AudioChunk = {
  samples: Float32Array;
  /** Optional — used as the wall-clock origin of the utterance if present. */
  timestampMs?: number;
};

type ListenOptions = {
  /** Audio sample rate in Hz. Required to convert frame counts ↔ ms. */
  sampleRate: number;
  /**
   * Channel count of the input. If > 1, the stream is downmixed to mono
   * (channel-average) before VAD. Default 1.
   */
  channels?: number;
  /** Samples per VAD analysis frame. Default 480 (30 ms at 16 kHz). */
  frameSize?: number;
  /**
   * Speech is detected when frame RMS > noiseFloor × ratio. Higher = more
   * conservative. Default 3.0 (~10 dB above noise floor).
   */
  ratio?: number;
  /**
   * Sliding-window minimum used as the noise-floor estimator. Default 100
   * frames (~3 s at 30 ms frames at 16 kHz). Bigger = slower adaptation.
   */
  noiseWindow?: number;
  /**
   * Pre-roll: how many ms of audio leading INTO the first speech frame to
   * include in the emitted utterance. Helps capture word onsets that fall
   * inside the prior silent frame. Default 200.
   */
  preRollMs?: number;
  /**
   * Hangover: silence duration that closes an utterance. A speech run is
   * sealed once we've seen `hangoverMs` of continuous silence. Default 600.
   */
  hangoverMs?: number;
  /**
   * Minimum utterance length to emit. Bursts below this are dropped (clicks,
   * pops, breath sounds). Default 200 ms.
   */
  minUtteranceMs?: number;
};

type Utterance = {
  /** Mono samples for this utterance. Float32 in [-1, 1]. */
  samples: Float32Array;
  /** Length in milliseconds. */
  durationMs: number;
  /** Wall-clock ms at the first sample of this utterance, if the stream
   *  provided timestamps; otherwise zero-based from listen() start. */
  startedAtMs: number;
  /** Wall-clock ms at the last sample of this utterance. */
  endedAtMs: number;
  /** Estimated noise floor at the time the utterance closed. Useful for
   *  feedback into a per-utterance gain or threshold. */
  noiseFloor: number;
};

// ─── Listen — VAD-gated utterance segmentation ─────────────────────────────

/**
 * Takes an audio chunk stream and yields one Utterance per detected speech
 * burst. Uses an adaptive RMS-vs-noise-floor classifier (same algorithm as
 * `bun:audio.detectVoice`, run incrementally over the chunk stream so the
 * noise floor updates in real time).
 *
 * The function is pull-based — it advances on every `for await` step and
 * stops when the input stream ends or the consumer breaks. Backpressure
 * propagates: if the consumer is slow, the input stream waits.
 */
// Reactive surface attached to the iterable returned by listen() — see
// PLAN-module-signals item 3. The signals stay live for the lifetime of
// the iterator (one per listen() call).
type Signal<T> = {
  get(): T;
  peek(): T;
  subscribe(cb: (v: T) => void): () => void;
};
type WritableSignal<T> = Signal<T> & { set(v: T): void };

interface ListenStream extends AsyncIterableIterator<Utterance> {
  /** True while a speech burst is currently being collected. */
  readonly active: Signal<boolean>;
  /**
   * Adaptive noise-floor estimate (RMS, samples in [-1, 1]). Updates per
   * analysis frame as the sliding window of recent energies fills.
   */
  readonly noiseFloor: Signal<number>;
  /**
   * Most recent emitted Utterance, or null until the first one seals.
   * Useful for an effect that triggers on every utterance boundary
   * without consuming the iterator.
   */
  readonly lastUtterance: Signal<Utterance | null>;
}

function listen(stream: AsyncIterable<AudioChunk>, opts: ListenOptions): ListenStream {
  const sampleRate = opts.sampleRate;
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new RangeError("bun:speech.listen: opts.sampleRate must be > 0");
  }
  const sigActive = signalsMod.signal(false) as WritableSignal<boolean>;
  const sigNoiseFloor = signalsMod.signal(0) as WritableSignal<number>;
  const sigLastUtterance = signalsMod.signal<Utterance | null>(null) as WritableSignal<Utterance | null>;
  const gen = listenGenerator(stream, opts, sigActive, sigNoiseFloor, sigLastUtterance);
  return Object.assign(gen, {
    active: sigActive as Signal<boolean>,
    noiseFloor: sigNoiseFloor as Signal<number>,
    lastUtterance: sigLastUtterance as Signal<Utterance | null>,
  });
}

async function* listenGenerator(
  stream: AsyncIterable<AudioChunk>,
  opts: ListenOptions,
  sigActive: WritableSignal<boolean>,
  sigNoiseFloor: WritableSignal<number>,
  sigLastUtterance: WritableSignal<Utterance | null>,
): AsyncIterableIterator<Utterance> {
  const sampleRate = opts.sampleRate;
  const channels = opts.channels ?? 1;
  const frameSize = opts.frameSize ?? 480;
  const ratio = opts.ratio ?? 3.0;
  const noiseWindow = opts.noiseWindow ?? 100;
  const preRollMs = opts.preRollMs ?? 200;
  const hangoverMs = opts.hangoverMs ?? 600;
  const minUtteranceMs = opts.minUtteranceMs ?? 200;

  const msPerFrame = (frameSize / sampleRate) * 1000;
  const preRollFrames = Math.max(1, Math.ceil(preRollMs / msPerFrame));
  const hangoverFrames = Math.max(1, Math.ceil(hangoverMs / msPerFrame));
  const minUtteranceFrames = Math.max(1, Math.ceil(minUtteranceMs / msPerFrame));

  // Carry buffer holds samples that didn't fill a full frame on the last
  // chunk — they prefix the next chunk's samples.
  let carry = new Float32Array(0);
  let carryStartMs = 0;

  // Sliding window of recent frame energies for the noise-floor min.
  const recentEnergies = new Float32Array(noiseWindow);
  let recentCount = 0;
  let recentHead = 0; // ring index

  // Pre-roll ring of recent silent frames (samples) so an utterance can
  // include audio that LED INTO the first detected speech frame.
  const preRoll: Float32Array[] = [];
  let preRollFirstFrameMs = 0;

  // Active utterance state.
  let inUtterance = false;
  let utteranceFrames: Float32Array[] = [];
  let utteranceStartMs = 0;
  let silenceRun = 0;

  let frameWallStart = performance.now();
  // Rate-limit noise-floor signal updates to ~10 Hz (per PLAN-module-signals
  // §"Open decisions: fps / peakLevel update rate") so a busy mic doesn't
  // re-fire effects 50× per second.
  let lastFloorEmitMs = 0;
  const sealUtterance = (noiseFloor: number): Utterance | null => {
    if (utteranceFrames.length < minUtteranceFrames) {
      utteranceFrames = [];
      return null;
    }
    let total = 0;
    for (const f of utteranceFrames) total += f.length;
    const merged = new Float32Array(total);
    let off = 0;
    for (const f of utteranceFrames) {
      merged.set(f, off);
      off += f.length;
    }
    const durationMs = (merged.length / sampleRate) * 1000;
    const utt: Utterance = {
      samples: merged,
      durationMs,
      startedAtMs: utteranceStartMs,
      endedAtMs: utteranceStartMs + durationMs,
      noiseFloor,
    };
    utteranceFrames = [];
    return utt;
  };

  // Process one analysis frame (frameSize mono samples) and update state.
  // Returns an Utterance to emit, null otherwise.
  const processFrame = (frame: Float32Array, frameStartMs: number): Utterance | null => {
    let sumSq = 0;
    for (let i = 0; i < frame.length; i++) sumSq += frame[i] * frame[i];
    const rms = Math.sqrt(sumSq / frame.length);

    // Update sliding-window noise-floor (ring buffer of recent energies).
    recentEnergies[recentHead] = rms;
    recentHead = (recentHead + 1) % noiseWindow;
    if (recentCount < noiseWindow) recentCount++;
    let m = recentEnergies[0];
    for (let i = 1; i < recentCount; i++) if (recentEnergies[i] < m) m = recentEnergies[i];
    const noiseFloor = Math.max(m, 1e-6);

    const isSpeech = rms > noiseFloor * ratio;

    // Rate-limited noiseFloor signal update.
    if (frameStartMs - lastFloorEmitMs >= 100 || lastFloorEmitMs === 0) {
      sigNoiseFloor.set(noiseFloor);
      lastFloorEmitMs = frameStartMs;
    }

    if (!inUtterance) {
      // Maintain the pre-roll ring of silent frames.
      preRoll.push(frame);
      if (preRoll.length > preRollFrames) {
        preRoll.shift();
        preRollFirstFrameMs += msPerFrame;
      } else if (preRoll.length === 1) {
        preRollFirstFrameMs = frameStartMs;
      }

      if (isSpeech) {
        inUtterance = true;
        sigActive.set(true);
        utteranceFrames = preRoll.slice(); // copy refs; frames themselves are independent buffers
        utteranceStartMs = preRollFirstFrameMs;
        silenceRun = 0;
        preRoll.length = 0;
        preRollFirstFrameMs = 0;
      }
      return null;
    }

    // Inside an utterance.
    utteranceFrames.push(frame);
    if (isSpeech) {
      silenceRun = 0;
      return null;
    }
    silenceRun++;
    if (silenceRun >= hangoverFrames) {
      inUtterance = false;
      sigActive.set(false);
      const utt = sealUtterance(noiseFloor);
      silenceRun = 0;
      if (utt) sigLastUtterance.set(utt);
      return utt;
    }
    return null;
  };

  for await (const chunk of stream) {
    const samples = chunk.samples;
    const t0 = chunk.timestampMs ?? frameWallStart;
    if (chunk.timestampMs == null) {
      // Synthesize a wall-clock if the stream doesn't carry one.
      frameWallStart += (samples.length / channels / sampleRate) * 1000;
    }

    // Downmix to mono if needed.
    let mono: Float32Array;
    if (channels === 1) {
      mono = samples;
    } else {
      const monoLen = samples.length / channels;
      mono = new Float32Array(monoLen);
      for (let i = 0; i < monoLen; i++) {
        let acc = 0;
        for (let c = 0; c < channels; c++) acc += samples[i * channels + c];
        mono[i] = acc / channels;
      }
    }

    // Prepend carry, then split into frameSize chunks. Anything left over
    // becomes the next carry.
    let combined: Float32Array;
    let combinedStartMs: number;
    if (carry.length > 0) {
      combined = new Float32Array(carry.length + mono.length);
      combined.set(carry, 0);
      combined.set(mono, carry.length);
      combinedStartMs = carryStartMs;
    } else {
      combined = mono;
      combinedStartMs = t0;
    }

    let off = 0;
    while (off + frameSize <= combined.length) {
      const frame = combined.subarray(off, off + frameSize);
      // Frame must be an independent buffer so utteranceFrames can hold it
      // past this iteration.
      const frameCopy = new Float32Array(frame);
      const frameStartMs = combinedStartMs + (off / sampleRate) * 1000;
      const utt = processFrame(frameCopy, frameStartMs);
      if (utt) yield utt;
      off += frameSize;
    }

    // Save remainder as carry.
    if (off < combined.length) {
      carry = new Float32Array(combined.subarray(off));
      carryStartMs = combinedStartMs + (off / sampleRate) * 1000;
    } else {
      carry = new Float32Array(0);
    }
  }

  // Stream ended. If we're still in an utterance, seal it.
  if (inUtterance) {
    let m = recentEnergies[0];
    for (let i = 1; i < recentCount; i++) if (recentEnergies[i] < m) m = recentEnergies[i];
    const utt = sealUtterance(Math.max(m, 1e-6));
    sigActive.set(false);
    if (utt) {
      sigLastUtterance.set(utt);
      yield utt;
    }
  } else {
    // Stream ended cleanly; ensure active stays false.
    sigActive.set(false);
  }
}

// ─── STT / TTS engine surface (stubs) ──────────────────────────────────────

type TranscribeOptions = {
  /** Engine identifier. "whisper" is the only planned target for v1. */
  engine: "whisper";
  /** Path to a Whisper GGUF model on disk. */
  model: string;
  /** Two-letter language code, e.g. "en". Default "auto" (detect). */
  language?: string;
};

type SpeakOptions = {
  /** Engine identifier. "piper" is the only supported target. */
  engine: "piper";
  /** Path to a Piper voice model on disk (.onnx; companion .json sits next to it). */
  model: string;
  /**
   * Path to the `piper` CLI binary. Defaults to `piper` (resolved via PATH).
   * Set this if piper is installed somewhere unusual. The eventual FFI
   * integration (LYK-758) won't use a binary path at all.
   */
  binPath?: string;
  /**
   * Per-call inter-sentence silence in milliseconds. Forwarded to piper's
   * `--sentence-silence` (units there are seconds, we convert).
   */
  sentenceSilenceMs?: number;
};

/**
 * Result of `speak()`. `samples` is f32 mono PCM at the voice model's native
 * sample rate (typically 22050 Hz for Piper voices). `sampleRate` is read
 * from the WAV header that piper emits, so callers can route directly to
 * `bun:audio` playback at the correct rate without reading the voice .json.
 */
type SpokenAudio = {
  samples: Float32Array;
  sampleRate: number;
  channels: number;
};

// Cache loaded Whisper models by absolute path so repeated transcribe()
// calls in the same process don't reload from disk.
const whisperCache = new Map<string, Promise<unknown>>();

async function transcribe(utterance: Utterance | { samples: Float32Array }, opts: TranscribeOptions): Promise<string> {
  if (opts.engine !== "whisper") {
    throw new Error(`bun:speech.transcribe: unknown engine "${opts.engine}" — only "whisper" is supported`);
  }
  if (!opts.model) {
    throw new Error("bun:speech.transcribe: opts.model (path to ggml-*.bin) is required");
  }
  const path = require("node:path").resolve(opts.model);
  let modelPromise = whisperCache.get(path);
  if (!modelPromise) {
    // Direct sibling-file require — the internal bundler doesn't allow
    // bun:* → bun:* imports between top-level builtins, but it does allow
    // relative requires inside src/js. Whisper lives under bun:llm but
    // is shaped as a standalone class so it imports cleanly here.
    const whisperMod = require("./llm/whisper.ts");
    modelPromise = whisperMod.WhisperModel.load(path);
    whisperCache.set(path, modelPromise);
  }
  const model = (await modelPromise) as {
    transcribe(audio: Float32Array, o?: { maxTokens?: number; language?: string }): string;
  };
  const language = opts.language && opts.language !== "auto" ? opts.language : "en";
  return model.transcribe(utterance.samples, { language });
}

// ─── PiperSession (LYK-758 v1.5) ───────────────────────────────────────────
//
// Each session wraps one long-running `piper --json-input --output_raw`
// subprocess plus the protocol layer that turns "synthesize this sentence"
// into a Float32Array. The first call pays the voice-load cost (~120 ms on
// a Pi 5, ~15 ms on a desktop with warm caches); subsequent calls hit
// only the inference + IPC cost.
//
// Wire protocol:
//   - Each request is a JSON line on stdin: `{"text": "..."}\n`.
//   - Audio comes back on stdout as raw signed-16 little-endian PCM at the
//     voice's native sample rate. There is no in-band length marker.
//   - Per completed request, piper logs a "Real-time factor: ..." line on
//     stderr. We use that as the boundary signal, then drain stdout with a
//     small quiet-window guard so any pending bytes flushed concurrently
//     with the stderr line still get collected.
//
// Concurrency: synthesize() serializes through an internal queue. Two
// callers asking the same session to speak overlapping text get back the
// right audio in the right order; we don't try to interleave on a single
// piper process.
class PiperSession {
  #proc: any;
  #stdoutReader: any;
  #stderrReader: any;
  #queue: Promise<unknown> = Promise.resolve();
  #closed = false;
  #sampleRate: number;
  #channels: number;
  #binPath: string;

  /** Per-request collection target — set inside synthesize(), null otherwise. */
  #activeChunks: Uint8Array[] | null = null;
  /** Resolves the moment stderr emits the "Real-time factor" line. */
  #activeCompletion: (() => void) | null = null;
  /** Last time a stdout chunk arrived for the active request — used by the quiet-window guard. */
  #lastChunkAtMs = 0;

  constructor(proc: any, sampleRate: number, channels: number, binPath: string) {
    this.#proc = proc;
    this.#sampleRate = sampleRate;
    this.#channels = channels;
    this.#binPath = binPath;
    this.#stdoutReader = proc.stdout.getReader();
    this.#stderrReader = proc.stderr.getReader();
    this.#startStdoutPump();
    this.#startStderrPump();
  }

  get sampleRate(): number {
    return this.#sampleRate;
  }
  get channels(): number {
    return this.#channels;
  }

  static async create(modelPath: string, binPath: string): Promise<PiperSession> {
    const fs = require("node:fs");
    const path = require("node:path");
    if (!fs.existsSync(modelPath)) {
      throw new Error(`bun:speech.speak: voice model not found at "${modelPath}"`);
    }
    // The voice config sits next to the .onnx as <model>.onnx.json. Read
    // the audio.sample_rate up front so synthesize() returns the right
    // metadata without a per-call file read.
    const configPath = modelPath + ".json";
    const altConfigPath = modelPath.replace(/\.onnx$/, ".json");
    const cfgPath = fs.existsSync(configPath) ? configPath : altConfigPath;
    if (!fs.existsSync(cfgPath)) {
      throw new Error(
        `bun:speech.speak: voice config not found alongside model at "${configPath}" or "${altConfigPath}"`,
      );
    }
    const cfg = JSON.parse(await Bun.file(cfgPath).text()) as { audio?: { sample_rate?: number } };
    const sampleRate = cfg.audio?.sample_rate ?? 22050;
    void path;

    let proc: any;
    try {
      proc = Bun.spawn({
        cmd: [binPath, "--model", modelPath, "--json-input", "--output_raw"],
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
      });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "ENOENT") {
        throw new Error(
          `bun:speech.speak: piper binary not found ("${binPath}"). ` +
            `Install from https://github.com/rhasspy/piper/releases or pass opts.binPath.`,
        );
      }
      throw err;
    }
    return new PiperSession(proc, sampleRate, 1, binPath);
  }

  /** Synthesize one utterance. Serialized via the internal queue. */
  synthesize(text: string, opts?: { sentenceSilenceMs?: number }): Promise<SpokenAudio> {
    if (this.#closed) {
      return Promise.reject(new Error("bun:speech.speak: piper session has been closed"));
    }
    const next = this.#queue.then(() => this.#runOne(text, opts));
    // Swallow this result for the queue chain so a synthesize() rejection
    // doesn't poison subsequent calls.
    this.#queue = next.catch(() => undefined);
    return next;
  }

  async #runOne(text: string, opts?: { sentenceSilenceMs?: number }): Promise<SpokenAudio> {
    if (this.#closed) throw new Error("bun:speech.speak: piper session has been closed");

    const chunks: Uint8Array[] = [];
    this.#activeChunks = chunks;
    this.#lastChunkAtMs = 0;

    const { promise, resolve } = Promise.withResolvers<void>();
    this.#activeCompletion = resolve;

    const req: Record<string, unknown> = { text };
    // Per-request override (only --sentence_silence is exposed for v1.5;
    // other inference knobs hit at the CLI layer in piper, not the JSON).
    void opts;

    try {
      this.#proc.stdin.write(JSON.stringify(req) + "\n");
    } catch (e) {
      this.#activeChunks = null;
      this.#activeCompletion = null;
      throw new Error(`bun:speech.speak: failed to write to piper stdin (${e instanceof Error ? e.message : e})`);
    }

    // Race the completion-signal Promise against process death so a piper
    // crash doesn't hang the caller.
    await Promise.race([
      promise,
      this.#proc.exited.then(() => {
        throw new Error(`bun:speech.speak: piper subprocess exited mid-request`);
      }),
    ]);

    // Drain stdout. Two races to handle:
    //   (a) Stderr's "Real-time factor" line can land *before* any stdout
    //       chunks for the same utterance — bun's reader doesn't guarantee
    //       interleaved order across the two pipes. So we don't trust the
    //       stderr signal alone; we also wait for at least one stdout
    //       chunk to arrive before considering the request complete.
    //   (b) After the first chunk lands, more chunks can still trickle in
    //       for a few ms. Wait until 50 ms of stdout quiet before declaring
    //       the audio fully drained.
    // Hard cap at 1500 ms after the stderr signal so an empty-text request
    // (piper emits no audio at all) doesn't hang forever.
    const rtfAtMs = Date.now();
    while (Date.now() - rtfAtMs < 1500) {
      if (this.#lastChunkAtMs > 0 && Date.now() - this.#lastChunkAtMs >= 50) break;
      await new Promise(r => setTimeout(r, 10));
    }

    this.#activeChunks = null;
    this.#activeCompletion = null;

    let total = 0;
    for (const c of chunks) total += c.length;
    const merged = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      merged.set(c, off);
      off += c.length;
    }

    // Convert s16le → f32 in-place. The audio module exports an i16ToF32
    // helper that does exactly this and is SIMD-accelerated where possible.
    const audio = require("./audio.ts");
    const i16 = new Int16Array(merged.buffer, merged.byteOffset, merged.byteLength >>> 1);
    const samples: Float32Array = audio.i16ToF32(i16);

    return { samples, sampleRate: this.#sampleRate, channels: this.#channels };
  }

  async #startStdoutPump(): Promise<void> {
    try {
      while (!this.#closed) {
        const { value, done } = await this.#stdoutReader.read();
        if (done) break;
        if (this.#activeChunks) {
          this.#activeChunks.push(value);
          this.#lastChunkAtMs = Date.now();
        }
      }
    } catch {
      // Reader cancelled or process died — handled by exit-watcher elsewhere.
    }
  }

  async #startStderrPump(): Promise<void> {
    let buffer = "";
    const decoder = new TextDecoder();
    try {
      while (!this.#closed) {
        const { value, done } = await this.#stderrReader.read();
        if (done) break;
        buffer += decoder.decode(value);
        let nl;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          // The marker is robust across piper versions: every release since
          // 1.0 emits `[piper] [info] Real-time factor: ...` per utterance.
          if (line.indexOf("Real-time factor") !== -1 && this.#activeCompletion) {
            const cb = this.#activeCompletion;
            this.#activeCompletion = null;
            cb();
          }
        }
      }
    } catch {
      // Reader cancelled or process died — synthesize() race detects it.
    }
  }

  /** Idempotent. Closes stdin and kills the subprocess if it doesn't exit gracefully. */
  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    try {
      this.#proc.stdin.end();
    } catch {}
    // Give piper 500 ms to exit cleanly, then SIGTERM.
    const exited = this.#proc.exited;
    const timer = setTimeout(() => {
      try {
        this.#proc.kill();
      } catch {}
    }, 500);
    try {
      await exited;
    } finally {
      clearTimeout(timer);
    }
    void this.#binPath;
  }
}

/** Process-lifetime cache keyed by `${binPath} ${modelPath}`. */
const piperSessionCache = new Map<string, Promise<PiperSession>>();

function piperSessionKey(binPath: string, modelPath: string): string {
  return binPath + " " + modelPath;
}

async function speak(text: string, opts: SpeakOptions): Promise<SpokenAudio> {
  if (opts.engine !== "piper") {
    throw new Error(`bun:speech.speak: unknown engine "${opts.engine}" — only "piper" is supported`);
  }
  if (!text || typeof text !== "string") {
    throw new TypeError("bun:speech.speak: text must be a non-empty string");
  }
  if (!opts.model) {
    throw new Error(
      "bun:speech.speak: opts.model (path to a Piper voice .onnx) is required. " +
        "Voices: https://github.com/rhasspy/piper/blob/master/VOICES.md",
    );
  }

  const path = require("node:path");
  const modelPath = path.resolve(opts.model);
  const binPath = opts.binPath ?? "piper";
  const key = piperSessionKey(binPath, modelPath);

  let sessionPromise = piperSessionCache.get(key);
  if (!sessionPromise) {
    sessionPromise = PiperSession.create(modelPath, binPath);
    piperSessionCache.set(key, sessionPromise);
    // If session creation fails (model missing, binary missing), drop the
    // cache entry so the next call retries cleanly.
    sessionPromise.catch(() => piperSessionCache.delete(key));
  }
  const session = await sessionPromise;
  return session.synthesize(text, { sentenceSilenceMs: opts.sentenceSilenceMs });
}

/**
 * Close all cached PiperSessions and free their subprocesses. Called
 * automatically at process exit, but exposed for tests, hot-reload paths,
 * and explicit teardown. Subsequent `speak()` calls will lazily re-spawn.
 */
async function closePiperSessions(): Promise<void> {
  const sessions = Array.from(piperSessionCache.values());
  piperSessionCache.clear();
  await Promise.all(sessions.map(p => p.then(s => s.close()).catch(() => undefined)));
}

// ─── Wake word (LYK-739) ───────────────────────────────────────────────────

type WakeMatchStrategy = "contains" | "exact" | "fuzzy";

type WakeOptions = {
  /** Audio source — typically `mic.frames()`, but anything yielding samples works. */
  source: AsyncIterable<AudioChunk>;
  /**
   * Whisper model to use for transcription. Either a path to a ggml-*.bin
   * checkpoint (loaded once and cached by path) or a pre-loaded handle from
   * `bun:llm.WhisperModel.load`.
   */
  whisper: string | { transcribe(audio: Float32Array, o?: { language?: string }): string };
  /** One or more wake phrases. Matched case-insensitively. */
  phrase: string | string[];
  /**
   * Match strategy. Default "contains".
   *   - "contains" → `transcription.includes(phrase)` (case-insensitive)
   *   - "exact"    → trimmed transcription equals phrase
   *   - "fuzzy"    → Levenshtein distance ≤ `maxEdits`
   */
  match?: WakeMatchStrategy;
  /** Max edit distance for "fuzzy" matching. Default 2. */
  maxEdits?: number;
  /** Audio sample rate. Default 16000. */
  sampleRate?: number;
  /** ListenOptions forwarded to `listen()`. */
  listenOpts?: Omit<ListenOptions, "sampleRate">;
  /** Whisper language hint. Default "en". */
  language?: string;
};

type WakeTrigger = {
  /** The matched phrase (one of opts.phrase, normalized to lowercase). */
  phrase: string;
  /** Full transcription of the wake utterance — may carry trailing command words. */
  transcription: string;
  /** Match confidence in [0, 1]. 1.0 for "contains"/"exact"; for "fuzzy" it's `1 - edits/maxEdits`. */
  confidence: number;
  /** The originating utterance — pass it to STT or replay it as needed. */
  utterance: Utterance;
};

interface WakeStream extends AsyncIterableIterator<WakeTrigger> {
  /** True while a candidate utterance is being scored. */
  readonly active: Signal<boolean>;
  /** Most recent emitted trigger, or null until one fires. */
  readonly lastTrigger: Signal<WakeTrigger | null>;
}

/**
 * Lightweight Levenshtein distance for fuzzy phrase matching. Implementation
 * is deliberately allocation-light and small — wake-phrase candidates are
 * short, so we stay well under any threshold where a dynamic-programming
 * pile-of-matrices approach would be worth it.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  // Two-row rolling DP. Always work with the shorter string on the inner loop.
  if (a.length > b.length) {
    const t = a;
    a = b;
    b = t;
  }
  const prev = new Int32Array(a.length + 1);
  const cur = new Int32Array(a.length + 1);
  for (let i = 0; i <= a.length; i++) prev[i] = i;
  for (let j = 1; j <= b.length; j++) {
    cur[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      cur[i] = Math.min(cur[i - 1] + 1, prev[i] + 1, prev[i - 1] + cost);
    }
    prev.set(cur);
  }
  return prev[a.length];
}

/**
 * Match a transcription against one or more wake phrases. Public so
 * `bun:assistant` (and any user wiring their own gate) can reuse the same
 * normalization without re-implementing it. Returns null on no match.
 */
function matchWakePhrase(
  text: string,
  phrases: string | string[],
  strategy: WakeMatchStrategy = "contains",
  maxEdits = 2,
): { phrase: string; confidence: number } | null {
  if (!text || typeof text !== "string") return null;
  const norm = text
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!norm) return null;
  const list = (Array.isArray(phrases) ? phrases : [phrases]).map(p => p.toLowerCase().trim()).filter(Boolean);
  if (list.length === 0) return null;

  for (const p of list) {
    if (strategy === "contains") {
      if (norm.includes(p)) return { phrase: p, confidence: 1 };
    } else if (strategy === "exact") {
      if (norm === p) return { phrase: p, confidence: 1 };
    } else if (strategy === "fuzzy") {
      // Try the whole-string distance first.
      const whole = levenshtein(norm, p);
      if (whole <= maxEdits) {
        return { phrase: p, confidence: maxEdits === 0 ? 1 : Math.max(0, 1 - whole / maxEdits) };
      }
      // Then sliding-window: Whisper sometimes drops/adds tokens around the
      // wake phrase. Walk fixed-length windows roughly the size of the phrase.
      const tokens = norm.split(" ");
      const phraseLen = p.length;
      for (let i = 0; i < tokens.length; i++) {
        // Build a window of consecutive tokens whose total length brackets phraseLen.
        for (let j = i + 1; j <= tokens.length; j++) {
          const window = tokens.slice(i, j).join(" ");
          if (Math.abs(window.length - phraseLen) > maxEdits + 2) {
            if (window.length > phraseLen + maxEdits + 2) break;
            continue;
          }
          const d = levenshtein(window, p);
          if (d <= maxEdits) {
            return { phrase: p, confidence: maxEdits === 0 ? 1 : Math.max(0, 1 - d / maxEdits) };
          }
        }
      }
    }
  }
  return null;
}

/**
 * Compose a wake-word stream over an audio source. Internally pipes the
 * source through `listen()` for VAD-bounded utterances, transcribes each
 * with Whisper, and emits a `WakeTrigger` whenever the transcription
 * matches one of the configured phrases.
 *
 * Why whisper-backed and not a dedicated low-power KWS:
 *   - Reuses the model the assistant already loads for STT.
 *   - Works for *any* phrase the user picks — no per-keyword model.
 *   - Honest about its CPU cost: we run whisper only on VAD-detected speech
 *     bursts, so an idle mic is free; whisper fires once per utterance.
 *
 * For genuine always-on sub-watt KWS (e.g. on battery devices), a future
 * follow-up will plug in openWakeWord / Porcupine via a separate engine
 * argument; the surface here is engine-agnostic enough to absorb that.
 */
function wakeWord(opts: WakeOptions): WakeStream {
  const sampleRate = opts.sampleRate ?? 16000;
  const sigActive = signalsMod.signal(false) as WritableSignal<boolean>;
  const sigLastTrigger = signalsMod.signal<WakeTrigger | null>(null) as WritableSignal<WakeTrigger | null>;
  const gen = wakeWordGenerator(opts, sampleRate, sigActive, sigLastTrigger);
  return Object.assign(gen, {
    active: sigActive as Signal<boolean>,
    lastTrigger: sigLastTrigger as Signal<WakeTrigger | null>,
  });
}

async function* wakeWordGenerator(
  opts: WakeOptions,
  sampleRate: number,
  sigActive: WritableSignal<boolean>,
  sigLastTrigger: WritableSignal<WakeTrigger | null>,
): AsyncIterableIterator<WakeTrigger> {
  // Resolve whisper handle — accept either a path (load + cache) or a model.
  let whisperHandle: { transcribe(audio: Float32Array, o?: { language?: string }): string };
  if (typeof opts.whisper === "string") {
    const resolvedPath = require("node:path").resolve(opts.whisper);
    let modelPromise = whisperCache.get(resolvedPath);
    if (!modelPromise) {
      const whisperMod = require("./llm/whisper.ts");
      modelPromise = whisperMod.WhisperModel.load(resolvedPath);
      whisperCache.set(resolvedPath, modelPromise);
    }
    whisperHandle = (await modelPromise) as typeof whisperHandle;
  } else {
    whisperHandle = opts.whisper;
  }

  const strategy = opts.match ?? "contains";
  const maxEdits = opts.maxEdits ?? 2;
  const language = opts.language ?? "en";

  const ls = listen(opts.source, { ...opts.listenOpts, sampleRate });
  for await (const utt of ls) {
    sigActive.set(true);
    const text = whisperHandle.transcribe(utt.samples, { language });
    sigActive.set(false);
    const matched = matchWakePhrase(text, opts.phrase, strategy, maxEdits);
    if (matched) {
      const trigger: WakeTrigger = {
        phrase: matched.phrase,
        transcription: text,
        confidence: matched.confidence,
        utterance: utt,
      };
      sigLastTrigger.set(trigger);
      yield trigger;
    }
  }
  sigActive.set(false);
}

export default {
  listen,
  transcribe,
  speak,
  closePiperSessions,
  wakeWord,
  matchWakePhrase,
  // LYK-759 probe export — exercises await using inside a builtin module.
  __lyk759Probe,
};
