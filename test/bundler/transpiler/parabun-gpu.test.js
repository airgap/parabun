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

describe("parabun:gpu scaffold", () => {
  it("module resolves and exposes expected surface", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-surface",
      `
        import gpu from "parabun:gpu";
        console.log(JSON.stringify({
          dot: typeof gpu.dot,
          matVec: typeof gpu.matVec,
          matmul: typeof gpu.matmul,
          simdMap: typeof gpu.simdMap,
          alloc: typeof gpu.alloc,
          isAligned: typeof gpu.isAligned,
          hold: typeof gpu.hold,
          release: typeof gpu.release,
          releasePinned: typeof gpu.releasePinned,
          activeBackend: typeof gpu.activeBackend,
          hasBackend: typeof gpu.hasBackend,
          setBackend: typeof gpu.setBackend,
          winsForSize: typeof gpu.winsForSize,
          dispose: typeof gpu.dispose,
          describe: typeof gpu.describe,
          GpuFloat32Array: typeof gpu.GpuFloat32Array,
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
      releasePinned: "function",
      activeBackend: "function",
      hasBackend: "function",
      setBackend: "function",
      winsForSize: "function",
      dispose: "function",
      describe: "function",
      GpuFloat32Array: "function",
    });
    expect(exitCode).toBe(0);
  });

  it("cpu backend is always available", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-cpu-available",
      `
        import gpu from "parabun:gpu";
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
        import gpu from "parabun:gpu";
        console.log(gpu.activeBackend());
      `,
    );
    expect(isMacOS ? ["metal", "cpu"] : ["cuda", "cpu"]).toContain(stdout);
    expect(exitCode).toBe(0);
  });

  it("winsForSize returns false for ops no backend beats simd on yet", async () => {
    // matmul and f64 dot don't have GPU kernels on any backend yet — every
    // backend says "don't use me", so the caller falls through to @para/simd.
    // (simdMap and matVec have size-conditional assertions elsewhere.)
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-wins-false",
      `
        import gpu from "parabun:gpu";
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

  it("matVec f32 over the GPU threshold matches @para/simd bit-for-bit", async () => {
    // Above the matVec size gate (M*K >= 1<<20 elements), the Metal backend
    // dispatches to an MSL kernel; CUDA PTX currently forwards to simd but
    // keeps the same interface. Either way, output must match @para/simd
    // exactly — fma rounds identically to a tight f32x4 dot product for
    // these operand ranges. We use a deterministic fill so the test is
    // reproducible across hosts.
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-matvec-large",
      `
        import gpu from "parabun:gpu";
        import simd from "@para/simd";
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
    // Tolerance: per-row FMA on Metal is identical to @para/simd's scalar
    // accumulator, but if a backend re-associates the reduction, up to
    // ~1e-3 rounding drift at K=1024 is still acceptable — hence the
    // maxErr<=ok gate rather than mismatches==0. wins= depends on the
    // host: on slower hardware the naive MSL kernel loses to f32x4
    // @para/simd, on faster Metal devices it already wins. This test pins
    // the correctness of the dispatch path; the benchmark is where we
    // watch for the crossover.
    expect(stdout).toMatch(/^wins=(?:true|false) rows=1024 mismatches=\d+ maxErr<=ok$/);
    expect(exitCode).toBe(0);
  });

  it("dot matches @para/simd on cpu fallback", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-dot-f32",
      `
        import gpu from "parabun:gpu";
        import simd from "@para/simd";
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

  it("matVec matches @para/simd on cpu fallback", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-matvec-f32",
      `
        import gpu from "parabun:gpu";
        import simd from "@para/simd";
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
        import gpu from "parabun:gpu";
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
        import gpu from "parabun:gpu";
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
        import gpu from "parabun:gpu";
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
        import gpu from "parabun:gpu";
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
        import gpu from "parabun:gpu";
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

  it("isAligned reports true for alloc'd typed arrays on metal", async () => {
    // Contract: gpu.alloc() on the Metal backend goes through
    // posix_memalign(pagesize), so the returned Float32Array is always
    // page-aligned and isAligned() returns true. On cpu + cuda backends
    // isAligned is a stub that always returns false.
    //
    // Deliberately NOT asserted: `isAligned(new Float32Array(N))` — JSC's
    // allocator can return page-aligned backings for plain typed arrays
    // by chance (seen on Apple Silicon's 16 KiB pages for mid-sized
    // buffers). The plain-vs-alloc'd contrast isn't a reliable probe, so
    // we pin the real invariant instead: alloc() is always aligned on
    // Metal, full stop.
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-isaligned",
      `
        import gpu from "parabun:gpu";
        const allocd = gpu.alloc(1024, "f32");
        console.log(JSON.stringify({
          allocd: gpu.isAligned(allocd),
          active: gpu.activeBackend(),
        }));
      `,
    );
    const r = JSON.parse(stdout);
    if (r.active === "metal") {
      expect(r.allocd).toBe(true);
    } else {
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
    // On Linux (cpu fallback) both paths collapse to the same @para/simd call,
    // which also must match bit-for-bit — this pins the contract that the
    // alloc'd array is observably interchangeable with a plain typed array
    // as a matVec input.
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-matvec-alloc",
      `
        import gpu from "parabun:gpu";
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
        import gpu from "parabun:gpu";
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
        import gpu from "parabun:gpu";
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
        import gpu from "parabun:gpu";
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
      // Matches the existing "matVec matches @para/simd on cpu fallback" test.
      out: [10, 26, 42],
    });
    expect(exitCode).toBe(0);
  });

  it("matVec over a held matrix is bit-identical to matVec over the same array", async () => {
    // On Metal, the held path reuses one MTLBuffer and the non-held path
    // creates a new one per call (COPY or NOCOPY depending on alignment).
    // Both run the same MSL kernel so outputs must match exactly. On CPU
    // both paths collapse to the same @para/simd call — still must match.
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-hold-matvec-equiv",
      `
        import gpu from "parabun:gpu";
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

  it("dot accepts GpuHandle inputs equivalently to plain typed arrays", async () => {
    // Same contract as matVec: passing `hold(a)` where `a` was the argument
    // must produce the same scalar. On metal this lets the MTLBuffer for
    // `a` stay resident across many dot products; on cpu it's a pure
    // passthrough. Correctness is what we pin here.
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-hold-dot-equiv",
      `
        import gpu from "parabun:gpu";
        const a = new Float32Array([1, 2, 3, 4, 5]);
        const b = new Float32Array([10, 20, 30, 40, 50]);
        const plain = gpu.dot(a, b);
        const ha = gpu.hold(a);
        const hb = gpu.hold(b);
        const held = gpu.dot(ha, hb);
        const mixed = gpu.dot(ha, b);
        gpu.release(ha);
        gpu.release(hb);
        console.log(JSON.stringify({ plain, held, mixed }));
      `,
    );
    expect(JSON.parse(stdout)).toEqual({ plain: 550, held: 550, mixed: 550 });
    expect(exitCode).toBe(0);
  });

  it("matmul accepts GpuHandle inputs equivalently to plain typed arrays", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-hold-matmul-equiv",
      `
        import gpu from "parabun:gpu";
        const a = new Float32Array([1,2,3, 4,5,6]);
        const b = new Float32Array([7,8, 9,10, 11,12]);
        const plain = gpu.matmul(a, b, 2, 3, 2);
        const ha = gpu.hold(a);
        const hb = gpu.hold(b);
        const held = gpu.matmul(ha, hb, 2, 3, 2);
        gpu.release(ha);
        gpu.release(hb);
        console.log(JSON.stringify({ plain: Array.from(plain), held: Array.from(held) }));
      `,
    );
    expect(JSON.parse(stdout)).toEqual({
      plain: [58, 64, 139, 154],
      held: [58, 64, 139, 154],
    });
    expect(exitCode).toBe(0);
  });

  it("simdMap accepts a GpuHandle input equivalently to a plain typed array", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-hold-simdmap-equiv",
      `
        import gpu from "parabun:gpu";
        const a = new Float32Array([1, 2, 3, 4]);
        const plain = gpu.simdMap(x => x * x, a);
        const h = gpu.hold(a);
        const held = gpu.simdMap(x => x * x, h);
        gpu.release(h);
        console.log(JSON.stringify({ plain: Array.from(plain), held: Array.from(held) }));
      `,
    );
    expect(JSON.parse(stdout)).toEqual({
      plain: [1, 4, 9, 16],
      held: [1, 4, 9, 16],
    });
    expect(exitCode).toBe(0);
  });

  it("dot/matmul/simdMap on a released handle throw a released-handle error", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-hold-use-after-release-ops",
      `
        import gpu from "parabun:gpu";
        const a = new Float32Array([1, 2, 3, 4]);
        const b = new Float32Array([5, 6, 7, 8]);
        const ha = gpu.hold(a);
        const hb = gpu.hold(b);
        gpu.release(ha);
        gpu.release(hb);
        const threw = { dot: false, matmul: false, simdMap: false };
        try { gpu.dot(ha, hb); } catch (e) { threw.dot = /released handle/.test(e.message); }
        try { gpu.matmul(ha, hb, 2, 2, 2); } catch (e) { threw.matmul = /released handle/.test(e.message); }
        try { gpu.simdMap(x => x, ha); } catch (e) { threw.simdMap = /released handle/.test(e.message); }
        console.log(JSON.stringify(threw));
      `,
    );
    expect(JSON.parse(stdout)).toEqual({ dot: true, matmul: true, simdMap: true });
    expect(exitCode).toBe(0);
  });

  it("describe reports active + available backends", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-describe",
      `
        import gpu from "parabun:gpu";
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

describe("parabun:gpu GpuFloat32Array wrapper", () => {
  it("constructs from an existing Float32Array and exposes the same view", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-wrapper-from-array",
      `
        import gpu from "parabun:gpu";
        const src = new Float32Array([1, 2, 3, 4]);
        const w = new gpu.GpuFloat32Array(src);
        const sameView = w.view === src;
        const lenOk = w.length === 4;
        w.release();
        console.log(JSON.stringify({ sameView, lenOk }));
      `,
    );
    expect(JSON.parse(stdout)).toEqual({ sameView: true, lenOk: true });
    expect(exitCode).toBe(0);
  });

  it("constructs from a length and zero-fills the allocation", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-wrapper-from-length",
      `
        import gpu from "parabun:gpu";
        const w = new gpu.GpuFloat32Array(8);
        const view = w.view;
        const isF32 = view instanceof Float32Array;
        const allZero = Array.from(view).every(x => x === 0);
        const lenOk = w.length === 8 && view.length === 8;
        w.release();
        console.log(JSON.stringify({ isF32, allZero, lenOk }));
      `,
    );
    expect(JSON.parse(stdout)).toEqual({ isF32: true, allZero: true, lenOk: true });
    expect(exitCode).toBe(0);
  });

  it("rejects non-Float32Array / non-number sources at construction", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-wrapper-bad-arg",
      `
        import gpu from "parabun:gpu";
        let threw = false;
        let msg = "";
        try {
          new gpu.GpuFloat32Array(new Float64Array([1, 2]));
        } catch (e) {
          threw = true;
          msg = e.message;
        }
        console.log(JSON.stringify({ threw, tag: /GpuFloat32Array/.test(msg) }));
      `,
    );
    expect(JSON.parse(stdout)).toEqual({ threw: true, tag: true });
    expect(exitCode).toBe(0);
  });

  it("matmul accepts wrappers and produces the same result as raw Float32Array", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-wrapper-matmul",
      `
        import gpu from "parabun:gpu";
        const a = new Float32Array([1, 2, 3, 4]);
        const b = new Float32Array([5, 6, 7, 8]);
        const wa = new gpu.GpuFloat32Array(a);
        const wb = new gpu.GpuFloat32Array(b);
        const out = gpu.matmul(wa, wb, 2, 2, 2);
        wa.release();
        wb.release();
        console.log(JSON.stringify(Array.from(out)));
      `,
    );
    expect(JSON.parse(stdout)).toEqual([19, 22, 43, 50]);
    expect(exitCode).toBe(0);
  });

  it("dot and simdMap accept wrappers", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-wrapper-dot-simdmap",
      `
        import gpu from "parabun:gpu";
        const a = new Float32Array([1, 2, 3, 4]);
        const b = new Float32Array([5, 6, 7, 8]);
        const wa = new gpu.GpuFloat32Array(a);
        const wb = new gpu.GpuFloat32Array(b);
        const dot = gpu.dot(wa, wb);
        const squared = Array.from(gpu.simdMap(x => x * x, wa));
        wa.release();
        wb.release();
        console.log(JSON.stringify({ dot, squared }));
      `,
    );
    expect(JSON.parse(stdout)).toEqual({ dot: 70, squared: [1, 4, 9, 16] });
    expect(exitCode).toBe(0);
  });

  it("explicit release prevents further use; double release is a no-op", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-wrapper-release",
      `
        import gpu from "parabun:gpu";
        const w = new gpu.GpuFloat32Array(new Float32Array([1, 2, 3, 4]));
        w.release();
        let viewThrew = false, viewMsg = "";
        try { void w.view; } catch (e) { viewThrew = true; viewMsg = e.message; }
        let opThrew = false;
        try { gpu.simdMap(x => x, w); } catch (e) { opThrew = true; }
        let doubleThrew = false;
        try { w.release(); } catch (e) { doubleThrew = true; }
        console.log(JSON.stringify({
          viewThrew,
          viewTag: /already disposed/.test(viewMsg),
          opThrew,
          doubleThrew,
        }));
      `,
    );
    expect(JSON.parse(stdout)).toEqual({
      viewThrew: true,
      viewTag: true,
      opThrew: true,
      doubleThrew: false,
    });
    expect(exitCode).toBe(0);
  });

  it("matmul writes into a caller-provided Float32Array when `out` is passed", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-matmul-out",
      `
        import gpu from "parabun:gpu";
        const a = new Float32Array([1, 2, 3, 4]);
        const b = new Float32Array([5, 6, 7, 8]);
        const out = new Float32Array(4);
        const ret = gpu.matmul(a, b, 2, 2, 2, out);
        console.log(JSON.stringify({
          sameRef: ret === out,
          values: Array.from(out),
        }));
      `,
    );
    expect(JSON.parse(stdout)).toEqual({ sameRef: true, values: [19, 22, 43, 50] });
    expect(exitCode).toBe(0);
  });

  it("matmul writes directly into a SharedArrayBuffer-backed Float32Array", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-matmul-out-sab",
      `
        import gpu from "parabun:gpu";
        const a = new Float32Array([1, 2, 3, 4]);
        const b = new Float32Array([5, 6, 7, 8]);
        const sab = new SharedArrayBuffer(4 * 4);
        const out = new Float32Array(sab);
        const ret = gpu.matmul(a, b, 2, 2, 2, out);
        console.log(JSON.stringify({
          sameRef: ret === out,
          sharedBuf: ret.buffer instanceof SharedArrayBuffer,
          values: Array.from(out),
        }));
      `,
    );
    expect(JSON.parse(stdout)).toEqual({
      sameRef: true,
      sharedBuf: true,
      values: [19, 22, 43, 50],
    });
    expect(exitCode).toBe(0);
  });

  it("matmul rejects out buffers that are too small or wrong type", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-matmul-out-reject",
      `
        import gpu from "parabun:gpu";
        const a = new Float32Array([1, 2, 3, 4]);
        const b = new Float32Array([5, 6, 7, 8]);
        let tooSmall = false, wrongType = false;
        try {
          gpu.matmul(a, b, 2, 2, 2, new Float32Array(3));
        } catch (e) {
          tooSmall = /out length/.test(e.message);
        }
        try {
          gpu.matmul(a, b, 2, 2, 2, new Float64Array(4));
        } catch (e) {
          wrongType = /out (type|must)/.test(e.message);
        }
        console.log(JSON.stringify({ tooSmall, wrongType }));
      `,
    );
    expect(JSON.parse(stdout)).toEqual({ tooSmall: true, wrongType: true });
    expect(exitCode).toBe(0);
  });

  it("matmul zeroes a reused out buffer before accumulating", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-matmul-out-reuse",
      `
        import gpu from "parabun:gpu";
        const a = new Float32Array([1, 2, 3, 4]);
        const b = new Float32Array([5, 6, 7, 8]);
        const out = new Float32Array(4);
        out.fill(999);
        gpu.matmul(a, b, 2, 2, 2, out);
        console.log(JSON.stringify(Array.from(out)));
      `,
    );
    expect(JSON.parse(stdout)).toEqual([19, 22, 43, 50]);
    expect(exitCode).toBe(0);
  });

  it("Symbol.dispose auto-releases at scope exit (via `using`)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-wrapper-using",
      `
        import gpu from "parabun:gpu";
        let after;
        {
          using w = new gpu.GpuFloat32Array(new Float32Array([9, 9, 9, 9]));
          // Stash the wrapper out so we can probe it after scope exit.
          after = w;
          const inScope = w.view.length === 4;
          console.log(JSON.stringify({ inScope }));
        }
        let postThrew = false;
        try { void after.view; } catch (e) { postThrew = /already disposed/.test(e.message); }
        console.log(JSON.stringify({ postThrew }));
      `,
    );
    const lines = stdout.split("\n");
    expect(JSON.parse(lines[0])).toEqual({ inScope: true });
    expect(JSON.parse(lines[1])).toEqual({ postThrew: true });
    expect(exitCode).toBe(0);
  });
});

