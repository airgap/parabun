import { describe, expect, it, test } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

describe("Parabun parallel — expression form", () => {
  const transpiler = new Bun.Transpiler({ loader: "ts" });

  it("desugars single-key parallel { … }", () => {
    const out = transpiler.transformSync("const x = parallel { user: fetchUser(id) };");
    expect(out).toContain("Promise.all([");
    expect(out).toContain("fetchUser(id)");
    expect(out).toContain(".then(");
    expect(out).toContain("__pb0");
    expect(out).toContain("user: __pb0");
  });

  it("multi key — keys come out in source order", () => {
    const out = transpiler.transformSync("const x = parallel { user: f(id), posts: g(id), comments: h(id) };");
    expect(out).toContain("user: __pb0");
    expect(out).toContain("posts: __pb1");
    expect(out).toContain("comments: __pb2");
  });

  it("empty parallel {} resolves to {}", () => {
    const out = transpiler.transformSync("const x = parallel {};");
    expect(out).toContain("Promise.all([])");
    expect(out).toContain(".then(() =>");
  });

  it("string keys", () => {
    const out = transpiler.transformSync(`const x = parallel { "weird-key": f() };`);
    expect(out).toContain('"weird-key"');
    expect(out).toContain("__pb0");
  });

  it("chains with ..!", () => {
    // Bare arrow at conditional level needs parens (same rule as the
    // existing ..! / ..& tests). A parenthesized arrow IS a primary
    // expression and works.
    const out = transpiler.transformSync("const x = parallel { a: f() } ..! (err => fallback);");
    expect(out).toContain(".then(");
    expect(out).toContain(".catch(");
  });

  it("rejects spread inside body", () => {
    expect(() => transpiler.transformSync("const x = parallel { ...rest, a: f() };")).toThrow();
  });

  it("rejects computed keys", () => {
    expect(() => transpiler.transformSync("const x = parallel { [key]: f() };")).toThrow();
  });

  it("`parallel` followed by anything-not-{ stays an identifier", () => {
    const out = transpiler.transformSync("parallel(x); parallel.foo; parallel = 1;");
    expect(out).toContain("parallel(x)");
    expect(out).toContain("parallel.foo");
  });
});

describe("Parabun parallel — statement form", () => {
  const transpiler = new Bun.Transpiler({ loader: "ts" });

  it("single decl with let", () => {
    const out = transpiler.transformSync("async function f() { parallel let x = g(); return x; }");
    expect(out).toContain("await Promise.all([");
    expect(out).toContain("[x]");
  });

  it("single decl with const", () => {
    const out = transpiler.transformSync("async function f() { parallel const x = g(); return x; }");
    expect(out).toContain("await Promise.all([");
  });

  it("multi-decl with long names", () => {
    const out = transpiler.transformSync(
      "async function f() { parallel let theDataFromServer = fetchA(), theDataFromOtherServer = fetchB(); return theDataFromServer + theDataFromOtherServer; }",
    );
    expect(out).toContain("[theDataFromServer, theDataFromOtherServer]");
    expect(out).toContain("fetchA()");
    expect(out).toContain("fetchB()");
  });

  it("per-decl ..! is preserved per-binding", () => {
    const out = transpiler.transformSync(
      "async function f() { parallel let a = f1() ..! d1, b = f2() ..! d2; return a + b; }",
    );
    expect(out).toContain(".catch(d1)");
    expect(out).toContain(".catch(d2)");
  });

  it("typescript annotation is allowed and stripped", () => {
    const out = transpiler.transformSync("async function f() { parallel let x: User = fetchUser(); return x; }");
    expect(out).toContain("[x]");
    expect(out).not.toContain(": User");
  });

  it("`parallel` followed by NOT (let/const) stays an identifier", () => {
    // `parallel(x);` — call expression
    const out = transpiler.transformSync("parallel(x);");
    expect(out).toContain("parallel(x)");
  });
});

