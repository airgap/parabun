# parabun-gpu-matvec

Microbenchmark: `@para/simd.matVec` vs `parabun:gpu.matVec` across a grid of
M × K sizes, plus bit-exactness cross-check.

Answers one question: does the GPU kernel beat the tight `f32x4` SIMD
kernel at any size? Today, on both M1/M2 (Metal) and RTX 4070 Ti
(CUDA PTX), the answer is **no** — the GPU path is slower across the
whole grid we tested. That's why `winsForSize("matVec", ...)` is gated
at `Infinity` on both backends: no pipeline-style caller ever routes
through the GPU matVec, even though the kernel is compiled and correct.

The real bottleneck is not the kernel but the host→device copy on
every call. On Metal it's `newBufferWithBytes:` into a shared-storage
MTLBuffer; on CUDA it's `cuMemAlloc + cuMemcpyHtoD` over PCIe. Either
way, a 1024×1024 Float32Array is 4 MB and the copy dominates compute.
On CUDA the picture is worse because the kernel launch has to round-
trip a `cuCtxSynchronize` too. A truly zero-copy path
(`newBufferWithBytesNoCopy:` with page-aligned buffers, or cross-call
GPU residency — see LLMs.md "Tier 4") would change this picture; the
kernel tuning won't.

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

On a Linux host with CUDA (e.g. RTX 4070 Ti, release Bun), the PTX
kernel runs end-to-end but loses to SIMD everywhere that matters. The
per-call `cuMemAlloc + cuMemcpyHtoD + cuLaunchKernel + cuCtxSynchronize`
round trip dominates: at 1024² (4 MB) the GPU call takes ~4.4 ms vs
~0.4 ms SIMD (0.09× speedup); at 4096×2048 (32 MB) the gap holds at
~0.15×. Only the tiny 256² case is a near-wash, and that's inside
noise. The kernel itself is effectively free — the PCIe copy and the
synchronize dwarf it. Residency (`cuMemAlloc` once + reuse) is the
unlock here, not kernel tuning.

On a Linux host without CUDA (or with ASAN-disabled `cuInit`), both
`parabun:gpu.matVec` and `@para/simd.matVec` resolve to the same tight SIMD
path, so the reported speedup is ~1.0× and `wins?` is `no` for every
row.

## Output format

Metal (Apple Silicon M-series):

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

CUDA (RTX 4070 Ti, PCIe 4.0 ×16):

```
gpu backend: cuda  available=[cuda,cpu]  platform=linux

     M × K      |      elems | wins? | simd med (ms) | gpu  med (ms) |  speedup
--------------------------------------------------------------------------------------------
   256 × 256    |      65536 | no    |          0.07 |          0.04 |    1.84×
   512 × 512    |     262144 | no    |          0.10 |          0.10 |    1.01×
  1024 × 1024   |    1048576 | no    |          0.39 |          4.45 |    0.09×
  2048 × 2048   |    4194304 | no    |          2.21 |         11.97 |    0.18×
  4096 × 2048   |    8388608 | no    |          3.62 |         23.56 |    0.15×
 10000 × 384    |    3840000 | no    |          7.90 |         20.10 |    0.39×
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
  matches `@para/simd` closely enough that this is usually exact.
- `winsForSize("matVec", …)` returns `false` for every size right now.
  The `MIN_MATVEC_DISPATCH_ELEMS` threshold (1<<20) is separate — it's
  what lets the benchmark exercise the real MSL kernel so we'd notice
  a regression. When someone tunes the kernel (threadgroup tiling,
  vec-in-shared-memory reuse, reduction-per-threadgroup) to actually
  beat `@para/simd`, drop `MIN_MATVEC_WINS_ELEMS` back down to a concrete
  number and these two constants collapse into one.
- `parabun:gpu.matVec` on hosts with no real GPU backend (cpu backend) just
  forwards to `@para/simd`, so there's no harm in calling it regardless.