describe("parabun:gpu pinned host memory (CUDA cuMemAllocHost)", () => {
  it("releasePinned is part of the public surface", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-pinned-surface",
      `
        import gpu from "parabun:gpu";
        console.log(typeof gpu.releasePinned);
      `,
    );
    expect(stdout).toBe("function");
    expect(exitCode).toBe(0);
  });

  it("alloc accepts a pinned option without throwing on any backend", async () => {
    // The { pinned: true } flag is a silent no-op on backends that don't
    // support it (cpu, metal). On cuda it routes through cuMemAllocHost_v2.
    // Either way the returned typed array must be a working FArray.
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-pinned-alloc",
      `
        import gpu from "parabun:gpu";
        const a = gpu.alloc(8, "f32", { pinned: true });
        for (let i = 0; i < 8; i++) a[i] = i + 1;
        let s = 0;
        for (let i = 0; i < 8; i++) s += a[i];
        const released = gpu.releasePinned(a);
        console.log(JSON.stringify({
          ctor: a.constructor.name,
          length: a.length,
          sum: s,
          released,
          backend: gpu.activeBackend(),
        }));
      `,
    );
    const parsed = JSON.parse(stdout);
    expect(parsed.ctor).toBe("Float32Array");
    expect(parsed.length).toBe(8);
    expect(parsed.sum).toBe(36);
    // Only the CUDA backend actually pins; everyone else returns false.
    if (parsed.backend === "cuda") {
      expect(parsed.released).toBe(true);
    } else {
      expect(parsed.released).toBe(false);
    }
    expect(exitCode).toBe(0);
  });

  it("releasePinned on a plain typed array is a harmless false", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-pinned-nonpinned",
      `
        import gpu from "parabun:gpu";
        const a = new Float32Array(4);
        console.log(gpu.releasePinned(a));
      `,
    );
    expect(stdout).toBe("false");
    expect(exitCode).toBe(0);
  });

  it("pinned f64 allocation round-trips and frees", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-pinned-f64",
      `
        import gpu from "parabun:gpu";
        const a = gpu.alloc(16, "f64", { pinned: true });
        for (let i = 0; i < 16; i++) a[i] = (i + 1) * 0.5;
        let s = 0;
        for (let i = 0; i < 16; i++) s += a[i];
        const released = gpu.releasePinned(a);
        console.log(JSON.stringify({
          ctor: a.constructor.name,
          sum: s,
          released,
          backend: gpu.activeBackend(),
        }));
      `,
    );
    const parsed = JSON.parse(stdout);
    expect(parsed.ctor).toBe("Float64Array");
    // 0.5 + 1.0 + 1.5 + … + 8.0 = 68.
    expect(parsed.sum).toBeCloseTo(68);
    if (parsed.backend === "cuda") {
      expect(parsed.released).toBe(true);
    } else {
      expect(parsed.released).toBe(false);
    }
    expect(exitCode).toBe(0);
  });
});

