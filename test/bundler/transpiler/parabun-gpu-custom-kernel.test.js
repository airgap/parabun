import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

async function runFixture(prefix, source) {
  using dir = tempDir(prefix, { "index.pjs": source.trimStart() });
  await using proc = Bun.spawn({
    cmd: [bunExe(), "--asan=off", "index.pjs"],
    env: bunEnv,
    cwd: String(dir),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

describe("GPU custom kernel dispatch", () => {
  it("relu: affine detector rejects, custom kernel handles", async () => {
    const { stdout, exitCode } = await runFixture(
      "gpu-relu",
      `
        import { simdMap } from "parabun:gpu";
        pure function relu(x) { return x > 0 ? x : 0; }
        const a = new Float32Array(1000);
        for (let i = 0; i < 1000; i++) a[i] = i - 500;
        const out = simdMap(relu, a);
        console.log(JSON.stringify({ first: out[0], mid: out[500], last: out[999] }));
      `,
    );
    expect(JSON.parse(stdout)).toEqual({ first: 0, mid: 0, last: 499 });
    expect(exitCode).toBe(0);
  });

  it("square function via custom kernel", async () => {
    const { stdout, exitCode } = await runFixture(
      "gpu-square",
      `
        import { simdMap } from "parabun:gpu";
        pure function square(x) { return x * x; }
        const a = new Float32Array(1000);
        for (let i = 0; i < 1000; i++) a[i] = i - 500;
        const out = simdMap(square, a);
        console.log(JSON.stringify({ first: out[0], mid: out[500], last: out[999] }));
      `,
    );
    expect(JSON.parse(stdout)).toEqual({ first: 250000, mid: 0, last: 249001 });
    expect(exitCode).toBe(0);
  });

  it("Math.sin via custom kernel", async () => {
    const { stdout, exitCode } = await runFixture(
      "gpu-sin",
      `
        import { simdMap } from "parabun:gpu";
        pure function sinX(x) { return Math.sin(x); }
        const a = new Float32Array(1000);
        for (let i = 0; i < 1000; i++) a[i] = (i - 500) / 100;
        const out = simdMap(sinX, a);
        console.log(JSON.stringify({ sin0: out[500], sin1: out[600], sinn1: out[400] }));
      `,
    );
    const parsed = JSON.parse(stdout);
    expect(parsed.sin0).toBeCloseTo(0, 4);
    expect(parsed.sin1).toBeCloseTo(Math.fround(Math.sin(1)), 4);
    expect(parsed.sinn1).toBeCloseTo(Math.fround(Math.sin(-1)), 4);
    expect(exitCode).toBe(0);
  });

  it("Math.exp via custom kernel", async () => {
    const { stdout, exitCode } = await runFixture(
      "gpu-exp",
      `
        import { simdMap } from "parabun:gpu";
        pure function expX(x) { return Math.exp(x); }
        const a = new Float32Array(1000);
        for (let i = 0; i < 1000; i++) a[i] = (i - 500) / 100;
        const out = simdMap(expX, a);
        console.log(JSON.stringify({ exp0: out[500], expn5: out[0] }));
      `,
    );
    const parsed = JSON.parse(stdout);
    expect(parsed.exp0).toBeCloseTo(1, 4);
    expect(parsed.expn5).toBeCloseTo(Math.exp(-5), 4);
    expect(exitCode).toBe(0);
  });

  it("Math.sqrt via custom kernel", async () => {
    const { stdout, exitCode } = await runFixture(
      "gpu-sqrt",
      `
        import { simdMap } from "parabun:gpu";
        pure function sqrtX(x) { return Math.sqrt(x); }
        const a = new Float32Array(1000);
        for (let i = 0; i < 1000; i++) a[i] = i + 1;
        const out = simdMap(sqrtX, a);
        console.log(JSON.stringify({ sqrt1: out[0], sqrt4: out[3], sqrt100: out[99] }));
      `,
    );
    const parsed = JSON.parse(stdout);
    expect(parsed.sqrt1).toBeCloseTo(1, 4);
    expect(parsed.sqrt4).toBeCloseTo(2, 4);
    expect(parsed.sqrt100).toBeCloseTo(10, 4);
    expect(exitCode).toBe(0);
  });

  it("clamp via nested ternary", async () => {
    const { stdout, exitCode } = await runFixture(
      "gpu-clamp",
      `
        import { simdMap } from "parabun:gpu";
        pure function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
        const a = new Float32Array(1000);
        for (let i = 0; i < 1000; i++) a[i] = (i - 500) / 100;
        const out = simdMap(clamp, a);
        console.log(JSON.stringify({ neg: out[0], zero: out[500], half: out[550], above: out[999] }));
      `,
    );
    const parsed = JSON.parse(stdout);
    expect(parsed.neg).toBe(0);
    expect(parsed.zero).toBe(0);
    expect(parsed.half).toBeCloseTo(0.5, 4);
    expect(parsed.above).toBe(1);
    expect(exitCode).toBe(0);
  });

  it("power operator via custom kernel", async () => {
    const { stdout, exitCode } = await runFixture(
      "gpu-pow",
      `
        import { simdMap } from "parabun:gpu";
        pure function cube(x) { return x ** 3; }
        const a = new Float32Array(1000);
        for (let i = 0; i < 1000; i++) a[i] = (i - 500) / 100;
        const out = simdMap(cube, a);
        console.log(JSON.stringify({ cube0: out[500], cube1: out[600], cuben1: out[400] }));
      `,
    );
    const parsed = JSON.parse(stdout);
    expect(parsed.cube0).toBeCloseTo(0, 4);
    expect(parsed.cube1).toBeCloseTo(1, 4);
    expect(parsed.cuben1).toBeCloseTo(-1, 4);
    expect(exitCode).toBe(0);
  });

  it("affine functions still use fast affine path", async () => {
    const { stdout, exitCode } = await runFixture(
      "gpu-affine-regression",
      `
        import { simdMap } from "parabun:gpu";
        pure function triple(x) { return x * 3; }
        pure function addFive(x) { return x + 5; }
        const a = new Float32Array(1000);
        for (let i = 0; i < 1000; i++) a[i] = i;
        const t = simdMap(triple, a);
        const p = simdMap(addFive, a);
        console.log(JSON.stringify({ t0: t[0], t999: t[999], p0: p[0], p999: p[999] }));
      `,
    );
    expect(JSON.parse(stdout)).toEqual({ t0: 0, t999: 2997, p0: 5, p999: 1004 });
    expect(exitCode).toBe(0);
  });

  it("combined expression: Math.abs(x) * Math.sin(x)", async () => {
    const { stdout, exitCode } = await runFixture(
      "gpu-combined",
      `
        import { simdMap } from "parabun:gpu";
        pure function combined(x) { return Math.abs(x) * Math.sin(x); }
        const a = new Float32Array(1000);
        for (let i = 0; i < 1000; i++) a[i] = (i - 500) / 100;
        const out = simdMap(combined, a);
        const ref0 = Math.abs(0) * Math.sin(0);
        const ref1 = Math.abs(1) * Math.sin(1);
        console.log(JSON.stringify({ at0: out[500], at1: out[600] }));
      `,
    );
    const parsed = JSON.parse(stdout);
    expect(parsed.at0).toBeCloseTo(0, 4);
    expect(parsed.at1).toBeCloseTo(Math.abs(1) * Math.sin(1), 3);
    expect(exitCode).toBe(0);
  });

  it("custom kernel results cached across calls", async () => {
    const { stdout, exitCode } = await runFixture(
      "gpu-cache",
      `
        import { simdMap } from "parabun:gpu";
        pure function relu(x) { return x > 0 ? x : 0; }
        const a = new Float32Array(1000);
        for (let i = 0; i < 1000; i++) a[i] = i - 500;
        const out1 = simdMap(relu, a);
        const out2 = simdMap(relu, a);
        console.log(JSON.stringify({
          same: out1[0] === out2[0] && out1[999] === out2[999],
          first: out1[0],
          last: out1[999],
        }));
      `,
    );
    expect(JSON.parse(stdout)).toEqual({ same: true, first: 0, last: 499 });
    expect(exitCode).toBe(0);
  });
});

describe("affine detector 4-probe regression", () => {
  it("rejects relu (not affine)", async () => {
    const { stdout, exitCode } = await runFixture(
      "gpu-affine-relu",
      `
        import { simdMap } from "para:simd";
        pure function relu(x) { return x > 0 ? x : 0; }
        const a = new Float32Array([-5, -1, 0, 1, 5]);
        const out = simdMap(relu, a);
        console.log(JSON.stringify(Array.from(out)));
      `,
    );
    expect(JSON.parse(stdout)).toEqual([0, 0, 0, 1, 5]);
    expect(exitCode).toBe(0);
  });

  it("rejects abs (not affine)", async () => {
    const { stdout, exitCode } = await runFixture(
      "gpu-affine-abs",
      `
        import { simdMap } from "para:simd";
        pure function absX(x) { return Math.abs(x); }
        const a = new Float32Array([-5, -1, 0, 1, 5]);
        const out = simdMap(absX, a);
        console.log(JSON.stringify(Array.from(out)));
      `,
    );
    expect(JSON.parse(stdout)).toEqual([5, 1, 0, 1, 5]);
    expect(exitCode).toBe(0);
  });

  it("still accepts true affine y=2x+3", async () => {
    const { stdout, exitCode } = await runFixture(
      "gpu-affine-true",
      `
        import { simdMap } from "para:simd";
        pure function linear(x) { return 2 * x + 3; }
        const a = new Float32Array([0, 1, 2, 3, 4]);
        const out = simdMap(linear, a);
        console.log(JSON.stringify(Array.from(out)));
      `,
    );
    expect(JSON.parse(stdout)).toEqual([3, 5, 7, 9, 11]);
    expect(exitCode).toBe(0);
  });
});
