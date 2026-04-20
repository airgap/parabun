import { beforeAll, describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";

// High-level `bun:llm` surface test. Validates that LLM.load + generate /
// complete round-trip a known factual prompt. Lower-level pieces (GGUF
// loader, tokenizer, forward pass) have their own tests — this one only
// exercises the wrapping surface.
const FIXTURE = "/rigil/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q8_0.gguf";
const HAS_FIXTURE = existsSync(FIXTURE);

describe.if(HAS_FIXTURE)("bun:llm high-level surface", () => {
  let LLM;
  let model;

  beforeAll(async () => {
    const llm = (await import("bun:llm")).default;
    LLM = llm.LLM;
    model = await LLM.load(FIXTURE);
  }, 180_000);

  it("exposes model + tokenizer", () => {
    expect(model.model).toBeDefined();
    expect(model.tokenizer).toBeDefined();
    expect(model.tokenizer.bos).toBe(128000);
    expect(model.tokenizer.eos).toBe(128009);
  });

  it("complete() produces the expected continuation", async () => {
    const out = await model.complete("The capital of France is", { maxTokens: 5 });
    expect(out).toContain("Paris");
  }, 120_000);

  it("generate() streams token chunks", async () => {
    const chunks = [];
    for await (const chunk of model.generate("The capital of France is", { maxTokens: 3 })) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.length).toBeLessThanOrEqual(3);
    // First chunk should be the " Paris" piece.
    expect(chunks[0].trim()).toBe("Paris");
  }, 120_000);

  it("respects stopTokens", async () => {
    // Arbitrary stop token: 13 = "." — the first period the model emits
    // after "Paris" should terminate generation before maxTokens.
    const out = await model.complete("The capital of France is", {
      maxTokens: 20,
      stopTokens: [13],
    });
    expect(out).not.toContain(".");
    expect(out.length).toBeGreaterThan(0);
  }, 120_000);
});

describe.if(!HAS_FIXTURE)("bun:llm high-level surface", () => {
  it.skip(`skipped: fixture missing (${FIXTURE})`, () => {});
});
