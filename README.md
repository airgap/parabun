<h1 align="center">Parabun</h1>

<p align="center">
  A fork of <a href="https://bun.com">Bun</a> with the hardware-acceleration primitives JavaScript forgot.<br/>
  Multithreaded compute, raw GPU kernels, SIMD intrinsics, and direct hardware access — from plain TypeScript.
</p>

## What Parabun fixes about JavaScript

Standard JavaScript runtimes leave performance on the table that the underlying hardware can deliver:

- **Multithreading is awkward.** `worker_threads` makes you reach for `postMessage` and structured-clone for every shared bit of state. No real shared mutable memory without manual `SharedArrayBuffer` + `Atomics` choreography.
- **GPU access is portable-shader-only.** WebGPU and WebGL are the only mainstream options; raw CUDA / Metal kernels aren't reachable from JS without writing an N-API binding.
- **SIMD lives in WebAssembly.** Native intrinsics aren't directly addressable from JS — you compile a WASM module and pay the boundary cost.
- **Typed-array operations are sequential.** No parallel sort, no parallel map, no parallel reduce in the runtime itself.
- **Hardware I/O wants an N-API module.** V4L2 cameras, ALSA audio, GGUF inference — anything that touches a kernel device means writing a binding (or shelling out to `ffmpeg` / Python).

Parabun closes those gaps inside one statically-linked binary:

