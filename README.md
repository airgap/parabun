<h1 align="center">Parabun</h1>

<p align="center">
  A fork of <a href="https://bun.com">Bun</a> with on-device LLMs, GPU compute, and parallel primitives — plus optional language extensions for purity and ergonomics.
</p>

## What is Parabun?

Parabun is a **Bun fork** focused on compute: on-device LLM inference, GPU kernels, a persistent worker pool, SIMD primitives, typed-array pipeline fusion, and buffer pooling — all usable from plain TypeScript. An optional set of language extensions (`pure`, `..=`, `..!`, `..&`, `|>`) adds purity guarantees and ergonomic sugar that desugars to standard JS at parse time. You can ignore all of it and still get the runtime modules.

Parabun introduces two new file extensions:
- **`.pts`** — Parabun TypeScript (superset of TypeScript)
- **`.pjs`** — Parabun JavaScript (superset of JavaScript)

Standard `.ts`/`.js` files work exactly as they do in Bun.

### LLM Inference (`bun:llm`)

`bun:llm` is a from-scratch GGUF runtime — file loader, byte-level BPE tokenizer, Llama/Qwen2 transformer forward pass, BERT-family encoder for embeddings, greedy and nucleus sampling, constrained decoding (GBNF + JSON schema), KV prefix caching, and speculative decoding — behind a small `load`/`generate`/`chat`/`embed` surface. Weights stream off disk via `mmap`; the residual stream, KV cache, and all matmuls stay on-device. Only the 4-byte argmax crosses PCIe per token.

```ts
import llm from "bun:llm";

using m = await llm.LLM.load("./Llama-3.2-1B-Instruct-Q4_K_M.gguf");

for await (const piece of m.chat([
  { role: "system", content: "You are helpful and concise." },
  { role: "user", content: "What is the capital of France?" },
])) {
  process.stdout.write(piece);
}
```

