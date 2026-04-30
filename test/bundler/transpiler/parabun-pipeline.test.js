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

describe("para:pipeline", () => {
  it("map + collect", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-pipe-map",
      `
        import { map, collect } from "para:pipeline";
        pure function double(x) { return x * 2; }
        const out = await ([1, 2, 3] |> map(double) |> collect);
        console.log(JSON.stringify(out));
      `,
    );
    expect(stdout).toBe("[2,4,6]");
    expect(exitCode).toBe(0);
  });

  it("filter + collect", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-pipe-filter",
      `
        import { filter, collect } from "para:pipeline";
        pure function even(x) { return x % 2 === 0; }
        const out = await ([1, 2, 3, 4, 5, 6] |> filter(even) |> collect);
        console.log(JSON.stringify(out));
      `,
    );
    expect(stdout).toBe("[2,4,6]");
    expect(exitCode).toBe(0);
  });

  it("chained map |> filter |> take", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-pipe-chain",
      `
        import { map, filter, take, collect } from "para:pipeline";
        pure function sq(x) { return x * x; }
        pure function gt10(x) { return x > 10; }
        const out = await ([1,2,3,4,5,6,7,8] |> map(sq) |> filter(gt10) |> take(3) |> collect);
        console.log(JSON.stringify(out));
      `,
    );
    expect(stdout).toBe("[16,25,36]");
    expect(exitCode).toBe(0);
  });

  it("take is lazy (does not pull past the limit)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-pipe-lazy",
      `
        import { take, collect } from "para:pipeline";
        let pulls = 0;
        function* source() {
          while (true) { pulls++; yield pulls; }
        }
        const out = await (source() |> take(3) |> collect);
        console.log(JSON.stringify(out), "pulls=" + pulls);
      `,
    );
    expect(stdout).toBe("[1,2,3] pulls=3");
    expect(exitCode).toBe(0);
  });

  it("drop + takeWhile", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-pipe-droptake",
      `
        import { drop, takeWhile, collect } from "para:pipeline";
        pure function lt6(x) { return x < 6; }
        const out = await ([1,2,3,4,5,6,7] |> drop(2) |> takeWhile(lt6) |> collect);
        console.log(JSON.stringify(out));
      `,
    );
    expect(stdout).toBe("[3,4,5]");
    expect(exitCode).toBe(0);
  });

  it("flatMap", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-pipe-flatmap",
      `
        import { flatMap, collect } from "para:pipeline";
        pure function pair(x) { return [x, x * 10]; }
        const out = await ([1,2,3] |> flatMap(pair) |> collect);
        console.log(JSON.stringify(out));
      `,
    );
    expect(stdout).toBe("[1,10,2,20,3,30]");
    expect(exitCode).toBe(0);
  });

  it("chunk", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-pipe-chunk",
      `
        import { chunk, collect } from "para:pipeline";
        const out = await ([1,2,3,4,5,6,7] |> chunk(3) |> collect);
        console.log(JSON.stringify(out));
      `,
    );
    expect(stdout).toBe("[[1,2,3],[4,5,6],[7]]");
    expect(exitCode).toBe(0);
  });

  it("reduce", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-pipe-reduce",
      `
        import { reduce } from "para:pipeline";
        pure function add(a, b) { return a + b; }
        const out = await ([1,2,3,4] |> reduce(add, 0));
        console.log(out);
      `,
    );
    expect(stdout).toBe("10");
    expect(exitCode).toBe(0);
  });

  it("count", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-pipe-count",
      `
        import { filter, count } from "para:pipeline";
        pure function odd(x) { return x % 2 === 1; }
        const out = await ([1,2,3,4,5,6,7] |> filter(odd) |> count);
        console.log(out);
      `,
    );
    expect(stdout).toBe("4");
    expect(exitCode).toBe(0);
  });

  it("range + take + collect", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-pipe-range",
      `
        import { range, take, collect } from "para:pipeline";
        const out = await (range(100) |> take(5) |> collect);
        console.log(JSON.stringify(out));
      `,
    );
    expect(stdout).toBe("[0,1,2,3,4]");
    expect(exitCode).toBe(0);
  });

  it("works with async iterables", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-pipe-async",
      `
        import { map, collect } from "para:pipeline";
        async function* source() { yield 1; yield 2; yield 3; }
        pure function double(x) { return x * 2; }
        const out = await (source() |> map(double) |> collect);
        console.log(JSON.stringify(out));
      `,
    );
    expect(stdout).toBe("[2,4,6]");
    expect(exitCode).toBe(0);
  });

  it("pipe() call-form equivalent", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-pipe-callform",
      `
        import { pipe, map, filter, collect } from "para:pipeline";
        pure function inc(x) { return x + 1; }
        pure function pos(x) { return x > 0; }
        const out = await collect(pipe([-2,-1,0,1,2], map(inc), filter(pos)));
        console.log(JSON.stringify(out));
      `,
    );
    expect(stdout).toBe("[1,2,3]");
    expect(exitCode).toBe(0);
  });

  it("fusion: Float32Array |> map(affine) |> sum", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-pipe-fuse-sum",
      `
        import { map, sum } from "para:pipeline";
        pure function k(x) { return x * 3 + 7; }
        const arr = new Float32Array([1, 2, 3, 4, 5]);
        const out = await (arr |> map(k) |> sum);
        console.log(out);
      `,
    );
    // (1*3+7) + (2*3+7) + (3*3+7) + (4*3+7) + (5*3+7) = 80
    expect(stdout).toBe("80");
    expect(exitCode).toBe(0);
  });

  it("fusion: Float64Array |> map(affine) |> map(affine) |> toFloat64Array", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-pipe-fuse-compose",
      `
        import { map, toFloat64Array } from "para:pipeline";
        pure function f(x) { return x * 2 + 1; }
        pure function g(x) { return x * 10 - 5; }
        const arr = new Float64Array([1, 2, 3]);
        const out = await (arr |> map(f) |> map(g) |> toFloat64Array);
        console.log(JSON.stringify(Array.from(out)));
      `,
    );
    // g(f(1)) = g(3) = 25; g(f(2)) = g(5) = 45; g(f(3)) = g(7) = 65
    expect(stdout).toBe("[25,45,65]");
    expect(exitCode).toBe(0);
  });

  it("fusion: non-affine map uses simdMap fallback", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-pipe-fuse-nonaffine",
      `
        import { map, toFloat64Array } from "para:pipeline";
        pure function sq(x) { return x * x; }
        const arr = new Float64Array([1, 2, 3, 4]);
        const out = await (arr |> map(sq) |> toFloat64Array);
        console.log(JSON.stringify(Array.from(out)));
      `,
    );
    expect(stdout).toBe("[1,4,9,16]");
    expect(exitCode).toBe(0);
  });

  it("fusion: chain + filter falls back correctly", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-pipe-fuse-filter-fallback",
      `
        import { map, filter, collect } from "para:pipeline";
        pure function double(x) { return x * 2; }
        pure function gt5(x) { return x > 5; }
        const arr = new Float32Array([1, 2, 3, 4, 5]);
        const out = await (arr |> map(double) |> filter(gt5) |> collect);
        console.log(JSON.stringify(out));
      `,
    );
    // doubles: [2,4,6,8,10]; filter > 5: [6,8,10]
    expect(stdout).toBe("[6,8,10]");
    expect(exitCode).toBe(0);
  });

  it("fusion: collect on a typed array source works", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-pipe-fuse-collect-fa",
      `
        import { map, collect } from "para:pipeline";
        pure function inc(x) { return x + 1; }
        const arr = new Float32Array([10, 20, 30]);
        const out = await (arr |> map(inc) |> collect);
        console.log(JSON.stringify(out));
      `,
    );
    expect(stdout).toBe("[11,21,31]");
    expect(exitCode).toBe(0);
  });

  it("fusion: large f32 affine chain matches para:simd (GPU tier)", async () => {
    // Covers the pipeline → para:gpu promotion path. When the fused chain
    // collapses to `x*K + C` over a Float32Array big enough for the GPU
    // to win (>= 1<<18 elems), `realizeChain` dispatches to `gpu.simdMap`
    // instead of stacking `simd.mulScalar` + `simd.addScalar`. On mac
    // the active backend is Metal (MSL kernel); on a CUDA-capable linux
    // box it's CUDA PTX; on hosts without either, gpu.simdMap transparently
    // falls back to simd.simdMap — the result must match bit-for-bit in
    // every path. We assert on a handful of sampled indices + a rolling
    // xor-sum so a single wrong element would flip the sum.
    const { stdout, exitCode } = await runFixture(
      "parabun-pipe-fuse-gpu-tier",
      `
        import { map, toFloat32Array } from "para:pipeline";
        import simd from "para:simd";
        pure function k1(x) { return x * 3 + 1; }
        pure function k2(x) { return x * 0.5 - 2; }
        const n = 1 << 20;
        const arr = new Float32Array(n);
        for (let i = 0; i < n; i++) arr[i] = i * 0.25;
        const out = await (arr |> map(k1) |> map(k2) |> toFloat32Array);
        // Reference: same chain through para:simd directly.
        const ref = simd.simdMap(x => 0.5 * (x * 3 + 1) - 2, arr);
        let mismatches = 0;
        for (let i = 0; i < n; i++) if (out[i] !== ref[i]) mismatches++;
        console.log(out.length, mismatches, out[0], out[1000], out[n - 1]);
      `,
    );
    // k2(k1(x)) = 0.5*(3x+1) - 2 = 1.5x - 1.5
    // x=0     → -1.5
    // x=250   → 373.5 (i=1000, x=250)
    // x=262143.75 → 393214.125 (i=n-1)
    expect(stdout).toBe("1048576 0 -1.5 373.5 393214.125");
    expect(exitCode).toBe(0);
  });

  it("fusion: empty chain on typed array is identity", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-pipe-fuse-empty",
      `
        import { collect, sum } from "para:pipeline";
        const arr = new Float32Array([1.5, 2.5, 3]);
        const s = await sum(arr);
        const c = await collect(arr);
        console.log(s, JSON.stringify(c));
      `,
    );
    expect(stdout).toBe("7 [1.5,2.5,3]");
    expect(exitCode).toBe(0);
  });
});