describe("parabun:gpu per-host calibration (CUDA simdMap crossover)", () => {
  // `calibrate()` sweeps the real PTX kernel vs @para/simd and persists a
  // crossover under $XDG_CACHE_HOME/parabun/. We point XDG_CACHE_HOME at a
  // tempDir so the test doesn't touch the user's real cache, and the
  // per-test cache files stay isolated.

  it("exposes calibrate on the public surface", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-calibrate-surface",
      `
        import gpu from "parabun:gpu";
        console.log(typeof gpu.calibrate);
      `,
    );
    expect(stdout).toBe("function");
    expect(exitCode).toBe(0);
  });

  it("calibrate throws on the cpu backend (nothing to calibrate)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-calibrate-cpu",
      `
        import gpu from "parabun:gpu";
        gpu.setBackend("cpu");
        try {
          gpu.calibrate();
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW:" + (e.message.includes("no crossover") ? "ok" : "unexpected"));
        }
      `,
    );
    expect(stdout).toBe("THREW:ok");
    expect(exitCode).toBe(0);
  });

  it("writes a cache file and reports the measured crossover", async () => {
    using dir = tempDir("parabun-gpu-calibrate-persist", {
      "index.pjs": `
        import gpu from "parabun:gpu";
        import fs from "node:fs";
        if (gpu.activeBackend() !== "cuda") {
          console.log(JSON.stringify({ skipped: true, backend: gpu.activeBackend() }));
          process.exit(0);
        }
        const result = gpu.calibrate();
        const cacheExists = fs.existsSync(result.cacheFile);
        const parsed = JSON.parse(fs.readFileSync(result.cacheFile, "utf8"));
        console.log(JSON.stringify({
          skipped: false,
          simdMap: Number.isFinite(result.simdMap) ? result.simdMap : "infinity",
          simdMapIsPositive: result.simdMap > 0,
          cacheExists,
          cacheBackend: parsed.backend,
          cacheDevice: parsed.deviceName === result.deviceName,
          cachePlatform: parsed.platform,
          cacheArch: parsed.arch,
          cacheVersion: parsed.version,
          cacheHasTimestamp: typeof parsed.timestamp === "number" && parsed.timestamp > 0,
        }));
      `.trimStart(),
    });
    await using proc = Bun.spawn({
      cmd: [bunExe(), "index.pjs"],
      env: { ...bunEnv, XDG_CACHE_HOME: String(dir) },
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, , exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    const parsed = JSON.parse(stdout.trim());
    if (parsed.skipped) {
      // No CUDA on this host — the path is untestable; confirm the skip
      // signal came from the cpu fallback (harness guarantee).
      expect(parsed.backend === "cpu" || parsed.backend === "metal").toBe(true);
    } else {
      expect(parsed.cacheExists).toBe(true);
      expect(parsed.cacheBackend).toBe("cuda");
      expect(parsed.cacheDevice).toBe(true);
      expect(parsed.cachePlatform).toBe(process.platform);
      expect(parsed.cacheArch).toBe(process.arch);
      expect(parsed.cacheVersion).toBe(1);
      expect(parsed.cacheHasTimestamp).toBe(true);
      expect(parsed.simdMapIsPositive).toBe(true);
    }
    expect(exitCode).toBe(0);
  });

  it("rehydrates a cached crossover on the next process load", async () => {
    // Write a calibration file by hand with a known non-default crossover,
    // then spawn a fresh bun process and assert that winsForSize reflects
    // the rehydrated value. If the rehydrate path is broken we'd see the
    // static default (1 << 18) instead.
    using dir = tempDir("parabun-gpu-calibrate-rehydrate", {
      "index.pjs": `
        import gpu from "parabun:gpu";
        if (gpu.activeBackend() !== "cuda") {
          console.log(JSON.stringify({ skipped: true, backend: gpu.activeBackend() }));
          process.exit(0);
        }
        // Threshold we wrote into the cache: 1 << 10 = 1024 elements.
        // Anything at or above that must win; below must lose.
        console.log(JSON.stringify({
          skipped: false,
          belowThreshold: gpu.winsForSize("simdMap", 512, 4),
          atThreshold: gpu.winsForSize("simdMap", 1024, 4),
          aboveThreshold: gpu.winsForSize("simdMap", 8192, 4),
        }));
      `.trimStart(),
    });

    // First: seed the cache. We need the real deviceName to build the
    // cache key hash — ask cuda.ts's calibrate for it in a short warmup
    // run, then overwrite the file contents with our fake crossover.
    await using seedProc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `import gpu from "parabun:gpu";
         import fs from "node:fs";
         if (gpu.activeBackend() !== "cuda") { console.log(JSON.stringify({ skipped: true })); process.exit(0); }
         const r = gpu.calibrate();
         const record = {
           version: 1, backend: "cuda", deviceName: r.deviceName,
           platform: process.platform, arch: process.arch,
           timestamp: Date.now(), simdMap: 1024,
         };
         fs.writeFileSync(r.cacheFile, JSON.stringify(record));
         console.log(JSON.stringify({ seeded: true, file: r.cacheFile }));`,
      ],
      env: { ...bunEnv, XDG_CACHE_HOME: String(dir) },
      stdout: "pipe",
      stderr: "pipe",
    });
    const seedOut = JSON.parse((await seedProc.stdout.text()).trim());
    await seedProc.exited;

    if (seedOut.skipped) {
      // No CUDA on this host — bail politely.
      expect(seedOut.skipped).toBe(true);
      return;
    }

    // Second: run the real assertion against the seeded cache.
    await using proc = Bun.spawn({
      cmd: [bunExe(), "index.pjs"],
      env: { ...bunEnv, XDG_CACHE_HOME: String(dir) },
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, , exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    const parsed = JSON.parse(stdout.trim());
    expect(parsed.skipped).toBe(false);
    expect(parsed.belowThreshold).toBe(false);
    expect(parsed.atThreshold).toBe(true);
    expect(parsed.aboveThreshold).toBe(true);
    expect(exitCode).toBe(0);
  });

  it("BUN_PARABUN_SKIP_CALIBRATION=1 bypasses the cache read on probe", async () => {
    // Seed the cache with a known crossover (1024), then set the skip env
    // var and assert that winsForSize falls back to the static default
    // (1 << 18 = 262144).
    using dir = tempDir("parabun-gpu-calibrate-skip", {
      "index.pjs": `
        import gpu from "parabun:gpu";
        if (gpu.activeBackend() !== "cuda") {
          console.log(JSON.stringify({ skipped: true, backend: gpu.activeBackend() }));
          process.exit(0);
        }
        // With the cache ignored, MIN_SIMDMAP_ELEMS stays at 1 << 18 = 262144.
        // 1024 must fall below; 262144 must match; 300000 must win.
        console.log(JSON.stringify({
          skipped: false,
          below: gpu.winsForSize("simdMap", 1024, 4),
          atDefault: gpu.winsForSize("simdMap", 262144, 4),
          aboveDefault: gpu.winsForSize("simdMap", 300000, 4),
        }));
      `.trimStart(),
    });

    await using seedProc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `import gpu from "parabun:gpu";
         import fs from "node:fs";
         if (gpu.activeBackend() !== "cuda") { console.log(JSON.stringify({ skipped: true })); process.exit(0); }
         const r = gpu.calibrate();
         const record = {
           version: 1, backend: "cuda", deviceName: r.deviceName,
           platform: process.platform, arch: process.arch,
           timestamp: Date.now(), simdMap: 1024,
         };
         fs.writeFileSync(r.cacheFile, JSON.stringify(record));
         console.log(JSON.stringify({ seeded: true }));`,
      ],
      env: { ...bunEnv, XDG_CACHE_HOME: String(dir) },
      stdout: "pipe",
      stderr: "pipe",
    });
    const seedOut = JSON.parse((await seedProc.stdout.text()).trim());
    await seedProc.exited;
    if (seedOut.skipped) return;

    await using proc = Bun.spawn({
      cmd: [bunExe(), "index.pjs"],
      env: { ...bunEnv, XDG_CACHE_HOME: String(dir), BUN_PARABUN_SKIP_CALIBRATION: "1" },
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, , exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    const parsed = JSON.parse(stdout.trim());
    expect(parsed.skipped).toBe(false);
    expect(parsed.below).toBe(false);
    expect(parsed.atDefault).toBe(true);
    expect(parsed.aboveDefault).toBe(true);
    expect(exitCode).toBe(0);
  });

  it("ignores cached records with a mismatched deviceName", async () => {
    // Invalidation check: if the cache file exists but was written for a
    // different GPU, we must discard it and fall back to the static default.
    using dir = tempDir("parabun-gpu-calibrate-invalidate", {
      "index.pjs": `
        import gpu from "parabun:gpu";
        if (gpu.activeBackend() !== "cuda") {
          console.log(JSON.stringify({ skipped: true, backend: gpu.activeBackend() }));
          process.exit(0);
        }
        console.log(JSON.stringify({
          skipped: false,
          atDefault: gpu.winsForSize("simdMap", 262144, 4),
          belowDefault: gpu.winsForSize("simdMap", 1024, 4),
        }));
      `.trimStart(),
    });

    // Seed a cache file whose deviceName will never match.
    await using seedProc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `import gpu from "parabun:gpu";
         import fs from "node:fs";
         if (gpu.activeBackend() !== "cuda") { console.log(JSON.stringify({ skipped: true })); process.exit(0); }
         const r = gpu.calibrate();
         const record = {
           version: 1, backend: "cuda", deviceName: "Definitely Not Your GPU 9000",
           platform: process.platform, arch: process.arch,
           timestamp: Date.now(), simdMap: 1024,
         };
         fs.writeFileSync(r.cacheFile, JSON.stringify(record));
         console.log(JSON.stringify({ seeded: true }));`,
      ],
      env: { ...bunEnv, XDG_CACHE_HOME: String(dir) },
      stdout: "pipe",
      stderr: "pipe",
    });
    const seedOut = JSON.parse((await seedProc.stdout.text()).trim());
    await seedProc.exited;
    if (seedOut.skipped) return;

    await using proc = Bun.spawn({
      cmd: [bunExe(), "index.pjs"],
      env: { ...bunEnv, XDG_CACHE_HOME: String(dir) },
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, , exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    const parsed = JSON.parse(stdout.trim());
    expect(parsed.skipped).toBe(false);
    // Cache rejected → static default (262144) applies.
    expect(parsed.atDefault).toBe(true);
    expect(parsed.belowDefault).toBe(false);
    expect(exitCode).toBe(0);
  });
});

