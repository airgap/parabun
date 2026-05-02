# @para/parallel

`pmap` and `preduce` over a persistent Web Worker pool. Pure JS, runs on browsers, Node, Bun, Deno. Falls back to sequential execution in CSP-restricted contexts where `Worker` + `new Function` aren't available.

```js
import { pmap, preduce } from "@para/parallel";

const rows = Array.from({ length: 1_000_000 }, (_, i) => `record-${i}`);

function score(row) {
  let h = 0;
  for (let i = 0; i < row.length; i++) h = (h * 31 + row.charCodeAt(i)) | 0;
  return h * h;
}

const scores = await pmap(score, rows, { concurrency: 8 });
const sum = await preduce((acc, x) => acc + x, scores, 0);
```

## API

- **`pmap(fn, items, opts?)`** — parallel map. `fn` is a `(value, index) => result` (sync or async). `opts.concurrency` defaults to `Math.min(navigator.hardwareConcurrency, 8)`.
- **`preduce(fn, items, init, opts?)`** — parallel reduce with an associative `fn(acc, value, index)`.

## Constraints

- **Functions must be pure.** They're shipped to workers via `fn.toString()` and rehydrated with `new Function(…)`. Closures over outer scope, references to outer `this`, and impure globals don't survive the transfer.
- TypedArray inputs go through structured-clone copy by default. The output chunk's buffer is transferred back instead of copied, keeping per-chunk overhead proportional to chunk size.

## Status

`private:true / 0.0.0-dev` — pending the workspace split that this package is part of. See [parabun.script.dev](https://parabun.script.dev) for the runtime-bundled story today.
