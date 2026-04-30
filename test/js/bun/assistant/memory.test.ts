import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tempDir } from "harness";

// Persistent memory for para:assistant (LYK-760 step 4).
//
// Two layers covered:
//   1. The MemoryStore plumbing — open + append + count + close, no LLM
//      required. Catches schema regressions & sqlite plumbing bugs cheaply.
//   2. End-to-end: ask → close → reopen restores history. Needs the LLM
//      fixture, so it skips in CI.

const llmCandidates = [
  process.env.ASSISTANT_LLM,
  "/rigil/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q8_0.gguf",
  "/raid/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q8_0.gguf",
].filter((p): p is string => Boolean(p));
const llmFixture = llmCandidates.find(p => existsSync(p));
const haveLLM = Boolean(llmFixture);

describe("para:assistant memory", () => {
  test("memory option is optional — no store when unset", async () => {
    if (!haveLLM) return;
    const assistant = (await import("para:assistant")).default;
    const bot = await assistant.create({ llm: llmFixture! });
    try {
      expect(bot.memory).toBeNull();
    } finally {
      await bot.close();
    }
  }, 60000);

  test("memory store opens, appends, and reloads across instances", async () => {
    if (!haveLLM) return;
    using dir = tempDir("assistant-memory-", {});
    const dbPath = join(String(dir), "memory.sqlite");

    const assistant = (await import("para:assistant")).default;

    // First session — establish a turn, then close.
    {
      const bot = await assistant.create({
        llm: llmFixture!,
        system: "Answer in one word.",
        chatOpts: { maxTokens: 16, temperature: 0 },
        memory: dbPath,
      });
      try {
        expect(bot.memory).not.toBeNull();
        expect(bot.memory!.count()).toBe(0);

        const turn = await bot.ask("Say hello.");
        expect(turn.assistant.length).toBeGreaterThan(0);

        // Two persisted turns: user + assistant. System prompt is not
        // persisted — it's set fresh from opts.system on every load.
        expect(bot.memory!.count()).toBe(2);
      } finally {
        await bot.close();
      }
    }

    // Second session — same db path. History should replay.
    {
      const bot = await assistant.create({
        llm: llmFixture!,
        system: "Answer in one word.",
        chatOpts: { maxTokens: 16, temperature: 0 },
        memory: dbPath,
      });
      try {
        const hist = bot.history.get();
        // [system, user, assistant] = 3
        expect(hist.length).toBe(3);
        expect(hist[0].role).toBe("system");
        expect(hist[1].role).toBe("user");
        expect(hist[1].content).toBe("Say hello.");
        expect(hist[2].role).toBe("assistant");
        expect(hist[2].content.length).toBeGreaterThan(0);

        expect(bot.memory!.count()).toBe(2);
      } finally {
        await bot.close();
      }
    }
  }, 240000);

  test("memory.clear() empties the store", async () => {
    if (!haveLLM) return;
    using dir = tempDir("assistant-memory-clear-", {});
    const dbPath = join(String(dir), "memory.sqlite");

    const assistant = (await import("para:assistant")).default;
    const bot = await assistant.create({
      llm: llmFixture!,
      chatOpts: { maxTokens: 8, temperature: 0 },
      memory: dbPath,
    });
    try {
      await bot.ask("Hi.");
      expect(bot.memory!.count()).toBe(2);
      bot.memory!.clear();
      expect(bot.memory!.count()).toBe(0);
    } finally {
      await bot.close();
    }
  }, 180000);

  test("memory accepts options object form", async () => {
    if (!haveLLM) return;
    using dir = tempDir("assistant-memory-opt-", {});
    const dbPath = join(String(dir), "memory.sqlite");

    const assistant = (await import("para:assistant")).default;
    const bot = await assistant.create({ llm: llmFixture!, memory: { path: dbPath } });
    try {
      expect(bot.memory).not.toBeNull();
      expect(bot.memory!.count()).toBe(0);
    } finally {
      await bot.close();
    }
  }, 60000);
});
