<h1 align="center">Parabun</h1>

<p align="center">
  A fork of <a href="https://bun.com">Bun</a> with language extensions for parallelism, purity, and ergonomics.
</p>

## What is Parabun?

Parabun is a **Bun fork** that adds syntax sugar to JavaScript/TypeScript. All extensions desugar to standard JS at parse time — no runtime magic, no new semantics. Your code stays fast, your tooling stays compatible, and your functions get honest.

Parabun introduces two new file extensions:
- **`.pts`** — Parabun TypeScript (superset of TypeScript)
- **`.pjs`** — Parabun JavaScript (superset of JavaScript)

Standard `.ts`/`.js` files work exactly as they do in Bun.

### Pure Functions

Mark functions as `pure` to make purity visible and enforced. The parser rejects `this` access inside pure functions at compile time.

```pts
pure function add(a: number, b: number): number {
  return a + b;
}

export pure async function fetchUser(id: string) {
  return await fetch(`/api/users/${id}`);
}

const double = pure (x: number) => x * 2;
const delayed = pure async (ms: number) => await Bun.sleep(ms);
```

Editors with the Parabun LSP highlight `pure` functions with a distinct style, making it immediately obvious which functions are side-effect-free.

### Await-Assign (`..=`)

Desugars `const x ..= expr` to `const x = await expr`. Requires an async context.

```pts
pure async function getData() {
  const response ..= fetch('/api/data');
  const json ..= response.json();
  return json;
}
```

### Error Chaining (`..!` and `..&`)

`..!` desugars to `.catch()`, `..&` desugars to `.finally()`. Chain them naturally:

```pts
const result ..= fetch('/api')
  ..! console.error
  ..& cleanup;

// Equivalent to:
// const result = await fetch('/api').catch(console.error).finally(cleanup);
```

### Pipeline (`|>`)

Desugars `x |> f` to `f(x)`. Left-to-right function application:

```pts
const output = rawData
  |> JSON.parse
  |> transform
  |> JSON.stringify;

// Equivalent to: JSON.stringify(transform(JSON.parse(rawData)))
```

### Pipeline Fusion (`bun:pipeline`)

The `|>` operator is a parser-level desugar. `bun:pipeline` is the runtime that makes it efficient on typed arrays — affine `map` chains over `Float32Array`/`Float64Array` compile down to a single SIMD pass, with no intermediate arrays and no per-element function calls.

```pts
import { map, sum } from "bun:pipeline";

pure function scale(x) { return x * 1000; }
pure function drift(x) { return x + 2.5; }
pure function calib(x) { return x * 0.998; }

const data = new Float32Array(10_000_000);
const total = await (data |> map(scale) |> map(drift) |> map(calib) |> sum);
```

Each `map` extends a `FusedChain` descriptor instead of wrapping another async generator. On a terminal (`sum`, `collect`, `toFloat32Array`, …), the runtime probes each map with three points: if the whole chain is affine it collapses to a single `(K, C)` and dispatches to `bun:simd` as one pass — `sum` becomes `K · simd.sum(data) + C · n`. Non-affine chains still fuse into a single `simd.simdMap(composed_fn, data)` call.

### Parallel Execution (`bun:parallel`)

`bun:parallel.pmap` spreads CPU-bound work across a persistent worker pool. The `pure function` contract is what makes this safe to ship across workers:

```pts
import parallel from "bun:parallel";

pure function scoreChunk(chunk) {
  const { emb, query, dim, base, k } = chunk;
  // ... tight loop, no closures, no `this`, no module refs
  return { scores, idx };
}

const results = await parallel.pmap(scoreChunk, chunks, { concurrency: 8 });
```

- **Pure function contract, enforced at parse time.** No closures, no `this`, no module-level references — exactly the things that would silently break when the worker runtime re-evaluates `fn.toString()` in an isolated context. The kernel carries everything it needs on the input chunk.
- **Persistent worker pool.** Workers are spawned lazily, kept alive across calls, and cache compiled function sources so repeat `pmap()` invocations skip the `eval()` step. `unref`/`ref` lifecycle keeps an idle pool from pinning the event loop.
- **Zero-copy via `SharedArrayBuffer`.** A `postMessage` of a typed-array view over a SAB ships only a handle. 150 MB of embeddings or a 64 MB pixel buffer becomes <1 ms of per-call overhead instead of 17 ms × N-chunks of structured clone.
- **Implicit barriers via `await`.** Two sequential `await pmap(...)` calls form a natural barrier — every worker has flushed its slab before the next pass starts reading. No atomics, no locks, no explicit halo exchange; row-major SAB layout plus `await` is enough synchronization for separable convolutions, gradient-then-solve, horizontal-then-vertical, etc.

