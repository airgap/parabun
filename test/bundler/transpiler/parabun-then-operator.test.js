import { describe, expect, it, test } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

describe("Parabun ..> (then operator)", () => {
  const transpiler = new Bun.Transpiler({ loader: "ts" });

  describe("desugaring", () => {
    it("desugars ..> to .then()", () => {
      const out = transpiler.transformSync("const x = promise ..> handler;");
      expect(out).toContain(".then(handler)");
    });

    it("works with bare-identifier handler (no auto-arrow wrap)", () => {
      const out = transpiler.transformSync("const x = promise ..> handleIt;");
      expect(out).toContain(".then(handleIt)");
      expect(out).not.toContain("() =>");
    });

    it("works with method-reference handler", () => {
      const out = transpiler.transformSync("const x = promise ..> JSON.stringify;");
      expect(out).toContain(".then(JSON.stringify)");
    });

    it("works with parenthesized arrow handler (regression)", () => {
      // The original parens-around-arrow form must keep working.
      const out = transpiler.transformSync("const x = promise ..> (r => r.json());");
      expect(out).toContain(".then(");
      expect(out).toContain("r.json()");
    });

    it("works with bare arrow handler (no parens needed)", () => {
      // The chain-op RHS lowers to .assign level + sets the chain-op
      // terminator flag, so a bare arrow body terminates at the next chain op.
      const out = transpiler.transformSync("const x = promise ..> r => r.json();");
      expect(out).toContain(".then(");
      expect(out).toContain("r.json()");
    });

    it("chains three with bare arrows", () => {
      const out = transpiler.transformSync("const x = p ..> r => r.json() ..! err => defaults ..& () => done();");
      expect(out).toContain(".then(");
      expect(out).toContain("r.json()");
      expect(out).toContain(".catch(");
      expect(out).toContain("defaults");
      expect(out).toContain(".finally(");
      expect(out).toContain("done()");
    });

    it("bare arrow with multi-statement brace body works as the final handler", () => {
      // Brace bodies re-enter a fresh expression context so chain ops inside
      // the body don't terminate it. Chaining MORE chain ops AFTER a brace
      // body requires parens around the arrow — same JS quirk as
      // `(x => { return x; })()` — but the brace body itself is fine when it
      // is the last handler in the chain.
      const out = transpiler.transformSync("const x = p ..! err => fb ..> r => { return r.json(); };");
      expect(out).toContain(".catch(");
      expect(out).toContain(".then(");
      expect(out).toContain("return r.json()");
    });

    it("inner chain op inside parens stays nested", () => {
      // Parens reset the terminator flag, so the inner ..! stays part of the
      // arrow body and the outer ..! still chains onto p.
      const out = transpiler.transformSync("const x = p ..! err => (recover() ..! finalFallback);");
      // outer
      expect(out).toContain(".catch(");
      // inner appears too
      const callCount = (out.match(/\.catch\(/g) ?? []).length;
      expect(callCount).toBe(2);
      expect(out).toContain("recover()");
      expect(out).toContain("finalFallback");
    });

    it("mixes bare arrow with named handler in one chain", () => {
      const out = transpiler.transformSync("const x = p ..> r => r.value ..! handler ..& done;");
      expect(out).toContain(".then(");
      expect(out).toContain("r.value");
      expect(out).toContain(".catch(handler)");
      expect(out).toContain(".finally(done)");
    });

    it("chains multiple ..> ..>", () => {
      const out = transpiler.transformSync("const x = promise ..> f ..> g;");
      expect(out).toContain(".then(f)");
      expect(out).toContain(".then(g)");
    });

    it("chains ..> with ..!", () => {
      const out = transpiler.transformSync("const x = promise ..> next ..! handler;");
      expect(out).toContain(".then(next)");
      expect(out).toContain(".catch(handler)");
    });

    it("chains ..> with ..&", () => {
      const out = transpiler.transformSync("const x = promise ..> handler ..& cleanup;");
      expect(out).toContain(".then(handler)");
      expect(out).toContain(".finally(cleanup)");
    });

    it("full chain ..> ..! ..&", () => {
      const out = transpiler.transformSync(`const x = fetch(url) ..> parse ..! handleErr ..& done;`);
      expect(out).toContain(".then(parse)");
      expect(out).toContain(".catch(handleErr)");
      expect(out).toContain(".finally(done)");
    });

    it("|> binds tighter than ..>", () => {
      // data |> transform ..> next → transform(data).then(next)
      const out = transpiler.transformSync("const x = data |> transform ..> next;");
      expect(out).toContain("transform(data)");
      expect(out).toContain(".then(next)");
    });

    it("await with ..> chain", () => {
      const out = transpiler.transformSync("async function f(p) { return await p ..> next; }");
      expect(out).toContain("await");
      expect(out).toContain(".then(next)");
    });

    describe("leading-dot sugar", () => {
      // `..> .json()` desugars to `..> (__pcv) => __pcv.json()` — the leading
      // dot is unambiguous in chain-op handler position and saves the user
      // from typing the param name + arrow.

      it("..> .json() lowers to a method-call arrow handler", () => {
        const out = transpiler.transformSync("const x = p ..> .json();");
        expect(out).toContain(".then(");
        expect(out).toContain(".json()");
        // The arrow body's identifier is the synthetic param.
        expect(out).toMatch(/=>\s*\S+\.json\(\)/);
      });

      it("..> .data lowers to a property-access arrow handler", () => {
        const out = transpiler.transformSync("const x = p ..> .data;");
        expect(out).toContain(".then(");
        expect(out).toMatch(/=>\s*\S+\.data/);
      });

      it("..> .users[0].id chains property + index + property", () => {
        const out = transpiler.transformSync("const x = p ..> .users[0].id;");
        expect(out).toContain(".then(");
        expect(out).toMatch(/=>\s*\S+\.users\[0\]\.id/);
      });

      it("..> .toString() — argless call works", () => {
        const out = transpiler.transformSync("const x = p ..> .toString();");
        expect(out).toContain(".then(");
        expect(out).toMatch(/=>\s*\S+\.toString\(\)/);
      });

      it("..> .map(x => x * 2) — inner arrow argument doesn't break the sugar", () => {
        const out = transpiler.transformSync("const x = p ..> .map(x => x * 2);");
        expect(out).toContain(".then(");
        expect(out).toContain(".map(");
        expect(out).toContain("x * 2");
      });

      it("..! .message — error message extraction", () => {
        const out = transpiler.transformSync("const x = p ..! .message;");
        expect(out).toContain(".catch(");
        expect(out).toMatch(/=>\s*\S+\.message/);
      });

      it("..! .stack — property on error", () => {
        const out = transpiler.transformSync("const x = p ..! .stack;");
        expect(out).toContain(".catch(");
        expect(out).toMatch(/=>\s*\S+\.stack/);
      });

      it("mixes leading-dot, bare arrow, and identifier handler in one chain", () => {
        const out = transpiler.transformSync("const x = p ..> .json() ..! err => defaults ..& done;");
        expect(out).toContain(".then(");
        expect(out).toContain(".json()");
        expect(out).toContain(".catch(");
        expect(out).toContain("defaults");
        expect(out).toContain(".finally(done)");
      });

      it("identifier handler still works (no leading-dot confusion)", () => {
        // `..> parseJson` is a bare identifier — no dot before it, sugar should
        // not fire.
        const out = transpiler.transformSync("const x = p ..> parseJson;");
        expect(out).toContain(".then(parseJson)");
        // Should not have synthesized an arrow with a synthetic param.
        expect(out).not.toContain("=>");
      });

      it("parens-wrapped arrow still works (no leading-dot confusion)", () => {
        // `..> ((r) => r.json())` is the explicit form — leading `(`, not `.`.
        const out = transpiler.transformSync("const x = p ..> ((r) => r.json());");
        expect(out).toContain(".then(");
        expect(out).toContain("r.json()");
        // The user's `r` param shouldn't have been replaced by a synthetic one.
        expect(out).toContain("(r) =>");
        expect(out).not.toContain("__pcv");
      });
    });
  });

  describe("end-to-end runtime", () => {
    test("Promise.resolve(1) ..> increment awaits to 2", async () => {
      // Note the parens: in canonical Parabun, ..> binds looser than await
      // (same as ..! / ..&), so the operand order matters.
      using dir = tempDir("then-operator-runtime", {
        "main.pts": `
          const inc = v => v + 1;
          async function main() {
            const result = await (Promise.resolve(1) ..> inc);
            console.log(result);
          }
          main();
        `,
      });
      await using proc = Bun.spawn({
        cmd: [bunExe(), "main.pts"],
        env: bunEnv,
        cwd: String(dir),
        stdout: "pipe",
        stderr: "pipe",
      });
      const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
      expect(stdout.trim()).toBe("2");
      expect(exitCode).toBe(0);
    });

    test("chained ..> ..> applies in order", async () => {
      using dir = tempDir("then-operator-chained", {
        "main.pts": `
          const inc = v => v + 1;
          const tenx = v => v * 10;
          async function main() {
            const result = await (Promise.resolve(1) ..> inc ..> tenx);
            console.log(result);
          }
          main();
        `,
      });
      await using proc = Bun.spawn({
        cmd: [bunExe(), "main.pts"],
        env: bunEnv,
        cwd: String(dir),
        stdout: "pipe",
        stderr: "pipe",
      });
      const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
      // (1 + 1) * 10 = 20
      expect(stdout.trim()).toBe("20");
      expect(exitCode).toBe(0);
    });

    test("..> with ..! recovers from rejection", async () => {
      using dir = tempDir("then-operator-with-catch", {
        "main.pts": `
          const onValue = v => "ok:" + v;
          const onError = err => "recovered:" + err;
          async function main() {
            const result = await (Promise.reject("bad") ..> onValue ..! onError);
            console.log(result);
          }
          main();
        `,
      });
      await using proc = Bun.spawn({
        cmd: [bunExe(), "main.pts"],
        env: bunEnv,
        cwd: String(dir),
        stdout: "pipe",
        stderr: "pipe",
      });
      const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
      expect(stdout.trim()).toBe("recovered:bad");
      expect(exitCode).toBe(0);
    });

    test("..> .value extracts a property end-to-end", async () => {
      // Leading-dot sugar: `..> .value` becomes `..> (__pcv) => __pcv.value`.
      using dir = tempDir("then-operator-leading-dot-value", {
        "main.pts": `
          async function main() {
            const result = await (Promise.resolve({ value: 42 }) ..> .value);
            console.log(result);
          }
          main();
        `,
      });
      await using proc = Bun.spawn({
        cmd: [bunExe(), "main.pts"],
        env: bunEnv,
        cwd: String(dir),
        stdout: "pipe",
        stderr: "pipe",
      });
      const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
      expect(stdout.trim()).toBe("42");
      expect(exitCode).toBe(0);
    });

    test("full leading-dot chain: ..> .json() ..! .message", async () => {
      using dir = tempDir("then-operator-leading-dot-chain", {
        "main.pts": `
          const fakeRes = { json: () => ({ users: [{ id: 7 }] }) };
          async function main() {
            const id = await (Promise.resolve(fakeRes) ..> .json() ..> .users[0].id);
            console.log(id);
            const msg = await (Promise.reject(new Error("nope")) ..! .message);
            console.log(msg);
          }
          main();
        `,
      });
      await using proc = Bun.spawn({
        cmd: [bunExe(), "main.pts"],
        env: bunEnv,
        cwd: String(dir),
        stdout: "pipe",
        stderr: "pipe",
      });
      const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
      expect(stdout.trim()).toBe("7\nnope");
      expect(exitCode).toBe(0);
    });
  });
});
