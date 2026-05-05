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

describe("parabun:gpu — median / quantile", () => {
  it("median of an odd-length input is the middle element", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-median-odd",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        const input = new Float32Array([3, 1, 4, 1, 5]);  // sorted: 1, 1, 3, 4, 5
        console.log("median", gpu.median(input));
      `,
    );
    expect(stdout).toBe("median 3");
    expect(exitCode).toBe(0);
  });

  it("median of an even-length input is the linear interpolation of the middle two", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-median-even",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        const input = new Float32Array([1, 2, 3, 4]);  // sorted: 1, 2, 3, 4
        // q*(n-1) = 0.5 * 3 = 1.5 → between sorted[1]=2 and sorted[2]=3 → 2.5
        console.log("median", gpu.median(input));
      `,
    );
    expect(stdout).toBe("median 2.5");
    expect(exitCode).toBe(0);
  });

  it("quantile q=0 returns the min, q=1 returns the max", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-quantile-extremes",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        const input = new Float32Array([3, 1, 4, 1, 5, 9, 2, 6]);
        console.log("min", gpu.quantile(input, 0));
        console.log("max", gpu.quantile(input, 1));
      `,
    );
    expect(stdout).toBe(["min 1", "max 9"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("quantile q=0.25 / q=0.75 lands on the right order statistic", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-quantile-quartiles",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        // Sorted: 1, 2, 3, 4, 5. n-1 = 4.
        // q=0.25 → pos=1.0 → sorted[1]=2
        // q=0.75 → pos=3.0 → sorted[3]=4
        const input = new Float32Array([1, 2, 3, 4, 5]);
        console.log("Q1", gpu.quantile(input, 0.25));
        console.log("Q3", gpu.quantile(input, 0.75));
      `,
    );
    expect(stdout).toBe(["Q1 2", "Q3 4"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("quantile interpolates linearly between non-integer positions", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-quantile-interp",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        // n=4, so q*(n-1) = q*3.
        // Sorted: 10, 20, 30, 40.
        // q=1/3 → pos=1.0 → sorted[1] = 20
        // q=0.5 → pos=1.5 → 0.5 * 20 + 0.5 * 30 = 25
        const input = new Float32Array([10, 20, 30, 40]);
        console.log("third", gpu.quantile(input, 1/3));
        console.log("half",  gpu.quantile(input, 0.5));
      `,
    );
    expect(stdout).toBe(["third 20", "half 25"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("median is robust to outliers (compared to mean)", async () => {
    // Classic robust-statistics demo: a few wild outliers shift the mean
    // hugely but barely move the median.
    const { stdout, exitCode } = await runFixture(
      "parabun-median-robust",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        const clean = new Float32Array([10, 11, 12, 13, 14, 15]);
        const dirty = new Float32Array([10, 11, 12, 13, 14, 15, 1000, 2000]);
        const meanClean   = gpu.reduce(clean, "sum") / clean.length;
        const meanDirty   = gpu.reduce(dirty, "sum") / dirty.length;
        const medianClean = gpu.median(clean);
        const medianDirty = gpu.median(dirty);
        // Median should barely move; mean explodes.
        console.log("medianStable", Math.abs(medianDirty - medianClean) < 2);
        console.log("meanShifts",   Math.abs(meanDirty - meanClean) > 100);
      `,
    );
    expect(stdout).toBe(["medianStable true", "meanShifts true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("Uint32Array input produces a fractional median for even-length cases", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-median-u32",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        const input = new Uint32Array([1, 2, 3, 4]);
        console.log("median", gpu.median(input));
        // Order statistic at q=1 should still hit the integer max exactly.
        console.log("max", gpu.quantile(input, 1));
      `,
    );
    expect(stdout).toBe(["median 2.5", "max 4"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("empty input returns NaN (numpy convention)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-median-empty",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        const empty = new Float32Array(0);
        console.log("median", gpu.median(empty));
        console.log("q05",    gpu.quantile(empty, 0.5));
      `,
    );
    expect(stdout).toBe(["median NaN", "q05 NaN"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("quantile rejects q out of [0, 1]", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-quantile-bad-q",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        const input = new Float32Array([1, 2, 3]);
        let threw = 0;
        for (const q of [-0.1, 1.5, NaN, "0.5"]) {
          try { gpu.quantile(input, q); } catch { threw++; }
        }
        console.log("threw", threw);
      `,
    );
    expect(stdout).toBe("threw 4");
    expect(exitCode).toBe(0);
  });

  it("quantile does not mutate its input", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-quantile-immutable",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        const input = new Float32Array([5, 2, 8, 1, 7]);
        const before = Array.from(input).join(",");
        gpu.median(input);
        const after = Array.from(input).join(",");
        console.log("orderPreserved", before === after);
      `,
    );
    expect(stdout).toBe("orderPreserved true");
    expect(exitCode).toBe(0);
  });
});

// CUDA bitonic-sort path. Auto-skips on hosts without CUDA + NVRTC; the
// fixture runs `gpu.setBackend("cuda")` and bails to a sentinel if the
// device path isn't available, so the test passes on CPU-only CI hosts
// without manual gating in the harness.
describe("parabun:gpu — quantile (cuda bitonic-sort path)", () => {
  it("matches the CPU reference within f32 precision across q ∈ {0, 0.25, 0.5, 0.75, 1, 0.137}", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-quantile-cuda",
      `
        import gpu from "parabun:gpu";
        if (!gpu.hasBackend("cuda")) { console.log("SKIP_NO_CUDA"); process.exit(0); }
        gpu.setBackend("cuda");
        const arr = new Float32Array(2048);
        for (let i = 0; i < arr.length; i++) arr[i] = Math.sin(i * 0.123) * 100;
        const sorted = new Float32Array(arr); sorted.sort();
        const targets = [0.0, 0.25, 0.5, 0.75, 1.0, 0.137];
        let maxErr = 0;
        for (const q of targets) {
          const ours = gpu.quantile(arr, q);
          const pos = q * (arr.length - 1);
          const lo = Math.floor(pos), hi = Math.ceil(pos);
          const ref = lo === hi ? sorted[lo] : sorted[lo] * (1 - (pos - lo)) + sorted[hi] * (pos - lo);
          maxErr = Math.max(maxErr, Math.abs(ours - ref));
        }
        // Bitonic over fp32 + linear interp host-side: bit-exact match
        // expected (no FMA reorder vs CPU sort path).
        console.log("maxErr<=1e-5", maxErr <= 1e-5);
      `,
    );
    if (stdout === "SKIP_NO_CUDA") return; // CPU-only host
    expect(stdout).toBe("maxErr<=1e-5 true");
    expect(exitCode).toBe(0);
  });

  it("non-power-of-2 lengths are padded with +Inf and produce the right order statistic", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-quantile-cuda-pad",
      `
        import gpu from "parabun:gpu";
        if (!gpu.hasBackend("cuda")) { console.log("SKIP_NO_CUDA"); process.exit(0); }
        gpu.setBackend("cuda");
        // n = 1000 → padded to 1024 with +Inf. q=0.5 lands at sorted[499.5]
        // which must NOT be one of the +Inf padding entries (those would
        // sort to indices 1000..1023).
        const arr = new Float32Array(1000);
        for (let i = 0; i < arr.length; i++) arr[i] = i + 0.5; // already sorted
        // pos = 0.5 * 999 = 499.5 → 0.5 * (sorted[499] + sorted[500])
        //                         = 0.5 * (499.5 + 500.5) = 500
        console.log("median", gpu.median(arr));
      `,
    );
    if (stdout === "SKIP_NO_CUDA") return;
    expect(stdout).toBe("median 500");
    expect(exitCode).toBe(0);
  });

  it("does not mutate the input on CUDA path", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-quantile-cuda-immutable",
      `
        import gpu from "parabun:gpu";
        if (!gpu.hasBackend("cuda")) { console.log("SKIP_NO_CUDA"); process.exit(0); }
        gpu.setBackend("cuda");
        const input = new Float32Array([5, 2, 8, 1, 7, 3, 6, 4]);
        const before = Array.from(input).join(",");
        gpu.median(input);
        const after = Array.from(input).join(",");
        console.log("orderPreserved", before === after);
      `,
    );
    if (stdout === "SKIP_NO_CUDA") return;
    expect(stdout).toBe("orderPreserved true");
    expect(exitCode).toBe(0);
  });
});
