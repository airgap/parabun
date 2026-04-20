import { beforeAll, describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";

// Qwen2 end-to-end. The 0.5B-Instruct Q8_0 fixture exercises the non-Llama
// code paths: qwen2.* metadata keys, NEOX-mode RoPE, attn_{q,k,v}.bias terms,
// ChatML chat template, and the qwen2 pre-tokenizer regex. A Llama-shaped
// forward pass on this model would produce garbage immediately, so the
// "capital of France → Paris" oracle is tight — any of those paths being
// wrong would break the test.
const FIXTURE = "/rigil/parabun-fixtures/llm/Qwen2.5-0.5B-Instruct-Q8_0.gguf";
const HAS_FIXTURE = existsSync(FIXTURE);

describe.if(HAS_FIXTURE)("bun:llm Qwen2 (Qwen2.5-0.5B-Instruct)", () => {
  let llm;
  let file;
  let model;

  beforeAll(async () => {
    llm = (await import("bun:llm")).default;
    file = await llm.loadGGUF(FIXTURE);
    model = await llm.LLM.load(FIXTURE);
  }, 180_000);

  it("reports qwen2 architecture and qwen2 pre-tokenizer", () => {
    expect(file.string("general.architecture")).toBe("qwen2");
    expect(file.string("tokenizer.ggml.pre")).toBe("qwen2");
  });

  it("carries attn_{q,k,v}.bias tensors (non-Llama signature)", () => {
    const bq = file.tensors.get("blk.0.attn_q.bias");
    const bk = file.tensors.get("blk.0.attn_k.bias");
    const bv = file.tensors.get("blk.0.attn_v.bias");
    expect(bq).toBeDefined();
    expect(bk).toBeDefined();
    expect(bv).toBeDefined();
  });

  it("detects ChatML chat template (Qwen2 uses ChatML framing)", () => {
    expect(model.chatTemplate).toBe("chatml");
  });

  it("encodeChat emits ChatML framing", () => {
    const ids = model.encodeChat([
      { role: "system", content: "You are helpful." },
      { role: "user", content: "Hi" },
    ]);
    const decoded = model.tokenizer.decode(ids);
    expect(decoded).toContain("<|im_start|>system");
    expect(decoded).toContain("You are helpful.");
    expect(decoded).toContain("<|im_start|>user");
    expect(decoded).toContain("Hi");
    expect(decoded).toContain("<|im_end|>");
    expect(decoded.endsWith("<|im_start|>assistant\n")).toBe(true);
  });

  it("chatComplete answers a factual question", async () => {
    const out = await model.chatComplete(
      [{ role: "user", content: "What is the capital of France? Answer in one word." }],
      { maxTokens: 20, temperature: 0 },
    );
    expect(out).toContain("Paris");
  }, 240_000);

  it("auto stop tokens suppress <|im_end|> in output", async () => {
    const out = await model.chatComplete([{ role: "user", content: "Say only the word: yes" }], {
      maxTokens: 200,
      temperature: 0,
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out).not.toContain("<|im_end|>");
    expect(out).not.toContain("<|endoftext|>");
  }, 240_000);
});

describe.if(!HAS_FIXTURE)("bun:llm Qwen2", () => {
  it.skip(`skipped: fixture missing (${FIXTURE})`, () => {});
});
