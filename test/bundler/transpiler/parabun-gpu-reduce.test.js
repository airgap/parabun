import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

async function runFixture(prefix, source) {
  using dir = tempDir(prefix, { "index.ts": source.trimStart() });
  await using proc = Bun.spawn({
    cmd: [bunExe(), "index.ts"],
    env: bunEnv,
    cwd: String(dir),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

describe("parabun:gpu — reduce", () => {
  it("Float32Array sum/min/max on a small input matches the analytical answers", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-reduce-f32-basic",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        const input = new Float32Array([3, 1, 4, 1, 5, 9, 2, 6]);
        console.log("sum", gpu.reduce(input, "sum"));
        console.log("min", gpu.reduce(input, "min"));
        console.log("max", gpu.reduce(input, "max"));
      `,
    );
    expect(stdout).toBe(["sum 31", "min 1", "max 9"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("empty input follows the JS Math.min/max + sum=0 conventions", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-reduce-empty",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        const empty = new Float32Array(0);
        console.log("sum", gpu.reduce(empty, "sum"));
        console.log("min", gpu.reduce(empty, "min"));
        console.log("max", gpu.reduce(empty, "max"));
      `,
    );
    expect(stdout).toBe(["sum 0", "min Infinity", "max -Infinity"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("Kahan compensation keeps the sum tight on long mixed-magnitude input", async () => {
    // Same shape as the scan Kahan test: 1M ones plus one 1e8 outlier early on.
    // Naive f32 summation drifts as the accumulator grows; compensated should
    // come within a few ULPs of the analytical answer.
    const { stdout, exitCode } = await runFixture(
      "parabun-reduce-kahan",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        const N = 1_000_000;
        const input = new Float32Array(N);
        input.fill(1);
        input[1] = 1e8;
        const got = gpu.reduce(input, "sum");
        const expected = 1e8 + (N - 1);
        const relErr = Math.abs(got - expected) / expected;
        console.log("relErr.lt.1e-6", relErr < 1e-6);
      `,
    );
    expect(stdout).toBe("relErr.lt.1e-6 true");
    expect(exitCode).toBe(0);
  });

  it("NaN in the input propagates to the result for min and max", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-reduce-nan",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        const withNan = new Float32Array([1, 2, NaN, 4]);
        console.log("min", gpu.reduce(withNan, "min"));
        console.log("max", gpu.reduce(withNan, "max"));
      `,
    );
    expect(stdout).toBe(["min NaN", "max NaN"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("Uint32Array sum/min/max return integers", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-reduce-u32-basic",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        const input = new Uint32Array([3, 1, 4, 1, 5, 9, 2, 6]);
        console.log("sum", gpu.reduce(input, "sum"));
        console.log("min", gpu.reduce(input, "min"));
        console.log("max", gpu.reduce(input, "max"));
      `,
    );
    expect(stdout).toBe(["sum 31", "min 1", "max 9"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("Uint32Array sum wraps at 2^32 like a u32 add", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-reduce-u32-wrap",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        const input = new Uint32Array([0x80000000, 0x80000000, 7]);
        console.log("sum", gpu.reduce(input, "sum"));
      `,
    );
    expect(stdout).toBe("sum 7");
    expect(exitCode).toBe(0);
  });

  it("rejects an unknown op", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-reduce-bad-op",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        try {
          gpu.reduce(new Float32Array([1, 2, 3]), "product");
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e instanceof TypeError, e.message.includes("sum"));
        }
      `,
    );
    expect(stdout).toBe("THREW true true");
    expect(exitCode).toBe(0);
  });

  it("rejects non-typed-array input", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-reduce-bad-input",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        try {
          gpu.reduce([1, 2, 3], "sum");
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e instanceof TypeError);
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });

  it("accepts a held GpuHandle (round-trips through the dispatcher)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-reduce-handle",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        using held = new gpu.GpuFloat32Array(new Float32Array([10, 20, 30, 40]));
        console.log("sum", gpu.reduce(held, "sum"));
        console.log("max", gpu.reduce(held, "max"));
      `,
    );
    expect(stdout).toBe(["sum 100", "max 40"].join("\n"));
    expect(exitCode).toBe(0);
  });
});
