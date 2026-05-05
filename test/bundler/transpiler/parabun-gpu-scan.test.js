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

describe("parabun:gpu — scan (inclusive prefix sum)", () => {
  it("ones produce the natural numbers 1..n", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-scan-ones",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        const input = new Float32Array(8).fill(1);
        const out = gpu.scan(input);
        console.log(Array.from(out).join(","));
      `,
    );
    expect(stdout).toBe("1,2,3,4,5,6,7,8");
    expect(exitCode).toBe(0);
  });

  it("hand-computed running total of [3, 1, 4, 1, 5, 9, 2, 6]", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-scan-pi",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        const input = new Float32Array([3, 1, 4, 1, 5, 9, 2, 6]);
        const out = gpu.scan(input);
        console.log(Array.from(out).join(","));
      `,
    );
    expect(stdout).toBe("3,4,8,9,14,23,25,31");
    expect(exitCode).toBe(0);
  });

  it("handles negatives — out[i] tracks the running signed sum", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-scan-negatives",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        const input = new Float32Array([1, -1, 2, -3, 5]);
        const out = gpu.scan(input);
        console.log(Array.from(out).join(","));
      `,
    );
    // Running totals: 1, 0, 2, -1, 4
    expect(stdout).toBe("1,0,2,-1,4");
    expect(exitCode).toBe(0);
  });

  it("output length matches input length, including empty input", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-scan-shape",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        const empty = gpu.scan(new Float32Array(0));
        const single = gpu.scan(new Float32Array([42]));
        console.log("empty.len", empty.length);
        console.log("single", single.length, single[0]);
      `,
    );
    expect(stdout).toBe(["empty.len 0", "single 1 42"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("Kahan compensation keeps error tiny on long mixed-magnitude input", async () => {
    // 1e6 elements of 1.0 plus a 1e8 outlier early on. Naive (uncompensated)
    // float32 summation loses accuracy because tiny additions onto a huge
    // accumulator round away. Compensated scan should still produce a final
    // total within a few ULPs of the analytical 1e8 + 1e6 - 1.
    const { stdout, exitCode } = await runFixture(
      "parabun-scan-kahan",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        const N = 1_000_000;
        const input = new Float32Array(N);
        input.fill(1);
        input[1] = 1e8;
        const out = gpu.scan(input);
        const expected = 1e8 + (N - 1);
        const got = out[N - 1];
        const relErr = Math.abs(got - expected) / expected;
        console.log("relErr.lt.1e-6", relErr < 1e-6);
        console.log("len", out.length);
      `,
    );
    expect(stdout).toBe(["relErr.lt.1e-6 true", "len 1000000"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("rejects non-Float32Array input", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-scan-type",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        try {
          gpu.scan(new Float64Array([1, 2, 3]));
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e instanceof TypeError);
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });

  it("Uint32Array input returns a Uint32Array of running totals", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-scan-u32",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        const input = new Uint32Array([3, 1, 4, 1, 5, 9, 2, 6]);
        const out = gpu.scan(input);
        console.log("ctor", out.constructor.name);
        console.log("vals", Array.from(out).join(","));
      `,
    );
    expect(stdout).toBe(["ctor Uint32Array", "vals 3,4,8,9,14,23,25,31"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("Uint32Array scan supports compaction (predicate → write indices)", async () => {
    // Classic stream-compaction pattern: build a 0/1 indicator over which
    // elements satisfy a predicate, scan it, and the (inclusive) result minus
    // 1 at every kept slot is the destination index in the packed output.
    const { stdout, exitCode } = await runFixture(
      "parabun-scan-compaction",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        const data = new Float32Array([5, 12, 3, 8, 17, 2, 11, 6]);
        const keep = new Uint32Array(data.length);
        for (let i = 0; i < data.length; i++) keep[i] = data[i] > 7 ? 1 : 0;
        const idx = gpu.scan(keep);                   // inclusive
        const total = idx[idx.length - 1];
        const out = new Float32Array(total);
        for (let i = 0; i < data.length; i++) {
          if (keep[i]) out[idx[i] - 1] = data[i];
        }
        console.log("kept", total);
        console.log("out", Array.from(out).join(","));
      `,
    );
    // 12, 8, 17, 11 are > 7. Order preserved.
    expect(stdout).toBe(["kept 4", "out 12,8,17,11"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("Uint32Array scan wraps at 2^32 like a real u32 add", async () => {
    // Two adds of 0x80000000 wrap to 0; verifies we don't accidentally
    // promote to 53-bit Number without truncating back to u32.
    const { stdout, exitCode } = await runFixture(
      "parabun-scan-u32-wrap",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        const input = new Uint32Array([0x80000000, 0x80000000, 7]);
        const out = gpu.scan(input);
        console.log(out[0], out[1], out[2]);
      `,
    );
    // 0x80000000 = 2147483648. Second step wraps: 2*2^31 mod 2^32 = 0.
    // Third step adds 7: 7.
    expect(stdout).toBe("2147483648 0 7");
    expect(exitCode).toBe(0);
  });

  it("accepts a held GpuHandle (round-trips through the dispatcher)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-scan-handle",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        using held = new gpu.GpuFloat32Array(new Float32Array([2, 4, 6, 8]));
        const out = gpu.scan(held);
        console.log(Array.from(out).join(","));
      `,
    );
    expect(stdout).toBe("2,6,12,20");
    expect(exitCode).toBe(0);
  });
});

// CUDA recursive scan path. Auto-skips on hosts without CUDA + NVRTC.
// The previous launcher capped at 65,536 elements; the recursive version
// scans blockSums itself when numBlocks exceeds the single-block leaf
// cap. These cases exercise multi-level recursion.
describe("parabun:gpu — scan (cuda recursive multi-stage path)", () => {
  it("300K-element scan exceeds the old single-stage cap", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-scan-cuda-300k",
      `
        import gpu from "parabun:gpu";
        if (!gpu.hasBackend("cuda")) { console.log("SKIP_NO_CUDA"); process.exit(0); }
        gpu.setBackend("cuda");
        const N = 300_000;
        const arr = new Float32Array(N);
        arr.fill(1); // scan(ones) = 1, 2, 3, ..., N
        const ours = gpu.scan(arr);
        const checks = [[0, 1], [255, 256], [1023, 1024], [65535, 65536], [N - 1, N]];
        let ok = true;
        for (const [i, expected] of checks) {
          if (ours[i] !== expected) { console.log("MISMATCH", i, ours[i], "!=", expected); ok = false; }
        }
        console.log("all_ok", ok);
      `,
    );
    if (stdout === "SKIP_NO_CUDA") return;
    expect(stdout).toBe("all_ok true");
    expect(exitCode).toBe(0);
  });

  it("1M-element scan (two recursion levels)", async () => {
    // n = 1_048_576 → numBlocks = 4096 → second-level numBlocks = 16 → leaf.
    const { stdout, exitCode } = await runFixture(
      "parabun-scan-cuda-1m",
      `
        import gpu from "parabun:gpu";
        if (!gpu.hasBackend("cuda")) { console.log("SKIP_NO_CUDA"); process.exit(0); }
        gpu.setBackend("cuda");
        const N = 1 << 20;
        const arr = new Float32Array(N);
        arr.fill(1);
        const ours = gpu.scan(arr);
        const checks = [[0, 1], [65535, 65536], [(1 << 18) - 1, 1 << 18], [N - 1, N]];
        let ok = true;
        for (const [i, expected] of checks) {
          if (ours[i] !== expected) { console.log("MISMATCH", i, ours[i], "!=", expected); ok = false; }
        }
        console.log("all_ok", ok);
      `,
    );
    if (stdout === "SKIP_NO_CUDA") return;
    expect(stdout).toBe("all_ok true");
    expect(exitCode).toBe(0);
  });

  it("non-power-of-2 size past the old 64K cap", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-scan-cuda-odd-size",
      `
        import gpu from "parabun:gpu";
        if (!gpu.hasBackend("cuda")) { console.log("SKIP_NO_CUDA"); process.exit(0); }
        gpu.setBackend("cuda");
        const N = 70_001;
        const arr = new Float32Array(N);
        arr.fill(1);
        const ours = gpu.scan(arr);
        console.log("first", ours[0], "last", ours[N - 1]);
      `,
    );
    if (stdout === "SKIP_NO_CUDA") return;
    expect(stdout).toBe("first 1 last 70001");
    expect(exitCode).toBe(0);
  });

  it("varied-value 200K scan matches the CPU reference within tolerance", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-scan-cuda-varied",
      `
        import gpu from "parabun:gpu";
        if (!gpu.hasBackend("cuda")) { console.log("SKIP_NO_CUDA"); process.exit(0); }
        gpu.setBackend("cuda");
        const N = 200_000;
        const arr = new Float32Array(N);
        for (let i = 0; i < N; i++) arr[i] = (i % 7) - 3;
        gpu.setBackend("cuda");
        const ours = gpu.scan(arr);
        gpu.setBackend("cpu");
        const ref = gpu.scan(arr);
        let maxErr = 0;
        for (let i = 0; i < N; i++) maxErr = Math.max(maxErr, Math.abs(ours[i] - ref[i]));
        // f32 + reordered associativity in tree-reduce: a few ULPs per
        // step. With small-int inputs the running sum stays bounded, so
        // absolute error stays small.
        console.log("maxErr_lt_1", maxErr < 1.0);
      `,
    );
    if (stdout === "SKIP_NO_CUDA") return;
    expect(stdout).toBe("maxErr_lt_1 true");
    expect(exitCode).toBe(0);
  });
});
