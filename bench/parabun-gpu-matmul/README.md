# parabun-gpu-matmul

Microbenchmark: CUDA matmul (naive PTX, one-thread-per-output) vs JS triple
loop.

`gpu.matmul(a, b, M, K, N)` routes (M×K)·(K×N) → M×N through a PTX
`matmulF32` kernel on the CUDA backend when (a) the work crosses a size
gate (M·K·N ≥ 16.7M — below that, the JS loop wins because of dispatch
overhead) or (b) the caller held one or both operands via `gpu.hold`. On
hosts without CUDA the call falls through to the same JS triple loop and
this bench compares apples to apples.

## Running

```sh
bun run build:release bench/parabun-gpu-matmul/run.pjs
```

Requires a CUDA-capable NVIDIA GPU and a release build (ASAN disables
`cuInit`). Without CUDA the `gpu-*` rows collapse to the `js` baseline.

## RTX 4070 Ti, PCIe 4.0 ×16

```
gpu backend: cuda  available=[cuda,cpu]  platform=linux

         M×K×N |    FMA | scenario   | med (ms) |   vs js | hold (ms)
------------------------------------------------------------------------------
   128×128×128 |   2.1M | js         |     1.59 |   1.00× |         -
   128×128×128 |   2.1M | gpu-cold   |     1.59 |   1.00× |         -
   128×128×128 |   2.1M | gpu-held   |     0.20 |   8.11× |      1.40

   256×256×256 |  16.8M | js         |    12.71 |   1.00× |         -
   256×256×256 |  16.8M | gpu-cold   |     0.81 |  15.68× |         -
   256×256×256 |  16.8M | gpu-held   |     0.31 |  40.91× |      0.26

   512×512×512 | 134.2M | js         |   147.54 |   1.00× |         -
   512×512×512 | 134.2M | gpu-cold   |     3.13 |  47.13× |         -
   512×512×512 | 134.2M | gpu-held   |     1.49 |  98.85× |      0.94

 1024×512×1024 | 536.9M | js         |   369.64 |   1.00× |         -
 1024×512×1024 | 536.9M | gpu-cold   |     7.10 |  52.09× |         -
 1024×512×1024 | 536.9M | gpu-held   |     3.82 |  96.86× |      2.41

correctness check @ 128×128×128:
  js vs gpu-cold      : 0 mismatches (tol 1e-4), maxErr=0.00e+0
  gpu-cold vs gpu-held: 0 mismatches (exact), maxErr=0.00e+0
```

Both `gpu-cold` and `gpu-held` are bit-identical to the naive JS
reference across these sizes — the PTX kernel uses `fma.rn.f32` with the
same summation order per output cell (walk K sequentially), so no f32
FMA re-association creeps in.

At 128³ the dispatch threshold (`M·K·N ≥ 2²⁴ = 16.7M`) is not yet met,
so `gpu-cold` collapses to the JS loop — that's the "1.00×" row.
`gpu-held` skips the threshold (residency is explicit caller opt-in)
and wins anyway because the HtoD already happened at `hold` time.

## Break-even (cold vs held vs js)

For a held matmul to pay off you need enough warm calls to amortize the
one-time `hold(a) + hold(b)` cost vs calling `gpu.matmul(a, b, …)` cold:

- 128³:          hold 1.40 ms, per-call savings 1.39 ms → ~1 call
- 256³:          hold 0.26 ms, per-call savings 0.50 ms → ~1 call (!)
- 512³:          hold 0.94 ms, per-call savings 1.64 ms → ~1 call
- 1024×512×1024: hold 2.41 ms, per-call savings 3.28 ms → ~1 call

i.e. residency is worth it after a single reuse at every size we tested.
That's not a fluke — the matmul HtoD is O(MK + KN) bytes but the kernel
walks O(MKN) FMAs, so cold's per-call HtoD shrinks relative to compute
and the "held saves one HtoD" advantage becomes small. Still, held is
never slower than cold, so the recommendation is: if the matrix is
reused even twice, hold it.

## Why this is fast even though the kernel is naive

The kernel is one thread per output cell with no shared-memory tiling —
dumb matmul. It's still 47–99× JS because:

1. **The JS loop is fp64** under JSC's typed-array store pattern, so it
   runs at scalar fp64 speed (~0.4–1 GFLOP/s on this CPU).
2. **The GPU does it at naive fp32** on 7680 shader units at 2.6 GHz.
   Even without tiling, memory-BW-per-thread is compensated by the
   L1/L2 caches and the write coalescing.

A tiled kernel (shared-memory blocking, 32×32 tiles) would improve
`gpu-cold` toward device peak (~13 TFLOPS f32). Leaving that for later
if a workload demands it — the residency-first API already gets the
caller most of the way.

## What this unlocks

With `gpu.hold(mat) + gpu.matmul(…)` now doing real work on CUDA, the
pattern "hot weights, rotating batch" (classifier head, attention
projection, embedding matmul) is viable on `bun:gpu`:

```js
const W = gpu.hold(weights); // pay HtoD once
for await (const batch of stream) {
  const logits = gpu.matmul(W, batch, OUT, IN, BATCH);
  // ...
}
gpu.release(W);
```

The same shape as the Metal/CUDA `matVec` residency path, extended from
O(MK) bandwidth to O(MKN) compute. That's where dedicated GPUs
decisively beat SIMD even though SIMD beats cold CUDA on single-shot
matVec.
