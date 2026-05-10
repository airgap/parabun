# `@para/bun-types`

TypeScript ambient declarations for ParaBun's `parabun:*` runtime modules.

## What's in here

A single `parabun.d.ts` declaring `module "parabun:<name>"` for every
runtime module ParaBun ships:

| Module                 | Surface                                                                |
| ---------------------- | ---------------------------------------------------------------------- |
| `parabun:assistant`    | Voice-assistant facade (`create`, `Assistant`, signals, tools, RAG)    |
| `parabun:llm`          | GGUF inference, chat, embeddings, Whisper STT, prefix cache, server    |
| `parabun:audio`        | ALSA capture/playback, WAV/Opus codecs, FFT, mel-spec, AGC, limiter    |
| `parabun:speech`       | `listen()` stream, Whisper transcribe, Piper TTS, wake word            |
| `parabun:camera`       | V4L2 capture, devices(), pixel-format conversion                       |
| `parabun:vision`       | RGBA frames, motion detection, ONNX session                            |
| `parabun:image`        | Codec decode/encode, resize, blur (CPU + GPU), Pipeline                |
| `parabun:gpu`          | Linear algebra, SDPA, scan/reduce/variance, GPU residency, calibration |
| `parabun:gpio`         | uAPI v2 GPIO — Chip/Line/LineBank with edge AsyncIterableIterator      |
| `parabun:i2c`          | i2c-dev with SMBus protocol helpers                                    |
| `parabun:spi`          | spidev with multi-segment transactions                                 |
| `parabun:csv`          | Streaming CSV parser with parallel-mode option                         |
| `parabun:video`        | Codec probe / decode / encode, thumbnail extraction                    |

Surfaces are mirrored from the implementations in
[airgap/parabun's `src/js/bun/`](https://github.com/airgap/parabun/tree/main/src/js/bun).

## Why a separate package

If you install upstream `bun-types` from npm you'll get type
declarations for `bun:*` modules but not `parabun:*` — those are
ParaBun-fork-only, so they're shipped here as a sibling package
you install alongside. Same convention as Bun's `bun-types`:
zero runtime, declarations only.

## Install

Workspaces / local link:

```jsonc
// package.json
{
  "devDependencies": {
    "@para/bun-types": "file:../path/to/parabun/packages/para-bun-types"
  }
}
```

Once published, plain:

```sh
bun add -d @para/bun-types
```

## Use

Add to your `tsconfig.json`:

```jsonc
{
  "compilerOptions": {
    "types": ["bun-types", "@para/bun-types"]
  }
}
```

Then `import audio from "parabun:audio"` (and the other modules) all
resolve to the right type, including `Signal<T>` accessors, schemas,
and disposable patterns.

## Status

`private: true` / `0.0.0-dev` until ParaBun's first runtime release
goes public. Local consumption via `file:` links works today.
