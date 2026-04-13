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

## Pending Work

- **WebGPU compute dispatch** — GPU-accelerated pure functions
