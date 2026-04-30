import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

async function runFixture(prefix, source) {
  using dir = tempDir(prefix, { "index.pjs": source.trimStart() });
  await using proc = Bun.spawn({
    cmd: [bunExe(), "index.pjs"],
    env: bunEnv,
    cwd: String(dir),
    stdout: "pipe",
  });
  const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
  return { stdout: stdout.trim(), exitCode };
}

describe("para:simd", () => {
  it("mulScalar — Float32Array scalar multiply", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-mulscalar",
      `
        import { mulScalar } from "para:simd";
        const out = mulScalar(new Float32Array([1, 2, 3, 4, 5, 6, 7]), 3);
        console.log(Array.from(out).join(","));
      `,
    );
    expect(stdout).toBe("3,6,9,12,15,18,21");
    expect(exitCode).toBe(0);
  });

  it("addScalar — Float32Array scalar add", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-addscalar",
      `
        import { addScalar } from "para:simd";
        const out = addScalar(new Float32Array([1, 2, 3, 4, 5]), 10);
        console.log(Array.from(out).join(","));
      `,
    );
    expect(stdout).toBe("11,12,13,14,15");
    expect(exitCode).toBe(0);
  });

  it("add — Float32Array element-wise", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-add",
      `
        import { add } from "para:simd";
        const a = new Float32Array([1, 2, 3, 4, 5, 6]);
        const b = new Float32Array([10, 20, 30, 40, 50, 60]);
        console.log(Array.from(add(a, b)).join(","));
      `,
    );
    expect(stdout).toBe("11,22,33,44,55,66");
    expect(exitCode).toBe(0);
  });

  it("mul — Float32Array element-wise", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-mul",
      `
        import { mul } from "para:simd";
        const a = new Float32Array([1, 2, 3, 4, 5]);
        const b = new Float32Array([2, 3, 4, 5, 6]);
        console.log(Array.from(mul(a, b)).join(","));
      `,
    );
    expect(stdout).toBe("2,6,12,20,30");
    expect(exitCode).toBe(0);
  });

  it("sum — horizontal sum", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-sum",
      `
        import { sum } from "para:simd";
        const a = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        console.log(sum(a));
      `,
    );
    expect(stdout).toBe("55");
    expect(exitCode).toBe(0);
  });

  it("dot — dot product", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-dot",
      `
        import { dot } from "para:simd";
        const a = new Float32Array([1, 2, 3, 4, 5]);
        const b = new Float32Array([2, 3, 4, 5, 6]);
        console.log(dot(a, b)); // 2 + 6 + 12 + 20 + 30 = 70
      `,
    );
    expect(stdout).toBe("70");
    expect(exitCode).toBe(0);
  });

  it("empty array", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-empty",
      `
        import { mulScalar, sum } from "para:simd";
        const out = mulScalar(new Float32Array([]), 5);
        console.log(out.length, sum(new Float32Array([])));
      `,
    );
    expect(stdout).toBe("0 0");
    expect(exitCode).toBe(0);
  });

  it("non-multiple-of-4 length (scalar tail)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-tail",
      `
        import { mulScalar } from "para:simd";
        // 9 elements — forces 2 SIMD lanes (8 elems) + 1 scalar tail
        const out = mulScalar(new Float32Array([1,2,3,4,5,6,7,8,9]), 2);
        console.log(Array.from(out).join(","));
      `,
    );
    expect(stdout).toBe("2,4,6,8,10,12,14,16,18");
    expect(exitCode).toBe(0);
  });

  it("simdMap — recognized affine kernel (x * c)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-map-mul",
      `
        import { simdMap } from "para:simd";
        pure function triple(x) { return x * 3; }
        const out = simdMap(triple, new Float32Array([1, 2, 3, 4, 5]));
        console.log(Array.from(out).join(","));
      `,
    );
    expect(stdout).toBe("3,6,9,12,15");
    expect(exitCode).toBe(0);
  });

  it("simdMap — recognized affine kernel (x + c)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-map-add",
      `
        import { simdMap } from "para:simd";
        pure function plus7(x) { return x + 7; }
        const out = simdMap(plus7, new Float32Array([1, 2, 3, 4]));
        console.log(Array.from(out).join(","));
      `,
    );
    expect(stdout).toBe("8,9,10,11");
    expect(exitCode).toBe(0);
  });

  it("simdMap — unrecognized kernel falls back to scalar", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-map-fallback",
      `
        import { simdMap } from "para:simd";
        pure function weird(x) { return Math.sqrt(x) + 1; }
        const out = simdMap(weird, new Float32Array([0, 1, 4, 9, 16]));
        console.log(Array.from(out).join(","));
      `,
    );
    expect(stdout).toBe("1,2,3,4,5");
    expect(exitCode).toBe(0);
  });

  it("rejects wrong typed-array type", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-typeerr",
      `
        import { mulScalar } from "para:simd";
        try {
          mulScalar([1, 2, 3], 2);
          console.log("NO_THROW");
        } catch (e) {
          console.log(e instanceof TypeError ? "TYPE_ERROR" : "WRONG:" + e.name);
        }
      `,
    );
    expect(stdout).toBe("TYPE_ERROR");
    expect(exitCode).toBe(0);
  });

  it("exposes isWasmAvailable() reporting whether the v128 fast path is live", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-wasm-available",
      `
        import { isWasmAvailable } from "para:simd";
        console.log(isWasmAvailable() === true ? "WASM_ON" : "WASM_OFF");
      `,
    );
    // In supported Bun builds, v128 is available and the fast path must load.
    expect(stdout).toBe("WASM_ON");
    expect(exitCode).toBe(0);
  });

  it("mulScalar — WASM SIMD kernel correctness at threshold boundaries", async () => {
    // Probes the WASM v128 fast path at sizes that exercise: pre-threshold
    // (scalar path), just over threshold (SIMD + tiny tail), and a large-ish
    // non-multiple-of-4 size (many SIMD iterations + scalar tail).
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-wasm-mulscalar",
      `
        import { mulScalar } from "para:simd";
        const sizes = [3, 4, 5, 17, 127, 1023, 4097];
        for (const n of sizes) {
          const a = new Float32Array(n);
          for (let i = 0; i < n; i++) a[i] = i + 1;
          const out = mulScalar(a, 2.5);
          let ok = out.length === n;
          for (let i = 0; i < n && ok; i++) {
            if (Math.abs(out[i] - (i + 1) * 2.5) > 1e-5) ok = false;
          }
          console.log(n + ":" + (ok ? "OK" : "FAIL"));
        }
      `,
    );
    expect(stdout).toBe("3:OK\n4:OK\n5:OK\n17:OK\n127:OK\n1023:OK\n4097:OK");
    expect(exitCode).toBe(0);
  });

  it("rejects mismatched array lengths", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-lenerr",
      `
        import { add } from "para:simd";
        try {
          add(new Float32Array([1, 2, 3]), new Float32Array([4, 5]));
          console.log("NO_THROW");
        } catch (e) {
          console.log(e instanceof RangeError ? "RANGE_ERROR" : "WRONG:" + e.name);
        }
      `,
    );
    expect(stdout).toBe("RANGE_ERROR");
    expect(exitCode).toBe(0);
  });

  // --- Float64Array (f64x2) coverage ---

  it("Float64Array mulScalar", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-f64-mul",
      `
        import { mulScalar } from "para:simd";
        const out = mulScalar(new Float64Array([1, 2, 3, 4, 5, 6, 7]), 3);
        console.log(out instanceof Float64Array, Array.from(out).join(","));
      `,
    );
    expect(stdout).toBe("true 3,6,9,12,15,18,21");
    expect(exitCode).toBe(0);
  });

  it("Float64Array addScalar", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-f64-add-scalar",
      `
        import { addScalar } from "para:simd";
        const out = addScalar(new Float64Array([1.5, 2.5, 3.5, 4.5, 5.5]), 10);
        console.log(out instanceof Float64Array, Array.from(out).join(","));
      `,
    );
    expect(stdout).toBe("true 11.5,12.5,13.5,14.5,15.5");
    expect(exitCode).toBe(0);
  });

  it("Float64Array add/mul element-wise", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-f64-vec",
      `
        import { add, mul } from "para:simd";
        const a = new Float64Array([1, 2, 3, 4, 5]);
        const b = new Float64Array([10, 20, 30, 40, 50]);
        console.log(Array.from(add(a, b)).join(","));
        console.log(Array.from(mul(a, b)).join(","));
      `,
    );
    expect(stdout).toBe("11,22,33,44,55\n10,40,90,160,250");
    expect(exitCode).toBe(0);
  });

  it("Float64Array sum and dot", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-f64-reduce",
      `
        import { sum, dot } from "para:simd";
        const a = new Float64Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        const b = new Float64Array([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
        console.log(sum(a), dot(a, b));
      `,
    );
    // sum = 55, dot = 1*2+2*3+...+10*11 = 440
    expect(stdout).toBe("55 440");
    expect(exitCode).toBe(0);
  });

  it("Float64Array simdMap routes affine kernel to mulScalar", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-f64-map",
      `
        import { simdMap } from "para:simd";
        pure function triple(x) { return x * 3; }
        const out = simdMap(triple, new Float64Array([1.1, 2.2, 3.3, 4.4, 5.5]));
        console.log(out instanceof Float64Array, Array.from(out).map(x => x.toFixed(2)).join(","));
      `,
    );
    expect(stdout).toBe("true 3.30,6.60,9.90,13.20,16.50");
    expect(exitCode).toBe(0);
  });

  it("Float64Array WASM kernel at threshold boundaries", async () => {
    // Sizes exercise: pre-SIMD (scalar only), just-over-stride, many SIMD iters + tail.
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-f64-boundaries",
      `
        import { mulScalar } from "para:simd";
        const sizes = [1, 2, 3, 9, 65, 513, 2049];
        for (const n of sizes) {
          const a = new Float64Array(n);
          for (let i = 0; i < n; i++) a[i] = (i + 1) * 0.1;
          const out = mulScalar(a, 2.5);
          let ok = out.length === n && out instanceof Float64Array;
          for (let i = 0; i < n && ok; i++) {
            if (Math.abs(out[i] - (i + 1) * 0.1 * 2.5) > 1e-12) ok = false;
          }
          console.log(n + ":" + (ok ? "OK" : "FAIL"));
        }
      `,
    );
    expect(stdout).toBe("1:OK\n2:OK\n3:OK\n9:OK\n65:OK\n513:OK\n2049:OK");
    expect(exitCode).toBe(0);
  });

  it("rejects mixing Float32Array and Float64Array in binary ops", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-mixed-types",
      `
        import { add } from "para:simd";
        try {
          add(new Float32Array([1, 2, 3]), new Float64Array([4, 5, 6]));
          console.log("NO_THROW");
        } catch (e) {
          console.log(e instanceof TypeError ? "TYPE_ERROR" : "WRONG:" + e.name);
        }
      `,
    );
    expect(stdout).toBe("TYPE_ERROR");
    expect(exitCode).toBe(0);
  });

  // --- dstOverwrite: opt-in in-place semantics ---

  it("mulScalar dstOverwrite:'a' mutates and returns the input (f32)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-mulscalar-inplace-f32",
      `
        import { mulScalar } from "para:simd";
        const a = new Float32Array([1, 2, 3, 4, 5, 6, 7]);
        const out = mulScalar(a, 3, { dstOverwrite: "a" });
        console.log(out === a, Array.from(a).join(","));
      `,
    );
    expect(stdout).toBe("true 3,6,9,12,15,18,21");
    expect(exitCode).toBe(0);
  });

  it("addScalar dstOverwrite:'a' mutates and returns the input (f64)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-addscalar-inplace-f64",
      `
        import { addScalar } from "para:simd";
        const a = new Float64Array([1, 2, 3, 4, 5]);
        const out = addScalar(a, 10, { dstOverwrite: "a" });
        console.log(out === a, Array.from(a).join(","));
      `,
    );
    expect(stdout).toBe("true 11,12,13,14,15");
    expect(exitCode).toBe(0);
  });

  it("add dstOverwrite:'a' and dstOverwrite:'b' both mutate the chosen target", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-add-inplace",
      `
        import { add } from "para:simd";
        const a1 = new Float32Array([1, 2, 3, 4]);
        const b1 = new Float32Array([10, 20, 30, 40]);
        const r1 = add(a1, b1, { dstOverwrite: "a" });
        console.log(r1 === a1, Array.from(a1).join(","), Array.from(b1).join(","));

        const a2 = new Float32Array([1, 2, 3, 4]);
        const b2 = new Float32Array([10, 20, 30, 40]);
        const r2 = add(a2, b2, { dstOverwrite: "b" });
        console.log(r2 === b2, Array.from(a2).join(","), Array.from(b2).join(","));
      `,
    );
    expect(stdout).toBe("true 11,22,33,44 10,20,30,40\ntrue 1,2,3,4 11,22,33,44");
    expect(exitCode).toBe(0);
  });

  it("mul dstOverwrite across sizes that exercise both SIMD body and scalar tail", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-mul-inplace-sizes",
      `
        import { mul } from "para:simd";
        const sizes = [3, 4, 5, 17, 127, 1023];
        for (const n of sizes) {
          const a = new Float32Array(n);
          const b = new Float32Array(n);
          for (let i = 0; i < n; i++) { a[i] = i + 1; b[i] = 2; }
          const out = mul(a, b, { dstOverwrite: "a" });
          let ok = out === a;
          for (let i = 0; i < n && ok; i++) if (a[i] !== (i + 1) * 2) ok = false;
          console.log(n + ":" + (ok ? "OK" : "FAIL"));
        }
      `,
    );
    expect(stdout).toBe("3:OK\n4:OK\n5:OK\n17:OK\n127:OK\n1023:OK");
    expect(exitCode).toBe(0);
  });

  it("dstOverwrite on empty arrays returns the input unchanged", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-empty-inplace",
      `
        import { mulScalar, add } from "para:simd";
        const a = new Float32Array(0);
        const r1 = mulScalar(a, 3, { dstOverwrite: "a" });
        const b = new Float64Array(0);
        const c = new Float64Array(0);
        const r2 = add(b, c, { dstOverwrite: "b" });
        console.log(r1 === a, r2 === c, r1.length, r2.length);
      `,
    );
    expect(stdout).toBe("true true 0 0");
    expect(exitCode).toBe(0);
  });

  it("output ops fall through to monomorphic tight loops above copy-in threshold", async () => {
    // At N above the 4-MiB copy-in threshold, mulScalar/addScalar/add/mul
    // must stop dispatching to WASM and still return correct results. This
    // exercises the tight-loop fallback at sizes large enough to trip the
    // gate (N = 1.5 M f32 = 6 MB copy-in, N = 300 K f64 binary = 4.8 MB).
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-output-threshold",
      `
        import { mulScalar, addScalar, add, mul } from "para:simd";
        function check(label, arr, expected) {
          let ok = arr.length === expected.length;
          for (let i = 0; i < arr.length && ok; i++) {
            if (Math.abs(arr[i] - expected[i]) > 1e-4) ok = false;
          }
          console.log(label + ":" + (ok ? "OK" : "FAIL"));
        }
        {
          // Use integer values: exact in f32 up to 2^24 = 16.7 M
          const n = 1_500_000;
          const a = new Float32Array(n);
          for (let i = 0; i < n; i++) a[i] = i;
          const r = mulScalar(a, 2);
          check("f32-mulScalar-1.5M", [r[0], r[1], r[n-1]], [0, 2, (n-1) * 2]);
          const s = addScalar(a, 5);
          check("f32-addScalar-1.5M", [s[0], s[n-1]], [5, (n-1) + 5]);
        }
        {
          const n = 800_000;
          const a = new Float32Array(n);
          const b = new Float32Array(n);
          for (let i = 0; i < n; i++) { a[i] = i; b[i] = 1; }
          const r = add(a, b);
          check("f32-add-800K", [r[0], r[n-1]], [1, n]);
          const ra = add(a, b, { dstOverwrite: "a" });
          check("f32-add-inplace-800K", [ra === a, ra[0], ra[n-1]], [true, 1, n]);
        }
        {
          const n = 300_000;
          const a = new Float64Array(n);
          const b = new Float64Array(n);
          for (let i = 0; i < n; i++) { a[i] = i * 0.1; b[i] = 2; }
          const r = mul(a, b);
          check("f64-mul-300K", [r[0], r[n-1]], [0, (n-1) * 0.1 * 2]);
        }
      `,
    );
    expect(stdout).toBe(
      [
        "f32-mulScalar-1.5M:OK",
        "f32-addScalar-1.5M:OK",
        "f32-add-800K:OK",
        "f32-add-inplace-800K:OK",
        "f64-mul-300K:OK",
      ].join("\n"),
    );
    expect(exitCode).toBe(0);
  });

  it("invalid dstOverwrite value throws TypeError", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-dstoverwrite-invalid",
      `
        import { mulScalar, add } from "para:simd";
        const msgs = [];
        try { mulScalar(new Float32Array([1]), 2, { dstOverwrite: "b" }); msgs.push("NO_THROW"); }
        catch (e) { msgs.push(e instanceof TypeError ? "TYPE_ERROR" : "WRONG:" + e.name); }
        try { add(new Float32Array([1]), new Float32Array([2]), { dstOverwrite: "c" }); msgs.push("NO_THROW"); }
        catch (e) { msgs.push(e instanceof TypeError ? "TYPE_ERROR" : "WRONG:" + e.name); }
        console.log(msgs.join(" "));
      `,
    );
    expect(stdout).toBe("TYPE_ERROR TYPE_ERROR");
    expect(exitCode).toBe(0);
  });

  it("alloc — returns wasm-backed typed arrays of correct type and length", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-alloc-basic",
      `
        import simd from "para:simd";
        const a = simd.alloc(7, "f32");
        const b = simd.alloc(5, "f64");
        const plain = new Float32Array(4);
        const msgs = [];
        msgs.push("f32:" + (a instanceof Float32Array) + ":" + a.length);
        msgs.push("f64:" + (b instanceof Float64Array) + ":" + b.length);
        msgs.push("backed-a:" + simd.isWasmBacked(a));
        msgs.push("backed-b:" + simd.isWasmBacked(b));
        msgs.push("backed-plain:" + simd.isWasmBacked(plain));
        // Writes persist across calls and do not affect other alloc'd buffers.
        for (let i = 0; i < 7; i++) a[i] = i + 1;
        for (let i = 0; i < 5; i++) b[i] = i * 0.25;
        msgs.push("a:" + Array.from(a).join(","));
        msgs.push("b:" + Array.from(b).join(","));
        console.log(msgs.join("\\n"));
      `,
    );
    expect(stdout).toBe(
      [
        "f32:true:7",
        "f64:true:5",
        "backed-a:true",
        "backed-b:true",
        "backed-plain:false",
        "a:1,2,3,4,5,6,7",
        "b:0,0.25,0.5,0.75,1",
      ].join("\n"),
    );
    expect(exitCode).toBe(0);
  });

  it("alloc — invalid args throw", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-alloc-invalid",
      `
        import simd from "para:simd";
        const msgs = [];
        try { simd.alloc(-1, "f32"); msgs.push("NO_THROW"); }
        catch (e) { msgs.push(e instanceof RangeError ? "RANGE" : "WRONG:" + e.name); }
        try { simd.alloc(1.5, "f32"); msgs.push("NO_THROW"); }
        catch (e) { msgs.push(e instanceof RangeError ? "RANGE" : "WRONG:" + e.name); }
        try { simd.alloc(8, "f16"); msgs.push("NO_THROW"); }
        catch (e) { msgs.push(e instanceof TypeError ? "TYPE" : "WRONG:" + e.name); }
        console.log(msgs.join(" "));
      `,
    );
    expect(stdout).toBe("RANGE RANGE TYPE");
    expect(exitCode).toBe(0);
  });

  it("zero-copy — scalar ops on alloc'd inputs with dstOverwrite stay vectorized at large N", async () => {
    // N=2M (8MB) — above the OUTPUT_WASM_MAX_BYTES copy-in threshold. The
    // non-alloc path falls back to JS tight loops at this size; the alloc
    // path goes through the At kernels directly (zero-copy). Use integer
    // values (exact in f32 up to 2^24) so we can assert equality with
    // reference values rather than tolerance-based comparison.
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-zerocopy-scalar",
      `
        import simd from "para:simd";
        const N = 2_000_000;
        const a = simd.alloc(N, "f32");
        for (let i = 0; i < N; i++) a[i] = i & 0xffff;
        simd.mulScalar(a, 3, { dstOverwrite: "a" });
        const ok1 = a[0] === 0 && a[1] === 3 && a[N - 1] === ((N - 1) & 0xffff) * 3;
        simd.addScalar(a, 7, { dstOverwrite: "a" });
        const ok2 = a[0] === 7 && a[1] === 10 && a[N - 1] === ((N - 1) & 0xffff) * 3 + 7;
        console.log("mulScalar:" + (ok1 ? "OK" : "FAIL") + " addScalar:" + (ok2 ? "OK" : "FAIL"));
      `,
    );
    expect(stdout).toBe("mulScalar:OK addScalar:OK");
    expect(exitCode).toBe(0);
  });

  it("zero-copy — binary ops with alloc'd dst write results into the pool", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-zerocopy-binary",
      `
        import simd from "para:simd";
        const N = 2_000_000; // above copy-in threshold
        const a = simd.alloc(N, "f32");
        const b = simd.alloc(N, "f32");
        const out = simd.alloc(N, "f32");
        for (let i = 0; i < N; i++) { a[i] = i & 0xffff; b[i] = (i * 2) & 0xffff; }
        const r = simd.add(a, b, { dst: out });
        const ok1 = r === out && out[0] === 0 && out[1] === 3 && out[100] === (100 & 0xffff) + (200 & 0xffff);
        simd.mul(a, b, { dst: out });
        const ok2 = out[0] === 0 && out[1] === 2 && out[5] === 5 * 10;
        console.log("add:" + (ok1 ? "OK" : "FAIL") + " mul:" + (ok2 ? "OK" : "FAIL"));
      `,
    );
    expect(stdout).toBe("add:OK mul:OK");
    expect(exitCode).toBe(0);
  });

  it("zero-copy — f64 alloc'd inputs and outputs", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-zerocopy-f64",
      `
        import simd from "para:simd";
        const a = simd.alloc(1000, "f64");
        const b = simd.alloc(1000, "f64");
        for (let i = 0; i < 1000; i++) { a[i] = i * 0.5; b[i] = i * 0.25; }
        simd.mulScalar(a, 2, { dstOverwrite: "a" });
        simd.add(a, b, { dstOverwrite: "a" });
        // a[i] = (i*0.5 * 2) + i*0.25 = i + 0.25*i = 1.25*i
        const ok = Math.abs(a[0]) < 1e-12 && Math.abs(a[10] - 12.5) < 1e-12 && Math.abs(a[999] - 1248.75) < 1e-12;
        console.log(ok ? "OK" : "FAIL:" + a[0] + "," + a[10] + "," + a[999]);
      `,
    );
    expect(stdout).toBe("OK");
    expect(exitCode).toBe(0);
  });

  it("zero-copy — results match the copy-in path element-for-element", async () => {
    // Cross-check: run the same op via (non-alloc, copy-in) and (alloc,
    // zero-copy At kernel) paths on identical inputs. They must produce
    // bit-identical f32 output.
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-zerocopy-equiv",
      `
        import simd from "para:simd";
        const N = 4096; // small — forces the copy-in path on the plain array
        const plain = new Float32Array(N);
        const alloc = simd.alloc(N, "f32");
        for (let i = 0; i < N; i++) { plain[i] = (i * 0.125) % 7; alloc[i] = plain[i]; }
        // mulScalar
        const r1 = simd.mulScalar(plain, 3.5);
        simd.mulScalar(alloc, 3.5, { dstOverwrite: "a" });
        let diffs = 0;
        for (let i = 0; i < N; i++) if (r1[i] !== alloc[i]) diffs++;
        console.log("mulScalar diffs:" + diffs);
        // addScalar
        for (let i = 0; i < N; i++) alloc[i] = plain[i];
        const r2 = simd.addScalar(plain, -1.25);
        simd.addScalar(alloc, -1.25, { dstOverwrite: "a" });
        diffs = 0;
        for (let i = 0; i < N; i++) if (r2[i] !== alloc[i]) diffs++;
        console.log("addScalar diffs:" + diffs);
        // binary add
        const plainB = new Float32Array(N);
        const allocB = simd.alloc(N, "f32");
        for (let i = 0; i < N; i++) { plainB[i] = (i * 0.5) % 3; allocB[i] = plainB[i]; }
        for (let i = 0; i < N; i++) alloc[i] = plain[i];
        const r3 = simd.add(plain, plainB);
        simd.add(alloc, allocB, { dstOverwrite: "a" });
        diffs = 0;
        for (let i = 0; i < N; i++) if (r3[i] !== alloc[i]) diffs++;
        console.log("add diffs:" + diffs);
      `,
    );
    expect(stdout).toBe(["mulScalar diffs:0", "addScalar diffs:0", "add diffs:0"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("zero-copy — alloc'd arrays coexist with non-alloc'd ops after commit", async () => {
    // Regression guard: once the alloc pool is committed, ops on regular
    // (non-alloc'd) typed arrays must still work. Below-threshold uses the
    // low-address scratch region (safe); above-threshold falls to JS tight
    // loops (safe). matVec scratch goes above allocTop.
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-zerocopy-coexist",
      `
        import simd from "para:simd";
        const held = simd.alloc(1024, "f32");
        for (let i = 0; i < 1024; i++) held[i] = i;
        // Non-alloc ops after commit still work
        const plain = new Float32Array([1, 2, 3, 4, 5]);
        const r1 = simd.mulScalar(plain, 2);
        const r2 = simd.sum(plain);
        const m = new Float32Array([1, 2, 3, 4, 5, 6]);
        const v = new Float32Array([1, 1]);
        const r3 = simd.matVec(m, v, 3, 2);
        // held alloc'd data still intact
        const heldOk = held[0] === 0 && held[512] === 512 && held[1023] === 1023;
        console.log([
          "mulScalar:" + Array.from(r1).join(","),
          "sum:" + r2,
          "matVec:" + Array.from(r3).join(","),
          "held:" + (heldOk ? "OK" : "CORRUPT"),
        ].join("\\n"));
      `,
    );
    expect(stdout).toBe(["mulScalar:2,4,6,8,10", "sum:15", "matVec:3,7,11", "held:OK"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("topK — Float32Array basic", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-topk-f32",
      `
        import { topK } from "para:simd";
        const a = new Float32Array([0.1, 0.9, 0.3, 0.7, 0.5, 0.95, 0.05, 0.8]);
        const idx = topK(a, 3);
        console.log(idx.constructor.name, Array.from(idx).join(","));
      `,
    );
    expect(stdout).toBe("Int32Array 5,1,7");
    expect(exitCode).toBe(0);
  });

  it("topK — Float64Array basic", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-topk-f64",
      `
        import { topK } from "para:simd";
        const a = new Float64Array([3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]);
        const idx = topK(a, 4);
        console.log(Array.from(idx).join(","));
      `,
    );
    expect(stdout).toBe("5,7,4,8");
    expect(exitCode).toBe(0);
  });

  it("topK — ties resolved by earlier index", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-topk-ties",
      `
        import { topK } from "para:simd";
        const a = new Float32Array([1, 2, 2, 2, 1, 2]);
        const idx = topK(a, 3);
        console.log(Array.from(idx).join(","));
      `,
    );
    expect(stdout).toBe("1,2,3");
    expect(exitCode).toBe(0);
  });

  it("topK — k=0 returns empty Int32Array", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-topk-zero",
      `
        import { topK } from "para:simd";
        const a = new Float32Array([1, 2, 3]);
        const idx = topK(a, 0);
        console.log(idx.constructor.name, idx.length);
      `,
    );
    expect(stdout).toBe("Int32Array 0");
    expect(exitCode).toBe(0);
  });

  it("topK — k > length is clamped to length", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-topk-overflow",
      `
        import { topK } from "para:simd";
        const a = new Float32Array([1, 3, 2]);
        const idx = topK(a, 10);
        console.log(idx.length, Array.from(idx).join(","));
      `,
    );
    expect(stdout).toBe("3 1,2,0");
    expect(exitCode).toBe(0);
  });

  it("topK — NaN values are never selected", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-topk-nan",
      `
        import { topK } from "para:simd";
        const a = new Float32Array([1, NaN, 3, NaN, 2]);
        const idx = topK(a, 3);
        console.log(Array.from(idx).join(","));
      `,
    );
    expect(stdout).toBe("2,4,0");
    expect(exitCode).toBe(0);
  });

  it("topK — rejects non-typed-array input and negative k", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-topk-invalid",
      `
        import { topK } from "para:simd";
        const msgs = [];
        try { topK([1, 2, 3], 2); msgs.push("NO_THROW"); }
        catch (e) { msgs.push(e instanceof TypeError ? "TYPE" : "WRONG:" + e.name); }
        try { topK(new Float32Array([1, 2, 3]), -1); msgs.push("NO_THROW"); }
        catch (e) { msgs.push(e instanceof RangeError ? "RANGE" : "WRONG:" + e.name); }
        try { topK(new Float32Array([1, 2, 3]), 1.5); msgs.push("NO_THROW"); }
        catch (e) { msgs.push(e instanceof RangeError ? "RANGE" : "WRONG:" + e.name); }
        console.log(msgs.join(" "));
      `,
    );
    expect(stdout).toBe("TYPE RANGE RANGE");
    expect(exitCode).toBe(0);
  });

  it("dst — validates type and length; mutual exclusion with dstOverwrite", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-dst-invalid",
      `
        import simd from "para:simd";
        const a = new Float32Array([1, 2, 3]);
        const msgs = [];
        try { simd.mulScalar(a, 2, { dst: new Float64Array(3) }); msgs.push("NO_THROW"); }
        catch (e) { msgs.push(e instanceof TypeError ? "TYPE" : "WRONG:" + e.name); }
        try { simd.mulScalar(a, 2, { dst: new Float32Array(5) }); msgs.push("NO_THROW"); }
        catch (e) { msgs.push(e instanceof RangeError ? "RANGE" : "WRONG:" + e.name); }
        try { simd.mulScalar(a, 2, { dst: new Float32Array(3), dstOverwrite: "a" }); msgs.push("NO_THROW"); }
        catch (e) { msgs.push(e instanceof TypeError ? "TYPE" : "WRONG:" + e.name); }
        console.log(msgs.join(" "));
      `,
    );
    expect(stdout).toBe("TYPE RANGE TYPE");
    expect(exitCode).toBe(0);
  });

  // The WASM kernels cap out at REDUCE_WASM_MAX_BYTES (4 MiB) — beyond that
  // simd.ts dispatches to the native Highway kernels via $cpp("parabun_simd_kernels.cpp").
  // 2 M elements of f32 = 8 MiB, 1 M elements of f64 = 8 MiB; both clear the
  // 4 MiB ceiling, so these tests exercise the native path specifically.
  it("sum/dot — native Highway path (Float32, beyond WASM threshold)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-native-f32",
      `
        import { sum, dot } from "para:simd";
        const n = 2_000_000;
        const a = new Float32Array(n);
        const b = new Float32Array(n);
        for (let i = 0; i < n; i++) { a[i] = 1; b[i] = 2; }
        // sum(a) = n; dot(a,b) = 2n.
        console.log(sum(a) === n, dot(a, b) === 2 * n);
      `,
    );
    expect(stdout).toBe("true true");
    expect(exitCode).toBe(0);
  });

  it("sum/dot — native Highway path (Float64, beyond WASM threshold)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-native-f64",
      `
        import { sum, dot } from "para:simd";
        const n = 1_000_000;
        const a = new Float64Array(n);
        const b = new Float64Array(n);
        for (let i = 0; i < n; i++) { a[i] = 1; b[i] = 3; }
        console.log(sum(a) === n, dot(a, b) === 3 * n);
      `,
    );
    expect(stdout).toBe("true true");
    expect(exitCode).toBe(0);
  });

  it("native sum/dot — input shape validation", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-native-shape",
      `
        // Reach the native kernels directly to exercise the C++ TypeError path
        // (the public API rejects mismatched inputs in JS first).
        import { sum, dot } from "para:simd";
        // Mixed types: dot() should throw on shape mismatch in JS-side
        // requireSameTypeAndLen, before reaching native.
        const msgs = [];
        try { dot(new Float32Array(8), new Float64Array(8)); msgs.push("NO"); }
        catch (e) { msgs.push(e instanceof TypeError ? "TYPE" : "OTHER"); }
        // Empty arrays: short-circuits before any kernel call.
        msgs.push(sum(new Float32Array(0)));
        msgs.push(dot(new Float64Array(0), new Float64Array(0)));
        console.log(msgs.join(" "));
      `,
    );
    expect(stdout).toBe("TYPE 0 0");
    expect(exitCode).toBe(0);
  });
});
