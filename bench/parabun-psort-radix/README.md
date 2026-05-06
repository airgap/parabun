# parabun-psort-radix

`@para/parallel.psort` typed-array path vs native `TypedArray.sort()`.

```
# single-threaded radix vs native (covers all kinds)
bun run build:release bench/parabun-psort-radix/run.pjs

# parallel SAB-fanout vs single-threaded radix vs native (large N)
bun run build:release bench/parabun-psort-radix/parallel-run.pjs
```

## What it measures

`psort()` routes typed-array inputs through a non-comparison radix
sort instead of native `TypedArray.sort()`. There are two paths:

- **Serial LSD radix** — single-threaded. 4 passes × 8 bits for
  u32/i32/f32, 2 passes for u16/i16, 1 pass for byte types. Wins
  because we skip the comparator-call rate that bounds native sort.
- **Parallel radix** — same algorithm fanned out across workers
  using SAB-backed scratch buffers. Each pass does histogram
  fanout → main-thread P×256 prefix sum → scatter fanout. Kicks in
  automatically above per-kind thresholds (4M for u32/i32, 10M for
  f32; see `PARALLEL_RADIX_MIN_N_*` in `src/js/bun/parallel.ts`).

## Results (x86_64 release, Ryzen 9 5950X)

### Serial radix vs native

| Kind         | N            | Speedup |
|--------------|--------------|---------|
| Uint8Array   | 100K         | 2.9×    |
| Uint8Array   | 10M          | 3.7×    |
| Int16Array   | 100K         | 3.1×    |
| Int16Array   | 10M          | 3.2×    |
| Uint32Array  | 100K         | 2.4×    |
| Uint32Array  | 10M          | 2.1×    |
| Int32Array   | 100K         | 2.1×    |
| Int32Array   | 10M          | 2.0×    |
| Float32Array | 100K         | 2.6×    |
| Float32Array | 10M          | 2.4×    |

### Parallel radix vs serial radix vs native (N ≥ threshold)

| Kind         | N      | vs serial | vs native |
|--------------|--------|-----------|-----------|
| Uint32Array  | 4M     | 1.25×     | 2.76×     |
| Uint32Array  | 10M    | 1.42×     | 3.22×     |
| Uint32Array  | 25M    | 1.55×     | 3.77×     |
| Int32Array   | 4M     | 1.50×     | 2.63×     |
| Int32Array   | 10M    | 1.57×     | 3.02×     |
| Int32Array   | 25M    | 1.55×     | 3.05×     |
| Float32Array | 10M    | 1.37×     | 3.13×     |
| Float32Array | 25M    | 1.69×     | 4.15×     |

So the typed-array sort ceiling on a 5950X is roughly **3-4× over
native** by N=25M, with a clean handoff: serial radix carries
small/mid arrays, parallel takes over at scale.

### Caveats

- **N=1000** byte-type benchmarks show ~0.3× vs native — that's
  not the radix path losing (the dispatcher routes <4K through
  native). It's the irreducible async overhead of `await
  parallel.psort(...)`. For sorting 1000 elements of any kind, just
  call `arr.sort()` directly.
- **f32 threshold is conservatively set to 10M.** During initial
  benchmarking, f32 between 4-9M sometimes regressed 5-6× vs serial
  when preceded by other large typed-array sorts in the same
  process. Suspected cause: GC pressure from throwaway 32MB+ SABs +
  per-message Uint32Array view allocation in workers. Both have
  since been addressed (SAB-pool reuse + WeakMap-cached u32 views
  in the worker), but the f32 threshold stays at 10M until a clean
  re-bench on a quiescent release build confirms it can drop.

## Why radix wins

Native `TypedArray.sort()` runs a comparison-based sort (TimSort or
similar). For typed-array primitives the key fits in 8/16/32 bits,
so non-comparison radix runs in O(n·k/B) bit operations with no
branchy comparator calls. The whole loop is hot integer math on
contiguous memory — exactly what modern superscalar CPUs eat for
breakfast.

The parallel path adds a fan-out per pass: each worker histograms
its chunk, the main thread does a P×256 prefix sum to compute
per-worker per-bucket starting offsets, then each worker scatters
its chunk into the output buffer at the right positions. No merge
phase — the prefix sum guarantees writes don't overlap. SAB-backed
scratch lets workers read/write the same memory without
structured-clone cost.
