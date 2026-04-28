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
//   - `speak()` — Piper TTS via subprocess to a `piper` binary on PATH (or
//      under opts.binPath). Voice models are .onnx + .json from
//      https://github.com/rhasspy/piper/blob/master/VOICES.md or
//      huggingface.co/rhasspy/piper-voices. Subprocess overhead is
//      ~50-150ms per call (espeak-ng init + onnxruntime load); for
//      real-time barge-in / streaming sentence-by-sentence TTS, the
//      direct-FFI integration tracked under LYK-758 keeps the model
//      loaded across calls and yields f32 frames per sentence at
//      native speed. Same public API on both versions, so callers
//      don't change when LYK-758 ships.

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
async function* listen(stream: AsyncIterable<AudioChunk>, opts: ListenOptions): AsyncIterableIterator<Utterance> {
  const sampleRate = opts.sampleRate;
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new RangeError("bun:speech.listen: opts.sampleRate must be > 0");
  }
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
      const utt = sealUtterance(noiseFloor);
      silenceRun = 0;
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
    if (utt) yield utt;
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

  const fs = require("node:fs");
  const fsPromises = require("node:fs/promises");
  const os = require("node:os");
  const path = require("node:path");
  // Builtin require returns the export shape directly, not the
  // ESM-style { default: ... } wrapper — same pattern transcribe()
  // uses for the whisper module above.
  const audio = require("./audio.ts");

  const modelPath = path.resolve(opts.model);
  if (!fs.existsSync(modelPath)) {
    throw new Error(`bun:speech.speak: voice model not found at "${modelPath}"`);
  }

  // Piper writes WAV when given --output_file; we route through a tmpfile
  // so we don't have to manage piper's --output-raw header-less stream
  // (which needs the voice .json's sample_rate to decode and adds error
  // surface for malformed JSON). The tmp path is scoped to a per-call
  // mkdtemp; cleanup happens unconditionally in finally.
  const bin = opts.binPath ?? "piper";
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "parabun-piper-"));
  const tmpWav = path.join(tmpDir, "out.wav");

  try {
    const cmd: string[] = [bin, "--model", modelPath, "--output_file", tmpWav];
    if (opts.sentenceSilenceMs !== undefined) {
      cmd.push("--sentence-silence", (opts.sentenceSilenceMs / 1000).toFixed(3));
    }

    // NOTE: would prefer `await using proc = Bun.spawn(...)` here but
    // JSC's BuiltinExecutables parser inside parabun's builtin modules
    // rejects `using` / `await using` syntax (works fine in user code).
    // Tracked as LYK-759. Manual cleanup with try/finally + .kill() is
    // the workaround.
    const proc = Bun.spawn({
      cmd,
      stdin: "pipe",
      stdout: "ignore",
      stderr: "pipe",
    });

    let exitCode: number;
    let stderrText: string;
    try {
      proc.stdin.write(text);
      await proc.stdin.end();
      [exitCode, stderrText] = await Promise.all([proc.exited, proc.stderr.text()]);
    } catch (err) {
      try {
        proc.kill();
      } catch {}
      throw err;
    }
    if (exitCode !== 0) {
      throw new Error(
        `bun:speech.speak: piper exited with code ${exitCode}.` +
          (stderrText ? ` stderr: ${stderrText.trim()}` : "") +
          ` (binary: ${bin})`,
      );
    }
    if (!fs.existsSync(tmpWav)) {
      throw new Error(`bun:speech.speak: piper completed but produced no output at ${tmpWav}`);
    }

    const wavBytes = new Uint8Array(await Bun.file(tmpWav).arrayBuffer());
    const wav = audio.readWav(wavBytes);
    return {
      samples: wav.samples,
      sampleRate: wav.sampleRate,
      channels: wav.channels,
    };
  } catch (err) {
    // ENOENT on spawn means piper isn't on PATH (or opts.binPath wrong).
    // Bun.spawn surfaces this as the awaited proc rejecting; surface a
    // clearer message than the raw libuv one.
    if ((err as { code?: string }).code === "ENOENT") {
      throw new Error(
        `bun:speech.speak: piper binary not found ("${opts.binPath ?? "piper"}"). ` +
          `Install from https://github.com/rhasspy/piper/releases or pass opts.binPath.`,
      );
    }
    throw err;
  } finally {
    // mkdtemp + the wav file inside it. Best-effort cleanup; ignore
    // ENOENT / EBUSY since we've already returned the audio data.
    try {
      await fsPromises.rm(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

export default {
  listen,
  transcribe,
  speak,
};
