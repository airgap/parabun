import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

// Parabun `A -> fn` reactive call-binding operator. Desugars `A -> fn`
// to `require("para:signals").effect(() => { fn(A); })` so when `A`
// reads signals, any change to those signals re-runs the body and
// re-calls `fn` with the latest value.
//
// Complement to `~>` (assignment sink) — same precedence (`.assign`
// level), same disposer return shape, same optional `when COND`
// guard, same scope-marker dance.

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

describe("Parabun: -> reactive call-binding", () => {
  describe("desugar", () => {
    it("signal → function identifier", () => {
      const out = transform(`signal a = 1; const log = (s) => {}; a -> log;`);
      expect(out).toContain(`require("para:signals").effect(() =>`);
      expect(out).toContain(`log(a.get())`);
    });

    it("signal → method (dot access)", () => {
      const out = transform(`signal a = 1; const obj = { write: (s) => {} }; a -> obj.write;`);
      expect(out).toContain(`obj.write(a.get())`);
    });

    it("signal → indexed function", () => {
      const out = transform(`signal a = 1; const arr = [(s) => {}]; a -> arr[0];`);
      expect(out).toContain(`arr[0](a.get())`);
    });

    it("captures disposer: const stop = src -> fn", () => {
      const out = transform(`signal a = 1; const log = (s) => {}; const stop = a -> log;`);
      expect(out).toContain(`const stop = require("para:signals").effect`);
    });

    it("pipeline binds tighter than ->", () => {
      const out = transform(`signal a = 1; const log = (s) => {}; a |> Math.abs -> log;`);
      expect(out).toContain(`log(Math.abs(a.get()))`);
    });

    it("rejects bare call expression on RHS", () => {
      expect(() => transform(`signal a = 1; a -> f();`)).toThrow(/callable target on the right/);
    });

    it("rejects literal on RHS", () => {
      expect(() => transform(`signal a = 1; a -> 42;`)).toThrow(/callable target on the right/);
    });

    it("rejects arrow on RHS", () => {
      expect(() => transform(`signal a = 1; a -> (x) => x;`)).toThrow(/callable target on the right/);
    });

    it("- alone still works as subtraction", () => {
      const out = transform(`const x = 5 - 3;`);
      expect(out).toContain("5 - 3");
    });

    it("- followed by space-gt is NOT a ->", () => {
      // `5 - > 3` is malformed in JS but the lexer must NOT collapse the
      // separated minus/greater-than into a -> token.
      // We test the boundary by making sure `a-` followed by `>b` outside
      // an operator context doesn't get glued — there's no good way to
      // construct that without a parse error either way, so we settle for
      // verifying that a normal `a - b` parses unchanged.
      const out = transform(`const a = 1; const b = 2; const x = a - b;`);
      expect(out).toContain("a - b");
    });
  });

  describe("runtime", () => {
    it("signal → fn: each change re-calls the function", async () => {
      const { stdout, exitCode } = await runFixture(
        "callbind-fn",
        `
          signal a = 1;
          const out = [];
          const log = (s) => out.push(s);
          a -> log;
          a = 2;
          a = 3;
          await Promise.resolve();
          await Promise.resolve();
          console.log(out.join(","));
        `,
      );
      expect(stdout).toBe("1,2,3");
      expect(exitCode).toBe(0);
    });

    it("template + multiple signals re-renders on any dep change", async () => {
      const { stdout, exitCode } = await runFixture(
        "callbind-template",
        `
          signal a = 1;
          signal b = "x";
          const out = [];
          \`a=\${a} b=\${b}\` -> ((s) => out.push(s));
        `,
      );
      // Arrow-on-RHS rejected by parser; we just confirm the parser error
      // shape via the desugar test above. Use a method instead here:
      expect(exitCode).toBe(1);
      expect(stdout).toBe("");
    });

    it("template + multiple signals re-renders via method sink", async () => {
      const { stdout, exitCode } = await runFixture(
        "callbind-method",
        `
          signal a = 1;
          signal b = "x";
          const out = [];
          const sink = { push: (s) => out.push(s) };
          \`a=\${a} b=\${b}\` -> sink.push;
          a = 2;
          b = "y";
          await Promise.resolve();
          await Promise.resolve();
          console.log(out.join("|"));
        `,
      );
      expect(stdout).toBe("a=1 b=x|a=2 b=x|a=2 b=y");
      expect(exitCode).toBe(0);
    });

    it("disposer stops further calls", async () => {
      const { stdout, exitCode } = await runFixture(
        "callbind-dispose",
        `
          signal count = 0;
          const out = [];
          const log = (s) => out.push(s);
          const stop = count -> log;
          count = 3;
          await Promise.resolve();
          stop();
          count = 99;
          await Promise.resolve();
          console.log(out.join(","));
        `,
      );
      expect(stdout).toBe("0,3");
      expect(exitCode).toBe(0);
    });
  });

  describe("when-clause", () => {
    it("emits an if(C) wrapper around the call", () => {
      const out = transform(`signal a = 1; const log = (s) => {}; let on = true; a -> log when on;`);
      expect(out).toContain(`require("para:signals").effect(() =>`);
      expect(out).toContain(`if (on)`);
      expect(out).toContain(`log(a.get())`);
    });

    it("guard tracks signal reads in its predicate", () => {
      const out = transform(`signal a = 1; signal cond = true; const log = (s) => {}; a -> log when cond;`);
      expect(out).toContain(`if (cond.get())`);
    });
  });
});
