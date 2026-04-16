import { describe, expect, it } from "bun:test";

describe("Parabun Pure Keyword", () => {
  const transpiler = new Bun.Transpiler({
    loader: "ts",
  });

  describe("pure function declarations", () => {
    it("parses pure function statement", () => {
      const out = transpiler.transformSync("pure function add(a, b) { return a + b; }");
      expect(out).toContain("function add");
      expect(out).toContain("return a + b");
    });

    it("parses pure async function statement", () => {
      const out = transpiler.transformSync("pure async function await1(p) { return await p; }");
      expect(out).toContain("async function await1");
      expect(out).toContain("await p");
    });

    it("parses export pure function", () => {
      const out = transpiler.transformSync("export pure function add(a, b) { return a + b; }");
      expect(out).toContain("function add");
    });

    it("parses export pure async function", () => {
      const out = transpiler.transformSync("export pure async function await1(p) { return await p; }");
      expect(out).toContain("async function await1");
    });
  });

  describe("pure function expressions", () => {
    it("parses pure function expression", () => {
      const out = transpiler.transformSync("const add = pure function(a, b) { return a + b; };");
      expect(out).toContain("function(a, b)");
    });

    it("parses pure async function expression", () => {
      const out = transpiler.transformSync("const f = pure async function(p) { return await p; };");
      expect(out).toContain("async function");
    });
  });

  describe("pure arrow functions", () => {
    it("parses pure arrow with parens", () => {
      const out = transpiler.transformSync("const add = pure (a, b) => a + b;");
      expect(out).toContain("=>");
      expect(out).toContain("a + b");
    });

    it("parses pure single-param arrow", () => {
      const out = transpiler.transformSync("const double = pure x => x * 2;");
      expect(out).toContain("=>");
      expect(out).toContain("x * 2");
    });

    it("parses pure async arrow with parens", () => {
      const out = transpiler.transformSync("const f = pure async (p) => await p;");
      expect(out).toContain("async");
      expect(out).toContain("=>");
      expect(out).toContain("await p");
    });

    it("parses pure async single-param arrow", () => {
      const out = transpiler.transformSync("const f = pure async p => await p;");
      expect(out).toContain("async");
      expect(out).toContain("=>");
      expect(out).toContain("await p");
    });
  });

  describe("pure as identifier still works", () => {
    it("pure as variable name", () => {
      const out = transpiler.transformSync("const pure = 42;");
      expect(out).toContain("pure = 42");
    });

    it("pure as property", () => {
      const out = transpiler.transformSync("obj.pure = true;");
      expect(out).toContain("obj.pure");
    });
  });

  describe("combinations with other Parabun operators", () => {
    it("pure function with ..= inside", () => {
      const out = transpiler.transformSync("pure async function getData(p) { const result ..= p; return result; }");
      expect(out).toContain("async function getData");
      expect(out).toContain("__parabunPeek");
    });
  });
});
