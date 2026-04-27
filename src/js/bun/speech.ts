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
// What doesn't ship yet:
//   - `transcribe()` — Whisper-class STT requires encoder-decoder transformer
//      support in bun:llm (the existing Llama / Qwen2 path is decoder-only).
//   - `speak()` — Piper TTS requires libpiper or ONNX runtime as a vendored
//      dependency. Both surface as plug-in engines once those land.
//
// Both stubs are reachable today and throw with a clear roadmap pointer.

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
  /** Engine identifier. "piper" is the only planned target for v1. */
  engine: "piper";
  /** Path to a Piper voice model on disk (.onnx + .json). */
  model: string;
  /** Output sample rate. Defaults to whatever the voice model produces. */
  sampleRate?: number;
};

const SPEAK_NOT_IMPL =
  "bun:speech.speak: Piper TTS requires libpiper or ONNX runtime as a vendored dep — " +
  "neither is wired yet. Tracked in the roadmap as bun:speech (Tier 2).";

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

async function speak(_text: string, _opts: SpeakOptions): Promise<Float32Array> {
  throw new Error(SPEAK_NOT_IMPL);
}

export default {
  listen,
  transcribe,
  speak,
};
