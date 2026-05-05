// OpenAI-compatible LLM proxy in 12 lines. Loads a local GGUF model
// and serves it on the ollama-default port (11434) so any
// OpenAI-API-shaped client (LangChain, the openai SDK, curl) can
// talk to it without code changes.
//
//   LLM_FIXTURE=/path/to/llama-3.1-8b.Q4_K_M.gguf \
//     bun run build:release demos/llm-serve.ts
//
// Then:
//   curl http://localhost:11434/v1/chat/completions \
//     -H 'content-type: application/json' \
//     -d '{"model":"local","messages":[{"role":"user","content":"hi"}]}'

import llm from "parabun:llm";
import { existsSync } from "node:fs";

const modelPath = process.env.LLM_FIXTURE;
if (!modelPath || !existsSync(modelPath)) {
  console.error("LLM_FIXTURE must point to a .gguf checkpoint");
  process.exit(1);
}

console.log(`loading ${modelPath}…`);
await using model = await llm.loadModel(modelPath);
console.log(`device: ${model.device.value}`);

const port = Number(process.env.PORT ?? 11434);
console.log(`serving OpenAI-compatible API on http://localhost:${port}`);
console.log(`endpoints: /v1/models, /v1/chat/completions (sync + SSE), /v1/completions, /v1/embeddings`);

await llm.serve({
  engine: model,
  modelId: process.env.MODEL_ID ?? "local",
  port,
  apiKey: process.env.LLM_API_KEY, // optional
  maxConcurrent: Number(process.env.MAX_CONCURRENT ?? 4),
});
