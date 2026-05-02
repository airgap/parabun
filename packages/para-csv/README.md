# @para/csv

Streaming RFC 4180 CSV parser. Async iterator over rows; quoted fields; custom record separators. Optional parallel mode runs the parse off the main thread via `@para/parallel`.

```js
import csv from "@para/csv";

// Streaming — async iterator
const file = Bun.file("./big.csv");
for await (const row of csv.parse(file.stream())) {
  // row is { col1, col2, ... }
}

// Off-the-main-thread parse
const rows = await csv.parseAll(file, { parallel: true });
```

## API

- **`parse(source, opts?)`** — async iterator. `source` accepts `string`, `Uint8Array`, `Blob`, `ReadableStream<Uint8Array>`, or any `AsyncIterable<Uint8Array | string>`.
- **`parseAll(source, opts?)`** — fully buffered. With `parallel: true`, dispatches chunks across the worker pool from `@para/parallel`.
- **`stringify(rows, opts?)`** — write a CSV from an array of objects.

## On the parallel mode

`parallel: true` is **off-the-main-thread**, not necessarily faster per-file. Sweep on this codebase showed 1.18× at 5 MB, 0.95× at 50 MB, 0.93× at 200 MB — overhead grows with input size. Use it when you don't want to block the main thread, not when you need raw throughput on a single big file.

## Status

`private:true / 0.0.0-dev` — pending the workspace split. See [parabun.script.dev](https://parabun.script.dev) for the runtime-bundled story today.
