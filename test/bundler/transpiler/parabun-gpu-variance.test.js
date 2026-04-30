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

describe("para:gpu — variance / stddev", () => {
  it("variance and stddev of [1, 2, 3, 4, 5] match the analytical answer", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-variance-basic",
      `
        import gpu from "para:gpu";
        gpu.setBackend("cpu");
        const input = new Float32Array([1, 2, 3, 4, 5]);
        // mean = 3. squared deviations: 4 + 1 + 0 + 1 + 4 = 10.
        // population variance = 10/5 = 2. stddev = sqrt(2) ≈ 1.4142136.
        console.log("var",    gpu.variance(input).toFixed(6));
        console.log("stddev", gpu.stddev(input).toFixed(6));
      `,
    );
    expect(stdout).toBe(["var 2.000000", "stddev 1.414214"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("ddof=1 produces sample variance (Bessel correction)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-variance-sample",
      `
        import gpu from "para:gpu";
        gpu.setBackend("cpu");
        const input = new Float32Array([1, 2, 3, 4, 5]);
        // sample variance = sumSq / (n - 1) = 10 / 4 = 2.5
        console.log("var",    gpu.variance(input, { ddof: 1 }).toFixed(6));
        console.log("stddev", gpu.stddev  (input, { ddof: 1 }).toFixed(6));
      `,
    );
    expect(stdout).toBe(["var 2.500000", "stddev 1.581139"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("constant input has zero variance", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-variance-constant",
      `
        import gpu from "para:gpu";
        gpu.setBackend("cpu");
        const input = new Float32Array([7, 7, 7, 7, 7, 7]);
        console.log("var",    gpu.variance(input));
        console.log("stddev", gpu.stddev(input));
      `,
    );
    expect(stdout).toBe(["var 0", "stddev 0"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("two-pass formula is stable on values far from zero", async () => {
    // Naive single-pass sum(x²) - (sum(x))²/n hemorrhages precision when
    // values are large and clustered near each other. Two-pass should
    // give the right answer even at offsets like 1e6 + small noise.
    const { stdout, exitCode } = await runFixture(
      "parabun-variance-large-offset",
      `
        import gpu from "para:gpu";
        gpu.setBackend("cpu");
        // Six values clustered around 1e6 with dev ±1, ±2, ±3.
        const input = new Float32Array([1e6 - 3, 1e6 - 2, 1e6 - 1, 1e6 + 1, 1e6 + 2, 1e6 + 3]);
        // mean = 1e6. squared devs: 9+4+1+1+4+9 = 28. variance = 28/6 ≈ 4.6667.
        const got = gpu.variance(input);
        console.log("close", Math.abs(got - 28/6) / (28/6) < 1e-3);
      `,
    );
    expect(stdout).toBe("close true");
    expect(exitCode).toBe(0);
  });

  it("Uint32Array variance gives exact integer-arithmetic result", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-variance-u32",
      `
        import gpu from "para:gpu";
        gpu.setBackend("cpu");
        const input = new Uint32Array([1, 2, 3, 4, 5]);
        console.log("var", gpu.variance(input));
      `,
    );
    expect(stdout).toBe("var 2");
    expect(exitCode).toBe(0);
  });

  it("stddev / mean composes — coefficient of variation", async () => {
    // CoV = stddev / mean. Standard tool for "is this signal noisy"
    // questions. Verify the obvious composition with reduce.
    const { stdout, exitCode } = await runFixture(
      "parabun-variance-cov",
      `
        import gpu from "para:gpu";
        gpu.setBackend("cpu");
        const input = new Float32Array([100, 102, 98, 101, 99, 103, 97, 100]);
        const mean = gpu.reduce(input, "sum") / input.length;
        const cov = gpu.stddev(input) / mean;
        // The values are within ~3% of 100, so CoV should be small.
        console.log("covSmall", cov < 0.05);
      `,
    );
    expect(stdout).toBe("covSmall true");
    expect(exitCode).toBe(0);
  });

  it("empty input returns NaN", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-variance-empty",
      `
        import gpu from "para:gpu";
        gpu.setBackend("cpu");
        const empty = new Float32Array(0);
        console.log("var", gpu.variance(empty));
        console.log("std", gpu.stddev(empty));
      `,
    );
    expect(stdout).toBe(["var NaN", "std NaN"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("ddof >= n returns NaN (divisor non-positive)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-variance-ddof-too-big",
      `
        import gpu from "para:gpu";
        gpu.setBackend("cpu");
        const input = new Float32Array([1, 2, 3]);
        console.log("ddof3", gpu.variance(input, { ddof: 3 }));
        console.log("ddof5", gpu.variance(input, { ddof: 5 }));
        // ddof=2 leaves divisor = 1, valid.
        console.log("ddof2.lt.divisor", gpu.variance(input, { ddof: 2 }) > 0);
      `,
    );
    expect(stdout).toBe(["ddof3 NaN", "ddof5 NaN", "ddof2.lt.divisor true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("rejects negative or non-finite ddof", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-variance-bad-ddof",
      `
        import gpu from "para:gpu";
        gpu.setBackend("cpu");
        const input = new Float32Array([1, 2, 3]);
        let threw = 0;
        for (const d of [-1, NaN, Infinity, "1"]) {
          try { gpu.variance(input, { ddof: d }); } catch { threw++; }
        }
        console.log("threw", threw);
      `,
    );
    expect(stdout).toBe("threw 4");
    expect(exitCode).toBe(0);
  });

  it("does not mutate its input", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-variance-immutable",
      `
        import gpu from "para:gpu";
        gpu.setBackend("cpu");
        const input = new Float32Array([5, 2, 8, 1, 7]);
        const before = Array.from(input).join(",");
        gpu.variance(input);
        gpu.stddev(input);
        const after = Array.from(input).join(",");
        console.log("preserved", before === after);
      `,
    );
    expect(stdout).toBe("preserved true");
    expect(exitCode).toBe(0);
  });
});
