# parabun-cuda-residency

Microbenchmark: CUDA matVec with host-to-device residency (Tier 4) vs
per-call copy.

Answers one question the main `bench/parabun-gpu-matvec` run could not:
**once the HtoD cost is amortized across many `matVec` calls, does the
CUDA kernel beat `para:simd`?** Yes — by a lot, on an RTX 4070 Ti.

The general matVec bench keeps `gpu.matVec(mat, vec, M, K)` as the
non-resident path, which pays `cuMemAlloc + cuMemcpyHtoD +
cuLaunchKernel + cuCtxSynchronize + cuMemcpyDtoH + cuMemFree × 3` per
call. That copy-per-call dominates, so cold GPU loses 3–10× to SIMD.

`gpu.hold(mat)` does the `cuMemAlloc + cuMemcpyHtoD` for `mat` **once**
and returns a handle. Every subsequent `gpu.matVec(h, vec, M, K)` reuses
that device memory, so only the much-cheaper `vec` copy + kernel + DtoH
run per call. Across 20 warm calls the per-call cost collapses to the
kernel + small copies.

## Running

```sh
bun run build:release bench/parabun-cuda-residency/run.pjs
```

Requires a CUDA-capable NVIDIA GPU and a release build (ASAN disables
`cuInit`; see `src/js/bun/gpu/cuda.ts`). On hosts without CUDA the
backend falls through to `cpu` and `gpu-held` collapses to the SIMD
path — the numbers you see below are specific to this hardware.

## RTX 4070 Ti, PCIe 4.0 ×16

```
gpu backend: cuda  available=[cuda,cpu]  platform=linux

     M × K      |    MB | scenario   | med (ms) | vs simd | hold (ms)
------------------------------------------------------------------------------
  1024 × 1024   |   4.0 | plain      |     0.35 |   1.00× |         -
  1024 × 1024   |   4.0 | gpu-cold   |     6.32 |   0.06× |         -
  1024 × 1024   |   4.0 | gpu-held   |     0.25 |   1.44× |      2.96

  2048 × 2048   |  16.0 | plain      |     2.11 |   1.00× |         -
  2048 × 2048   |  16.0 | gpu-cold   |    23.14 |   0.09× |         -
  2048 × 2048   |  16.0 | gpu-held   |     0.29 |   7.40× |     21.16

  4096 × 2048   |  32.0 | plain      |     3.48 |   1.00× |         -
  4096 × 2048   |  32.0 | gpu-cold   |    46.18 |   0.08× |         -
  4096 × 2048   |  32.0 | gpu-held   |     0.21 |  16.92× |     45.09

 10000 × 384    |  14.6 | plain      |     2.10 |   1.00× |         -
 10000 × 384    |  14.6 | gpu-cold   |    21.69 |   0.10× |         -
 10000 × 384    |  14.6 | gpu-held   |     0.38 |   5.55× |     17.64
```

Correctness is bit-exact between `gpu-cold` and `gpu-held` (same kernel,
different staging). `simd` vs `gpu-cold` differs on ~1% of rows at K=1024
with maxErr ~1.3e-5 — that's f32 FMA re-association, well inside the
rounding window.

## Break-even

`gpu-held` is strictly better than `gpu-cold`, so the only question is
whether enough calls amortize the `hold` cost vs `plain` (SIMD):

- 1024² (4 MB mat): hold 2.96 ms, per-call savings 0.10 ms → ~30 calls
- 2048² (16 MB):    hold 21.16 ms, per-call savings 1.82 ms → ~12 calls
- 4096×2048 (32 MB): hold 45.09 ms, per-call savings 3.27 ms → ~14 calls
- 10000×384 (14.6 MB): hold 17.64 ms, per-call savings 1.72 ms → ~11 calls

For any workload that reuses a matrix across more than a handful of
queries (RAG retrieval, classifier scoring, attention over static KV
projections, batch scoring in general) the held path is a decisive
win. For true one-shots, SIMD still wins — which is why
`winsForSize("matVec", …)` returns `false`; callers opt in via
`gpu.hold` explicitly.

## What this unlocks

Before this bench, Tier 4 residency was "Metal-only in practice" — the
measurements in `bench/parabun-metal-zerocopy` covered Apple Silicon,
and CUDA had no residency path (its `hold` was a stub). With
`cuMemAlloc + cuMemcpyHtoD` in `hold()` and a held-aware
`launchMatVecF32`, the CUDA backend is now the first place in
`parabun:gpu` where a dedicated GPU can credibly beat SIMD — it just needs
the caller to say "this matrix is hot" via `gpu.hold`.

Pending per Tier 4:
- implicit residency via escape analysis (so common code doesn't have
  to call `hold` manually). For discrete GPUs this is the difference
  between "fast if you know" and "fast by default."
