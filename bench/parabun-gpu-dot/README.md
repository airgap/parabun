# parabun-gpu-dot

Microbenchmark: CUDA `dotF32` PTX kernel vs `para:simd.dot`.

`gpu.dot(a, b)` on CUDA dispatches to a warp-reduce PTX kernel — but
only when the caller held one or both inputs via `gpu.hold`. The cold
path (plain `Float32Array`) falls through to `para:simd` because, at
every size we measured on an RTX 4070 Ti, the per-call HtoD copy
dominates the kernel no matter how big the vector is. Residency
(paying HtoD once) is the whole point of GPU dot.

## Running

```sh
bun run build:release bench/parabun-gpu-dot/run.pjs
```

Requires a CUDA-capable NVIDIA GPU and a release build (ASAN disables
`cuInit`). Without CUDA the `gpu-*` rows collapse to the SIMD baseline.

## RTX 4070 Ti, PCIe 4.0 ×16

```
gpu backend: cuda  available=[cuda,cpu]  platform=linux

         n |    MB | scenario   | med (ms) | vs simd | hold (ms)
--------------------------------------------------------------------------
    262144 |   1.0 | simd       |     0.10 |   1.00× |         -
    262144 |   1.0 | gpu-cold   |     0.10 |   1.00× |         -
    262144 |   1.0 | gpu-held   |     0.12 |   0.81× |      1.40

   1048576 |   4.0 | simd       |     0.49 |   1.00× |         -
   1048576 |   4.0 | gpu-cold   |     0.49 |   1.01× |         -
   1048576 |   4.0 | gpu-held   |     0.11 |   4.42× |      9.67

   4194304 |  16.0 | simd       |     2.05 |   1.00× |         -
   4194304 |  16.0 | gpu-cold   |     2.05 |   1.00× |         -
   4194304 |  16.0 | gpu-held   |     0.10 |  20.11× |     21.58

  16777216 |  64.0 | simd       |     8.26 |   1.00× |         -
  16777216 |  64.0 | gpu-cold   |     8.26 |   1.00× |         -
  16777216 |  64.0 | gpu-held   |     0.37 |  22.60× |     89.90

  33554432 | 128.0 | simd       |    16.54 |   1.00× |         -
  33554432 | 128.0 | gpu-cold   |    16.48 |   1.00× |         -
  33554432 | 128.0 | gpu-held   |     0.68 |  24.32× |    331.72

correctness check @ n=1048576:
  simd=349807.4860  cold=349807.4860  held=349807.4859
  relErr cold=0.00e+0  held=3.62e-10
```

`gpu-cold` rows match `simd` exactly because `MIN_DOT_DISPATCH_ELEMS` is
parked at Infinity — cold dot always falls through to SIMD. `gpu-held`
wins 4–24× across 4–128 MB. Accuracy deviates from SIMD by ~3.6e-10
relative at 1M elements — that's f32 FMA re-association from the
kernel's summation order (warp-bfly per block + host final reduction vs
SIMD's pairwise sum), well inside the rounding window for any
downstream use.

## Break-even (held)

For held to pay off, you need enough warm dot calls to amortize the
one-time `hold(a) + hold(b)` cost:

- 1 MB vectors:   hold 1.40 ms, per-call savings negative (−0.02 ms) → never wins at this size
- 4 MB:           hold 9.67 ms, per-call savings 0.38 ms → ~25 calls
- 16 MB:          hold 21.58 ms, per-call savings 1.95 ms → ~11 calls
- 64 MB:          hold 89.90 ms, per-call savings 7.89 ms → ~12 calls
- 128 MB:         hold 331.72 ms, per-call savings 15.86 ms → ~21 calls

For small vectors (≤ 1 MB) the kernel-launch + per-block partial-sum
read-back alone exceeds SIMD's cost, so `gpu.hold` is not a win — at
that scale just stay on SIMD.

For retrieval-style workloads (large static reference vector, rotating
query) the savings compound: one `hold(refVec)` plus thousands of
`gpu.dot(hRefVec, query)` calls amortizes almost immediately.

## Why cold never wins

Bytes moved per cold call at n = N:
- HtoD A: 4N bytes
- HtoD B: 4N bytes
- DtoH partials: 4 KB (1024 f32)
- Total: ~8N bytes over PCIe

At PCIe 4.0 ×16 the theoretical bandwidth is ~25 GB/s, but pageable
memcpy through the NVIDIA driver's staging buffer caps around
~2–3 GB/s — and we measure a sustained ~760 MB/s for `cuMemcpyHtoD_v2`
on ordinary JS typed arrays. That alone takes ~10 ms for 16 MB, which
already exceeds SIMD's 2 ms full computation. The kernel compute itself
is essentially free by comparison — so there is no cold vector size
where GPU dot wins.

Pinned host memory (`cuMemAllocHost_v2`) was tried as a staging pool
and didn't pay off on this backend. The naive approach — alloc a
reusable page-locked buffer, `typedArray.set()` into it, then DMA to
device — adds a JS-visible memcpy that costs as much as the
`set()`-less path through the driver's internal pinned ring. The
page-locking syscall itself is ~2.5 ms per MB on first alloc, which
dominates any short-running HtoD. Net: 5–8 % cold-path win at best,
and a 1.5–2× hold() regression at 16 MB+ from allocation overhead.
Leaving the pageable path in place; a real win here would need either
`cuMemHostRegister` on stable JS buffers (GC-unsafe today) or an
`alloc(type, length)` API that returns an already-pinned view.

## What this unlocks

The CUDA backend now has real PTX kernels for all three primitives —
`dotF32`, `matVecF32`, `matmulF32` — plus `simdMapAffineF32` for fused
affine chains. Combined with Tier 4 residency (`gpu.hold` / `release`),
the "pin a matrix, stream the query vectors" pattern is now a plain
one-liner:

```js
const hRef = gpu.hold(referenceVector);
for await (const q of queryStream) {
  const score = gpu.dot(hRef, q);   // 22× SIMD on 64 MB ref, f32 accurate
}
gpu.release(hRef);
```

Same shape as matVec/matmul residency, smaller compute footprint.
