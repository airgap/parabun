// Decode-TPS benchmark for para:llm vs ollama on the same Q4_K_M fixture.
// Prints prompt-prefill-tps and decode-tps after a warmup pass. Greedy-only.
import llm from "para:llm";

const FIXTURE = "/rigil/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q4_K_M.gguf";
const PROMPT = "Once upon a time, in a quiet village nestled between green hills,";
const MAX_TOKENS = 128;

const loadStart = performance.now();
const model = await llm.LLM.load(FIXTURE);
const loadMs = performance.now() - loadStart;

const promptIds = model.tokenizer.encode(PROMPT);
console.log(`parabun: loaded in ${loadMs.toFixed(0)} ms; prompt=${promptIds.length} tokens`);

// Warmup — 1 forward pass through prompt + 4 decoded tokens. JIT + any lazy
// CUDA kernel compilation finishes here so the timed pass measures steady state.
for await (const _ of model.generate(PROMPT, { maxTokens: 4, temperature: 0 })) {
  /* drain */
}

// Prefill timing: measure just the prompt forward-pass phase. We inline the
// generate() flow to get a clean split between prefill and decode.
const kv = model.model.newKVCache();
const prefillStart = performance.now();
let logits;
for (let p = 0; p < promptIds.length; p++) {
  logits = model.model.forward(promptIds[p], p, kv);
}
const prefillMs = performance.now() - prefillStart;

// Decode timing: exactly MAX_TOKENS steps, greedy, no stop-token short-circuit.
// Two variants:
//   (a) full-logits DtoH + host argmax — preserves sampler.sample() API compat.
//   (b) forwardGreedy — argmax on device, only 4 bytes cross PCIe per step.
const sampler = new llm.Sampler({ temperature: 0 });
const decodeStart = performance.now();
let pos = promptIds.length;
let seed = sampler.sample(logits);
let logitsForSampling = logits;
for (let n = 0; n < MAX_TOKENS; n++) {
  logitsForSampling = model.model.forward(seed, pos++, kv);
  seed = sampler.sample(logitsForSampling);
}
const decodeMs = performance.now() - decodeStart;

// Fresh KV cache so forwardGreedy runs from the same start point as (a).
const kv2 = model.model.newKVCache();
let greedyLogits;
for (let p = 0; p < promptIds.length; p++) {
  greedyLogits = model.model.forward(promptIds[p], p, kv2);
}
let greedyTok = sampler.sample(greedyLogits);
const greedyStart = performance.now();
let gpos = promptIds.length;
for (let n = 0; n < MAX_TOKENS; n++) {
  greedyTok = model.model.forwardGreedy(greedyTok, gpos++, kv2);
}
const greedyMs = performance.now() - greedyStart;

const prefillTps = (promptIds.length / prefillMs) * 1000;
const decodeTps = (MAX_TOKENS / decodeMs) * 1000;
const greedyTps = (MAX_TOKENS / greedyMs) * 1000;
console.log(
  `parabun: prefill ${promptIds.length}/${prefillMs.toFixed(0)}ms = ${prefillTps.toFixed(1)} tok/s | ` +
    `decode(DtoH) ${MAX_TOKENS}/${decodeMs.toFixed(0)}ms = ${decodeTps.toFixed(1)} tok/s | ` +
    `decode(greedy) ${MAX_TOKENS}/${greedyMs.toFixed(0)}ms = ${greedyTps.toFixed(1)} tok/s`,
);

model.dispose();
