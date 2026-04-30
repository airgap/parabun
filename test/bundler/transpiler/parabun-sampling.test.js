import { beforeAll, describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";

// Sampling behavior — tested in two parts. First, the pure-JS Sampler with
// synthetic logits (no model needed, always runs). Then end-to-end against
// the Llama fixture if present.
const FIXTURE = "/rigil/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q8_0.gguf";
const HAS_FIXTURE = existsSync(FIXTURE);

describe("para:llm Sampler (synthetic)", () => {
  let llm;

  beforeAll(async () => {
    llm = (await import("para:llm")).default;
  });

  it("temperature=0 is deterministic argmax", () => {
    const logits = new Float32Array([0.1, 2.5, -1.0, 2.4]);
    const s = new llm.Sampler({ temperature: 0 });
    expect(s.sample(logits)).toBe(1);
    // Repeated calls yield the same token.
    for (let i = 0; i < 5; i++) expect(s.sample(logits)).toBe(1);
  });

  it("temperature=0 ignores topK/topP (still argmax)", () => {
    const logits = new Float32Array([5, 1, 1, 1]);
    const s = new llm.Sampler({ temperature: 0, topK: 2, topP: 0.9 });
    expect(s.sample(logits)).toBe(0);
  });

  it("seeded sampler is reproducible across two runs", () => {
    const logits = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]);
    const a = new llm.Sampler({ temperature: 1.0, seed: 42 });
    const b = new llm.Sampler({ temperature: 1.0, seed: 42 });
    for (let i = 0; i < 20; i++) {
      expect(a.sample(logits)).toBe(b.sample(logits));
    }
  });

  it("different seeds diverge", () => {
    const logits = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]);
    const a = new llm.Sampler({ temperature: 1.0, seed: 1 });
    const b = new llm.Sampler({ temperature: 1.0, seed: 2 });
    let diverged = false;
    for (let i = 0; i < 50; i++) {
      if (a.sample(logits) !== b.sample(logits)) {
        diverged = true;
        break;
      }
    }
    expect(diverged).toBe(true);
  });

  it("topK=1 collapses to argmax even at high temperature", () => {
    const logits = new Float32Array([0.1, 5.0, 0.2, 0.3]);
    const s = new llm.Sampler({ temperature: 2.0, topK: 1, seed: 7 });
    for (let i = 0; i < 10; i++) expect(s.sample(logits)).toBe(1);
  });

  it("topK respects the top-K subset", () => {
    // 4 strong candidates, 4 negative-infinity-like duds. topK=4 should
    // never draw a dud.
    const logits = new Float32Array([1.0, 1.1, 1.2, 1.3, -100, -100, -100, -100]);
    const s = new llm.Sampler({ temperature: 1.0, topK: 4, seed: 123 });
    for (let i = 0; i < 200; i++) {
      expect(s.sample(logits)).toBeLessThan(4);
    }
  });

  it("topP respects the nucleus", () => {
    // token 0 has ~99% mass, everyone else is near-zero. topP=0.5 keeps
    // just token 0.
    const logits = new Float32Array([10, 0, 0, 0, 0]);
    const s = new llm.Sampler({ temperature: 1.0, topP: 0.5, seed: 9 });
    for (let i = 0; i < 200; i++) expect(s.sample(logits)).toBe(0);
  });

  it("one-shot sample() matches a fresh Sampler(seed)", () => {
    const logits = new Float32Array([0.1, 0.2, 0.3, 0.4]);
    const a = llm.sample(logits, { temperature: 1.0, seed: 99 });
    const b = new llm.Sampler({ temperature: 1.0, seed: 99 }).sample(logits);
    expect(a).toBe(b);
  });
});

describe.if(HAS_FIXTURE)("para:llm sampling end-to-end", () => {
  let model;

  beforeAll(async () => {
    const llm = (await import("para:llm")).default;
    model = await llm.LLM.load(FIXTURE);
  }, 180_000);

  it("temperature=0 (greedy) still produces Paris", async () => {
    const out = await model.complete("The capital of France is", {
      maxTokens: 5,
      temperature: 0,
    });
    expect(out).toContain("Paris");
  }, 120_000);

  it("seeded sampling is reproducible across two runs", async () => {
    const opts = { maxTokens: 8, temperature: 0.8, topK: 40, topP: 0.95, seed: 1234, stopTokens: [] };
    const a = await model.complete("Once upon a time", opts);
    const b = await model.complete("Once upon a time", opts);
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(0);
  }, 240_000);

  it("different seeds produce different continuations", async () => {
    const base = { maxTokens: 12, temperature: 1.0, topK: 50, topP: 0.95, stopTokens: [] };
    const a = await model.complete("Once upon a time", { ...base, seed: 1 });
    const b = await model.complete("Once upon a time", { ...base, seed: 2 });
    // Not a strict guarantee at high temperature, but extremely likely with
    // vocab=128k and 12 tokens of sampling.
    expect(a).not.toBe(b);
  }, 240_000);
});

describe.if(!HAS_FIXTURE)("para:llm sampling end-to-end", () => {
  it.skip(`skipped: fixture missing (${FIXTURE})`, () => {});
});
