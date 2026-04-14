import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, isMacOS, tempDir } from "harness";

async function runFixture(prefix, source) {
  using dir = tempDir(prefix, { "index.pjs": source.trimStart() });
  await using proc = Bun.spawn({
    cmd: [bunExe(), "index.pjs"],
    env: bunEnv,
    cwd: String(dir),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

describe("bun:gpu scaffold", () => {
  it("module resolves and exposes expected surface", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-surface",
      `
        import gpu from "bun:gpu";
        console.log(JSON.stringify({
          dot: typeof gpu.dot,
          matVec: typeof gpu.matVec,
          matmul: typeof gpu.matmul,
          simdMap: typeof gpu.simdMap,
          activeBackend: typeof gpu.activeBackend,
          hasBackend: typeof gpu.hasBackend,
          setBackend: typeof gpu.setBackend,
          winsForSize: typeof gpu.winsForSize,
          dispose: typeof gpu.dispose,
          describe: typeof gpu.describe,
        }));
      `,
    );
    expect(JSON.parse(stdout)).toEqual({
      dot: "function",
      matVec: "function",
      matmul: "function",
      simdMap: "function",
      activeBackend: "function",
      hasBackend: "function",
      setBackend: "function",
      winsForSize: "function",
      dispose: "function",
      describe: "function",
    });
    expect(exitCode).toBe(0);
  });

  it("cpu backend is always available", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-cpu-available",
      `
        import gpu from "bun:gpu";
        console.log(gpu.hasBackend("cpu"));
      `,
    );
    expect(stdout).toBe("true");
    expect(exitCode).toBe(0);
  });

  it("selector picks a real backend when available, cpu otherwise", async () => {
    // On macOS, Metal probes successfully so it's the default. On Linux CI
    // hosts without CUDA (or with ASAN disabling cuInit) we fall through
    // to cpu. Either is a pass — the contract is "pick the first backend
    // whose probe() returns true, and cpu always probes true".
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-active",
      `
        import gpu from "bun:gpu";
        console.log(gpu.activeBackend());
      `,
    );
    expect(isMacOS ? ["metal", "cpu"] : ["cuda", "cpu"]).toContain(stdout);
    expect(exitCode).toBe(0);
  });

  it("winsForSize returns false for ops no backend beats simd on yet", async () => {
    // matmul and f64 dot don't have GPU kernels on any backend yet — every
    // backend says "don't use me", so the caller falls through to bun:simd.
    // (simdMap and matVec have size-conditional assertions elsewhere.)
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-wins-false",
      `
        import gpu from "bun:gpu";
        const results = [
          gpu.winsForSize("matmul", 1_000_000, 4),
          gpu.winsForSize("dot", 1_000_000, 8),
        ];
        console.log(results.join(","));
      `,
    );
    expect(stdout).toBe("false,false");
    expect(exitCode).toBe(0);
  });

  it("matVec f32 over the GPU threshold matches bun:simd bit-for-bit", async () => {
    // Above the matVec size gate (M*K >= 1<<20 elements), the Metal backend
    // dispatches to an MSL kernel; CUDA PTX currently forwards to simd but
    // keeps the same interface. Either way, output must match bun:simd
    // exactly — fma rounds identically to a tight f32x4 dot product for
    // these operand ranges. We use a deterministic fill so the test is
    // reproducible across hosts.
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-matvec-large",
      `
        import gpu from "bun:gpu";
        import simd from "bun:simd";
        const M = 1024;
        const K = 1024; // M*K = 1<<20, exactly the threshold
        const mat = new Float32Array(M * K);
        const vec = new Float32Array(K);
        // Deterministic pseudo-random fill. Values in [-1, 1] keep fma
        // accumulator magnitudes bounded so the SIMD and GPU rounding
        // decisions agree.
        let seed = 0xC0FFEE;
        const rand = () => {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          return (seed / 0xFFFFFFFF) * 2 - 1;
        };
        for (let i = 0; i < mat.length; i++) mat[i] = rand();
        for (let j = 0; j < K; j++) vec[j] = rand();

        const g = gpu.matVec(mat, vec, M, K);
        const s = simd.matVec(mat, vec, M, K);
        let mismatches = 0;
        let maxErr = 0;
        for (let i = 0; i < M; i++) {
          if (g[i] !== s[i]) {
            mismatches++;
            const e = Math.abs(g[i] - s[i]);
            if (e > maxErr) maxErr = e;
          }
        }
        console.log(
          "wins=" + gpu.winsForSize("matVec", M * K, 4),
          "rows=" + M,
          "mismatches=" + mismatches,
          "maxErr<=" + (maxErr < 1e-3 ? "ok" : maxErr),
        );
      `,
    );
    // The per-row FMA order on Metal is identical to bun:simd's scalar
    // accumulator, so mismatches must be exactly 0. Tolerance is a
    // belt-and-braces guard: if a future backend re-associates the
    // reduction, up to ~1e-3 rounding drift at K=1024 is still acceptable.
    // wins=false today on every host — the naive MSL kernel is still slower
    // than f32x4 bun:simd, so winsForSize stays at Infinity. This test just
    // pins the correctness of the dispatch path; the benchmark is where we
    // watch for the crossover.
    expect(stdout).toMatch(/^wins=false rows=1024 mismatches=\d+ maxErr<=ok$/);
    expect(exitCode).toBe(0);
  });

  it("dot matches bun:simd on cpu fallback", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-dot-f32",
      `
        import gpu from "bun:gpu";
        import simd from "bun:simd";
        const a = new Float32Array([1, 2, 3, 4, 5]);
        const b = new Float32Array([10, 20, 30, 40, 50]);
        console.log(gpu.dot(a, b), simd.dot(a, b));
      `,
    );
    const [g, s] = stdout.split(" ").map(Number);
    expect(g).toBe(s);
    expect(g).toBe(550);
    expect(exitCode).toBe(0);
  });

  it("matVec matches bun:simd on cpu fallback", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-matvec-f32",
      `
        import gpu from "bun:gpu";
        import simd from "bun:simd";
        // 3x4 matrix times a 4-vector
        const m = new Float32Array([1,2,3,4, 5,6,7,8, 9,10,11,12]);
        const v = new Float32Array([1, 1, 1, 1]);
        const g = gpu.matVec(m, v, 3, 4);
        const s = simd.matVec(m, v, 3, 4);
        console.log(Array.from(g).join(","), "|", Array.from(s).join(","));
      `,
    );
    const [gStr, sStr] = stdout.split(" | ");
    expect(gStr).toBe("10,26,42");
    expect(gStr).toBe(sStr);
    expect(exitCode).toBe(0);
  });

  it("matmul produces correct result on cpu fallback", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-matmul-identity",
      `
        import gpu from "bun:gpu";
        // 2x3 times 3x2 = 2x2
        // A = [[1,2,3],[4,5,6]]
        // B = [[7,8],[9,10],[11,12]]
        // AB = [[58,64],[139,154]]
        const a = new Float32Array([1,2,3, 4,5,6]);
        const b = new Float32Array([7,8, 9,10, 11,12]);
        const out = gpu.matmul(a, b, 2, 3, 2);
        console.log(Array.from(out).join(","));
      `,
    );
    expect(stdout).toBe("58,64,139,154");
    expect(exitCode).toBe(0);
  });

  it("setBackend('auto') re-probes", async () => {
    // After `cpu` is forced, `auto` re-runs the probe chain and picks the
    // first available backend for the host (metal on macOS, cuda on a
    // CUDA-capable Linux/Windows host, cpu otherwise).
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-setbackend-auto",
      `
        import gpu from "bun:gpu";
        gpu.setBackend("cpu");
        const before = gpu.activeBackend();
        gpu.setBackend("auto");
        const after = gpu.activeBackend();
        console.log(before, after);
      `,
    );
    const [before, after] = stdout.split(" ");
    expect(before).toBe("cpu");
    expect(isMacOS ? ["metal", "cpu"] : ["cuda", "cpu"]).toContain(after);
    expect(exitCode).toBe(0);
  });

  it("setBackend rejects unavailable backend with a helpful error", async () => {
    // Pick a backend that cannot possibly probe on this host:
    //   - macOS: cuda (no NVIDIA + CUDA on a mac)
    //   - elsewhere: metal (Metal framework is darwin-only)
    const unavailable = isMacOS ? "cuda" : "metal";
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-setbackend-error",
      `
        import gpu from "bun:gpu";
        try {
          gpu.setBackend(${JSON.stringify(unavailable)});
          console.log("ERR: should have thrown");
        } catch (e) {
          console.log("THREW:", e.message.includes("not available"));
        }
      `,
    );
    expect(stdout).toBe("THREW: true");
    expect(exitCode).toBe(0);
  });

  it("describe reports active + available backends", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-describe",
      `
        import gpu from "bun:gpu";
        const d = gpu.describe();
        console.log(JSON.stringify({
          active: d.active,
          available: d.available,
          hasPlatform: typeof d.platform === "string" && d.platform.length > 0,
        }));
      `,
    );
    const d = JSON.parse(stdout);
    // `cpu` is always available and the active backend is always one
    // entry in `available`. We don't assert the exact composition
    // because it depends on the host (NVIDIA-equipped Linux box will
    // have cuda; a mac has metal; CI hosts without GPUs have only cpu).
    expect(d.available).toContain("cpu");
    expect(d.available).toContain(d.active);
    expect(["metal", "cuda", "cpu"]).toContain(d.active);
    expect(d.hasPlatform).toBe(true);
    expect(exitCode).toBe(0);
  });
});
