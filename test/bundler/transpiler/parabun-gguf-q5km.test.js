import { beforeAll, describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";

// Q5_K_M adds 5-bit K-quant support on top of Q4_K_M's Q4_K/Q6_K mix.
// Same validation approach: dequant plausibility + end-to-end Paris
// greedy continuation. A 1-bit error in the qh packing produces garbage
// pretty reliably.
const FIXTURE = "/rigil/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q5_K_M.gguf";
const HAS_FIXTURE = existsSync(FIXTURE);

describe.if(HAS_FIXTURE)("GGUF loader (Llama-3.2-1B Q5_K_M)", () => {
  let llm;
  let f;

  beforeAll(async () => {
    llm = (await import("parabun:llm")).default;
    f = await llm.loadGGUF(FIXTURE);
  }, 60_000);

  it("parses Q5_K_M metadata", () => {
    expect(f.version).toBe(3);
    expect(f.metadata.get("general.architecture")).toBe("llama");
    expect(f.metadata.get("llama.block_count")).toBe(16);
    expect(f.metadata.get("general.file_type")).toBe(17); // LLAMA_FTYPE_MOSTLY_Q5_K_M
  });

  it("surfaces Q5_K tensor types", () => {
    // In Q5_K_M, attention projections and most ffn tensors are Q5_K.
    const attnQ = f.tensors.get("blk.0.attn_q.weight");
    expect(attnQ.type).toBe(llm.GGML_TYPE_Q5_K);
  });

  it("dequants a Q5_K tensor to plausible fp32 weights", () => {
    const w = f.tensorF32("blk.0.attn_q.weight");
    expect(w).toBeInstanceOf(Float32Array);
    expect(w.length).toBe(2048 * 2048);
    let maxAbs = 0;
    for (let i = 0; i < 10000; i++) {
      const v = w[i];
      expect(Number.isFinite(v)).toBe(true);
      if (Math.abs(v) > maxAbs) maxAbs = Math.abs(v);
    }
    expect(maxAbs).toBeGreaterThan(0);
    expect(maxAbs).toBeLessThan(10);
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

describe.if(HAS_FIXTURE)("Q5_K_M end-to-end (Llama-3.2-1B)", () => {
  let model;

  beforeAll(async () => {
    const llm = (await import("parabun:llm")).default;
    model = await llm.LLM.load(FIXTURE);
  }, 180_000);

  it("greedy-continues 'capital of France' with 'Paris'", async () => {
    const out = await model.complete("The capital of France is", { maxTokens: 5 });
    expect(out).toContain("Paris");
  }, 120_000);
});

describe.if(!HAS_FIXTURE)("GGUF loader (Q5_K_M)", () => {
  it.skip(`skipped: fixture missing (${FIXTURE})`, () => {});
});
