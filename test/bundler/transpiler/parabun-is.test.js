import { describe, expect, test } from "bun:test";

function ts(code, options = {}) {
  return new Bun.Transpiler({
    loader: "tsx",
    ...options,
  }).transformSync(code);
}

describe("Parabun `is` runtime type-guard operator", () => {
  test('`expr is Type` lowers to `Type.parse(expr).tag === "Ok"`', () => {
    const out = ts(`
      schema User { id: int }
      const ok = input is User
    `);
    expect(out).toMatch(/User\.parse\(input\)\.tag === "Ok"/);
  });

  test('`expr is not Type` lowers to `Type.parse(expr).tag !== "Ok"`', () => {
    const out = ts(`
      schema User { id: int }
      const bad = input is not User
    `);
    expect(out).toMatch(/User\.parse\(input\)\.tag !== "Ok"/);
  });

  test("`is` in `if` predicate", () => {
    const out = ts(`
      schema User { id: int }
      if (req is User) { foo() }
    `);
    expect(out).toMatch(/User\.parse\(req\)\.tag === "Ok"/);
  });

  test("`is` in ternary", () => {
    const out = ts(`
      schema User { id: int }
      const x = (val is User) ? "ok" : "no"
    `);
    expect(out).toMatch(/User\.parse\(val\)\.tag === "Ok"/);
  });

  test("`is` only triggers on Capitalized RHS — `is x` stays an identifier", () => {
    const out = ts(`
      const is = 5
      const r = is + 1
    `);
    expect(out).toContain("const is = 5");
    expect(out).toContain("is + 1");
    expect(out).not.toContain(".parse(");
  });

  test("`is` works on chained left-hand expressions", () => {
    const out = ts(`
      schema User { id: int }
      const ok = obj.user is User
    `);
    expect(out).toMatch(/User\.parse\(obj\.user\)\.tag === "Ok"/);
  });

  test("multiple `is` in same expression", () => {
    const out = ts(`
      schema User { id: int }
      schema Post { id: int }
      const r = (a is User) || (b is Post)
    `);
    expect(out).toMatch(/User\.parse\(a\)\.tag === "Ok"/);
    expect(out).toMatch(/Post\.parse\(b\)\.tag === "Ok"/);
  });

  test("`is` as a return value", () => {
    const out = ts(`
      schema User { id: int }
      function check(x) { return x is User }
    `);
    expect(out).toMatch(/User\.parse\(x\)\.tag === "Ok"/);
  });
});
