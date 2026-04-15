import { describe, expect, test } from "bun:test";
import { bunEnv, bunExe, tempDirWithFiles } from "harness";
import { statSync } from "node:fs";
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
