import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

// Parabun `A ~> B` reactive-binding operator. Desugars `A ~> B` to
//   require("bun:signals").effect(() => { B = A; })
// so when `A` reads signals, any change to those signals re-runs the body
// and re-assigns `B`. `B` must be assignable (identifier / property access).

function transform(source) {
  return new Bun.Transpiler({ loader: "ts" }).transformSync(source).trim();
}

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

describe("Parabun: ~> reactive binding", () => {
  describe("desugar", () => {
    it("signal → object property", () => {
      const out = transform(`signal a = 1; const obj = { v: 0 }; a ~> obj.v;`);
      expect(out).toContain(`require("bun:signals").effect(() =>`);
      expect(out).toContain(`obj.v = a.get()`);
    });

    it("signal → signal (assignment rewrites to .set)", () => {
      const out = transform(`signal a = 1; signal b = 0; a ~> b;`);
      expect(out).toContain(`b.set(a.get())`);
    });

    it("signal → array index", () => {
      const out = transform(`signal a = 1; const arr = [0]; a ~> arr[0];`);
      expect(out).toContain(`arr[0] = a.get()`);
    });

    it("captures disposer: const stop = src ~> dst", () => {
      const out = transform(`signal a = 1; const obj = { v: 0 }; const stop = a ~> obj.v;`);
      expect(out).toContain(`const stop = require("bun:signals").effect`);
    });

    it("pipeline binds tighter than ~>", () => {
      const out = transform(`signal a = 1; const obj = { v: 0 }; a |> Math.abs ~> obj.v;`);
      expect(out).toContain(`obj.v = Math.abs(a.get())`);
    });

    it("rejects non-assignable RHS (call)", () => {
      expect(() => transform(`signal a = 1; a ~> f();`)).toThrow("requires an assignable target on the right");
    });

    it("rejects non-assignable RHS (literal)", () => {
      expect(() => transform(`signal a = 1; a ~> 42;`)).toThrow("requires an assignable target on the right");
    });

    it("rejects non-assignable RHS (arrow)", () => {
      expect(() => transform(`signal a = 1; a ~> (x) => x;`)).toThrow("requires an assignable target on the right");
    });

    it("~ alone still works as bitwise NOT", () => {
      const out = transform(`const x = ~5;`);
      expect(out).toContain("~5");
    });

    it("~ followed by space-gt is NOT a ~>", () => {
      const out = transform(`const x = 1; const y = ~x > 0;`);
      expect(out).toContain("~x > 0");
    });
  });

  describe("runtime", () => {
    it("signal → property: updates re-run the binding", async () => {
      const { stdout, exitCode } = await runFixture(
        "rbind-prop",
        `
          signal count = 0;
          const obj = { v: 0 };
          count ~> obj.v;
          console.log(obj.v);
          count = 5;
          console.log(obj.v);
          count = 10;
          console.log(obj.v);
        `,
      );
      expect(stdout).toBe("0\n5\n10");
      expect(exitCode).toBe(0);
    });

    it("signal → signal: downstream signal gets updated", async () => {
      const { stdout, exitCode } = await runFixture(
        "rbind-signal",
        `
          signal a = 1;
          signal b = 0;
          a ~> b;
          console.log(b);
          a = 7;
          console.log(b);
        `,
      );
      expect(stdout).toBe("1\n7");
      expect(exitCode).toBe(0);
    });

    it("pipeline composed with ~>", async () => {
      const { stdout, exitCode } = await runFixture(
        "rbind-pipe",
        `
          signal n = -3;
          const obj = { abs: 0 };
          n |> Math.abs ~> obj.abs;
          console.log(obj.abs);
          n = -7;
          console.log(obj.abs);
        `,
      );
      expect(stdout).toBe("3\n7");
      expect(exitCode).toBe(0);
    });

    it("disposer stops further updates", async () => {
      const { stdout, exitCode } = await runFixture(
        "rbind-dispose",
        `
          signal count = 0;
          const obj = { v: 0 };
          const stop = count ~> obj.v;
          count = 3;
          console.log(obj.v);
          stop();
          count = 99;
          console.log(obj.v);
        `,
      );
      expect(stdout).toBe("3\n3");
      expect(exitCode).toBe(0);
    });

    it("derived-style: binding body tracks multiple signals", async () => {
      const { stdout, exitCode } = await runFixture(
        "rbind-multi",
        `
          signal a = 1;
          signal b = 2;
          const obj = { sum: 0 };
          a + b ~> obj.sum;
          console.log(obj.sum);
          a = 10;
          console.log(obj.sum);
          b = 20;
          console.log(obj.sum);
        `,
      );
      expect(stdout).toBe("3\n12\n30");
      expect(exitCode).toBe(0);
    });
  });
});
