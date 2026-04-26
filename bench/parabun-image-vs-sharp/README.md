# bun:image vs sharp

Times four representative image-processing flows in both libraries
on the same fixtures. All numbers are bytes-in / bytes-out so codec
time is included — that's the realistic call site, not raw kernel
time on already-decoded pixels.

## Run

```sh
bun run bench/parabun-image-vs-sharp/seed.ts                       # once
bun run build:release bench/parabun-image-vs-sharp/run.ts
bun run build:release bench/parabun-image-vs-sharp/run.ts --sizes=small,medium
```

`seed.ts` synthesizes deterministic fixtures (LCG-seeded gradient +
noise so JPEG can't trivially compress to flat blocks) at three
sizes: 512², 2048², and 4096². Both PNG and JPEG variants are
emitted so the codec-time portion of each op is real.

## Headline numbers

16-core x86 release build, sharp 0.34.5, best-of-7 per cell after 2
warmup runs:

```
# decode → encode (JPEG q85)
fixture     parabun (med ms)    sharp   (med ms)    speedup
small             2.0                 2.1            1.08× faster
medium           28.1                18.9            1.48× slower
large           121.2                89.4            1.36× slower

# resize to 1/2 (Lanczos, JPEG out)
fixture     parabun (med ms)    sharp   (med ms)    speedup
small             3.7                 2.5            1.52× slower
medium           56.9                15.4            3.69× slower
large           234.4                57.3            4.09× slower

# Gaussian blur (radius 5, JPEG out)
fixture     parabun (med ms)    sharp   (med ms)    speedup
small            11.6                 4.0            2.92× slower
medium          187.9                27.6            6.81× slower
large           776.1               107.4            7.23× slower

# PNG → resize → PNG out
fixture     parabun (med ms)    sharp   (med ms)    speedup
small             9.5                 6.1            1.56× slower
medium          120.0                22.2            5.41× slower
large           406.6                48.5            8.38× slower
```

## What the data says

**Sharp is faster pretty much everywhere.** That is the honest
result and we shouldn't pretend otherwise. The only spot bun:image
wins is the small-fixture JPEG round-trip, where the per-call
overhead of a Sharp instance dominates the work, and the gap
disappears as soon as the image grows.

Why Sharp wins:

- It's libvips under the hood, which has decades of mature SIMD-
  optimized kernels for resize, blur, and color-space conversions.
  bun:image's resize and blur are scalar two-pass C++ — correct
  and reasonably tight, but no AVX2 / NEON.
- libvips streams in tiles for large inputs; bun:image decodes the
  whole image into one buffer, which is cache-unfriendly at 4K.
- Sharp's PNG path uses libpng with tile-aware filtering; ours
  uses libpng's simplified `png_image_read_from_memory` API, which
  is convenient but slower on big inputs.

The slowdown grows with image size — that's the SIMD gap
compounding, not a correctness gap.

## When bun:image is still the right pick

Sharp's headline advantage is real. The cases where bun:image is
nevertheless the better tool:

- **Bundling.** Sharp is ~30 MB of platform-specific native code
  per architecture, ABI-pinned to your Node version, with a
  prebuild fallback that pulls libvips at install time. bun:image
  is statically linked into the runtime — no `npm install`,
  no Node-ABI drift, no failure mode where the prebuild fetch
  404s in CI.
- **Small images.** Thumbnails, avatars, OG-image generators —
  workloads where each image is < 1 MP. The throughput gap is
  small in absolute terms, the install simplicity is a real win.
- **Single-binary deployments.** If `bun build --compile` is
  the deploy artifact, bun:image is already there; reaching
  for Sharp puts you back in the dynamic-linking-against-libvips
  business.
- **Workloads where image processing is a small fraction of
  total CPU.** Resizing the user's avatar on signup is fine at
  bun:image speed.

If you're running a thumbnail generator at 1000 req/s on 4K
inputs, Sharp is the right call.

## Memory

This empirical result is recorded in `memory/project_parabun_image_vs_sharp.md`
so future sessions don't accidentally claim parity with Sharp.
