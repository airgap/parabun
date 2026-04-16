import { describe, expect, test } from "bun:test";
import { bunEnv, bunExe, tempDirWithFiles } from "harness";
import { readFileSync, statSync, writeFileSync } from "node:fs";
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
    let jsContent = readFileSync(entry.path, "utf-8");
    jsContent = jsContent.replace("double(21)", "double(50)");
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
