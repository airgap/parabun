# parabun-vector-search

Seven layered variants of the same cosine-similarity top-K search over a
100 000 × 384 Float32 embedding matrix (~150 MB). The point isn't the
final speedup number — it's the diagnostic value of watching each
primitive fail or succeed in isolation.

This bench is what motivated the `bun:simd` reduce-op threshold, the
`bun:simd.matVec` bulk kernel, `bun:parallel`'s persistent worker
pool, and (now) `bun:gpu`'s Tier-4 residency. Every tier that looked
like an obvious win on paper lost to something — memory bandwidth,
copy-in cost, structured-clone overhead — until the final SAB-backed
variant lined up all three wins. The GPU row shows what happens next:
move the compute off-CPU entirely, and the idiomatic JS top-K becomes
the bottleneck.

## Workload

- N = 100,000 normalized Float32 embeddings, D = 384 dims.
- One query vector, also normalized.
- Score every embedding by dot product (== cosine on normalized vectors).
- Return top-K = 10 indices.
- Embeddings + query generated deterministically from `SEED = 0xc0ffee`
  so every variant sees the same matrix and must produce the same top-K.

## Results (best-of-5 median, release build, RTX 4070 Ti + 8-core host)

| variant                                 | score_ms (min/med/max)    | vs baseline |
|-----------------------------------------|--------------------------:|------------:|
| baseline (plain JS, scalar loop)        |  39.4 /  39.6 /  45.5     |      1.00×  |
| simd-dot (per-row `bun:simd.dot`)       |  44.8 /  45.1 /  47.8     |      0.88×  |
| matvec (bulk `bun:simd.matVec`)         |  69.5 /  72.2 /  73.8     |      0.55×  |
| pmap-cold (fresh worker pool)           | 449.2 / 454.6 / 466.9     |      0.09×  |
| pmap-warm (persistent pool, no SAB)     | 445.8 / 450.7 / 468.1     |      0.09×  |
| pmap-shared (pool + SAB embeddings)     |  22.1 /  24.6 /  24.9     |      1.61×  |
| **gpu (`bun:gpu.matVec`, held)**        |  22.6 /  25.3 /  30.2     |    **1.57×**|

Top-K indices verified bit-identical across all seven variants.

## Why each tier lost (except the last)

The honest story: this workload is memory-bandwidth-bound, not
compute-bound. 150 MB streamed once through L3 already saturates the
scalar loop. Every tier that adds "more compute parallelism" without
first addressing bandwidth just adds overhead.

1. **`simd.dot` per row loses to scalar.** Each call copies 384 floats
   (1.5 KB) across the WASM boundary. At N = 100 000 that's 100 000
   boundary crossings plus 150 MB of redundant copy-in — more cost than
   f32x4 saves on the dot itself. This is what motivated the 4 MiB
   threshold where reduce ops fall back to monomorphic tight loops.
2. **`simd.matVec` loses to `copy-in` cost.** One call, one boundary
   crossing, but the full 150 MB matrix has to be copied into WASM
   linear memory before the kernel can run. Copy-in alone is ~45 ms;
   the SIMD kernel itself is fast, but you don't get back what you paid
   to move the data.
3. **`pmap-cold` loses to Worker spawn + structured-clone.** Each of
   the 8 workers is spawned from scratch (`new Worker(Blob URL)`,
   function source eval). More importantly, `postMessage` structured-
   clones the embedding subarray for each chunk — ~17 ms × 8 = ~140 ms
   of pure serialization before any math happens.
4. **`pmap-warm` barely changes anything.** Persistent pool eliminates
   the spawn cost, but structured-clone is the real tax: workers are
   reused, but each pmap call still serializes the matrix view into
   every chunk. Actually slightly *slower* than cold here because we're
   in noise.
5. **`pmap-shared` finally wins.** SAB-backed Float32Array means
   `postMessage` ships only a shared-memory handle. Per-chunk clone
   drops from ~17 ms to <1 ms. Workers reach the same 150 MB of
   physical memory in place, and per-worker scoring parallelism
   finally translates to wall-clock savings.
6. **`gpu` ties `pmap-shared` instead of crushing it.** With the
   embedding matrix held on device (`gpu.hold(embeddings)` pays one
   ~200 ms HtoD outside the timed window), each scoring call runs
   the CUDA `matVecF32` kernel and ships 400 KB of scores back. A
   warm decomposition against the held handle:

   ```
   matVec per call: 1.21 ms   // kernel + DtoH + cuCtxSynchronize
   topK   per call: 17.89 ms  // idiomatic JS: 100k objects, sort, slice
   ```

   So the GPU already does its part — the compute pass dropped from
   ~38 ms (baseline) to ~1 ms — but the idiomatic JS top-K sort now
   dominates `score_ms`. A heap-based top-K (like the one inside
   `scoreChunk` in `variant-pmap-shared.pjs`) would expose the real
   GPU headroom.

The milestone here isn't 2×. It's that each tier teaches a distinct
lesson about where the cost lives:

- tiers 1-2: WASM-boundary copy-in dominates anything touching the
  full matrix;
- tiers 3-4: structured-clone is a 17 ms/chunk tax you can't see
  until you subtract Worker spawn;
- tier 5: removing all three (bandwidth, boundary, clone) finally
  makes parallelism pay;
- tier 6: removing the compute bottleneck entirely exposes the next
  one — idiomatic object-based top-K.

Every tier makes the previous tier's bottleneck visible.

## Running it

```sh
bun run build:release bench/parabun-vector-search/run.ts
```

The harness runs each variant 5 times, prints min/med/max for
gen/score/total phases, and asserts the top-K set matches across all
seven variants. Release build is required — debug-build WASM is ~3×
slower and inverts several of these rankings. The GPU row degrades to
`bun:simd.matVec` behavior if CUDA/Metal isn't available — `bun:gpu`
routes through the CPU backend transparently.

## Files

- `gen.js` — deterministic normalized embedding + query generator. Optional
  `{ shared: true }` returns SAB-backed views for the last variant.
- `baseline.js` — idiomatic plain JS, single-threaded scalar loop.
- `variant-simd.pjs` — per-row `bun:simd.dot` (one WASM call per row).
- `variant-matvec.pjs` — bulk `bun:simd.matVec` (one WASM call total).
- `variant-pmap.pjs` — `pmap × 8` with a fresh worker pool.
- `variant-pmap-warm.pjs` — `pmap × 8` with the persistent pool pre-warmed.
- `variant-pmap-shared.pjs` — `pmap × 8` with the persistent pool *and* SAB
  embeddings. First variant to beat baseline.
- `variant-gpu.pjs` — `bun:gpu.matVec` with the embedding matrix held on
  device. Score phase runs CUDA PTX when available, falls through to
  `bun:simd.matVec` otherwise.
- `run.ts` — best-of-5 harness, top-K cross-check.
