# parabun-vector-search

Seven layered variants of the same cosine-similarity top-K search over a
100 000 × 384 Float32 embedding matrix (~150 MB). The point isn't the
final speedup number — it's the diagnostic value of watching each
primitive fail or succeed in isolation.

This bench is what motivated the `@para/simd` reduce-op threshold, the
`@para/simd.matVec` bulk kernel, `@para/parallel`'s persistent worker
pool, `parabun:gpu`'s Tier-4 residency, and the `@para/simd.topK` selection
primitive. Every tier that looked like an obvious win on paper lost
to something — memory bandwidth, copy-in cost, structured-clone
overhead, or idiomatic top-K sort — until the last variant lined up
all wins. The GPU row lands at ~10× baseline once top-K stops being
the bottleneck.

## Workload

- N = 100,000 normalized Float32 embeddings, D = 384 dims.
- One query vector, also normalized.
- Score every embedding by dot product (== cosine on normalized vectors).
- Return top-K = 10 indices.
- Embeddings + query generated deterministically from `SEED = 0xc0ffee`
  so every variant sees the same matrix and must produce the same top-K.

## Results (best-of-5 median, release build, RTX 4070 Ti + 8-core host)

All rows except `baseline` use `@para/simd.topK` for selection; `baseline`
keeps the idiomatic `map → sort → slice` to stay honest as a reference.
The pmap variants do per-chunk fixed-size-heap top-K inside each worker
(unaffected by the `topK` primitive).

| variant                                 | score_ms (min/med/max)    | vs baseline |
|-----------------------------------------|--------------------------:|------------:|
| baseline (plain JS, scalar loop)        |  38.7 /  42.8 /  44.6     |      1.00×  |
| simd-dot (per-row `@para/simd.dot`)       |  27.8 /  27.9 /  28.8     |      1.53×  |
| matvec (bulk `@para/simd.matVec`)         |  51.8 /  52.5 /  53.3     |      0.82×  |
| pmap-cold (fresh worker pool)           | 438.3 / 441.7 / 454.1     |      0.10×  |
| pmap-warm (persistent pool, no SAB)     | 404.6 / 406.8 / 412.1     |      0.11×  |
| pmap-shared (pool + SAB embeddings)     |  16.8 /  20.2 /  24.5     |      2.12×  |
| **gpu (`parabun:gpu.matVec`, held)**        |   3.9 /   4.2 /   7.4     |   **10.19×**|

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
6. **`gpu` crushes everything once top-K stops being the bottleneck.**
   With the embedding matrix held on device (`gpu.hold(embeddings)`
   pays one ~200 ms HtoD outside the timed window), each scoring
   call runs the CUDA `matVecF32` kernel and ships 400 KB of scores
   back. Before the `simd.topK` primitive landed, the idiomatic JS
   `map → sort → slice` over 100 000 `{idx, score}` objects dominated
   `score_ms`:

   ```
   matVec per call:  1.21 ms   // kernel + DtoH + cuCtxSynchronize
   topK   per call: 17.89 ms   // idiomatic JS: 100k objects, sort, slice
   ```

   `@para/simd.topK(scores, k)` is a scalar fixed-size-sorted-array
   insertion — O(N·k) worst-case but with near-perfect branch
   prediction at `k ≪ N`. For k = 10, N = 100 000 it runs in under
   1 ms on a typed-array, beating an object-sort by 20× and a binary
   heap by ~2×. Swapping it in drops the GPU row from ~22 ms to ~4 ms
   — the compute win the CUDA kernel was always delivering.

The milestone isn't any single tier's multiplier. It's that each tier
teaches a distinct lesson about where the cost lives:

- tiers 1-2: WASM-boundary copy-in dominates anything touching the
  full matrix;
- tiers 3-4: structured-clone is a 17 ms/chunk tax you can't see
  until you subtract Worker spawn;
- tier 5: removing all three (bandwidth, boundary, clone) finally
  makes parallelism pay;
