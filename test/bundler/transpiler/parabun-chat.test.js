import { beforeAll, describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";

// Chat template helper. Llama-3.2-Instruct embeds a Jinja2 chat template
// under tokenizer.chat_template — we don't parse it, just detect the family
// by string-sniff and emit the canonical Llama-3 framing from hand. Same
// validation discipline as other LLM tests: synthetic checks don't need
// the fixture, end-to-end does.
const FIXTURE = "/rigil/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q8_0.gguf";
const HAS_FIXTURE = existsSync(FIXTURE);

describe.if(HAS_FIXTURE)("bun:llm chat framing (Llama-3.2-1B)", () => {
  let llm;
  let model;

  beforeAll(async () => {
    llm = (await import("bun:llm")).default;
    model = await llm.LLM.load(FIXTURE);
  }, 180_000);

  it("detects the Llama-3 chat template", () => {
    expect(model.chatTemplate).toBe("llama3");
  });

  it("encodeChat emits the canonical Llama-3 framing", () => {
    const ids = model.encodeChat([
      { role: "system", content: "You are helpful." },
      { role: "user", content: "Hi" },
    ]);

    // Starts with BOS.
    expect(ids[0]).toBe(128000);

    const tok = model.tokenizer;
    const decoded = tok.decode(ids);
    // Must open with the header sequence, end with an assistant-header
    // that invites continuation, and contain both message bodies.
    expect(decoded).toContain("<|begin_of_text|>");
    expect(decoded).toContain("<|start_header_id|>system<|end_header_id|>");
    expect(decoded).toContain("You are helpful.");
    expect(decoded).toContain("<|start_header_id|>user<|end_header_id|>");
    expect(decoded).toContain("Hi");
    // Trailing open-header for assistant (model fills in the reply).
    expect(decoded.endsWith("<|start_header_id|>assistant<|end_header_id|>\n\n")).toBe(true);
    // EOT appears at least twice (after system, after user).
    const eotCount = (decoded.match(/<\|eot_id\|>/g) ?? []).length;
    expect(eotCount).toBe(2);
  });

  it("adds <|eot_id|> + <|end_of_text|> to the default stop set", async () => {
    // Chat a trivial question with a low token budget and no explicit
    // stopTokens — relying solely on the auto-detected stops. The reply
    // should terminate well before hitting maxTokens, and must not contain
    // <|eot_id|> or <|end_of_text|> in the text (because they stopped
    // generation rather than being emitted as chars).
    const out = await model.chatComplete([{ role: "user", content: "Say only the word: yes" }], {
      maxTokens: 200,
      temperature: 0,
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out).not.toContain("<|eot_id|>");
    expect(out).not.toContain("<|end_of_text|>");
    // Llama-3.2-Instruct with this prompt greedy-terminates well under 200 tokens.
    // (The actual exit is via stopSet hitting EOS/EOT, not by running the budget out.)
  }, 240_000);

  it("chatComplete answers a factual question", async () => {
    const out = await model.chatComplete(
      [{ role: "user", content: "What is the capital of France? Answer in one word." }],
      { maxTokens: 20, temperature: 0 },
    );
    expect(out).toContain("Paris");
  }, 240_000);
});

describe.if(!HAS_FIXTURE)("bun:llm chat framing", () => {
  it.skip(`skipped: fixture missing (${FIXTURE})`, () => {});
});
