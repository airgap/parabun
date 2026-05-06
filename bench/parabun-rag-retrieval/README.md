# parabun-rag-retrieval

Head-to-head: real LangChain `MemoryVectorStore` (`FakeVectorStore` from
`@langchain/core/utils/testing`) vs a drop-in `ParabunVectorStore` that
`extends VectorStore` from the same package and implements the same
`addVectors` / `similaritySearchVectorWithScore` API.

## Workload

- N = 100,000 × D = 384 synthetic embeddings (same shape as
  `Xenova/all-MiniLM-L6-v2`, `sentence-transformers/all-MiniLM-L6-v2`,
  and similar widely-used models).
- Single query, top-K = 10, cosine similarity.

This is exactly what in-memory RAG retrieval does — LangChain.js and
LlamaIndex.ts both ship flavors of this pattern, and it dominates latency
once embeddings are cached.

## Results (best-of-3, release build)

| variant                             | add_ms | score_ms | top-K |
|-------------------------------------|-------:|---------:|------:|
| LangChain MemoryVectorStore         |    4.0 |     48.2 |   ✓   |
| **ParabunVectorStore** (drop-in)    |   82.7 | **15.9** |   ✓   |

Parabun is **2.8× faster per search**. Top-K indices and scores (to 4 dp)
are identical to LangChain's.

The `add_ms` cost is higher because Parabun packs rows into a SAB-backed
`Float32Array` and normalizes in place (`O(N·D)` one-time work). Break-even
is ~3 searches — in any RAG app the corpus is loaded once and queried many
times, so the amortized cost is dominated by `score_ms`.

## Why does it work?

`FakeVectorStore.similaritySearchVectorWithScore` does a naive loop of
cosine calls over regular `number[]` arrays. The reference `cosine` it uses
(`@langchain/core/utils/ml-distance/similarities.js`) recomputes the query's
magnitude inside the inner loop for every document, on top of the per-row
dot product and per-row magnitude.

`ParabunVectorStore` does three things differently:

1. **Store rows as one packed `Float32Array`.** `number[][]` boxes each
   element; `Float32Array` is contiguous and JIT-friendly.
2. **Pre-normalize on `addVectors`.** Cosine is scale-invariant, so
   normalizing the rows does not change any score. It does mean the search
   path becomes a pure dot product plus one constant divide by |query|.
3. **Run the scoring across workers with `@para/parallel`.** The embedding
   matrix lives in a `SharedArrayBuffer`, so `postMessage` of a chunk
   view ships only a handle — not 150 MB of structured-cloned bytes.

All three are standard optimizations. Parabun packages them as two language
features (`pure function` for worker fns, `@para/parallel` for the pool)
so the user code inside `ParabunVectorStore` stays short and readable.

## Running it

```sh
bun run build:release bench/parabun-rag-retrieval/run.ts
```

Each variant runs in its own subprocess (cold JIT each time), reported as
min/med/max over `RUNS=3`.

## Files

- `gen.ts` — deterministic mulberry32 + Box-Muller RNG, returns both the
  `number[][]` shape LangChain expects and a SAB-packed `Float32Array`
  with the same numeric content.
- `baseline-langchain.ts` — uses real `FakeVectorStore.addVectors` +
  `similaritySearchVectorWithScore`.
- `parabun-store.pjs` — drop-in `extends VectorStore` with the same method
  signatures. Internals use `@para/parallel.pmap` + SAB.
- `run.ts` — spawns each variant per run, parses timing line, reports
  min/med/max and verifies top-K matches across variants.