- tier 6: with device-resident embeddings, the compute pass collapses
  to ~1 ms — and the idiomatic JS top-K sort becomes visible as the
  next bottleneck. `simd.topK` removes it, landing the GPU row at
  ~10× baseline.

Every tier makes the previous tier's bottleneck visible.

## Running it

```sh
bun run build:release bench/parabun-vector-search/run.ts
```

The harness runs each variant 5 times, prints min/med/max for
gen/score/total phases, and asserts the top-K set matches across all
seven variants. Release build is required — debug-build WASM is ~3×
slower and inverts several of these rankings. The GPU row degrades to
`@para/simd.matVec` behavior if CUDA/Metal isn't available — `parabun:gpu`
routes through the CPU backend transparently.

## Files

- `gen.js` — deterministic normalized embedding + query generator. Optional
  `{ shared: true }` returns SAB-backed views for the last variant.
- `baseline.js` — idiomatic plain JS, single-threaded scalar loop.
- `variant-simd.pjs` — per-row `@para/simd.dot` (one WASM call per row).
- `variant-matvec.pjs` — bulk `@para/simd.matVec` (one WASM call total).
- `variant-pmap.pjs` — `pmap × 8` with a fresh worker pool.
- `variant-pmap-warm.pjs` — `pmap × 8` with the persistent pool pre-warmed.
- `variant-pmap-shared.pjs` — `pmap × 8` with the persistent pool *and* SAB
  embeddings. First variant to beat baseline.
- `variant-gpu.pjs` — `parabun:gpu.matVec` with the embedding matrix held on
  device. Score phase runs CUDA PTX when available, falls through to
  `@para/simd.matVec` otherwise.
- `run.ts` — best-of-5 harness, top-K cross-check.
- `batched-baseline.js`, `batched-gpu-loop.pjs`, `batched-gpu-matmul.pjs`,
  `batched-gpu-matmul-ptopk.pjs`, `batched-run.ts` — batched harness for
  Q = 32 queries (see below).
- `sweep-run.ts` — in-process batch-size sweep across Q ∈ {1, 4, 16, 64, 256}
  for the `gpu.matmul` path; reports per-query latency curve.

## Batched queries (Q = 32)

Real retrieval systems don't score one query at a time — RAG pipelines
and semantic-search APIs batch requests. The single-query rows above
already amortize the ~200 ms `hold()` across many queries, but each
per-query call still pays a full `kernel + DtoH(400 KB) + cuCtxSynchronize`
round-trip (~0.8 ms of fixed overhead, regardless of compute). A batched
`matmul` collapses all that into one round-trip.

### Results (best-of-5 median, same host)

| variant                                      | score_ms total (min/med/max) | per_query_ms (min/med/max) | vs baseline |
|----------------------------------------------|-----------------------------:|---------------------------:|------------:|
| batched-baseline (plain JS loop)             | 1176 / 1356 / 1677           | 36.75 / 42.37 / 52.41      |    1.00×    |
| batched-gpu-loop (`gpu.matVec` × Q)          |  30.8 /  38.7 /  71.2        |  0.96 /  1.21 /  2.23      |   35.0×     |
| batched-gpu-matmul (one `gpu.matmul`)        |  13.1 /  22.6 /  24.0        |  0.41 /  0.71 /  0.75      |   60.0×     |
| **batched-gpu-matmul-ptopk (+ `pmap × 8`)**  |  12.2 /  12.9 /  16.4        |  0.38 /  0.40 /  0.51      | **105.9×**  |

The concatenated top-K for all Q queries is asserted bit-identical across
all four batched variants.

### What each row shows

- **`batched-gpu-loop`** amortizes the first-call context-sync tax across
  Q calls and drops per-query latency from ~4 ms to ~1.2 ms. The 1 ms
  per call is now almost entirely `cuCtxSynchronize` + `cuMemcpyDtoH` of
  the 400 KB score vector — the kernel itself is only a few µs of it.
