import { beforeAll, describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";

// v0 loader test. The fixture is 1.3 GB and lives on a local fast disk outside
// the repo — we skip when absent so CI without the model still passes.
const FIXTURE = "/rigil/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q8_0.gguf";
const HAS_FIXTURE = existsSync(FIXTURE);

// Debug + ASAN builds are slow when decoding the 128k-entry tokenizer vocab
// (string copies for every token). One-shot parse across the whole describe
// keeps the test wall-time bounded; each `it` just reads off the shared
// GGUFFile instance. Allocating a fresh one for the bit-exact-across-loads
// case on purpose.
describe.if(HAS_FIXTURE)("GGUF loader (Llama-3.2-1B Q8_0)", () => {
  let llm;
  let f;

  beforeAll(async () => {
    llm = (await import("parabun:llm")).default;
    f = await llm.loadGGUF(FIXTURE);
  }, 60_000);

  it("parses header + metadata + tensor info", () => {
    expect(f.version).toBe(3);
    expect(f.alignment).toBe(32);
    expect(f.metadata.get("general.architecture")).toBe("llama");
    expect(f.metadata.get("llama.block_count")).toBe(16);
    expect(f.metadata.get("llama.attention.head_count")).toBe(32);
    expect(f.metadata.get("llama.embedding_length")).toBe(2048);
    expect(f.tensors.size).toBe(147);

    const tokens = f.metadata.get("tokenizer.ggml.tokens");
    expect(Array.isArray(tokens)).toBe(true);
    expect(tokens.length).toBe(128256);
  });

  it("enumerates tensors with expected shapes", () => {
    const tok = f.tensors.get("token_embd.weight");
    expect(tok.dims).toEqual([2048, 128256]); // [embed, vocab] — GGUF layout
    expect(tok.type).toBe(8); // GGML_TYPE_Q8_0

    const attnNorm = f.tensors.get("blk.0.attn_norm.weight");
    expect(attnNorm.dims).toEqual([2048]);
    expect(attnNorm.type).toBe(0); // GGML_TYPE_F32

    // Every layer has the same set of per-block tensors — spot-check one.
    const perBlock = [...f.tensors.keys()].filter(n => n.startsWith("blk.0."));
    expect(perBlock.length).toBeGreaterThan(8);
  });

  it("reads F32 norm weights as a direct mmap view", () => {
    const norm = f.tensorF32("blk.0.attn_norm.weight");
    expect(norm).toBeInstanceOf(Float32Array);
    expect(norm.length).toBe(2048);
    // RMSNorm weights are ~O(0.1) in magnitude for trained Llama models.
    // Testing for non-garbage (all finite, non-zero variance) rather than an
    // exact reference — the real correctness anchor is the forward-pass
    // top-1 match against llama-cli, which comes later.
    let sum = 0;
    let sumSq = 0;
    for (const v of norm) {
      expect(Number.isFinite(v)).toBe(true);
      sum += v;
      sumSq += v * v;
    }
    const mean = sum / norm.length;
    const variance = sumSq / norm.length - mean * mean;
    expect(variance).toBeGreaterThan(1e-6);
  });

  it("dequants Q8_0 token_embd to fp32 with deterministic output", () => {
    const emb1 = f.tensorF32("token_embd.weight");
    expect(emb1.length).toBe(2048 * 128256);

    // Cache hit on second call returns the same array (identity, not a copy).
    const emb2 = f.tensorF32("token_embd.weight");
    expect(emb2).toBe(emb1);

    // All finite, plausibly-scaled (Llama-3 embeddings are O(0.01–0.1)).
    let maxAbs = 0;
    for (let i = 0; i < 10000; i++) {
      const v = emb1[i];
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

  it("rejects malformed headers with a readable error", () => {
    const { GGUFFile } = llm;

    // Valid magic, bogus version.
    const wrongVersion = new Uint8Array(32);
    wrongVersion[0] = 0x47; // "G"
    wrongVersion[1] = 0x47;
    wrongVersion[2] = 0x55;
    wrongVersion[3] = 0x46; // "F"
    wrongVersion[4] = 99;
    expect(() => new GGUFFile(wrongVersion)).toThrow(/unsupported GGUF version 99/);

    // Wrong magic entirely.
    expect(() => new GGUFFile(new Uint8Array(32))).toThrow(/not a GGUF file/);
  });
});

describe.if(!HAS_FIXTURE)("GGUF loader", () => {
  it.skip(`skipped: fixture missing (${FIXTURE})`, () => {});
});
