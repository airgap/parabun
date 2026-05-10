import { describe, expect, test } from "bun:test";

function ts(code, options = {}) {
  return new Bun.Transpiler({
    loader: "tsx",
    ...options,
  }).transformSync(code);
}

describe("Parabun match expression", () => {
  test("all-literal arms with simple subject use inline ternary (TS narrows)", () => {
    const out = ts(`
      const r = match status {
        200 => "ok",
        404 => "not found",
        500 => "server error",
        _ => "unknown"
      }
    `);
    // Inline form keeps the original subject expression at each test
    // site so tsc narrows discriminated-union shapes (`e.kind === "x"`
    // narrows `e`). The IIFE wrapper is still present — only its body
    // changed from switch-on-__pm to inline-test ternary.
    expect(out).toContain("status === 200");
    expect(out).toContain("status === 404");
    expect(out).toContain("status === 500");
    expect(out).toContain('? "ok"');
    expect(out).toContain('"unknown"');
    expect(out).toContain(")(status)");
  });

  test("OR pattern joins alternatives with `||` in inline ternary", () => {
    const out = ts(`
      const r = match code {
        "a" | "b" | "c" => 1,
        _ => 0
      }
    `);
    // Each OR alternative becomes its own `subject === lit` check
    // joined by ||, then the whole disjunction is one ternary branch.
    expect(out).toMatch(/code === "a".*\|\|.*code === "b".*\|\|.*code === "c"/);
    expect(out).toContain("? 1");
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

  test("wildcard `_` arm becomes the final ternary fallback", () => {
    const out = ts(`
      const r = match flag {
        true => 1,
        _ => -1
      }
    `);
    expect(out).toContain("flag === true");
    // Fallback (the `_` arm result) appears after the last `:`.
    expect(out).toMatch(/:\s*-1/);
  });

  test("no catch-all → fallback is undefined", () => {
    const out = ts(`
      const r = match x {
        1 => "one",
        2 => "two"
      }
    `);
    expect(out).toContain("x === 1");
    expect(out).toContain("x === 2");
    // No explicit wildcard → fallback is `undefined`.
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
    expect(out).toContain("diff === -1");
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

  test("`_ is Type` arm runs Type.parse + Ok-tag check", () => {
    const out = ts(`
      const r = match x {
        _ is User => "user",
        _ is Post => "post",
        _ => "neither"
      }
    `);
    expect(out).toMatch(/User\.parse\(__pm\w*\$?\)\.tag === "Ok"/);
    expect(out).toMatch(/Post\.parse\(__pm\w*\$?\)\.tag === "Ok"/);
  });

  test("`u is Type` arm binds AND type-guards (u substituted with subject)", () => {
    const out = ts(`
      const r = match x {
        u is User => u.email,
        _ => "?"
      }
    `);
    // Bind: `u.email` becomes `__pm.email` after substitution.
    expect(out).toMatch(/__pm\w*\$?\.email/);
    // Test: User.parse + tag check.
    expect(out).toMatch(/User\.parse\(__pm\w*\$?\)\.tag === "Ok"/);
  });

  test("`_ is not Type` arm uses !== for negation", () => {
    const out = ts(`
      const r = match x {
        _ is not User => "no",
        _ => "yes"
      }
    `);
    expect(out).toMatch(/User\.parse\(__pm\w*\$?\)\.tag !== "Ok"/);
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

  // Regression: a `match` in an arm RHS used to crash the parser's
  // visit pass. The outer match's switch-body block scope was pushed
  // AFTER arms (visit pushes it BEFORE), and inner-arm scopes were
  // parented to function_body instead of the block. Now the block is
  // pushed before arms and kept current during arm parsing.
  test("nested `match` in an arm RHS — all-literal patterns", () => {
    const out = ts(`
      const r = match 1 {
        1 => match 2 { 2 => "inner", _ => "fail" },
        _ => "outer-no"
      }
    `);
    expect(out).toMatch(/__pm_\w+\$?/);
    // Two distinct IIFE param names (outer + inner).
    const names = new Set(out.match(/__pm_\w+\$/g));
    expect(names.size).toBeGreaterThanOrEqual(2);
  });

  test("nested `match` — `match typeof` outer with object-arm inner", () => {
    const out = ts(`
      function f(v) {
        return match typeof v {
          "object" => match v { null => "null-obj", _ => "obj" },
          _ => "other"
        }
      }
    `);
    expect(out).toMatch(/typeof v/);
    expect(out).toMatch(/__pm_\w+\$?/);
  });

  // Discriminated-union narrowing: when subject is a property-access
  // chain (`e.kind`), the lowering emits `e.kind === "click" ? ... :
  // ...` instead of capturing `e.kind` into __pm. tsc narrows `e`
  // through the discriminant check in each ternary branch — without
  // this, users had to `as`-cast inside every arm body.
  test("property-access subject keeps discriminant inline at each test site", () => {
    const out = ts(`
      type Ev = { kind: 'click', x: number } | { kind: 'key', k: string }
      function f(e: Ev) {
        return match e.kind {
          'click' => e.x,
          'key' => e.k,
        }
      }
    `);
    // Discriminant must appear literally at each test site, not as __pm.
    expect(out).toMatch(/e\.kind === "click"/);
    expect(out).toMatch(/e\.kind === "key"/);
    // The arm result expressions reference the narrowed properties
    // directly — never wrapped or aliased.
    expect(out).toContain("e.x");
    expect(out).toContain("e.k");
  });

  // Subject classification: anything other than identifier/dot-chain
  // falls back to the captured-__pm switch lowering. Function calls
  // could have side effects; double-evaluating would be wrong.
  test("call-expression subject keeps switch lowering (no double-evaluation)", () => {
    const out = ts(`
      const r = match getStatus() {
        200 => "ok",
        _ => "bad"
      }
    `);
    expect(out).toContain("switch (");
    expect(out).toContain("case 200:");
    expect(out).toContain(")(getStatus())");
  });

  test("nested `match` — outer ternary path, inner switch path", () => {
    const out = ts(`
      const r = match x {
        n => match n { 1 => "one", _ => "other" }
      }
    `);
    // Outer arm uses identifier binding (n) → ternary lowering.
    // Inner is all-literal → switch lowering. Both must coexist.
    expect(out).toMatch(/__pm_\w+\$?/);
  });
});
