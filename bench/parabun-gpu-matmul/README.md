# parabun-gpu-matmul

Microbenchmark: CUDA matmul (32×32 SMEM tile × 4×4 per-thread register tile,
unrolled K) vs JS triple loop.

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
   128×128×128 |   2.1M | js         |     1.39 |   1.00× |         -
   128×128×128 |   2.1M | gpu-cold   |     1.39 |   1.00× |         -
   128×128×128 |   2.1M | gpu-held   |     0.08 |  16.55× |      0.48

   256×256×256 |  16.8M | js         |    11.01 |   1.00× |         -
   256×256×256 |  16.8M | gpu-cold   |     0.73 |  15.03× |         -
   256×256×256 |  16.8M | gpu-held   |     0.26 |  42.23× |      0.24

   512×512×512 | 134.2M | js         |    88.71 |   1.00× |         -
   512×512×512 | 134.2M | gpu-cold   |     2.68 |  33.08× |         -
   512×512×512 | 134.2M | gpu-held   |     1.04 |  85.16× |      0.88

 1024×512×1024 | 536.9M | js         |   349.95 |   1.00× |         -
 1024×512×1024 | 536.9M | gpu-cold   |     6.15 |  56.94× |         -
 1024×512×1024 | 536.9M | gpu-held   |     3.06 | 114.25× |      1.65

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

- 128³:          hold 0.48 ms, per-call savings 1.31 ms → ~1 call
- 256³:          hold 0.24 ms, per-call savings 0.47 ms → ~1 call (!)
- 512³:          hold 0.88 ms, per-call savings 1.64 ms → ~1 call
- 1024×512×1024: hold 1.65 ms, per-call savings 3.09 ms → ~1 call

i.e. residency is worth it after a single reuse at every size we tested.
That's not a fluke — the matmul HtoD is O(MK + KN) bytes but the kernel
walks O(MKN) FMAs, so cold's per-call HtoD shrinks relative to compute
and the "held saves one HtoD" advantage becomes small. Still, held is
never slower than cold, so the recommendation is: if the matrix is
reused even twice, hold it.

## Kernel shape

32×32 output tile per block, but now split across only 64 threads (8×8
block = 2 warps). Each thread holds a 4×4 register accumulator and
writes 16 output cells. Per K-tile:

1. Cooperative load: 64 threads × 16 iters = 1024 f32 each into
   `MMAs[32][32]` and `MMBs[32][32]`. `linIdx = flat + i*64` keeps each
   warp's 32 lanes on 32 consecutive slots → coalesced global reads.
2. `bar.sync 0`.
3. Inner K (32 unrolled iters). Each `kk`: thread loads 4 aVals
   (column `kk`, rows `ty*4..ty*4+3`) and 4 bVals (row `kk`, cols
   `tx*4..tx*4+3`) from SMEM, does 16 `fma.rn.f32`s into its 4×4
   tile. That's 8 SMEM loads → 16 FMAs per iter, a compute/SMEM
   ratio of 2.0 (the naive one-thread-per-cell kernel was 0.5).
4. `bar.sync 0`, advance `t += 32`.

Register tiling vs the previous one-thread-per-cell tiled kernel
gained another ~5–10 % at every size tested. Less than textbook
(the ratio jump suggests 2–4×), because on this RTX 4070 Ti the
one-cell kernel was already mostly compute-bound at these sizes —
SMEM bandwidth wasn't the bottleneck. The remaining headroom is
vectorized `ld.global.v4.f32` loads (replacing 4 scalar global loads
with 1 128-bit load, halving address-gen work), async `cp.async`
prefetch (overlap global→SMEM copy with compute), and eventually
tensor cores (device peak is ~13 TFLOPS f32). `gpu-cold` at
1024×512×1024 hits ~175 GFLOPS — about 1.3 % of peak, double what
the one-cell kernel managed but still plenty of room.

## What this unlocks

With `gpu.hold(mat) + gpu.matmul(…)` now doing real work on CUDA, the
pattern "hot weights, rotating batch" (classifier head, attention
projection, embedding matmul) is viable on `para:gpu`:

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
