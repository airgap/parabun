import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

describe("Bun.pmap", () => {
  it("maps a pure function over an array in parallel", async () => {
    using dir = tempDir("parabun-pmap-basic", {
      "index.pjs": `
        import { pmap } from "bun:parallel";
        pure function double(x) { return x * 2; }
        const out = await pmap(double, [1, 2, 3, 4, 5, 6, 7, 8]);
        console.log(JSON.stringify(out));
      `.trimStart(),
    });

    await using proc = Bun.spawn({
      cmd: [bunExe(), "index.pjs"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);

    expect(stdout.trim()).toBe("[2,4,6,8,10,12,14,16]");
    expect(exitCode).toBe(0);
  });

  it("passes the index as the second argument", async () => {
    using dir = tempDir("parabun-pmap-index", {
      "index.pjs": `
        import { pmap } from "bun:parallel";
        pure function withIdx(x, i) { return x + ":" + i; }
        const out = await pmap(withIdx, ["a", "b", "c"]);
        console.log(JSON.stringify(out));
      `.trimStart(),
    });

    await using proc = Bun.spawn({
      cmd: [bunExe(), "index.pjs"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe('["a:0","b:1","c:2"]');
    expect(exitCode).toBe(0);
  });

  it("returns empty array for empty input", async () => {
    using dir = tempDir("parabun-pmap-empty", {
      "index.pjs": `
        import { pmap } from "bun:parallel";
        pure function double(x) { return x * 2; }
        const out = await pmap(double, []);
        console.log(JSON.stringify(out));
      `.trimStart(),
    });

    await using proc = Bun.spawn({
      cmd: [bunExe(), "index.pjs"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("[]");
    expect(exitCode).toBe(0);
  });

  it("respects concurrency option", async () => {
    using dir = tempDir("parabun-pmap-conc", {
      "index.pjs": `
        import { pmap } from "bun:parallel";
        pure function square(x) { return x * x; }
        const out = await pmap(square, [1, 2, 3, 4, 5], { concurrency: 2 });
        console.log(JSON.stringify(out));
      `.trimStart(),
    });

    await using proc = Bun.spawn({
      cmd: [bunExe(), "index.pjs"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("[1,4,9,16,25]");
    expect(exitCode).toBe(0);
  });

  it("propagates errors from the worker", async () => {
    using dir = tempDir("parabun-pmap-err", {
      "index.pjs": `
        import { pmap } from "bun:parallel";
        pure function bomb(x) { if (x === 3) throw new Error("boom at " + x); return x; }
        try {
          await pmap(bomb, [1, 2, 3, 4]);
          console.log("NO_THROW");
        } catch (e) {
          console.log("CAUGHT:" + e.message);
        }
      `.trimStart(),
    });

    await using proc = Bun.spawn({
      cmd: [bunExe(), "index.pjs"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("CAUGHT:boom at 3");
    expect(exitCode).toBe(0);
  });

  it("handles async pure functions", async () => {
    using dir = tempDir("parabun-pmap-async", {
      "index.pjs": `
        import { pmap } from "bun:parallel";
        pure async function asyncDouble(x) { return x * 2; }
        const out = await pmap(asyncDouble, [1, 2, 3]);
        console.log(JSON.stringify(out));
      `.trimStart(),
    });

    await using proc = Bun.spawn({
      cmd: [bunExe(), "index.pjs"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("[2,4,6]");
    expect(exitCode).toBe(0);
  });

  it("rejects non-function first arg", async () => {
    using dir = tempDir("parabun-pmap-nofn", {
      "index.pjs": `
        import { pmap } from "bun:parallel";
        try {
          await pmap(42, [1,2,3]);
          console.log("NO_THROW");
        } catch (e) {
          console.log(e instanceof TypeError ? "TYPE_ERROR" : "WRONG");
        }
      `.trimStart(),
    });

    await using proc = Bun.spawn({
      cmd: [bunExe(), "index.pjs"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("TYPE_ERROR");
    expect(exitCode).toBe(0);
  });
});
