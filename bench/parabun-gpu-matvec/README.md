# parabun-gpu-matvec

Microbenchmark: `bun:simd.matVec` vs `bun:gpu.matVec` across a grid of
M × K sizes, plus bit-exactness cross-check.

Answers one question: does the naive one-thread-per-row MSL kernel beat
the tight `f32x4` SIMD kernel at any size? Today, on M1/M2, the answer
is **no** — the GPU path is slower across the whole grid we tested.
That's why `winsForSize("matVec", ...)` is gated at `Infinity`: no
pipeline-style caller ever routes through the GPU matVec, even though
the kernel is compiled and correct.

## Running

```sh
bun run build:release bench/parabun-gpu-matvec/run.pjs
```

(Debug build is ~3× slower on the SIMD path and inverts the crossover,
so always use the release build for timing comparisons.)

## What to expect

On an Apple Silicon mac (Metal active), SIMD wins everywhere. Buffer
alloc + dispatch + readback is fixed overhead per call, and the naive
kernel is memory-bandwidth-bound — Apple Silicon unified memory gives
the CPU and GPU roughly equivalent bandwidth, so the GPU can't hide its
fixed cost. Expect `speedup ≈ 0.2–0.5×` (GPU slower) across the entire
size grid.

On a Linux host without CUDA (or with ASAN-disabled `cuInit`), both
`bun:gpu.matVec` and `bun:simd.matVec` resolve to the same tight SIMD
path, so the reported speedup is ~1.0× and `wins?` is `no` for every
row.

## Output format

```
gpu backend: metal  available=[metal,cpu]  platform=darwin

     M × K      |      elems | wins? | simd med (ms) | gpu  med (ms) |  speedup
--------------------------------------------------------------------------------------------
   256 × 256    |      65536 | no    |          0.03 |          0.03 |    0.99×
   512 × 512    |     262144 | no    |          0.04 |          0.04 |    1.00×
  1024 × 1024   |    1048576 | no    |          0.19 |          0.96 |    0.20×
  2048 × 2048   |    4194304 | no    |          1.04 |          1.82 |    0.57×
  4096 × 2048   |    8388608 | no    |          2.04 |          4.07 |    0.50×
 10000 × 384    |    3840000 | no    |          0.75 |          2.00 |    0.37×
```

Two regimes visible: at the bottom (< 256k elems) the SIMD path completes
before the GPU dispatch overhead even closes, so both wall-clock numbers
collapse to the ~30µs floor. Above that, the MSL kernel runs but is
bandwidth-bound at roughly half the rate of the `f32x4` loop, so the GPU
takes ~2× as long across the rest of the grid.

Columns:
- `wins?` — backend's own `winsForSize` verdict for that size. Always
  `no` today because the dispatch threshold and the wins threshold are
  decoupled (see note below); only the dispatch threshold lets the MSL
  kernel run so the benchmark can measure it at all.
- `simd/gpu med (ms)` — median of 7 samples after one warmup call.
- `speedup` — simd_med / gpu_med. Numbers > 1 mean GPU is faster.

## Notes

- The matrix is filled with a deterministic LCG, so every run sees the
  same input and every backend must return the same scores. The cross-
  check asserts `maxErr < 1e-3`; the MSL kernel's per-row FMA order
  matches `bun:simd` closely enough that this is usually exact.
- `winsForSize("matVec", …)` returns `false` for every size right now.
  The `MIN_MATVEC_DISPATCH_ELEMS` threshold (1<<20) is separate — it's
  what lets the benchmark exercise the real MSL kernel so we'd notice
  a regression. When someone tunes the kernel (threadgroup tiling,
  vec-in-shared-memory reuse, reduction-per-threadgroup) to actually
  beat `bun:simd`, drop `MIN_MATVEC_WINS_ELEMS` back down to a concrete
  number and these two constants collapse into one.
- `bun:gpu.matVec` on hosts with no real GPU backend (cpu backend) just
  forwards to `bun:simd`, so there's no harm in calling it regardless.
