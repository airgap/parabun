# Parabun + ParaScript — LLM Context

**Parabun** is a fork of [Bun](https://bun.com) (the JavaScript/TypeScript runtime) that ships native modules for parallel compute, GPU, SIMD, and direct hardware I/O. **ParaScript** is the optional TypeScript dialect Parabun ships alongside it — purity, error chaining, pipelines, ranges, reactivity, and edge-triggered handlers, written in `.pts` files. All ParaScript extensions desugar to standard JavaScript at parse time in the Zig-based parser; no runtime changes. The same extensions also work over plain JavaScript in `.pjs` files (un-branded — `.pts` is the canonical surface). The runtime and the language are independent: you can use Parabun without ParaScript, and (once the standalone transpiler ships) ParaScript without Parabun.

## File Extensions

- `.pts` — **ParaScript** (superset of `.ts`). The canonical surface — what the docs and editor tooling lead with.
- `.pjs` — same extensions over plain JavaScript (superset of `.js`). Supported, un-branded; the marketing focuses on `.pts`.
- Standard `.ts`/`.js` files are unaffected.

## ParaScript Language Extensions

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

### `memo` declarator

`memo` is a first-class declarator for memoized pure functions. It implies both **pure** (no outer mutation, no `this`, same purity-check rules as `pure fun`) and **function**, so no other keyword is needed. Writing `memo pure fun` / `memo function` / `memo fun` is a parse error with a migration hint — `memo` stands on its own.

```
memo fib(n) {
  if (n < 2) return n;
  return fib(n - 1) + fib(n - 2);
}

memo add(a, b) { return a + b; }
memo async load(key) { return await db.get(key); }
export memo normalize(s) { return s.trim().toLowerCase(); }
```

Arrow form — `memo` also works as an expression prefix on an arrow, producing a memoized pure arrow:

```
const dbl = memo (x) => x * 2;
const fib = memo (n) => n < 2 ? n : fib(n - 1) + fib(n - 2);
const load = memo async (k) => k;
const shorthand = memo x => x * 2;           // 1-arg shorthand
```

`memo` before `(...)` is disambiguated from a call: `memo(5)` / `memo(a, b)` — where no `=>` follows the matching `)` — keeps `memo` as a plain identifier and parses as a call. Any arrow continuation (`=>` or a TS return-type annotation `:T =>`) activates the memo prefix.

Both forms desugar to `const name = __parabunMemo(anonymous_fn, arity);`. The inner function (or arrow) is rendered anonymous so recursive self-references (`fib(n-1)` above) resolve through the outer `const`, which is the memoized wrapper — a named inner function expression would create a local self-binding and bypass the cache.

Cache layout (selected from the declared arity — rest parameters always land in the multi-arg path):

- **0 args** — singleton cache, first call's result is reused forever.
- **1 arg, no rest** — `Map` keyed directly by the argument (object identity for non-primitives, no stringify cost).
- **≥2 args or rest** — nested `Map` chain, one level per argument. The terminal value at each depth is stored under a private `Symbol` sentinel so that calls with different argument counts sharing a prefix don't collide.

Async memoization dedupes concurrent in-flight calls (the first call's promise is returned to later callers) and evicts the entry if the promise rejects, so the next call retries fresh. Fulfilled promises stay cached.

**Cache invalidation.** The memoized wrapper carries three methods for manual eviction:

- `fn.forget(...args)` — drop the cache entry for those args. Returns `true` if an entry was present, `false` otherwise. For a 0-arg memo, `forget()` with no args drops the singleton.
- `fn.clear()` — drop every cached entry.
- `fn.bypass(...args)` — call the underlying function, skip the cache read, do NOT write the result to the cache. Useful when the caller wants a guaranteed-fresh result without invalidating state other callers still rely on.

```
memo async fetchProfile(id) { return await db.users.get(id); }

await fetchProfile("u1");           // hits db, caches
await fetchProfile("u1");           // cached, no db
fetchProfile.forget("u1");          // drop "u1"
await fetchProfile("u1");           // hits db again
await fetchProfile.bypass("u1");    // hits db, cache still holds previous value
fetchProfile.clear();               // drop all cached profiles
```

### `..` / `..=` (range literals)

Integer ranges, step 1.

```
0..5     →  [0, 1, 2, 3, 4]   (exclusive end)
1..=5    →  [1, 2, 3, 4, 5]   (inclusive end)
```

Desugars to `__parabunRange(a, b)` / `__parabunRangeInclusive(a, b)`. Empty / inverted ranges (`5..3`, `0..0`) produce an empty array — never throw. Precedence: tighter than comparison, looser than shift / add / multiply, so `a+1..b-1` groups as `(a+1)..(b-1)` and `0..n < m` groups as `(0..n) < m`. Left-associative; `1..2..3` does not chain.

V1 is integer-only with step 1. For large ranges prefer a counter `for` loop — ranges allocate an array up front. For ranges with non-literal operands, each side is evaluated once.

**Break from baseline JS.** The idiom `1..toString()` previously parsed as `(1.).toString()` (the first `.` was a decimal-point terminator on `1`). In Parabun it parses as the range `1..toString` followed by a call. Write `(1).toString()` or `1.0.toString()` when you want the baseline behaviour — the one idiom that breaks is an obscure stylistic variant already avoided in modern code.

### `..!` (catch operator)

Desugars `expr ..! handler` to `expr.catch(handler)`. Precedence: conditional level.

### `..&` (finally operator)

Desugars `expr ..& cleanup` to `expr.finally(cleanup)`. Precedence: conditional level.

### `|>` (pipeline operator)

Desugars `x |> f` to `f(x)`. Precedence: nullish coalescing level (tighter than `..!`/`..&`).

**Method shorthand.** If the token after `|>` is `.`, treat it as a member expression on the LHS instead of a function to call with the LHS:

```
response |> .json()                     →  response.json()
csv |> .trim() |> .split(",")           →  csv.trim().split(",")
user |> .name                           →  user.name
input |> .trim() |> parseInt            →  parseInt(input.trim())
```

Trailing calls / property access / indexing after `.ident` are handled by the regular suffix loop — the shorthand only synthesizes the first member access, the rest falls out. The method runs with the piped value as `this`.

**Placeholder substitution.** When the RHS of `|>` is a call expression and its top-level argument list contains one or more `_` identifiers, each `_` is replaced with the piped value:

```
users  |> filter(_, isActive)        →  filter(users, isActive)
input  |> parseInt(_, 10)            →  parseInt(input, 10)
buffer |> write(_, "hi", { f: 1 })   →  write(buffer, "hi", { f: 1 })
arr    |> lodash.filter(_, pred)     →  lodash.filter(arr, pred)
users  |> filter(_, a) |> map(_, b)  →  map(filter(users, a), b)
```

Zero `_` falls back to the function-target form (`x |> f(y)` means `f(y)(x)`). Multiple `_` copy the LHS structurally — if the LHS has side effects, bind it to a const first to avoid double evaluation. `_` is treated as a placeholder only at the top level of a pipeline RHS call; nested `_` (e.g. inside an inner arrow body) is left as a regular identifier. Outside `|>`, `_` remains a normal identifier and is not reserved.

### `~>` (reactive binding operator)

Desugars `A ~> B` to `require("para:signals").effect(() => { B = A; })` — an `effect` that evaluates `A` in a tracked context and re-assigns `B` whenever any signal read by `A` changes. Precedence: assign level (lower than `|>`, so `a |> f ~> sink` parses as `(a |> f) ~> sink`).

```
signal count = 0;
count ~> elem.innerHTML;               // elem mirrors count
count |> Math.abs ~> obj.absValue;     // pipeline composes with ~>
const stop = count ~> other;           // capture disposer
```

`B` must be assignable — an identifier, property access (`obj.prop`), or index (`arr[i]`). Other RHS shapes — calls, literals, arrow functions — are rejected at parse time with `requires an assignable target on the right (identifier or property access)`.

When `B` is a signal, the existing signal-assignment sugar rewrites `B = A` to `B.set(A)`, so `src ~> dst` between two signals wires them together cleanly. When `A` contains signal reads, the bare-read sugar rewrites each to `.get()` inside the effect body, enrolling them as tracked deps.

The expression evaluates to the disposer returned by `effect()`, so users can capture it (`const stop = ...`) or ignore it (fire-and-forget at statement scope).

`A ~> B [when COND]` adds an `if (COND)` guard around the assignment inside the effect body. Reads of signals inside `COND` are tracked too, so the guard re-evaluates whenever its own deps change.

### `->` (reactive call-binding operator)

Desugars `A -> fn` to `require("para:signals").effect(() => { fn(A); })` — the call-sink complement to `~>`. When `A` reads signals, any change re-runs the body and re-calls `fn` with the latest value. Same precedence as `~>` (assign level), same disposer return shape, same optional `when COND` guard.

```
signal a = 1;
a -> log;                                    // log(a) on every change
a -> obj.write;                              // method sink
`a=${a}` -> process.stdout.write;            // template + signal → write
a |> Math.abs -> log;                        // pipeline composes with ->
const stop = a -> log;                       // capture disposer
a -> log when enabled;                       // guarded: only call when enabled is truthy
```

The RHS must be a callable target — an identifier, property access (`obj.method`), or index (`arr[i]`). Bare call expressions (`a -> f()`), literals, and arrow functions are rejected at parse time with `requires a callable target on the right (identifier, property access, or indexed function)`. Bind an arrow to a `const` first if you need one as the sink.

When `A` reads signals, the bare-read sugar rewrites each to `.get()` inside the effect body so they enroll as tracked deps; `fn` is invoked with the resulting value as a single positional argument.

### `when EXPR { … }` (edge-triggered block)

Statement-level edge handler. `when EXPR { BODY }` desugars to `require("para:signals").onRising(() => EXPR, () => { BODY })` — fires `BODY` once each time `EXPR` transitions falsy → truthy. `when not EXPR { BODY }` desugars to `onFalling(...)` — fires on the truthy → falsy edge. Reads inside `EXPR` are tracked the same way they would be inside `effect { … }`.

```
when motion.detected.get() && bot.state.get() === "idle" {
  bot.say("Welcome back!");
}

when not bot.busy.get() {
  flushQueuedNotifications();
}
```

Block-form `when` is **distinct** from the suffix `when` clause used by `~>` / `->` (`A ~> B when C` and `A -> fn when C`): position disambiguates. The suffix form is an every-truthy guard — it re-fires whenever a tracked dep changes and `C` is currently truthy. The block form is edge-triggered — it fires once per false→true (or true→false) transition. Same word, two related but distinct semantics; pick by position.

Initial state is treated as already-observed: a predicate that starts truthy does **not** fire on first run; only subsequent transitions do. Same convention as `signals.onRising`/`onFalling` used directly.

`when` keeps its identifier reading when followed by `(`, `;`, `=`, `.`, `,`, `?.`, or end-of-line — `const when = ...; when(x);` and `import { when } from "..."` work unchanged. Block form requires the next token to start a predicate expression (identifier, `!`, string, etc.).

### `defer`

Schedules an expression to run when the enclosing block exits — on normal fall-through, early return, or a thrown exception. Multiple defers dispose in LIFO order (reverse of declaration).

```
function readConfig(path) {
  const fd = fs.openSync(path);
  defer fs.closeSync(fd);
  const data = fs.readFileSync(fd);
  defer log("config-read");
  return JSON.parse(data);
}
```

Desugars to an ES2024 `using` declaration whose initializer wraps a thunk in a disposable shape:

```
defer fs.closeSync(fd);
  →  using __parabun_defer_0$ = __parabunDefer0(() => fs.closeSync(fd));
```

**`defer await` (async defer).** Inside an async function, `defer await EXPR` schedules an awaited dispose. Uses `await using` + `__parabunAsyncDefer0`. Outside an async function, `defer await` is a parse error.

```
async function open(path) {
  const h = await api.open(path);
  defer await h.close();
  return await h.read();
}
```

**Semantics that fall out of `using`.**
- LIFO disposal: reverse of declaration order.
- Early return / throw: dispose runs regardless of how the scope exits.
- Loop body: each iteration's defers dispose before the next iteration starts.
- Multiple throwing defers chain via `SuppressedError`, matching ES2024.

**Late binding.** The deferred expression is re-evaluated at dispose time in a closure over the surrounding scope, so captured locals see their final values — `defer console.log(x)` after `x = 3` prints `3`, not the value at the defer statement.

`defer` as a plain identifier (variable name, property, assignment target) is unaffected — the keyword path only triggers when `defer` is immediately followed (no newline) by something that starts an expression.

### `arena { ... }` (GC-deferred block)

Runs a block of statements with JSC garbage collection deferred for its synchronous duration, then requests an Eden collection on block exit. Desugars to:

```
arena { body }
  →  require("para:arena").scope(() => { body });
```

Use for short, allocation-heavy sections where mid-work GC pauses hurt latency — the collector's work shifts to the end of the block instead of firing at unpredictable thresholds. This is **latency-smoothing, not a bump allocator**: the heap still pays the eventual collection cost, just at a time of the caller's choosing.

**Semantics caveats.**
- Body is a synchronous arrow. `return`, `break`, `continue` inside the block are arrow-local — same as inside `.forEach(() => ...)`. To get a value out, assign to an outer `let`.
- `await` is rejected inside the body. Microtasks queued from the arrow fire *after* the deferral releases, so `scope(async () => ...)` would not actually run the async work with GC deferred — the parser forbids it to prevent that footgun.
- DeferGC has no upper safety threshold; unbounded allocation inside the block can OOM before the scope dtor releases. Keep the block bounded.

`arena` as a plain identifier (`const arena = 1; arena + 1`) is unaffected — the keyword path only triggers when `arena` is immediately followed (no newline) by `{`.

### `throw` as expression

`throw E` is legal in any expression position (RHS of `??`, `||`, `&&`, ternary branches, arrow bodies, etc.). Desugars to `(() => { throw E; })()`. The operand is parsed at AssignmentExpression level — a trailing comma is not absorbed. Evaluation is lazy: the IIFE only runs (and throws) when the surrounding expression actually reaches the throw branch.

```
const port = parseInt(env.PORT) || throw new Error("PORT required");
const user = maybeUser ?? throw "missing";
const fail = x => throw new Error(x);
```

Regular `throw E;` statements are unaffected. ASI still applies: a newline between `throw` and its operand is a syntax error.

### Chaining

Operators compose naturally:

```
const result = await fetch('/api') ..! console.error ..& cleanup;
// → const result = await fetch('/api').catch(console.error).finally(cleanup);

const output = data |> transform ..! handler;
// → transform(data).catch(handler);
```

## Architecture

### Parser (Zig)

All extensions are implemented as parse-time desugaring in `src/ast/`:

| File | Purpose |
|------|---------|
| `parseSuffix.zig` | `..!`, `..&`, `|>`, `~>` operator handlers |
| `parsePrefix.zig` | `pure` keyword detection in expressions, `this` restriction check, `throw` as expression |
| `parseStmt.zig` | `pure` in statement/export contexts |
| `parse.zig` | `parsePurePrefixExpr`, `parsePureAsyncPrefixExpr` |
| `parseFn.zig` | `is_pure` flag threading, arrow purity inheritance |
| `ast.zig` | `Flags.Function.is_pure` enum member |
| `E.zig` | `E.Arrow.is_pure` field |

File extension registration: `src/options.zig` (loaders, extension orders, all 10 locations).

### LSP Server (`editors/lsp/parabun-lsp.ts`)

Lightweight LSP that runs with the Parabun binary. Provides:

- **Diagnostics** — Real parse errors from `Bun.Transpiler` (purity violations, syntax errors)
- **Completions** — `pure`, `pure function`, `pure async function`, `memo`, `memo async`, `defer`, `defer await`, `..!`, `..&`, `|>`, `~>`, `..` / `..=` (ranges)
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
test/bundler/transpiler/parabun-parser.test.js      — operator desugaring
test/bundler/transpiler/parabun-pure.test.js        — pure keyword parsing
test/bundler/transpiler/parabun-purity.test.js      — purity enforcement
test/bundler/transpiler/parabun-throw-expr.test.js           — throw as expression
test/bundler/transpiler/parabun-pipeline-method.test.js      — pipeline method shorthand
test/bundler/transpiler/parabun-pipeline-placeholder.test.js — pipeline placeholder (_)
test/bundler/transpiler/parabun-memo.test.js                 — memo declarator
test/bundler/transpiler/parabun-defer.test.js                — defer / defer await
```

## Runtime

### `para:parallel` — `pmap`, `preduce`

Parallel map and reduce over arrays using a Worker pool. Functions must be
pure; their source is shipped to each worker via `fn.toString()`, so closures
and outer references are not available by design.

```
import { pmap, preduce } from "para:parallel";
pure function double(x) { return x * 2; }
const out = await pmap(double, [1, 2, 3, 4]); // → [2, 4, 6, 8]

pure function add(acc, x) { return acc + x; }
const sum = await preduce(add, [1, 2, 3, 4, 5], 0); // → 15
```

`pmap(fn, array, options?)` maps `fn` over contiguous chunks in parallel and
reassembles in original order. `preduce(fn, array, initialValue, options?)`
reduces chunks in parallel, then merges partial results on the main thread.
The reduce function must be associative for correct parallel results.

`options.concurrency` caps the worker count (defaults to
`min(navigator.hardwareConcurrency, 8)`). Both support TypedArrays via
SAB-backed zero-copy transfer. Errors thrown in a worker propagate as
rejections on the returned promise.

Implementation: `src/js/bun/parallel.ts` (registered via
`src/bun.js/HardcodedModule.zig`).

### `para:pipeline` — lazy streaming combinators

Combinators designed for the `|>` operator. Nothing runs until a terminal
(`collect`, `reduce`, `forEach`, `count`) pulls from the stream.

```
import { map, filter, take, collect, range } from "para:pipeline";
pure function sq(x) { return x * x; }
pure function gt10(x) { return x > 10; }
const out = await (range(100) |> map(sq) |> filter(gt10) |> take(3) |> collect);
// → [16, 25, 36]
```

Transformations: `map`, `filter`, `take`, `drop`, `takeWhile`, `dropWhile`,
`flat`, `flatMap`, `chunk`, `tap`. Terminals: `collect`, `reduce`, `forEach`,
`count`, `sum`, `toFloat32Array`, `toFloat64Array`. Sources: `range(stop)`,
`range(start, stop, step?)`, plus any sync or async iterable. A call-form
`pipe(source, ...transforms)` is exposed for users who prefer not to use `|>`.

**Fusion (Tier 2 auto-accel):** when the source is a `Float32Array` or
`Float64Array` and the chain is a run of `map`s, each `map` extends a
`FusedChain` descriptor instead of wrapping the previous layer in another
async generator. Fusion-aware terminals (`collect`, `sum`,
`toFloat32Array`, `toFloat64Array`) walk the chain and:
- probe each map fn for affine shape (`x*k+c`) via four-point evaluation,
- if all affine, collapse the chain to a single `(K, C)` and dispatch to
  `para:simd` (`mulScalar`/`addScalar`) — one pass over the array,
- on any non-affine fn, fall back to `simdMap(composed_fn, source)` — one
  pass, no intermediate arrays.

For reductions, `sum` over an all-affine chain becomes
`K * simd.sum(source) + C * n` — a single SIMD pass + two scalar ops,
regardless of chain length. The `reduce` combinator detects FusedChain
sources and calls `reduceChain`, which applies the fused map operations
inline inside the reduce accumulator loop — zero intermediate arrays
for `pipe(Float32Array, map(f), map(g), reduce(h, init))` patterns.

Non-fusion-aware combinators (`filter`,
`take`, etc.) still accept a `FusedChain` via its `Symbol.asyncIterator`,
which realizes the chain on demand and proceeds on the existing
async-generator path.

**Parallel pipeline (`pipeParallel`):** dispatches pipeline stages via
`para:parallel` for data parallelism. Consecutive `map` stages are composed
into a single function and dispatched via `pmap`. When consecutive maps are
immediately followed by a `reduce`, the maps are fused into the reduce via
`preduce`'s `mapFn` option — maps execute inside each worker's reduce loop
with no intermediate array allocation. A standalone terminal `reduce` uses
`preduce` directly. Non-parallelizable stages (`filter`, `take`, etc.) act
as barriers — data is collected, the barrier runs serially, then the next
parallel segment resumes. Falls back to serial `pipe` for small inputs
(< 256 items).

```
import { map, filter, reduce, pipeParallel } from "para:pipeline";
pure function triple(x) { return x * 3; }
pure function isOdd(x) { return x % 2 !== 0; }
pure function add(acc, x) { return acc + x; }
const sum = await pipeParallel(data, map(triple), filter(isOdd), reduce(add, 0));
```

Implementation: `src/js/bun/pipeline.ts`.

### `para:simd` — vector primitives for typed arrays

Polymorphic vector primitives over `Float32Array` and `Float64Array`,
designed for use with `pure` functions and the `|>` pipeline operator. Each
primitive dispatches by element width: `Float32Array` → hand-assembled f32x4
WASM kernel, `Float64Array` → f64x2 kernel. JS tight-loop fallbacks are kept
for both widths.

```
import { mulScalar, add, dot, simdMap } from "para:simd";
const y32 = mulScalar(new Float32Array([1, 2, 3, 4]), 3);             // [3, 6, 9, 12]
const y64 = mulScalar(new Float64Array([1, 2, 3, 4]), 3);             // same, f64x2 path
const z   = add(new Float32Array([1, 2]), new Float32Array([10, 20])); // [11, 22]
const d   = dot(new Float64Array([1, 2, 3]), new Float64Array([4, 5, 6])); // 32
```

Exports: `mulScalar(a, c)`, `addScalar(a, c)`, `add(a, b)`, `mul(a, b)`,
`sum(a)`, `dot(a, b)`, `matVec(m, v, rows, cols)`, `topK(scores, k)`,
`simdMap(fn, a)`. Element-wise ops throw `RangeError` on length mismatch
and `TypeError` when operands mix `Float32Array` and `Float64Array`. All
ops throw `TypeError` for non-float typed-array inputs.

`topK(scores, k)` returns an `Int32Array` of length `min(k, scores.length)`
holding the indices of the k largest scores, in descending score order.
Ties resolve by earlier index (stable). NaN scores are never selected.
Pure scalar — the O(N·k) fixed-size-sorted-array insertion beats both
object-sort (O(N log N) + allocation) and binary-heap (O(N log k)) for
the common `k ≪ N` shape because the "no-displace" branch predicts
perfectly after the first k iterations.

`mulScalar`/`addScalar`/`add`/`mul` accept an optional final
`{ dstOverwrite }` or `{ dst }` argument. `dstOverwrite: "a"` (or `"b"`
for binary ops) mutates that input in-place and returns it, skipping
the copy-out `slice()`. `dst: preAllocd` writes results into a
caller-provided typed array (same element type and length as the
inputs). The two options are mutually exclusive.

**True zero-copy via `alloc()`**: `alloc(length, "f32" | "f64")` returns
a typed array backed by the `para:simd` WASM instance's linear memory.
When every input and the destination of an output op is wasm-backed
(detectable via `isWasmBacked(arr)`), the op dispatches to an
offset-parameterized `*At` kernel that reads and writes the alloc pool
directly — no copy-in, no copy-out, staying fully vectorized above the
4 MiB threshold. First `alloc()` call commits the pool to 128 MiB of
WASM memory (112 MiB alloc region + 16 MiB kernel scratch) and pins it
— non-shared memory + detach-on-grow means we can't grow afterward
without invalidating existing views, so ops past the commit point
either fit in pool-adjacent scratch or fall back to the JS tight loop.

```js
import { alloc, mulScalar } from "para:simd";
const a = alloc(2_000_000, "f32");           // backed by WASM memory
const out = alloc(2_000_000, "f32");         // also backed
// ... fill `a` ...
mulScalar(a, 3, { dst: out });               // zero-copy: *At kernel writes into `out`
mulScalar(a, 3, { dstOverwrite: "a" });      // zero-copy in-place
```

`simdMap(fn, a)` probes the mapping function at four inputs (x = -1, 0, 1, 2)
to detect affine kernels (`x * k1 + k0`); matched kernels dispatch to a
scalar-multiply-plus-add fast path. The four-point probe catches piecewise
functions like `relu(x) = x > 0 ? x : 0` that the old three-point probe
(x = 0, 1, 2) falsely accepted. Unmatched kernels fall back to a plain scalar
loop. Only sound for `pure` functions — the purity contract guarantees the
probe calls are observably equivalent.

Implementation: `src/js/bun/simd.ts`.

Both reduce ops (`sum`, `dot`) and output ops (`mulScalar`, `addScalar`,
`add`, `mul`) skip the WASM copy-in for inputs whose byte footprint
exceeds a 4 MiB copy-in threshold (`REDUCE_WASM_MAX_BYTES` /
`OUTPUT_WASM_MAX_BYTES` — same value today, separate names so they can
be tuned independently). Above that, the ops fall through to per-type
monomorphic tight loops (`sumTightF32`/`sumTightF64`,
`dotTightF32`/`dotTightF64`, `mulScalarTightF32`/`F64`,
`addScalarTightF32`/`F64`, `addTightF32`/`F64`, `mulTightF32`/`F64`).
Monomorphism matters: a union-typed loop body would fail JSC's
typed-array specialization and cost ~30%. Output-op helpers take an
`out` parameter so the same helper serves both fresh-allocation and
`dstOverwrite` paths without branching.

Benchmark (`bench/simd.pjs`, release build, best-of-200):

N = 100,000:

| op                  | array | `.map`/`.reduce` | tight loop | `para:simd` |
|---------------------|:-----:|-----------------:|-----------:|-----------:|
| mulScalar(a, 3)     | F32   | 808 µs           | 60 µs      | **30 µs**  |
| add(a, b)           | F32   | 884 µs           | 73 µs      | **40 µs**  |
| sum(a)              | F32   | 574 µs           | 43 µs      | **17 µs**  |
| dot(a, b)           | F32   | 716 µs           | 51 µs      | **24 µs**  |
| simdMap(x*3+7)      | F32   | 848 µs           | 66 µs      | 63 µs      |
| simdMap(sqrt(x²+1)) | F32   | 868 µs           | 136 µs     | 380 µs     |
| mulScalar(a, 3)     | F64   | 736 µs           | 241 µs     | **55 µs**  |
| add(a, b)           | F64   | 810 µs           | 296 µs     | **102 µs** |
| sum(a)              | F64   | 508 µs           | 56 µs      | **30 µs**  |
| dot(a, b)           | F64   | 600 µs           | 101 µs     | **59 µs**  |
| simdMap(x*3+7)      | F64   | 732 µs           | 239 µs     | **50 µs**  |
| simdMap(sqrt(x²+1)) | F64   | 738 µs           | 247 µs     | **348 µs** |

N = 1,000,000 (reduce ops take the threshold fallback):

| op                  | array | `.map`/`.reduce` | tight loop | `para:simd` |
|---------------------|:-----:|-----------------:|-----------:|-----------:|
| sum(a)              | F32   | 5.82 ms          | 388 µs     | **296 µs** |
| dot(a, b)           | F32   | 6.51 ms          | 483 µs     | **462 µs** |
| sum(a)              | F64   | 5.25 ms          | 606 µs     | **407 µs** |
| dot(a, b)           | F64   | 6.16 ms          | 1.07 ms    | **537 µs** |

Across both widths the WASM kernels deliver 1.5–3× speedups over JS tight
loops and 10–35× over idiomatic `.map`/`.reduce` at N = 100 K. F64 sees the
biggest win because JSC's FTL tier auto-vectorizes f32 tight loops more
aggressively than f64, so the manual f64x2 kernel clears a larger gap. At
N = 1 M the reduce-op threshold keeps `sum`/`dot` competitive by falling
back to the monomorphic tight loops — those loops even beat the bench's
inline tight loop (a closure that captures its array) because the per-type
exported helpers sit on a cleaner inline-cache path.

Sub-~1 K input sizes are dominated by per-call overhead regardless of path.
`simdMap` routes affine kernels through `mulScalar` when the offset is zero,
inheriting the same fast path. The non-affine F32 fallback is 2–3× slower
than inline because the function-type parameter is a polymorphic call site
and JSC can't inline the kernel; the F64 fallback still wins over inline
because the underlying `out[i] = fn(a[i], i)` form survives auto-vectorization
better than the `Math.sqrt(x*x+1)` tight loop in JS source.

### `para:gpu` — GPU compute for vector/matrix primitives

Compute-only GPU surface (no graphics) that mirrors a subset of `para:simd`.
Probes a backend chain — Metal on darwin, CUDA on Linux/Windows, always
falling back to a CPU path that just forwards to `para:simd`. All callers
see the same contract regardless of host; the kernel that runs underneath
is the host's fastest option.

```
import gpu from "para:gpu";
gpu.describe();           // { active: "metal", available: ["metal","cpu"], platform: "darwin" }
gpu.dot(a, b);            // number
gpu.matVec(mat, vec, M, K); // Float32Array of length M
gpu.matmul(a, b, M, K, N);  // Float32Array of length M*N
gpu.simdMap(fn, a);         // Float32Array — affine fn detected
gpu.winsForSize(op, n, elemBytes); // size-gated routing hint
const mat = gpu.alloc(M * K, "f32"); // page-aligned; enables NOCOPY matVec
gpu.isAligned(mat);        // true on metal for alloc'd, false otherwise
```

Exports: `dot`, `matVec`, `matmul`, `simdMap`, `alloc`, `isAligned`,
`hold`, `release`, `activeBackend`, `hasBackend`, `setBackend`,
`winsForSize`, `describe`, `dispose`. `setBackend("cpu")` forces the
fallback for testing; `setBackend("auto")` re-runs the probe.

`alloc(length, "f32"|"f64")` returns a typed array whose backing pointer
is a multiple of the system page size (16 KiB on Apple Silicon, 4 KiB on
Intel). On Metal, `matVec` detects page-aligned inputs via `isAligned`
and dispatches through `newBufferWithBytesNoCopy:length:options:deallocator:`
— skipping the MTLBuffer-internal memcpy that dominates matVec time at
large sizes. Callers that don't use `alloc` still work; they just take
the COPY path. Alloc'd memory is held for the backend's lifetime (same
commit-for-lifetime model as `para:simd.alloc`). On CPU/CUDA, `alloc`
returns a plain typed array.

`hold(arr) → GpuHandle` / `release(handle)` lets callers keep a typed
array GPU-resident across `matVec` calls. On Metal, `hold` allocates
one `MTLBuffer` up front (NOCOPY if `arr` is page-aligned, COPY
otherwise) and reuses it across every matVec dispatch; `matVec` accepts
either a `Float32Array` or a `GpuHandle` as the matrix argument. The
bench `bench/parabun-metal-zerocopy/` shows the resident path is
30–150% faster than NOCOPY (which is itself 2–10× faster than COPY) —
so `hold` is worth it whenever the same matrix is used more than
twice. On CPU/CUDA, `hold` returns a no-op wrapper so the call site
stays portable. Using a released handle throws; `release` is
idempotent. Scope today: handles are only consumed by `matVec`.

Two thresholds, not one:

- **Dispatch threshold** — above this size, the op hits the real GPU
  kernel. Exists so the kernel gets exercised in tests.
- **Wins threshold** (`winsForSize`) — above this size, *callers* should
  route to `para:gpu` rather than `para:simd`. `para:pipeline`'s fusion tier
  reads this when deciding whether to promote a fused affine chain.

They're decoupled because a compiled-and-correct kernel isn't always a
*winning* kernel. Today `simdMap` wins at ≥ 1<<18 f32 elems; `matVec`
on Metal wins at ≥ 1<<20 f32 elems (1 M elems, 4 MiB) — but *only* when
inputs come from `gpu.alloc`. Without alignment the kernel runs the
COPY path and loses to CPU until ~16 MiB. See
`bench/parabun-metal-zerocopy/README.md` for the measured crossover on
M4. On CUDA we haven't benchmarked yet; `winsForSize` there is still
parked at `Infinity`. The dispatch threshold still lets the kernel run
for regression coverage regardless.

Backend implementations:

- **Metal** (`src/js/bun/gpu/metal.ts`) — Obj-C runtime via `bun:ffi`
  against `libobjc.A.dylib`. MSL kernels are compiled at load time with
  `newLibraryWithSource:options:error:`, pipeline state cached per
  kernel. Unified memory + `MTLResourceStorageModeShared` + NOCOPY on
  `gpu.alloc`'d inputs gives true zero-copy dispatch; non-aligned
  inputs fall back to `newBufferWithBytes:` which still works but pays
  one memcpy per call.
- **CUDA** (`src/js/bun/gpu/cuda.ts`) — PTX kernels loaded via the
  CUDA driver API: `simdMapAffineF32`, `matVecF32` and `dotF32`
  (warp-reduced via `shfl.sync.bfly.b32`), and `matmulF32` (32×32
  SMEM tile with 4×4 register tile per thread, fully-unrolled inner
  K-loop). `matVec` and
  `matmul` dispatch to their PTX kernels past fixed size thresholds
  (or unconditionally if a caller held an input via `gpu.hold`); `dot`
  dispatches only when a caller holds an input — cold dot loses to
  `para:simd` at every measured size because per-call HtoD dominates.
  `winsForSize` stays parked at Infinity for all three — callers opt
  in via `gpu.hold`. See `bench/parabun-gpu-matmul` (up to ~114× JS on
  held 1024×512×1024 matmul) and `bench/parabun-gpu-dot` (up to ~24×
  `para:simd` on held 128 MB dot) on an RTX 4070 Ti.

  **Dynamic kernel compilation (NVRTC):** When `simdMap` encounters a
  non-affine `pure` function on a `Float32Array`, it attempts runtime
  compilation via NVRTC (NVIDIA Runtime Compilation). The pipeline:
  1. `extractReturnExpr(fn.toString())` — regex-parse the function source
     to extract the single return expression and parameter name.
  2. `translateExprToCuda(expr, param)` — rewrite `Math.*` calls to CUDA
     intrinsics (`sinf`, `expf`, `fabsf`, etc.), `**` to `powf`, `===`
     to `==`. Bails if unknown identifiers remain (closures, globals).
  3. `generateCudaKernelSrc` — wrap the expression in an
     `extern "C" __global__ void custom_map(...)` kernel template.
  4. NVRTC compile to PTX → `cuModuleLoadData` → `cuModuleGetFunction`.
  Results are cached in `kernelCache: Map<string, CachedKernel | null>`.
  Supported: arithmetic, ternary (`? :`), all `Math.*` single-arg
  functions, `Math.pow`/`Math.hypot`/`Math.atan2`, constants
  (`Math.PI`, `Math.E`, etc.). Unsupported expressions (closures,
  multi-statement bodies, string ops) silently fall back to WASM/scalar.
- **CPU** (`src/js/bun/gpu/cpu.ts`) — every op forwards to `para:simd`.

Pipeline integration: when a fused affine chain on a `Float32Array` is
large enough (`winsForSize("simdMap", n, 4)`), `para:pipeline`'s
`realizeChain` dispatches to `gpu.simdMap` instead of stacking
`simd.mulScalar`+`simd.addScalar`. Transparent fallback on hosts
without a real GPU backend — same code path, CPU kernels at the end.

### Tier 1 / Tier 2 modules

The runtime ships a number of higher-level modules built on the
primitives above. They aren't reproduced here — see the README for
the user-facing surface, and `src/js/bun/*.ts` for the source:

- **Tier 1** (codecs + capture + inference + peripheral I/O):
  `para:image`, `para:audio` (codecs + DSP + ALSA capture/playback;
  `audio.devices` is a callable signal — `.subscribe(cb)` for
  inotify-driven hotplug events on `/dev/snd`), `para:camera` (V4L2;
  `camera.devices` is a callable signal — 2 s polling because
  Bun's fs.watch on `/dev` recurses into permission-restricted
  entries), `para:csv`, `para:llm` (GGUF Llama/Qwen2 + BERT
  embeddings + Whisper STT, with `m.busy` / `m.device` reactive
  signals; `m.chatJSON([...], { schema })` is the single-shot
  grammar-constrained convenience that drains and parses
  for tool dispatch), `para:rtp` (with `JitterBuffer.pendingSignal` /
  `lossCountSignal` / `lossRateSignal`), `para:mcp` (Model Context
  Protocol client — stdio + WebSocket transports), `para:gpio` /
  `para:i2c` / `para:spi` (userspace peripheral access on Linux SBCs
  via `/dev/gpiochipN`, `/dev/i2c-N`, `/dev/spidevN.M` — same surface
  across Pi 4/5, Jetson, any Linux SBC; `para:gpio` exposes both
  single-line `chip.line(...)` and atomic multi-line `chip.bank(...)`).
- **Tier 2** (applications): `para:speech` (`listen` / `transcribe` /
  `say` / `speak` / `wakeWord` / `matchWakePhrase`, with reactive
  `active` / `noiseFloor` / `lastUtterance` signals on listen and
  `active` / `lastTrigger` on wakeWord; `say(text, { model })` is the
  headline TTS form — synth + play to speaker in one call, with a
  process-wide PlaybackStream cache; `speak()` returns raw PCM for
  callers that need it. Backed by a long-running per-voice piper
  subprocess cached for the process lifetime),
  `para:assistant` (the 3-line voice-assistant facade — composes
  `para:audio` + `para:speech` + `para:llm` / `para:mcp`, ships
  sqlite-backed persistent memory, tool dispatch (inline + MCP),
  VAD-driven barge-in + `bot.interrupt()`, wake-word gate, cron-driven
  scheduled prompts, and RAG over a local doc directory; exposes
  `state` / `history` / `lastTurn` / `interrupted` / `toolsActive`
  signals), `para:vision` (motion detection ships with `detected` /
  `score` signals on the returned iterator; detector / OCR engines
  stubbed), `para:arrow` (in-memory tables + computes + IPC streaming
  wire-compatible with apache-arrow 21.x).

All of these are registered in `src/bun.js/HardcodedModule.zig`.
Edits to `src/js/bun/*.ts` need a runtime cache clear
(`rm -rf ~/.bun/install/cache/@t@/*.pile`) and a touch of
`InternalModuleRegistry.cpp` so the bundler regenerates.

## Browser compilation

Parse-time syntax (`pure`, `memo`, `|>`, `..!`, `..&`, `..` / `..=` ranges, `defer` / `defer await`, `throw` as expression) compiles to plain JS and runs in a browser unchanged. The runtime-backed features do NOT — `arena { body }` imports `para:arena`, `signal` / `effect` / `~>` import `para:signals`, and `memo` / range literals import `bun:wrap`. Bundlers targeting `browser` can't resolve these specifiers by default.

[`packages/parabun-browser-shims`](packages/parabun-browser-shims) is the browser shim package. Applications targeting the browser alias the `bun:*` specifiers onto it via bundler config:

```
// vite.config.ts
import { defineConfig } from "vite";
import { bunAliases } from "parabun-browser-shims";
export default defineConfig({ resolve: { alias: bunAliases } });
```

Module fidelity:

- **`para:arena`** — no-op (browsers don't expose GC control; inline body is semantically correct).
- **`para:signals`** — full implementation of `signal` / `derived` / `effect` / `batch` / `untrack`, plus `fromAsync(asyncIterable)` and `fromInterval(fn, periodMs)` — the latter the canonical "periodic source → reactive signal" helper for IoT sensor reads.
- **`bun:wrap`** — full implementation of `__parabunMemo` (with `.forget` / `.clear` / `.bypass`), `__parabunDefer0`, `__parabunAsyncDefer0`, `__parabunRange`, `__parabunRangeInclusive`.
- **`para:parallel`** — sequential fallback. `pmap` / `preduce` run on the main thread; Web-Worker-backed implementation is future work.
- **`para:simd`** — scalar JS loops. Correct output; ~5–20× slower than v128 on large TypedArrays. WebAssembly SIMD swap-in is future work.
- **`para:gpu`** — CPU fallback via `para:simd`. WebGPU / WebGL2 compute-shader backend is future work.
- **`para:llm`** — throws on load with a descriptive error. Browser inference (WebGPU port of the Q4_K / Q6_K kernels) is future work.

## Real-world benchmark: SQLite analytical workload

`bench/parabun-sqlite/` compares three variants of the same workload —
post-query analytical processing of 1 M rows of time-series sensor data
across 8 sensors — to answer two questions: does Parabun add overhead on
unchanged code, and does deliberate use of its features deliver a real
speedup?

- **Variant A** (`variant-a.js`): idiomatic `bun:sqlite` + plain JS loops.
- **Variant B** (`variant-b.pjs`): same code, `.pjs` extension. Zero
  Parabun features used; just confirms the parser imposes no overhead.
- **Variant C** (`variant-c.pjs`): columnar extraction into
  `Float64Array`, `para:simd` `sum`/`dot` for mean/stddev/weighted-dot,
  pure anomaly-count kernel, shared weights across sensors.

Best-of-5 per variant (release build; `bun run bench/parabun-sqlite/run.ts`):

| variant                          | load_ms (min/med) | analyze_ms (min/med) | total_ms (med) |
|----------------------------------|------------------:|---------------------:|---------------:|
| A — `.js`, idiomatic bun         | 306 / 318         | **19.4** / 22.7      | 339            |
| B — `.pjs`, same code            | 294 / 339         | 16.5 / 20.3          | 359            |
| C — `.pjs`, parabun-optimized    | 280 / 296         | **7.0** / 9.5        | 306            |

- **Parabun imposes no overhead.** Variant B's timings overlap A's in all
  phases within run-to-run noise.
- **Analytical work is ~2× faster in variant C** (7.0 ms min vs 19.4 ms
  min). The whole chain of `simd.sum`, two `simd.dot` calls, and a pure
  anomaly-count loop — across 8 sensors — fits in single-digit
  milliseconds.
- Total time is dominated by SQLite row extraction (~300 ms for 1 M
  rows), so the end-to-end win is smaller (~10%). The 2× analytical
  speedup is the relevant number for workloads where extraction is
  amortized (cached query results, streaming from network, etc.).

## Real-world benchmark: vector search (cosine top-K)

`bench/parabun-vector-search/` layers seven variants of cosine top-K
over a 100 000 × 384 Float32 embedding matrix (~150 MB), each exposing a
different bottleneck: per-row `simd.dot` boundary cost, bulk `simd.matVec`
copy-in, Worker spawn, structured-clone, SAB residency, and finally
`gpu.matVec` on held embeddings. Every tier teaches which cost dominates
until it's removed; the GPU row lands at ~10× baseline once
`para:simd.topK` replaces the idiomatic `map → sort → slice` that was
masking the CUDA kernel's real compute win.

Batched retrieval (Q = 32 queries, one `gpu.matmul` call against the held
D×N transposed index) collapses Q `matVec` round-trips into one kernel
launch and drops per-query latency to **0.72 ms — 54× over the plain JS
batched baseline**. A batch-size sweep across Q ∈ {1, 4, 16, 64, 256}
shows a clean inflection at Q = 64 (0.30 ms/query), past which the
matmul saturates GPU compute and CPU-side `simd.topK` grows linearly
without amortization left to claim.

See `bench/parabun-vector-search/README.md` for the full per-tier
breakdown and the sweep curve.

## Pending Work

- **Auto-accel dispatch, Tier 3 (pure-fn → GPU shader)** — `para:gpu`
  ships both the affine special case (GPU kernel for `x*K + C` on
  Float32Array; pipeline fusion promotes matching chains automatically)
  and **dynamic kernel compilation** for arbitrary non-affine pure
  functions. On CUDA: NVRTC compiles JS→CUDA C→PTX at runtime; on
  Metal: `newLibraryWithSource:` compiles JS→MSL at runtime. Both paths
  extract the function's return expression via regex, translate
  `Math.*` to GPU intrinsics, `**` to `pow`, ternary passes through
  natively. Results are cached in `kernelCache`/`mslKernelCache`.
  Supported: arithmetic, ternary, all `Math.*` builtins, `**`, constants.
  Unsupported (closures, multi-statement, string ops) silently falls back
  to WASM/scalar. The four-point affine probe (x=-1,0,1,2) correctly
  rejects piecewise functions like relu before reaching the compiler.
- **Auto-accel dispatch, Tier 4 (implicit cross-call residency)** — the
  explicit opt-in (`gpu.hold`/`release` on Float32Array matrices) is live
  on **both** Metal and CUDA, and accepted by every op (`dot`, `matVec`,
  `matmul`, `simdMap`). On an RTX 4070 Ti the held path beats `para:simd`
  1.4–17× across 4–32 MiB matrices (see `bench/parabun-cuda-residency`);
  held-vs-cold is 25–220× because the cold path's per-call HtoD +
  `cuCtxSynchronize` round-trip is eliminated. Still pending: implicit
  residency via escape analysis or a `GpuFloat32Array` wrapper so common
  code doesn't have to call `hold` manually. For discrete GPUs that
  implicit step is the difference between "fast if you know" and "fast by
  default"; on Apple Silicon the explicit API already captures most of
  the win thanks to unified memory.
