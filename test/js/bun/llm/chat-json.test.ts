import { describe, expect, test } from "bun:test";
import llm from "parabun:llm";

// chat.chatJSON requires a schema (or grammar). The validation path runs
// without loading a real model — we exercise it through a lightweight
// stub that mimics LLM.chat's AsyncGenerator surface.

describe("LLM.chatJSON validation", () => {
  test("requires opts.schema or opts.grammar", () => {
    // Build a minimal stub LLM with the same surface chatJSON uses.
    const stub: any = Object.create(llm.LLM.prototype);
    stub.chat = async function* () {
      yield "{}";
    };
    expect(() => stub.chatJSON([{ role: "user", content: "hi" }], undefined)).toThrow(/schema or opts\.grammar/);
    expect(() => stub.chatJSON([{ role: "user", content: "hi" }], {})).toThrow(/schema or opts\.grammar/);
  });

  test("with schema, drains the chat stream and JSON.parses the result", async () => {
    const stub: any = Object.create(llm.LLM.prototype);
    stub.chat = async function* () {
      yield '{"tool":';
      yield ' "setLight", "args":';
      yield ' { "room": "kitchen", "on": true } }';
    };
    const out = await stub.chatJSON([{ role: "user", content: "kitchen on" }], { schema: {} });
    expect(out).toEqual({ tool: "setLight", args: { room: "kitchen", on: true } });
  });

  test("with grammar instead of schema, also accepted", async () => {
    const stub: any = Object.create(llm.LLM.prototype);
    stub.chat = async function* () {
      yield '{"ok": true}';
    };
    const out = await stub.chatJSON([{ role: "user", content: "x" }], { grammar: 'root ::= "{\\"ok\\": true}"' });
    expect(out).toEqual({ ok: true });
  });

  test("malformed JSON in the stream surfaces as a JSON parse error", async () => {
    const stub: any = Object.create(llm.LLM.prototype);
    stub.chat = async function* () {
      yield "not json {";
    };
    await expect(stub.chatJSON([{ role: "user", content: "x" }], { schema: {} })).rejects.toThrow();
  });
});
