# parabun-csv

`@para/csv` routing-shim baseline. Establishes the JS-impl ceiling that LYK-800's native SIMD parser has to beat.

```sh
bun run build:release bench/parabun-csv/run.ts
```

## Today (LYK-800 not landed)

Routing in `packages/para-csv/src/index.ts` tries `require("parabun:csv")`; it throws because the native module isn't registered, and the bundled JS impl handles the parse. Ratio prints ~1.00× — there's only one path running.

Last measured baseline on a quiet box (Bun release build, single-threaded JS impl, quoted-CSV input):

| Size | Rows | Median | Throughput |
|---|---|---|---|
| 5 MB | 110K | 126 ms | 40 MB/s |
| 50 MB | 1.1M | 1261 ms | 40 MB/s |
| 200 MB | 4.3M | 4938 ms | 40 MB/s |

## After LYK-800

The same harness will compare:

- `JS-only` — bypass the routing shim, force the bundled JS path.
- `@para/csv` — let the routing shim use `parabun:csv` when available.

Acceptance criteria from LYK-800: **≥3× at 50 MB, ≥5× at 200 MB** for quote-aware input. Highway-SIMD parser through Zig FFI, packed-buffer row return to skip the structured-clone-back tax.

## Routing verification

The shim's two-path correctness is checked separately (not in this bench). To prove the native-path is reachable today (using a stub), see the smoke-test snippet that injects a fake `parabun:csv` via `Bun.plugin({ build: { build.module } })`.
