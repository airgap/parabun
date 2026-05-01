import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";

// LLM reactive surface: busy + device. Real-model test (1B Q8_0 GGUF
// fixture lives outside the repo); skips cleanly when missing.

const fixtureCandidates = [
  process.env.LLM_FIXTURE,
  "/rigil/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q8_0.gguf",
  "/raid/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q8_0.gguf",
].filter((p): p is string => Boolean(p));
const fixture = fixtureCandidates.find(p => existsSync(p));
const have = Boolean(fixture);

describe("parabun:llm LLM signals", () => {
  test.skipIf(!have)(
    "device matches active gpu backend; busy is initially false",
    async () => {
      const llm = (await import("parabun:llm")).default;
      const gpu = (await import("parabun:gpu")).default;
      const m = await llm.LLM.load(fixture!);

      expect(typeof m.busy.get).toBe("function");
      expect(typeof m.device.get).toBe("function");
      expect(m.busy.get()).toBe(false);
      expect(m.device.get()).toBe(gpu.describe().active);

      m.dispose?.();
    },
    60000,
  );

  test.skipIf(!have)(
    "busy flips true during generate, false on completion",
    async () => {
      const llm = (await import("parabun:llm")).default;
      const m = await llm.LLM.load(fixture!);

      const transitions: boolean[] = [];
      const unsub = m.busy.subscribe((v: boolean) => transitions.push(v));

      // Drive a tiny generation. We don't care about the output text; we
      // care that busy flipped on entry and back off at the end.
      let saw = "";
      for await (const piece of m.generate("hi", { maxTokens: 4 })) saw += piece;
      expect(saw.length).toBeGreaterThan(0);

      unsub();
      // Initial subscribe call delivers current value (false). Then busy=true
      // when generate starts, busy=false on completion. Just assert true
      // appeared and the FINAL value is false.
      expect(transitions).toContain(true);
      expect(transitions[transitions.length - 1]).toBe(false);
      expect(m.busy.get()).toBe(false);

      m.dispose?.();
    },
    120000,
  );
});
