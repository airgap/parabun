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

describe("Parabun `is` literal-membership operator", () => {
  test("string union → strict-eq OR-chain (narrowing-preserving form)", () => {
    const out = ts(`const r = s is 'bar' | 'baz' | 'bim'`);
    expect(out).toMatch(/s === "bar" \|\| s === "baz" \|\| s === "bim"/);
    expect(out).not.toContain(".includes("); // no array alloc/scan
  });

  test("single string literal → plain ===", () => {
    expect(ts(`const r = s is 'only'`)).toMatch(/s === "only"/);
  });

  test("numeric union → ===", () => {
    expect(ts(`const r = n is 1 | 2 | 3`)).toMatch(/n === 1 \|\| n === 2 \|\| n === 3/);
  });

  test("`is not` → De-Morgan !== / &&", () => {
    const out = ts(`const r = s is not 'bar' | 'baz'`);
    expect(out).toMatch(/s !== "bar" && s !== "baz"/);
  });

  test("property-path subject is a simple operand", () => {
    expect(ts(`const r = obj.kind is 'a' | 'b'`)).toMatch(/obj\.kind === "a" \|\| obj\.kind === "b"/);
  });

  test("does not collide with the schema guard — `is Capitalized` still schema", () => {
    const out = ts(`schema User { id: int }\nconst r = input is User`);
    expect(out).toMatch(/User\.parse\(input\)\.tag === "Ok"/);
    expect(out).not.toMatch(/=== "User"/);
  });

  test("lowercase-identifier RHS is untouched (not membership, not schema)", () => {
    const out = ts(`const is = 5; const r = is + 1;`);
    expect(out).toContain("const is = 5");
    expect(out).not.toContain("===");
  });

  test("in an `if` predicate", () => {
    expect(ts(`if (status is 'open' | 'pending') { go() }`)).toMatch(/status === "open" \|\| status === "pending"/);
  });
});
