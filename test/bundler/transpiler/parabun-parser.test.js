import { describe, expect, it } from "bun:test";

describe("Parabun Parser", () => {
  const transpiler = new Bun.Transpiler({
    loader: "ts",
  });

  describe("..! (catch operator)", () => {
    it("desugars to .catch()", () => {
      const out = transpiler.transformSync("const x = promise ..! handler;");
      expect(out).toContain(".catch(handler)");
    });

    it("works with function reference", () => {
      const out = transpiler.transformSync("const x = promise ..! console.error;");
      expect(out).toContain(".catch(console.error)");
    });

    it("chains with ..&", () => {
      const out = transpiler.transformSync("const x = promise ..! handler ..& cleanup;");
      expect(out).toContain(".catch(handler)");
      expect(out).toContain(".finally(cleanup)");
    });

    it("chains multiple ..!", () => {
      const out = transpiler.transformSync("const x = promise ..! first ..! second;");
      expect(out).toContain(".catch(first)");
      expect(out).toContain(".catch(second)");
    });
  });

  describe("..& (finally operator)", () => {
    it("desugars to .finally()", () => {
      const out = transpiler.transformSync("const x = promise ..& cleanup;");
      expect(out).toContain(".finally(cleanup)");
    });

    it("works with function reference", () => {
      const out = transpiler.transformSync("const x = promise ..& done;");
      expect(out).toContain(".finally(done)");
    });
  });

  describe("|> (pipe operator)", () => {
    it("desugars to function call", () => {
      const out = transpiler.transformSync("const x = value |> transform;");
      expect(out).toContain("transform(value)");
    });

    it("chains left to right", () => {
      const out = transpiler.transformSync("const x = value |> first |> second;");
      expect(out).toContain("second(first(value))");
    });

    it("works with method references", () => {
      const out = transpiler.transformSync("const x = value |> JSON.stringify;");
      expect(out).toContain("JSON.stringify(value)");
    });
  });

  describe("operator combinations", () => {
    it("|> binds tighter than ..!", () => {
      // data |> transform ..! handler → transform(data).catch(handler)
      const out = transpiler.transformSync("const x = data |> transform ..! handler;");
      expect(out).toContain("transform(data)");
      expect(out).toContain(".catch(handler)");
    });

    it("|> binds tighter than ..&", () => {
      const out = transpiler.transformSync("const x = data |> transform ..& cleanup;");
      expect(out).toContain("transform(data)");
      expect(out).toContain(".finally(cleanup)");
    });

    it("full chain: |> then ..! then ..&", () => {
      const out = transpiler.transformSync("const x = data |> process ..! handler ..& cleanup;");
      expect(out).toContain("process(data)");
      expect(out).toContain(".catch(handler)");
      expect(out).toContain(".finally(cleanup)");
    });
  });
});