| Module | What it gives you |
|---|---|
| [`@para/parallel`](#parallel-execution-paraparallel) | Persistent worker pool with `pmap` / `preduce`, SAB-shared state via `@para/arena` |
| [`parabun:gpu`](#gpu-compute-paragpu) | Raw CUDA + Metal kernels in TypeScript template strings, NVRTC at runtime, fallback chain |
| [`@para/simd`](#simd-primitives-parasimd) | Typed-array SIMD primitives without WASM gymnastics |
| [`@para/pipeline`](#pipeline-fusion-parapipeline) | Typed-array pipeline fusion that promotes to GPU when inputs are large enough |
| [`@para/arena`](#buffer-pooling-paraarena) | Buffer pooling so worker boundaries don't cost a `Uint8Array` allocation per chunk |
| [`parabun:camera`](#camera-paracamera) / [`parabun:audio`](#audio-codecs--dsp-paraaudio) | Direct V4L2 / ALSA from TypeScript, no `ffmpeg` subprocess, no node-gyp |
| `parabun:gpio` / `parabun:i2c` / `parabun:spi` | Userspace peripheral access on Linux SBCs — character-device wrappers (uAPI v2 GPIO, i2c-dev, spidev). Same surface across Pi 4/5, Jetson, NUC + breakout. |
| [`parabun:image`](#image-codecs--filters-paraimage) | JPEG/PNG/WebP codecs + the full Sharp-class pixel pipeline, all statically vendored |
| [`parabun:llm`](#llm-inference-parallm) | GGUF runtime — Llama / Qwen2 transformer + BERT embeddings + Whisper STT + GPU residency, plus `llm.serve()` for an OpenAI-compatible HTTP API. ~340 tok/s on RTX 4070 Ti, at ollama parity. |
| [`parabun:speech`](#speech-paraspeech) | VAD-gated `listen()`, Whisper `transcribe()`, Piper `say()` (mic → speaker in one call) and `speak()` (returns raw PCM), whisper-backed `wakeWord()` — voice in / voice out / hands-free trigger from one module. |
| [`@para/mcp`](https://parabun.script.dev/docs/mcp/) | Model Context Protocol client — stdio + WebSocket transports. Composes structurally with `parabun:assistant`'s `tools:` option. |
| [`parabun:assistant`](#voice-assistant-paraassistant) | Three-line voice assistant: mic + STT + LLM + TTS + speaker, fully local. Tool dispatch (inline + MCP), barge-in, wake word, scheduled prompts, RAG, sqlite-backed persistent memory, reactive signals. |

If you've ever spawned a Python subprocess from your Node server because Node couldn't keep up — or written an N-API module because there was no other way to touch your camera / GPU / SIMD lanes — Parabun is the runtime that deletes the subprocess and the binding both.

```ts
// Multithreaded typed-array work — actual cores, no postMessage gymnastics
import parallel from "@para/parallel";
const scores = await parallel.pmap(scoreChunk, chunks, { concurrency: 8 });

// Raw CUDA kernel from TypeScript — no WebGPU shader, no .cu file
import gpu from "parabun:gpu";
gpu.setBackend("cuda");
const result = gpu.matVec(matrix, vector, M, N);

// On-device LLM — GGUF mmap, residency-held weights, single-process
import llm from "parabun:llm";
using m = await llm.LLM.load("./Llama-3.2-1B-Instruct-Q4_K_M.gguf");
for await (const piece of m.chat([{ role: "user", content: "..." }])) {
  process.stdout.write(piece);
}

// Live camera + microphone — kernel-direct V4L2 / ALSA
import camera from "parabun:camera";
import audio  from "parabun:audio";
await using cam = await camera.open("/dev/video0", { format: "mjpg", width: 1280, height: 720 });
await using mic = await audio.capture({ sampleRate: 16000, channels: 1 });
for await (const frame of cam.frames()) { /* ... */ }

// Three-line voice assistant — local STT + LLM + TTS, no cloud round-trip
import assistant from "parabun:assistant";
await using bot = await assistant.create({
  llm: "/models/Llama-3.2-1B-Instruct-Q4_K_M.gguf",
  stt: "/models/ggml-tiny.en.bin",
  tts: "/models/en_US-lessac-medium.onnx",
});
await bot.run();
```

Parabun is a drop-in replacement for Bun — your existing `.ts` / `.js` files run unchanged. The runtime modules above are the headline. Parabun also ships **ParaScript**, an optional TypeScript dialect (`pure`, `..!`, `..&`, `..=`, `|>`, range literals, `signal`/`effect { }`/`when { }` blocks) that lives in `.pts` files and desugars to standard JS at parse time; use it or ignore it, the modules don't depend on it.

> **What this isn't:** a numerical-Python replacement. NumPy, JAX, PyTorch, and CuPy are deeply ahead in scientific computing and ML training, and Parabun won't catch them. The pitch is *for the developer who'd otherwise leave TypeScript* — to spawn a Python sidecar, to write an N-API module, or to put a perf-critical service in Rust. Parabun keeps that developer in TypeScript.

### LLM Inference (`parabun:llm`)

`parabun:llm` is a from-scratch GGUF runtime — file loader, byte-level BPE tokenizer, Llama/Qwen2 transformer forward pass, BERT-family encoder for embeddings, greedy and nucleus sampling, constrained decoding (GBNF + JSON schema), KV prefix caching, and speculative decoding — behind a small `load`/`generate`/`chat`/`embed` surface. Weights stream off disk via `mmap`; the residual stream, KV cache, and all matmuls stay on-device. Only the 4-byte argmax crosses PCIe per token.

```ts
import llm from "parabun:llm";

using m = await llm.LLM.load("./Llama-3.2-1B-Instruct-Q4_K_M.gguf");

for await (const piece of m.chat([
  { role: "system", content: "You are helpful and concise." },
  { role: "user", content: "What is the capital of France?" },
])) {
  process.stdout.write(piece);
}
```

- **Quant formats**: F32, F16, Q8_0, Q2_K, Q3_K, **Q4_K**, Q5_K, **Q6_K**. Q4_K/Q6_K matVec kernels use a 1-warp-per-row / 4-warps-per-block layout.
- **Fused projections**: QKV and Gate+Up are byte-concatenated at load time (same quant, contiguous rows) and dispatched as a single matVec per layer. Worth ~20 tok/s on Llama-3.2-1B.
- **Chat templates**: Llama-3, ChatML, and Mistral-Instruct auto-detected from the GGUF's `tokenizer.chat_template`. Fall back to `generate()` with your own framing if none match.
- **Sentence embeddings**: `llm.Encoder.load()` loads BERT-family GGUFs (BGE, E5, MiniLM) for CLS- or mean-pooled, L2-normalized embeddings. Decoder models get a pooled `LLM.embed(text)` path too.
- **Constrained decoding**: GBNF grammars or a JSON schema mask tokens that would take the parse off-accept before sampling — output is guaranteed to conform.
- **Speculative decoding**: pass a smaller `draft` model and `speculativeK` to skip target forwards when the draft agrees, with exact Leviathan et al. accept-reject math.
- **Prefix caching**: `LLM.prefix(sharedPreamble)` snapshots KV + logits once; subsequent `generate()` / `chat()` calls that start with the same tokens skip prefill entirely.
- **Backends**: CUDA on Linux/Windows (via `parabun:gpu`'s driver + NVRTC path), CPU fallback on any host. Metal kernels not yet wired.
- **Speech recognition**: `llm.WhisperModel.load(path)` loads a `ggml-*.bin` Whisper checkpoint (tiny.en / base.en) and exposes `transcribe(samples)` / `transcribeMel(mel, T)`. Encoder-decoder forward pass shares the matVec / KV-cache machinery with the Llama path; CUDA on, CPU fallback otherwise. Decoder QKV is fused at load time. A reactive `m.busy` signal flips while a transcription is in flight.
- **Reactive surface**: `m.busy` (writable, refcounted across nested calls) and `m.device` (`"cuda"` / `"metal"` / `"cpu"`) are exposed as signals — pair with `@para/signals` to drive UI without polling.

Llama-3.2-1B-Instruct Q4_K_M on RTX 4070 Ti (release build, best-of-5):

| workload                    | parabun   | ollama   |
|-----------------------------|----------:|---------:|
| greedy decode, device-only  | **340 tok/s** | ~350 tok/s |
| greedy decode, logits DtoH  | ~275 tok/s | n/a      |
| prompt prefill              | ~295 tok/s | n/a      |

At ollama parity on this model/hardware. `bench/llm-tps.ts` reproduces the numbers; `bench/parabun-llm/run.pjs` is the end-user-style harness.

### GPU Compute (`parabun:gpu`)

`parabun:gpu` is a compute-only GPU surface (not graphics) that mirrors the hot parts of `@para/simd`. It probes a backend chain — Metal on darwin, CUDA on Linux/Windows, CPU fallback always available — and picks the first one whose runtime loads.

```ts
import gpu from "parabun:gpu";

gpu.describe();              // { active: "metal", available: ["metal","cpu"], ... }
const scores = gpu.matVec(embeddings, query, N, D);  // MSL kernel on Apple Silicon
const out    = gpu.simdMap(x => x * 3 + 7, big);     // affine — dispatched to GPU if large enough
```

Two thresholds, not one: a **dispatch** threshold lets the GPU kernel run (so tests exercise the real path), and a **wins** threshold (`gpu.winsForSize(op, n, elemBytes)`) tells callers when routing through `parabun:gpu` actually beats `@para/simd`. Today `simdMap` wins at ≥ 1<<18 f32 elements; `matVec` is compiled and correct but not yet winning (the naive MSL kernel is bandwidth-bound on M1/M2).

`@para/pipeline`'s fusion tier reads `winsForSize` automatically — a fused affine chain over a large enough `Float32Array` promotes from stacked `simd.mulScalar`+`simd.addScalar` to `gpu.simdMap` without user code changes.

Beyond `dot` / `matVec` / `matmul` / `simdMap`, the module exposes a growing set of data-parallel primitives that backends can override but otherwise ship with a CPU reference:

- **`conv2D(input, kernel, iW, iH, kW, kH)`** — 2D valid-mode convolution. Used by `parabun:image` resize / blur / sharpen and as a general 2D-correlation primitive.
- **`scan(input)`** — inclusive prefix sum. `Float32Array` (Kahan-compensated) or `Uint32Array` (u32-wrapping); the latter is the standard parallel-compaction primitive.
- **`reduce(input, op)`** — `"sum"` / `"min"` / `"max"`. Empty inputs follow JS conventions (sum=0, min=+∞, max=-∞).
- **`argMin(input)` / `argMax(input)`** — index of the extremum, first-occurrence tie-break, NaN-propagating, throws on empty.
- **`histogram(input, bins, opts?)`** — bin counting over a `Float32Array`; auto-resolves `[min, max]` from data when omitted, top-edge inclusive (numpy convention).
- **`median(input)` / `quantile(input, q)`** — order statistics with linear interpolation between adjacent sorted samples.

Backends (CUDA, Metal) plug in via optional hooks on the same dispatch surface; the CPU path is the correctness reference for every op.

### Parallel Execution (`@para/parallel`)

`@para/parallel.pmap` spreads CPU-bound work across a persistent worker pool. The worker-safety contract is enforced at parse time via the `pure` keyword (see [Language Extensions](#language-extensions)) — no closures, no `this`, no module-level references, so `fn.toString()` round-trips cleanly into the worker context.

```pts
import parallel from "@para/parallel";

pure function scoreChunk(chunk) {
  const { emb, query, dim, base, k } = chunk;
  // ... tight loop, no closures, no `this`, no module refs
  return { scores, idx };
}

const results = await parallel.pmap(scoreChunk, chunks, { concurrency: 8 });
```

- **Pure function contract, enforced at parse time.** No closures, no `this`, no module-level references — exactly the things that would silently break when the worker runtime re-evaluates `fn.toString()` in an isolated context. The kernel carries everything it needs on the input chunk.
- **Persistent worker pool.** Workers are spawned lazily, kept alive across calls, and cache compiled function sources so repeat `pmap()` invocations skip the `eval()` step. `unref`/`ref` lifecycle keeps an idle pool from pinning the event loop.
- **Zero-copy via `SharedArrayBuffer`.** A `postMessage` of a typed-array view over a SAB ships only a handle. 150 MB of embeddings or a 64 MB pixel buffer becomes <1 ms of per-call overhead instead of 17 ms × N-chunks of structured clone.
- **Implicit barriers via `await`.** Two sequential `await pmap(...)` calls form a natural barrier — every worker has flushed its slab before the next pass starts reading. No atomics, no locks, no explicit halo exchange; row-major SAB layout plus `await` is enough synchronization for separable convolutions, gradient-then-solve, horizontal-then-vertical, etc.

### SIMD Primitives (`@para/simd`)

`@para/simd` exposes WASM-backed `f32x4` and `f64x2` kernels for `Float32Array` and `Float64Array`:

```ts
import { dot, sum, mulScalar, matVec } from "@para/simd";

const embeddings = new Float32Array(N * D);
const query = new Float32Array(D);
const scores = matVec(embeddings, query, N, D);   // one WASM call, f32x4 internally
```

Primitives include element-wise ops (`mulScalar`, `addScalar`, `simdMap`), reductions (`sum`, `dot`), and bulk operations (`matVec`). Above a ~4 MiB byte-footprint threshold the runtime falls back to monomorphic tight loops (`sumTightF32`/`F64`, `dotTightF32`/`F64`) because at that size the WASM copy-in dominates the reduction.

### Pipeline Fusion (`@para/pipeline`)

`@para/pipeline` is the runtime behind the `|>` operator (see [Language Extensions](#language-extensions)). Affine `map` chains over `Float32Array` / `Float64Array` compile down to a single SIMD pass, with no intermediate arrays and no per-element function calls.

```pts
import { map, sum } from "@para/pipeline";

pure function scale(x) { return x * 1000; }
pure function drift(x) { return x + 2.5; }
pure function calib(x) { return x * 0.998; }

const data = new Float32Array(10_000_000);
const total = await (data |> map(scale) |> map(drift) |> map(calib) |> sum);
```

Each `map` extends a `FusedChain` descriptor instead of wrapping another async generator. On a terminal (`sum`, `collect`, `toFloat32Array`, …), the runtime probes each map with three points: if the whole chain is affine it collapses to a single `(K, C)` and dispatches to `@para/simd` as one pass — `sum` becomes `K · simd.sum(data) + C · n`. Non-affine chains still fuse into a single `simd.simdMap(composed_fn, data)` call.

### Buffer Pooling (`@para/arena`)

`@para/arena` is a typed-array pool. If your hot path repeatedly allocates short-lived buffers of a known size — protocol decode scratch, per-request work buffers, ring stages — borrow from a `Pool` instead of calling `new Uint8Array(N)`:

```ts
import arena from "@para/arena";

const pool = new arena.Pool(Uint8Array, 65536, { prewarm: 8 });

function handle(frame) {
  const buf = pool.acquire();
  try {
    decodeInto(buf, frame);
    return process(buf);
  } finally {
    pool.release(buf);
  }
}
// or: pool.use(buf => { ... })
```

Microbench (200k × 64 KiB Uint8Array allocations + 2 KiB touch each, release build, best-of-5):

```
baseline (new Uint8Array)   707.9 ms
parabun (@para/arena Pool)    248.8 ms      → 2.85×
```

This is a microbench by design — it isolates the allocator/zero-init/GC-tracking cost. If your handler spends 10 ms of real CPU per request and 20 µs on allocation, pooling won't move the needle. The win shows up where allocation is a measurable fraction of the workload (binary protocol gateways, columnar pre-processing, tight encode/decode loops). Pass `clear: true` if recycled buffers must not carry old bytes — defaults to off, since skipping the zero-init is the point of a pool.

### Image Codecs + Filters (`parabun:image`)

`parabun:image` is a Sharp-class image module baked into the runtime — JPEG / PNG / WebP decode and encode, plus a CPU pixel-pipeline of resize / blur / sharpen / edge-detect / rotate / flip / crop / compose / tone-correction / histogram / threshold / invert / grayscale. Codecs are vendored statically (libjpeg-turbo, libpng, libwebp + libsharpyuv), so there's no `npm install sharp` and no Node-ABI-versioned binary distribution.

```ts
import image from "parabun:image";

const bytes = await Bun.file("photo.jpg").bytes();
const img = image.decode(bytes);                                // { data, width, height, channels, format }
const small = image.resize(img, { width: 800, height: 600, kernel: "lanczos" });
const sharp = image.sharpen(small, { amount: 1.5 });
const out = image.encode(sharp, { format: "webp", quality: 85 });
await Bun.write("photo.webp", out);
```

- **Decode**: JPEG (3-channel RGB), PNG (4-channel RGBA), WebP (lossy + lossless, 4-channel RGBA). Format auto-detected from the magic-byte prefix.
- **Encode**: JPEG (quality 1-100), PNG (lossless), WebP (lossy `quality` + opt-in `lossless: true`).
- **Resize**: bilinear (fast, default) or Lanczos-3 (`kernel: "lanczos"`, separable two-pass with pre-computed taps; sharper for downscaling).
- **Filters**: `blur({ radius })` (separable Gaussian, edge-clamp), `sharpen({ amount?, radius? })` (unsharp mask via the blur scaffolding), `edgeDetect()` (Rec. 601 luma collapse + 3×3 Sobel magnitude).
- **Geometric**: `rotate({ degrees: 90|180|270 })`, `flip({ axis })`, `crop({ x, y, width, height })` — pure index shuffles, no resampling.
- **Tone**: `adjust({ brightness?, contrast?, saturation? })` (each in [-1, 1], 0 = no-op), `invert()`, `threshold({ value })`, `toGrayscale()`.
- **Analysis**: `histogram(img)` returns one `Uint32Array(256)` per channel.
- **Composite**: `composite(base, overlay, { x?, y? })` — Porter-Duff source-over alpha blending; clipping handles out-of-bounds overlay regions silently.

### Camera (`parabun:camera`)

`parabun:camera` is a zero-dependency capture surface for V4L2 cameras on Linux — UVC webcams, CSI cameras, anything that exposes itself as `/dev/video*`. AVFoundation (macOS) and Media Foundation (Windows) backends mount on the same JS surface in follow-ups. No `ffmpeg` subprocess, no `node-gyp` binding, no shipping a separate native module per platform.

```ts
import camera from "parabun:camera";

const devs = await camera.devices();
//   [{ path: "/dev/video0", name: "C920 HD Pro Webcam", driver: "uvcvideo",
//      caps: ["video_capture", "streaming"] }]

await using cam = await camera.open(devs[0].path, {
  format: "mjpg",          // "yuyv" | "mjpg" | "nv12" | "rgb24"
  width: 1280,
  height: 720,
});

for await (const frame of cam.frames()) {
  // frame: { data, width, height, format, timestampMs, sequence }
  // For "mjpg" you can hand .data straight to image.decode() — every frame
  // is an independent JPEG bitstream.
}
```

- **Enumerate**: `devices()` walks `/sys/class/video4linux` and filters to true capture devices via `VIDIOC_QUERYCAP`.
- **Probe**: `formats(path)` enumerates every supported `(format, width, height, fps)` tuple via `VIDIOC_ENUM_FMT` / `FRAMESIZES` / `FRAMEINTERVALS`.
- **Capture**: `open(...)` configures the format, mmaps the kernel ring buffer, and starts the stream; `cam.frames()` yields frames as an async iterator with kernel timestamps + sequence numbers; `cam.grab()` does a single one-shot.
- **Convert**: `toRgba(frame)` does a scalar BT.601 YUV→RGB shuffle for `yuyv` / `nv12` (and an alpha pad for `rgb24`); for `mjpg` you compose with `parabun:image.decode()`.
- **Lifecycle**: `await using` for streaming captures; a `FinalizationRegistry` backstops forgotten `.close()` calls so the kernel fd doesn't leak on a dropped reference.

### Audio Codecs + DSP (`parabun:audio`)

`parabun:audio` is a from-scratch audio toolkit: WAV / MP3 decode, Opus encode and decode (libopus 1.6.1), rnnoise-based denoising, FFT, RBJ biquad filters, resampling, spectrograms, voice-activity detection, and the level / leveling primitives a voice-call capture pipeline needs. Like `parabun:image`, the heavy codecs (libopus, minimp3, rnnoise) are vendored statically.

```ts
import audio from "parabun:audio";
import rtp from "@para/rtp";

const enc = new audio.OpusEncoder({ sampleRate: 48000, channels: 1, application: "voip" });
const den = new audio.Denoiser();                              // 480-sample frames @ 48 kHz
const agc = new audio.Gain({ targetLevel: 0.1 });

for (const i16Frame of micFrames) {
  const f32 = audio.i16ToF32(i16Frame);                        // OS audio → DSP space
  den.process(f32);                                            // suppress noise (in place)
  agc.process(f32);                                            // normalize loudness
  const opus = enc.encode(f32);                                // Opus packet
  const packet = rtp.pack({ payloadType: 111, sequence, timestamp, ssrc, payload: opus });
  send(packet);
}
```

- **Codecs**: `OpusEncoder` / `OpusDecoder` (full libopus surface — bitrate, complexity, FEC, DTX, application modes), `decodeMp3` (minimp3, single-shot), `readWav` / `writeWav` (PCM-16, PCM-32, IEEE-754).
- **Filters**: `lowpass`, `highpass`, `bandpass`, `notch` — all RBJ Audio EQ Cookbook biquads sharing one inner runner.
- **Spectral**: `fft` / `ifft` (Cooley-Tukey radix-2 in place), `spectrogram` (STFT with Hann window).
- **Voice-call building blocks**: `Denoiser` (rnnoise — RNN-based noise suppression at 480-sample @ 48 kHz frames), `Gain` (auto gain control with asymmetric attack/release envelope follower), `detectVoice` (sliding-window-min noise-floor VAD).
- **Mixing**: `mix(tracks, { gains?, clip? })` for conference-call-style summing with hard / soft / no clipping.
- **Resample**: `resample(samples, { from, to })` — 4-cascade anti-alias filter + linear interpolation.
- **Levels**: `peak`, `rms`, `envelope({ windowSize, hopSize, mode })`, `normalize({ target, mode })`.
- **Layout**: `interleave` / `deinterleave` for planar ⇄ frame-major typed-array conversions, `i16ToF32` / `f32ToI16` for OS-audio ⇄ DSP-space PCM.
- **OS audio I/O (Linux today)**: `audio.devices()` enumerates capture + playback devices via ALSA; `audio.capture({ device, sampleRate, channels })` returns a stream whose `.frames()` async-iterator yields `Float32Array` PCM chunks straight from `snd_pcm_readi`; `audio.play({ ... }).write(samples)` pushes PCM through `snd_pcm_writei`. Format on the wire is S16_LE; conversion to/from `Float32` happens in C++. CoreAudio + WASAPI backends mount on the same surface in follow-ups.

### Speech (`parabun:speech`)

`parabun:speech` is the voice-IO leg of the on-device AI stack — VAD-gated utterance segmentation, Whisper-based speech-to-text, and Piper text-to-speech. Composes `parabun:audio`'s mic / DSP primitives with `parabun:llm`'s Whisper runtime; no cloud round-trip, no Python sidecar.

```ts
import audio  from "parabun:audio";
import speech from "parabun:speech";

await using mic = await audio.capture({ sampleRate: 16000, channels: 1 });

// VAD-gated segmenter — yields one Utterance per spoken phrase.
const utterances = speech.listen(mic.frames(), { sampleRate: mic.sampleRate });

for await (const utt of utterances) {
  const text = await speech.transcribe(utt, {
    engine: "whisper",
    model: "/models/ggml-tiny.en.bin",
  });
  console.log("you said:", text);

  const out = await speech.speak(`I heard: ${text}`, {
    engine: "piper",
    model: "/models/en_US-lessac-medium.onnx",
  });
  // out.samples is f32 mono PCM at out.sampleRate — pipe to audio.play()
}
```

- **`listen(stream, { sampleRate })`** — async-iterator wrapper over any `Float32Array` chunk source. Tracks an adaptive noise floor, gates on energy + hangover, emits `{ samples, startMs, endMs }` per utterance. The returned stream exposes reactive signals: `active` (true while a phrase is in progress), `noiseFloor` (current dB estimate), and `lastUtterance` (most recent emitted phrase).
- **`transcribe(utt, { engine: "whisper", model })`** — loads a Whisper `ggml-*.bin` via `parabun:llm.WhisperModel` and runs the encoder-decoder forward pass. Both `tiny.en` and `base.en` work cleanly.
- **`speak(text, { engine: "piper", model })`** — runs the Piper voice synthesizer. The first call for a given voice loads the model into a long-running `piper --json-input` subprocess; subsequent calls reuse the same process via stdin / stdout (~30-50 ms inference per sentence on the lessac-low voice). Returns `{ samples, sampleRate, channels }` ready for `audio.play().write()`. `speech.closePiperSessions()` tears the cache down explicitly. Direct libpiper FFI is the long-term v2.

`speech.listen` works as a standalone primitive — pass it any iterable of `Float32Array` (file-backed, network, synthetic) and it'll emit utterances.

### Voice Assistant (`parabun:assistant`)

`parabun:assistant` is a Tier 2 facade that composes `parabun:audio` + `parabun:speech` + `parabun:llm` into a complete edge AI assistant. The 3-line case stays 3 lines; new fields unlock new capabilities.

```ts
import assistant from "parabun:assistant";

await using bot = await assistant.create({
  llm: "/models/Llama-3.2-1B-Instruct-Q4_K_M.gguf",
  stt: "/models/ggml-tiny.en.bin",
  tts: "/models/en_US-lessac-medium.onnx",
  system: "You are a concise voice assistant.",
});

await bot.run();   // for await (const _ of bot.turns()) {}
```

- **One module, full duplex**: mic capture → VAD → Whisper STT → LLM → Piper TTS → speaker. Fully local, no cloud.
- **Async-iterator-shaped**: `bot.turns()` yields one `Turn` per user utterance + assistant reply round-trip. `bot.run()` is the drain. `bot.ask(text)` skips STT for text-only turns; `bot.say(text)` pushes a proactive utterance.
- **Reactive surface**: `bot.state` (`"idle" | "listening" | "thinking" | "speaking"`), `bot.history` (the message array), `bot.lastTurn`, and `bot.interrupted` are all `@para/signals` Signals — wire them directly into a UI without polling.
- **Barge-in**: while the bot is thinking or speaking, a rising edge on listen()'s `vad.active` aborts the chat-token loop, drops the queued TTS via `spk.stop()`, and stamps `turn.interrupted = true`. Programmatic cancel via `bot.interrupt()`.
- **Wake word**: pass `wakeWord: "hey jetson"` and the voice loop ignores utterances that don't carry the phrase. Re-arms after every turn. Object form supports fuzzy matching, multiple phrases, and feed-through. Whisper-backed (reuses the STT model); a sub-watt KWS engine is a tracked follow-up.
- **Scheduled prompts**: pass `schedule: [{ cron, prompt }]` and the bot fires `bot.ask(prompt)` on each cron match (5-field syntax, local time). Resulting `Turn` carries `scheduled: true`. Skipped if the bot is mid-turn; next minute retries.
- **RAG**: pass `knowledge: { dir, encoder, topK? }` and the bot indexes the directory at create time. Each user message retrieves the top-K most-relevant chunks (cosine over a flat `Float32Array` matrix, sentence-embedding GGUF) and injects them as a synthetic system message into the LLM working copy — canonical history stays clean. Auto-reindexes on `fs.watch`.
- **Persistent memory** (opt-in): pass `memory: "/path/to/memory.sqlite"` and conversation turns persist across process restarts. `bot.memory` is exposed for direct inspection; the underlying schema is a single `turns(role, content, ts)` table.
- **Power users keep their seat**: `bot.llm` exposes the underlying `LLM` instance so anything reachable directly via `parabun:llm` / `parabun:speech` / `parabun:audio` is reachable through `bot` too.
- **Disposal is deterministic**: `await using` for the common path, explicit `bot.close()` for the rest. All composed resources (mic, speaker, models, sqlite) close in lockstep; idempotent.

What v1 ships (per `PLAN-bun-assistant.md` build order): `assistant.create`, `bot.run` / `turns` / `ask` / `say` / `interrupt`, the five signals (`state` / `history` / `lastTurn` / `interrupted` / `toolsActive`), in-memory transcript, sqlite-backed persistent memory, tool dispatch + MCP, barge-in, wake word, scheduled prompts, and RAG. Deferred follow-up (tracked under LYK-760): vision (VLM) turns.

### Streaming CSV (`@para/csv`)

`@para/csv.parseCsv(source, opts?)` is an async-generator CSV parser with full RFC 4180 quoting / escapes, configurable delimiter and quote character, header-mode (yields `Record<string, value>` rows), and per-cell type inference (`number` / `boolean` / `null`). An opt-in `parallel: true` mode chunks the input across `@para/parallel`'s worker pool when the input is large enough and contains no quoted cells; otherwise it falls through to the serial state machine.

```ts
import csv from "@para/csv";

for await (const row of csv.parseCsv(Bun.file("rows.csv"), { header: true })) {
  process(row.id, row.name, row.score);
}
```

> ⚠️ **`parallel: true` is not a per-file speedup.** The honest measurement (`bench/parabun-csv-parallel/`, 16-core x86 release): **1.18× at 5 MB**, 0.95× at 50 MB, 0.93× at 200 MB. The serial state machine is already memory-bandwidth-bound, and the parallel path's materialize-and-fork overhead grows with input size. Use `parallel: true` when the parse is currently making your event loop unresponsive (it keeps the main thread free), not because you expect bigger files to go faster.

### Fine-Grained Reactivity (`@para/signals`)

`@para/signals` is a reactive primitive — signals, computed derivations, and side-effects that re-run automatically when their reads change. Reads inside an `effect` or `derived` register a dep edge; writes invalidate downstream, and a microtask-scheduled flush re-runs only what observed a changed value.

```ts
import { signal, derived, effect, batch } from "@para/signals";

const count = signal(0);
const doubled = derived(() => count.get() * 2);

const stop = effect(() => console.log(`count=${count.get()} x2=${doubled.get()}`));

count.set(1);            // logs: count=1 x2=2
batch(() => {
  count.set(5);
  count.set(10);         // one re-run, not two
});
stop();                  // tear down the effect
```

- **Signal methods**: `.get()`, `.set(v)`, `.peek()` (read without registering a dep), `.update(fn)` (atomic read-modify-write), `.subscribe(fn)` (observe changes outside an effect).
- **`derived(fn)`** — lazy-computed read-only signal. Recomputes on next `.get()` after a dep changes; caches until then.
- **`effect(fn)`** — runs `fn` eagerly, tracks dep reads, re-runs on invalidation. Return a function to register a cleanup that fires before the next run and on dispose. The call returns a stop function.
- **`batch(fn)`** — coalesces multiple writes into one effect pass. Nests correctly.
- **`untrack(fn)`** — read inside a reactive context without registering a dep.
- **Set-to-same-value is a no-op** — writes only propagate on `!Object.is(old, new)`, so idempotent assigns don't refire effects.

Pair with the [`signal` + `effect { }` sugar](#signals-signal--effect---) for a more direct feel — the sugar rewrites to this module at parse time.

## Install

```sh
curl -fsSL https://raw.githubusercontent.com/airgap/parabun/main/install.sh | bash
```

Drops the latest release binary into `~/.parabun/bin/parabun` and symlinks `pb` as a short alias. Pin a specific release tag with `... | bash -s parabun-<short-sha>`.

Supported targets: `linux-x64`, `macos-arm64`, `windows-x64` (MinGW). Releases: [github.com/airgap/parabun/releases](https://github.com/airgap/parabun/releases).

The Parabun release binary is less than 1% larger than stock Bun built from the same upstream commit — all the added modules and syntax extensions together add negligible weight.

## Benchmarks

See [`bench/parabun-benches.md`](./bench/parabun-benches.md) for the full portfolio with per-bench workload, methodology, and analysis. Headline numbers (best-of-N medians on release builds, verified bit-identical or within-tolerance against each baseline):

| workload                                                | speedup                                     | primitive(s)                  |
|---------------------------------------------------------|--------------------------------------------:|-------------------------------|
| Sobel edge detection (8192² grayscale, 64 MB)           | **5.94×**                                   | `pmap` + SAB, heavy kernel    |
| Monte Carlo option pricing (50 M samples)               | **5.56×**                                   | `pmap` alone (no SIMD/SAB)    |
| Separable Gaussian blur (8192² grayscale, 64 MB)        | **4.75×**                                   | `pmap` + SAB, light kernel    |
| LangChain MemoryVectorStore drop-in (100k × 384)        | **2.83×** per search                        | `pmap` + SAB + pre-normalize  |
| SQLite analytical post-processing (1 M rows × 8)        | **2.71×** on analytical (~10% end-to-end)   | `@para/simd` on columnar F64    |
| Lucas-Kanade optical flow (2048² two-frame)             | **2.63×**                                   | `pmap` + SAB, temporal        |
| Vector-search layered diagnosis (100k × 384)            | **2.03×** (only the SAB+warm-pool tier wins)| `pmap` + SAB                  |
| Streaming ETL (10 M Float32, 4-stage affine → fused)    | **50×** vs `.map` chain · **1.24×** vs tight loop | `@para/pipeline` fusion   |

## Roadmap

Parabun's positioning is to open typical JS performance bottlenecks via multithreading + GPU + direct hardware. Modules stack in three tiers:

- **Tier 0 — primitives** (shipped): `@para/simd`, `parabun:gpu`, `@para/parallel`, `@para/arena`, `@para/pipeline`, `@para/signals`, `@para/rtp`. These are the building blocks that reach hardware directly.
- **Tier 1 — composed** (shipped, plus `parabun:video` in progress): `parabun:image`, `parabun:audio`, `parabun:camera`, `@para/csv`, `parabun:llm`, `parabun:gpio`, `parabun:i2c`, `parabun:spi`. Codecs, capture devices, on-device LLM inference, and userspace peripheral access for SBCs — built on Tier 0.
- **Tier 2 — applications** (`parabun:speech` ships full STT + TTS, `parabun:assistant` ships the edge voice-assistant facade, `@para/arrow` ships the in-memory model + computes + IPC reader/writer with Parquet pending; `parabun:vision` ships orchestration with detector / OCR engines stubbed): application-shaped modules that compose Tier 1 into voice assistants, vision pipelines, and analytical queries. (HTTP serving lives inside `parabun:llm` as `llm.serve()`.)

Each module ships behind a compile-time feature flag. The CLI configurator at [parabun.script.dev/configure](https://parabun.script.dev/configure) generates a `bun build --compile` invocation with only the modules you check — production builds slim to whatever your app actually imports.

| Status      | Module                | What it does                                                                                          |
|-------------|-----------------------|-------------------------------------------------------------------------------------------------------|
| shipped     | `parabun:image`           | JPEG / PNG / WebP decode + encode, resize (bilinear / Lanczos), blur / sharpen / edge-detect, rotate / flip / crop, adjust / threshold / invert / grayscale, histogram, alpha composite. |
| shipped     | `parabun:audio`           | WAV / MP3 / Opus codecs, RBJ biquads, FFT, resample, spectrogram, VAD, denoiser (rnnoise), AGC, mix / normalize / envelope, planar ⇄ frame-major + i16 ⇄ f32 PCM helpers. |
| shipped     | `parabun:camera`          | V4L2 capture on Linux — `devices()` (callable signal — hotplug-aware via `.subscribe(cb)` / `.get()`), `formats(path)`, `open(...)` with async-iterator `frames()` over kernel-mmapped buffers. AVFoundation + Media Foundation follow. |
| shipped     | OS audio I/O          | Live ALSA capture + playback on `parabun:audio` (`devices()` callable signal, `capture()` / `play()`). Float32 PCM streams; CoreAudio + WASAPI follow. |
| shipped     | `@para/csv`             | Streaming RFC 4180 parser with header / inference / quote handling. `parallel: true` is "off-the-main-thread" — see the inline disclaimer above. |
| shipped     | `@para/rtp`             | RFC 3550 packet pack/parse + jitter-buffer for the Opus path; transport for the codec stack.          |
| shipped     | `parabun:gpio`            | Linux GPIO uAPI v2 — `chips()` / `open()` with single-line `read()` / `write()` / `toggle()` / `edges()` async iterator + reactive `value` signal, plus atomic multi-line `chip.bank(offsets, opts)`. Both `line` and `bank` accept `{ pollHz: N }` so `line.value` / `bank.value` update on hardware change without manual `setInterval`. Same surface across RPi 4, RPi 5 (pinctrl-rp1), Jetson, any Linux SBC. |
| shipped     | `parabun:i2c`             | Linux i2c-dev — `buses()` / `open()`, `bus.scan()`, `device(addr).write()` / `read()` / `transact()` (combined I2C_RDWR), full SMBus shortcuts (`smbus.readByte` / `readWord` / `writeByte` / `writeWord` / `readBlock` / `writeBlock`). |
| shipped     | `parabun:spi`             | Linux spidev — `devices()` / `open()` with mode/bitsPerWord/speedHz, full-duplex `transfer()` + half-duplex `read()` / `write()` + multi-segment `transactSegments()` with CS held across segments. |
| partial     | `parabun:gpu` device-side | CUDA `reduce` (sum / min / max) + atomic-privatized `histogram` shipped. Scan, Metal mirror, and the rest of the secondary primitives still on CPU until wired. |
| partial     | `parabun:vision` (Tier 2) | Frame stream + frame-diff motion detection ship today (`vision.frames` / `vision.detectMotion`). Detector (`detect`) and OCR (`recognize`) engines stub with documented messages — they land once ONNX runtime is vendored. |
| shipped     | `parabun:speech` (Tier 2) | VAD-gated `listen()` (returns reactive utterance stream with `active` / `noiseFloor` / `lastUtterance` signals), Whisper `transcribe()` via `parabun:llm.WhisperModel`, Piper `speak()` via subprocess (libpiper FFI v2 tracked under LYK-758). |
| shipped     | `parabun:assistant` (Tier 2) | Three-line voice-assistant facade composing `parabun:audio` + `parabun:speech` + `parabun:llm` + `@para/mcp`. `bot.run` / `turns` / `ask` / `say` + reactive `state` / `history` / `lastTurn` / `interrupted` / `toolsActive` signals + sqlite-backed persistent memory + tool dispatch (inline + MCP) + VAD-driven barge-in (`bot.interrupt()`) + wake word (`wakeWord: "hey jetson"`) + scheduled prompts (`schedule: [{ cron, prompt }]`) + RAG (`knowledge: { dir, encoder, topK }`). VLM turns deferred to follow-up. |
| partial     | `@para/arrow` (Tier 2)  | In-memory columnar tables (`RecordBatch`, `Table`, `Column`), type inference from typed arrays, validity bitmaps, computes (`sum` / `mean` / `min` / `max` / `count` / `variance` / `stddev` / `quantile` / `median` / `distinct` / `filter` / `groupBy`), `fromRows` / `toRows` for the row ↔ columnar bridge, and Arrow IPC streaming format (`fromIPC` / `toIPC` with dictionary-batch decode — reads apache-arrow / pyarrow / arrow-rs / polars / duckdb output for the six supported logical types, both plain and Dictionary<Utf8>). Wire compat verified against apache-arrow 21.1.0 (see `bench/parabun-arrow-ipc-interop/`). Parquet pending. |
| in progress | `parabun:video`           | JS surface scaffolded; libavcodec / V4L2 M2M / NVDEC native binding lands with hardware bring-up. Decode + encode + container muxing. |
| next        | `@para/parallel` v2     | Closure-aware persistent worker pool + `SharedArrayBuffer` channels. Lifts today's `pmap` ceiling.    |
| planned     | `parabun:image` AVIF      | AVIF decode + encode (libavif + AOM / dav1d vendor add). Rounds out the codec coverage matrix.        |

`parabun:llm` becomes the proof-of-concept for the stack — "we built llama inference using `parabun:gpu` + `@para/simd` + `@para/parallel`; you can build similar things with the same building blocks" — rather than the headline product. Parabun is positioned as a perf runtime, not an AI runtime.

## Editor Support

### VS Code / Cursor / Kiro

```sh
curl -fsSL https://raw.githubusercontent.com/airgap/parabun/main/install-extension.sh | bash
```

Downloads the latest `.vsix` and installs it into every compatible editor found on the system (`code`, `cursor`, `kiro`).

Features: syntax highlighting, snippets, LSP diagnostics, completions, hover docs with desugaring examples, code actions (convert `.catch()`→`..!`, add `pure`, `f(x)`→`x |> f`), semantic tokens for `pure`, and a **TypeScript language service plugin** that lets you use Parabun syntax in `.ts` files with full TS tooling.

To build from source instead:

```bash
cd editors/ts-plugin && npm install && npm run build
cd ../vscode/parabun && npm install && npm run build
./editors/install-vsix.sh
```

### Other Editors (LSP)

The Parabun LSP server works with any LSP-compatible editor:

```bash
# Start the LSP (requires parabun on PATH)
parabun run editors/lsp/parabun-lsp.ts --stdio
```

Provides: diagnostics, completions (`pure`, `..!`, `..&`, `|>`, `..` / `..=` ranges), hover documentation, and semantic tokens with a `pure` modifier.

## Building

```bash
# Build debug
bun bd

# Run tests
bun bd test test/bundler/transpiler/parabun-parser.test.js
bun bd test test/bundler/transpiler/parabun-pure.test.js
bun bd test test/bundler/transpiler/parabun-purity.test.js
bun bd test test/bundler/transpiler/parabun-signals.test.js

# Symlink for editor integration (installs both 'parabun' and short 'pb')
sudo ln -sf $(pwd)/build/debug/bun-debug /usr/local/bin/parabun
sudo ln -sf $(pwd)/build/debug/bun-debug /usr/local/bin/pb
```

## Language Extensions

All extensions are opt-in, desugar at parse time, and work in any `.pts`/`.pjs` file (plus `.ts` via the VS Code TypeScript plugin). Standard `.ts`/`.js` files are unaffected.

### Pure Functions

Mark functions as `pure` to make purity visible and enforced. The parser rejects `this` access inside pure functions at compile time — which is what makes `@para/parallel.pmap` safe to ship `fn.toString()` into a worker.

```pts
pure function add(a: number, b: number): number {
  return a + b;
}

export pure async function fetchUser(id: string) {
  return await fetch(`/api/users/${id}`);
}

const double = pure (x: number) => x * 2;
const delayed = pure async (ms: number) => await Bun.sleep(ms);
```

Enforcement is deep — it follows into nested arrows (which capture outer `this`) but leaves nested regular functions (which have their own `this`) alone:

```pts
pure function broken() {
  return this.x;  // Error: Cannot use "this" inside a pure function
}

pure function valid() {
  function inner() { return this.x; }   // OK — its own `this`
  const bad = () => this.x;              // Error — captures outer `this`
  return inner;
}
```

Editors with the Parabun LSP highlight `pure` functions with a distinct style, making it immediately obvious which functions are side-effect-free.

### Memoized Pure Functions (`memo`)

`memo` is a first-class declarator for memoized pure functions — it implies both purity (same enforcement as `pure`) and function-ness, so no other keyword is needed. `memo` stands on its own: no `pure`, no `function`, no `fun`.

```pts
memo fib(n: number): number {
  if (n < 2) return n;
  return fib(n - 1) + fib(n - 2);
}

memo normalize(s: string) {
  return s.trim().toLowerCase();
}

memo async fetchProfile(id: string) {
  return await db.users.get(id);
}
```

The cache adapts to the function's arity: a 0-arg function becomes a singleton; a 1-arg function uses a `Map` keyed by the single argument; multi-arg and rest-arg functions use a nested `Map` chain. Async variants dedupe concurrent in-flight calls (one shared promise) and evict entries whose promises reject, so retries happen naturally. Recursive calls route through the memoized wrapper automatically — `fib(20)` above invokes the function body only 21 times, not 21,891.

### Error Chaining (`..!` and `..&`)

`..!` desugars to `.catch()`, `..&` desugars to `.finally()`. Chain them naturally:

```pts
const result = await fetch('/api')
  ..! console.error
  ..& cleanup;

// Equivalent to:
// const result = await fetch('/api').catch(console.error).finally(cleanup);
```

### Pipeline Operator (`|>`)

Desugars `x |> f` to `f(x)`. Left-to-right function application:

```pts
const output = rawData
  |> JSON.parse
  |> transform
  |> JSON.stringify;

// Equivalent to: JSON.stringify(transform(JSON.parse(rawData)))
```

**Method shorthand.** When the RHS starts with `.`, the piped value becomes the receiver — call methods and access properties on it without the arrow-wrap tax:

```pts
const data = (await fetch("/api")) |> .json();
const tokens = csv |> .trim() |> .split(",");
const name = user |> .profile.displayName;
```

`x |> .method(args)` desugars to `x.method(args)`. Chained calls, property access, and indexing after the first `.ident` work because they get picked up by the regular suffix parse.

**Placeholder.** When the RHS is a call and one of its top-level args is `_`, the piped value goes there — so multi-arg functions flow through the pipeline the same way unary ones do:

```pts
const active = users |> filter(_, isActive) |> map(_, .name);
const n = input |> parseInt(_, 10);
const entry = buffer |> lodash.find(_, predicate);
```

Multiple `_` placeholders copy the LHS structurally (`n |> add(_, _)` → `add(n, n)`); bind side-effectful LHS to a const first if that matters. Calls with no `_` keep the function-target form (`x |> f(y)` still means `f(y)(x)`).

Pair it with [`@para/pipeline`](#pipeline-fusion-parapipeline) for fused typed-array map chains.

### Range Literals (`..` and `..=`)

Integer ranges desugar to arrays at parse time, step 1:

```pts
for (const i of 0..5) console.log(i);     // 0 1 2 3 4
for (const i of 1..=3) console.log(i);    // 1 2 3

const squares = [...(0..=10)].map(x => x * x);
const sum = 1..=100 |> _.reduce((a, b) => a + b, 0);
```

`a..b` is exclusive of `b`, `a..=b` is inclusive. Empty / inverted ranges produce `[]` rather than throw. Precedence sits between shift and comparison so `a+1..b-1` and `0..n < m` both parse the way you'd expect. Ranges are integer + step-1 only; use a counter `for` loop for millions of iterations or stride != 1.

> Note: Parabun deviates from baseline JS on one obscure idiom — `1..toString()`. It now parses as the range `1..toString` followed by a call, not `(1.).toString()`. Use `(1).toString()`.

### Deferred Cleanup (`defer`)

`defer EXPR` schedules `EXPR` to run when the enclosing block exits — on normal fall-through, early `return`, or a thrown exception. Multiple defers dispose in LIFO order, matching Go / Zig / Swift conventions.

```pts
function readConfig(path: string) {
  const fd = fs.openSync(path);
  defer fs.closeSync(fd);
  const data = fs.readFileSync(fd);
  defer log("config-read");
  return JSON.parse(data);
}
```

`defer` desugars to an ES2024 `using` declaration whose disposer runs the deferred expression, so all the guarantees fall out for free: early returns, `throw`, loop-per-iteration cleanup, and `SuppressedError` chaining when multiple disposers throw.

**`defer await`.** Inside an async function, `defer await EXPR` awaits the deferred expression during disposal (via `await using`):

```pts
async function withConnection(url: string) {
  const conn = await pool.acquire(url);
  defer await conn.release();
  return await conn.query("SELECT 1");
}
```

Outside an async function, `defer await` is a parse error. `defer` as a plain identifier (variable name, property access, assignment target) is unaffected — the keyword path only triggers when `defer` is immediately followed by something that starts an expression.

### GC-Deferred Blocks (`arena`)

`arena { ... }` runs a block with JSC garbage collection deferred for its synchronous duration, then requests an Eden collection on block exit. Use it to pull GC pauses out of a short allocation-heavy section and line them up at a predictable point.

```pts
function encodeFrame(samples: Float32Array) {
  let out;
  arena {
    const scratch = new Uint8Array(samples.length * 4);
    writeSamples(scratch, samples);
    out = finalize(scratch);
  }
  return out;
}
```

Desugars to `require("@para/arena").scope(() => { ... })`. This is **latency-smoothing, not a bump allocator** — the heap still pays the eventual collection cost, just at a time of the caller's choosing.

The block body is lifted into a synchronous arrow, so `return` / `break` / `continue` are arrow-local (same semantics as `.forEach(cb)`). To produce a value, assign to an outer `let`. `await` is rejected inside the body: microtasks fire after the deferral releases, so `await` wouldn't actually run with GC deferred. `arena` as a plain identifier is unaffected — the keyword path only triggers when `arena` is immediately followed (no newline) by `{`.

### Signals (`signal` / `effect { }`)

Language sugar layered over [`@para/signals`](#fine-grained-reactivity-parasignals) that removes the `.get()` / `.set()` noise. A `signal NAME = RHS` declaration binds `NAME` as a reactive signal; bare reads rewrite to `NAME.get()`, assignments and `++`/`--` rewrite to a read-modify-write via `NAME.set(...)`, and an `effect { body }` block lifts its body into a tracked arrow:

```pts
signal count = 0;
signal doubled = count * 2;     // auto-derive — RHS references `count`

effect { console.log(`count=${count} x2=${doubled}`); }

count++;                        // count=1 x2=2
count = 10;                     // count=10 x2=20
```

- **`signal NAME = RHS`** — declares a reactive binding. `signal` always implies `const`; there's no `signal let`/`var` form. If `RHS` references another in-scope signal name the decl auto-promotes to `derived(() => RHS)`; otherwise it's a plain `signal(RHS)`. Only simple identifier bindings in v1.
- **`effect { body }`** — statement-level effect. The body is lifted into an arrow, so `return` / `break` / `continue` are arrow-local. `await` is rejected — the flush loop is synchronous.
- **Method allow-list**: `.get`, `.set`, `.peek`, `.subscribe`, `.update` stay as real `Signal` methods. Every other `NAME.foo` rewrites as `NAME.get().foo`, so `.trim()` on a string signal, `.length` on an array signal, etc. all do what you'd expect.
- **Pragma opt-out**: `// @parabun-strict-signals` at the top of a file disables auto-derive — every `signal` decl becomes a plain `signal(RHS)` regardless of what `RHS` references. Use it when you want the snapshot semantics.
- **`signal` / `effect` as plain identifiers are unaffected** — the keyword path only triggers when `signal` is immediately followed by an identifier, or `effect` by `{`.
- **`A ~> B` reactive binding** — desugars to `effect(() => { B = A; })` so `B` stays in step with `A` and any signals `A` reads from. RHS must be assignable (identifier, dot, index). Captures the disposer if you want it: `const stop = src ~> dst;`.
- **`A ~> B when C` conditional bind** — adds a guard. Desugars to `effect(() => { if (C) B = A; })`. `C` is read inside the effect so signal reads in the predicate are tracked too — flipping a signal-typed `C` re-fires the effect, the body re-evaluates the guard, and only assigns when the guard passes. `when` is contextual; bare uses elsewhere stay normal identifiers.

### Throw Expressions

`throw E` works in any expression position — on the right of `??`, `||`, `&&`, inside ternary branches, inside arrow bodies. Evaluation is lazy: the throw only fires if the surrounding expression actually reaches it.

```pts
const port = parseInt(env.PORT) || throw new Error("PORT required");
const user = maybeUser ?? throw "missing";
const level = cond ? "debug" : throw new Error("no fallback");
const fail = (msg: string) => throw new Error(msg);
```

Regular `throw E;` statements are unaffected. ASI rules still apply — a newline between `throw` and its operand is a syntax error.

### Operator Precedence

| Operator | Precedence | Desugars to |
|----------|-----------|-------------|
| `\|>` | nullish coalescing | `f(x)` |
| `..!` | conditional | `.catch(f)` |
| `..&` | conditional | `.finally(f)` |
| `..=` | assignment | `await expr` |
| `..` / `..=` (range) | between shift and comparison | `__parabunRange(a, b)` |
| `arena { ... }` | statement-level | `require("@para/arena").scope(() => { ... })` |
| `effect { ... }` | statement-level | `require("@para/signals").effect(() => { ... })` |
| `signal x = v` | statement-level | `const x = require("@para/signals").signal(v)` (or `.derived(() => v)`) |
| `A ~> B` | assignment | `require("@para/signals").effect(() => { B = A; })` |
| `A ~> B when C` | assignment | `require("@para/signals").effect(() => { if (C) B = A; })` |
| `throw E` | assignment (prefix) | `(() => { throw E; })()` |

Operators bind tighter-to-looser in the order listed, so `data |> transform ..! handler ..& cleanup` parses as `transform(data).catch(handler).finally(cleanup)`.

---

## Bun (upstream)

Parabun is built on top of Bun — every stock Bun feature works as documented at [bun.com/docs](https://bun.com/docs). The `parabun` binary is a drop-in for `bun` with the runtime modules and language extensions above layered on top.

- Upstream runtime/bundler/test-runner/package-manager docs: [bun.com/docs](https://bun.com/docs)
- Upstream source: [github.com/oven-sh/bun](https://github.com/oven-sh/bun)
- Parabun releases: [github.com/airgap/parabun/releases](https://github.com/airgap/parabun/releases)

## License

Parabun inherits Bun's [license](https://bun.com/docs/project/licensing). The Parabun-specific additions are published under the same terms.
