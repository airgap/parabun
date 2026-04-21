import { describe, expect, it } from "bun:test";

// Parabun: placeholder substitution in pipelines.
//   x |> f(_, 2)         desugars to  f(x, 2)
//   x |> obj.m(_, 2)     desugars to  obj.m(x, 2)
//   x |> f(_)            desugars to  f(x)
//   x |> f(_, _)         desugars to  f(x, x)  (LHS is copied structurally)
//
// When the RHS is NOT a call, or has no `_`, the existing behavior is
// preserved: `x |> f` still desugars to `f(x)`.
describe("Parabun pipeline placeholder", () => {
  const transpiler = new Bun.Transpiler({ loader: "ts" });

  describe("parse-time desugar", () => {
    it("substitutes a single _ in a call", () => {
      const out = transpiler.transformSync(`const out = users |> filter(_, isActive);`);
      expect(out).toContain("filter(users, isActive)");
    });

    it("substitutes _ in trailing position", () => {
      const out = transpiler.transformSync(`const out = input |> parseInt(_, 10);`);
      expect(out).toContain("parseInt(input, 10)");
    });

    it("substitutes _ in leading position of a multi-arg call", () => {
      const out = transpiler.transformSync(`const out = buffer |> write(_, "hello", { flush: true });`);
      expect(out).toContain("write(buffer,");
    });

    it("substitutes _ in a member call (obj.method)", () => {
      const out = transpiler.transformSync(`const out = arr |> lodash.filter(_, isActive);`);
      expect(out).toContain("lodash.filter(arr, isActive)");
    });

    it("substitutes multiple _ placeholders", () => {
      const out = transpiler.transformSync(`const out = n |> add(_, _);`);
      expect(out).toContain("add(n, n)");
    });

    it("chains placeholder pipelines", () => {
      const out = transpiler.transformSync(`const out = users |> filter(_, isActive) |> map(_, project);`);
      expect(out).toContain("map(filter(users, isActive), project)");
    });

    it("leaves bare function-target pipeline unchanged", () => {
      const out = transpiler.transformSync(`const out = x |> transform;`);
      expect(out).toContain("transform(x)");
    });

    it("leaves a call with no _ as current behavior (RHS callable)", () => {
      // `x |> f(y)` has no placeholder, so RHS is a call value that becomes
      // the pipeline target → `f(y)(x)`.
      const out = transpiler.transformSync(`const out = x |> f(y);`);
      expect(out).toContain("f(y)(x)");
    });

    it("does not treat a nested _ as a top-level placeholder", () => {
      // `_` appears only inside an arrow body — not a top-level arg — so
      // RHS becomes the pipeline target.
      const out = transpiler.transformSync(`const out = x |> f((y) => y + _);`);
      // The outer call has no top-level `_`, so fall through: f(arrow)(x)
      expect(out).toContain("f((y) => y + _)(x)");
    });

    it("composes with method shorthand (placeholder in method args)", () => {
      // `arr |> .filter(_, pred)` — method shorthand path doesn't scan args
      // for placeholders, but the surrounding shape is `arr.filter(_, pred)`
      // which is still legal JS (if `_` is in scope). Document the no-op.
      const out = transpiler.transformSync(`const out = arr |> .filter(x => x > 0);`);
      expect(out).toContain("arr.filter(");
    });
  });

  describe("runtime behavior", () => {
    function run(src) {
      const js = transpiler.transformSync(src);
      return new Function(js + "; return output;")();
    }

    it("single _ substitution evaluates piped value at the placeholder position", () => {
      const got = run(`
        function add(a, b) { return a + b; }
        const output = 3 |> add(_, 4);
      `);
      expect(got).toBe(7);
    });

    it("multiple _ substitutions receive the same piped value", () => {
      const got = run(`
        function mul(a, b) { return a * b; }
        const output = 5 |> mul(_, _);
      `);
      expect(got).toBe(25);
    });

    it("_ works with member call targets", () => {
      const got = run(`
        const lib = { join(sep, ...parts) { return parts.join(sep); } };
        const output = "-" |> lib.join(_, "a", "b", "c");
      `);
      expect(got).toBe("a-b-c");
    });

    it("chains placeholder pipelines left-to-right", () => {
      const got = run(`
        function filter(arr, pred) { return arr.filter(pred); }
        function map(arr, fn) { return arr.map(fn); }
        const output = [1, 2, 3, 4]
          |> filter(_, n => n % 2 === 0)
          |> map(_, n => n * 10);
      `);
      expect(got).toEqual([20, 40]);
    });

    it("does not break the function-style pipeline (no placeholder)", () => {
      const got = run(`
        const double = (x) => x * 2;
        const output = 21 |> double;
      `);
      expect(got).toBe(42);
    });
  });

  describe("composition with existing extensions", () => {
    it("composes with ..= (await-assign)", () => {
      const out = transpiler.transformSync(
        `async function f(res) {
           const data ..= parse(_, { strict: true });
         }`,
      );
      // `_` here is not in a pipeline RHS — it's just an identifier. Make
      // sure placeholder substitution doesn't leak outside `|>`.
      expect(out).toContain("await");
      expect(out).toContain("parse(_,");
    });

    it("composes with ..! (catch) downstream of a placeholder pipeline", () => {
      const out = transpiler.transformSync(`const v = payload |> parse(_, opts) ..! handler;`);
      expect(out).toContain("parse(payload, opts)");
      expect(out).toContain(".catch(handler)");
    });

    it("_ outside a pipeline RHS is still a regular identifier", () => {
      // Raw `const _ = 5; f(_)` must compile unchanged.
      const out = transpiler.transformSync(`const _ = 5; const out = f(_);`);
      expect(out).toContain("const _ = 5");
      expect(out).toContain("f(_)");
    });
  });
});
