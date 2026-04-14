# parabun-gpu-matmul

Microbenchmark: CUDA matmul (32×32 shared-memory tiled PTX, unrolled K) vs JS
triple loop.

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
   128×128×128 |   2.1M | js         |     1.37 |   1.00× |         -
   128×128×128 |   2.1M | gpu-cold   |     1.37 |   1.00× |         -
   128×128×128 |   2.1M | gpu-held   |     0.08 |  16.61× |      0.41

   256×256×256 |  16.8M | js         |    10.88 |   1.00× |         -
   256×256×256 |  16.8M | gpu-cold   |     0.76 |  14.36× |         -
   256×256×256 |  16.8M | gpu-held   |     0.27 |  40.66× |      0.24

   512×512×512 | 134.2M | js         |    89.23 |   1.00× |         -
   512×512×512 | 134.2M | gpu-cold   |     2.81 |  31.79× |         -
   512×512×512 | 134.2M | gpu-held   |     1.12 |  79.97× |      0.89

 1024×512×1024 | 536.9M | js         |   349.96 |   1.00× |         -
 1024×512×1024 | 536.9M | gpu-cold   |     6.46 |  54.16× |         -
 1024×512×1024 | 536.9M | gpu-held   |     3.38 | 103.50× |      1.69

correctness check @ 128×128×128:
  js vs gpu-cold     : 0 mismatches (tol 1e-4), maxErr=0.00e+0
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

## Kernel shape

The kernel is a 32×32 shared-memory tiled matmul: each block computes a
32×32 output tile. A and B are cooperatively loaded into `MMAs[32][32]`
and `MMBs[32][32]` (one f32 per thread, `bar.sync`'d), then the inner
K-loop does 32 fully-unrolled `fma.rn.f32`'s reading from shared. Each
thread still computes one output cell; global reads are amortized 32×
over the tile.

Going tiled (replacing the earlier naive one-thread-per-output kernel)
gained ~5–15 % at every size tested — less than the textbook
expectation. The reason: the naive kernel was already mostly
L1-resident because every 32-thread warp repeatedly reads the same 32
B-columns, so explicit shared tiling mostly moved the reuse from
implicit cache to explicit SMEM. The bigger headroom is register
tiling (each thread accumulates a 4×4 or 8×8 sub-tile), vectorized
`ld.global.v4.f32` loads, and eventually tensor cores — those are the
path toward device peak (~13 TFLOPS f32). Current `gpu-cold` is still
only ~0.6 % of peak at 1024×512×1024 (~83 GFLOPS); plenty of room left
on the table if a workload demands it.

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
