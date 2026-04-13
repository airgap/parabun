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

describe("bun:simd", () => {
  it("mulScalar — Float32Array scalar multiply", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-mulscalar",
      `
        import { mulScalar } from "bun:simd";
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
        import { addScalar } from "bun:simd";
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
        import { add } from "bun:simd";
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
        import { mul } from "bun:simd";
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
        import { sum } from "bun:simd";
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
        import { dot } from "bun:simd";
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
        import { mulScalar, sum } from "bun:simd";
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
        import { mulScalar } from "bun:simd";
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
        import { simdMap } from "bun:simd";
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
        import { simdMap } from "bun:simd";
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
        import { simdMap } from "bun:simd";
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
        import { mulScalar } from "bun:simd";
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

  it("rejects mismatched array lengths", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-simd-lenerr",
      `
        import { add } from "bun:simd";
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
});
