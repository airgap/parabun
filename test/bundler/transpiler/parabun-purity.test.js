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

    it("rejects Date() call in pure function", () => {
      expect(() => transpiler.transformSync("pure function foo() { return Date(); }")).toThrow(
        /Cannot call "Date\(\)"/,
      );
    });

    it("rejects new Date() in pure function", () => {
      expect(() => transpiler.transformSync("pure function foo() { return new Date(); }")).toThrow(
        /Cannot call "new Date\(\)"/,
      );
    });

    it("rejects Date() with args in pure function", () => {
      expect(() => transpiler.transformSync('pure function foo() { return Date("2024-01-01"); }')).toThrow(
        /Cannot call "Date\(\)"/,
      );
    });

    it("allows new Date(timestamp) in pure function (deterministic)", () => {
      const out = transpiler.transformSync("pure function foo(ts) { return new Date(ts); }");
      expect(out).toContain("new Date(ts)");
    });

    it("allows Date() in non-pure function", () => {
      const out = transpiler.transformSync("function foo() { return Date(); }");
      expect(out).toContain("Date()");
    });

    it("allows Date.parse in pure function (deterministic)", () => {
      const out = transpiler.transformSync("pure function foo(s) { return Date.parse(s); }");
      expect(out).toContain("Date.parse");
    });

    it("allows Date.UTC in pure function (deterministic)", () => {
      const out = transpiler.transformSync("pure function foo(y, m) { return Date.UTC(y, m); }");
      expect(out).toContain("Date.UTC");
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

  describe("destructured parameter mutation rejected in pure functions", () => {
    it("rejects reassignment of object-destructured param", () => {
      expect(() => transpiler.transformSync("pure function foo({a, b}) { a = 5; return b; }")).toThrow(
        /Cannot mutate parameter "a"/,
      );
    });

    it("rejects reassignment of second destructured param", () => {
      expect(() => transpiler.transformSync("pure function foo({a, b}) { b = 5; return a; }")).toThrow(
        /Cannot mutate parameter "b"/,
      );
    });

    it("rejects property write on destructured param", () => {
      expect(() => transpiler.transformSync("pure function foo({a}) { a.x = 1; return a; }")).toThrow(
        /Cannot mutate parameter "a"/,
      );
    });

    it("rejects reassignment of array-destructured param", () => {
      expect(() => transpiler.transformSync("pure function foo([a, b]) { a = 5; return b; }")).toThrow(
        /Cannot mutate parameter "a"/,
      );
    });

    it("rejects reassignment of nested destructured param", () => {
      expect(() => transpiler.transformSync("pure function foo({x: {y}}) { y = 5; return y; }")).toThrow(
        /Cannot mutate parameter "y"/,
      );
    });

    it("rejects mutation in pure arrow with destructured params", () => {
      expect(() => transpiler.transformSync("const f = pure ({a}) => { a = 1; return a; };")).toThrow(
        /Cannot mutate parameter "a"/,
      );
    });

    it("allows reading destructured params in pure function", () => {
      const out = transpiler.transformSync("pure function foo({a, b}) { return a + b; }");
      expect(out).toContain("a + b");
    });

    it("allows reading array-destructured params in pure function", () => {
      const out = transpiler.transformSync("pure function foo([a, b]) { return a * b; }");
      expect(out).toContain("a * b");
    });
  });

  describe("free variable detection in pure functions", () => {
    it("allows reference to outer const variable", () => {
      const out = transpiler.transformSync("const x = 10; pure function foo() { return x; }");
      expect(out).toContain("return x");
    });

    it("allows reference to outer let variable", () => {
      const out = transpiler.transformSync("let x = 10; pure function foo() { return x; }");
      expect(out).toContain("return x");
    });

    it("allows reference to outer var variable", () => {
      const out = transpiler.transformSync("var x = 10; pure function foo() { return x; }");
      expect(out).toContain("return x");
    });

    it("allows reference to outer function", () => {
      const out = transpiler.transformSync("function bar() {} pure function foo() { return bar(); }");
      expect(out).toContain("bar()");
    });

    it("allows inner arrow capturing outer-scope declared variable", () => {
      const out = transpiler.transformSync("let outer = 1; pure function foo() { const f = () => outer; return f(); }");
      expect(out).toContain("outer");
    });

    it("allows undeclared identifier at module level (forward ref / import)", () => {
      const out = transpiler.transformSync("pure function foo() { return someGlobal; }");
      expect(out).toContain("someGlobal");
    });

    it("allows undeclared identifier in top-level pure arrow", () => {
      const out = transpiler.transformSync("const f = pure (x) => x + nope;");
      expect(out).toContain("nope");
    });

    it("rejects undeclared identifier in nested pure function", () => {
      expect(() =>
        transpiler.transformSync("function outer() { pure function inner() { return unknownThing; } }"),
      ).toThrow(/Cannot reference free variable "unknownThing"/);
    });

    it("allows parameter references", () => {
      const out = transpiler.transformSync("pure function foo(x, y) { return x + y; }");
      expect(out).toContain("x + y");
    });

    it("allows local variable references", () => {
      const out = transpiler.transformSync("pure function foo(x) { const y = x + 1; return y; }");
      expect(out).toContain("y");
    });

    it("allows pure-safe globals (Math, Array, JSON, etc.)", () => {
      const out = transpiler.transformSync("pure function foo(x) { return Math.abs(x); }");
      expect(out).toContain("Math.abs");
    });

    it("allows parseInt and parseFloat", () => {
      const out = transpiler.transformSync("pure function foo(s) { return parseInt(s, 10); }");
      expect(out).toContain("parseInt");
    });

    it("allows Array, Object, Number constructors", () => {
      const out = transpiler.transformSync(
        "pure function foo(x) { return Array.isArray(x) && typeof x === typeof Number(0); }",
      );
      expect(out).toContain("Array.isArray");
    });

    it("allows JSON.stringify / JSON.parse", () => {
      const out = transpiler.transformSync("pure function foo(x) { return JSON.parse(JSON.stringify(x)); }");
      expect(out).toContain("JSON.parse");
    });

    it("allows Error constructors", () => {
      const out = transpiler.transformSync('pure function foo() { return new TypeError("bad"); }');
      expect(out).toContain("TypeError");
    });

    it("allows local function declarations (hoisted)", () => {
      const out = transpiler.transformSync(
        "pure function foo(x) { function helper(y) { return y + 1; } return helper(x); }",
      );
      expect(out).toContain("helper");
    });

    it("allows variables declared in nested blocks", () => {
      const out = transpiler.transformSync("pure function foo(x) { if (x > 0) { const y = x; return y; } return 0; }");
      expect(out).toContain("const y = x");
    });

    it("allows for-loop counter", () => {
      const out = transpiler.transformSync(
        "pure function foo(n) { let sum = 0; for (let i = 0; i < n; i++) { sum += i; } return sum; }",
      );
      expect(out).toContain("for");
    });

    it("allows inner arrow to capture pure fn's locals via closure", () => {
      const out = transpiler.transformSync("pure function foo(x) { const y = x + 1; const f = () => y; return f(); }");
      expect(out).toContain("() => y");
    });

    it("allows undefined, NaN, Infinity", () => {
      const out = transpiler.transformSync(
        "pure function foo(x) { return x === undefined || x !== NaN || x < Infinity; }",
      );
      expect(out).toContain("undefined");
    });

    it("allows Intl and Reflect", () => {
      const out = transpiler.transformSync("pure function foo(x) { return Reflect.ownKeys(x); }");
      expect(out).toContain("Reflect.ownKeys");
    });

    it("allows module-scope const from nested pure arrow", () => {
      const out = transpiler.transformSync(
        "const EPOCH = 1420070400000n;\npure function toDate(id: bigint) { const ts = (id >> 22n) + EPOCH; return ts; }",
      );
      expect(out).toContain("EPOCH");
    });

    it("allows cross-function calls from pure function", () => {
      const out = transpiler.transformSync(
        "pure function double(x) { return x * 2; }\npure function quad(x) { return double(double(x)); }",
      );
      expect(out).toContain("double(double(x))");
    });

    it("allows closure over outer pure function locals", () => {
      const out = transpiler.transformSync(
        "pure function cfloor(decimals) { const imp = Math.pow(10, decimals); return pure (n) => Math.floor(n * imp) / imp; }",
      );
      expect(out).toContain("n * imp");
    });
  });
});
