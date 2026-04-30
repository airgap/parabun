# parabun-browser-shims

Browser-compatible shims for the `bun:*` modules that Parabun's
parse-time desugarings import:

| Module | Browser fidelity |
|---|---|
| `para:arena` | No-op. Browsers don't expose GC control — `arena { body }` runs the body inline, same observable behavior. |
| `para:signals` | Real implementation. `signal` / `derived` / `effect` / `batch` / `untrack`. |
| `bun:wrap` | Real implementation. Carries the `__parabunMemo` / `__parabunDefer0` / `__parabunRange` runtime, including `.forget()` / `.clear()` / `.bypass()` cache invalidation. |
| `para:parallel` | **Web Worker pool** (`navigator.hardwareConcurrency` workers). `pmap` / `preduce` dispatch across workers; transparent sequential fallback under CSP or non-browser hosts. |
| `para:simd` | **WebAssembly SIMD kernels** (v128 f32x4). `mulScalar` / `addScalar` / `add` / `mul` / `sum` / `dot` dispatch to WASM; scalar JS fallback when WASM SIMD is unavailable. `alloc(n, "f32")` returns a `Float32Array` backed by the WASM linear memory for zero-copy calls. |
| `para:gpu` | **WebGPU compute shaders** for `matVecAsync` (workgroup reduction), `matmulAsync` (16×16 tiled), `dotAsync` (tree reduction). `holdQ4K` / `holdQ6K` dequantize at hold-time so matVec consumes quantized weights transparently. Opt-in via `await gpu.initWebGPU()`; sync surface stays CPU for drop-in compatibility. |
| `para:llm` | Throws on load with a clear message — a WebGPU GGUF / Llama port is substantial future work. |
| *(sub-module)* `parabun-browser-shims/quant` | Pure-JS dequantizers for **Q4_K**, **Q6_K**, **Q8_0** (the ggml block formats Parabun's native `para:llm` uses). Consumed by `para:gpu`'s `holdQ4K` / `holdQ6K`; also exported directly for callers writing their own GGUF loader. |

Language surface that *doesn't* need a shim — all of these desugar to
plain JS: `pure`, `memo` (statement and arrow forms, including
`.forget` / `.clear` / `.bypass`), `|>`, `..=`, `..!`, `..&`, `..`
(range), `defer` / `defer await` (compile to ES2024 `using`), `throw`
as expression.

## Install

```sh
npm i parabun-browser-shims
```

## Bundler alias — Vite

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { bunAliases } from "parabun-browser-shims";

export default defineConfig({
  resolve: { alias: bunAliases },
});
```

## Bundler alias — esbuild

```ts
import * as esbuild from "esbuild";
import { bunAliases } from "parabun-browser-shims";

await esbuild.build({
  entryPoints: ["src/app.pts"],
  bundle: true,
  outfile: "dist/app.js",
  alias: bunAliases,
});
```

## Bundler alias — Webpack

```ts
// webpack.config.ts
import { bunAliases } from "parabun-browser-shims";

export default {
  resolve: { alias: bunAliases },
};
```

## Bundler alias — Rollup

```ts
import alias from "@rollup/plugin-alias";
import { bunAliases } from "parabun-browser-shims";

export default {
  plugins: [alias({ entries: bunAliases })],
};
```

## WebGPU — opt-in async kernels

The sync `gpu.matVec(...)` path stays CPU so `.pts` code that uses it
compiles unchanged. Opt into the GPU backend at startup:

```ts
import gpu from "para:gpu";

await gpu.initWebGPU();                      // once per app
const mat = gpu.hold(weights);               // uploads to GPU buffer
const out = await gpu.matVecAsync(mat, q, M, K);
```

`gpu.initWebGPU()` returns `false` and the async variants fall back to
CPU on browsers without WebGPU (Safari ≤17.3, Firefox without
`dom.webgpu.enabled`). `gpu.describe()` reports the live backend +
any init error.

## WebAssembly SIMD — f32 kernels

`para:simd` dispatches to v128 kernels compiled from
[`src/simd.wat`](src/simd.wat) for inputs of ≥256 elements on WASM
SIMD-capable runtimes; smaller inputs and non-`Float32Array` types
take the scalar path. `simd.alloc(n, "f32")` allocates inside the
WASM linear memory — calls on the returned array skip the per-call
copy-in.

```ts
import simd from "para:simd";

const a = simd.alloc(1_000_000, "f32");      // Float32Array, wasm-backed
const b = simd.alloc(1_000_000, "f32");
// ...fill...
const d = simd.dot(a, b);                    // no copy, runs v128
```

Non-wasm-backed TypedArrays still work — they're copied into the WASM
memory per call.

## Web Worker pool — pmap / preduce

`para:parallel` lazily spins up `navigator.hardwareConcurrency` workers
on first call. Each worker receives the stringified callback, evals
it via `new Function(...)`, and processes a contiguous chunk of the
input. Outputs transfer back (TypedArray buffers) to avoid per-chunk
copies. Input structured-clones in.

```ts
import { pmap, preduce, disposeWorkers } from "para:parallel";

const out = await pmap(x => x * x, input);  // chunks across workers
const s = await preduce((a, b) => a + b, 0, input);
disposeWorkers();                            // tear down at teardown
```

Strict CSP (`script-src` without `unsafe-eval`) or non-browser hosts
skip the pool and run sequentially on the calling thread.

## Roadmap to in-browser LLM inference

Done:

- ✅ **Q4_K / Q6_K / Q8_0 block dequantizers** — pure JS, matches ggml
  block layouts byte-for-byte. Exported as
  `parabun-browser-shims/quant`.
- ✅ `gpu.holdQ4K(buf)` / `holdQ6K(buf)` dequantize once and feed
  `matVec` / `matVecAsync` — quantized weights work end-to-end today
  (slow path: decode → f32 → matVec).

Remaining:

1. **GGUF loader** — `fetch`-backed parser that streams metadata + weights
   from a URL. Tokenizer metadata (BPE merges / vocab) comes free from
   the same file.
2. **Dequantize-inside-shader WGSL kernels** — operate directly on the
   packed block formats so the intermediate f32 copy `holdQ4K`
   currently produces is avoided. Halves bandwidth + memory for
   quantized matVec on the GPU.
3. **Forward pass** — RMSNorm, RoPE, attention, FFN, softmax. All f32
   WGSL kernels reusing the compute pipeline pattern `matVecAsync`
   uses.
4. **Sampler** — argmax is trivial; top-k and nucleus sampling are
   small CPU-side passes over the final f32 logits vector.
5. **Chat templates** — Llama-3 / ChatML / Mistral-Instruct parsed out
   of the GGUF's `tokenizer.chat_template`; mostly string
   interpolation.

None are conceptually blocked. Ping the repo if you want a specific
module prioritized.

## Re-compiling the SIMD WASM

The committed `src/simd.wasm` is compiled from `src/simd.wat` via
wabt. Maintainers editing the WAT run:

```sh
bun install        # installs wabt as a devDependency
bun run build:wasm
```

## License

MIT.
