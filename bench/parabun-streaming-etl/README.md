# parabun-streaming-etl

Numeric ETL pipeline — three affine transforms on 10 M Float32 sensor
samples, then a sum. Three implementations: idiomatic chained
`.map().map().map().reduce()` on a `Float32Array`, a hand-rolled tight
loop, and a Parabun `|>` pipeline with fusion.

## Workload

- N = 10,000,000 Float32 voltage readings.
- Transform 1: convert to millivolts (× 1000).
- Transform 2: drift-correct (+ 2.5).
- Transform 3: calibrate (× 0.998).
- Reduce: sum.

All three transforms are affine, so the full chain collapses to
`total = K · sum(data) + C · n` with `K = 998`, `C = 2.495`. Parabun's
Tier 2 fusion detects this and dispatches to `para:simd.sum` as one
SIMD-accelerated pass.

## Results (best-of-5, release build)

| variant                               | score_ms (min/med/max)    | vs tight |
|---------------------------------------|--------------------------:|---------:|
| Float32Array `.map` chain + `.reduce` | 302.11 / 302.44 / 340.88  |   0.02×  |
| hand-rolled tight loop                |   6.38 /   7.43 /   7.69  |   1.0×   |
| **parabun `\|>` fusion**              |   5.58 /   5.99 /   6.42  | **1.24×**|

Totals match within 1e-6 across all three (float summation order differs
slightly, but the numeric content is identical).

## Why fusion matters

The idiomatic functional style is catastrophic on a large typed array:
each `.map` allocates a fresh 40 MB `Float32Array`, writes N elements,
and discards it on the next `.map`. Three chained maps means 120 MB of
transient allocation per pipeline run, plus the bandwidth cost of
reading each intermediate. That's why the `.map` chain runs at ~50× the
cost of the equivalent tight loop.

Parabun gives you the tight-loop's throughput without giving up
readability:

```ts
pure function scale(x) { return x * 1000; }
pure function drift(x) { return x + 2.5; }
pure function calib(x) { return x * 0.998; }
const total = await (data |> map(scale) |> map(drift) |> map(calib) |> sum);
```

The fusion pipeline:
1. Sees that `data` is a `Float32Array` — source is fusable.
2. Extends a `FusedChain` descriptor with each `map` (no generator
   allocation per `map`).
3. On `sum`, probes each map with three points. All three are affine
   (fit `k·x + c` exactly), so it composes the chain to a single
   `(K, C) = (998, 2.495)`.
4. Computes `K · simd.sum(data) + C · n` — one SIMD pass over `data`,
   plus two scalar ops.

If any map had been non-affine, fusion would fall back to
`simd.simdMap(composed_fn, data)` — still one pass, still no
intermediate arrays, just without the `simd.sum` fast-path.

## Running it

```sh
bun run build:release bench/parabun-streaming-etl/run.ts
```

## Files

- `gen.js` — deterministic Float32Array generator.
- `baseline-chain.js` — `.map().map().map().reduce()` idiomatic style.
- `baseline-tight.js` — hand-rolled tight loop, inlined math.
- `variant-parabun.pjs` — `|>` chain + pipeline fusion.
- `run.ts` — best-of-5 harness, verifies totals match within 1e-6.
