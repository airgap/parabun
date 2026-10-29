import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { cpSync, readdirSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { bunEnv, bunExe, nodeExe, tempDir } from "../../../test/harness.ts";
import { transpile } from "../src/index";

// Cross-cutting tests : transforms should compose cleanly when more than
// one Para operator appears in the same expression.

describe("integration: pipeline + error-chain", () => {
  test("data |> transform ..! handler", () => {
    expect(transpile("const r = data |> transform ..! handler;")).toBe("const r = transform(data).catch(handler);");
  });

  test("data |> transform ..& cleanup", () => {
    expect(transpile("const r = data |> transform ..& cleanup;")).toBe("const r = transform(data).finally(cleanup);");
  });

  test("data |> transform ..! handler ..& cleanup", () => {
    expect(transpile("const r = data |> transform ..! handler ..& cleanup;")).toBe(
      "const r = transform(data).catch(handler).finally(cleanup);",
    );
  });
});

describe("integration: pipeline + ranges", () => {
  test("range piped through filter via placeholder", () => {
    const out = transpile("const evens = 0..=20 |> filter(_, even);");
    expect(out).toContain('import { __parabunRangeInclusive } from "bun:wrap";');
    expect(out).toContain("const evens = filter(__parabunRangeInclusive(0, 20), even);");
  });
});

describe("integration: pure + pipeline", () => {
  test("pure function + pipeline call", () => {
    const out = transpile(`pure function sq(x) { return x * x; }\nconst r = 5 |> sq |> sq;`);
    expect(out).toContain("     function sq(x) { return x * x; }");
    expect(out).toContain("const r = sq(sq(5));");
  });
});

test("parity runner fails when the canonical driver cannot start", async () => {
  using dir = tempDir("para-parity-missing-driver", {});
  const fixtures = readdirSync(new URL("./parity/fixtures/", import.meta.url)).filter(path => path.endsWith(".pts"));
  expect(fixtures.length).toBeGreaterThan(0);

  await using proc = Bun.spawn({
    cmd: [bunExe(), fileURLToPath(new URL("./parity/runner.ts", import.meta.url))],
    env: { ...bunEnv, PARABUN: join(String(dir), "missing-parabun") },
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  expect(stdout).toContain(`0 passed, ${fixtures.length} failed, 0 skipped (${fixtures.length} fixtures)`);
  expect(stderr).toContain("ENOENT");
  expect(exitCode).toBe(1);
});

describe("generated Node package", () => {
  let dir: ReturnType<typeof tempDir>;
  let node: string;

  beforeAll(async () => {
    const executable = nodeExe();
    expect(executable).not.toBeNull();
    node = executable!;
    dir = tempDir("para-transpile-node", {
      "input.pts": "const result = data |> transform;",
      "consumer.ts": `
        import { transpile, type TranspileOptions } from "@lyku/para-transpile";
        import { transformPure } from "@lyku/para-transpile/syntactic";
        const options: TranspileOptions = { filename: "input.pts" };
        const compiled: string = transpile("const result = data |> transform;", options);
        const syntactic: string = transformPure("pure function square(x) { return x * x; }");
        void [compiled, syntactic];
      `,
    });
    const packageRoot = fileURLToPath(new URL("../", import.meta.url));
    for (const path of ["src", "package.json", "tsconfig.json"]) {
      cpSync(join(packageRoot, path), join(String(dir), path), { recursive: true });
    }
    // Compile the real source with installed dependencies, without installing
    // packages or writing generated output into the checkout.
    symlinkSync(join(packageRoot, "node_modules"), join(String(dir), "node_modules"), "junction");
    await using proc = Bun.spawn({
      cmd: [node, fileURLToPath(import.meta.resolve("typescript/bin/tsc")), "-p", "tsconfig.json"],
      cwd: String(dir),
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(stdout).toBe("");
    expect(stderr).toBe("");
    expect(exitCode).toBe(0);
  });

  afterAll(() => dir?.[Symbol.dispose]());

  async function run(args: string[], stdin?: string) {
    await using proc = Bun.spawn({
      cmd: [node, ...args],
      cwd: String(dir),
      env: bunEnv,
      stdin: stdin === undefined ? "ignore" : new Blob([stdin]),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    return { stdout, stderr, exitCode };
  }

  test("root export resolves generated JavaScript under Node", async () => {
    const result = await run([
      "--input-type=module",
      "-e",
      'import { transpile } from "@lyku/para-transpile"; process.stdout.write(transpile("const result = data |> transform;"));',
    ]);
    expect(result.stdout).toBe("const result = transform(data);");
    expect(result.stderr).toBe("");
    expect(result.exitCode).toBe(0);
  });

  test("syntactic export resolves generated JavaScript under Node", async () => {
    const result = await run([
      "--input-type=module",
      "-e",
      'import { transformPure } from "@lyku/para-transpile/syntactic"; process.stdout.write(transformPure("pure function square(x) { return x * x; }"));',
    ]);
    expect(result.stdout).toBe("     function square(x) { return x * x; }");
    expect(result.stderr).toBe("");
    expect(result.exitCode).toBe(0);
  });

  test("root export invokes Babel-based disposal lowering under Node", async () => {
    const result = await run([
      "--input-type=module",
      "-e",
      `import { transpile } from "@lyku/para-transpile";
       const output = transpile('{ using resource = { [Symbol.dispose]() { process.stdout.write("disposed"); } }; }');
       (0, eval)(output);`,
    ]);
    expect(result.stdout).toBe("disposed");
    expect(result.stderr).toBe("");
    expect(result.exitCode).toBe(0);
  });

  test("generated declarations resolve for NodeNext consumers", async () => {
    const result = await run([
      fileURLToPath(import.meta.resolve("typescript/bin/tsc")),
      "--noEmit",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      "--target",
      "ES2022",
      "--strict",
      "--skipLibCheck",
      "consumer.ts",
    ]);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
    expect(result.exitCode).toBe(0);
  });

  test("CLI transpiles a file under Node", async () => {
    const result = await run(["dist/cli.js", "transpile", "input.pts"]);
    expect(result.stdout).toBe("const result = transform(data);");
    expect(result.stderr).toBe("");
    expect(result.exitCode).toBe(0);
  });

  test("CLI transpiles standard input under Node", async () => {
    const result = await run(["dist/cli.js", "transpile"], "const result = data |> transform;");
    expect(result.stdout).toBe("const result = transform(data);");
    expect(result.stderr).toBe("");
    expect(result.exitCode).toBe(0);
  });

  test("CLI rejects invalid arguments under Node", async () => {
    const result = await run(["dist/cli.js", "invalid"]);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("usage: para transpile [FILE]");
    expect(result.exitCode).toBe(1);
  });

  test("CLI reports file errors under Node", async () => {
    const result = await run(["dist/cli.js", "transpile", "missing.pts"]);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("ENOENT");
    expect(result.exitCode).toBe(1);
  });
});
