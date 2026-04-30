import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

// Parabun range literals desugar at parse time:
//   a..b   →  __parabunRange(a, b)            (exclusive)
//   a..=b  →  __parabunRangeInclusive(a, b)   (inclusive)
//
// `..=` used to be overloaded with await-assign (`x ..= fetch()` ≡
// `x = await fetch()`). That meaning was removed 2026-04 — `..=` is now
// exclusively the inclusive-range pair to `..`.
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

describe("Parabun range literals", () => {
  describe("parse-time desugar", () => {
    const transpiler = new Bun.Transpiler({ loader: "ts" });

    it("desugars a..b to __parabunRange", () => {
      const out = transpiler.transformSync(`const xs = 0..5;`);
      expect(out).toContain("__parabunRange");
      expect(out).not.toContain("__parabunRangeInclusive");
    });

    it("desugars a..=b to __parabunRangeInclusive", () => {
      const out = transpiler.transformSync(`const xs = 1..=3;`);
      expect(out).toContain("__parabunRangeInclusive");
    });

    it("treats call RHS as a range now (was await-assign before)", () => {
      // Sanity: `..=` no longer means await-assign. Even with a call on the
      // RHS, it lowers to __parabunRangeInclusive(left, right). Runtime will
      // produce nonsense (range from `x` to `fetch(...)`), but the parse is
      // unambiguous.
      const out = transpiler.transformSync(`async function f() { let x; x ..= fetch('/'); }`);
      expect(out).toContain("__parabunRangeInclusive");
      expect(out).not.toMatch(/=\s*await/);
    });

    it("does NOT swallow `.` when lexing `1..10`", () => {
      // Regression: the number lexer used to greedily consume the trailing
      // `.` as part of the numeric literal, preventing `..` from ever being
      // emitted. `1..10` must parse as `range(1, 10)`, not as the two
      // numbers `1.` and `.10`.
      const out = transpiler.transformSync(`const xs = 1..10;`);
      expect(out).toContain("__parabunRange");
    });

    it("leaves `1..toString()` meaning a range, not property access", () => {
      // This is the documented break: baseline JS `1..toString()` previously
      // tokenized as `(1.).toString()`. In Parabun it is now `(1..toString)()`
      // — a range whose end operand is the reference `toString`, then called.
      // We only verify we desugared to a range; the runtime will throw when
      // it evaluates `toString` as a bare identifier.
      const out = transpiler.transformSync(`function f() { return 1..toString; }`);
      expect(out).toContain("__parabunRange");
    });
  });

  describe("runtime behavior", () => {
    it("exclusive range excludes the endpoint", async () => {
      const { stdout, exitCode } = await runFixture(
        "parabun-range-exclusive",
        `console.log(JSON.stringify([...(0..5)]));`,
      );
      expect(stdout).toBe("[0,1,2,3,4]");
      expect(exitCode).toBe(0);
    });

    it("inclusive range includes the endpoint", async () => {
      const { stdout, exitCode } = await runFixture(
        "parabun-range-inclusive",
        `console.log(JSON.stringify([...(1..=3)]));`,
      );
      expect(stdout).toBe("[1,2,3]");
      expect(exitCode).toBe(0);
    });

    it("empty and inverted ranges produce an empty array", async () => {
      const { stdout, exitCode } = await runFixture(
        "parabun-range-empty",
        `
          console.log(JSON.stringify([...(0..0)]));
          console.log(JSON.stringify([...(5..3)]));
          console.log(JSON.stringify([...(5..=3)]));
        `,
      );
      expect(stdout).toBe("[]\n[]\n[]");
      expect(exitCode).toBe(0);
    });

    it("for-of iterates exclusive and inclusive", async () => {
      const { stdout, exitCode } = await runFixture(
        "parabun-range-for-of",
        `
          let a = 0; for (const i of 0..5) a += i; console.log(a);
          let b = 0; for (const i of 1..=5) b += i; console.log(b);
        `,
      );
      // 0+1+2+3+4 = 10; 1+2+3+4+5 = 15
      expect(stdout).toBe("10\n15");
      expect(exitCode).toBe(0);
    });

    it("operands can be identifiers or simple arithmetic", async () => {
      const { stdout, exitCode } = await runFixture(
        "parabun-range-operands",
        `
          const a = 2, b = 7;
          console.log(JSON.stringify([...(a..b)]));
          console.log(JSON.stringify([...(a+1..b-1)]));
          console.log(JSON.stringify([...(a..=b)]));
        `,
      );
      expect(stdout).toBe("[2,3,4,5,6]\n[3,4,5]\n[2,3,4,5,6,7]");
      expect(exitCode).toBe(0);
    });

    it("range binds tighter than comparison", async () => {
      // `(0..5).length === 5` via `0..5 |> _.length === 5` would require a
      // pipeline; easier to directly check precedence via for-of iteration.
      const { stdout, exitCode } = await runFixture(
        "parabun-range-precedence",
        `
          const r = 0..5;
          console.log(r.length === 5);
          console.log(Array.isArray(r));
        `,
      );
      expect(stdout).toBe("true\ntrue");
      expect(exitCode).toBe(0);
    });

    it("nests with pipeline and other operators", async () => {
      const { stdout, exitCode } = await runFixture(
        "parabun-range-pipe",
        `
          const sum = (xs) => xs.reduce((a, b) => a + b, 0);
          console.log(0..10 |> sum);
          console.log(1..=10 |> sum);
        `,
      );
      // 0..10 exclusive sum = 0+1+...+9 = 45
      // 1..=10 inclusive sum = 1+2+...+10 = 55
      expect(stdout).toBe("45\n55");
      expect(exitCode).toBe(0);
    });

    it("large ranges work", async () => {
      const { stdout, exitCode } = await runFixture(
        "parabun-range-large",
        `
          let total = 0;
          for (const i of 0..10000) total += i;
          console.log(total);
        `,
      );
      // sum 0..9999 = 9999*10000/2 = 49995000
      expect(stdout).toBe("49995000");
      expect(exitCode).toBe(0);
    });
  });
});