- **`batched-gpu-matmul`** computes `Q @ E^T` in one kernel launch. One
  `matmul` replaces Q `matVec` calls, so the fixed per-call overhead
  collapses from `Q × overhead` to `1 × overhead`. Per-query latency
  drops to 0.71 ms, ~1.7× over the loop variant. The remaining cost is
  split between the `Q × N` matmul kernel and 32 CPU-side `simd.topK`
  calls (~2 ms total) plus the 12.8 MB DtoH of the scores matrix.
- **`batched-gpu-matmul-ptopk`** takes the same matmul output and fans
  top-K selection across 8 `pmap` workers. Earlier versions copied the
  Q×N scores matrix into a SharedArrayBuffer first (`scoresSab.set(...)`),
  and that CPU-side copy (~3.7 GB/s into a SAB destination) cost more
  than parallel selection saved — the variant **lost at every Q** and
  sat in the harness as a null-result marker. Adding an optional `out`
  argument to `gpu.matmul` so CUDA DtoH's directly into a caller-provided
  SAB-backed Float32Array removed the copy entirely. With that change,
  pmap top-K wins: at Q=32 it drops per-query latency from 0.71 ms
  (serial) to 0.40 ms, 1.8× over the serial path and 106× over baseline.
  The lesson is the same as before — "don't parallelize over a data
  move" — just satisfied at the API layer instead of worked around.
- **Requirement**: the matmul path needs the embedding matrix in D × N
  layout, not N × D. `batched-gpu-matmul.pjs` transposes once on the
  host before `hold()`, which is off the timed window — in a real index
  you'd pick this layout at build time.

The narrative: move from "one call per query" to "one kernel per batch"
and the fixed overhead gets divided by Q. The 106× per-query speedup
isn't new compute — it's the same CUDA `matmulF32` kernel, just
dispatched with far less wrapper work around it, with the output
DtoH'd directly into the SAB the top-K workers read from.

### Running it

```sh
bun run build:release bench/parabun-vector-search/batched-run.ts
```

### Batch-size sweep

`sweep-run.ts` runs the `gpu.matmul` path in-process across
Q ∈ {1, 4, 16, 64, 256} so the one-time index prep (embed generate,
transpose, hold) amortizes across every batch size. The totals include
both the matmul dispatch and the CPU-side `simd.topK` over every row.

| Q   | per_query_ms (min/med) | matmul_ms (min/med) | topK_ms (min/med) | notes                          |
|-----|-----------------------:|--------------------:|------------------:|:-------------------------------|
|   1 |            0.81 / 0.92 |        0.76 / 0.78  |      0.04 / 0.14  | overhead-dominated             |
|   4 |            0.42 / 0.42 |        1.52 / 1.53  |      0.14 / 0.15  | amortizing fixed cost          |
|  16 |            0.33 / 0.38 |        4.64 / 5.37  |      0.56 / 0.72  | still amortizing               |
| **64** |        **0.29 / 0.30** |    **16.31 / 16.59** |   **2.26 / 2.31** | **sweet spot**                |
| 256 |            0.42 / 0.54 |      97.05 / 128.50 |      8.95 / 9.12  | compute-saturated, per-Q rises |

The curve has a clean inflection: per-query latency drops from 0.92 ms
at Q = 1 to 0.30 ms at Q = 64 (3.1× improvement), then rises back to
0.54 ms at Q = 256.

**Why it turns over**: below Q = 64, each dispatch is dominated by
fixed per-call cost (kernel launch + `cuCtxSynchronize` + small DtoH),
and batching more queries amortizes it. Past Q = 64, the matmul kernel
is compute-saturated on this workload (N = 100 000, D = 384) so the
GPU-side cost becomes linear in Q. At the same time, the CPU-side
`simd.topK` sort also scales linearly with Q, so you're paying 2× cost
(compute on GPU, selection on CPU) per extra query with no amortization
left to claim. Q = 256 in particular pays a ~100 MB DtoH and a 9 ms
serial top-K loop.

**What this unlocks**: Q = 64 looks like the right default for this
kernel shape. The natural next tier is parallelizing top-K across
queries (`pmap × 8` with SAB-backed scores), which would drop the
CPU-side cost roughly linearly with worker count — but the matmul
itself is already the larger fraction at this point, so the returns
there are bounded.
