import { describe, expect, test } from "bun:test";

function ts(code, options = {}) {
  return new Bun.Transpiler({
    loader: "tsx",
    ...options,
  }).transformSync(code);
}

describe("Parabun match expression", () => {
  test("literal arms desugar to ternary chain", () => {
    const out = ts(`
      const r = match status {
        200 => "ok",
        404 => "not found",
        500 => "server error",
        _ => "unknown"
      }
    `);
    expect(out).toContain("=== 200 ?");
    expect(out).toContain('"ok"');
    expect(out).toContain('"unknown"');
    // IIFE wrapper passing the subject in (concise-form arrow has no
    // brace, just a closing paren before the call).
    expect(out).toContain(")(status)");
  });

  test("OR pattern chains into `||` test", () => {
    const out = ts(`
      const r = match code {
        "a" | "b" | "c" => 1,
        _ => 0
      }
    `);
    expect(out).toMatch(/=== "a" \|\| .* === "b" \|\| .* === "c"/);
  });

  test("identifier-bind pattern substitutes name with subject", () => {
    const out = ts(`
      const r = match x {
        0 => "zero",
        n => "got " + n
      }
    `);
    // The `n + ...` becomes `__pm + ...` after substitution.
    expect(out).not.toContain("got n");
    expect(out).toMatch(/"got " \+ __pm/);
  });

  test("wildcard `_` arm produces fallback expression", () => {
    const out = ts(`
      const r = match flag {
        true => 1,
        _ => -1
      }
    `);
    expect(out).toMatch(/=== true \?/);
    // -1 prints as `-1` (unary on number 1).
    expect(out).toContain("-1");
  });

  test("no catch-all → undefined fallback", () => {
    const out = ts(`
      const r = match x {
        1 => "one",
        2 => "two"
      }
    `);
    expect(out).toContain("undefined");
  });

  test("negative-number literal pattern works", () => {
    const out = ts(`
      const r = match diff {
        -1 => "before",
        0 => "same",
        1 => "after",
        _ => "far"
      }
    `);
    expect(out).toContain("=== -1 ?");
  });

  test("`match` as identifier still works (not followed by expression)", () => {
    // No expression after `match` — falls through to identifier path.
    const out = ts(`
      const match = 42;
      console.log(match);
    `);
    expect(out).toContain("const match = 42");
    expect(out).toContain("console.log(match)");
  });

  test("match.foo (member access) keeps match as identifier", () => {
    const out = ts(`
      const r = match.foo;
    `);
    expect(out).toContain("match.foo");
  });

  test("subject is evaluated once via the IIFE param", () => {
    const out = ts(`
      const r = match expensive() {
        0 => "a",
        _ => "b"
      }
    `);
    // The call appears once as the IIFE arg.
    const matches = out.match(/expensive\(\)/g) ?? [];
    expect(matches.length).toBe(1);
  });

  test("multiple match expressions in one file don't crash visit", () => {
    const out = ts(`
      const a = match x { 1 => "one", _ => "?" }
      const b = match y { "yes" => true, _ => false }
      const c = match z { n => n + 1 }
    `);
    // Three separate IIFEs.
    expect((out.match(/__pm_/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
});
