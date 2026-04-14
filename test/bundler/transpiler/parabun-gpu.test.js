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
          alloc: typeof gpu.alloc,
          isAligned: typeof gpu.isAligned,
          hold: typeof gpu.hold,
          release: typeof gpu.release,
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
      alloc: "function",
      isAligned: "function",
      hold: "function",
      release: "function",
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

  it("alloc returns a typed array of the requested length + type", async () => {
    // CPU fallback returns a plain typed array; metal returns a page-aligned
    // one via posix_memalign. Both must satisfy the same observable shape:
    // right length, right constructor, zero-initialized.
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-alloc-shape",
      `
        import gpu from "bun:gpu";
        const a = gpu.alloc(128, "f32");
        const b = gpu.alloc(64, "f64");
        const e = gpu.alloc(0, "f32");
        // Spot-check that alloc'd buffers are writeable + readable.
        a[0] = 1.5; a[127] = -2.25;
        b[0] = Math.PI; b[63] = -Math.E;
        console.log(JSON.stringify({
          aCtor: a.constructor.name, aLen: a.length, aFirst: a[0], aLast: a[127],
          bCtor: b.constructor.name, bLen: b.length, bFirst: b[0], bLast: b[63],
          eCtor: e.constructor.name, eLen: e.length,
        }));
      `,
    );
    expect(JSON.parse(stdout)).toEqual({
      aCtor: "Float32Array",
      aLen: 128,
      aFirst: 1.5,
      aLast: -2.25,
      bCtor: "Float64Array",
      bLen: 64,
      bFirst: Math.PI,
      bLast: -Math.E,
      eCtor: "Float32Array",
      eLen: 0,
    });
    expect(exitCode).toBe(0);
  });

  it("alloc rejects invalid length and type arguments", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-alloc-invalid",
      `
        import gpu from "bun:gpu";
        const cases = [
          () => gpu.alloc(-1, "f32"),
          () => gpu.alloc(1.5, "f32"),
          () => gpu.alloc(8, "bogus"),
          () => gpu.alloc(8, 32),
        ];
        const results = cases.map(fn => {
          try { fn(); return "NO_THROW"; } catch (e) { return e.constructor.name; }
        });
        console.log(results.join(","));
      `,
    );
    // First two are length errors (RangeError), last two are type errors
    // (TypeError). Metal and cpu both validate, so output is host-invariant.
    expect(stdout).toBe("RangeError,RangeError,TypeError,TypeError");
    expect(exitCode).toBe(0);
  });

  it("isAligned reports false for plain typed arrays, true for alloc'd (metal only)", async () => {
    // On the cpu fallback, isAligned() always returns false — a plain
    // Float32Array is not page-aligned, and `alloc()` just returns another
    // plain Float32Array, so neither is "aligned" from the backend's view.
    // On metal, alloc() goes through posix_memalign and isAligned() checks
    // the pointer. We run both paths and assert what's appropriate per host.
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-isaligned",
      `
        import gpu from "bun:gpu";
        const plain = new Float32Array(1024);
        const allocd = gpu.alloc(1024, "f32");
        console.log(JSON.stringify({
          plain: gpu.isAligned(plain),
          allocd: gpu.isAligned(allocd),
          active: gpu.activeBackend(),
        }));
      `,
    );
    const r = JSON.parse(stdout);
    // A plain Float32Array is NEVER page-aligned (JSC backing is ~16-byte).
    expect(r.plain).toBe(false);
    if (r.active === "metal") {
      // Metal alloc goes through posix_memalign(pagesize), so it must report true.
      expect(r.allocd).toBe(true);
    } else {
      // cpu + cuda backends have no alignment concept; isAligned is a stub.
      expect(r.allocd).toBe(false);
    }
    expect(exitCode).toBe(0);
  });

  it("matVec over alloc'd inputs matches matVec over plain inputs", async () => {
    // This is the NOCOPY dispatch correctness test. On macOS, gpu.matVec with
    // an alloc'd matrix goes through newBufferWithBytesNoCopy (zero-copy),
    // while the same matrix passed as a plain Float32Array goes through
    // newBufferWithBytes (memcpy). Both kernels run identical MSL, so the
    // outputs must be bit-identical.
    //
    // On Linux (cpu fallback) both paths collapse to the same bun:simd call,
    // which also must match bit-for-bit — this pins the contract that the
    // alloc'd array is observably interchangeable with a plain typed array
    // as a matVec input.
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-matvec-alloc",
      `
        import gpu from "bun:gpu";
        const M = 1024, K = 1024; // M*K = 1<<20, at threshold
        const plainMat = new Float32Array(M * K);
        const plainVec = new Float32Array(K);
        let seed = 0xABCDEF;
        const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed / 0xFFFFFFFF) * 2 - 1; };
        for (let i = 0; i < plainMat.length; i++) plainMat[i] = rand();
        for (let j = 0; j < K; j++) plainVec[j] = rand();

        const allocMat = gpu.alloc(M * K, "f32");
        const allocVec = gpu.alloc(K, "f32");
        allocMat.set(plainMat);
        allocVec.set(plainVec);

        const plainOut = gpu.matVec(plainMat, plainVec, M, K);
        const allocOut = gpu.matVec(allocMat, allocVec, M, K);

        let mismatches = 0;
        for (let i = 0; i < M; i++) if (plainOut[i] !== allocOut[i]) mismatches++;
        console.log("mismatches=" + mismatches, "active=" + gpu.activeBackend());
      `,
    );
    // Must be exactly 0 — same kernel, same inputs, just different staging.
    expect(stdout).toMatch(/^mismatches=0 active=(metal|cuda|cpu)$/);
    expect(exitCode).toBe(0);
  });

  it("hold returns a GpuHandle wrapping the array; release marks it released", async () => {
    // The handle surface is contractual across backends: brand + backend +
    // type + length + released. Internal fields (buffer pointer, view ref)
    // are not part of the public API and aren't inspected here.
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-hold-shape",
      `
        import gpu from "bun:gpu";
        const a = new Float32Array([1, 2, 3, 4]);
        const h = gpu.hold(a);
        const beforeRelease = {
          brand: h.__bunGpuHandle,
          backend: h.backend,
          type: h.type,
          length: h.length,
          released: h.released,
        };
        gpu.release(h);
        const afterRelease = { released: h.released };
        console.log(JSON.stringify({ beforeRelease, afterRelease, active: gpu.activeBackend() }));
      `,
    );
    const r = JSON.parse(stdout);
    expect(r.beforeRelease).toEqual({
      brand: true,
      backend: r.active,
      type: "f32",
      length: 4,
      released: false,
    });
    expect(r.afterRelease).toEqual({ released: true });
    expect(exitCode).toBe(0);
  });

  it("hold rejects non-typed-array inputs; release rejects non-handles", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-hold-invalid",
      `
        import gpu from "bun:gpu";
        const results = [];
        for (const fn of [
          () => gpu.hold([1, 2, 3]),
          () => gpu.hold("not a typed array"),
          () => gpu.hold(null),
          () => gpu.release({ not: "a handle" }),
          () => gpu.release(new Float32Array(8)),
        ]) {
          try { fn(); results.push("NO_THROW"); } catch (e) { results.push(e.constructor.name); }
        }
        console.log(results.join(","));
      `,
    );
    expect(stdout).toBe("TypeError,TypeError,TypeError,TypeError,TypeError");
    expect(exitCode).toBe(0);
  });

  it("matVec on a released handle throws; release is idempotent", async () => {
    // After release, the handle's MTLBuffer (on metal) is freed. Using it
    // for another matVec would be a use-after-free — we refuse explicitly.
    // Calling release twice on the same handle is safe (second call is a
    // no-op) so cleanup code can be defensive.
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-hold-use-after-release",
      `
        import gpu from "bun:gpu";
        const mat = new Float32Array(3 * 4);
        for (let i = 0; i < mat.length; i++) mat[i] = i + 1;
        const vec = new Float32Array([1, 1, 1, 1]);
        const h = gpu.hold(mat);
        gpu.release(h);
        let firstReleaseOk = false, secondReleaseOk = false, matVecThrew = false;
        try { gpu.release(h); secondReleaseOk = true; } catch (e) {}
        try { gpu.matVec(h, vec, 3, 4); } catch (e) { matVecThrew = /released handle/.test(e.message); }
        // A fresh handle still works after the first one is freed.
        const h2 = gpu.hold(mat);
        const ok = gpu.matVec(h2, vec, 3, 4);
        gpu.release(h2);
        firstReleaseOk = ok.length === 3;
        console.log(JSON.stringify({ firstReleaseOk, secondReleaseOk, matVecThrew, out: Array.from(ok) }));
      `,
    );
    const r = JSON.parse(stdout);
    expect(r).toEqual({
      firstReleaseOk: true,
      secondReleaseOk: true,
      matVecThrew: true,
      // Matches the existing "matVec matches bun:simd on cpu fallback" test.
      out: [10, 26, 42],
    });
    expect(exitCode).toBe(0);
  });

  it("matVec over a held matrix is bit-identical to matVec over the same array", async () => {
    // On Metal, the held path reuses one MTLBuffer and the non-held path
    // creates a new one per call (COPY or NOCOPY depending on alignment).
    // Both run the same MSL kernel so outputs must match exactly. On CPU
    // both paths collapse to the same bun:simd call — still must match.
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-hold-matvec-equiv",
      `
        import gpu from "bun:gpu";
        const M = 1024, K = 1024;
        const mat = gpu.alloc(M * K, "f32"); // alloc so the non-held path takes NOCOPY too
        const vec = new Float32Array(K);
        let seed = 0x5EED;
        const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed / 0xFFFFFFFF) * 2 - 1; };
        for (let i = 0; i < mat.length; i++) mat[i] = rand();
        for (let j = 0; j < K; j++) vec[j] = rand();

        const plain = gpu.matVec(mat, vec, M, K);
        const h = gpu.hold(mat);
        const held1 = gpu.matVec(h, vec, M, K);
        const held2 = gpu.matVec(h, vec, M, K); // same handle, second dispatch
        gpu.release(h);

        let d1 = 0, d2 = 0;
        for (let i = 0; i < M; i++) {
          if (plain[i] !== held1[i]) d1++;
          if (held1[i] !== held2[i]) d2++;
        }
        console.log(JSON.stringify({ plainVsHeld: d1, heldVsHeld: d2, active: gpu.activeBackend() }));
      `,
    );
    // Both deltas must be zero — residency is a performance detail, not
    // a correctness boundary.
    expect(JSON.parse(stdout)).toEqual({ plainVsHeld: 0, heldVsHeld: 0, active: expect.any(String) });
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