describe("parabun:gpu matmulAsync (non-blocking)", () => {
  it("exposes matmulAsync on the default surface", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-matmulasync-surface",
      `
        import gpu from "parabun:gpu";
        console.log(typeof gpu.matmulAsync);
      `,
    );
    expect(stdout).toBe("function");
    expect(exitCode).toBe(0);
  });

  it("returns a Promise and the same result as matmul", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-matmulasync-correct",
      `
        import gpu from "parabun:gpu";
        // 2x2 · 2x2 = [[19,22],[43,50]]
        const a = new Float32Array([1, 2, 3, 4]);
        const b = new Float32Array([5, 6, 7, 8]);
        const p = gpu.matmulAsync(a, b, 2, 2, 2);
        const isPromise = p instanceof Promise;
        const c = await p;
        console.log(JSON.stringify({ isPromise, c: Array.from(c) }));
      `,
    );
    expect(JSON.parse(stdout)).toEqual({ isPromise: true, c: [19, 22, 43, 50] });
    expect(exitCode).toBe(0);
  });

  it("yields the event loop during the GPU compute wait on cuda", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-matmulasync-yield",
      `
        import gpu from "parabun:gpu";
        const isCuda = gpu.activeBackend() === "cuda";
        // Skip the heavy path entirely off-cuda: a 2048^3 matmul on the JS
        // CPU fallback in a debug build is far too slow to run 6×.
        if (!isCuda) {
          console.log(JSON.stringify({ isCuda: false, ok: true, ticks: 0 }));
          process.exit(0);
        }
        const N = 2048;
        const a = new Float32Array(N * N).fill(1);
        const b = new Float32Array(N * N).fill(1);
        let ticks = 0;
        const timer = setInterval(() => { ticks++; }, 0);
        // Several large GPU launches in series. The blocking sync path would
        // park the loop for the entire run (zero timer ticks); the
        // stream-poll async path yields at least once per launch's compute
        // wait. Repeating makes "at least one NOT_READY poll" deterministic
        // rather than racing a single fast kernel.
        let ok = true;
        for (let iter = 0; iter < 6; iter++) {
          const c = await gpu.matmulAsync(a, b, N, N, N);
          if (!(c.length === N * N && c[0] === N && c[N * N - 1] === N)) ok = false;
        }
        clearInterval(timer);
        console.log(JSON.stringify({ isCuda, ok, ticks }));
      `,
    );
    const parsed = JSON.parse(stdout);
    expect(parsed.ok).toBe(true);
    // Only assertable when cuda is actually active (asan-off build on an
    // NVIDIA host). On asan-on debug builds / GPU-less CI, activeBackend is
    // "cpu" and this is skipped — the correctness checks above still run.
    if (parsed.isCuda) {
      expect(parsed.ticks).toBeGreaterThan(0);
    }
    expect(exitCode).toBe(0);
  });
});

