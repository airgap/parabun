import { describe, expect, it, test } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

// Parabun `Nd` decimal literals desugar at parse time:
//   0.1d   →  __paraDec("0.1")
//   1d     →  __paraDec("1")
//   1.5d   →  __paraDec("1.5")
//
// Critical invariant: the literal lowers to a CALL with the STRING form of
// the source, not a Number. `0.1d` → `__paraDec("0.1")`, not
// `__paraDec(0.1)` — the whole point is to skip the float roundtrip.

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

describe("Parabun decimal literals", () => {
  describe("parse-time desugar", () => {
    const transpiler = new Bun.Transpiler({ loader: "ts" });

    it('desugars 0.1d to __paraDec("0.1")', () => {
      const out = transpiler.transformSync(`const x = 0.1d;`);
      expect(out).toContain("__paraDec");
      expect(out).toContain(`"0.1"`);
    });

    it("preserves source string exactly — never goes through Number", () => {
      // The headline correctness invariant. If the lowering went through
      // Number(0.1).toString() we'd lose precision on more interesting
      // inputs, but for 0.1 the round-trip happens to be lossless. The
      // observable signal: the emitted string must be the literal source
      // characters, not a re-formatted Number.
      const out = transpiler.transformSync(`const x = 0.1d;`);
      expect(out).toContain(`"0.1"`);
      expect(out).not.toContain("0.1)"); // no bare-number arg
    });

    it('desugars 1d (integer) to __paraDec("1")', () => {
      const out = transpiler.transformSync(`const x = 1d;`);
      expect(out).toContain(`__paraDec`);
      expect(out).toContain(`"1"`);
    });

    it('desugars 1.5d to __paraDec("1.5")', () => {
      const out = transpiler.transformSync(`const x = 1.5d;`);
      expect(out).toContain(`"1.5"`);
    });

    it("desugars 100.25d", () => {
      const out = transpiler.transformSync(`const x = 100.25d;`);
      expect(out).toContain(`"100.25"`);
    });

    it("does not fire on identifier suffix `id`", () => {
      const out = transpiler.transformSync(`let id = 1; id = id + 1;`);
      expect(out).not.toContain("__paraDec");
    });

    it("does not fire on bigint literal 1n", () => {
      const out = transpiler.transformSync(`const x = 1n;`);
      expect(out).not.toContain("__paraDec");
    });

    it("chains via .plus / .times", () => {
      const out = transpiler.transformSync(`const x = 0.1d.plus(0.2d);`);
      expect(out).toContain(`__paraDec`);
      // Both operands must be wrapped — 0.1 and 0.2 each get their own call.
      const matches = out.match(/__paraDec/g);
      expect(matches?.length).toBeGreaterThanOrEqual(2);
    });

    it("imports __paraDec from bun:wrap", () => {
      const out = transpiler.transformSync(`const x = 0.1d;`);
      expect(out).toContain(`__paraDec`);
      expect(out).toContain(`from "bun:wrap"`);
    });
  });

  describe("end-to-end runtime", () => {
    test("0.1d.plus(0.2d).eq(0.3d) is true (the headline)", async () => {
      const { stdout, exitCode } = await runFixture("decimal-headline", `console.log(0.1d.plus(0.2d).eq(0.3d));`);
      expect(stdout).toBe("true");
      expect(exitCode).toBe(0);
    });

    test("0.1d.plus(0.2d).toString() === '0.3'", async () => {
      const { stdout, exitCode } = await runFixture("decimal-tostring", `console.log(0.1d.plus(0.2d).toString());`);
      expect(stdout).toBe("0.3");
      expect(exitCode).toBe(0);
    });

    test("0.1d.times(3d).eq(0.3d) is true", async () => {
      const { stdout, exitCode } = await runFixture("decimal-mul", `console.log(0.1d.times(3d).eq(0.3d));`);
      expect(stdout).toBe("true");
      expect(exitCode).toBe(0);
    });

    test("1d.dividedBy(3d, {precision: 20}) yields 20 threes", async () => {
      const { stdout, exitCode } = await runFixture(
        "decimal-div",
        `console.log(1d.dividedBy(3d, {precision: 20}).toString());`,
      );
      expect(stdout).toBe("0.33333333333333333333");
      expect(exitCode).toBe(0);
    });

    test("100d.dividedBy(8d) === 12.5 exactly", async () => {
      const { stdout, exitCode } = await runFixture("decimal-div-exact", `console.log(100d.dividedBy(8d).toString());`);
      expect(stdout).toBe("12.5");
      expect(exitCode).toBe(0);
    });

    test("scale alignment: 0.001d.plus(1000d) === 1000.001", async () => {
      const { stdout, exitCode } = await runFixture("decimal-scale", `console.log(0.001d.plus(1000d).toString());`);
      expect(stdout).toBe("1000.001");
      expect(exitCode).toBe(0);
    });

    test("comparisons: 0.1d.lt(0.2d) is true, .gt is false", async () => {
      const { stdout, exitCode } = await runFixture(
        "decimal-cmp",
        `console.log(0.1d.lt(0.2d), 0.1d.gt(0.2d), 0.1d.eq(0.1d));`,
      );
      expect(stdout).toBe("true false true");
      expect(exitCode).toBe(0);
    });

    test("toNumber on exact-decimal arithmetic", async () => {
      // Decimal arithmetic gives exact 0.3, then toNumber goes through
      // parseFloat("0.3"), which yields exactly 0.3 as a JS Number.
      const { stdout, exitCode } = await runFixture(
        "decimal-tonumber",
        `console.log(0.1d.plus(0.2d).toNumber() === 0.3);`,
      );
      expect(stdout).toBe("true");
      expect(exitCode).toBe(0);
    });

    test("division by zero throws", async () => {
      const { stdout, stderr, exitCode } = await runFixture(
        "decimal-divzero",
        `try { 1d.dividedBy(0d); console.log("no-throw"); } catch (e) { console.log("threw:", e.message); }`,
      );
      expect(stdout).toContain("threw:");
      expect(stdout).toContain("division by zero");
      expect(exitCode).toBe(0);
    });
  });
});
