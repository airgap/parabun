import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe } from "harness";

// Parabun: `memo name(...) { body }` desugars to
//   const name = __parabunMemo(function(args) { body }, arity);
// `memo` is a standalone declarator — it implies both purity and
// function-ness (no `pure` / `function` / `fun` keyword).
// The function is rendered anonymous so recursive self-references route
// through the outer memoized const. Arity controls cache layout:
//   0 args, no rest → 0 (singleton cache)
//   1 arg, no rest  → 1 (Map keyed by the single argument)
//   otherwise       → 2 (nested Maps; rest args always land here)
//
// Runtime semantics are covered via spawned Bun processes that can resolve
// `bun:wrap` — `new Function(js)` evaluation in-process would fail on the
// injected import.
describe("Parabun memo", () => {
  const transpiler = new Bun.Transpiler({ loader: "ts" });

  describe("parse-time desugar", () => {
    it("desugars zero-arg memo to arity 0", () => {
      const out = transpiler.transformSync(`memo foo() { return 1; }`);
      expect(out).toContain("__parabunMemo");
      expect(out).toContain("const foo =");
      expect(out).toContain(", 0)");
    });

    it("desugars single-arg memo to arity 1", () => {
      const out = transpiler.transformSync(`memo dbl(n) { return n * 2; }`);
      expect(out).toContain("const dbl =");
      expect(out).toContain(", 1)");
    });

    it("desugars multi-arg memo to arity 2", () => {
      const out = transpiler.transformSync(`memo add(a, b) { return a + b; }`);
      expect(out).toContain("const add =");
      expect(out).toContain(", 2)");
    });

    it("rest-arg memo lands in arity 2 (nested-map path)", () => {
      const out = transpiler.transformSync(`memo sum(...xs) { return xs.reduce((a,b)=>a+b,0); }`);
      expect(out).toContain("const sum =");
      expect(out).toContain(", 2)");
    });

    it("async memo preserves `async` on the inner function", () => {
      const out = transpiler.transformSync(`memo async load(x) { return x * 2; }`);
      expect(out).toContain("async function");
      expect(out).toContain(", 1)");
    });

    it("inner function is anonymous so recursion routes through the outer const", () => {
      // `fib(n-1)` inside the body must resolve to the outer memoized const,
      // not to the inner function's own name binding (which would bypass the
      // cache). We verify this by checking the inner function is printed
      // without a name.
      const out = transpiler.transformSync(`memo fib(n) { if (n < 2) return n; return fib(n-1) + fib(n-2); }`);
      // `function(n) {` — no name between `function` and `(`.
      expect(out).toMatch(/function\s*\(n\)/);
      // And the wrapping const binds the name:
      expect(out).toContain("const fib =");
    });

    it("export memo produces an exported const", () => {
      const out = transpiler.transformSync(`export memo id(x) { return x; }`);
      expect(out).toContain("export const id =");
      expect(out).toContain("__parabunMemo");
    });

    it("rejects legacy `memo pure function` with a migration hint", () => {
      expect(() => transpiler.transformSync(`memo pure function bad(n) { return n; }`)).toThrow(/memo.*implies.*pure/i);
    });

    it("rejects `memo function` / `memo fun` — redundant keyword", () => {
      expect(() => transpiler.transformSync(`memo function bad() {}`)).toThrow(/drop the.*function/i);
      expect(() => transpiler.transformSync(`memo fun bad() {}`)).toThrow(/drop the.*function/i);
    });

    it("rejects anonymous memo", () => {
      // `memo (` doesn't look like a decl start, so `memo` parses as an
      // identifier call. The rejection comes from the surrounding parse.
      expect(() => transpiler.transformSync(`memo () { return 1; }`)).toThrow();
    });

    it("leaves `memo` as a plain identifier in other positions", () => {
      // `const memo = 5` — `memo` is just a variable name.
      const out = transpiler.transformSync(`const memo = 5; console.log(memo);`);
      expect(out).toContain("const memo = 5");
      expect(out).not.toContain("__parabunMemo");
    });

    it("leaves `memo` as an identifier in expression contexts", () => {
      const out = transpiler.transformSync(`function f() { return memo(1); }`);
      expect(out).toContain("memo(1)");
      expect(out).not.toContain("__parabunMemo");
    });
  });

  describe("arrow expression form", () => {
    it("memo (x) => body wraps the arrow as arity 1", () => {
      const out = transpiler.transformSync(`const dbl = memo (x) => x * 2;`);
      expect(out).toContain("__parabunMemo");
      expect(out).toContain("const dbl =");
      expect(out).toContain(", 1)");
    });

    it("memo x => body (shorthand) also wraps as arity 1", () => {
      const out = transpiler.transformSync(`const dbl = memo x => x * 2;`);
      expect(out).toContain("__parabunMemo");
      expect(out).toMatch(/\(x\)\s*=>/);
      expect(out).toContain(", 1)");
    });

    it("memo (a, b) => body wraps as arity 2", () => {
      const out = transpiler.transformSync(`const sum = memo (a, b) => a + b;`);
      expect(out).toContain(", 2)");
    });

    it("memo async (k) => body preserves async", () => {
      const out = transpiler.transformSync(`const load = memo async (k) => k;`);
      expect(out).toContain("async (k)");
      expect(out).toContain(", 1)");
    });

    it("memo rest arg arrow lands in arity 2", () => {
      const out = transpiler.transformSync(`const f = memo (...xs) => xs.length;`);
      expect(out).toContain(", 2)");
    });

    it("memo(x) as a call is NOT treated as an arrow", () => {
      const out = transpiler.transformSync(`const v = memo(5);`);
      expect(out).toContain("memo(5)");
      expect(out).not.toContain("__parabunMemo");
    });

    it("memo used as an identifier is preserved", () => {
      const out = transpiler.transformSync(`const v = memo; const w = memo.foo;`);
      expect(out).toContain("const v = memo");
      expect(out).toContain("memo.foo");
      expect(out).not.toContain("__parabunMemo");
    });
  });

  describe("runtime behavior", () => {
    async function runScript(src) {
      await using proc = Bun.spawn({
        cmd: [bunExe(), "-e", src],
        env: bunEnv,
        stdout: "pipe",
        stderr: "pipe",
      });
      const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
      if (exitCode !== 0) throw new Error(`script failed (${exitCode}): ${stderr}\n${stdout}`);
      return stdout.trim();
    }

    it("caches single-arg calls by argument identity", async () => {
      const out = await runScript(`
        let calls = 0;
        memo dbl(n) { calls++; return n * 2; }
        console.log(dbl(5), dbl(5), dbl(7), calls);
      `);
      // dbl(5) cached on second call; dbl(7) fresh. calls = 2.
      expect(out).toBe("10 10 14 2");
    });

    it("recursive memoized function memoizes intermediate calls", async () => {
      const out = await runScript(`
        let calls = 0;
        memo fib(n) {
          calls++;
          if (n < 2) return n;
          return fib(n-1) + fib(n-2);
        }
        const r = fib(20);
        console.log(r, calls);
      `);
      // fib(20) via memoization: 21 body-entries for n = 0..20 (one per unique n).
      // Without memoization the recursive call count for fib(20) is 21891.
      expect(out).toBe("6765 21");
    });

    it("multi-arg memo keys by the full argument tuple", async () => {
      const out = await runScript(`
        let calls = 0;
        memo add(a, b) { calls++; return a + b; }
        add(1, 2); add(1, 2); add(1, 3); add(2, 2); add(2, 2);
        console.log(calls);
      `);
      // Three distinct (a, b) tuples → 3 body invocations.
      expect(out).toBe("3");
    });

    it("zero-arg memo is a singleton cache", async () => {
      const out = await runScript(`
        let calls = 0;
        memo now() { calls++; return 42; }
        console.log(now(), now(), now(), calls);
      `);
      expect(out).toBe("42 42 42 1");
    });

    it("async memo dedupes in-flight calls", async () => {
      const out = await runScript(`
        let attempts = 0;
        memo async load(k) { attempts++; return k; }
        const [a, b] = await Promise.all([load("x"), load("x")]);
        console.log(a, b, attempts);
      `);
      expect(out).toBe("x x 1");
    });

    it("async memo evicts rejected promises so the next call retries", async () => {
      const out = await runScript(`
        let attempts = 0;
        let fail = true;
        memo async load(k) {
          attempts++;
          if (fail) throw new Error("boom");
          return k;
        }
        await Promise.allSettled([load("x"), load("x")]);  // dedupe into 1 attempt
        try { await load("x"); } catch {}                  // retry: 2
        fail = false;
        const r = await load("x");                         // success: 3, cached after
        await load("x");                                   // cached: still 3
        console.log(r, attempts);
      `);
      expect(out).toBe("x 3");
    });

    it("async memo caches fulfilled promises (same reference)", async () => {
      const out = await runScript(`
        memo async load(x) { return { x }; }
        const p1 = load("a");
        const p2 = load("a");
        console.log(p1 === p2);
      `);
      expect(out).toBe("true");
    });

    it("rest-arg memo keys on the full argument sequence", async () => {
      const out = await runScript(`
        let calls = 0;
        memo joined(...xs) { calls++; return xs.join("-"); }
        joined("a","b","c"); joined("a","b","c"); joined("a","b"); joined("a","b","c");
        console.log(calls);
      `);
      // Two distinct arg sequences: ("a","b","c") and ("a","b") → 2 invocations.
      expect(out).toBe("2");
    });

    it("memo caches by object identity, not structural equality", async () => {
      const out = await runScript(`
        let calls = 0;
        memo key(o) { calls++; return o.id; }
        const a = { id: 1 };
        const b = { id: 1 };
        key(a); key(a); key(b);
        console.log(calls);
      `);
      // Same shape, different identity → two cache entries.
      expect(out).toBe("2");
    });
  });
});
