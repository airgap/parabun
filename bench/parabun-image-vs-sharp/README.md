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

## Headline numbers (after row-parallel + branchless inner loops)

16-core x86 release build (`-O3 -march=haswell`, AVX2 enabled), sharp 0.34.5,
best-of-7 per cell after 2 warmup runs:

```
# decode → encode (JPEG q85)
fixture     parabun (med ms)    sharp   (med ms)    speedup
medium           28.7                16.5            1.74× slower
large           119.7                73.2            1.64× slower

# resize to 1/2 (Lanczos, JPEG out)
fixture     parabun (med ms)    sharp   (med ms)    speedup
medium           26.6                15.7            1.69× slower
large            94.1                55.9            1.68× slower

# Gaussian blur (radius 5, JPEG out)
fixture     parabun (med ms)    sharp   (med ms)    speedup
medium           53.4                26.6            2.01× slower
large           186.0               104.8            1.77× slower

# PNG → resize → PNG out
fixture     parabun (med ms)    sharp   (med ms)    speedup
medium           75.4                21.2            3.56× slower
large           229.1                48.6            4.72× slower
```

## Where we used to be vs where we are now

A previous version of this README documented the unoptimized
scalar implementation. For honesty, here's the delta after
parallelizing the row loops in resize / blur / sharpen / Sobel /
adjust / invert / threshold / luma:

| op | size | scalar serial | row-parallel | + branchless inner |
|---|---|---|---|---|
| Lanczos resize | large | 4.09× slower | 1.66× | **1.68×** |
| Gaussian blur | large | 7.23× slower | 2.21× | **1.77×** |
| Gaussian blur | medium | 6.81× slower | 2.00× | **2.01×** |
| PNG pipeline | large | 8.38× slower | 4.49× | **4.72×** |
| JPEG round-trip | large | 1.36× slower | 1.67× | **1.64×** |

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

## GPU dispatch — `image.blur(img, { gpu: true })`

There's an opt-in GPU path through `bun:gpu`'s `imageBlurRGBA` primitive
(fused single-launch CUDA kernel; `cuda.ts` ships a tiled shared-memory
variant for radius ≤ 16). On a desktop RTX 4070 Ti, this path is
**slower than the CPU SIMD path** because of host-side power management,
not the kernel itself.

```sh
bun run build:release --asan=off bench/parabun-image-vs-sharp/gpu-warm.ts
```

Output on this dev machine (RTX 4070 Ti, CUDA 12.8, Linux desktop):

```
# 4096² RGBA Gaussian blur (radius 5)

CPU SIMD (steady):           39.9 ms
GPU cold (idle GPU):        190.7 ms
GPU sustained (warm):       111.0 ms     ← steady state after ~30 dispatches

vs CPU baseline:
  cold       0.21× GPU slower
  sustained  0.36× GPU slower
```

Two findings:

1. **GPU compute clocks ramp quickly** — sustained dispatch drops from
   ~190 ms to ~111 ms within 30 iterations as the GPU exits P8 idle.
   The kernel itself is fine; the warmup tax is real but bounded.
2. **PCIe link stays in low-power mode** — even after 200 back-to-back
   dispatches, `nvidia-smi --query-gpu=pcie.link.gen.current,...` still
   reports **Gen 1 x8** (≈ 2 GB/s) instead of the rated Gen 4 x16
   (≈ 32 GB/s). At Gen 1 x8, the 64 MB H2D + 64 MB D2H per call costs
   ~64 ms of pure PCIe transfer — that alone is more than CPU SIMD's
   total runtime.

The CPU SIMD path runs at memory bandwidth (~30 GB/s on x86 DDR4),
which is *higher* than this host's idle-state PCIe link. So GPU loses
on a desktop where the link is in low-power mode and never ramped.

When `image.blur({ gpu: true })` is the right call:

- Server-class hosts that keep the GPU under constant traffic so the
  PCIe link stays in Gen 4 x16. Re-run `gpu-warm.ts` on production
  hardware before pitching this as a feature.
- Hosts where `nvidia-smi -lgc` / persistent mode is set (admin
  privilege).
- Workloads with much heavier kernel work per byte transferred —
  `bun:llm` matmul on a held weight buffer is the existing example.
- Pipelines that batch many image ops on already-resident GPU buffers.

The GPU dispatch architecture (`gpu.imageBlurRGBA`, the CUDA tiled
kernel, persistent device + pinned host buffers, fall-through to CPU
when no GPU is wired) is in place and correct. Wiring up Metal will
mirror this same shape; WebGPU is deferred until there's a server-side
use case for it.

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