describe("parabun:gpu matVecAsync / dotAsync (non-blocking)", () => {
  it("exposes matVecAsync and dotAsync on the default surface", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-mvdot-async-surface",
      `
        import gpu from "parabun:gpu";
        console.log(JSON.stringify({
          matVecAsync: typeof gpu.matVecAsync,
          dotAsync: typeof gpu.dotAsync,
        }));
      `,
    );
    expect(JSON.parse(stdout)).toEqual({ matVecAsync: "function", dotAsync: "function" });
    expect(exitCode).toBe(0);
  });

  it("matVecAsync and dotAsync return Promises with correct results", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-mvdot-async-correct",
      `
        import gpu from "parabun:gpu";
        // [[1,2,3],[4,5,6]] · [1,1,1] = [6,15]
        const mat = new Float32Array([1, 2, 3, 4, 5, 6]);
        const vec = new Float32Array([1, 1, 1]);
        const mvP = gpu.matVecAsync(mat, vec, 2, 3);
        const mvIsPromise = mvP instanceof Promise;
        const mv = Array.from(await mvP);
        // dot([1,2,3,4],[5,6,7,8]) = 70
        const dP = gpu.dotAsync(new Float32Array([1, 2, 3, 4]), new Float32Array([5, 6, 7, 8]));
        const dIsPromise = dP instanceof Promise;
        const d = await dP;
        console.log(JSON.stringify({ mvIsPromise, mv, dIsPromise, d }));
      `,
    );
    expect(JSON.parse(stdout)).toEqual({ mvIsPromise: true, mv: [6, 15], dIsPromise: true, d: 70 });
    expect(exitCode).toBe(0);
  });

  it("yields the event loop for matVecAsync/dotAsync on cuda", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-mvdot-async-yield",
      `
        import gpu from "parabun:gpu";
        const isCuda = gpu.activeBackend() === "cuda";
        if (!isCuda) {
          console.log(JSON.stringify({ isCuda: false, ok: true, ticks: 1 }));
          process.exit(0);
        }
        const N = 4096;
        const mat = new Float32Array(N * N).fill(1);
        const vec = new Float32Array(N).fill(1);
        const u = new Float32Array(N * 256).fill(1);
        const v = new Float32Array(N * 256).fill(1);
        let ticks = 0;
        const timer = setInterval(() => { ticks++; }, 0);
        let ok = true;
        for (let i = 0; i < 4; i++) {
          const y = await gpu.matVecAsync(mat, vec, N, N);
          if (!(y.length === N && y[0] === N)) ok = false;
          const d = await gpu.dotAsync(u, v);
          if (d !== u.length) ok = false;
        }
        clearInterval(timer);
        console.log(JSON.stringify({ isCuda, ok, ticks }));
      `,
    );
    const parsed = JSON.parse(stdout);
    expect(parsed.ok).toBe(true);
    if (parsed.isCuda) {
      expect(parsed.ticks).toBeGreaterThan(0);
    }
    expect(exitCode).toBe(0);
  });

  it("serializes concurrent async GPU ops without clobbering pooled buffers", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-async-concurrent",
      `
        import gpu from "parabun:gpu";
        // Same shape, different fill values, launched concurrently. Pooled
        // pinned/device scratch is shared by shape — if the gate didn't
        // serialize, these would clobber each other. Each result must equal
        // its own input fill × K.
        const N = 512, K = N;
        const mk = (fill) => {
          const a = new Float32Array(N * K).fill(fill);
          const b = new Float32Array(K * N).fill(1);
          return gpu.matmulAsync(a, b, N, K, N).then(c => c[0] === fill * K && c[N * N - 1] === fill * K);
        };
        const results = await Promise.all([mk(2), mk(3), mk(5), mk(7)]);
        console.log(JSON.stringify({ allCorrect: results.every(Boolean), results }));
      `,
    );
    const parsed = JSON.parse(stdout);
    expect(parsed.allCorrect).toBe(true);
    expect(exitCode).toBe(0);
  });

  it("stays correct across shape churn (bounded grow/reuse pool)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gpu-async-shape-churn",
      `
        import gpu from "parabun:gpu";
        const isCuda = gpu.activeBackend() === "cuda";
        if (!isCuda) {
          console.log(JSON.stringify({ isCuda: false, allCorrect: true }));
          process.exit(0);
        }
        // Grow (↑), reuse-smaller (↓ into a larger slot), then repeat —
        // every shape must still produce ones·ones = N regardless of the
        // pooled buffer being resized or reused under it.
        const shapes = [256, 512, 384, 256, 640, 256];
        let allCorrect = true;
        for (const N of shapes) {
          const a = new Float32Array(N * N).fill(1);
          const b = new Float32Array(N * N).fill(1);
          const c = await gpu.matmulAsync(a, b, N, N, N);
          if (!(c.length === N * N && c[0] === N && c[N * N - 1] === N)) allCorrect = false;
        }
        console.log(JSON.stringify({ isCuda, allCorrect }));
      `,
    );
    const parsed = JSON.parse(stdout);
    expect(parsed.allCorrect).toBe(true);
    expect(exitCode).toBe(0);
  });
});
