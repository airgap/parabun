// Streaming LLM chat — one prompt, stream tokens to stdout, report tps.
//
//   LLM_FIXTURE=/path/to/Llama-3.2-1B-Instruct-Q8_0.gguf \
//     bun run build:release demos/llm-chat.ts "What is the capital of France?"
//
// Routes through bun:gpu when available (CUDA on dev / Jetson, Metal on
// macOS); falls through to bun:simd matVec on CPU-only hosts. Same
// source on every target.

import llm from "bun:llm";
import gpu from "bun:gpu";
import { existsSync } from "node:fs";

const FIXTURE = process.env.LLM_FIXTURE;
if (!FIXTURE || !existsSync(FIXTURE)) {
  console.error("usage: LLM_FIXTURE=<path.gguf> parabun demos/llm-chat.ts <prompt>");
  process.exit(1);
}

const prompt = process.argv.slice(2).join(" ") || "What is the capital of France?";

console.log(`backend: ${gpu.describe().active}`);

const t0 = Bun.nanoseconds();
using m = await llm.LLM.load(FIXTURE);
const loadMs = (Bun.nanoseconds() - t0) / 1e6;
console.log(`loaded in ${loadMs.toFixed(0)} ms\n`);

process.stdout.write(`> ${prompt}\n`);

const tGen = Bun.nanoseconds();
let n = 0;
for await (const piece of m.chat([{ role: "user", content: prompt }], { maxTokens: 128 })) {
  process.stdout.write(piece);
  n++;
}
const genMs = (Bun.nanoseconds() - tGen) / 1e6;

console.log("\n");
console.log(`${n} tokens in ${genMs.toFixed(0)} ms — ${(n / (genMs / 1000)).toFixed(1)} tok/s`);
