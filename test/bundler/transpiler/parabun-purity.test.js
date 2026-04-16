import { describe, expect, it } from "bun:test";

describe("Parabun Purity Validator", () => {
  const transpiler = new Bun.Transpiler({
    loader: "ts",
  });

  describe("this restriction in pure functions", () => {
    it("rejects this in pure function declaration", () => {
      expect(() => transpiler.transformSync("pure function foo() { return this.x; }")).toThrow(
        /Cannot use "this" inside a pure function/,
      );
    });

    it("rejects this in pure async function declaration", () => {
      expect(() => transpiler.transformSync("pure async function foo() { return this.x; }")).toThrow(
        /Cannot use "this" inside a pure function/,
      );
    });

    it("rejects this in pure function expression", () => {
      expect(() => transpiler.transformSync("const f = pure function() { return this.x; };")).toThrow(
        /Cannot use "this" inside a pure function/,
      );
    });

    it("rejects this in pure arrow with block body", () => {
      expect(() => transpiler.transformSync("const f = pure (x) => { return this.y + x; };")).toThrow(
        /Cannot use "this" inside a pure function/,
      );
    });

    it("rejects this in pure single-param arrow", () => {
      expect(() => transpiler.transformSync("const f = pure x => this.y + x;")).toThrow(
        /Cannot use "this" inside a pure function/,
      );
    });

    it("rejects this in pure async arrow", () => {
      expect(() => transpiler.transformSync("const f = pure async (x) => { return this.y; };")).toThrow(
        /Cannot use "this" inside a pure function/,
      );
    });

    it("rejects this in pure async single-param arrow", () => {
      expect(() => transpiler.transformSync("const f = pure async x => this.y;")).toThrow(
        /Cannot use "this" inside a pure function/,
      );
    });
  });

  describe("this allowed in nested non-pure functions", () => {
    it("allows this in nested regular function inside pure function", () => {
      const out = transpiler.transformSync("pure function foo() { function bar() { return this.x; } return bar; }");
      expect(out).toContain("this.x");
    });

    it("allows this in nested method inside pure function", () => {
      const out = transpiler.transformSync("pure function foo() { return { bar() { return this.x; } }; }");
      expect(out).toContain("this.x");
    });
  });

  describe("this restriction inherited by inner arrows", () => {
    it("rejects this in arrow inside pure function", () => {
      expect(() => transpiler.transformSync("pure function foo() { const f = () => this.x; return f; }")).toThrow(
        /Cannot use "this" inside a pure function/,
      );
    });

    it("rejects this in nested arrow inside pure arrow", () => {
      expect(() => transpiler.transformSync("const f = pure (x) => { const g = () => this.y; return g; };")).toThrow(
        /Cannot use "this" inside a pure function/,
      );
    });
  });

  describe("valid pure functions (no errors)", () => {
    it("pure function with no this", () => {
      const out = transpiler.transformSync("pure function add(a, b) { return a + b; }");
      expect(out).toContain("function add");
      expect(out).toContain("a + b");
    });

    it("pure arrow with no this", () => {
      const out = transpiler.transformSync("const add = pure (a, b) => a + b;");
      expect(out).toContain("a + b");
    });

    it("pure async function with no this", () => {
      const out = transpiler.transformSync("pure async function compute(p) { return await p; }");
      expect(out).toContain("async function compute");
    });

    it("pure function calling other functions", () => {
      const out = transpiler.transformSync("pure function double(x) { return Math.abs(x) * 2; }");
      expect(out).toContain("Math.abs");
    });

    it("this in non-pure function is fine", () => {
      const out = transpiler.transformSync("function foo() { return this.x; }");
      expect(out).toContain("this.x");
    });
  });

  describe("arguments restriction in pure functions", () => {
    it("rejects arguments in pure function declaration", () => {
      expect(() => transpiler.transformSync("pure function foo() { return arguments.length; }")).toThrow(
        /Cannot use "arguments" inside a pure function/,
      );
    });

    it("rejects arguments in pure async function", () => {
      expect(() => transpiler.transformSync("pure async function foo() { return arguments[0]; }")).toThrow(
        /Cannot use "arguments" inside a pure function/,
      );
    });

    it("allows arguments in non-pure function", () => {
      const out = transpiler.transformSync("function foo() { return arguments.length; }");
      expect(out).toContain("arguments");
    });

    it("allows arguments in nested non-pure function inside pure", () => {
      const out = transpiler.transformSync(
        "pure function foo() { function bar() { return arguments.length; } return bar; }",
      );
      expect(out).toContain("arguments");
    });
  });

  describe("delete restriction in pure functions", () => {
    it("rejects delete on member in pure function", () => {
      expect(() => transpiler.transformSync("pure function foo(o) { delete o.x; return o; }")).toThrow(
        /Cannot use "delete" inside a pure function/,
      );
    });

    it("rejects delete in pure arrow", () => {
      expect(() => transpiler.transformSync("const f = pure (o) => { delete o.x; return o; };")).toThrow(
        /Cannot use "delete" inside a pure function/,
      );
    });

    it("allows delete in nested non-pure function inside pure", () => {
      const out = transpiler.transformSync("pure function foo(o) { function inner() { delete o.x; } return inner; }");
      expect(out).toContain("delete");
    });

    it("allows delete in non-pure function", () => {
      const out = transpiler.transformSync("function foo(o) { delete o.x; return o; }");
      expect(out).toContain("delete");
    });
  });

  describe("impure globals rejected in pure functions", () => {
    const bareGlobals = [
      "console",
      "fetch",
      "process",
      "globalThis",
      "setTimeout",
      "setInterval",
      "setImmediate",
      "queueMicrotask",
      "eval",
    ];
    for (const g of bareGlobals) {
      it(`rejects ${g} in pure function`, () => {
        expect(() => transpiler.transformSync(`pure function foo() { return ${g}; }`)).toThrow(
          new RegExp(`Cannot reference impure global "${g}" inside a pure function`),
        );
      });
    }

    it("rejects console.log call in pure function", () => {
      expect(() => transpiler.transformSync("pure function foo(x) { console.log(x); return x; }")).toThrow(
        /Cannot reference impure global "console"/,
      );
    });

    it("rejects direct eval call in pure function", () => {
      expect(() => transpiler.transformSync("pure function foo(s) { return eval(s); }")).toThrow(
        /Cannot reference impure global "eval"/,
      );
    });

    it("rejects direct eval with string literal in pure function", () => {
      expect(() => transpiler.transformSync('pure function foo() { return eval("1 + 1"); }')).toThrow(
        /Cannot reference impure global "eval"/,
      );
    });

    it("rejects direct eval in pure arrow", () => {
      expect(() => transpiler.transformSync("const f = pure (s) => eval(s);")).toThrow(
        /Cannot reference impure global "eval"/,
      );
    });

    it("allows eval in non-pure function", () => {
      const out = transpiler.transformSync("function foo(s) { return eval(s); }");
      expect(out).toContain("eval");
    });

    it("allows eval in nested non-pure function inside pure", () => {
      const out = transpiler.transformSync(
        "pure function foo() { function inner(s) { return eval(s); } return inner; }",
      );
      expect(out).toContain("eval");
    });

    const memberAccesses = [
      ["Math", "random"],
      ["Date", "now"],
      ["performance", "now"],
      ["crypto", "randomUUID"],
      ["crypto", "getRandomValues"],
    ];
    for (const [target, prop] of memberAccesses) {
      it(`rejects ${target}.${prop} in pure function`, () => {
        expect(() => transpiler.transformSync(`pure function foo() { return ${target}.${prop}(); }`)).toThrow(
          new RegExp(`Cannot reference impure "${target}\\.${prop}" inside a pure function`),
        );
      });
    }

    it("allows pure Math members (abs, max)", () => {
      const out = transpiler.transformSync("pure function foo(x) { return Math.abs(Math.max(x, 0)); }");
      expect(out).toContain("Math.abs");
      expect(out).toContain("Math.max");
    });

    it("allows impure globals in non-pure functions", () => {
      const out = transpiler.transformSync("function foo() { console.log(Math.random()); return Date.now(); }");
      expect(out).toContain("console.log");
      expect(out).toContain("Math.random");
      expect(out).toContain("Date.now");
    });

    it("allows impure globals in nested non-pure function inside pure", () => {
      const out = transpiler.transformSync(
        "pure function foo() { function inner() { return Date.now(); } return inner; }",
      );
      expect(out).toContain("Date.now");
    });
  });

  describe("parameter mutation rejected in pure functions", () => {
    it("rejects parameter reassignment with =", () => {
      expect(() => transpiler.transformSync("pure function foo(x) { x = 5; return x; }")).toThrow(
        /Cannot mutate parameter "x"/,
      );
    });

    it("rejects parameter compound assignment (+=)", () => {
      expect(() => transpiler.transformSync("pure function foo(x) { x += 1; return x; }")).toThrow(
        /Cannot mutate parameter "x"/,
      );
    });

    it("rejects parameter compound assignment (-=, *=, /=, %=, **=)", () => {
      const ops = ["-=", "*=", "/=", "%=", "**="];
      for (const op of ops) {
        expect(() => transpiler.transformSync(`pure function foo(x) { x ${op} 2; return x; }`)).toThrow(
          /Cannot mutate parameter "x"/,
        );
      }
    });

    it("rejects parameter bitwise compound assigns (|=, &=, ^=, <<=, >>=, >>>=)", () => {
      const ops = ["|=", "&=", "^=", "<<=", ">>=", ">>>="];
      for (const op of ops) {
        expect(() => transpiler.transformSync(`pure function foo(x) { x ${op} 1; return x; }`)).toThrow(
          /Cannot mutate parameter "x"/,
        );
      }
    });

    it("rejects parameter logical compound assigns (||=, &&=, ??=)", () => {
      const ops = ["||=", "&&=", "??="];
      for (const op of ops) {
        expect(() => transpiler.transformSync(`pure function foo(x) { x ${op} 1; return x; }`)).toThrow(
          /Cannot mutate parameter "x"/,
        );
      }
    });

    it("rejects postfix ++ on parameter", () => {
      expect(() => transpiler.transformSync("pure function foo(x) { x++; return x; }")).toThrow(
        /Cannot mutate parameter "x"/,
      );
    });

    it("rejects postfix -- on parameter", () => {
      expect(() => transpiler.transformSync("pure function foo(x) { x--; return x; }")).toThrow(
        /Cannot mutate parameter "x"/,
      );
    });

    it("rejects prefix ++ on parameter", () => {
      expect(() => transpiler.transformSync("pure function foo(x) { ++x; return x; }")).toThrow(
        /Cannot mutate parameter "x"/,
      );
    });

    it("rejects prefix -- on parameter", () => {
      expect(() => transpiler.transformSync("pure function foo(x) { --x; return x; }")).toThrow(
        /Cannot mutate parameter "x"/,
      );
    });

    it("rejects property write on parameter (x.y = 1)", () => {
      expect(() => transpiler.transformSync("pure function foo(x) { x.y = 1; return x; }")).toThrow(
        /Cannot mutate parameter "x"/,
      );
    });

    it("rejects nested property write on parameter (x.y.z = 1)", () => {
      expect(() => transpiler.transformSync("pure function foo(x) { x.y.z = 1; return x; }")).toThrow(
        /Cannot mutate parameter "x"/,
      );
    });

    it("rejects index write on parameter (x[0] = 1)", () => {
      expect(() => transpiler.transformSync("pure function foo(x) { x[0] = 1; return x; }")).toThrow(
        /Cannot mutate parameter "x"/,
      );
    });

    it("rejects property compound assign on parameter (x.y += 1)", () => {
      expect(() => transpiler.transformSync("pure function foo(x) { x.y += 1; return x; }")).toThrow(
        /Cannot mutate parameter "x"/,
      );
    });

    it("rejects postfix ++ on parameter property", () => {
      expect(() => transpiler.transformSync("pure function foo(x) { x.y++; return x; }")).toThrow(
        /Cannot mutate parameter "x"/,
      );
    });

    it("rejects multi-parameter mutation (second param)", () => {
      expect(() => transpiler.transformSync("pure function foo(a, b) { b = 5; return a; }")).toThrow(
        /Cannot mutate parameter "b"/,
      );
    });

    it("rejects parameter mutation in pure arrow", () => {
      expect(() => transpiler.transformSync("const f = pure (x) => { x = 5; return x; };")).toThrow(
        /Cannot mutate parameter "x"/,
      );
    });

    it("rejects parameter mutation in pure async function", () => {
      expect(() => transpiler.transformSync("pure async function foo(x) { x.y = 1; return x; }")).toThrow(
        /Cannot mutate parameter "x"/,
      );
    });

    it("rejects outer-param mutation via inherited-pure arrow", () => {
      expect(() => transpiler.transformSync("pure function foo(x) { const f = () => { x = 1; }; return f; }")).toThrow(
        /Cannot mutate parameter "x"/,
      );
    });

    it("allows pure function that reads parameter", () => {
      const out = transpiler.transformSync("pure function foo(x) { return x + 1; }");
      expect(out).toContain("x + 1");
    });

    it("allows pure function that uses parameter as function arg", () => {
      const out = transpiler.transformSync("pure function foo(x) { return Math.abs(x); }");
      expect(out).toContain("Math.abs(x)");
    });

    it("allows parameter mutation in non-pure function", () => {
      const out = transpiler.transformSync("function foo(x) { x = 5; return x; }");
      expect(out).toContain("x = 5");
    });

    it("allows parameter mutation in nested non-pure function inside pure", () => {
      const out = transpiler.transformSync(
        "pure function foo() { function inner(x) { x = 5; return x; } return inner; }",
      );
      expect(out).toContain("x = 5");
    });

    it("allows local variable mutation in pure function", () => {
      const out = transpiler.transformSync("pure function foo(x) { let y = x; y = x + 1; return y; }");
      expect(out).toContain("y = x + 1");
    });

    it("allows local counter increment in pure function", () => {
      const out = transpiler.transformSync("pure function foo(x) { let i = 0; i++; return i + x; }");
      expect(out).toContain("i++");
    });

    it("allows assigning to local that shadows outer name", () => {
      const out = transpiler.transformSync("pure function foo(x) { { let y = x; y = y + 1; return y; } }");
      expect(out).toContain("y = y + 1");
    });
  });
});
