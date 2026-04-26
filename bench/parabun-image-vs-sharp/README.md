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

## Headline numbers (after row-parallel kernels)

16-core x86 release build, sharp 0.34.5, best-of-7 per cell after 2
warmup runs:

```
# decode → encode (JPEG q85)
fixture     parabun (med ms)    sharp   (med ms)    speedup
small             3.6                 2.3            1.57× slower
medium           28.8                26.6            1.08× slower
large           117.9                70.5            1.67× slower

# resize to 1/2 (Lanczos, JPEG out)
fixture     parabun (med ms)    sharp   (med ms)    speedup
small             3.9                 3.1            1.27× slower
medium           26.3                16.9            1.55× slower
large            96.5                58.0            1.66× slower

# Gaussian blur (radius 5, JPEG out)
fixture     parabun (med ms)    sharp   (med ms)    speedup
small             5.5                 4.6            1.19× slower
medium           57.2                28.6            2.00× slower
large           250.6               113.2            2.21× slower

# PNG → resize → PNG out
fixture     parabun (med ms)    sharp   (med ms)    speedup
small             9.0                 6.4            1.41× slower
medium           87.2                22.0            3.97× slower
large           232.3                51.7            4.49× slower
```

## Where we used to be vs where we are now

A previous version of this README documented the unoptimized
scalar implementation. For honesty, here's the delta after
parallelizing the row loops in resize / blur / sharpen / Sobel /
adjust / invert / threshold / luma:

| op | size | before | after |
|---|---|---|---|
| Lanczos resize | large | 4.09× slower | **1.66× slower** |
| Gaussian blur | large | 7.23× slower | **2.21× slower** |
| Gaussian blur | medium | 6.81× slower | **2.00× slower** |
| PNG pipeline | large | 8.38× slower | **4.49× slower** |

Blur dropped from 7× to 2.2× from threading alone. Resize from
4× to 1.66×. PNG pipeline is still the worst because libpng's
simplified API is single-buffer (we don't tile-stream the codec).

## What still costs us

Threading covered most of the multi-core gap. The remaining
factor-of-2 on blur and Lanczos comes from libvips's per-thread
SIMD: AVX2 on x86, NEON on ARM, hand-tuned for the inner-loop
shape of each kernel. bun:image's inner loops are still scalar.

The PNG-pipeline gap is bigger because libpng's simplified
`png_image_*` API forces single-buffer decode. libvips drops
to libpng's lower-level row-callback API for tile-aware
filtering. Switching to that is the next obvious move on the
PNG side.

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
