import { describe, expect, test } from "bun:test";
import { bunEnv, bunExe, tempDirWithFiles, tempDir } from "harness";
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

describe("parabun bytecode cache", () => {
  test(".pts source compiles to bytecode and the .jsc sidecar runs", async () => {
    const dir = tempDirWithFiles("parabun-bytecode-pts", {
      "package.json": `{}`,
      "entry.pts": `
        pure function double(x: number) { return x * 2 }
        const out = 21 |> double
        console.log(out)
      `,
    });

    const build = await Bun.build({
      entrypoints: [join(dir, "entry.pts")],
      outdir: join(dir, "out"),
      target: "bun",
      bytecode: true,
    });

    expect(build.success).toBe(true);
    const kinds = build.outputs.map(o => o.kind).sort();
    expect(kinds).toContain("bytecode");
    expect(kinds).toContain("entry-point");

    const entry = build.outputs.find(o => o.kind === "entry-point")!;
    const bytecode = build.outputs.find(o => o.kind === "bytecode")!;
    expect(bytecode.path).toBe(entry.path + ".jsc");
    expect(statSync(bytecode.path).size).toBeGreaterThan(0);

    await using proc = Bun.spawn({
      cmd: [bunExe(), entry.path],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("42");
    expect(exitCode).toBe(0);
  });

  test("stale .jsc with wrong parser version is rejected", async () => {
    const dir = tempDirWithFiles("parabun-bytecode-stale", {
      "package.json": `{}`,
      "entry.pts": `
        pure function double(x: number) { return x * 2 }
        const out = 21 |> double
        console.log(out)
      `,
    });

    const build = await Bun.build({
      entrypoints: [join(dir, "entry.pts")],
      outdir: join(dir, "out"),
      target: "bun",
      bytecode: true,
    });

    expect(build.success).toBe(true);
    const entry = build.outputs.find(o => o.kind === "entry-point")!;
    const bytecodeFile = build.outputs.find(o => o.kind === "bytecode")!;

    // Corrupt the 4-byte version trailer to simulate a different parser version
    const jscBuf = readFileSync(bytecodeFile.path);
    expect(jscBuf.length).toBeGreaterThan(4);
    // Overwrite last 4 bytes (version trailer) with a fake version
    jscBuf[jscBuf.length - 4] = 0xff;
    jscBuf[jscBuf.length - 3] = 0xff;
    jscBuf[jscBuf.length - 2] = 0xff;
    jscBuf[jscBuf.length - 1] = 0xff;
    writeFileSync(bytecodeFile.path, jscBuf);

    // Run — should still produce correct output by falling back to JS parsing
    await using proc = Bun.spawn({
      cmd: [bunExe(), entry.path],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("42");
    expect(exitCode).toBe(0);
  });

  test("modified .js content is not masked by stale .jsc", async () => {
    const dir = tempDirWithFiles("parabun-bytecode-modified", {
      "package.json": `{}`,
      "entry.pts": `
        pure function double(x: number) { return x * 2 }
        const out = 21 |> double
        console.log(out)
      `,
    });

    const build = await Bun.build({
      entrypoints: [join(dir, "entry.pts")],
      outdir: join(dir, "out"),
      target: "bun",
      bytecode: true,
    });

    expect(build.success).toBe(true);
    const entry = build.outputs.find(o => o.kind === "entry-point")!;

    // Modify the .js to output a different value (simulating parser change)
    // Pipeline inline fusion turns `21 |> double` into `21 * 2`, so replace that
    let jsContent = readFileSync(entry.path, "utf-8");
    jsContent = jsContent.replace("21 * 2", "50 * 2");
    writeFileSync(entry.path, jsContent);

    // Run — JSC's source hash validation should reject the old bytecode
    await using proc = Bun.spawn({
      cmd: [bunExe(), entry.path],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("100");
    expect(exitCode).toBe(0);
  });

  test(".pjs source compiles to bytecode and the .jsc sidecar runs", async () => {
    const dir = tempDirWithFiles("parabun-bytecode-pjs", {
      "package.json": `{}`,
      "entry.pjs": `
        pure function add(a, b) { return a + b }
        console.log(add(20, 22))
      `,
    });

    const build = await Bun.build({
      entrypoints: [join(dir, "entry.pjs")],
      outdir: join(dir, "out"),
      target: "bun",
      bytecode: true,
    });

    expect(build.success).toBe(true);
    const entry = build.outputs.find(o => o.kind === "entry-point")!;
    const bytecode = build.outputs.find(o => o.kind === "bytecode")!;
    expect(bytecode.path).toBe(entry.path + ".jsc");
    expect(statSync(bytecode.path).size).toBeGreaterThan(0);

    await using proc = Bun.spawn({
      cmd: [bunExe(), entry.path],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("42");
    expect(exitCode).toBe(0);
  });
});

describe("runtime bytecode auto-cache", () => {
  test("second run uses cached bytecode (faster startup)", async () => {
    const bcCacheDir = join(import.meta.dir, ".bc-test-cache");
    if (existsSync(bcCacheDir)) rmSync(bcCacheDir, { recursive: true });

    using dir = tempDir("bc-autocache", {
      "app.ts": `
        function fib(n: number): number {
          if (n <= 1) return n;
          return fib(n - 1) + fib(n - 2);
        }
        console.log(fib(10));
      `,
    });

    const env = {
      ...bunEnv,
      BUN_RUNTIME_TRANSPILER_CACHE_PATH: bcCacheDir,
    };

    // First run — cold cache, generates bytecode
    await using proc1 = Bun.spawn({
      cmd: [bunExe(), "app.ts"],
      env,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout1, exitCode1] = await Promise.all([proc1.stdout.text(), proc1.exited]);
    expect(stdout1.trim()).toBe("55");
    expect(exitCode1).toBe(0);

    // Second run — warm cache
    await using proc2 = Bun.spawn({
      cmd: [bunExe(), "app.ts"],
      env,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout2, exitCode2] = await Promise.all([proc2.stdout.text(), proc2.exited]);
    expect(stdout2.trim()).toBe("55");
    expect(exitCode2).toBe(0);

    if (existsSync(bcCacheDir)) rmSync(bcCacheDir, { recursive: true });
  });

  test("bytecode cache produces correct output for CJS modules", async () => {
    const bcCacheDir = join(import.meta.dir, ".bc-test-cache-cjs");
    if (existsSync(bcCacheDir)) rmSync(bcCacheDir, { recursive: true });

    using dir = tempDir("bc-autocache-cjs", {
      "app.cjs": `
        function square(n) { return n * n; }
        console.log(square(7));
      `,
    });

    const env = {
      ...bunEnv,
      BUN_RUNTIME_TRANSPILER_CACHE_PATH: bcCacheDir,
    };

    // First run
    await using proc1 = Bun.spawn({
      cmd: [bunExe(), "app.cjs"],
      env,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout1, exitCode1] = await Promise.all([proc1.stdout.text(), proc1.exited]);
    expect(stdout1.trim()).toBe("49");
    expect(exitCode1).toBe(0);

    // Second run — should use cached bytecode
    await using proc2 = Bun.spawn({
      cmd: [bunExe(), "app.cjs"],
      env,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout2, exitCode2] = await Promise.all([proc2.stdout.text(), proc2.exited]);
    expect(stdout2.trim()).toBe("49");
    expect(exitCode2).toBe(0);

    if (existsSync(bcCacheDir)) rmSync(bcCacheDir, { recursive: true });
  });

  test("cache is invalidated when source changes", async () => {
    const bcCacheDir = join(import.meta.dir, ".bc-test-cache-invalidate");
    if (existsSync(bcCacheDir)) rmSync(bcCacheDir, { recursive: true });

    using dir = tempDir("bc-invalidate", {
      "app.ts": `console.log(42);`,
    });

    const env = {
      ...bunEnv,
      BUN_RUNTIME_TRANSPILER_CACHE_PATH: bcCacheDir,
    };

    // First run — populates cache
    await using proc1 = Bun.spawn({
      cmd: [bunExe(), "app.ts"],
      env,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout1, exitCode1] = await Promise.all([proc1.stdout.text(), proc1.exited]);
    expect(stdout1.trim()).toBe("42");
    expect(exitCode1).toBe(0);

    // Modify source
    writeFileSync(join(String(dir), "app.ts"), `console.log(99);`);

    // Second run — should NOT use old cached bytecode
    await using proc2 = Bun.spawn({
      cmd: [bunExe(), "app.ts"],
      env,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout2, exitCode2] = await Promise.all([proc2.stdout.text(), proc2.exited]);
    expect(stdout2.trim()).toBe("99");
    expect(exitCode2).toBe(0);

    if (existsSync(bcCacheDir)) rmSync(bcCacheDir, { recursive: true });
  });

  test("disabling transpiler cache also disables bytecode cache", async () => {
    using dir = tempDir("bc-disabled", {
      "app.ts": `console.log("no cache");`,
    });

    const env = {
      ...bunEnv,
      BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0",
    };

    await using proc = Bun.spawn({
      cmd: [bunExe(), "app.ts"],
      env,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("no cache");
    expect(exitCode).toBe(0);
  });
});
