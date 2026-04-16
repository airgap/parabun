import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

describe("pmap SAB-backed TypedArray path", () => {
  it("maps Float32Array inline for small inputs", async () => {
    using dir = tempDir("pmap-sab-f32-small", {
      "index.pjs": `
        import { pmap } from "bun:parallel";
        pure function double(x) { return x * 2; }
        const out = await pmap(double, new Float32Array([1, 2, 3, 4]));
        console.log(JSON.stringify({
          type: out.constructor.name,
          values: Array.from(out),
        }));
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
    const parsed = JSON.parse(stdout.trim());
    expect(parsed.type).toBe("Float32Array");
    expect(parsed.values).toEqual([2, 4, 6, 8]);
    expect(exitCode).toBe(0);
  });

  it("maps Float64Array correctly", async () => {
    using dir = tempDir("pmap-sab-f64", {
      "index.pjs": `
        import { pmap } from "bun:parallel";
        pure function half(x) { return x / 2; }
        const out = await pmap(half, new Float64Array([10, 20, 30]));
        console.log(JSON.stringify({
          type: out.constructor.name,
          values: Array.from(out),
        }));
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
    const parsed = JSON.parse(stdout.trim());
    expect(parsed.type).toBe("Float64Array");
    expect(parsed.values).toEqual([5, 10, 15]);
    expect(exitCode).toBe(0);
  });

  it("maps Int32Array correctly", async () => {
    using dir = tempDir("pmap-sab-i32", {
      "index.pjs": `
        import { pmap } from "bun:parallel";
        pure function square(x) { return x * x; }
        const out = await pmap(square, new Int32Array([2, 3, 4, 5]));
        console.log(JSON.stringify({
          type: out.constructor.name,
          values: Array.from(out),
        }));
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
    const parsed = JSON.parse(stdout.trim());
    expect(parsed.type).toBe("Int32Array");
    expect(parsed.values).toEqual([4, 9, 16, 25]);
    expect(exitCode).toBe(0);
  });

  it("dispatches to workers via SAB for large TypedArrays", async () => {
    using dir = tempDir("pmap-sab-large", {
      "index.pjs": `
        import { pmap } from "bun:parallel";
        pure function addOne(x) { return x + 1; }
        const input = new Float32Array(2000);
        for (let i = 0; i < 2000; i++) input[i] = i;
        const out = await pmap(addOne, input);
        console.log(JSON.stringify({
          type: out.constructor.name,
          len: out.length,
          first: out[0],
          last: out[1999],
          correct: out[0] === 1 && out[999] === 1000 && out[1999] === 2000,
        }));
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
    const parsed = JSON.parse(stdout.trim());
    expect(parsed.type).toBe("Float32Array");
    expect(parsed.len).toBe(2000);
    expect(parsed.correct).toBe(true);
    expect(exitCode).toBe(0);
  });

  it("returns empty TypedArray for empty input", async () => {
    using dir = tempDir("pmap-sab-empty", {
      "index.pjs": `
        import { pmap } from "bun:parallel";
        pure function id(x) { return x; }
        const out = await pmap(id, new Float32Array(0));
        console.log(JSON.stringify({
          type: out.constructor.name,
          len: out.length,
        }));
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
    const parsed = JSON.parse(stdout.trim());
    expect(parsed.type).toBe("Float32Array");
    expect(parsed.len).toBe(0);
    expect(exitCode).toBe(0);
  });

  it("respects concurrency=1 for TypedArrays", async () => {
    using dir = tempDir("pmap-sab-conc1", {
      "index.pjs": `
        import { pmap } from "bun:parallel";
        pure function negate(x) { return -x; }
        const input = new Float32Array([1, 2, 3, 4, 5]);
        const out = await pmap(negate, input, { concurrency: 1 });
        console.log(JSON.stringify({
          type: out.constructor.name,
          values: Array.from(out),
        }));
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
    const parsed = JSON.parse(stdout.trim());
    expect(parsed.type).toBe("Float32Array");
    expect(parsed.values).toEqual([-1, -2, -3, -4, -5]);
    expect(exitCode).toBe(0);
  });

  it("preserves element index in mapping function", async () => {
    using dir = tempDir("pmap-sab-idx", {
      "index.pjs": `
        import { pmap } from "bun:parallel";
        pure function addIdx(x, i) { return x + i; }
        const out = await pmap(addIdx, new Int32Array([100, 200, 300]));
        console.log(JSON.stringify(Array.from(out)));
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
    expect(JSON.parse(stdout.trim())).toEqual([100, 201, 302]);
    expect(exitCode).toBe(0);
  });

  it("regular arrays still work after TypedArray support", async () => {
    using dir = tempDir("pmap-sab-compat", {
      "index.pjs": `
        import { pmap } from "bun:parallel";
        pure function double(x) { return x * 2; }
        const out = await pmap(double, [1, 2, 3]);
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
    expect(stdout.trim()).toBe("[2,4,6]");
    expect(exitCode).toBe(0);
  });
});
