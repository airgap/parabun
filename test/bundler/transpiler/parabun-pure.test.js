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

  describe("nested pure arrow in pure function", () => {
    it("allows arrow params inside pure function", () => {
      const out = transpiler.transformSync(
        "export pure function cfloor(decimals = 0) {\n" +
          "  const imprecision = Math.pow(10, decimals);\n" +
          "  return pure (n) => Math.floor(n * imprecision) / imprecision;\n" +
          "}",
      );
      expect(out).toContain("function cfloor");
      expect(out).toContain("Math.floor(n * imprecision)");
    });

    it("allows expression-body arrow params as non-free", () => {
      const out = transpiler.transformSync("pure function f(x) { return pure (y) => x + y; }");
      expect(out).toContain("x + y");
    });
  });

  describe("pure generic arrow functions", () => {
    it("parses pure <T>(array: T[]): T[] => expr", () => {
      const out = transpiler.transformSync("export const unique = pure <T>(array: T[]): T[] => [...new Set(array)];");
      expect(out).toContain("=>");
      expect(out).toContain("new Set(array)");
    });

    it("parses pure <T, U>(a: T, b: U) => expr", () => {
      const out = transpiler.transformSync("const pair = pure <T, U>(a: T, b: U) => [a, b] as const;");
      expect(out).toContain("=>");
      expect(out).toContain("[a, b]");
    });

    it("parses pure async <T>(x: T) => expr", () => {
      const out = transpiler.transformSync("const wrap = pure async <T>(x: T) => x;");
      expect(out).toContain("async");
      expect(out).toContain("=>");
    });

    it("parses pure <T extends number>(x: T) => expr", () => {
      const out = transpiler.transformSync("const id = pure <T extends number>(x: T) => x;");
      expect(out).toContain("=>");
    });
  });
});
