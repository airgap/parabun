import { describe, expect, test } from "bun:test";
import { bunEnv, bunExe } from "harness";

function ts(code, options = {}) {
  return new Bun.Transpiler({
    loader: "tsx",
    ...options,
  }).transformSync(code);
}

describe("pipeline inline fusion", () => {
  test("pure function with single param is inlined at |> site", () => {
    const out = ts(`
      pure function double(x: number) { return x * 2 }
      const result = 21 |> double
    `);
    expect(out).not.toContain("double(21)");
    expect(out).toContain("21 * 2");
  });

  test("chained pipelines inline both functions", () => {
    const out = ts(`
      pure function double(x: number) { return x * 2 }
      pure function inc(x: number) { return x + 1 }
      const result = 10 |> double |> inc
    `);
    expect(out).toContain("10 * 2 + 1");
  });

  test("inline pure function expression in pipeline (multiply)", () => {
    const out = ts(`
      const result = 5 |> pure function(x: number) { return x * 3 }
    `);
    expect(out).toContain("5 * 3");
  });

  test("inline pure function expression in pipeline", () => {
    const out = ts(`
      const result = 7 |> pure function(x: number) { return x + 10 }
    `);
    expect(out).toContain("7 + 10");
  });

  test("non-pure function is NOT inlined", () => {
    const out = ts(`
      function double(x: number) { return x * 2 }
      const result = 21 |> double
    `);
    expect(out).toContain("double(21)");
  });

  test("const-bound pure arrow is inlined at |> site", () => {
    const out = ts(`
      const double = pure (x: number) => x * 2
      const result = 21 |> double
    `);
    expect(out).not.toContain("double(21)");
    expect(out).toContain("21 * 2");
  });

  test("const-bound pure arrow with concise single param is inlined", () => {
    const out = ts(`
      const inc = pure x => x + 1
      const result = 10 |> inc
    `);
    expect(out).toContain("10 + 1");
  });

  test("const-bound pure arrow chains fuse end-to-end", () => {
    const out = ts(`
      const norm = pure (x: number) => x / 100
      const cap  = pure (x: number) => Math.min(x, 1)
      const out = raw |> norm |> cap
    `);
    expect(out).toContain("Math.min(raw / 100, 1)");
  });

  test("let-bound pure arrow is NOT inlined (rebindable)", () => {
    const out = ts(`
      let double = pure (x: number) => x * 2
      const result = 21 |> double
    `);
    expect(out).toContain("double(21)");
  });

  test("var-bound pure arrow is NOT inlined (rebindable)", () => {
    const out = ts(`
      var double = pure (x: number) => x * 2
      const result = 21 |> double
    `);
    expect(out).toContain("double(21)");
  });

  test("const-bound pure arrow with multi-statement body is NOT inlined", () => {
    const out = ts(`
      const complex = pure (x: number) => { const y = x * 2; return y + 1 }
      const result = 10 |> complex
    `);
    expect(out).toContain("complex(10)");
  });

  test("non-pure const-bound arrow is NOT inlined", () => {
    const out = ts(`
      const double = (x: number) => x * 2
      const result = 21 |> double
    `);
    expect(out).toContain("double(21)");
  });

  test("multi-param pure function is NOT inlined", () => {
    const out = ts(`
      pure function add(a: number, b: number) { return a + b }
      const result = 21 |> add
    `);
    expect(out).toContain("add(21)");
  });

  test("pure function with complex body (not single return) is NOT inlined", () => {
    const out = ts(`
      pure function complex(x: number) { const y = x * 2; return y + 1 }
      const result = 10 |> complex
    `);
    expect(out).toContain("complex(10)");
  });

  test("inlined body with binary expression", () => {
    const out = ts(`
      pure function calc(x: number) { return x * 2 + 1 }
      const result = 5 |> calc
    `);
    expect(out).toContain("5 * 2 + 1");
  });

  test("inlined body with ternary expression", () => {
    const out = ts(`
      pure function clamp(x: number) { return x > 100 ? 100 : x }
      const result = val |> clamp
    `);
    expect(out).toContain("val > 100 ? 100 : val");
  });

  test("inlined body with property access", () => {
    const out = ts(`
      pure function len(x: string) { return x.length }
      const result = "hello" |> len
    `);
    expect(out).toContain('"hello".length');
  });

  test("inlined body with method call", () => {
    const out = ts(`
      pure function upper(x: string) { return x.toUpperCase() }
      const result = "hello" |> upper
    `);
    expect(out).toContain('"hello".toUpperCase()');
  });

  test("runtime correctness: simple pipeline inline", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        pure function double(x) { return x * 2 }
        console.log(21 |> double)
      `,
      ],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("42");
    expect(exitCode).toBe(0);
  });

  test("runtime correctness: chained pipeline inline", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        pure function double(x) { return x * 2 }
        pure function inc(x) { return x + 1 }
        console.log(10 |> double |> inc)
      `,
      ],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("21");
    expect(exitCode).toBe(0);
  });

  test("runtime correctness: inline function expression pipeline", async () => {
    await using proc = Bun.spawn({
      cmd: [bunExe(), "-e", `console.log(5 |> pure function(x) { return x * 3 })`],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("15");
    expect(exitCode).toBe(0);
  });

  test("runtime correctness: pipeline with ternary inline", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        pure function clamp(x) { return x > 100 ? 100 : x }
        console.log(200 |> clamp)
      `,
      ],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("100");
    expect(exitCode).toBe(0);
  });
});
