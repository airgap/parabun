# parabun-llm

Native LLM inference via `bun:llm`. This isn't a microbenchmark — it's
a showcase that the whole stack (GGUF loader → tokenizer → Llama
forward pass → CUDA matmul) works end-to-end inside a single Parabun
process, with no Python and no `llama.cpp` binary in the loop.

`bun:llm` is built on the other Parabun runtime modules:

- `bun:gpu` — every matmul in the forward pass goes through
  `gpu.matVec`, which dispatches a CUDA PTX kernel when a device is
  present and falls back to `bun:simd.matVec` otherwise.
- `bun:simd` — CPU fallback for matVec, plus softmax / activation
  helpers.

## Running

```sh
# CUDA path (recommended — debug+ASAN disables cuInit)
bun run build:release --asan=off bench/parabun-llm/run.pjs

# CPU-only path (works on any host; no changes to run.pjs)
bun run build:release bench/parabun-llm/run.pjs
```

Expects a Llama-3.2-1B-Instruct Q8_0 GGUF at
`/rigil/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q8_0.gguf` by
default; set `LLM_FIXTURE=<path>` to override.

## RTX 4070 Ti, PCIe 4.0 ×16

```
gpu backend: cuda  available=[cuda,cpu]  platform=linux
loaded Llama-3.2-1B-Instruct-Q8_0.gguf in 7325 ms

The capital of France is Paris. The Eiffel Tower is located in Paris.
The Louvre Museum is also located in Paris. The famous French artist
Claude Monet painted many landscapes

generated 32 tokens in 1072 ms
throughput: 29.86 tok/s
```

Numbers are from a release build (`--asan=off`). A proper batched prefill
and a fused RMSNorm+rope pass (not yet done) should pull another
meaningful factor out. The point of this showcase isn't the number,
it's that the stack is here.

## What this uses from Parabun

| piece                | file                                 |
| -------------------- | ------------------------------------ |
| GGUF loader          | `src/js/bun/llm/gguf.ts`             |
| Llama-3 BPE tokenizer | `src/js/bun/llm/tokenizer.ts`        |
| Forward pass         | `src/js/bun/llm/llama.ts`            |
| `LLM` surface        | `src/js/bun/llm.ts`                  |
| GPU matmul           | `src/js/bun/gpu.ts` + CUDA PTX       |

Tests for each piece live in
`test/bundler/transpiler/parabun-{gguf,tokenizer,llama,llm}.test.js`
and skip when the fixture isn't present, so CI on hosts without the
checkpoint still passes.

## Writing your own

```js
import { LLM } from "bun:llm";

using llm = await LLM.load("/path/to/model.gguf");

// Streaming
for await (const piece of llm.generate("Hello,", { maxTokens: 64 })) {
  process.stdout.write(piece);
}

// One-shot
const answer = await llm.complete("The capital of France is", { maxTokens: 5 });
console.log(answer); // " Paris."
```

`LLM.load` returns a disposable — `using` cleans up the GPU residency
handles when the block exits. For non-disposable callers, `llm.dispose()`
does the same thing manually.

Low-level pieces are exposed under the default export for callers that
want to hand-roll the pipeline:

```js
import llm from "bun:llm";
const f = await llm.loadGGUF(path);
const model = llm.llamaFromGGUF(f);
const tok = llm.tokenizerFromGGUF(f);
const ids = tok.encode("Hello");
const logits = model.forward(ids[0], 0, model.newKVCache());
const next = llm.argmax(logits);
```
