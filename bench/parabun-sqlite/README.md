# parabun-sqlite

End-to-end analytical benchmark: pull 1 M rows of sensor data out of
SQLite, then compute per-sensor statistics. Three variants answer two
questions:

1. Does shipping code as `.pjs` (through Parabun's parser) impose any
   overhead on idiomatic Bun code? *(variant A → B)*
2. Do Parabun's language features (`pure`, `para:simd`, typed-array
   columnar extraction) deliver a practical speedup when applied
   deliberately? *(variant A → C)*

## Workload

`seed.ts` generates `bench.db` once with 1 000 000 sensor readings across
8 sensors (sine-wave + Gaussian noise, deterministic). Each variant then
computes, per sensor:

- mean, stddev
- weighted dot product (weights = exponential decay)
- anomaly count (`|v − mean| > 3·stddev`)

The analytical step is what we're measuring. SQLite extraction cost is
the same across all three variants and dominates total runtime.

## Results (best-of-5, release build, 1 M rows × 8 sensors)

| variant                         | analyze_ms (min/med/max) | total_ms | vs A  |
|---------------------------------|-------------------------:|---------:|------:|
| A  (.js, idiomatic Bun)         |   14.5 /  16.0 /  16.4   |  ~250    | 1.00× |
| B  (.pjs, same code as A)       |   14.5 /  15.2 /  15.9   |  ~253    | 1.05× |
| **C  (parabun-optimized)**      |    5.8 /   5.9 /   6.6   |  ~239    | 2.7×  |

- Variant B confirms `.pjs` parsing is free: the variance between A and
  B is inside run-to-run noise.
- Variant C is **2.7× faster on the analytical step**. End-to-end the
  win is ~5% because the SQLite extraction (~235 ms) is the same
  bottleneck for all three — Parabun doesn't speed up SQLite I/O, only
  the work downstream of it.

## Why variant C wins

1. **Columnar extraction.** `loadSensor` in variants A/B returns
   SQLite's native row iterator (an array-of-rows shape). Variant C
   copies the column into a `Float64Array` once during the load phase.
   The analytical step then operates on contiguous, typed memory.
2. **`para:simd.sum` / `para:simd.dot`** replace the scalar reduction
   loops for mean and variance.
3. **`dot(values, values)` = Σvᵢ²** is reused as the variance input, so
   two passes collapse into one `simd.dot` call.
4. **Precomputed weights.** Since every sensor has the same row count in
   this workload, the exponential-decay weight vector is built once and
   shared across all 8 analytical passes.
5. **Anomaly count stays scalar.** `Math.abs` + branch doesn't vectorize
   cleanly, and the count pass is already cheap — keeping it as a tight
   JS loop is correct.

## Running it

```sh
# One-time: generate bench.db (~150 MB).
bun bd bench/parabun-sqlite/seed.ts

# Debug build, individual variants:
bun bd bench/parabun-sqlite/variant-a.js
bun bd bench/parabun-sqlite/variant-b.pjs
bun bd bench/parabun-sqlite/variant-c.pjs

# Release build, full harness (best-of-5, all three):
bun run build:release bench/parabun-sqlite/run.ts
```

Each variant prints per-sensor results plus `load_ms=X analyze_ms=Y
total_ms=Z`. The harness parses these lines and reports min/med/max per
phase across 5 runs.

## Files

- `seed.ts` — deterministic database generator. Run once before benching.
- `variant-a.js` — idiomatic `bun:sqlite` + scalar JS analytics. Reference.
- `variant-b.pjs` — byte-identical to A with a `.pjs` extension. Zero-
  overhead check for Parabun's parser.
- `variant-c.pjs` — columnar Float64Array extraction, `para:simd.sum`/`dot`,
  shared precomputed weights.
- `run.ts` — best-of-5 harness.
