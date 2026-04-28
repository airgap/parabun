import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";

// bun:assistant wake-word gate (LYK-739).
//
// The gate is plumbing — accept the option, normalize the string shorthand,
// configure the field. The real gating runs inside turns(), which needs a
// mic. Voice-loop tests live separately and skip in CI.

const llmCandidates = [
  process.env.ASSISTANT_LLM,
  "/rigil/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q8_0.gguf",
  "/raid/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q8_0.gguf",
].filter((p): p is string => Boolean(p));
const llmFixture = llmCandidates.find(p => existsSync(p));
const haveLLM = Boolean(llmFixture);

describe("bun:assistant wake word (LYK-739)", () => {
  test("string shorthand expands to { phrase }", async () => {
    if (!haveLLM) return;
    const assistant = (await import("bun:assistant")).default;
    // Just confirms the option is accepted at create-time. The gate
    // actually runs inside turns(); a hardware-free unit test on the gate
    // belongs in speech/wakeword.test.ts (which exercises the matcher).
    const bot = await assistant.create({ llm: llmFixture!, wakeWord: "hey jetson" });
    try {
      expect(bot).toBeDefined();
    } finally {
      await bot.close();
    }
  }, 60000);

  test("object form also accepted", async () => {
    if (!haveLLM) return;
    const assistant = (await import("bun:assistant")).default;
    const bot = await assistant.create({
      llm: llmFixture!,
      wakeWord: { phrase: ["hey jetson", "ok parabun"], match: "fuzzy", maxEdits: 2 },
    });
    try {
      expect(bot).toBeDefined();
    } finally {
      await bot.close();
    }
  }, 60000);

  test("turns() still rejects without mic + stt even with wakeWord set", async () => {
    if (!haveLLM) return;
    const assistant = (await import("bun:assistant")).default;
    const bot = await assistant.create({ llm: llmFixture!, wakeWord: "hey jetson" });
    try {
      const it = bot.turns();
      // Wake word doesn't relax the mic+stt requirement — it's a gate on
      // utterances, and there are no utterances without a mic.
      await expect(it.next()).rejects.toThrow(/voice loop/);
    } finally {
      await bot.close();
    }
  }, 60000);
});
