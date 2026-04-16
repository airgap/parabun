import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

describe("pipeParallel", () => {
  it("maps array through single stage", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        import { map, pipeParallel } from "bun:pipeline";
        pure function double(x) { return x * 2; }
        const data = Array.from({ length: 500 }, (_, i) => i);
        const out = await pipeParallel(data, map(double));
        console.log(JSON.stringify({ len: out.length, first: out[0], last: out[499] }));
        `,
      ],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    const parsed = JSON.parse(stdout.trim());
    expect(parsed).toEqual({ len: 500, first: 0, last: 998 });
    expect(exitCode).toBe(0);
  });

  it("composes consecutive maps into single pmap", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        import { map, pipeParallel } from "bun:pipeline";
        pure function addOne(x) { return x + 1; }
        pure function double(x) { return x * 2; }
        pure function square(x) { return x * x; }
        const data = Array.from({ length: 300 }, (_, i) => i);
        const out = await pipeParallel(data, map(addOne), map(double), map(square));
        // (0+1)*2 = 2, 2^2 = 4
        // (1+1)*2 = 4, 4^2 = 16
        // (299+1)*2 = 600, 600^2 = 360000
        console.log(JSON.stringify({ first: out[0], second: out[1], last: out[299] }));
        `,
      ],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    const parsed = JSON.parse(stdout.trim());
    expect(parsed).toEqual({ first: 4, second: 16, last: 360000 });
    expect(exitCode).toBe(0);
  });

  it("handles filter barrier between map stages", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        import { map, filter, pipeParallel } from "bun:pipeline";
        pure function double(x) { return x * 2; }
        pure function isEven(x) { return x % 4 === 0; }
        pure function addTen(x) { return x + 10; }
        const data = Array.from({ length: 300 }, (_, i) => i);
        const out = await pipeParallel(data, map(double), filter(isEven), map(addTen));
        // double: [0,2,4,6,8,...] → filter(x%4===0): [0,4,8,12,...] → +10: [10,14,18,22,...]
        console.log(JSON.stringify({ len: out.length, first: out[0], second: out[1] }));
        `,
      ],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    const parsed = JSON.parse(stdout.trim());
    expect(parsed.len).toBe(150);
    expect(parsed.first).toBe(10);
    expect(parsed.second).toBe(14);
    expect(exitCode).toBe(0);
  });

  it("handles reduce terminal with preduce", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        import { map, reduce, pipeParallel } from "bun:pipeline";
        pure function double(x) { return x * 2; }
        pure function add(acc, x) { return acc + x; }
        const data = Array.from({ length: 500 }, (_, i) => i + 1);
        const result = await pipeParallel(data, map(double), reduce(add, 0));
        // sum of 1..500 = 125250, doubled = 250500
        console.log(result);
        `,
      ],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("250500");
    expect(exitCode).toBe(0);
  });

  it("falls back to serial for small arrays", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        import { map, collect, pipeParallel } from "bun:pipeline";
        pure function double(x) { return x * 2; }
        const out = await pipeParallel([1, 2, 3], map(double));
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

  it("handles empty source", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        import { map, pipeParallel } from "bun:pipeline";
        pure function double(x) { return x * 2; }
        const out = await pipeParallel([], map(double));
        console.log(JSON.stringify(out));
        `,
      ],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("[]");
    expect(exitCode).toBe(0);
  });

  it("accepts iterable source (generator)", async () => {
    using dir = tempDir("pipe-par-gen", {
      "index.pjs": `
        import { map, pipeParallel } from "bun:pipeline";
        import { range } from "bun:pipeline";
        pure function square(x) { return x * x; }
        const out = await pipeParallel(range(300), map(square));
        console.log(JSON.stringify({ len: out.length, first: out[0], last: out[299] }));
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
    expect(parsed).toEqual({ len: 300, first: 0, last: 89401 });
    expect(exitCode).toBe(0);
  });

  it("handles no stages (identity)", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        import { pipeParallel } from "bun:pipeline";
        const out = await pipeParallel([1, 2, 3]);
        console.log(JSON.stringify(out));
        `,
      ],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("[1,2,3]");
    expect(exitCode).toBe(0);
  });

  it("pipe still works (regression check)", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        import { map, pipe, collect } from "bun:pipeline";
        pure function double(x) { return x * 2; }
        const out = await collect(pipe([1, 2, 3], map(double)));
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

  it("fuses consecutive maps into reduce (no intermediate array)", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        import { map, reduce, pipeParallel } from "bun:pipeline";
        pure function double(x) { return x * 2; }
        pure function addOne(x) { return x + 1; }
        pure function add(acc, x) { return acc + x; }
        const data = Array.from({ length: 1000 }, (_, i) => i);
        const result = await pipeParallel(data, map(double), map(addOne), reduce(add, 0));
        // (2i+1) summed for i=0..999 = 2*499500 + 1000 = 1000000
        console.log(result);
        `,
      ],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("1000000");
    expect(exitCode).toBe(0);
  });

  it("single map fused into reduce", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        import { map, reduce, pipeParallel } from "bun:pipeline";
        pure function square(x) { return x * x; }
        pure function add(acc, x) { return acc + x; }
        const data = Array.from({ length: 500 }, (_, i) => i + 1);
        const result = await pipeParallel(data, map(square), reduce(add, 0));
        // sum of i^2 for i=1..500 = 500*501*1001/6 = 41791750
        console.log(result);
        `,
      ],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("41791750");
    expect(exitCode).toBe(0);
  });

  it("map|>filter|>map|>reduce full pipeline", async () => {
    using dir = tempDir("pipe-par-full", {
      "index.pjs": `
        import { map, filter, reduce, pipeParallel } from "bun:pipeline";
        pure function triple(x) { return x * 3; }
        pure function isOdd(x) { return x % 2 !== 0; }
        pure function negate(x) { return -x; }
        pure function add(acc, x) { return acc + x; }
        const data = Array.from({ length: 400 }, (_, i) => i);
        const result = await pipeParallel(data, map(triple), filter(isOdd), map(negate), reduce(add, 0));
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

    // Verify against serial computation
    let data = Array.from({ length: 400 }, (_, i) => i);
    data = data.map(x => x * 3);
    data = data.filter(x => x % 2 !== 0);
    data = data.map(x => -x);
    const expected = data.reduce((acc, x) => acc + x, 0);

    expect(stdout.trim()).toBe(String(expected));
    expect(exitCode).toBe(0);
  });
});
