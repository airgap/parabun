import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";

// bun:assistant smoke + interface contract.
//
// The voice loop (mic + STT + speaker + TTS) needs real hardware; the
// text path (just the LLM) is testable headlessly. This file covers the
// text path. Voice tests live separately and skip in CI.

const llmCandidates = [
  process.env.ASSISTANT_LLM,
  "/rigil/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q8_0.gguf",
  "/raid/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q8_0.gguf",
].filter((p): p is string => Boolean(p));
const llmFixture = llmCandidates.find(p => existsSync(p));
const haveLLM = Boolean(llmFixture);

describe("bun:assistant", () => {
  test("rejects missing llm option", async () => {
    const assistant = (await import("bun:assistant")).default;
    await expect(
      // @ts-expect-error — exercising the runtime guard
      assistant.create({}),
    ).rejects.toThrow(/opts\.llm/);
  });

  test("turns() rejects without stt/mic configured", async () => {
    if (!haveLLM) return;
    const assistant = (await import("bun:assistant")).default;
    const bot = await assistant.create({ llm: llmFixture! });
    try {
      const it = bot.turns();
      await expect(it.next()).rejects.toThrow(/voice loop/);
    } finally {
      await bot.close();
    }
  }, 60000);

  test.skipIf(!haveLLM)(
    "ask() drives a full LLM turn, updates history + lastTurn signals",
    async () => {
      const assistant = (await import("bun:assistant")).default;
      const bot = await assistant.create({
        llm: llmFixture!,
        system: "You are a concise assistant. Answer in one sentence.",
        chatOpts: { maxTokens: 32, temperature: 0 },
      });
      try {
        // Initial signals
        expect(bot.state.get()).toBe("idle");
        expect(bot.lastTurn.get()).toBeNull();
        expect(bot.history.get().length).toBe(1); // system message
        expect(bot.history.get()[0].role).toBe("system");

        const stateTrace: string[] = [];
        const unsub = bot.state.subscribe((s: string) => stateTrace.push(s));

        const turn = await bot.ask("Say the word hello.");
        unsub();

        expect(turn.user).toBe("Say the word hello.");
        expect(turn.assistant.length).toBeGreaterThan(0);
        expect(turn.toolCalls).toEqual([]);
        expect(turn.interrupted).toBe(false);
        expect(turn.endedAtMs).toBeGreaterThanOrEqual(turn.startedAtMs);

        // History grew by user + assistant turns.
        expect(bot.history.get().length).toBe(3);
        expect(bot.history.get()[1].role).toBe("user");
        expect(bot.history.get()[2].role).toBe("assistant");
        expect(bot.history.get()[2].content).toBe(turn.assistant);

        // lastTurn signal points at the same Turn.
        expect(bot.lastTurn.get()).toBe(turn);

        // State transitions: idle → thinking → idle (no TTS configured).
        expect(stateTrace).toContain("thinking");
        expect(bot.state.get()).toBe("idle");
      } finally {
        await bot.close();
      }
    },
    180000,
  );

  test.skipIf(!haveLLM)(
    "close() is idempotent + flips to idle",
    async () => {
      const assistant = (await import("bun:assistant")).default;
      const bot = await assistant.create({ llm: llmFixture! });
      await bot.close();
      expect(bot.state.get()).toBe("idle");
      // Idempotent — second call does nothing, doesn't throw.
      await bot.close();
      // ask() after close throws a clear error.
      await expect(bot.ask("hi")).rejects.toThrow(/already disposed/);
    },
    60000,
  );
});
