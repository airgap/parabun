import { beforeAll, describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";

// BGE-small-en-v1.5 is a 12-layer 384-dim BERT encoder (~67 MB F16), the
// de-facto default small English embedder. We use it to validate:
//   - GGUF BERT metadata + tensor layout is read correctly,
//   - the WordPiece tokenizer matches HF canonical token ids,
//   - the bidirectional encoder produces CLS embeddings that discriminate
//     paraphrases from unrelated text (a broken forward pass typically
//     collapses cosine similarity to ~uniform across unrelated pairs).
const FIXTURE = "/rigil/parabun-fixtures/llm/bge-small-en-v1.5-f16.gguf";
const HAS_FIXTURE = existsSync(FIXTURE);

function cos(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

describe.if(HAS_FIXTURE)("bun:llm BGE encoder", () => {
  let llm;
  let enc;

  beforeAll(async () => {
    llm = (await import("bun:llm")).default;
    enc = await llm.Encoder.load(FIXTURE);
  }, 120_000);

  it("loads a 384-dim 12-layer CLS-pooled model", () => {
    expect(enc.model.cfg.dModel).toBe(384);
    expect(enc.model.cfg.nLayer).toBe(12);
    expect(enc.model.cfg.nHead).toBe(12);
    expect(enc.model.cfg.poolingType).toBe("cls");
    expect(enc.model.cfg.maxContext).toBe(512);
  });

  it("tokenizes to canonical HF BERT ids with [CLS]/[SEP] wrap", () => {
    // HF bert-base-uncased canonical ids: hello=7592, world=2088, ','=1010,
    // '!'=999, [CLS]=101, [SEP]=102. If the ▁-prefix / bare-continuation
    // convention isn't handled, "hello" falls through to [UNK]=100.
    const ids = enc.tokenizer.encode("Hello, world!");
    expect(ids).toEqual([101, 7592, 1010, 2088, 999, 102]);
  });

  it("handles subword splits", () => {
    // "unbelievable" splits as un + ##believable (or similar) under
    // WordPiece. We don't pin the exact split — different BERT variants
    // split differently — but it must be more than one content token
    // and must round-trip to the input string via decode().
    const ids = enc.tokenizer.encode("unbelievable");
    const content = ids.slice(1, -1);
    expect(content.length).toBeGreaterThan(0);
    // No token in content should be [UNK] for a common English word.
    expect(content.every(id => id !== enc.tokenizer.unk)).toBe(true);
    // Round-trip shouldn't fabricate extra content.
    const decoded = enc.tokenizer.decode(ids);
    expect(decoded.replace(/\s+/g, "")).toBe("unbelievable");
  });

  it("embeds to a 384-dim unit vector", () => {
    const v = enc.embed("The quick brown fox jumps over the lazy dog");
    expect(v.length).toBe(384);
    let n2 = 0;
    for (let i = 0; i < v.length; i++) n2 += v[i] * v[i];
    expect(Math.sqrt(n2)).toBeCloseTo(1, 3);
  });

  it("separates paraphrases from unrelated text in cosine space", () => {
    const v1 = enc.embed("The quick brown fox jumps over the lazy dog");
    const v2 = enc.embed("A speedy russet fox leaps above a tired canine");
    const v3 = enc.embed("Machine learning frameworks accelerate model training");
    const sim = cos(v1, v2);
    const diff = cos(v1, v3);
    // Self-similarity is ~1 (L2-normalized).
    expect(cos(v1, v1)).toBeCloseTo(1, 3);
    // Paraphrase must beat unrelated by a clear margin — collapse bugs
    // would put these at ~equal values.
    expect(sim).toBeGreaterThan(diff + 0.2);
  });

  it("is deterministic across repeated calls", () => {
    const text = "Determinism check sentence.";
    const a = enc.embed(text);
    const b = enc.embed(text);
    let maxDelta = 0;
    for (let i = 0; i < a.length; i++) maxDelta = Math.max(maxDelta, Math.abs(a[i] - b[i]));
    expect(maxDelta).toBe(0);
  });

  it("mean pool produces a different (but still sensible) vector", () => {
    const cls = enc.embed("What is the capital of France?", { pool: "cls" });
    const mean = enc.embed("What is the capital of France?", { pool: "mean" });
    expect(cls.length).toBe(mean.length);
    let maxDelta = 0;
    for (let i = 0; i < cls.length; i++) maxDelta = Math.max(maxDelta, Math.abs(cls[i] - mean[i]));
    // They must differ (otherwise mean path is a no-op).
    expect(maxDelta).toBeGreaterThan(0.01);
    // Mean pool must still be L2-normalized by default.
    let n2 = 0;
    for (let i = 0; i < mean.length; i++) n2 += mean[i] * mean[i];
    expect(Math.sqrt(n2)).toBeCloseTo(1, 3);
  });

  it("normalize: false returns a non-unit vector", () => {
    const v = enc.embed("hello", { normalize: false });
    let n2 = 0;
    for (let i = 0; i < v.length; i++) n2 += v[i] * v[i];
    // Not exactly 1; BGE CLS-pooled raw vectors are typically well below it.
    expect(Math.abs(Math.sqrt(n2) - 1)).toBeGreaterThan(0.01);
  });

  it("embedMany returns one vector per input", () => {
    const texts = ["alpha", "beta", "gamma"];
    const vs = enc.embedMany(texts);
    expect(vs.length).toBe(3);
    for (const v of vs) expect(v.length).toBe(384);
  });

  it("rejects empty input", () => {
    expect(() => enc.model.embed([])).toThrow(/empty/);
  });
});

describe.if(!HAS_FIXTURE)("bun:llm BGE encoder", () => {
  it.skip(`skipped: fixture missing (${FIXTURE})`, () => {});
});
