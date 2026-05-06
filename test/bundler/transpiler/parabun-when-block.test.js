import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

// Parabun `when EXPR { body }` and `when not EXPR { body }` block
// statements. Slot into the existing `effect { body }` / `arena { body }`
// keyword-block family. Both desugar to a single helper:
//   when EXPR { body }     →  require("@para/signals").when(() => EXPR, () => { body })
//   when not EXPR { body } →  require("@para/signals").when(() => !(EXPR), () => { body })
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
    it("`when EXPR { body }` calls signals.when with predicate + body arrows", () => {
      const out = transform(`signal a = false; when a { console.log("hi"); }`);
      expect(out).toContain(`/signals").when(`);
      expect(out).toContain("a.get()");
      expect(out).toContain('console.log("hi")');
      // No standalone negation in the predicate for the positive form.
      expect(out).not.toMatch(/\(\)\s*=>\s*!a\.get\(\)/);
    });

    it("`when not EXPR { body }` negates the predicate inside the same `when` helper", () => {
      const out = transform(`signal a = true; when not a { console.log("bye"); }`);
      expect(out).toContain(`/signals").when(`);
      // Predicate is negated: `() => !a.get()` (or with surrounding parens).
      expect(out).toMatch(/\(\)\s*=>\s*!\s*a\.get\(\)/);
    });

    it("complex predicate composes multiple signals", () => {
      const out = transform(`
        signal a = false;
        signal b = "x";
        when a && b === "y" { console.log("match"); }
      `);
      expect(out).toContain(`/signals").when(`);
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
      expect(out).toContain(`/signals").when(`);
      expect(out).toContain("n++");
      expect(out).toContain("console.log(n)");
    });

    it("`when` followed by `(` parses as plain identifier (call)", () => {
      const out = transform(`const when = (fn) => fn(); when(() => 1);`);
      // Helper-form would emit `require("@para/signals").when(`; user code
      // calling a local `when` function should NOT match that pattern.
      expect(out).not.toContain(`/signals").when(`);
      expect(out).toContain("when(");
    });

    it("`when` followed by `;` parses as plain identifier", () => {
      const out = transform(`const when = 42; export { when };`);
      expect(out).not.toContain(`/signals").when(`);
      expect(out).toContain("when");
    });

    it("`when` followed by `=` parses as plain identifier", () => {
      const out = transform(`let when; when = 5; console.log(when);`);
      expect(out).not.toContain(`/signals").when(`);
    });

    it("plain `effect { body }` still works alongside `when`", () => {
      const out = transform(`signal a = 0; effect { console.log(a); }`);
      expect(out).toContain(`/signals").effect(`);
      expect(out).not.toContain(`/signals").when(`);
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
      // First run: a=true, but `when` treats initial-truthy as already-observed.
      // Then a→false→true triggers the only rise.
      expect(stdout).toBe("fire");
      expect(exitCode).toBe(0);
    });
  });

  describe("paired form (when … when stop …)", () => {
    describe("desugar", () => {
      it("`when X { } when stop { }` emits two `when` calls — second predicate negated", () => {
        const out = transform(`
          signal a = false;
          when a { console.log("rise"); }
          when stop { console.log("fall"); }
        `);
        // Two helper calls, both on signals.when.
        expect((out.match(/require\("@para\/signals"\)\.when\(/g) ?? []).length).toBe(2);
        // First arm: `() => a.get()`. Second arm: `() => !a.get()`.
        expect(out).toMatch(/\(\)\s*=>\s*a\.get\(\)/);
        expect(out).toMatch(/\(\)\s*=>\s*!\s*a\.get\(\)/);
      });

      it("`when not X { } when stop { }` flips the edge — first negated, second bare", () => {
        const out = transform(`
          signal a = true;
          when not a { console.log("fall"); }
          when stop  { console.log("rise"); }
        `);
        expect((out.match(/require\("@para\/signals"\)\.when\(/g) ?? []).length).toBe(2);
        // First: `() => !a.get()`. Second arm reuses RAW predicate sans
        // negation (avoids double-negation): `() => a.get()`.
        expect(out).toMatch(/\(\)\s*=>\s*!\s*a\.get\(\)/);
        expect(out).toMatch(/\(\)\s*=>\s*a\.get\(\)/);
        // No `!!` from accidentally re-negating an already-negated clone.
        expect(out).not.toMatch(/!\s*!\s*a\.get\(\)/);
      });

      it("`when X { } when not Y { }` is NOT paired — Y is its own predicate", () => {
        const out = transform(`
          signal a = false;
          signal b = true;
          when a { console.log("a-rise"); }
          when not b { console.log("b-fall"); }
        `);
        // Both still emit, but each with its own predicate. The paired-form
        // lookahead requires bare `stop` (no predicate); `not Y` falls
        // through to the standard predicate-negation form.
        expect((out.match(/require\("@para\/signals"\)\.when\(/g) ?? []).length).toBe(2);
        expect(out).toContain("a.get()");
        expect(out).toContain("b.get()");
      });

      it("intervening statement breaks adjacency — bare `when stop { }` parses standalone", () => {
        // After the intervening statement, the second `when stop { }` no
        // longer has a paired predicate to inherit. It parses as a regular
        // `when [predicate=stop] { body }` — i.e. fire on rising edge of
        // the variable named `stop`. Two distinct `when` calls emitted.
        const out = transform(`
          signal a = false;
          signal stop = false;
          when a { console.log("rise"); }
          console.log("between");
          when stop { console.log("stopped"); }
        `);
        expect((out.match(/require\("@para\/signals"\)\.when\(/g) ?? []).length).toBe(2);
        expect(out).toContain("a.get()");
        expect(out).toContain("stop.get()");
      });
    });

    describe("runtime", () => {
      it("paired form fires both edges on transitions", async () => {
        const { stdout, exitCode } = await runFixture(
          "when-paired",
          `
            signal a = false;
            const out = [];
            when a    { out.push("rise"); }
            when stop { out.push("fall"); }
            a = true;
            await Promise.resolve();
            a = false;
            await Promise.resolve();
            a = true;
            await Promise.resolve();
            a = false;
            await Promise.resolve();
            console.log(out.join(","));
          `,
        );
        expect(stdout).toBe("rise,fall,rise,fall");
        expect(exitCode).toBe(0);
      });

      it("negated paired form fires falling first, rising second", async () => {
        const { stdout, exitCode } = await runFixture(
          "when-paired-negated",
          `
            signal a = true;
            const out = [];
            when not a { out.push("fall"); }
            when stop  { out.push("rise"); }
            a = false;
            await Promise.resolve();
            a = true;
            await Promise.resolve();
            console.log(out.join(","));
          `,
        );
        expect(stdout).toBe("fall,rise");
        expect(exitCode).toBe(0);
      });

      it("predicate is shared (writes to either side affect both)", async () => {
        const { stdout, exitCode } = await runFixture(
          "when-paired-shared",
          `
            signal x = 0;
            const out = [];
            when x >= 100 { out.push("over"); }
            when stop     { out.push("under"); }
            x = 50;
            await Promise.resolve();
            x = 100;
            await Promise.resolve();
            x = 150;
            await Promise.resolve();
            x = 50;
            await Promise.resolve();
            console.log(out.join(","));
          `,
        );
        // 0→50: still under, no edge.
        // 50→100: under→over, "over" fires.
        // 100→150: still over, no edge.
        // 150→50: over→under, "under" fires.
        expect(stdout).toBe("over,under");
        expect(exitCode).toBe(0);
      });
    });
  });
});
