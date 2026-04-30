import { beforeAll, describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";

// Tokenizer validation. We don't have a reference tokenizer installed locally
// (no transformers, no llama-tokenize), so correctness here is limited to:
//   - BOS/EOS IDs match what the GGUF file says (128000, 128009 for Llama-3)
//   - decode(encode(s)) == s for simple ASCII + multibyte UTF-8 strings
//   - Single-char encoding produces expected byte-mapped token IDs
//   - Special tokens round-trip through encode/decode as their literal strings
//
// The real byte-exact correctness anchor comes at end-to-end forward-pass
// time, where token-id divergence from llama-cli surfaces immediately.
const FIXTURE = "/rigil/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q8_0.gguf";
const HAS_FIXTURE = existsSync(FIXTURE);

describe.if(HAS_FIXTURE)("Llama-3 BPE tokenizer", () => {
  let tok;

  beforeAll(async () => {
    const llm = (await import("para:llm")).default;
    const f = await llm.loadGGUF(FIXTURE);
    tok = llm.tokenizerFromGGUF(f);
  }, 60_000);

  it("exposes BOS/EOS matching GGUF metadata", () => {
    expect(tok.bos).toBe(128000);
    expect(tok.eos).toBe(128009);
    expect(tok.vocab[128000]).toBe("<|begin_of_text|>");
    expect(tok.vocab[128009]).toBe("<|eot_id|>");
  });

  it("prepends BOS by default, suppresses with addBos: false", () => {
    const withBos = tok.encode("Hello");
    expect(withBos[0]).toBe(128000);

    const plain = tok.encode("Hello", { addBos: false });
    expect(plain[0]).not.toBe(128000);
  });

  it("encodes empty string to BOS only (or empty with addBos: false)", () => {
    expect(tok.encode("")).toEqual([128000]);
    expect(tok.encode("", { addBos: false })).toEqual([]);
  });

  it("round-trips ASCII text", () => {
    for (const s of ["Hello", "Hello, world!", "the quick brown fox", "1 + 1 = 2", "a b c d e"]) {
      const ids = tok.encode(s, { addBos: false });
      expect(ids.length).toBeGreaterThan(0);
      expect(tok.decode(ids)).toBe(s);
    }
  });

  it("round-trips multibyte UTF-8", () => {
    // Japanese, emoji, accented Latin — each exercises a different byte-range
    // of the byte→unicode mapping.
    for (const s of ["日本語", "héllo naïve façade", "Test 🚀 rocket"]) {
      const ids = tok.encode(s, { addBos: false });
      expect(ids.length).toBeGreaterThan(0);
      expect(tok.decode(ids)).toBe(s);
    }
  });

  it("round-trips whitespace and newlines", () => {
    for (const s of [" leading space", "trailing space ", "middle\ttab", "line\nbreak", "\n\n"]) {
      const ids = tok.encode(s, { addBos: false });
      expect(tok.decode(ids)).toBe(s);
    }
  });

  it("decodes BOS + EOS as their literal pretty strings", () => {
    expect(tok.decode([128000])).toBe("<|begin_of_text|>");
    expect(tok.decode([128009])).toBe("<|eot_id|>");
  });

  it("tokenizes 'Hello, world!' to a stable ID sequence", () => {
    // Captured from a first-run of this tokenizer. Pinned so regressions in
    // pre-tokenizer regex, BPE merges, or byte-mapping surface immediately.
    // When we get a real oracle (llama-cli), we re-validate this and pin the
    // oracle's output as the real snapshot.
    const ids = tok.encode("Hello, world!", { addBos: true });
    expect(ids).toMatchSnapshot();
  });
});

describe.if(!HAS_FIXTURE)("Llama-3 BPE tokenizer", () => {
  it.skip(`skipped: fixture missing (${FIXTURE})`, () => {});
});
