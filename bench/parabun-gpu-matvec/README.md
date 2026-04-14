# parabun-gpu-matvec

Microbenchmark: `bun:simd.matVec` vs `bun:gpu.matVec` across a grid of
M × K sizes, plus bit-exactness cross-check.

Answers one question: does the MSL kernel beat the tight `f32x4` SIMD
kernel at any size? Today, on M1/M2, the answer is **no** — the GPU
path is slower across the whole grid we tested. That's why
`winsForSize("matVec", ...)` is gated at `Infinity`: no pipeline-style
caller ever routes through the GPU matVec, even though the kernel is
compiled and correct.

The real bottleneck is not the kernel but the `newBufferWithBytes:`
copy into shared-storage MTLBuffer on every call — a 1024×1024
Float32Array is 4 MB, and copying it across the PCIe-equivalent
Apple-Silicon unified memory fence costs more than the compute ever
saves. A truly zero-copy path (`newBufferWithBytesNoCopy:` with
page-aligned buffers, or cross-call GPU residency — see LLMs.md
"Tier 4") would change this picture; the kernel tuning won't.

## Running

```sh
bun run build:release bench/parabun-gpu-matvec/run.pjs
```

(Debug build is ~3× slower on the SIMD path and inverts the crossover,
so always use the release build for timing comparisons.)

## What to expect

On an Apple Silicon mac (Metal active), SIMD wins everywhere. Per-call
overhead (4 MB mat copy into a shared MTLBuffer + command buffer commit
+ wait) is several hundred microseconds; the CPU's `f32x4` kernel has
already finished by the time the GPU kernel is dispatched. Expect
`speedup ≈ 0.2–0.5×` (GPU slower) across the entire size grid.

On a Linux host without CUDA (or with ASAN-disabled `cuInit`), both
`bun:gpu.matVec` and `bun:simd.matVec` resolve to the same tight SIMD
path, so the reported speedup is ~1.0× and `wins?` is `no` for every
row.

## Output format

```
gpu backend: metal  available=[metal,cpu]  platform=darwin

     M × K      |      elems | wins? | simd med (ms) | gpu  med (ms) |  speedup
--------------------------------------------------------------------------------------------
   256 × 256    |      65536 | no    |          0.03 |          0.03 |    1.04×
   512 × 512    |     262144 | no    |          0.04 |          0.04 |    1.08×
  1024 × 1024   |    1048576 | no    |          0.18 |          0.90 |    0.20×
  2048 × 2048   |    4194304 | no    |          0.98 |          1.91 |    0.51×
  4096 × 2048   |    8388608 | no    |          2.05 |          4.60 |    0.44×
 10000 × 384    |    3840000 | no    |          0.70 |          2.60 |    0.27×
```

Two regimes visible. At the bottom (< 256k elems) the SIMD path completes
before the GPU dispatch overhead even closes, so both wall-clock numbers
collapse to the ~30µs floor. Above that, the per-call 4 MB mat copy is
the dominant cost and stays proportional to matrix size, so the gap
widens.

The current kernel uses simdgroup reduction (32 threads per row, stride-
32 partial dot, `simd_sum` tree reduction). This design is strictly
better than the earlier one-thread-per-row kernel for memory coalescing,
but the improvement is invisible at these sizes because the copy
dominates the kernel runtime. The kernel is correct and future-proofed
for discrete GPUs (CUDA) where dedicated VRAM bandwidth would make it
win outright.

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
