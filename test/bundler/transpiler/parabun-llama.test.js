import { beforeAll, describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";

// End-to-end correctness anchor for the Llama-3 forward pass. Without
// llama-cli installed locally we can't do a byte-exact logit comparison, so
// this test relies on two things:
//   1. Greedy (temp=0) continuation of a well-known factual prompt produces
//      the expected words. "Capital of France" → "Paris" is robust across
//      tokenizers/quants and fails loudly if anything is wrong with RoPE,
//      attention, FFN, or lm_head wiring.
//   2. A pinned token sequence via toMatchSnapshot() locks in the exact
//      trajectory — any regression (bad merge, off-by-one pos, wrong head
//      grouping) surfaces immediately.
//
// When we get a real oracle (llama-cli), swap the snapshot for a comparison
// against the oracle's token stream at temperature 0.
const FIXTURE = "/rigil/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q8_0.gguf";
const HAS_FIXTURE = existsSync(FIXTURE);

describe.if(HAS_FIXTURE)("Llama-3.2-1B forward pass", () => {
  let model;
  let tok;
  let argmax;

  beforeAll(async () => {
    const llm = (await import("parabun:llm")).default;
    const f = await llm.loadGGUF(FIXTURE);
    model = llm.llamaFromGGUF(f);
    tok = llm.tokenizerFromGGUF(f);
    argmax = llm.argmax;
  }, 180_000);

  it("exposes config matching GGUF metadata", () => {
    expect(model.cfg).toEqual({
      nLayer: 16,
      dModel: 2048,
      dFfn: 8192,
      nHead: 32,
      nKvHead: 8,
      headDim: 64,
      vocabSize: 128256,
      ropeDim: 64,
      ropeFreqBase: 500000,
      ropeMode: "norm",
      rmsEps: 0.000009999999747378752,
      maxContext: 2048,
    });
  });

  it("produces logits of the right shape", () => {
    const kv = model.newKVCache();
    const logits = model.forward(128000, 0, kv); // BOS
    expect(logits).toBeInstanceOf(Float32Array);
    expect(logits.length).toBe(128256);
    let finite = true;
    for (let i = 0; i < logits.length; i++) {
      if (!Number.isFinite(logits[i])) {
        finite = false;
        break;
      }
    }
    expect(finite).toBe(true);
  }, 60_000);

  it("greedy-continues 'capital of France' with 'Paris'", () => {
    const kv = model.newKVCache();
    const ids = tok.encode("The capital of France is");
    let lastLogits;
    for (let p = 0; p < ids.length; p++) {
      lastLogits = model.forward(ids[p], p, kv);
    }
    const nextId = argmax(lastLogits);
    // The exact token depends on the tokenizer's BPE for " Paris" — with BOS
    // context, Llama-3.2-1B-Instruct Q8_0 picks token 12366 (" Paris").
    expect(tok.decode([nextId]).trim()).toBe("Paris");
  }, 120_000);

  it("greedy-generates a stable sequence for 'capital of France'", () => {
    const kv = model.newKVCache();
    const promptIds = tok.encode("The capital of France is");
    let logits;
    for (let p = 0; p < promptIds.length; p++) {
      logits = model.forward(promptIds[p], p, kv);
    }
    const generated = [];
    let cur = argmax(logits);
    for (let k = 0; k < 5; k++) {
      generated.push(cur);
      logits = model.forward(cur, promptIds.length + k, kv);
      cur = argmax(logits);
    }
    generated.push(cur);

    // Pin the trajectory. Regenerate when we swap in a real oracle.
    expect(generated).toMatchSnapshot("greedy-ids");
    expect(tok.decode(generated)).toMatchSnapshot("greedy-text");
  }, 180_000);
});

describe.if(!HAS_FIXTURE)("Llama-3.2-1B forward pass", () => {
  it.skip(`skipped: fixture missing (${FIXTURE})`, () => {});
});
