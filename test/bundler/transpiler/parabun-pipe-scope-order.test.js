// LYK-1129: `expr |> (a => …)` desugars to `(a => …)(expr)`, which makes the
// visit pass reach the RHS arrow's scopes before the scopes inside `expr`,
// while scopes_in_order held parse order. Debug builds panicked "Scope
// mismatch while visiting"; release builds silently visited each arrow under
// the other's scope. The parser now reorders the RHS's scope entries ahead of
// the LHS's after the desugar. These run as real subprocesses so the full
// parse → visit pipeline executes (the transpiler API alone doesn't replay
// scopes the same way).
import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

async function runFixture(prefix, source) {
  using dir = tempDir(prefix, { "index.pts": source.trimStart() });
  await using proc = Bun.spawn({
    cmd: [bunExe(), "index.pts"],
    env: bunEnv,
    cwd: String(dir),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

describe("pipe into parenthesized arrow — scope replay order (LYK-1129)", () => {
  it("scoped LHS into arrow RHS (original repro)", async () => {
    const { stdout, stderr, exitCode } = await runFixture(
      "pipe-scope-repro",
      `
        const d = [1, 2, 3].map(x => x * 2) |> (a => a.join(","));
        console.log(d);
      `,
    );
    expect(stderr).not.toContain("Scope mismatch");
    expect(exitCode).toBe(0);
    expect(stdout).toBe("2,4,6");
  });

  it("statement-bodied (non-inlinable) arrow RHS", async () => {
    const { stdout, exitCode } = await runFixture(
      "pipe-scope-stmt-body",
      `
        const b = [1, 2].map(x => x + 1) |> (v => { const s = v.join("-"); return s; });
        console.log(b);
      `,
    );
    expect(exitCode).toBe(0);
    expect(stdout).toBe("2-3");
  });

  it("chained pipes with arrows on every segment", async () => {
    const { stdout, exitCode } = await runFixture(
      "pipe-scope-chain",
      `
        const c = [3, 1, 2].map(x => x) |> (v => v.sort((p, q) => p - q)) |> (v => v.join(""));
        console.log(c);
      `,
    );
    expect(exitCode).toBe(0);
    expect(stdout).toBe("123");
  });

  it("closure capture stays correct on both sides of the pipe", async () => {
    const { stdout, exitCode } = await runFixture(
      "pipe-scope-capture",
      `
        const mult = 3;
        const g = [1, 2].map(x => x * mult) |> (arr => arr.map(y => y + mult).join(","));
        console.log(g);
      `,
    );
    expect(exitCode).toBe(0);
    expect(stdout).toBe("6,9");
  });

  it("pipe inside a callback (enclosing scope precedes both sides)", async () => {
    const { stdout, exitCode } = await runFixture(
      "pipe-scope-nested",
      `
        const f = [10, 20].map(n => n |> (m => m + 1));
        console.log(f.join(","));
      `,
    );
    expect(exitCode).toBe(0);
    expect(stdout).toBe("11,21");
  });

  it("sequential pipe statements don't bleed reorders across statements", async () => {
    const { stdout, exitCode } = await runFixture(
      "pipe-scope-sequential",
      `
        const h1 = [1].map(x => x + 1) |> (v => v[0]);
        const h2 = [5].map(x => x + 1) |> (v => v[0]);
        console.log(h1, h2);
      `,
    );
    expect(exitCode).toBe(0);
    expect(stdout).toBe("2 6");
  });

  it("scopeless LHS into arrow RHS needs no reorder", async () => {
    const { stdout, exitCode } = await runFixture(
      "pipe-scope-bare-lhs",
      `
        const d = 5 |> (n => n * 3);
        console.log(d);
      `,
    );
    expect(exitCode).toBe(0);
    expect(stdout).toBe("15");
  });
});
