# Parabun — LLM Context

Parabun is a fork of [Bun](https://bun.com) (the JavaScript/TypeScript runtime) that adds language extensions for purity, error handling, and pipelines. All extensions desugar to standard JavaScript at parse time in the Zig-based parser. No runtime changes.

## File Extensions

- `.pts` — Parabun TypeScript (superset of `.ts`)
- `.pjs` — Parabun JavaScript (superset of `.js`)
- Standard `.ts`/`.js` files are unaffected.

## Language Extensions

### `pure` keyword

Modifier for functions. Enforced at compile time — `this` access is a parse error inside pure functions. Arrow functions inside pure functions inherit the restriction.

```
pure function add(a, b) { return a + b; }
pure async function await1(p) { return await p; }
const double = pure (x) => x * 2;
const f = pure async (p) => await p;
export pure function multiply(a, b) { return a * b; }
```

Purity checks reject `this`, `arguments`, `delete`, and known impure globals:
`console`, `fetch`, `process`, `globalThis`, `setTimeout`, `setInterval`,
`setImmediate`, `queueMicrotask`, `Math.random`, `Date.now`, `performance.now`,
`crypto.randomUUID`, `crypto.getRandomValues`. Nested non-pure `function`
declarations are unrestricted; arrow functions inherit purity.

Desugars to a standard function. The `is_pure` flag is stored on `Flags.Function` (for declarations) and `E.Arrow` (for arrows) in the AST. The flag is accessible during parsing via `fn_or_arrow_data_parse.is_pure`.

### `..=` (await-assign)

Desugars `const x ..= expr` to `const x = await expr`. Requires async context.

### `..!` (catch operator)

Desugars `expr ..! handler` to `expr.catch(handler)`. Precedence: conditional level.

### `..&` (finally operator)

Desugars `expr ..& cleanup` to `expr.finally(cleanup)`. Precedence: conditional level.

### `|>` (pipeline operator)

Desugars `x |> f` to `f(x)`. Precedence: nullish coalescing level (tighter than `..!`/`..&`).

### Chaining

Operators compose naturally:

```
const result ..= fetch('/api') ..! console.error ..& cleanup;
// → const result = await fetch('/api').catch(console.error).finally(cleanup);

const output = data |> transform ..! handler;
// → transform(data).catch(handler);
```

## Architecture

### Parser (Zig)

All extensions are implemented as parse-time desugaring in `src/ast/`:

| File | Purpose |
|------|---------|
| `parseSuffix.zig` | `..!`, `..&`, `|>` operator handlers |
| `parsePrefix.zig` | `pure` keyword detection in expressions, `this` restriction check |
| `parseStmt.zig` | `pure` in statement/export contexts |
| `parse.zig` | `parsePurePrefixExpr`, `parsePureAsyncPrefixExpr` |
| `parseFn.zig` | `is_pure` flag threading, arrow purity inheritance |
| `ast.zig` | `Flags.Function.is_pure` enum member |
| `E.zig` | `E.Arrow.is_pure` field |

File extension registration: `src/options.zig` (loaders, extension orders, all 10 locations).

### LSP Server (`editors/lsp/parabun-lsp.ts`)

Lightweight LSP that runs with the Parabun binary. Provides:

- **Diagnostics** — Real parse errors from `Bun.Transpiler` (purity violations, syntax errors)
- **Completions** — `pure`, `pure function`, `pure async function`, `..=`, `..!`, `..&`, `|>`
- **Hover** — Markdown docs for `pure` keyword and all operators
- **Semantic tokens** — `pure` keyword tagged as `function` type with `pure` modifier

Errors from `Bun.Transpiler` are `BuildMessage` objects with structured position data:
```
{ position: { line, column, length, lineText, file }, message, level }
```

### Editor Extensions

**VS Code** (`editors/vscode/parabun/`):
- TextMate grammars extending `source.ts`/`source.js`
- `storage.modifier.pure.parabun` scope for `pure` keyword
- `keyword.operator.*.parabun` scopes for operators
- Language client starts the Parabun LSP

**E Editor** (integrated in `/raid/E/`):
- `parabun-ts`/`parabun-js` language IDs (separate from `typescript`/`javascript` to avoid TS LSP interference)
- CodeMirror ViewPlugin for `pure` keyword and operator decoration
- LSP registry entries for automatic server management

### Tests

```
test/bundler/transpiler/parabun-parser.test.js  — 16 tests: operator desugaring
test/bundler/transpiler/parabun-pure.test.js    — 13 tests: pure keyword parsing
test/bundler/transpiler/parabun-purity.test.js  — 16 tests: purity enforcement
```

## Runtime

### `bun:parallel` — `pmap`

Parallel map over arrays using a Worker pool. The mapping function must be
pure; its source is shipped to each worker via `fn.toString()`, so closures
and outer references are not available by design.

```
import { pmap } from "bun:parallel";
pure function double(x) { return x * 2; }
const out = await pmap(double, [1, 2, 3, 4]); // → [2, 4, 6, 8]
```

Signature: `pmap(fn, array, options?)`. `options.concurrency` caps the worker
count (defaults to `min(navigator.hardwareConcurrency, 8)`). Workers run the
function over contiguous chunks and reassemble in original order. Errors
thrown in a worker propagate as rejections on the returned promise.

Implementation: `src/js/bun/parallel.ts` (registered via
`src/bun.js/HardcodedModule.zig`).

### `bun:pipeline` — lazy streaming combinators

Combinators designed for the `|>` operator. Nothing runs until a terminal
(`collect`, `reduce`, `forEach`, `count`) pulls from the stream.

```
import { map, filter, take, collect, range } from "bun:pipeline";
pure function sq(x) { return x * x; }
pure function gt10(x) { return x > 10; }
const out = await (range(100) |> map(sq) |> filter(gt10) |> take(3) |> collect);
// → [16, 25, 36]
```

Transformations: `map`, `filter`, `take`, `drop`, `takeWhile`, `dropWhile`,
`flat`, `flatMap`, `chunk`, `tap`. Terminals: `collect`, `reduce`, `forEach`,
`count`. Sources: `range(stop)`, `range(start, stop, step?)`, plus any sync or
async iterable. A call-form `pipe(source, ...transforms)` is exposed for users
who prefer not to use `|>`.

Implementation: `src/js/bun/pipeline.ts`.

### `bun:simd` — vector primitives for typed arrays

Polymorphic vector primitives over `Float32Array` and `Float64Array`,
designed for use with `pure` functions and the `|>` pipeline operator. Each
primitive dispatches by element width: `Float32Array` → hand-assembled f32x4
WASM kernel, `Float64Array` → f64x2 kernel. JS tight-loop fallbacks are kept
for both widths.

```
import { mulScalar, add, dot, simdMap } from "bun:simd";
const y32 = mulScalar(new Float32Array([1, 2, 3, 4]), 3);             // [3, 6, 9, 12]
const y64 = mulScalar(new Float64Array([1, 2, 3, 4]), 3);             // same, f64x2 path
const z   = add(new Float32Array([1, 2]), new Float32Array([10, 20])); // [11, 22]
const d   = dot(new Float64Array([1, 2, 3]), new Float64Array([4, 5, 6])); // 32
```

Exports: `mulScalar(a, c)`, `addScalar(a, c)`, `add(a, b)`, `mul(a, b)`,
`sum(a)`, `dot(a, b)`, `simdMap(fn, a)`. Element-wise ops throw `RangeError`
on length mismatch and `TypeError` when operands mix `Float32Array` and
`Float64Array`. All ops throw `TypeError` for non-float typed-array inputs.

`simdMap(fn, a)` probes the mapping function at three inputs to detect affine
kernels (`x * k1 + k0`); matched kernels dispatch to a scalar-multiply-plus-add
fast path. Unmatched kernels fall back to a plain scalar loop. Only sound for
`pure` functions — the purity contract guarantees the probe calls are
observably equivalent.

Implementation: `src/js/bun/simd.ts`.

Benchmark (`bench/simd.pjs`, release build, N = 100,000, best-of-200):

| op                  | array | `.map`/`.reduce` | tight loop | `bun:simd` |
|---------------------|:-----:|-----------------:|-----------:|-----------:|
| mulScalar(a, 3)     | F32   | 778 µs           | 46 µs      | **23 µs**  |
| add(a, b)           | F32   | 857 µs           | 67 µs      | **34 µs**  |
| sum(a)              | F32   | 542 µs           | 37 µs      | **14 µs**  |
| dot(a, b)           | F32   | 660 µs           | 46 µs      | **21 µs**  |
| simdMap(x*3+7)      | F32   | 787 µs           | 54 µs      | 59 µs      |
| simdMap(sqrt(x²+1)) | F32   | 745 µs           | 118 µs     | 309 µs     |
| mulScalar(a, 3)     | F64   | 732 µs           | 240 µs     | **51 µs**  |
| add(a, b)           | F64   | 808 µs           | 286 µs     | **103 µs** |
| sum(a)              | F64   | 504 µs           | 55 µs      | **30 µs**  |
| dot(a, b)           | F64   | 597 µs           | 100 µs     | **73 µs**  |
| simdMap(x*3+7)      | F64   | 740 µs           | 245 µs     | **49 µs**  |
| simdMap(sqrt(x²+1)) | F64   | 734 µs           | 247 µs     | **128 µs** |

Across both widths the WASM kernels deliver 1.5–3× speedups over JS tight
loops and 10–35× over idiomatic `.map`/`.reduce` at N = 100 K. F64 sees the
biggest win because JSC's FTL tier auto-vectorizes f32 tight loops more
aggressively than f64, so the manual f64x2 kernel clears a larger gap. For
very large arrays (N ≈ 1 M), binary-op speedups shrink because copy-in of
16 MB dominates; reduce ops (`sum`, `dot`) can even lose to a tight JS loop
at that size for F64 — the JS loop avoids the copy entirely.

Sub-~1 K input sizes are dominated by per-call overhead regardless of path.
`simdMap` routes affine kernels through `mulScalar` when the offset is zero,
inheriting the same fast path. The non-affine F32 fallback is 2–3× slower
than inline because the function-type parameter is a polymorphic call site
and JSC can't inline the kernel; the F64 fallback still wins over inline
because the underlying `out[i] = fn(a[i], i)` form survives auto-vectorization
better than the `Math.sqrt(x*x+1)` tight loop in JS source.

## Pending Work

- **In-place binary ops for `bun:simd`** — optional `dstOverwrite: "a"`
  escape hatch that mutates and returns the input buffer instead of a fresh
  one, eliding the copy-out slice. Semantics change, so gated behind an
  option.
- **`bun:simd` zero-copy for large arrays** — for very large inputs (N ≳ 1 M)
  the copy-in cost dominates binary reduce ops (`sum`, `dot`) and can lose
  to a tight JS loop on `Float64Array`. A zero-copy path that reads directly
  from the user's `ArrayBuffer` via `WebAssembly.Memory` sharing would
  reclaim the gap.
