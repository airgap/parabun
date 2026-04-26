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

describe("bun:gpu — argMin / argMax", () => {
  it("returns the index of the smallest / largest float on a small input", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-argmm-f32-basic",
      `
        import gpu from "bun:gpu";
        gpu.setBackend("cpu");
        const input = new Float32Array([3, 1, 4, 1, 5, 9, 2, 6]);
        // Min value 1 first appears at index 1; max value 9 at index 5.
        console.log("argMin", gpu.argMin(input));
        console.log("argMax", gpu.argMax(input));
      `,
    );
    expect(stdout).toBe(["argMin 1", "argMax 5"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("ties resolve to the first occurrence (numpy semantics)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-argmm-tie",
      `
        import gpu from "bun:gpu";
        gpu.setBackend("cpu");
        // 1 appears twice for min; 9 appears twice for max. We want the
        // earliest index in both cases.
        const input = new Float32Array([1, 5, 9, 3, 1, 9]);
        console.log("argMin", gpu.argMin(input));
        console.log("argMax", gpu.argMax(input));
      `,
    );
    expect(stdout).toBe(["argMin 0", "argMax 2"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("NaN in the input returns the index of the first NaN", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-argmm-nan",
      `
        import gpu from "bun:gpu";
        gpu.setBackend("cpu");
        const input = new Float32Array([1, 2, NaN, 3, NaN, 0]);
        console.log("argMin", gpu.argMin(input));
        console.log("argMax", gpu.argMax(input));
      `,
    );
    expect(stdout).toBe(["argMin 2", "argMax 2"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("NaN at index 0 is detected", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-argmm-nan-first",
      `
        import gpu from "bun:gpu";
        gpu.setBackend("cpu");
        const input = new Float32Array([NaN, 1, 2, 3]);
        console.log("argMin", gpu.argMin(input));
        console.log("argMax", gpu.argMax(input));
      `,
    );
    expect(stdout).toBe(["argMin 0", "argMax 0"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("Uint32Array argMin/argMax", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-argmm-u32",
      `
        import gpu from "bun:gpu";
        gpu.setBackend("cpu");
        const input = new Uint32Array([100, 50, 75, 25, 90, 25, 100]);
        // min 25 first at index 3; max 100 first at index 0.
        console.log("argMin", gpu.argMin(input));
        console.log("argMax", gpu.argMax(input));
      `,
    );
    expect(stdout).toBe(["argMin 3", "argMax 0"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("empty input throws RangeError", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-argmm-empty",
      `
        import gpu from "bun:gpu";
        gpu.setBackend("cpu");
        const empty = new Float32Array(0);
        try {
          gpu.argMin(empty);
          console.log("NO_THROW_min");
        } catch (e) {
          console.log("min", e instanceof RangeError);
        }
        try {
          gpu.argMax(empty);
          console.log("NO_THROW_max");
        } catch (e) {
          console.log("max", e instanceof RangeError);
        }
      `,
    );
    expect(stdout).toBe(["min true", "max true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("rejects non-typed-array input", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-argmm-bad-input",
      `
        import gpu from "bun:gpu";
        gpu.setBackend("cpu");
        try {
          gpu.argMax([1, 2, 3]);
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e instanceof TypeError);
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });

  it("agrees with reduce on the value at the chosen index", async () => {
    // A small consistency check: argMin(x) → input[argMin] === reduce(x, "min")
    // (and same for max). If they ever drift apart that's a correctness bug.
    const { stdout, exitCode } = await runFixture(
      "parabun-argmm-consistency",
      `
        import gpu from "bun:gpu";
        gpu.setBackend("cpu");
        const input = new Float32Array([7.5, -2.25, 100, 0, -2.25, 99.99]);
        const iMin = gpu.argMin(input);
        const iMax = gpu.argMax(input);
        console.log("min.match", input[iMin] === gpu.reduce(input, "min"));
        console.log("max.match", input[iMax] === gpu.reduce(input, "max"));
      `,
    );
    expect(stdout).toBe(["min.match true", "max.match true"].join("\n"));
    expect(exitCode).toBe(0);
  });
});
