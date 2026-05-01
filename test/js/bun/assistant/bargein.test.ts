import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";

// Barge-in / interruptible TTS coverage (LYK-735).
//
// Two surfaces:
//   1. bot.interrupt() — programmatic cancel. Always testable.
//   2. VAD-driven cancel during turns() — needs a mic and STT model;
//      reuses the existing assistant.test.ts gating (haveLLM only).
//
// The chat-token-loop and chunked-TTS-loop both poll the same internal
// flag, so exercising bot.interrupt() before the LLM finishes proves
// that wiring without spending 30+ seconds on debug-build inference.

const llmCandidates = [
  process.env.ASSISTANT_LLM,
  "/rigil/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q8_0.gguf",
  "/raid/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q8_0.gguf",
].filter((p): p is string => Boolean(p));
const llmFixture = llmCandidates.find(p => existsSync(p));
const haveLLM = Boolean(llmFixture);

// Same gate as tools.test.ts — schema-constrained sampling is too slow
// on debug to actually run a full ask(). Force-enable with the env var.
const isDebugBuild =
  (Bun.version_with_sha as string | undefined)?.includes("debug") || process.execPath.includes("/debug/");
const runLlmTests = !isDebugBuild || process.env.ASSISTANT_TOOLS_RUN_LLM === "1";
const haveLLMAndCanRun = haveLLM && runLlmTests;

describe("parabun:assistant barge-in (LYK-735)", () => {
  test("bot.interrupted starts false and bot.interrupt() flips it", async () => {
    if (!haveLLM) return;
    const assistant = (await import("parabun:assistant")).default;
    const bot = await assistant.create({ llm: llmFixture! });
    try {
      expect(bot.interrupted.get()).toBe(false);
      bot.interrupt();
      expect(bot.interrupted.get()).toBe(true);
    } finally {
      await bot.close();
    }
  }, 60000);

  test("bot.interrupt() is idempotent within a turn", async () => {
    if (!haveLLM) return;
    const assistant = (await import("parabun:assistant")).default;
    const bot = await assistant.create({ llm: llmFixture! });
    try {
      const trace: boolean[] = [];
      const unsub = bot.interrupted.subscribe((v: boolean) => trace.push(v));
      bot.interrupt();
      bot.interrupt();
      bot.interrupt();
      unsub();
      // Subscribe immediately fires with current value; then one transition
      // false → true on the first call. Subsequent calls are no-ops, so we
      // shouldn't see additional emits.
      expect(trace.filter(v => v === true).length).toBe(1);
    } finally {
      await bot.close();
    }
  }, 60000);

  test("interrupt() before next turn doesn't latch — flag resets", async () => {
    if (!haveLLMAndCanRun) return;
    const assistant = (await import("parabun:assistant")).default;
    const bot = await assistant.create({
      llm: llmFixture!,
      system: "You are concise.",
      chatOpts: { maxTokens: 8, temperature: 0 },
    });
    try {
      bot.interrupt();
      expect(bot.interrupted.get()).toBe(true);
      // ask() resets at turn start.
      const turn = await bot.ask("Say hi.");
      // The flag was set BEFORE the turn started, so the implementation
      // should have cleared it. The turn ran to completion uninterrupted.
      expect(bot.interrupted.get()).toBe(false);
      expect(turn.interrupted).toBe(false);
      expect(turn.assistant.length).toBeGreaterThan(0);
    } finally {
      await bot.close();
    }
  }, 240000);

  test("interrupt() during ask() short-circuits the turn", async () => {
    if (!haveLLMAndCanRun) return;
    const assistant = (await import("parabun:assistant")).default;
    const bot = await assistant.create({
      llm: llmFixture!,
      system: "You are concise.",
      // Long enough that we have time to interrupt before the model finishes.
      chatOpts: { maxTokens: 256, temperature: 0 },
    });
    try {
      // Wait for state to flip to "thinking" then call interrupt(). No
      // setTimeout — we wait on the actual signal transition.
      const { promise: thinking, resolve } = Promise.withResolvers<void>();
      const unsub = bot.state.subscribe((s: string) => {
        if (s === "thinking") resolve();
      });
      const askPromise = bot.ask("Tell me a long story about lighthouses.");
      await thinking;
      unsub();
      bot.interrupt();
      const turn = await askPromise;
      expect(turn.interrupted).toBe(true);
      // bot.interrupted persists until the NEXT turn starts.
      expect(bot.interrupted.get()).toBe(true);
    } finally {
      await bot.close();
    }
  }, 240000);
});
