# ml-kmeans: node vs bun vs parabun vs parabun-rewrite

Upstream: [`ml-kmeans`](https://github.com/mljs/kmeans) v7.0.0, `lib/index.js` built from source.
Parabun rewrite: `@para/simd.dot` for centroid norms, packed `Float32Array` data/centers, fused assignment loop with 8-way-unrolled inner dot, reformulated distance as `‖c‖² − 2·x·c`.

Host: Linux x86_64, 2026-04-14. N=20 000 points, D=128 dims, K=16 clusters. `maxIterations=50`, `tolerance=1e-6`, all runtimes converge in 4 iterations from identical initial centers. Best-of-5, ms.

## Timings

| runtime              | min / med / max (ms)    |  × node |
| -------------------- | ----------------------- | ------: |
| node (upstream)      | 100.1 / 100.7 / 107.1   |   1.00× |
| bun (upstream)       | 118.0 / 118.0 / 120.4   |   0.85× |
| parabun drop-in      | 112.1 / 113.4 / 129.0   |   0.89× |
| parabun rewrite      |  79.4 /  91.5 / 136.9   |   1.10× |

Centroid fingerprint (centroid[0][0]) matches to 6 decimals across all four runtimes.

## Takeaways — this is mostly an honest null

- **Drop-in is slower on bun/parabun than node.** V8 vectorizes the inner `(p[i]-q[i])²` loop in `squaredEuclidean` noticeably better than JSC does here. Without code changes, switching to bun costs ~15% on this workload. Flip it around: node is the fastest unmodified path.
- **The rewrite claws back the JSC deficit but doesn't break through.** At ~10% over node, the rewrite pays for itself only if you also care about the typed-array ergonomics (no per-row `Array<number>` allocation). The algorithmic reformulation (`‖c‖² − 2·x·c` instead of `‖x−c‖²`) halves the FLOP count of the inner product, but we're CPU-bound on loop-tier code, not FLOP-bound.
- **Why `@para/simd.matVec` isn't used.** The earlier draft called `matVec(dataMat, centers[k], N, D)` K times per iteration. Each call copies the full N × D matrix into the WASM scratch arena before dispatch — a 10 MB memcpy × 16 centroids × 4 iters = **640 MB of copies per run** for no algorithmic reason. An `out` parameter on matVec wouldn't help; the problem is the matrix copy on input. Either matVec needs a "matrix stays put across calls" mode, or k-means needs a dedicated `@para/simd` primitive (e.g. `assignToNearest(dataMat, centersMat, clusterID, centerNormsSq)`).
- **Where a real win lives.** Either (a) multi-threaded assignment via `@para/parallel.pmap` with `SharedArrayBuffer`-backed data (blocked by pmap's current per-call item cloning), or (b) GPU matmul via `parabun:gpu.matmul` to compute the full N × K cross matrix in one dispatch. Both are out of scope for a "swap in a replacement" rewrite.

## Run it

```sh
cd /raid/pbr/ml-kmeans
npm install && npm run tsc
/raid/parabun/build/release/bun run bench/harness.ts
```