describe("Parabun parallel — runtime end-to-end", () => {
  test("expression form resolves three Promise.resolve values", async () => {
    using dir = tempDir("parallel-exprform-runtime", {
      "main.pts": `
        async function main() {
          const r = await parallel { a: Promise.resolve(1), b: Promise.resolve(2), c: Promise.resolve(3) };
          console.log(r.a, r.b, r.c);
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
    expect(stdout.trim()).toBe("1 2 3");
    expect(exitCode).toBe(0);
  });

  test("statement form resolves and binds in scope", async () => {
    using dir = tempDir("parallel-stmtform-runtime", {
      "main.pts": `
        async function main() {
          parallel let a = Promise.resolve(1), b = Promise.resolve(2);
          console.log(a + b);
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
    expect(stdout.trim()).toBe("3");
    expect(exitCode).toBe(0);
  });

  test("expression form is fail-fast on rejection", async () => {
    using dir = tempDir("parallel-failfast", {
      "main.pts": `
        async function main() {
          try {
            const r = await parallel { ok: Promise.resolve(1), bad: Promise.reject("boom") };
            console.log("no-throw");
          } catch (e) {
            console.log("caught:", e);
          }
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
    expect(stdout.trim()).toBe("caught: boom");
    expect(exitCode).toBe(0);
  });

  test("reorder source keys, results follow names (regression for the headline footgun)", async () => {
    using dir = tempDir("parallel-reorder", {
      "main.pts": `
        async function main() {
          const fast = () => new Promise(r => setTimeout(() => r("fast-val"), 1));
          const slow = () => new Promise(r => setTimeout(() => r("slow-val"), 5));
          // Note: 'first' fires the FAST promise, 'second' fires the SLOW promise.
          const r = await parallel { first: fast(), second: slow() };
          console.log(r.first, r.second);
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
    expect(stdout.trim()).toBe("fast-val slow-val");
    expect(exitCode).toBe(0);
  });

  test("statement form per-decl ..! recovers independently", async () => {
    using dir = tempDir("parallel-perdecl-catch", {
      "main.pts": `
        async function main() {
          parallel let a = Promise.reject("a-bad") ..! (e => "a-fix:" + e),
                       b = Promise.resolve("b-ok") ..! (e => "b-bad");
          console.log(a, "/", b);
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
    expect(stdout.trim()).toBe("a-fix:a-bad / b-ok");
    expect(exitCode).toBe(0);
  });
});

describe("Parabun para — shorthand for parallel", () => {
  const transpiler = new Bun.Transpiler({ loader: "ts" });

  it("statement form: `para let` lowers identically to `parallel let`", () => {
    const a = transpiler.transformSync("async function f() { para let a = f1(), b = f2(); return a + b; }");
    const b = transpiler.transformSync("async function f() { parallel let a = f1(), b = f2(); return a + b; }");
    expect(a).toBe(b);
  });

  it("statement form: `para const` lowers identically to `parallel const`", () => {
    const a = transpiler.transformSync("async function f() { para const x = g(); return x; }");
    const b = transpiler.transformSync("async function f() { parallel const x = g(); return x; }");
    expect(a).toBe(b);
  });

  it("expression form: `para { … }` lowers identically to `parallel { … }`", () => {
    const a = transpiler.transformSync("async function f() { return await para { a: f1(), b: f2() }; }");
    const b = transpiler.transformSync("async function f() { return await parallel { a: f1(), b: f2() }; }");
    expect(a).toBe(b);
  });

  it("statement form: per-decl ..! preserved with `para`", () => {
    const out = transpiler.transformSync(
      "async function f() { para let a = f1() ..! d1, b = f2() ..! d2; return a + b; }",
    );
    expect(out).toContain(".catch(d1)");
    expect(out).toContain(".catch(d2)");
    expect(out).toContain("[a, b]");
  });

  it("mixed file: `parallel` and `para` decls coexist", () => {
    const out = transpiler.transformSync(
      "async function f() { parallel let a = f1(); para let b = f2(); return a + b; }",
    );
    // Two separate Promise.all calls, one per statement.
    const matches = out.match(/Promise\.all\(/g) ?? [];
    expect(matches.length).toBe(2);
    expect(out).toContain("[a]");
    expect(out).toContain("[b]");
  });

  it("`para` as a regular identifier still works (assignment + use)", () => {
    const out = transpiler.transformSync("const para = 5; const x = para + 1;");
    expect(out).toContain("para");
    expect(out).toContain("para + 1");
    expect(out).not.toContain("Promise.all");
  });

  it("`para()` as a function call doesn't trigger the keyword", () => {
    const out = transpiler.transformSync("function para() {} para();");
    expect(out).toContain("para()");
    expect(out).not.toContain("Promise.all");
  });

  it("`import { para } from ...` works as a normal binding", () => {
    const out = transpiler.transformSync("import { para } from 'somewhere'; para();");
    expect(out).toContain("para");
    expect(out).not.toContain("Promise.all");
  });

  it("runtime: `para` expression form resolves three values", async () => {
    using dir = tempDir("para-exprform-runtime", {
      "main.pts": `
        async function main() {
          const r = await para { a: Promise.resolve(1), b: Promise.resolve(2), c: Promise.resolve(3) };
          console.log(r.a, r.b, r.c);
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
    expect(stdout.trim()).toBe("1 2 3");
    expect(exitCode).toBe(0);
  });

  it("runtime: `para` statement form binds in scope", async () => {
    using dir = tempDir("para-stmtform-runtime", {
      "main.pts": `
        async function main() {
          para let a = Promise.resolve(1), b = Promise.resolve(2);
          console.log(a + b);
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
    expect(stdout.trim()).toBe("3");
    expect(exitCode).toBe(0);
  });

  it("runtime: `para` as a regular identifier doesn't trigger the keyword", async () => {
    using dir = tempDir("para-identifier-runtime", {
      "main.pts": `
        const para = 5;
        const x = para + 1;
        console.log(x);
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
    expect(stdout.trim()).toBe("6");
    expect(exitCode).toBe(0);
  });
});
