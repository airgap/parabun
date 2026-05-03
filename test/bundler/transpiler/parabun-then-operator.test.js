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

    it("works with parenthesized arrow handler", () => {
      // Arrow expressions are at .assign level which is below .conditional —
      // the same rule that makes `..!` / `..&` reject bare arrows. A
      // parenthesized arrow IS a primary expression and works.
      const out = transpiler.transformSync("const x = promise ..> (r => r.json());");
      expect(out).toContain(".then(");
      expect(out).toContain("r.json()");
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
  });
});
