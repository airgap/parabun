# fast-levenshtein: node vs bun vs parabun vs parabun-rewrite

Upstream: [`fast-levenshtein`](https://github.com/hiddentao/fast-levenshtein) — delegates to `fastest-levenshtein`'s Myers bit-parallel algorithm (O(nm/32) of bitwise ops).
Parabun rewrite: same Myers kernel inlined into a `@para/parallel.pmap` worker, query string embedded into the worker function source so each item is a single string (not a `[query, candidate]` pair).

Host: Linux x86_64, 32 cores, `pmap` defaults to 8 workers. Query + candidates are 512 char strings; M = 20 000 candidates for closest. Best-of-7, ms.

## Timings

| workload           | node (upstream)    | bun (upstream)     | parabun drop-in    | parabun rewrite (pmap) | rewrite × node |
| ------------------ | ------------------ | ------------------ | ------------------ | ---------------------- | -------------: |
| single_pair × 1000 | 25.3 / 25.4 / 26.1 | 24.4 / 24.4 / 28.2 | 24.8 / 24.8 / 28.6 | 24.6 / 24.7 / 24.7     |           1.0× |
| closest_20k        | 775 / 777 / 805    | 771 / 772 / 790    | 777 / 777 / 801    | 175 / 198 / 222        |           3.9× |

All four runtimes return bitwise-identical edit distances.

## Takeaways

- **Single-pair is a clean honest null.** Myers bit-parallel at 32-bit word chunks is already the tight inner loop for Levenshtein — it's all bitwise ops in a register. There's nothing SIMD can do that JSC's JIT isn't already doing, and all three runtimes sit within noise of each other on the 1000-call batch.
- **closest(query, M) is an embarrassingly parallel loop** — the real differentiator. `@para/parallel.pmap` distributes the M distance computations across 8 workers. At M=20 000 with 512-char strings, per-item Myers cost is ~40 µs, which amortizes pmap's per-call dispatch (~0.5 ms) and the structured-clone cost of shipping candidates to workers.
- **Observed speedup: 3.9× at 8 workers** — roughly half of the theoretical 8×. The remainder is eaten by (a) structured-clone of the 20 000 candidate strings (~10 MB serialized per call across 8 workers) and (b) peq-buffer allocation inside each worker-side call. Both can be fixed: (a) with `SharedArrayBuffer`-backed candidate storage + a pmap API that takes chunk indices, (b) by moving `peq` into an IIFE-initialized closure so it persists across calls in the same worker. Neither is available out-of-the-box in the current `@para/parallel` API surface.
- **The rewrite doesn't help small M.** At M=5000 with 256-char strings, pmap overhead pulled the speedup down to 1.3×. The break-even is around per-item work of ~5 µs × M ≈ 25 ms serial; below that, skip pmap and run upstream.

## Run it

```sh
cd /raid/pbr/fast-levenshtein
npm install
/raid/parabun/build/release/bun run bench/harness.ts
```
