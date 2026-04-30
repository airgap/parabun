import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";

// Scheduled / proactive prompts (LYK-737). Two tiers:
//   1. parseCron + cronMatches — pure functions, no LLM needed.
//   2. assistant.create({ schedule }) plumbing — accepts/rejects valid /
//      invalid cron strings; loop firing path is harder to test
//      deterministically (real clocks) and is verified by manual run.

const llmCandidates = [
  process.env.ASSISTANT_LLM,
  "/rigil/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q8_0.gguf",
  "/raid/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q8_0.gguf",
].filter((p): p is string => Boolean(p));
const llmFixture = llmCandidates.find(p => existsSync(p));
const haveLLM = Boolean(llmFixture);

describe("para:assistant cron parser (LYK-737)", () => {
  test("parses every-minute wildcard", async () => {
    const a = (await import("para:assistant")).default;
    const spec = a.parseCron("* * * * *");
    expect(spec.minute.size).toBe(60);
    expect(spec.hour.size).toBe(24);
    expect(spec.dom.size).toBe(31);
    expect(spec.month.size).toBe(12);
    expect(spec.dow.size).toBe(7);
  });

  test("parses exact value at the minute", async () => {
    const a = (await import("para:assistant")).default;
    const spec = a.parseCron("0 8 * * *");
    expect([...spec.minute]).toEqual([0]);
    expect([...spec.hour]).toEqual([8]);
    // 8:00 AM matches; 8:01 doesn't.
    expect(a.cronMatches(spec, new Date(2026, 0, 1, 8, 0, 0))).toBe(true);
    expect(a.cronMatches(spec, new Date(2026, 0, 1, 8, 1, 0))).toBe(false);
    expect(a.cronMatches(spec, new Date(2026, 0, 1, 9, 0, 0))).toBe(false);
  });

  test("parses ranges", async () => {
    const a = (await import("para:assistant")).default;
    const spec = a.parseCron("0 9-17 * * 1-5");
    // 9 AM Monday matches; 8 AM and Saturday don't.
    expect(a.cronMatches(spec, new Date(2026, 0, 5, 9, 0, 0))).toBe(true); // Monday
    expect(a.cronMatches(spec, new Date(2026, 0, 5, 8, 0, 0))).toBe(false);
    expect(a.cronMatches(spec, new Date(2026, 0, 5, 17, 0, 0))).toBe(true);
    expect(a.cronMatches(spec, new Date(2026, 0, 5, 18, 0, 0))).toBe(false);
    expect(a.cronMatches(spec, new Date(2026, 0, 3, 9, 0, 0))).toBe(false); // Saturday
  });

  test("parses lists", async () => {
    const a = (await import("para:assistant")).default;
    const spec = a.parseCron("0,15,30,45 * * * *");
    expect([...spec.minute].sort((x, y) => x - y)).toEqual([0, 15, 30, 45]);
  });

  test("parses step (*/N)", async () => {
    const a = (await import("para:assistant")).default;
    const spec = a.parseCron("*/15 * * * *");
    expect([...spec.minute].sort((x, y) => x - y)).toEqual([0, 15, 30, 45]);
  });

  test("parses range with step", async () => {
    const a = (await import("para:assistant")).default;
    const spec = a.parseCron("0-30/10 * * * *");
    expect([...spec.minute].sort((x, y) => x - y)).toEqual([0, 10, 20, 30]);
  });

  test("rejects wrong field count", async () => {
    const a = (await import("para:assistant")).default;
    expect(() => a.parseCron("* * * *")).toThrow(/5 fields/);
    expect(() => a.parseCron("* * * * * *")).toThrow(/5 fields/);
  });

  test("rejects out-of-range values", async () => {
    const a = (await import("para:assistant")).default;
    expect(() => a.parseCron("60 * * * *")).toThrow(/out of range/);
    expect(() => a.parseCron("* 24 * * *")).toThrow(/out of range/);
    expect(() => a.parseCron("* * 0 * *")).toThrow(/out of range/);
    expect(() => a.parseCron("* * * 13 *")).toThrow(/out of range/);
    expect(() => a.parseCron("* * * * 7")).toThrow(/out of range/);
  });

  test("rejects malformed ranges", async () => {
    const a = (await import("para:assistant")).default;
    expect(() => a.parseCron("10-5 * * * *")).toThrow(/out of range/);
  });

  test("rejects invalid step", async () => {
    const a = (await import("para:assistant")).default;
    expect(() => a.parseCron("*/0 * * * *")).toThrow(/invalid cron step/);
  });

  test("Sunday is dow=0, Saturday is dow=6", async () => {
    const a = (await import("para:assistant")).default;
    const sunOnly = a.parseCron("0 0 * * 0");
    // 2026-01-04 is a Sunday.
    expect(a.cronMatches(sunOnly, new Date(2026, 0, 4, 0, 0, 0))).toBe(true);
    expect(a.cronMatches(sunOnly, new Date(2026, 0, 5, 0, 0, 0))).toBe(false); // Mon
  });
});

describe("para:assistant schedule option (LYK-737)", () => {
  test("rejects invalid cron at create time", async () => {
    if (!haveLLM) return;
    const assistant = (await import("para:assistant")).default;
    await expect(
      assistant.create({
        llm: llmFixture!,
        schedule: [{ cron: "completely not cron", prompt: "hi" }],
      }),
    ).rejects.toThrow(/cron/);
  });

  test("accepts valid schedule and stays idle on construction", async () => {
    if (!haveLLM) return;
    const assistant = (await import("para:assistant")).default;
    const bot = await assistant.create({
      llm: llmFixture!,
      // Far-future Feb 30 — never matches; safe to exercise the timer
      // setup path without firing during the test.
      schedule: [{ cron: "0 0 30 2 *", prompt: "this never fires" }],
    });
    try {
      expect(bot.state.get()).toBe("idle");
      expect(bot.lastTurn.get()).toBeNull();
    } finally {
      await bot.close();
    }
  }, 60000);

  test("rejects schedule entries with non-string fields", async () => {
    if (!haveLLM) return;
    const assistant = (await import("para:assistant")).default;
    await expect(
      assistant.create({
        llm: llmFixture!,
        // @ts-expect-error — exercising the runtime guard
        schedule: [{ cron: "* * * * *", prompt: 42 }],
      }),
    ).rejects.toThrow(/string/);
  });
});
