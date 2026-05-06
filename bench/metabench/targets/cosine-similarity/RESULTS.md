# cosine-similarity: node vs bun vs parabun vs parabun-rewrite

Upstream: [`compute-cosine-similarity`](https://github.com/compute-io/cosine-similarity) v1.1.0 (scalar JS via `compute-dot` + `compute-l2norm`).
Parabun rewrite: `dot(x, y) / (sqrt(dot(x, x)) * sqrt(dot(y, y)))` where `dot` is `@para/simd.dot` (WASM v128 kernel).

Host: Linux x86_64, 2026-04-14. Best-of-9, ms. All four runtimes return identical float values to 6 decimals.

| Workload              | node (upstream)        | bun (upstream)         | parabun drop-in        | parabun rewrite        | rewrite × node |
| --------------------- | ---------------------- | ---------------------- | ---------------------- | ---------------------- | -------------: |
| pair D=128            | 0.0135 / 0.0155 / 0.027| 0.0051 / 0.0078 / 0.20 | 0.0023 / 0.0027 / 0.12 | 0.0055 / 0.0093 / 0.022|           1.7× |
| pair D=768            | 0.012 / 0.032 / 0.055  | 0.017 / 0.018 / 0.021  | 0.018 / 0.018 / 0.024  | 0.0014 / 0.0016 / 0.002|          20.4× |
| pair D=4096           | 0.050 / 0.053 / 0.113  | 0.055 / 0.057 / 0.060  | 0.049 / 0.058 / 0.060  | 0.006 / 0.007 / 0.014  |           8.0× |
| batch N=1000 D=128    | 1.08 / 1.14 / 1.21     | 1.01 / 1.02 / 1.07     | 1.00 / 1.01 / 1.03     | 0.30 / 0.34 / 0.39     |           3.4× |
| batch N=1000 D=768    | 6.41 / 6.49 / 6.53     | 6.10 / 6.12 / 6.14     | 5.98 / 6.00 / 6.03     | 0.58 / 0.60 / 0.68     |          10.8× |

## Takeaways

- **Drop-in wins are real but small** (≤5.7× on D=128, parity to ~6 ms at D=768). Bun/Parabun's JIT + typed-array internals can't beat an unchanged scalar JS library by more than a constant factor.
- **The rewrite path dominates at D ≥ 768**: a single SIMD dot replaces three inner loops in the upstream `compute-dot` + `compute-l2norm` code, so the 10–20× bump is kernel-vs-scalar, not allocator or GC.
- **D=128 rewrite is *slower* than drop-in** (0.0093 med vs 0.0027 med). Function-call overhead from three `simd.dot` invocations exceeds the tiny 128-element scalar loop. If you know D ≤ ~200 you want the drop-in path, not the rewrite. Honest null: the SIMD-over-scalar advantage only kicks in once the vectors are long enough to amortize the call.

## Run it

```sh
cd /raid/pbr/cosine-similarity
/raid/parabun/build/release/bun run bench/harness.ts
```
