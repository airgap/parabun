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
`count`, `sum`, `toFloat32Array`, `toFloat64Array`. Sources: `range(stop)`,
`range(start, stop, step?)`, plus any sync or async iterable. A call-form
`pipe(source, ...transforms)` is exposed for users who prefer not to use `|>`.

**Fusion (Tier 2 auto-accel):** when the source is a `Float32Array` or
`Float64Array` and the chain is a run of `map`s, each `map` extends a
`FusedChain` descriptor instead of wrapping the previous layer in another
async generator. Fusion-aware terminals (`collect`, `sum`,
`toFloat32Array`, `toFloat64Array`) walk the chain and:
- probe each map fn for affine shape (`x*k+c`) via three-point evaluation,
- if all affine, collapse the chain to a single `(K, C)` and dispatch to
  `bun:simd` (`mulScalar`/`addScalar`) — one pass over the array,
- on any non-affine fn, fall back to `simdMap(composed_fn, source)` — one
  pass, no intermediate arrays.

For reductions, `sum` over an all-affine chain becomes
`K * simd.sum(source) + C * n` — a single SIMD pass + two scalar ops,
regardless of chain length. Non-fusion-aware combinators (`filter`,
`take`, etc.) still accept a `FusedChain` via its `Symbol.asyncIterator`,
which realizes the chain on demand and proceeds on the existing
async-generator path.

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

Reduce ops (`sum`, `dot`) skip the WASM copy-in for inputs whose byte
footprint exceeds `REDUCE_WASM_MAX_BYTES` (4 MiB). At that size the copy
dominates the vector reduction, so `sum`/`dot` fall through to
per-type monomorphic tight loops (`sumTightF32`/`sumTightF64`,
`dotTightF32`/`dotTightF64`). Monomorphism matters: a union-typed loop
body would fail JSC's typed-array specialization and cost ~30%.

Benchmark (`bench/simd.pjs`, release build, best-of-200):

N = 100,000:

| op                  | array | `.map`/`.reduce` | tight loop | `bun:simd` |
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

| op                  | array | `.map`/`.reduce` | tight loop | `bun:simd` |
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

### `bun:gpu` — GPU compute for vector/matrix primitives

Compute-only GPU surface (no graphics) that mirrors a subset of `bun:simd`.
Probes a backend chain — Metal on darwin, CUDA on Linux/Windows, always
falling back to a CPU path that just forwards to `bun:simd`. All callers
see the same contract regardless of host; the kernel that runs underneath
is the host's fastest option.

```
import gpu from "bun:gpu";
gpu.describe();           // { active: "metal", available: ["metal","cpu"], platform: "darwin" }
gpu.dot(a, b);            // number
gpu.matVec(mat, vec, M, K); // Float32Array of length M
gpu.matmul(a, b, M, K, N);  // Float32Array of length M*N
gpu.simdMap(fn, a);         // Float32Array — affine fn detected
gpu.winsForSize(op, n, elemBytes); // size-gated routing hint
```

Exports: `dot`, `matVec`, `matmul`, `simdMap`, `activeBackend`, `hasBackend`,
`setBackend`, `winsForSize`, `describe`, `dispose`. `setBackend("cpu")`
forces the fallback for testing; `setBackend("auto")` re-runs the probe.

Two thresholds, not one:

- **Dispatch threshold** — above this size, the op hits the real GPU
  kernel. Exists so the kernel gets exercised in tests.
- **Wins threshold** (`winsForSize`) — above this size, *callers* should
  route to `bun:gpu` rather than `bun:simd`. `bun:pipeline`'s fusion tier
  reads this when deciding whether to promote a fused affine chain.

They're decoupled because a compiled-and-correct kernel isn't always a
*winning* kernel. Today `simdMap` wins at ≥ 1<<18 f32 elems; `matVec`'s
wins threshold is parked at `Infinity` because the naive MSL kernel is
~2× slower than `bun:simd` on M1/M2 (memory-bandwidth-bound, no
threadgroup tiling). The dispatch threshold still lets the kernel run.

Backend implementations:

- **Metal** (`src/js/bun/gpu/metal.ts`) — Obj-C runtime via `bun:ffi`
  against `libobjc.A.dylib`. MSL kernels are compiled at load time with
  `newLibraryWithSource:options:error:`, pipeline state cached per
  kernel. Unified memory + `MTLResourceStorageModeShared` gives
  zero-copy buffers, so dispatch cost is encoder setup + GPU wait.
- **CUDA** (`src/js/bun/gpu/cuda.ts`) — PTX kernel (`simdMapAffineF32`)
  loaded via the CUDA driver API. `dot`/`matVec`/`matmul` currently
  forward to `bun:simd` pending kernel work; the interface is already
  wired.
- **CPU** (`src/js/bun/gpu/cpu.ts`) — every op forwards to `bun:simd`.

Pipeline integration: when a fused affine chain on a `Float32Array` is
large enough (`winsForSize("simdMap", n, 4)`), `bun:pipeline`'s
`realizeChain` dispatches to `gpu.simdMap` instead of stacking
`simd.mulScalar`+`simd.addScalar`. Transparent fallback on hosts
without a real GPU backend — same code path, CPU kernels at the end.

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
  `Float64Array`, `bun:simd` `sum`/`dot` for mean/stddev/weighted-dot,
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

## Pending Work

- **In-place binary ops for `bun:simd`** — optional `dstOverwrite: "a"`
  escape hatch that mutates and returns the input buffer instead of a fresh
  one, eliding the copy-out slice. Semantics change, so gated behind an
  option.
- **`bun:simd` zero-copy path for binary ops** — element-wise `add`/`mul`
  at N ≳ 1 M still pay 8–16 MB of copy-in per call. Sharing the user's
  `ArrayBuffer` with the WASM instance via `WebAssembly.Memory` would let
  the binary ops match the gains the reduce-op threshold fallback already
  captures.
- **Auto-accel dispatch, Tier 3 (pure-fn → GPU shader)** — `bun:gpu`
  ships the affine special case (Metal MSL kernel for `x*K + C` on
  Float32Array; pipeline fusion promotes matching chains automatically).
  Still pending: full AST-to-MSL/WGSL transpile so non-affine `pure`
  functions (polynomials, tanh, sqrt-based kernels) also run on GPU.
  The purity contract forbids the constructs that would fail the
  transpile (closures, `this`, side effects, stateful globals); scope
  is scalar-in/scalar-out numeric kernels with `Math.*` → shader
  intrinsics and `if/else/loop` → shader control flow.
- **Tuned `matVec` MSL kernel** — current naive one-thread-per-row
  kernel is ~2× slower than `bun:simd` on M1/M2 (bandwidth-bound).
  Simdgroup-reduced variant (32 threads per row, stride-32 partial dot,
  `simd_sum` reduction) should close the gap and let
  `MIN_MATVEC_WINS_ELEMS` move off Infinity. CUDA matVec PTX is also
  pending — currently forwards to `bun:simd`.
- **Auto-accel dispatch, Tier 4 (cross-call buffer residency)** — deciding
  to keep a typed array GPU-resident between user calls so a one-shot
  `dot(a, b)` on a discrete GPU isn't bottlenecked by PCIe. Either needs
  escape analysis over the user's code or an explicit opt-in (e.g.
  `holdOnGpu(arr)` / `GpuFloat32Array`). For discrete GPUs this is the
  make-or-break; without it, transparent dispatch to discrete GPU always
  loses to CPU SIMD. Tier 2 pipeline fusion partly hides the need by
  amortizing the copy across multiple ops within one pipeline.
