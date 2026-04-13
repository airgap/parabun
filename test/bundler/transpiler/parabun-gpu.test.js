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
    // matVec, matmul, and f64 dot don't have GPU kernels shipped for any
    // backend yet — every backend says "don't use me", so the caller
    // falls through to bun:simd. (simdMap is covered by a separate,
    // size-conditional assertion elsewhere.)
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-wins-false",
      `
        import gpu from "bun:gpu";
        const results = [
          gpu.winsForSize("matVec", 1, 4),
          gpu.winsForSize("matVec", 1_000_000, 4),
          gpu.winsForSize("matmul", 1_000_000, 4),
          gpu.winsForSize("dot", 1_000_000, 8),
        ];
        console.log(results.join(","));
      `,
    );
    expect(stdout).toBe("false,false,false,false");
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
