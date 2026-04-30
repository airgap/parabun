import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

// Parabun `when EXPR { body }` and `when not EXPR { body }` block
// statements. Slot into the existing `effect { body }` / `arena { body }`
// keyword-block family. Desugar to:
//   require("para:signals").onRising(() => EXPR, () => { body })
//   require("para:signals").onFalling(() => EXPR, () => { body })
//
// Block-form `when` is distinct from the suffix-form `when` clause used
// by `~>` / `->` — position disambiguates. Suffix is an every-truthy
// guard; block is an edge-triggered handler.

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

describe("Parabun: when block (rising / falling)", () => {
  describe("desugar", () => {
    it("`when EXPR { body }` calls onRising with two arrows", () => {
      const out = transform(`signal a = false; when a { console.log("hi"); }`);
      expect(out).toContain(`require("para:signals").onRising(`);
      expect(out).toContain("a.get()");
      expect(out).toContain('console.log("hi")');
    });

    it("`when not EXPR { body }` calls onFalling", () => {
      const out = transform(`signal a = true; when not a { console.log("bye"); }`);
      expect(out).toContain(`require("para:signals").onFalling(`);
    });

    it("complex predicate composes multiple signals", () => {
      const out = transform(`
        signal a = false;
        signal b = "x";
        when a && b === "y" { console.log("match"); }
      `);
      expect(out).toContain("onRising");
      expect(out).toContain("a.get()");
      expect(out).toContain("b.get()");
    });

    it("body may contain multiple statements", () => {
      const out = transform(`
        signal a = false;
        let n = 0;
        when a {
          n++;
          console.log(n);
        }
      `);
      expect(out).toContain("onRising");
      expect(out).toContain("n++");
      expect(out).toContain("console.log(n)");
    });

    it("`when` followed by `(` parses as plain identifier (call)", () => {
      const out = transform(`const when = (fn) => fn(); when(() => 1);`);
      expect(out).not.toContain("onRising");
      expect(out).not.toContain("onFalling");
      expect(out).toContain("when(");
    });

    it("`when` followed by `;` parses as plain identifier", () => {
      const out = transform(`const when = 42; export { when };`);
      expect(out).not.toContain("onRising");
      expect(out).toContain("when");
    });

    it("`when` followed by `=` parses as plain identifier", () => {
      const out = transform(`let when; when = 5; console.log(when);`);
      expect(out).not.toContain("onRising");
    });

    it("plain `effect { body }` still works alongside `when`", () => {
      const out = transform(`signal a = 0; effect { console.log(a); }`);
      expect(out).toContain(`require("para:signals").effect(`);
      expect(out).not.toContain("onRising");
    });
  });

  describe("runtime", () => {
    it("rising fires on each false→true transition", async () => {
      const { stdout, exitCode } = await runFixture(
        "when-rising",
        `
          signal a = false;
          const out = [];
          when a { out.push("rise"); }
          a = true;
          await Promise.resolve();
          a = false;
          await Promise.resolve();
          a = true;
          await Promise.resolve();
          console.log(out.join(","));
        `,
      );
      expect(stdout).toBe("rise,rise");
      expect(exitCode).toBe(0);
    });

    it("`when not` fires on each true→false transition", async () => {
      const { stdout, exitCode } = await runFixture(
        "when-falling",
        `
          signal a = true;
          const out = [];
          when not a { out.push("fall"); }
          a = false;
          await Promise.resolve();
          a = true;
          await Promise.resolve();
          a = false;
          await Promise.resolve();
          console.log(out.join(","));
        `,
      );
      expect(stdout).toBe("fall,fall");
      expect(exitCode).toBe(0);
    });

    it("predicate tracks all signals it reads", async () => {
      const { stdout, exitCode } = await runFixture(
        "when-pred",
        `
          signal a = false;
          signal b = false;
          const out = [];
          when a && b { out.push("both"); }
          a = true;            // a∧b still false
          await Promise.resolve();
          b = true;            // a∧b → true (rising)
          await Promise.resolve();
          a = false;           // a∧b → false (falling)
          await Promise.resolve();
          a = true;            // a∧b → true (rising)
          await Promise.resolve();
          console.log(out.join(","));
        `,
      );
      expect(stdout).toBe("both,both");
      expect(exitCode).toBe(0);
    });

    it("body sees signal reads via the bare-read sugar", async () => {
      const { stdout, exitCode } = await runFixture(
        "when-body",
        `
          signal n = 0;
          signal go = false;
          const out = [];
          when go { out.push(\`n=\${n}\`); }
          n = 5;
          await Promise.resolve();
          go = true;
          await Promise.resolve();
          console.log(out.join("|"));
        `,
      );
      expect(stdout).toBe("n=5");
      expect(exitCode).toBe(0);
    });

    it("initial truthy does NOT fire on first run", async () => {
      const { stdout, exitCode } = await runFixture(
        "when-initial-truthy",
        `
          signal a = true;
          const out = [];
          when a { out.push("fire"); }
          await Promise.resolve();
          await Promise.resolve();
          a = false;
          await Promise.resolve();
          a = true;
          await Promise.resolve();
          console.log(out.join(","));
        `,
      );
      // First run: a=true, but onRising treats initial-truthy as already-observed.
      // Then a→false→true triggers the only rise.
      expect(stdout).toBe("fire");
      expect(exitCode).toBe(0);
    });
  });
});
