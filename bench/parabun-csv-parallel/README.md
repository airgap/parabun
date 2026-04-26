# bun:csv — parallel vs serial parse

Times `bun:csv` parsing of a 50 MB fixture in two modes:

- **Serial** — single-threaded state machine, `parseCsv(input)`.
- **Parallel** — `parseCsv(input, { parallel: true })`. Materializes the
  input, pre-scans for the quote character, splits into N chunks, parses
  them via `bun:parallel.pmap`, concatenates the results.

## Run

```sh
bun run bench/parabun-csv-parallel/seed.ts            # ~50 MB, 1.25M rows
bun run build:release bench/parabun-csv-parallel/run.ts
```

`seed.ts` is deterministic (LCG with a fixed seed) so the fixture is
identical across machines. The fixture is intentionally quote-free so the
parallel-mode safety check passes and the fast chunk-and-fork path engages.

## What we see

On a recent Linux x86 box (16-core, release build):

```
variant      rows         min / med / max          throughput (median)
serial       1,250,297    1427 / 1429 / 1501 ms    35.0 MB/s
parallel     1,250,297    1295 / 1426 / 1636 ms    35.1 MB/s

speedup (median): 1.00×
```

Roughly tied. The takeaway is that at 50 MB the serial state machine is
already memory-bandwidth bound — the worker pool can carve the input
into chunks but each worker is still doing the same per-byte work, and
the materialization-plus-fork overhead matches whatever savings the
parallelism delivers. Row counts agree exactly, which confirms the
chunk-boundary heuristic is splitting at line breaks correctly.

This matches the pattern the [Parabun reality-check
memory](../../README.md) documents: pmap + SIMD show clean speedups on
pure-math / typed-array kernels (Monte Carlo, dot product, image
filters), but I/O-shaped workloads where each lane is doing the same
byte-scanning work hit memory-bandwidth walls long before they hit the
core limit.

## When `parallel: true` is still worth it

Two real scenarios:

1. **Multiple files in flight at once.** Even if a single 50 MB parse
   isn't faster, parsing four of them concurrently *is* — the parallel
   path doesn't block the main thread on byte-by-byte work, so other
   tasks (HTTP handlers, other parses, GC) keep running.
2. **Larger files, faster CPUs.** At 200 MB+ on a faster L3 we expect
   the chunk parse to pull ahead, since the per-chunk fixed cost
   amortizes. Re-run with a bigger fixture to check on your hardware.

The right policy is "default to serial, opt into parallel when the
profiler says serial is the bottleneck and the file is big enough" —
exactly the reverse of the "always-on" framing the API might suggest.
