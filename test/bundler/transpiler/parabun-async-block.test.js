import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

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

describe("async { … } block expression", () => {
  it("value form — evaluates to a Promise of the block's return", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-async-value",
      `
        const p = async { return 41 + 1; };
        console.log(await p);
      `,
    );
    expect(stdout).toBe("42");
    expect(exitCode).toBe(0);
  });

  it("awaited inline", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-async-await",
      `
        const v = await async { return 10 + 5; };
        console.log(v);
      `,
    );
    expect(stdout).toBe("15");
    expect(exitCode).toBe(0);
  });

  it("await inside the block", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-async-inner-await",
      `
        const v = await async {
          const x = await Promise.resolve(20);
          return x + 1;
        };
        console.log(v);
      `,
    );
    expect(stdout).toBe("21");
    expect(exitCode).toBe(0);
  });

  it("nested async blocks", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-async-nested",
      `
        const n = await async {
          const inner = await async { return 7; };
          return inner * 2;
        };
        console.log(n);
      `,
    );
    expect(stdout).toBe("14");
    expect(exitCode).toBe(0);
  });

  it("fire-and-forget from a sync context", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-async-fire",
      `
        let log = [];
        function go() {
          async { await Promise.resolve(); log.push("ran"); };
        }
        go();
        await Promise.resolve();
        await Promise.resolve();
        console.log(log.join(","));
      `,
    );
    expect(stdout).toBe("ran");
    expect(exitCode).toBe(0);
  });

  it("does not disturb async function / arrow / method forms", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-async-untouched",
      `
        async function f() { return 1; }
        const g = async () => 2;
        const h = async (x) => x + 1;
        const o = { async m() { return 4; } };
        console.log([await f(), await g(), await h(2), await o.m()].join(","));
      `,
    );
    expect(stdout).toBe("1,2,3,4");
    expect(exitCode).toBe(0);
  });
});
