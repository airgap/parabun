import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { bunExe } from "harness";

// para:assistant tool dispatch + MCP integration (LYK-734).
//
// Two paths covered:
//   1. Inline `{ name, schema, run }` tools — the dispatch happens in
//      this process, no subprocess required.
//   2. MCP connections — para:mcp's stdio-spawned fixture-server.ts is
//      reused; the assistant flattens its tool list and routes calls.

const llmCandidates = [
  process.env.ASSISTANT_LLM,
  "/rigil/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q8_0.gguf",
  "/raid/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q8_0.gguf",
].filter((p): p is string => Boolean(p));
const llmFixture = llmCandidates.find(p => existsSync(p));
const haveLLM = Boolean(llmFixture);

// Schema-constrained generation in debug builds is *very* slow — the
// grammar mask is recomputed per token without optimization. The
// tool-iteration loop runs the LLM up to 8 times per turn, which can
// take 20+ minutes on debug. Gate the LLM-driven tests behind a release
// build (or a manual override) so day-to-day debug runs stay fast.
// `bun bd` builds debug; ASSISTANT_TOOLS_RUN_LLM=1 forces them on regardless.
const isDebugBuild =
  (Bun.version_with_sha as string | undefined)?.includes("debug") || process.execPath.includes("/debug/");
const runLlmTests = !isDebugBuild || process.env.ASSISTANT_TOOLS_RUN_LLM === "1";
const haveLLMAndCanRun = haveLLM && runLlmTests;

const mcpFixture = join(import.meta.dir, "..", "mcp", "fixture-server.ts");

describe("para:assistant tools (LYK-734)", () => {
  test("inline tools register, expose schema, surface via bot.tools", async () => {
    if (!haveLLM) return;
    const assistant = (await import("para:assistant")).default;
    const bot = await assistant.create({
      llm: llmFixture!,
      tools: [
        {
          name: "echo",
          description: "Returns input.",
          schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
          run({ text }: { text: string }) {
            return text;
          },
        },
      ],
    });
    try {
      expect(bot.tools.length).toBe(1);
      expect(bot.tools[0].name).toBe("echo");
      expect(bot.tools[0].source).toBe("inline");
      expect(bot.toolsActive.get().size).toBe(0);
    } finally {
      await bot.close();
    }
  }, 60000);

  test("addTool / removeTool mutate the live list", async () => {
    if (!haveLLM) return;
    const assistant = (await import("para:assistant")).default;
    const bot = await assistant.create({ llm: llmFixture! });
    try {
      expect(bot.tools.length).toBe(0);
      bot.addTool({
        name: "ping",
        schema: { type: "object" },
        run() {
          return "pong";
        },
      });
      expect(bot.tools.length).toBe(1);
      expect(bot.removeTool("ping")).toBe(true);
      expect(bot.removeTool("ping")).toBe(false);
      expect(bot.tools.length).toBe(0);
    } finally {
      await bot.close();
    }
  }, 60000);

  test("MCP connection flattens into the assistant's tool list", async () => {
    if (!haveLLM) return;
    const mcp = (await import("para:mcp")).default;
    const assistant = (await import("para:assistant")).default;

    await using conn = await mcp.connect("stdio", bunExe(), { args: [mcpFixture] });
    expect(conn.tools.map(t => t.name).sort()).toEqual(["add", "echo"]);

    const bot = await assistant.create({ llm: llmFixture!, tools: [conn] });
    try {
      expect(bot.tools.map(t => t.name).sort()).toEqual(["add", "echo"]);
      expect(bot.tools.every(t => t.source === "mcp")).toBe(true);
    } finally {
      await bot.close();
    }
  }, 60000);

  test("ask() dispatches an inline tool end-to-end", async () => {
    if (!haveLLMAndCanRun) return;
    const assistant = (await import("para:assistant")).default;
    let callsSeen = 0;
    const bot = await assistant.create({
      llm: llmFixture!,
      system: "You are concise. Use the add tool to compute sums.",
      chatOpts: { maxTokens: 96, temperature: 0 },
      tools: [
        {
          name: "add",
          description: "Returns a + b.",
          schema: {
            type: "object",
            properties: { a: { type: "number" }, b: { type: "number" } },
            required: ["a", "b"],
          },
          run({ a, b }: { a: number; b: number }) {
            callsSeen++;
            return a + b;
          },
        },
      ],
    });
    try {
      const turn = await bot.ask("What is 17 plus 25? Use the add tool.");
      // The model should have called `add` at least once.
      expect(callsSeen).toBeGreaterThanOrEqual(1);
      expect(turn.toolCalls.length).toBeGreaterThanOrEqual(1);
      const addCall = turn.toolCalls.find(c => c.name === "add");
      expect(addCall).toBeDefined();
      // The result of any add() call should be a number from our inline run.
      expect(typeof addCall!.result).toBe("number");
      // toolsActive returns to empty after the turn.
      expect(bot.toolsActive.get().size).toBe(0);
      // Final reply is non-empty.
      expect(turn.assistant.length).toBeGreaterThan(0);
    } finally {
      await bot.close();
    }
  }, 240000);

  test("toolsActive signal flips during dispatch", async () => {
    if (!haveLLMAndCanRun) return;
    const assistant = (await import("para:assistant")).default;
    const trace: number[] = [];
    let inFlight = false;
    const bot = await assistant.create({
      llm: llmFixture!,
      system: "Use the slow tool.",
      chatOpts: { maxTokens: 64, temperature: 0 },
      tools: [
        {
          name: "slow",
          description: "Takes a moment.",
          schema: { type: "object" },
          async run() {
            inFlight = true;
            await Bun.sleep(50);
            inFlight = false;
            return "done";
          },
        },
      ],
    });
    try {
      const unsub = bot.toolsActive.subscribe((s: Set<string>) => trace.push(s.size));
      await bot.ask("Run slow.");
      unsub();
      expect(inFlight).toBe(false);
      // Trace should have included at least one transition to size>=1
      // and end at 0.
      expect(trace.some(n => n > 0)).toBe(true);
      expect(trace[trace.length - 1]).toBe(0);
    } finally {
      await bot.close();
    }
  }, 240000);
});
