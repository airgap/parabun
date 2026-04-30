# parabun-monte-carlo

Black-Scholes European call option priced by Monte Carlo simulation,
single-threaded vs `para:parallel.pmap` across 8 workers. No SIMD — this
bench is the pure `pmap` showcase, proving that the worker pool carries
its weight on CPU-bound work that doesn't map to vector primitives.

## Workload

- N = 50,000,000 sample price paths.
- Parameters: S₀ = 100, K = 100, T = 1, r = 0.05, σ = 0.2.
- Per sample: mulberry32 → Box-Muller → geometric Brownian motion →
  `max(Sₜ - K, 0)`.
- Final price: `exp(-rT) · mean(payoffs)`.
- Expected analytic price (closed-form Black-Scholes): ~10.4506.

## Results (best-of-5, release build)

| variant                       | score_ms (min/med/max)   | price    |
|-------------------------------|-------------------------:|---------:|
| baseline (single-threaded)    | 1417.6 / 1441.2 / 1444.3 | 10.4522  |
| **parabun (pmap × 8)**        |   241.0 /  259.2 /  296.5 | 10.4574  |

Parabun is **5.56× faster**. Both prices converge to the Black-Scholes
closed form (10.4506) within MC noise; deviation between variants is
<0.1%, well inside one standard error.

## Why pmap is a clear win here

Monte Carlo is embarrassingly parallel: every sample is independent, the
only communication is a scalar partial sum at the end, and per-sample
work is pure CPU math (`Math.log`, `Math.cos`, `Math.exp`). There's no
shared memory to contend for, no bandwidth pressure.

What makes the `para:parallel` primitive feel light here:

1. **The pure function contract is enforced at parse time.** `pure
   function mcChunk(chunk)` refuses closures, `this`, and module-level
   references — exactly the things that would silently break when the
   worker runtime re-evaluates `fn.toString()` in an isolated context.
   Everything the kernel needs (seed, sample count, parameters) rides
   in on the input.
2. **Seeds stream from a Weyl sequence.** `BASE_SEED + c · 0x9e3779b9`
   gives each worker an independent mulberry32 stream with
   well-separated output. No shared PRNG state → no coordination.
3. **The pool is warmed once.** A dummy `pmap(warmup, [1..8])` before
   the timed region pays the spawn cost out-of-band.

## Running it

```sh
bun run build:release bench/parabun-monte-carlo/run.ts
```

## Files

- `baseline.js` — single-threaded MC loop with inline mulberry32.
- `variant-parabun.pjs` — same math, split across 8 workers via
  `para:parallel.pmap` with independent PRNG streams.
- `run.ts` — best-of-5 harness, parses timing line, reports min/med/max
  and sanity-checks that the price agrees within 2%.
