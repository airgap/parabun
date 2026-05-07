import { describe, expect, test } from "bun:test";

function ts(code, options = {}) {
  return new Bun.Transpiler({
    loader: "tsx",
    ...options,
  }).transformSync(code);
}

describe("Parabun model declaration", () => {
  test("simple model produces a const with a parse function", () => {
    const out = ts(`
      model User {
        id: int,
        name: str
      }
    `);
    expect(out).toContain("const User =");
    expect(out).toContain("parse:");
  });

  test("primitive type checks: int/str/bool/float", () => {
    const out = ts(`
      model Item {
        id: int,
        name: str,
        active: bool,
        price: float
      }
    `);
    // int → typeof + Number.isInteger
    expect(out).toContain('typeof v.id !== "number"');
    expect(out).toContain("Number.isInteger(v.id)");
    // str → typeof "string"
    expect(out).toContain('typeof v.name !== "string"');
    // bool → typeof "boolean"
    expect(out).toContain('typeof v.active !== "boolean"');
    // float → typeof "number" (any number)
    expect(out).toContain('typeof v.price !== "number"');
  });

  test("optional fields skip the check when null/undefined", () => {
    const out = ts(`
      model User {
        id: int,
        name: str?
      }
    `);
    // Optional gets gated by `!== undefined && !== null`.
    expect(out).toContain("v.name !== undefined");
    expect(out).toContain("v.name !== null");
  });

  test("returns Ok({ ...v }) on success, Err(msg) on failure", () => {
    const out = ts(`
      model X { id: int }
    `);
    expect(out).toContain('tag: "Ok"');
    expect(out).toContain("value: v");
    expect(out).toContain('tag: "Err"');
    expect(out).toContain("expected object");
    expect(out).toContain("id: expected int");
  });

  // `export model X { ... }` is a known limitation — the export
  // handling recognizes a fixed set of statement kinds and `model` isn't
  // wired into that yet. Workaround: declare then re-export.
  test("model can be re-exported via export clause", () => {
    const out = ts(`
      model User { id: int }
      export { User }
    `);
    expect(out).toContain("export ");
    expect(out).toContain("User");
  });

  test("model name as identifier still works (no following `{`)", () => {
    const out = ts(`
      const model = "string named model";
      console.log(model);
    `);
    expect(out).toContain('const model = "string');
  });

  test("trailing semicolon between fields accepted", () => {
    const out = ts(`
      model User {
        id: int;
        name: str;
      }
    `);
    expect(out).toContain("typeof v.id");
    expect(out).toContain("typeof v.name");
  });

  test("Uses Result-typed return — compatible with match", () => {
    const out = ts(`
      model User { id: int }
      const r = User.parse(input)
      const msg = match r {
        Ok(u) => "ok " + u.id,
        Err(e) => "bad: " + e
      }
    `);
    expect(out).toContain("User.parse(input)");
    expect(out).toMatch(/\.tag === "Ok"/);
    expect(out).toMatch(/\.tag === "Err"/);
  });
});
