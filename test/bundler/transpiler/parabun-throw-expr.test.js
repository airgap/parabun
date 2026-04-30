import { describe, expect, it } from "bun:test";

// Parabun extension: `throw` as an expression.
// Desugar: `throw E`  →  `(() => { throw E; })()`
// Valid anywhere an expression is expected. Behaves like TC39 stage-2
// throw-expression proposal (binds at AssignmentExpression level — does
// not absorb trailing `,`).
describe("Parabun throw expression", () => {
  const transpiler = new Bun.Transpiler({ loader: "ts" });

  describe("parse-time desugar", () => {
    it("desugars throw-expr on RHS of ?? to an IIFE", () => {
      const out = transpiler.transformSync(`const name = maybeName ?? throw new Error("missing");`);
      // Must contain the throw keyword (still thrown at runtime).
      expect(out).toContain("throw");
      // IIFE shape: an arrow or function call wrapping the throw.
      expect(out).toMatch(/\(\s*\(\s*\)\s*=>\s*\{[^}]*throw/);
    });

    it("desugars throw-expr on RHS of ||", () => {
      const out = transpiler.transformSync(`const n = parseInt(raw) || throw "bad number";`);
      expect(out).toContain("throw");
      expect(out).toMatch(/=>\s*\{[^}]*throw/);
    });

    it("desugars throw-expr on RHS of && (as guard)", () => {
      const out = transpiler.transformSync(`const ok = invalid(x) && throw new Error("bad");`);
      expect(out).toContain("throw");
      expect(out).toMatch(/=>\s*\{[^}]*throw/);
    });

    it("desugars throw-expr in ternary branches", () => {
      const out = transpiler.transformSync(`const v = cond ? x : throw new Error("no fallback");`);
      expect(out).toContain("throw");
    });

    it("desugars throw-expr in parenthesized position", () => {
      const out = transpiler.transformSync(`const f = () => (throw new Error("bang"));`);
      expect(out).toContain("throw");
      expect(out).toMatch(/=>\s*\{[^}]*throw/);
    });

    it("desugars throw-expr as arrow body", () => {
      // `x => throw new Error(x)` — the arrow's body is a throw-expr.
      const out = transpiler.transformSync(`const fail = x => throw new Error(x);`);
      expect(out).toContain("throw");
    });

    it("does not break regular throw statements", () => {
      const out = transpiler.transformSync(`function f() { throw new Error("still a statement"); }`);
      expect(out).toContain("throw");
      expect(out).toContain(`"still a statement"`);
    });

    it("rejects newline immediately after throw (ASI preservation)", () => {
      // ASI rule from the statement form carries over — `throw` followed
      // by a newline is a syntax error, even in expression position.
      expect(() => transpiler.transformSync("const x = y ?? throw\nnew Error('bad');")).toThrow();
    });
  });

  describe("runtime behavior via Bun.Transpiler + new Function", () => {
    // Use Function() to evaluate the desugared code at runtime. This is the
    // round-trip check: after desugar, the code must throw the intended value.
    function run(src) {
      const js = transpiler.transformSync(src);
      return new Function(js + "; return output;")();
    }

    it("throws when ?? right-hand fires", () => {
      expect(() => run(`const x = null ?? throw new Error("fallback"); let output = x;`)).toThrow("fallback");
    });

    it("does not throw when ?? left-hand provides value", () => {
      const got = run(`const x = "fine" ?? throw new Error("should not throw"); let output = x;`);
      expect(got).toBe("fine");
    });

    it("throws when || right-hand fires on falsy", () => {
      expect(() => run(`const x = 0 || throw new Error("zero not allowed"); let output = x;`)).toThrow(
        "zero not allowed",
      );
    });

    it("throws non-Error values", () => {
      expect(() => run(`const x = null ?? throw "plain string"; let output = x;`)).toThrow("plain string");
    });

    it("evaluates the thrown expression lazily", () => {
      // The LHS is truthy, so the RHS must not be evaluated — if it were, the
      // side-effecting counter would increment.
      const got = run(`
        let counter = 0;
        const build = () => { counter++; return new Error("no"); };
        const x = "ok" ?? throw build();
        let output = counter;
      `);
      expect(got).toBe(0);
    });
  });

  describe("composition with other Parabun extensions", () => {
    it("composes with |> pipeline (throw-expr as pipeline RHS argument)", () => {
      // `throw` is not a callable, so using it as the entire RHS of `|>` is
      // not meaningful. But inside a parenthesized expression inside a
      // pipeline argument, it should parse.
      const out = transpiler.transformSync(`const y = x |> (v => v ?? throw new Error("nope"));`);
      expect(out).toContain("throw");
    });
  });
});