### SIMD Primitives (`bun:simd`)

`bun:simd` exposes WASM-backed `f32x4` and `f64x2` kernels for `Float32Array` and `Float64Array`:

```pts
import { dot, sum, mulScalar, matVec } from "bun:simd";

const embeddings = new Float32Array(N * D);
const query = new Float32Array(D);
const scores = matVec(embeddings, query, N, D);   // one WASM call, f32x4 internally
```

Primitives include element-wise ops (`mulScalar`, `addScalar`, `simdMap`), reductions (`sum`, `dot`), and bulk operations (`matVec`). Above a ~4 MiB byte-footprint threshold the runtime falls back to monomorphic tight loops (`sumTightF32`/`F64`, `dotTightF32`/`F64`) because at that size the WASM copy-in dominates the reduction.

### Buffer Pooling (`bun:arena`)

`bun:arena` is a typed-array pool. If your hot path repeatedly allocates short-lived buffers of a known size — protocol decode scratch, per-request work buffers, ring stages — borrow from a `Pool` instead of calling `new Uint8Array(N)`:

```pts
import arena from "bun:arena";

const pool = new arena.Pool(Uint8Array, 65536, { prewarm: 8 });

function handle(frame) {
  const buf = pool.acquire();
  try {
    decodeInto(buf, frame);
    return process(buf);
  } finally {
    pool.release(buf);
  }
}
// or: pool.use(buf => { ... })
```

Microbench (200k × 64 KiB Uint8Array allocations + 2 KiB touch each, release build, best-of-5):

```
baseline (new Uint8Array)   707.9 ms
parabun (bun:arena Pool)    248.8 ms      → 2.85×
```

This is a microbench by design — it isolates the allocator/zero-init/GC-tracking cost. If your handler spends 10 ms of real CPU per request and 20 µs on allocation, pooling won't move the needle. The win shows up where allocation is a measurable fraction of the workload (binary protocol gateways, columnar pre-processing, tight encode/decode loops). Pass `clear: true` if recycled buffers must not carry old bytes — defaults to off, since skipping the zero-init is the point of a pool.

### GPU Compute (`bun:gpu`)

`bun:gpu` is a compute-only GPU surface (not graphics) that mirrors the hot parts of `bun:simd`. It probes a backend chain — Metal on darwin, CUDA on Linux/Windows, CPU fallback always available — and picks the first one whose runtime loads.

```pts
import gpu from "bun:gpu";

gpu.describe();              // { active: "metal", available: ["metal","cpu"], ... }
const scores = gpu.matVec(embeddings, query, N, D);  // MSL kernel on Apple Silicon
const out    = gpu.simdMap(x => x * 3 + 7, big);     // affine — dispatched to GPU if large enough
```

Two thresholds, not one: a **dispatch** threshold lets the GPU kernel run (so tests exercise the real path), and a **wins** threshold (`gpu.winsForSize(op, n, elemBytes)`) tells callers when routing through `bun:gpu` actually beats `bun:simd`. Today `simdMap` wins at ≥ 1<<18 f32 elements; `matVec` is compiled and correct but not yet winning (the naive MSL kernel is bandwidth-bound on M1/M2).

`bun:pipeline`'s fusion tier reads `winsForSize` automatically — a fused affine chain over a large enough `Float32Array` promotes from stacked `simd.mulScalar`+`simd.addScalar` to `gpu.simdMap` without user code changes.

## Install

```sh
curl -fsSL https://raw.githubusercontent.com/airgap/parabun/main/install.sh | bash
```

Drops the latest release binary into `~/.parabun/bin/parabun` and symlinks `pb` as a short alias. Pin a specific release tag with `... | bash -s parabun-<short-sha>`.

