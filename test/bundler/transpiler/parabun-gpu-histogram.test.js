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

describe("parabun:gpu — histogram", () => {
  it("uniform input across the range produces evenly populated bins", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-hist-uniform",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        // 10 values exactly hitting bin centers 0..9 in a 10-bin [0,10] range.
        const input = new Float32Array([0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5]);
        const out = gpu.histogram(input, 10, { min: 0, max: 10 });
        console.log("ctor", out.constructor.name);
        console.log("vals", Array.from(out).join(","));
      `,
    );
    expect(stdout).toBe(["ctor Uint32Array", "vals 1,1,1,1,1,1,1,1,1,1"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("hand-computed bin counts on a known input", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-hist-hand",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        // Range [0, 4], 4 bins → bin width 1. Bin edges [0,1) [1,2) [2,3) [3,4].
        // Values: three in bin 0, two in bin 1, one in bin 2, four in bin 3.
        const input = new Float32Array([
          0.1, 0.5, 0.9,        // bin 0
          1.0, 1.99,            // bin 1
          2.5,                  // bin 2
          3.0, 3.5, 3.99, 4.0,  // bin 3 (4.0 lands at the inclusive top edge)
        ]);
        const out = gpu.histogram(input, 4, { min: 0, max: 4 });
        console.log(Array.from(out).join(","));
      `,
    );
    expect(stdout).toBe("3,2,1,4");
    expect(exitCode).toBe(0);
  });

  it("top edge is inclusive (numpy convention)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-hist-top-edge",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        // Without top-edge inclusivity, the value exactly at max would
        // land in bin = bins (out of range) and be dropped. Verify it
        // counts in the last bin instead.
        const input = new Float32Array([1.0, 1.0, 1.0]);
        const out = gpu.histogram(input, 5, { min: 0, max: 1 });
        console.log(Array.from(out).join(","));
      `,
    );
    // All three should count in the last bin (index 4), not be dropped.
    expect(stdout).toBe("0,0,0,0,3");
    expect(exitCode).toBe(0);
  });

  it("values outside [min, max] are silently dropped", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-hist-out-of-range",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        const input = new Float32Array([-5, 0.5, 1.5, 2.5, 100, NaN, 3.5]);
        const out = gpu.histogram(input, 4, { min: 0, max: 4 });
        console.log("vals", Array.from(out).join(","));
        const total = out.reduce((a, b) => a + b, 0);
        console.log("total", total);
      `,
    );
    // 0.5,1.5,2.5,3.5 survive — 4 values, one per bin. -5, 100, NaN dropped.
    expect(stdout).toBe(["vals 1,1,1,1", "total 4"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("auto-resolves min/max from the data when opts is omitted", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-hist-auto-range",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        // Without an explicit range, histogram should pick min=1, max=8 and
        // distribute 8 values across 4 bins (bin width = (8-1)/4 = 1.75).
        // Bins: [1,2.75) [2.75,4.5) [4.5,6.25) [6.25,8].
        const input = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]);
        const out = gpu.histogram(input, 4);
        console.log(Array.from(out).join(","));
        const total = out.reduce((a, b) => a + b, 0);
        console.log("total", total);
      `,
    );
    // 1,2 → bin 0; 3,4 → bin 1; 5,6 → bin 2; 7,8 → bin 3 (8 is inclusive top).
    expect(stdout).toBe(["2,2,2,2", "total 8"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("degenerate range (min == max) puts every matching value in bin 0", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-hist-degenerate",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        const input = new Float32Array([5, 5, 5, 5, 5]);
        const out = gpu.histogram(input, 4, { min: 5, max: 5 });
        console.log(Array.from(out).join(","));
      `,
    );
    expect(stdout).toBe("5,0,0,0");
    expect(exitCode).toBe(0);
  });

  it("empty input yields an all-zero histogram", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-hist-empty",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        // No data → reduce(min)=+Inf, reduce(max)=-Inf → ±Infinity range,
        // returns an all-zero histogram without throwing.
        const out = gpu.histogram(new Float32Array(0), 5);
        console.log(Array.from(out).join(","));
      `,
    );
    expect(stdout).toBe("0,0,0,0,0");
    expect(exitCode).toBe(0);
  });

  it("rejects non-integer or non-positive bin counts", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-hist-bad-bins",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        const input = new Float32Array([1, 2, 3]);
        let threw = 0;
        try { gpu.histogram(input, 0); } catch { threw++; }
        try { gpu.histogram(input, -3); } catch { threw++; }
        try { gpu.histogram(input, 3.5); } catch { threw++; }
        console.log("threw", threw);
      `,
    );
    expect(stdout).toBe("threw 3");
    expect(exitCode).toBe(0);
  });

  it("rejects min > max", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-hist-bad-range",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        const input = new Float32Array([1, 2, 3]);
        try {
          gpu.histogram(input, 5, { min: 10, max: 5 });
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e instanceof RangeError);
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });

  it("scales to a moderately large input — counts sum to N", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-hist-large",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        // 100k values uniformly in [0,1). Counts must sum to N exactly,
        // and the per-bin counts should be roughly N/bins.
        const N = 100_000;
        const input = new Float32Array(N);
        // Linear-congruential PRNG so the test is deterministic across hosts.
        let s = 1;
        for (let i = 0; i < N; i++) {
          s = (Math.imul(s, 1103515245) + 12345) >>> 0;
          input[i] = (s >>> 0) / 0x100000000; // [0, 1)
        }
        const bins = 10;
        const out = gpu.histogram(input, bins, { min: 0, max: 1 });
        const total = out.reduce((a, b) => a + b, 0);
        const expected = N / bins;
        let maxDev = 0;
        for (let i = 0; i < bins; i++) {
          const dev = Math.abs(out[i] - expected) / expected;
          if (dev > maxDev) maxDev = dev;
        }
        console.log("total.eq.N", total === N);
        // Per-bin variation should be tiny on uniform random — < 5% off the mean.
        console.log("uniform.lt.5pct", maxDev < 0.05);
      `,
    );
    expect(stdout).toBe(["total.eq.N true", "uniform.lt.5pct true"].join("\n"));
    expect(exitCode).toBe(0);
  });
});
