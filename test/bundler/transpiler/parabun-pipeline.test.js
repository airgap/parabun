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

describe("bun:pipeline", () => {
  it("map + collect", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-pipe-map",
      `
        import { map, collect } from "bun:pipeline";
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
        import { filter, collect } from "bun:pipeline";
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
        import { map, filter, take, collect } from "bun:pipeline";
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
        import { take, collect } from "bun:pipeline";
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
        import { drop, takeWhile, collect } from "bun:pipeline";
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
        import { flatMap, collect } from "bun:pipeline";
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
        import { chunk, collect } from "bun:pipeline";
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
        import { reduce } from "bun:pipeline";
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
        import { filter, count } from "bun:pipeline";
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
        import { range, take, collect } from "bun:pipeline";
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
        import { map, collect } from "bun:pipeline";
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
        import { pipe, map, filter, collect } from "bun:pipeline";
        pure function inc(x) { return x + 1; }
        pure function pos(x) { return x > 0; }
        const out = await collect(pipe([-2,-1,0,1,2], map(inc), filter(pos)));
        console.log(JSON.stringify(out));
      `,
    );
    expect(stdout).toBe("[1,2,3]");
    expect(exitCode).toBe(0);
  });
});