- **Quant formats**: F32, F16, Q8_0, Q2_K, Q3_K, **Q4_K**, Q5_K, **Q6_K**. Q4_K/Q6_K matVec kernels use a 1-warp-per-row / 4-warps-per-block layout.
- **Fused projections**: QKV and Gate+Up are byte-concatenated at load time (same quant, contiguous rows) and dispatched as a single matVec per layer. Worth ~20 tok/s on Llama-3.2-1B.
- **Chat templates**: Llama-3, ChatML, and Mistral-Instruct auto-detected from the GGUF's `tokenizer.chat_template`. Fall back to `generate()` with your own framing if none match.
- **Sentence embeddings**: `llm.Encoder.load()` loads BERT-family GGUFs (BGE, E5, MiniLM) for CLS- or mean-pooled, L2-normalized embeddings. Decoder models get a pooled `LLM.embed(text)` path too.
- **Constrained decoding**: GBNF grammars or a JSON schema mask tokens that would take the parse off-accept before sampling — output is guaranteed to conform.
- **Speculative decoding**: pass a smaller `draft` model and `speculativeK` to skip target forwards when the draft agrees, with exact Leviathan et al. accept-reject math.
- **Prefix caching**: `LLM.prefix(sharedPreamble)` snapshots KV + logits once; subsequent `generate()` / `chat()` calls that start with the same tokens skip prefill entirely.
- **Backends**: CUDA on Linux/Windows (via `bun:gpu`'s driver + NVRTC path), CPU fallback on any host. Metal kernels not yet wired.

Llama-3.2-1B-Instruct Q4_K_M on RTX 4070 Ti (release build, best-of-5):

| workload                    | parabun   | ollama   |
|-----------------------------|----------:|---------:|
| greedy decode, device-only  | **340 tok/s** | ~350 tok/s |
| greedy decode, logits DtoH  | ~275 tok/s | n/a      |
| prompt prefill              | ~295 tok/s | n/a      |

At ollama parity on this model/hardware. `bench/llm-tps.ts` reproduces the numbers; `bench/parabun-llm/run.pjs` is the end-user-style harness.

### GPU Compute (`bun:gpu`)

`bun:gpu` is a compute-only GPU surface (not graphics) that mirrors the hot parts of `bun:simd`. It probes a backend chain — Metal on darwin, CUDA on Linux/Windows, CPU fallback always available — and picks the first one whose runtime loads.

```ts
import gpu from "bun:gpu";

gpu.describe();              // { active: "metal", available: ["metal","cpu"], ... }
const scores = gpu.matVec(embeddings, query, N, D);  // MSL kernel on Apple Silicon
const out    = gpu.simdMap(x => x * 3 + 7, big);     // affine — dispatched to GPU if large enough
```

Two thresholds, not one: a **dispatch** threshold lets the GPU kernel run (so tests exercise the real path), and a **wins** threshold (`gpu.winsForSize(op, n, elemBytes)`) tells callers when routing through `bun:gpu` actually beats `bun:simd`. Today `simdMap` wins at ≥ 1<<18 f32 elements; `matVec` is compiled and correct but not yet winning (the naive MSL kernel is bandwidth-bound on M1/M2).

`bun:pipeline`'s fusion tier reads `winsForSize` automatically — a fused affine chain over a large enough `Float32Array` promotes from stacked `simd.mulScalar`+`simd.addScalar` to `gpu.simdMap` without user code changes.

### Parallel Execution (`bun:parallel`)

`bun:parallel.pmap` spreads CPU-bound work across a persistent worker pool. The worker-safety contract is enforced at parse time via the `pure` keyword (see [Language Extensions](#language-extensions)) — no closures, no `this`, no module-level references, so `fn.toString()` round-trips cleanly into the worker context.

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

```ts
import { dot, sum, mulScalar, matVec } from "bun:simd";

const embeddings = new Float32Array(N * D);
const query = new Float32Array(D);
const scores = matVec(embeddings, query, N, D);   // one WASM call, f32x4 internally
```

Primitives include element-wise ops (`mulScalar`, `addScalar`, `simdMap`), reductions (`sum`, `dot`), and bulk operations (`matVec`). Above a ~4 MiB byte-footprint threshold the runtime falls back to monomorphic tight loops (`sumTightF32`/`F64`, `dotTightF32`/`F64`) because at that size the WASM copy-in dominates the reduction.

### Pipeline Fusion (`bun:pipeline`)

`bun:pipeline` is the runtime behind the `|>` operator (see [Language Extensions](#language-extensions)). Affine `map` chains over `Float32Array` / `Float64Array` compile down to a single SIMD pass, with no intermediate arrays and no per-element function calls.

```pts
import { map, sum } from "bun:pipeline";

pure function scale(x) { return x * 1000; }
pure function drift(x) { return x + 2.5; }
pure function calib(x) { return x * 0.998; }

const data = new Float32Array(10_000_000);
const total = await (data |> map(scale) |> map(drift) |> map(calib) |> sum);
```

Each `map` extends a `FusedChain` descriptor instead of wrapping another async generator. On a terminal (`sum`, `collect`, `toFloat32Array`, …), the runtime probes each map with three points: if the whole chain is affine it collapses to a single `(K, C)` and dispatches to `bun:simd` as one pass — `sum` becomes `K · simd.sum(data) + C · n`. Non-affine chains still fuse into a single `simd.simdMap(composed_fn, data)` call.

### Buffer Pooling (`bun:arena`)

`bun:arena` is a typed-array pool. If your hot path repeatedly allocates short-lived buffers of a known size — protocol decode scratch, per-request work buffers, ring stages — borrow from a `Pool` instead of calling `new Uint8Array(N)`:

```ts
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

## Install

```sh
curl -fsSL https://raw.githubusercontent.com/airgap/parabun/main/install.sh | bash
```

Drops the latest release binary into `~/.parabun/bin/parabun` and symlinks `pb` as a short alias. Pin a specific release tag with `... | bash -s parabun-<short-sha>`.

Supported targets: `linux-x64`, `macos-arm64`, `windows-x64` (MinGW). Releases: [github.com/airgap/parabun/releases](https://github.com/airgap/parabun/releases).

The Parabun release binary is less than 1% larger than stock Bun built from the same upstream commit — all the added modules and syntax extensions together add negligible weight.

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

## Language Extensions

All extensions are opt-in, desugar at parse time, and work in any `.pts`/`.pjs` file (plus `.ts` via the VS Code TypeScript plugin). Standard `.ts`/`.js` files are unaffected.

### Pure Functions

Mark functions as `pure` to make purity visible and enforced. The parser rejects `this` access inside pure functions at compile time — which is what makes `bun:parallel.pmap` safe to ship `fn.toString()` into a worker.

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

Enforcement is deep — it follows into nested arrows (which capture outer `this`) but leaves nested regular functions (which have their own `this`) alone:

```pts
pure function broken() {
  return this.x;  // Error: Cannot use "this" inside a pure function
}

pure function valid() {
  function inner() { return this.x; }   // OK — its own `this`
  const bad = () => this.x;              // Error — captures outer `this`
  return inner;
}
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

### Pipeline Operator (`|>`)

Desugars `x |> f` to `f(x)`. Left-to-right function application:

```pts
const output = rawData
  |> JSON.parse
  |> transform
  |> JSON.stringify;

// Equivalent to: JSON.stringify(transform(JSON.parse(rawData)))
```

**Method shorthand.** When the RHS starts with `.`, the piped value becomes the receiver — call methods and access properties on it without the arrow-wrap tax:

```pts
const data ..= (await fetch("/api")) |> .json();
const tokens = csv |> .trim() |> .split(",");
const name = user |> .profile.displayName;
```

`x |> .method(args)` desugars to `x.method(args)`. Chained calls, property access, and indexing after the first `.ident` work because they get picked up by the regular suffix parse.

**Placeholder.** When the RHS is a call and one of its top-level args is `_`, the piped value goes there — so multi-arg functions flow through the pipeline the same way unary ones do:

```pts
const active = users |> filter(_, isActive) |> map(_, .name);
const n = input |> parseInt(_, 10);
const entry = buffer |> lodash.find(_, predicate);
```

Multiple `_` placeholders copy the LHS structurally (`n |> add(_, _)` → `add(n, n)`); bind side-effectful LHS to a const first if that matters. Calls with no `_` keep the function-target form (`x |> f(y)` still means `f(y)(x)`).

Pair it with [`bun:pipeline`](#pipeline-fusion-bunpipeline) for fused typed-array map chains.

### Throw Expressions

`throw E` works in any expression position — on the right of `??`, `||`, `&&`, inside ternary branches, inside arrow bodies. Evaluation is lazy: the throw only fires if the surrounding expression actually reaches it.

```pts
const port = parseInt(env.PORT) || throw new Error("PORT required");
const user = maybeUser ?? throw "missing";
const level = cond ? "debug" : throw new Error("no fallback");
const fail = (msg: string) => throw new Error(msg);
```

Regular `throw E;` statements are unaffected. ASI rules still apply — a newline between `throw` and its operand is a syntax error.

### Operator Precedence

| Operator | Precedence | Desugars to |
|----------|-----------|-------------|
| `\|>` | nullish coalescing | `f(x)` |
| `..!` | conditional | `.catch(f)` |
| `..&` | conditional | `.finally(f)` |
| `..=` | assignment | `await expr` |
| `throw E` | assignment (prefix) | `(() => { throw E; })()` |

Operators bind tighter-to-looser in the order listed, so `data |> transform ..! handler ..& cleanup` parses as `transform(data).catch(handler).finally(cleanup)`.

---

## Bun (upstream)

Parabun is built on top of Bun — every stock Bun feature works as documented at [bun.com/docs](https://bun.com/docs). The `parabun` binary is a drop-in for `bun` with the runtime modules and language extensions above layered on top.

- Upstream runtime/bundler/test-runner/package-manager docs: [bun.com/docs](https://bun.com/docs)
- Upstream source: [github.com/oven-sh/bun](https://github.com/oven-sh/bun)
- Parabun releases: [github.com/airgap/parabun/releases](https://github.com/airgap/parabun/releases)

## License

Parabun inherits Bun's [license](https://bun.com/docs/project/licensing). The Parabun-specific additions are published under the same terms.
