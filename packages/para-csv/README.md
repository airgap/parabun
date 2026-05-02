# @para/csv

Streaming CSV parser with two output modes: row-objects (the standard JS shape) and **typed-array columns** (the unique one). The columnar mode parses straight into `Float32Array` / `Float64Array` / `Int32Array` / etc. so numeric data lands in compute-ready buffers with no per-row object allocation and no per-cell boxing.

```js
import csv from "@para/csv";
import { sum } from "@para/simd";

// Columnar — rows go straight into typed-array buffers per column.
const cols = await csv.parseColumns(Bun.file("./sensors.csv"), {
  schema: { ts: "f64", temp: "f32", sensorId: "i32", label: "string" },
});
// cols.ts is a Float64Array, cols.temp a Float32Array, etc. Feed
// straight into @para/simd / @para/arrow with no copy.
const totalTemp = sum(cols.temp);
```

```js
// Row-objects — the standard async iterator shape.
for await (const row of csv.parseCsv(file.stream())) {
  // row = { col1, col2, ... }
}
```

## Why columnar?

Most CSV libraries return `Array<{col1, col2}>` row objects. Each row is a JS Object (~56-byte header) plus a boxed `Number` for each numeric cell — ~24 bytes per number. For a 1M-row, 4-numeric-column CSV that's ~120 MB of boxing overhead before you've done any actual work.

`parseColumns` writes straight into `TypedArray` buffers (one per column), grows them exponentially, and tight-fits the result at end-of-stream. For a 200K-row × 4-numeric-column CSV on this codebase: 1.4× faster than the row-objects path, and the result is 3 MB of contiguous bytes — ready to hand to `@para/simd`, `@para/arrow.fromColumns()`, GPU upload, or whatever else expects packed numeric data.

The JS ecosystem otherwise covers this with DuckDB-WASM (10+ MB bundle) or Apache Arrow JS (clunky CSV loader). Pure-JS streaming CSV → typed-array columns sits in a real gap, mostly useful for: edge functions and Workers (no room for the big bundles), browser data viz at the medium-data scale, ML/data prep where you'd rather skip Python.

## API

### `parseColumns(source, { schema, headers?, delimiter?, quote? })`

Returns a `Promise<{ [col]: TypedArray | string[] }>` with one buffer per schema column.

- **`schema`** — object mapping column name to type:
  - `"f32"` / `"f64"` → `Float32Array` / `Float64Array`
  - `"i8"` / `"u8"` / `"i16"` / `"u16"` / `"i32"` / `"u32"` → matching int TypedArray
  - `"string"` → plain `string[]` (TypedArrays can't hold strings)
- **`headers`** — `true` (default) treats the first row as headers and matches schema keys against header cell names. `false` maps schema keys to column indices in declaration order. Or pass an explicit array of header names.
- **`delimiter`** — default `,`. Use `\t` for TSV.
- **`quote`** — default `"`.

Empty / missing numeric cells become `NaN` for floats, `0` for ints. Caller validates if `0` is a meaningful sentinel.

### `parseCsv(source, opts?)`

The classical row-objects async iterator. RFC 4180 quoting, optional headers, type inference, custom delimiter / quote. `parallel: true` opt-in for off-main-thread parsing via `@para/parallel`.

```js
for await (const row of csv.parseCsv("./big.csv", { headers: true })) {
  // row = { col1: ..., col2: ... } with inferred types
}
```

## On the parallel mode (`parseCsv` only)

`parallel: true` is **off-the-main-thread**, not necessarily faster per-file. Sweep on this codebase showed 1.18× at 5 MB, 0.95× at 50 MB, 0.93× at 200 MB — overhead grows with input size. Use it when you don't want to block the main thread, not when you need raw throughput on a single big file.

## Status

`private:true / 0.0.0-dev` — pending the workspace split. See [parabun.script.dev](https://parabun.script.dev) for the runtime-bundled story today.
