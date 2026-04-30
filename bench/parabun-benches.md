# Parabun benchmarks

Eight end-to-end benchmarks that exercise Parabun's language features
(`pure function`, `|>` pipelines) and runtime modules (`para:simd`,
`para:parallel`, `para:pipeline`) on real-world shaped workloads.

Each bench lives in its own directory with a README that covers the
workload, results (best-of-N medians), why the Parabun version wins (or
loses, in the layered diagnosis), running instructions, and a file list.

| bench                                                                | primitive proved                             | speedup |
|----------------------------------------------------------------------|----------------------------------------------|--------:|
| [parabun-vector-search](./parabun-vector-search/README.md)           | layered diagnosis: SIMD + SAB + pmap         |  2.03×  |
| [parabun-rag-retrieval](./parabun-rag-retrieval/README.md)           | drop-in vs real LangChain `VectorStore`      |  2.83×  |
| [parabun-monte-carlo](./parabun-monte-carlo/README.md)               | `para:parallel.pmap` alone (no SIMD/SAB)      |  5.56×  |
| [parabun-streaming-etl](./parabun-streaming-etl/README.md)           | `para:pipeline` fusion (affine → SIMD)        | 50× vs `.map` chain (1.24× vs hand-rolled loop) |
| [parabun-image-convolution](./parabun-image-convolution/README.md)   | `pmap + SAB` on `Uint8Array` (light kernel)  |  4.75×  |
| [parabun-image-sobel](./parabun-image-sobel/README.md)               | `pmap + SAB` on `Uint8Array` (heavier CV kernel) | 5.94× |
| [parabun-optical-flow](./parabun-optical-flow/README.md)             | two-frame temporal: both frames in SAB       |  2.63×  |
| [parabun-sqlite](./parabun-sqlite/README.md)                         | end-to-end analytical + zero-overhead `.pjs` |  2.71× on analytical (10% end-to-end) |

All benches are best-of-N (N ∈ {3, 5}) on release builds. Each bench
verifies numeric equivalence with its reference variant: bit-identical
outputs where feasible (image hash, top-K indices), tolerances inside MC
noise elsewhere.

## What each bench proves in isolation

- **vector-search** is the layered diagnosis: six variants that each fail or
  succeed for a *different* reason. Only the last (persistent pool + SAB-
  backed embeddings) beats the scalar baseline; the middle four teach why
  the obvious SIMD/pmap reaches didn't work standalone.
- **rag-retrieval** is the same workload re-framed as a drop-in LangChain
  `VectorStore` subclass — same public API, Parabun internals, 2.83× faster
  per search with no changes to caller code.
- **monte-carlo** is the pure `para:parallel.pmap` showcase. No SIMD, no SAB,
  just a `pure function` kernel chunked across 8 workers with independent
  PRNG streams seeded from a Weyl constant.
- **streaming-etl** is pure `para:pipeline` fusion. A 4-stage affine chain
  collapses to `K · simd.sum(source) + C · n` — one SIMD pass plus two
  scalar ops, beating a hand-rolled tight loop by 1.24× while the
  idiomatic `.map().map().map().reduce()` version runs at ~50× the cost.
- **image-convolution** is `pmap + SAB` on `Uint8Array` pixel data — the
  same primitives as vector-search, but on a different dtype and with
  two sequential `await pmap()` calls forming an implicit barrier
  between horizontal and vertical Gaussian passes.
- **image-sobel** extends the same pattern to a heavier per-pixel kernel
  (12 mults + 10 adds + `sqrt` + clamp). The classical CV edge detector,
  proving `pmap + SAB` scales up as per-pixel compute grows: 5.94× vs
  image-convolution's 4.75× on the same image size with the same 8
  workers, because the compute-to-dispatch ratio improves.
- **optical-flow** is the first temporal bench — Lucas-Kanade on two
  frames, both SAB-backed, plus three Float32 gradient planes and two
  Float32 flow planes also in SAB. Two `await pmap()` passes (gradient
  then solve). This is the pattern a live video pipeline needs: streaming
  decoder → SAB ringbuffer → worker pool consuming consecutive frames.
- **sqlite** is the end-to-end "does Parabun matter on real app code"
  bench: 1 M sensor rows out of SQLite, per-sensor analytics downstream.
  Variant B (byte-identical code as `.pjs`) proves the parser adds no
  overhead; variant C proves the deliberate Parabun rewrite is 2.71×
  faster on the analytical step.

## Running them

Each bench has a `run.ts` harness. All of them want a release build for
fair numbers:

```sh
bun run build:release bench/parabun-<name>/run.ts
```

A few of them (`parabun-sqlite`, `parabun-rag-retrieval`) have a
one-time setup step — see the per-bench README.
