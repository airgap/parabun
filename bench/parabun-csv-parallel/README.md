# @para/csv — parallel vs serial parse (size sweep)

Times `@para/csv` parsing across multiple input sizes in two modes:

- **Serial** — single-threaded state machine, `parseCsv(input)`.
- **Parallel** — `parseCsv(input, { parallel: true })`. Materializes the
  input, pre-scans for the quote character, splits into N chunks, parses
  them via `@para/parallel.pmap`, concatenates the results.

## Run

```sh
bun run build:release bench/parabun-csv-parallel/run.ts            # default sweep: 5, 50, 200 MB
bun run build:release bench/parabun-csv-parallel/run.ts --sizes=10,100,500
```

`seed.ts` is deterministic (LCG with a fixed seed) so fixtures are
identical across machines. Fixtures are quote-free so the parallel-mode
safety check passes and the fast chunk-and-fork path engages.

## What we see

On a recent Linux x86 box (16-core, release build):

```
size      rows         serial  (min/med/max ms)    parallel (min/med/max ms)    speedup
5 MB      128,028       148 /  152 /  159           113 /  129 /  163           1.18×
50 MB     1,250,297    1438 / 1446 / 1507          1440 / 1528 / 1737           0.95×
200 MB    4,923,201    5873 / 5892 / 6203          6101 / 6363 / 6765           0.93×
```

Parallel mode helps a little at 5 MB (~18%), breaks even at 50 MB, and
gets *worse* from there. The naive intuition "more cores → faster
parse" doesn't hold for byte-scanning workloads at this scale.

### Why doesn't parallel scale up?

A few interacting effects:

1. **The serial path is already fast.** It's a tight state machine
   reading one byte at a time with no branch surprises — memory
   bandwidth, not CPU, is the binding resource. Adding workers can't
   unlock bandwidth that doesn't exist.
2. **Materialization tax.** Parallel mode pulls the whole input into one
   string first so it can split it at line boundaries. At 200 MB that
   allocation alone is non-trivial.
3. **Worker IPC cost.** Each chunk is sent to a worker, parsed there,
   and the resulting `string[][]` is sent back. The bigger the input,
   the more work this round-trip does — and it scales linearly with
   input size, not workers.
4. **Final concatenation.** All the per-worker row arrays have to be
   yielded back to the caller in order. That's another O(N) pass over
   the parsed data.

The 5 MB win likely comes from the materialization + IPC costs being
small enough that the chunk-parallel parse still wins. Past that, the
overheads dominate.

## When `parallel: true` is still worth it

The case for parallel mode is **off-the-main-thread parsing**, not
raw throughput:

- A 1.4-second serial parse blocks the event loop for 1.4 seconds.
  The parallel path keeps the main thread responsive — HTTP handlers,
  GC, other I/O all keep running while workers grind.
- Parsing N files concurrently scales linearly across cores even if
  any single one doesn't get faster.

Don't reach for `parallel: true` expecting a per-file speedup. Reach
for it when the parse is currently making your event loop unresponsive.

## Memory

This empirical result is recorded in
`memory/project_parabun_csv_parallel_perf.md` so future sessions don't
accidentally reintroduce the wrong claim.
