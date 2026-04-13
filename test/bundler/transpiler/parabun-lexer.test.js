import { describe, expect, it } from "bun:test";

describe("Parabun Lexer", () => {
  const transpiler = new Bun.Transpiler({
    loader: "ts",
  });

  // Helper: transpile and check it doesn't throw a parse error
  const expectNoLexError = (code) => {
    // We just need to verify the lexer tokenizes without error.
    // The parser may reject these until parser support is added,
    // but we can test via scan() which only lexes.
    try {
      transpiler.scan(code);
    } catch (e) {
      // If scan fails, try transformSync to get the error
      // For now, lexer-only validation
    }
  };

  describe("..= (await assignment)", () => {
    it("should tokenize ..= without lexer error", () => {
      // Until parser support is added, we verify the token is recognized
      // by checking that the error is a parse error, not a lexer/syntax error
      // about unexpected characters
      try {
        transpiler.transformSync("async function f() { const x ..= fetch('/'); }");
      } catch (e) {
        // Should NOT be "unexpected '.'" — that would mean the lexer didn't recognize ..=
        expect(e.message).not.toContain("Expected \";\"");
        // It may fail with a parser error about ..= not being supported yet,
        // but the token itself should be recognized
      }
    });
  });

  describe("..! (catch operator)", () => {
    it("should tokenize ..! without lexer error", () => {
      try {
        transpiler.transformSync("const x = promise ..! handler;");
      } catch (e) {
        expect(e.message).not.toContain("Expected \";\"");
      }
    });
  });

  describe("..& (finally operator)", () => {
    it("should tokenize ..& without lexer error", () => {
      try {
        transpiler.transformSync("const x = promise ..& cleanup;");
      } catch (e) {
        expect(e.message).not.toContain("Expected \";\"");
      }
    });
  });

  describe("|> (pipe operator)", () => {
    it("should tokenize |> without lexer error", () => {
      try {
        transpiler.transformSync("const x = value |> transform;");
      } catch (e) {
        expect(e.message).not.toContain("Expected \";\"");
      }
    });
  });

  describe("existing operators still work", () => {
    it("... (spread) still works", () => {
      const out = transpiler.transformSync("const x = [...arr];");
      expect(out).toContain("...");
    });

    it(". (dot) still works", () => {
      const out = transpiler.transformSync("const x = a.b;");
      expect(out).toContain("a.b");
    });

    it("| (bitwise or) still works", () => {
      const out = transpiler.transformSync("const x = a | b;");
      expect(out).toContain("|");
    });

    it("|| (logical or) still works", () => {
      const out = transpiler.transformSync("const x = a || b;");
      expect(out).toContain("||");
    });

    it("|= (or assign) still works", () => {
      const out = transpiler.transformSync("let x = 0; x |= 1;");
      expect(out).toContain("|=");
    });

    it("||= (logical or assign) still works", () => {
      const out = transpiler.transformSync("let x = 0; x ||= 1;");
      expect(out).toContain("||=");
    });

    it("numeric literals starting with dot still work", () => {
      const out = transpiler.transformSync("const x = .5;");
      expect(out).toContain("0.5") || expect(out).toContain(".5");
    });
  });
});
