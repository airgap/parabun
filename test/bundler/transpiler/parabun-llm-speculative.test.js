import { beforeAll, describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";

// Speculative decoding (Leviathan et al.). The strongest correctness
// check we can run with a single fixture is "self-spec": using the
// same model as both target and draft means p == q at every step, so
// every proposal MUST be accepted and the output must match plain
// greedy generation token-for-token. This validates both the math
// (accept prob min(1, p/q)) and the KV bookkeeping (draft/target both
// advance through the same tokens each round).
const FIXTURE = "/rigil/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q8_0.gguf";
const HAS_FIXTURE = existsSync(FIXTURE);

describe.if(HAS_FIXTURE)("parabun:llm speculative decoding", () => {
  let llm;
  let target;
  let draft;

  beforeAll(async () => {
    llm = (await import("parabun:llm")).default;
    target = await llm.LLM.load(FIXTURE);
    draft = await llm.LLM.load(FIXTURE);
  }, 240_000);

  it("self-spec with greedy matches plain greedy token-for-token", async () => {
    const prompt = "Q: What is the capital of France?\nA:";
    const opts = { maxTokens: 8, seed: 1, temperature: 0 };

    const plain = await target.complete(prompt, opts);
    const spec = await target.complete(prompt, { ...opts, draft, speculativeK: 4 });

    expect(spec).toBe(plain);
    expect(plain).toContain("Paris");
  }, 240_000);

  it("is deterministic across runs with a stochastic temperature", async () => {
    const opts = { maxTokens: 6, seed: 42, temperature: 0.7, draft, speculativeK: 4 };
    const a = await target.complete("Once upon a time", opts);
    const b = await target.complete("Once upon a time", opts);
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(0);
  }, 240_000);

  it("larger speculativeK still produces greedy-equivalent output under self-spec", async () => {
    const prompt = "2 + 2 =";
    const opts = { maxTokens: 3, seed: 0, temperature: 0 };

    const plain = await target.complete(prompt, opts);
    const k1 = await target.complete(prompt, { ...opts, draft, speculativeK: 1 });
    const k8 = await target.complete(prompt, { ...opts, draft, speculativeK: 8 });

    expect(k1).toBe(plain);
    expect(k8).toBe(plain);
  }, 240_000);

  it("rejects incompatible option combinations", async () => {
    const base = { maxTokens: 1, temperature: 0, draft };
    await expect(
      (async () => {
        for await (const _ of target.generate("hi", { ...base, grammar: `root ::= "yes"` })) {
          // consume
        }
      })(),
    ).rejects.toThrow(/not yet supported/);

    await expect(
      (async () => {
        for await (const _ of target.generate("hi", { ...base, schema: { type: "string" } })) {
          // consume
        }
      })(),
    ).rejects.toThrow(/not yet supported/);

    await expect(
      (async () => {
        for await (const _ of target.generate("hi", { ...base, logitBias: { 0: -1 } })) {
          // consume
        }
      })(),
    ).rejects.toThrow(/not yet supported/);

    await expect(
      (async () => {
        for await (const _ of target.generate("hi", { ...base, topK: 10 })) {
          // consume
        }
      })(),
    ).rejects.toThrow(/not yet supported/);
  }, 120_000);

  it("validates speculativeK", async () => {
    await expect(
      (async () => {
        for await (const _ of target.generate("hi", { maxTokens: 1, draft, speculativeK: 0 })) {
          // consume
        }
      })(),
    ).rejects.toThrow(/positive integer/);

    await expect(
      (async () => {
        for await (const _ of target.generate("hi", { maxTokens: 1, draft, speculativeK: 1.5 })) {
          // consume
        }
      })(),
    ).rejects.toThrow(/positive integer/);
  }, 120_000);
});

describe.if(!HAS_FIXTURE)("parabun:llm speculative decoding", () => {
  it.skip(`skipped: fixture missing (${FIXTURE})`, () => {});
});
