# simple-statistics: node vs bun vs parabun vs parabun-rewrite

Upstream: [`simple-statistics`](https://github.com/simple-statistics/simple-statistics) v7.8.9, published `dist/simple-statistics.mjs`.
Parabun rewrite: reductions via `para:simd.sum` and `para:simd.dot`, with variance reformulated as `E[X²] − E[X]²` and covariance as `E[XY] − E[X]E[Y]`.

Host: Linux x86_64, 2026-04-14. N = 100 000 float samples in [0, 1). Best-of-9, ms.

## Timings

| op                  | node (upstream)             | bun (upstream)              | parabun drop-in             | parabun rewrite           | rewrite × node |
| ------------------- | --------------------------- | --------------------------- | --------------------------- | ------------------------- | -------------: |
| sum                 | 0.418 / 0.440 / 0.520       | 0.102 / 0.532 / 1.08        | 0.113 / 0.532 / 1.12        | 0.048 / 0.050 / 0.066     |           8.9× |
| mean                | 0.420 / 0.446 / 0.532       | 0.102 / 0.104 / 0.127       | 0.113 / 0.114 / 0.123       | 0.017 / 0.017 / 0.030     |          25.8× |
| variance            | 0.464 / 0.493 / 0.710       | 0.180 / 0.184 / 0.430       | 0.188 / 0.193 / 0.443       | 0.040 / 0.044 / 0.099     |          11.1× |
| standardDeviation   | 0.462 / 0.470 / 0.542       | 0.181 / 0.182 / 0.191       | 0.188 / 0.188 / 0.198       | 0.040 / 0.041 / 0.042     |          11.6× |
| sampleCovariance    | 0.906 / 0.978 / 1.00        | 0.447 / 0.452 / 1.41        | 0.305 / 0.330 / 1.37        | 0.057 / 0.060 / 0.078     |          16.4× |
| sampleCorrelation   | 1.92 / 1.97 / 2.02          | 0.964 / 0.971 / 1.16        | 0.684 / 0.704 / 0.724       | 0.138 / 0.143 / 0.147     |          13.8× |

## Numerical agreement

```
op                  node          bun           parabun       rewrite
sum                 4.992703e+4   4.992703e+4   4.992703e+4   4.992702e+4
mean                4.992703e-1   4.992703e-1   4.992703e-1   4.992702e-1
variance            8.327747e-2   8.327747e-2   8.327747e-2   8.327728e-2
standardDeviation   2.885784e-1   2.885784e-1   2.885784e-1   2.885780e-1
sampleCovariance   -3.068357e-5  -3.068357e-5  -3.068357e-5  -3.109876e-5
sampleCorrelation  -3.694702e-4  -3.694702e-4  -3.694702e-4  -3.744734e-4
```

## Takeaways

- **Drop-in wins are JIT-only** (≤3× on anything). Bun/Parabun run unchanged `simple-statistics` faster than node, but the shape of the reduction in the source is what it is.
- **Rewrite wins come from SIMD plus reformulation.** Variance as `dot(x,x)/N − mean²` replaces `sumNthPowerDeviations(x, 2)`'s inner loop with a single f32x4 dot. Covariance as `dot(x,y)/N − μx·μy` does the same for the two-array form.
- **Two honest nulls to flag:**
  1. **SIMD sum sacrifices Kahan precision.** Upstream `sum` uses Kahan-Babuska compensated summation; our `simd.sum` is plain lane-wise addition. On this workload (uniform [0,1), N=100k) the drift is 1 ULP in the 8th significant digit — invisible to stats work. If your inputs have wildly varying magnitudes, upstream's precision matters more than our speed.
  2. **Covariance / correlation reformulation has catastrophic cancellation risk.** The `E[XY] − E[X]E[Y]` form subtracts two similarly-large numbers when the true covariance is small. Here it shows up as a 1.4% relative error on sampleCovariance (−3.068e-5 upstream → −3.110e-5 rewrite). For workloads where covariance is small relative to |E[X]·E[Y]|, prefer the two-pass centered form (slower but stable).

## Run it

```sh
cd /raid/pbr/simple-statistics
npm install                                          # one-time, for the dist/mjs
/raid/parabun/build/release/bun run bench/harness.ts
```
