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

describe("para:gpu — conv2D", () => {
  it("identity kernel: 1×1 [1] returns input unchanged", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-conv2d-identity",
      `
        import gpu from "para:gpu";
        gpu.setBackend("cpu");
        const input = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);  // 3x3
        const k = new Float32Array([1]);                              // 1x1
        const out = gpu.conv2D(input, k, 3, 3, 1, 1);
        console.log(Array.from(out).join(","));
      `,
    );
    expect(stdout).toBe("1,2,3,4,5,6,7,8,9");
    expect(exitCode).toBe(0);
  });

  it("3×3 box blur on a 3×3 input → single-pixel mean", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-conv2d-box",
      `
        import gpu from "para:gpu";
        gpu.setBackend("cpu");
        // Sum of 1..9 is 45; box blur uniform 1/9 → 45/9 = 5.
        const input = new Float32Array([1,2,3, 4,5,6, 7,8,9]);
        const ninth = 1 / 9;
        const k = new Float32Array(9).fill(ninth);
        const out = gpu.conv2D(input, k, 3, 3, 3, 3);
        console.log(out.length, out[0].toFixed(6));
      `,
    );
    // 1 output pixel; should be 5.0 (within fp32 rounding).
    expect(stdout).toBe("1 5.000000");
    expect(exitCode).toBe(0);
  });

  it("hand-computed 3×3 input × 2×2 kernel", async () => {
    // input = [[1,2,3],[4,5,6],[7,8,9]], kernel = [[1,0],[0,-1]]
    // Output is 2×2:
    //   o[0,0] = 1*1 + 2*0 + 4*0 + 5*(-1) = -4
    //   o[0,1] = 2*1 + 3*0 + 5*0 + 6*(-1) = -4
    //   o[1,0] = 4*1 + 5*0 + 7*0 + 8*(-1) = -4
    //   o[1,1] = 5*1 + 6*0 + 8*0 + 9*(-1) = -4
    const { stdout, exitCode } = await runFixture(
      "parabun-conv2d-by-hand",
      `
        import gpu from "para:gpu";
        gpu.setBackend("cpu");
        const input = new Float32Array([1,2,3, 4,5,6, 7,8,9]);
        const k = new Float32Array([1, 0, 0, -1]);
        const out = gpu.conv2D(input, k, 3, 3, 2, 2);
        console.log(Array.from(out).join(","));
      `,
    );
    expect(stdout).toBe("-4,-4,-4,-4");
    expect(exitCode).toBe(0);
  });

  it("Sobel edge-detect on a step-function image — non-trivial output", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-conv2d-sobel",
      `
        import gpu from "para:gpu";
        gpu.setBackend("cpu");
        // 4-wide step from 0 to 100 at column 2. Sobel-X kernel finds the
        // vertical edge — interior columns light up where the gradient is.
        const input = new Float32Array([
          0,   0,   100, 100,
          0,   0,   100, 100,
          0,   0,   100, 100,
          0,   0,   100, 100,
        ]);
        // Sobel X (3x3): [[-1,0,1],[-2,0,2],[-1,0,1]]
        const k = new Float32Array([-1, 0, 1, -2, 0, 2, -1, 0, 1]);
        const out = gpu.conv2D(input, k, 4, 4, 3, 3);
        // Output is 2×2. Column 0 of output centers on input column 1
        // (zero gradient at that column → 0). Column 1 of output centers
        // on input column 2 (the step → magnitude 4 * 100 = 400).
        console.log(Array.from(out).join(","));
      `,
    );
    expect(stdout).toBe("400,400,400,400");
    expect(exitCode).toBe(0);
  });

  it("rejects mismatched input length", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-conv2d-bad-len",
      `
        import gpu from "para:gpu";
        gpu.setBackend("cpu");
        try {
          gpu.conv2D(new Float32Array(8), new Float32Array(4), 3, 3, 2, 2);
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.message.includes("input length 8 != iW * iH"));
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });

  it("rejects kernel larger than input", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-conv2d-too-big",
      `
        import gpu from "para:gpu";
        gpu.setBackend("cpu");
        try {
          gpu.conv2D(new Float32Array(9), new Float32Array(16), 3, 3, 4, 4);
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.message.includes("> input"));
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });
});
