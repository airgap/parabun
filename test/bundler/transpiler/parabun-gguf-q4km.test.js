import { beforeAll, describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";

// Q4_K_M fixture exercises both Q4_K (most weights) and Q6_K (token_embd +
// a handful of output projections). Unlike Q8_0 there's no public in-repo
// oracle — so we rely on two cheap-but-strong sanity checks here:
//   1. Every dequanted element is finite and within plausible range for a
//      trained Llama (weights are O(1e-1) max).
//   2. End-to-end greedy continuation of "capital of France" still yields
//      "Paris". A single-bit mistake in the 6-bit scale unpack or the
//      nibble ordering produces pure garbage, so this is a tight oracle.
const FIXTURE = "/rigil/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q4_K_M.gguf";
const HAS_FIXTURE = existsSync(FIXTURE);

describe.if(HAS_FIXTURE)("GGUF loader (Llama-3.2-1B Q4_K_M)", () => {
  let llm;
  let f;

  beforeAll(async () => {
    llm = (await import("para:llm")).default;
    f = await llm.loadGGUF(FIXTURE);
  }, 60_000);

  it("parses Q4_K_M metadata matching Q8_0 architecture", () => {
    expect(f.version).toBe(3);
    expect(f.metadata.get("general.architecture")).toBe("llama");
    expect(f.metadata.get("llama.block_count")).toBe(16);
    expect(f.metadata.get("general.file_type")).toBe(15); // LLAMA_FTYPE_MOSTLY_Q4_K_M
  });

  it("surfaces Q4_K and Q6_K tensor types", () => {
    // Q4_K_M keeps token_embd at higher precision (Q6_K). Everything else
    // that isn't a norm scalar is Q4_K.
    const tokEmbd = f.tensors.get("token_embd.weight");
    expect(tokEmbd.type).toBe(llm.GGML_TYPE_Q6_K);

    const ffnDown = f.tensors.get("blk.0.ffn_down.weight");
    expect([llm.GGML_TYPE_Q4_K, llm.GGML_TYPE_Q6_K]).toContain(ffnDown.type);
  });

  it("dequants a Q4_K tensor to plausible fp32 weights", () => {
    // Pick a guaranteed-Q4_K tensor (attention projections are all Q4_K).
    const w = f.tensorF32("blk.0.attn_q.weight");
    expect(w).toBeInstanceOf(Float32Array);
    expect(w.length).toBe(2048 * 2048);
    let maxAbs = 0;
    for (let i = 0; i < 10000; i++) {
      const v = w[i];
      expect(Number.isFinite(v)).toBe(true);
      if (Math.abs(v) > maxAbs) maxAbs = Math.abs(v);
    }
    // Trained Llama-3 attention weights sit well below 1.0 in magnitude.
    expect(maxAbs).toBeGreaterThan(0);
    expect(maxAbs).toBeLessThan(10);
  });

  it("dequants a Q6_K tensor to plausible fp32 weights", () => {
    const emb = f.tensorF32("token_embd.weight");
    expect(emb.length).toBe(2048 * 128256);
    let maxAbs = 0;
    for (let i = 0; i < 10000; i++) {
      const v = emb[i];
      expect(Number.isFinite(v)).toBe(true);
      if (Math.abs(v) > maxAbs) maxAbs = Math.abs(v);
    }
    expect(maxAbs).toBeGreaterThan(0);
    expect(maxAbs).toBeLessThan(1);
  });

  it("dequant is bit-exact across two independent loads", async () => {
    const b = await llm.loadGGUF(FIXTURE);
    const ea = f.tensorF32("blk.5.ffn_down.weight").slice(0, 4096);
    const eb = b.tensorF32("blk.5.ffn_down.weight").slice(0, 4096);
    expect(Buffer.from(ea.buffer, ea.byteOffset, ea.byteLength)).toEqual(
      Buffer.from(eb.buffer, eb.byteOffset, eb.byteLength),
    );
  }, 60_000);
});

describe.if(HAS_FIXTURE)("Q4_K_M end-to-end (Llama-3.2-1B)", () => {
  let model;

  beforeAll(async () => {
    const llm = (await import("para:llm")).default;
    model = await llm.LLM.load(FIXTURE);
  }, 180_000);

  it("greedy-continues 'capital of France' with 'Paris'", async () => {
    const out = await model.complete("The capital of France is", { maxTokens: 5 });
    expect(out).toContain("Paris");
  }, 120_000);
});

describe.if(!HAS_FIXTURE)("GGUF loader (Q4_K_M)", () => {
  it.skip(`skipped: fixture missing (${FIXTURE})`, () => {});
});
