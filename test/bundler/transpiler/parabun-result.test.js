import { describe, expect, test } from "bun:test";

function ts(code, options = {}) {
  return new Bun.Transpiler({
    loader: "tsx",
    ...options,
  }).transformSync(code);
}

describe("Parabun Result / Option", () => {
  describe("constructors", () => {
    test('Ok(x) → { tag: "Ok", value: x }', () => {
      const out = ts(`const r = Ok(42)`);
      expect(out).toContain('tag: "Ok"');
      expect(out).toContain("value: 42");
    });

    test('Err(e) → { tag: "Err", error: e }', () => {
      const out = ts(`const r = Err("bad")`);
      expect(out).toContain('tag: "Err"');
      expect(out).toContain('error: "bad"');
    });

    test('Some(x) → { tag: "Some", value: x }', () => {
      const out = ts(`const r = Some(7)`);
      expect(out).toContain('tag: "Some"');
      expect(out).toContain("value: 7");
    });

    test('None → { tag: "None" }', () => {
      const out = ts(`const r = None`);
      expect(out).toContain('tag: "None"');
    });

    test("Ok / Err / Some can wrap arbitrary expressions", () => {
      const out = ts(`
        const a = Ok({ x: 1, y: 2 })
        const b = Err(new Error("nope"))
        const c = Some([1, 2, 3])
      `);
      expect(out).toContain('"Ok"');
      expect(out).toContain('"Err"');
      expect(out).toContain('"Some"');
      expect(out).toContain("new Error");
    });

    test("Ok / Err / Some / None as identifiers (member access) still parse", () => {
      const out = ts(`
        const obj = { Ok: 1, Err: 2 }
        const x = obj.Ok
        const y = obj.Err
      `);
      expect(out).toContain("obj.Ok");
      expect(out).toContain("obj.Err");
    });
  });

  describe("match patterns", () => {
    test("Ok(x) / Err(e) destructure binds the inner field", () => {
      const out = ts(`
        const msg = match result {
          Ok(user) => "got " + user.name,
          Err(e) => "error: " + e
        }
      `);
      // Tag tests.
      expect(out).toMatch(/__pm\w*\$?\.tag === "Ok"/);
      expect(out).toMatch(/__pm\w*\$?\.tag === "Err"/);
      // user.name → __pm.value.name.
      expect(out).toMatch(/\.value\.name/);
      // e → __pm.error.
      expect(out).toMatch(/__pm\w*\$?\.error/);
    });

    test("Some(n) / None destructure", () => {
      const out = ts(`
        const v = match opt {
          Some(n) => n * 2,
          None => 0
        }
      `);
      expect(out).toMatch(/__pm\w*\$?\.tag === "Some"/);
      expect(out).toMatch(/__pm\w*\$?\.tag === "None"/);
      // n * 2 → __pm.value * 2.
      expect(out).toMatch(/\.value \* 2/);
    });

    test("Ok(_) matches without binding", () => {
      const out = ts(`
        const ok = match result {
          Ok(_) => true,
          _ => false
        }
      `);
      expect(out).toMatch(/__pm\w*\$?\.tag === "Ok"/);
      // No binding, no .value access required.
      expect(out).toContain("? true");
    });

    test("constructor without parens matches tag only", () => {
      const out = ts(`
        const x = match opt {
          None => "empty",
          _ => "filled"
        }
      `);
      expect(out).toMatch(/__pm\w*\$?\.tag === "None"/);
    });

    test("mixed Ok / Err / None arms in same match", () => {
      const out = ts(`
        const r = match res {
          Ok(v) => "got " + v,
          Err(e) => "err: " + e,
          None => "missing",
          _ => "fallback"
        }
      `);
      expect(out).toMatch(/\.tag === "Ok"/);
      expect(out).toMatch(/\.tag === "Err"/);
      expect(out).toMatch(/\.tag === "None"/);
    });
  });
});
