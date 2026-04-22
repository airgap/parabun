import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe } from "harness";

// Parabun: `defer EXPR;` desugars to
//   using __parabun_defer_N$ = __parabunDefer0(() => EXPR);
// and `defer await EXPR;` to
//   await using __parabun_defer_N$ = __parabunAsyncDefer0(async () => EXPR);
//
// ES2024 `using` semantics handle LIFO disposal, early returns, throws, loop
// scoping, and SuppressedError chaining — the runtime helpers only wrap the
// thunk in a disposable shape.
//
// Runtime behavior is exercised via spawned Bun processes because `new
// Function(js)` in-process can't resolve the `bun:wrap` runtime import that
// parse-time desugaring injects.
describe("Parabun defer", () => {
  const transpiler = new Bun.Transpiler({ loader: "ts" });

  describe("parse-time desugar", () => {
    it("desugars sync defer to a using declaration", () => {
      const out = transpiler.transformSync(`function f() { defer close(); }`);
      expect(out).toContain("__parabunDefer0");
      expect(out).toContain("using ");
      expect(out).not.toContain("__parabunAsyncDefer0");
    });

    it("desugars async defer to an await using declaration", () => {
      const out = transpiler.transformSync(`async function f() { defer await close(); }`);
      expect(out).toContain("__parabunAsyncDefer0");
      // Bun lowers `await using` to a try/finally + __callDispose scaffold; the
      // presence of the async-defer helper + the dispose runtime is enough to
      // confirm the async path, regardless of whether the binding is printed
      // as native `await using` or the lowered form.
      expect(out).toContain("__callDispose");
    });

    it("each defer gets a unique synthesized binding", () => {
      const out = transpiler.transformSync(`function f() { defer a(); defer b(); defer c(); }`);
      // Three disjoint `using __parabun_defer_` bindings.
      const matches = out.match(/__parabun_defer_/g) ?? [];
      expect(matches.length).toBeGreaterThanOrEqual(3);
    });

    it("rejects `defer await` outside an async function", () => {
      expect(() => transpiler.transformSync(`function f() { defer await close(); }`)).toThrow();
    });

    it("leaves `defer` as a plain identifier when not followed by an expression", () => {
      // `const defer = 1; defer;` — `defer` on its own line with no RHS
      // should parse as an identifier reference.
      const out = transpiler.transformSync(`const defer = 1; console.log(defer);`);
      expect(out).toContain("const defer = 1");
      expect(out).not.toContain("__parabunDefer0");
    });

    it("leaves `defer` as a plain identifier in expression contexts", () => {
      const out = transpiler.transformSync(`const x = { defer: 1 }; x.defer;`);
      expect(out).not.toContain("__parabunDefer0");
    });

    it("leaves `defer` alone when followed by `=` (assignment target)", () => {
      const out = transpiler.transformSync(`let defer; defer = 5;`);
      expect(out).not.toContain("__parabunDefer0");
    });

    it("leaves `defer` alone when followed by a newline", () => {
      // `defer` on its own line (with newline before the next token) should
      // NOT be treated as a defer declaration — it's just a bare identifier
      // expression statement.
      const out = transpiler.transformSync(`const defer = () => {};\ndefer\n()`);
      expect(out).not.toContain("__parabunDefer0");
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

    it("runs a single defer on function exit", async () => {
      const out = await runScript(`
        function f() {
          console.log("enter");
          defer console.log("dispose");
          console.log("body");
        }
        f();
      `);
      expect(out).toBe("enter\nbody\ndispose");
    });

    it("runs multiple defers in LIFO order", async () => {
      const out = await runScript(`
        function f() {
          defer console.log("first");
          defer console.log("second");
          defer console.log("third");
        }
        f();
      `);
      // `using` disposes in reverse declaration order — LIFO.
      expect(out).toBe("third\nsecond\nfirst");
    });

    it("defer runs on early return", async () => {
      const out = await runScript(`
        function f(x) {
          defer console.log("cleanup");
          if (x) { console.log("taking early return"); return "early"; }
          console.log("normal path");
          return "normal";
        }
        console.log(f(true));
      `);
      expect(out).toBe("taking early return\ncleanup\nearly");
    });

    it("defer runs when an exception propagates", async () => {
      const out = await runScript(`
        function f() {
          defer console.log("cleanup");
          throw new Error("boom");
        }
        try { f(); } catch (e) { console.log("caught:", e.message); }
      `);
      expect(out).toBe("cleanup\ncaught: boom");
    });

    it("defer inside a loop disposes per-iteration", async () => {
      const out = await runScript(`
        for (let i = 0; i < 3; i++) {
          defer console.log("end", i);
          console.log("body", i);
        }
      `);
      // Each iteration's defer runs at its own block exit, before the next
      // iteration starts.
      expect(out).toBe("body 0\nend 0\nbody 1\nend 1\nbody 2\nend 2");
    });

    it("defer captures bindings by reference (late-bound)", async () => {
      const out = await runScript(`
        function f() {
          let x = 1;
          defer console.log("final x =", x);
          x = 2;
          x = 3;
        }
        f();
      `);
      // Cleanup thunk runs at scope exit; x is 3 by then.
      expect(out).toBe("final x = 3");
    });

    it("defer await waits for the disposed promise before returning", async () => {
      const out = await runScript(`
        async function f() {
          defer await new Promise(r => setTimeout(() => { console.log("async cleanup"); r(); }, 10));
          console.log("before return");
          return 42;
        }
        console.log(await f());
      `);
      // async cleanup must land before the returned value is printed.
      expect(out).toBe("before return\nasync cleanup\n42");
    });

    it("defer await + defer sync mix in LIFO order", async () => {
      const out = await runScript(`
        async function f() {
          defer console.log("sync 1");
          defer await Promise.resolve().then(() => console.log("async 2"));
          defer console.log("sync 3");
        }
        await f();
      `);
      // LIFO: sync 3, async 2, sync 1.
      expect(out).toBe("sync 3\nasync 2\nsync 1");
    });

    it("nested function boundaries: defers only fire at their own exit", async () => {
      const out = await runScript(`
        function outer() {
          defer console.log("outer cleanup");
          (function inner() {
            defer console.log("inner cleanup");
            console.log("inner body");
          })();
          console.log("after inner");
        }
        outer();
      `);
      expect(out).toBe("inner body\ninner cleanup\nafter inner\nouter cleanup");
    });

    it("multiple throwing defers chain via SuppressedError", async () => {
      // Parabun: throw is an expression, so `defer throw ...` works directly;
      // no block-form needed.
      const out = await runScript(`
        function f() {
          defer throw new Error("a");
          defer throw new Error("b");
        }
        try { f(); } catch (e) {
          // Outermost wrapper is a SuppressedError chaining the two throws.
          console.log(e instanceof SuppressedError, e.error.message, e.suppressed.message);
        }
      `);
      // LIFO: "b" throws first, then "a" — "a" is the latest, so it's e.error;
      // "b" is suppressed.
      expect(out).toBe("true a b");
    });

    it("throwing sync defer doesn't swallow a function body throw", async () => {
      const out = await runScript(`
        function f() {
          defer throw new Error("from-defer");
          throw new Error("from-body");
        }
        try { f(); } catch (e) {
          console.log(e instanceof SuppressedError, e.error.message, e.suppressed.message);
        }
      `);
      expect(out).toBe("true from-defer from-body");
    });

    it("defer can reference locally-captured closure state", async () => {
      const out = await runScript(`
        function f() {
          const resources = [];
          resources.push("r1"); defer console.log("disposed", resources.pop());
          resources.push("r2"); defer console.log("disposed", resources.pop());
        }
        f();
      `);
      // LIFO: last-pushed ("r2") is popped and logged first, then ("r1").
      expect(out).toBe("disposed r2\ndisposed r1");
    });
  });
});
