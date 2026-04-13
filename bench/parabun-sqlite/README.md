# Parabun vs Bun — SQLite analytical benchmark

Three variants of the same workload — post-query analytical processing of
time-series sensor data from SQLite — to answer two questions:

1. Does Parabun impose any overhead on idiomatic Bun code?
   (compare variant A → variant B)
2. Do Parabun's language features (`|>`, `pure`, `bun:simd`, `bun:pipeline`)
   deliver a practical speedup when used deliberately?
   (compare variant A → variant C)

## Workload

`seed.ts` generates a SQLite database with `N_ROWS` rows of sensor readings
across 8 sensors. Each variant then, per sensor, computes:

- mean, stddev
- weighted dot product (weights = exponential decay)
- anomaly count (|v − mean| > 3·stddev)

The analytical step (not the query) is what we're measuring.

## Variants

- **`variant-a.js`** — idiomatic `bun:sqlite` + plain JS loops. Runs under
  Parabun's runtime but uses only standard Bun APIs. Reference baseline.
- **`variant-b.pjs`** — same logic as A, but in a `.pjs` file. Confirms
  Parabun's parser changes don't add overhead when its features aren't
  used.
- **`variant-c.pjs`** — rewritten to use `bun:simd` primitives and
  `bun:pipeline` fusion. Pulls each sensor's column into a `Float64Array`
  and runs the analytics as SIMD-backed operations.

## Running

```sh
bun bd bench/parabun-sqlite/seed.ts                 # creates bench.db once
bun bd bench/parabun-sqlite/variant-a.js            # baseline
bun bd bench/parabun-sqlite/variant-b.pjs           # zero-overhead check
bun bd bench/parabun-sqlite/variant-c.pjs           # parabun-optimized

# Or release build for fair numbers:
bun run build:release bench/parabun-sqlite/variant-a.js
bun run build:release bench/parabun-sqlite/variant-c.pjs
```

Each variant prints its per-sensor results and a total `elapsed_ms`.
