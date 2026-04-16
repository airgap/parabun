import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

describe("preduce", () => {
  it("reduces a regular array with sum", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        import { preduce } from "bun:parallel";
        pure function add(acc, x) { return acc + x; }
        const result = await preduce(add, [1, 2, 3, 4, 5], 0);
        console.log(result);
        `,
      ],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("15");
    expect(exitCode).toBe(0);
  });

  it("reduces an empty array to initialValue", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        import { preduce } from "bun:parallel";
        pure function add(acc, x) { return acc + x; }
        const result = await preduce(add, [], 42);
        console.log(result);
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

  it("reduces with string concatenation", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        import { preduce } from "bun:parallel";
        pure function cat(acc, x) { return acc + x; }
        const result = await preduce(cat, ["a", "b", "c"], "");
        console.log(result);
        `,
      ],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("abc");
    expect(exitCode).toBe(0);
  });

  it("respects concurrency=1", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        import { preduce } from "bun:parallel";
        pure function add(acc, x) { return acc + x; }
        const result = await preduce(add, [10, 20, 30], 0, { concurrency: 1 });
        console.log(result);
        `,
      ],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("60");
    expect(exitCode).toBe(0);
  });

  it("reduces Float32Array inline for small inputs", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        import { preduce } from "bun:parallel";
        pure function add(acc, x) { return acc + x; }
        const result = await preduce(add, new Float32Array([1, 2, 3, 4]), 0);
        console.log(result);
        `,
      ],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("10");
    expect(exitCode).toBe(0);
  });

  it("reduces Float64Array correctly", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        import { preduce } from "bun:parallel";
        pure function mul(acc, x) { return acc * x; }
        const result = await preduce(mul, new Float64Array([2, 3, 4]), 1);
        console.log(result);
        `,
      ],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("24");
    expect(exitCode).toBe(0);
  });

  it("reduces Int32Array correctly", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        import { preduce } from "bun:parallel";
        pure function max(acc, x) { return acc > x ? acc : x; }
        const result = await preduce(max, new Int32Array([3, 7, 2, 9, 1]), -Infinity);
        console.log(result);
        `,
      ],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("9");
    expect(exitCode).toBe(0);
  });

  it("reduces empty TypedArray to initialValue", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        import { preduce } from "bun:parallel";
        pure function add(acc, x) { return acc + x; }
        const result = await preduce(add, new Float32Array(0), 99);
        console.log(result);
        `,
      ],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("99");
    expect(exitCode).toBe(0);
  });

  it("dispatches large TypedArray to workers via SAB", async () => {
    using dir = tempDir("preduce-sab-large", {
      "index.pjs": `
        import { preduce } from "bun:parallel";
        pure function add(acc, x) { return acc + x; }
        const input = new Float64Array(2000);
        for (let i = 0; i < 2000; i++) input[i] = i + 1;
        const result = await preduce(add, input, 0);
        // sum of 1..2000 = 2000*2001/2 = 2001000
        console.log(result);
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
    expect(stdout.trim()).toBe("2001000");
    expect(exitCode).toBe(0);
  });

  it("throws TypeError for non-function first arg", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        import { preduce } from "bun:parallel";
        try {
          await preduce(42, [1, 2], 0);
          console.log("no error");
        } catch (e) {
          console.log(e.constructor.name + ": " + e.message);
        }
        `,
      ],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toContain("TypeError");
    expect(exitCode).toBe(0);
  });

  it("throws TypeError for non-array second arg", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        import { preduce } from "bun:parallel";
        pure function add(acc, x) { return acc + x; }
        try {
          await preduce(add, "not an array", 0);
          console.log("no error");
        } catch (e) {
          console.log(e.constructor.name + ": " + e.message);
        }
        `,
      ],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toContain("TypeError");
    expect(exitCode).toBe(0);
  });

  it("pmap still works after adding preduce", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        import { pmap } from "bun:parallel";
        pure function double(x) { return x * 2; }
        const out = await pmap(double, [1, 2, 3]);
        console.log(JSON.stringify(out));
        `,
      ],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("[2,4,6]");
    expect(exitCode).toBe(0);
  });
});
