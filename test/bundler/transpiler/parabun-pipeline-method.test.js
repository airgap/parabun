import { describe, expect, it } from "bun:test";

// Parabun: method shorthand in pipeline.
//   x |> .method()         desugars to  x.method()
//   x |> .prop             desugars to  x.prop
//   x |> .a.b.c()          desugars to  x.a.b.c()
// The trailing call / chain is handled by the regular suffix-operator
// loop, so any combination of `.prop`, `[idx]`, `(args)` that follows
// works without additional wiring.
describe("Parabun pipeline method shorthand", () => {
  const transpiler = new Bun.Transpiler({ loader: "ts" });

  describe("parse-time desugar", () => {
    it("desugars x |> .json() to x.json()", () => {
      const out = transpiler.transformSync(`const out = response |> .json();`);
      expect(out).toContain("response.json()");
    });

    it("desugars x |> .trim() to x.trim()", () => {
      const out = transpiler.transformSync(`const trimmed = input |> .trim();`);
      expect(out).toContain("input.trim()");
    });

    it("desugars x |> .prop (no call) to x.prop", () => {
      const out = transpiler.transformSync(`const name = user |> .name;`);
      expect(out).toContain("user.name");
    });

    it("chains method shorthand calls", () => {
      const out = transpiler.transformSync(`const list = csv |> .trim() |> .split(",");`);
      expect(out).toContain('csv.trim().split(",")');
    });

    it("passes arguments through shorthand", () => {
      const out = transpiler.transformSync(`const out = arr |> .map(x => x * 2);`);
      expect(out).toContain("arr.map((x) => x * 2)");
    });

    it("chains property access after method shorthand", () => {
      const out = transpiler.transformSync(`const n = response |> .headers.get("x-count");`);
      expect(out).toContain("response.headers.get(");
    });

    it("mixes shorthand with function-style pipeline", () => {
      const out = transpiler.transformSync(`const out = input |> .trim() |> parseInt;`);
      expect(out).toContain("parseInt(input.trim())");
    });

    it("mixes function-style then shorthand", () => {
      const out = transpiler.transformSync(`const out = JSON.parse(raw) |> .items.length;`);
      // JSON.parse(raw).items.length
      expect(out).toContain(".items.length");
    });

    it("keyword identifiers after the dot are allowed (e.g. .default)", () => {
      // JS allows reserved words after `.` — method shorthand must too.
      const out = transpiler.transformSync(`const v = mod |> .default;`);
      expect(out).toContain("mod.default");
    });
  });

  describe("runtime behavior", () => {
    function run(src) {
      const js = transpiler.transformSync(src);
      return new Function(js + "; return output;")();
    }

    it("calls the method on the piped value", () => {
      const got = run(`const output = "  hi  " |> .trim();`);
      expect(got).toBe("hi");
    });

    it("returns the property of the piped value", () => {
      const got = run(`const output = { x: 42 } |> .x;`);
      expect(got).toBe(42);
    });

    it("chains multiple method-shorthand steps", () => {
      const got = run(`const output = "a,b,c" |> .split(",") |> .map(s => s.toUpperCase()) |> .join("-");`);
      expect(got).toBe("A-B-C");
    });

    it("passes the piped value as the implicit receiver (this)", () => {
      const got = run(`
        const obj = { scale: 10, go(x) { return x * this.scale; } };
        const output = obj |> .go(3);
      `);
      expect(got).toBe(30);
    });

    it("does not double-evaluate the piped expression", () => {
      const got = run(`
        let count = 0;
        const make = () => { count++; return "  hi  "; };
        make() |> .trim();
        const output = count;
      `);
      expect(got).toBe(1);
    });
  });

  describe("composition with existing extensions", () => {
    it("composes with ..= (await-assign)", () => {
      const out = transpiler.transformSync(
        `async function f(res) {
           const data ..= (await res) |> .json();
         }`,
      );
      expect(out).toContain("await");
      expect(out).toContain(".json()");
    });

    it("composes with ..! (catch)", () => {
      const out = transpiler.transformSync(`const v = promise |> .then(next) ..! handler;`);
      expect(out).toContain(".then(next)");
      expect(out).toContain(".catch(handler)");
    });

    it("does not break standard `|>` (function-target) form", () => {
      // Confirm the fall-through path is still intact.
      const out = transpiler.transformSync(`const y = x |> transform;`);
      expect(out).toContain("transform(x)");
    });
  });
});