Supported targets: `linux-x64`, `macos-arm64`, `windows-x64` (MinGW). Releases: [github.com/airgap/parabun/releases](https://github.com/airgap/parabun/releases).

## Benchmarks

See [`bench/parabun-benches.md`](./bench/parabun-benches.md) for the full portfolio with per-bench workload, methodology, and analysis. Headline numbers (best-of-N medians on release builds, verified bit-identical or within-tolerance against each baseline):

| workload                                                | speedup                                     | primitive(s)                  |
|---------------------------------------------------------|--------------------------------------------:|-------------------------------|
| Sobel edge detection (8192² grayscale, 64 MB)           | **5.94×**                                   | `pmap` + SAB, heavy kernel    |
| Monte Carlo option pricing (50 M samples)               | **5.56×**                                   | `pmap` alone (no SIMD/SAB)    |
| Separable Gaussian blur (8192² grayscale, 64 MB)        | **4.75×**                                   | `pmap` + SAB, light kernel    |
| LangChain MemoryVectorStore drop-in (100k × 384)        | **2.83×** per search                        | `pmap` + SAB + pre-normalize  |
| SQLite analytical post-processing (1 M rows × 8)        | **2.71×** on analytical (~10% end-to-end)   | `bun:simd` on columnar F64    |
| Lucas-Kanade optical flow (2048² two-frame)             | **2.63×**                                   | `pmap` + SAB, temporal        |
| Vector-search layered diagnosis (100k × 384)            | **2.03×** (only the SAB+warm-pool tier wins)| `pmap` + SAB                  |
| Streaming ETL (10 M Float32, 4-stage affine → fused)    | **50×** vs `.map` chain · **1.24×** vs tight loop | `bun:pipeline` fusion   |

### Operator Precedence

| Operator | Precedence | Desugars to |
|----------|-----------|-------------|
| `\|>` | nullish coalescing | `f(x)` |
| `..!` | conditional | `.catch(f)` |
| `..&` | conditional | `.finally(f)` |
| `..=` | assignment | `await expr` |

Operators bind tighter-to-looser in the order listed, so `data |> transform ..! handler ..& cleanup` parses as `transform(data).catch(handler).finally(cleanup)`.

## Editor Support

### VS Code / Cursor / Kiro

```sh
curl -fsSL https://raw.githubusercontent.com/airgap/parabun/main/install-extension.sh | bash
```

Downloads the latest `.vsix` and installs it into every compatible editor found on the system (`code`, `cursor`, `kiro`).

Features: syntax highlighting, snippets, LSP diagnostics, completions, hover docs with desugaring examples, code actions (convert `await`→`..=`, `.catch()`→`..!`, add `pure`, `f(x)`→`x |> f`), semantic tokens for `pure`, and a **TypeScript language service plugin** that lets you use Parabun syntax in `.ts` files with full TS tooling.

To build from source instead:

```bash
cd editors/ts-plugin && npm install && npm run build
cd ../vscode/parabun && npm install && npm run build
./editors/install-vsix.sh
```

### E Editor

Built-in support. Open any `.pts`/`.pjs` file — Parabun syntax decoration and LSP diagnostics work automatically.

### Other Editors (LSP)

The Parabun LSP server works with any LSP-compatible editor:

```bash
# Start the LSP (requires parabun on PATH)
parabun run editors/lsp/parabun-lsp.ts --stdio
```

Provides: diagnostics, completions (`pure`, `..=`, `..!`, `..&`, `|>`), hover documentation, and semantic tokens with a `pure` modifier.

## Building

```bash
# Build debug
bun bd

# Run tests
bun bd test test/bundler/transpiler/parabun-parser.test.js
bun bd test test/bundler/transpiler/parabun-pure.test.js
bun bd test test/bundler/transpiler/parabun-purity.test.js

# Symlink for editor integration (installs both 'parabun' and short 'pb')
sudo ln -sf $(pwd)/build/debug/bun-debug /usr/local/bin/parabun
sudo ln -sf $(pwd)/build/debug/bun-debug /usr/local/bin/pb
```

## Purity Enforcement

The `pure` keyword isn't just a label — it's enforced at compile time:

```pts
pure function broken() {
  return this.x;  // Error: Cannot use "this" inside a pure function
}

pure function valid() {
  // Nested regular functions have their own `this` — allowed
  function inner() { return this.x; }
  // But nested arrows inherit purity (they capture outer `this`)
  const bad = () => this.x;  // Error
  return inner;
}
```

---

## Bun (upstream)

Parabun is built on top of Bun — every stock Bun feature works as documented at [bun.com/docs](https://bun.com/docs). The `parabun` binary is a drop-in for `bun` with the language extensions above layered on top.

- Upstream runtime/bundler/test-runner/package-manager docs: [bun.com/docs](https://bun.com/docs)
- Upstream source: [github.com/oven-sh/bun](https://github.com/oven-sh/bun)
- Parabun releases: [github.com/airgap/parabun/releases](https://github.com/airgap/parabun/releases)

## License

Parabun inherits Bun's [license](https://bun.com/docs/project/licensing). The Parabun-specific additions are published under the same terms.
