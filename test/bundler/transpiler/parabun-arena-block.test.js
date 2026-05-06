import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

// Parabun `arena { body }` block statements desugar at parse time to
//   __parabunArena(() => { body });
// which delegates to `require("__parabunArena").scope(fn)` — running the body with
// JSC GC deferred, then requesting an Eden collection on scope exit.
//
// Body semantics are arrow-local: `return`/`break`/`continue` inside the arena
// block do NOT exit the enclosing function/loop. If callers need the block's
// result, they assign a value to a variable declared outside.
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

describe("Parabun arena blocks", () => {
  describe("parse-time desugar", () => {
    const transpiler = new Bun.Transpiler({ loader: "ts" });

    it("desugars `arena { body }` to a para:arena scope call", () => {
      const out = transpiler.transformSync(`arena { let x = 1; console.log(x); }`);
      expect(out).toContain("/arena");
      expect(out).toContain(".scope");
    });

    it("`arena` is still a valid identifier when not followed by `{`", () => {
      const out = transpiler.transformSync(`const arena = 42; console.log(arena + 1);`);
      expect(out).not.toContain("/arena");
      expect(out).toContain("arena");
    });

    it("`arena.foo()` is a property call, not an arena block", () => {
      const out = transpiler.transformSync(`arena.foo();`);
      expect(out).not.toContain("/arena");
    });

    it("`arena(x)` is a function call, not an arena block", () => {
      const out = transpiler.transformSync(`arena(1, 2, 3);`);
      expect(out).not.toContain("/arena");
    });

    it("newline between `arena` and `{` keeps `arena` as an identifier", () => {
      // If the user writes `arena` on its own line followed by a standalone
      // block, we preserve that reading: `arena;` expression statement + a
      // separate block. Matches how ASI works elsewhere in JS.
      const out = transpiler.transformSync(`arena\n{ let x = 1; }`);
      expect(out).not.toContain("/arena");
    });
  });

  describe("runtime behavior", () => {
    it("runs the body and observes side effects", async () => {
      const { stdout, exitCode } = await runFixture(
        "parabun-arena-block-basic",
        `
          let sum = 0;
          arena {
            for (let i = 0; i < 5; i++) sum += i;
          }
          console.log(sum);
        `,
      );
      expect(stdout).toBe("10");
      expect(exitCode).toBe(0);
    });

    it("allocations inside the block survive the block boundary", async () => {
      // DeferGC is latency-smoothing, not a bump allocator. Values allocated
      // inside the arena block remain valid after it ends.
      const { stdout, exitCode } = await runFixture(
        "parabun-arena-block-alloc",
        `
          let xs;
          arena {
            xs = new Uint8Array(16);
            for (let i = 0; i < 16; i++) xs[i] = i;
          }
          console.log(xs.length, xs[15]);
        `,
      );
      expect(stdout).toBe("16 15");
      expect(exitCode).toBe(0);
    });

    it("nested arena blocks compose", async () => {
      const { stdout, exitCode } = await runFixture(
        "parabun-arena-block-nested",
        `
          let trace = "";
          arena {
            trace += "outer:start ";
            arena {
              trace += "inner ";
            }
            trace += "outer:end";
          }
          console.log(trace);
        `,
      );
      expect(stdout).toBe("outer:start inner outer:end");
      expect(exitCode).toBe(0);
    });

    it("throws inside the body propagate to the caller", async () => {
      const { stdout, exitCode } = await runFixture(
        "parabun-arena-block-throw",
        `
          let caught = null;
          try {
            arena { throw new Error("boom"); }
          } catch (e) { caught = e.message; }
          console.log(caught);
        `,
      );
      expect(stdout).toBe("boom");
      expect(exitCode).toBe(0);
    });

    it("return inside arena body is arrow-local, not function-local", async () => {
      // Documented: `return` exits the arena arrow, not the enclosing fn. The
      // enclosing fn keeps running. This matches `.forEach(() => { return })`.
      const { stdout, exitCode } = await runFixture(
        "parabun-arena-block-return",
        `
          function f() {
            let trace = "pre ";
            arena {
              trace += "in ";
              return; // arrow-local — enclosing f continues
            }
            trace += "post";
            return trace;
          }
          console.log(f());
        `,
      );
      expect(stdout).toBe("pre in post");
      expect(exitCode).toBe(0);
    });

    it("arena block at top level works (no enclosing function required)", async () => {
      const { stdout, exitCode } = await runFixture(
        "parabun-arena-block-toplevel",
        `
          let x = 0;
          arena {
            x = 7;
          }
          console.log(x);
        `,
      );
      expect(stdout).toBe("7");
      expect(exitCode).toBe(0);
    });

    it("value can be captured via outer-let assignment", async () => {
      const { stdout, exitCode } = await runFixture(
        "parabun-arena-block-capture",
        `
          let result;
          arena {
            const xs = [];
            for (let i = 0; i < 5; i++) xs.push(i * i);
            result = xs.reduce((a, b) => a + b, 0);
          }
          console.log(result);
        `,
      );
      // 0+1+4+9+16 = 30
      expect(stdout).toBe("30");
      expect(exitCode).toBe(0);
    });

    it("works inside a loop", async () => {
      const { stdout, exitCode } = await runFixture(
        "parabun-arena-block-in-loop",
        `
          let total = 0;
          for (let i = 0; i < 3; i++) {
            arena {
              total += i * 10;
            }
          }
          console.log(total);
        `,
      );
      // 0 + 10 + 20 = 30
      expect(stdout).toBe("30");
      expect(exitCode).toBe(0);
    });
  });
});
