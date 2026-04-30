import { describe, expect, test } from "bun:test";

// LYK-759 regression test: `await using` declarations in builtin modules
// (src/js/bun/*) used to fail at startup with `Error parsing builtin:
// Unrecognized token 'call'`. Root cause: `bun build`'s `__callDispose`
// runtime helper invokes `it[1].call(it[2])` for each Symbol.[async]Dispose
// — and JSC's BuiltinExecutables parser (older / more conservative than
// the main JS parser) rejects bare `.call` the same way it rejects user-
// code `.call` (CLAUDE.md: "Use `.$call` and `.$apply`, never `.call`").
//
// Fix: bundle-modules.ts post-processes the bundled output, rewriting
// `it[1].call(...)` to `it[1]["call"](...)`. Bracket notation reads
// identically at runtime; the parser accepts it.
//
// The probe lives in src/js/bun/speech.ts as `speech.__lyk759Probe`. If
// this test fails with "Unrecognized token", the regression is real.

describe("LYK-759: await using in builtin modules", () => {
  test("dispose fires after the function body completes", async () => {
    const speech = (await import("para:speech")).default;
    const probe: (events: string[]) => Promise<void> = (speech as any).__lyk759Probe;
    expect(typeof probe).toBe("function");

    const events: string[] = [];
    await probe(events);

    // Spec semantics: disposal runs after the body returns. The Set is
    // a closure reference so we observe events even though they fire in
    // the function's finally block.
    expect(events).toEqual(["body-start", "body-end", "disposed"]);
  });

  test("re-entry: probe can be called more than once without leaking state", async () => {
    const speech = (await import("para:speech")).default;
    const probe: (events: string[]) => Promise<void> = (speech as any).__lyk759Probe;
    const a: string[] = [];
    const b: string[] = [];
    await probe(a);
    await probe(b);
    expect(a).toEqual(["body-start", "body-end", "disposed"]);
    expect(b).toEqual(["body-start", "body-end", "disposed"]);
  });
});
