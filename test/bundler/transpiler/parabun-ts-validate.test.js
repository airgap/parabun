import { describe, expect, test } from "bun:test";

function ts(code, options = {}) {
  return new Bun.Transpiler({
    loader: "tsx",
    ...options,
  }).transformSync(code);
}

describe("Parabun `::` validates against TS interfaces / type aliases", () => {
  test("`interface Durr { id: number }` + `(arg:: Durr)` → typeof checks", () => {
    const out = ts(`
      interface Durr { id: number }
      function foo(hurr:: Durr) { return hurr.id }
    `);
    // Object check + per-field typeof check.
    expect(out).toContain('typeof hurr !== "object"');
    expect(out).toContain('typeof hurr.id !== "number"');
    expect(out).toContain("throw new Error");
    // Should NOT call Durr.parse (no model exists).
    expect(out).not.toContain("Durr.parse");
  });

  test("`type Durr = { id: number }` form works the same", () => {
    const out = ts(`
      type Durr = { id: number }
      function foo(d:: Durr) { return d.id }
    `);
    expect(out).toContain('typeof d.id !== "number"');
    expect(out).not.toContain("Durr.parse");
  });

  test("optional fields gate the typeof check", () => {
    const out = ts(`
      interface Durr { id: number, bio?: string }
      function foo(d:: Durr) { return d.id }
    `);
    expect(out).toContain("d.bio !== undefined");
    expect(out).toContain('typeof d.bio !== "string"');
  });

  test("interfaces with `extends` skip auto-validation (out of v0 scope)", () => {
    const out = ts(`
      interface Base { id: number }
      interface Derived extends Base { name: string }
      function foo(d:: Derived) { return d.id }
    `);
    // Falls back to Type.parse since extends-based inheritance is unsupported.
    expect(out).toContain("Derived.parse(d)");
  });

  test("interfaces with method signatures skip auto-validation", () => {
    const out = ts(`
      interface Box { value: number; getValue(): number }
      function foo(b:: Box) { return b.value }
    `);
    // Method signature triggers unsupported, falls back to Type.parse.
    expect(out).toContain("Box.parse(b)");
  });

  test("multiple primitive types in one interface", () => {
    const out = ts(`
      interface All { n: number, s: string, b: boolean, big: bigint }
      function foo(a:: All) { return a.n }
    `);
    expect(out).toContain('typeof a.n !== "number"');
    expect(out).toContain('typeof a.s !== "string"');
    expect(out).toContain('typeof a.b !== "boolean"');
    expect(out).toContain('typeof a.big !== "bigint"');
  });

  test("Para `model` still wins over a same-named interface", () => {
    // If both exist, the interface registry path runs (model isn't
    // tracked parser-side). User shouldn't have both anyway.
    const out = ts(`
      interface User { id: number }
      function foo(u:: User) { return u.id }
    `);
    // typeof check, not User.parse — we don't track models in registry,
    // so the registry hit short-circuits to typeof checks.
    expect(out).toContain('typeof u.id !== "number"');
  });
});
