import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

// Parabun `derived NAME = EXPR` declaration. Mirrors `signal NAME = EXPR`
// but always lowers to `require("para:signals").derived(() => EXPR)`,
// regardless of whether EXPR reads other signals and regardless of the
// `@parabun-strict-signals` file pragma. The declared name is signal-bound
// so reads of NAME elsewhere desugar to `NAME.get()`.

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

describe("Parabun: derived NAME = EXPR — desugar", () => {
  it("plain literal RHS still desugars to derived(() => …)", () => {
    const out = transform(`derived x = 42;`);
    expect(out).toContain(`require("para:signals").derived(`);
    expect(out).toMatch(/derived\(\(\)\s*=>\s*42\)/);
  });

  it("single signal read becomes .get() inside the arrow body", () => {
    const out = transform(`signal a = 1;\nderived b = a + 1;`);
    expect(out).toContain(`require("para:signals").derived(`);
    expect(out).toContain("a.get()");
    expect(out).toMatch(/derived\(\(\)\s*=>\s*a\.get\(\)\s*\+\s*1\)/);
  });

  it("multi-signal read — each gets .get() inside the arrow body", () => {
    const out = transform(`signal a = 1;\nsignal b = 2;\nderived c = a + b;`);
    expect(out).toContain(`require("para:signals").derived(`);
    expect(out).toContain("a.get()");
    expect(out).toContain("b.get()");
  });

  it("derived chain — one derived reading another gets tracked", () => {
    const out = transform(`signal a = 1;\nderived b = a * 2;\nderived c = b + 1;`);
    expect(out).toContain("a.get()");
    expect(out).toContain("b.get()");
  });

  it("references to a derived NAME elsewhere become NAME.get()", () => {
    const out = transform(`signal a = 1;\nderived b = a * 2;\nconsole.log(b);`);
    expect(out).toContain("b.get()");
  });

  it("TypeScript annotation is stripped from the desugared output", () => {
    const out = transform(`signal a = 1;\nderived b: number = a + 1;`);
    expect(out).toContain(`require("para:signals").derived(`);
    expect(out).not.toContain(": number");
  });

  it("`derived` as a plain identifier (import / call) is not the keyword form", () => {
    const out = transform(
      `import { signal, derived } from "para:signals";\nconst a = signal(1);\nconst b = derived(() => a.get() * 2);`,
    );
    expect(out).toContain(`derived(() => a.get() * 2)`);
    // The const decl should remain a normal call, not be rewritten as a
    // `derived NAME = EXPR` (it isn't keyword-form anyway since `const`
    // precedes it).
    expect(out).toContain("const b = ");
  });

  it("`derived` as a variable name still parses as identifier", () => {
    const out = transform(`const derived = 7; console.log(derived + 1);`);
    expect(out).toContain("const derived = 7");
  });
});

describe("Parabun: derived NAME = EXPR — runtime behavior", () => {
  it("derived recomputes when its dep changes", async () => {
    const { stdout, exitCode } = await runFixture(
      "derived-basic-runtime",
      `
        signal a = 2;
        signal b = 3;
        derived sum = a + b;
        console.log(sum);   // 5
        a = 10;
        console.log(sum);   // 13
      `,
    );
    expect(stdout).toBe("5\n13");
    expect(exitCode).toBe(0);
  });

  it("derived rejects assignment (read-only)", async () => {
    const { stdout, exitCode } = await runFixture(
      "derived-readonly",
      `
        signal base = 1;
        derived doubled = base * 2;
        try { doubled = 99; } catch (e) { console.log("err:" + (e instanceof TypeError)); }
      `,
    );
    expect(stdout).toBe("err:true");
    expect(exitCode).toBe(0);
  });

  it("derived chain transitions through deps", async () => {
    const { stdout, exitCode } = await runFixture(
      "derived-chain",
      `
        signal a = 1;
        derived b = a + 1;
        derived c = b + 1;
        console.log(c);   // 3
        a = 10;
        console.log(c);   // 12
      `,
    );
    expect(stdout).toBe("3\n12");
    expect(exitCode).toBe(0);
  });

  it("derived inside effect tracks transitively", async () => {
    const { stdout, exitCode } = await runFixture(
      "derived-effect-track",
      `
        signal a = 1;
        derived doubled = a * 2;
        const log = [];
        effect { log.push(doubled); }
        a = 5;
        a = 7;
        console.log(log.join(","));
      `,
    );
    expect(stdout).toBe("2,10,14");
    expect(exitCode).toBe(0);
  });

  it("derived with literal RHS still ships (never re-fires)", async () => {
    // Mirrors how `signal NAME = LITERAL` doesn't error even though the
    // signal could have been a plain const. The user gets a derived that
    // computes once and stays at that value forever.
    const { stdout, exitCode } = await runFixture(
      "derived-literal",
      `
        derived x = 42;
        console.log(x);
      `,
    );
    expect(stdout).toBe("42");
    expect(exitCode).toBe(0);
  });

  it("derived with TypeScript annotation runs end-to-end (.pts loader)", async () => {
    using dir = tempDir("derived-ts", {
      "index.pts": `
        signal a = 1;
        derived b: number = a + 1;
        console.log(b);
        a = 10;
        console.log(b);
      `.trimStart(),
    });
    await using proc = Bun.spawn({
      cmd: [bunExe(), "index.pts"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(stdout.trim()).toBe("2\n11");
    expect(exitCode).toBe(0);
  });

  it("@parabun-strict-signals pragma does NOT disable explicit derived", async () => {
    // `signal NAME = EXPR` honors the pragma (snapshot, not auto-derive).
    // `derived NAME = EXPR` is explicit — the pragma must NOT downgrade
    // it. Verified by writing to it and expecting a throw (since derived
    // is read-only).
    const { stdout, exitCode } = await runFixture(
      "derived-strict-pragma",
      `
        // @parabun-strict-signals
        signal a = 2;
        signal b = 3;
        derived sum = a + b;
        console.log(sum);   // 5
        try { sum = 99; } catch (e) { console.log("err"); }
      `,
    );
    expect(stdout).toBe("5\nerr");
    expect(exitCode).toBe(0);
  });

  it("derived does NOT re-fire on dep when no signal reads (literal RHS)", async () => {
    const { stdout, exitCode } = await runFixture(
      "derived-no-deps",
      `
        signal x = 1;
        derived constant = 100;
        let runs = 0;
        effect { constant; runs++; }
        x = 2;  // unrelated change — should not re-fire
        x = 3;
        console.log("runs=" + runs);
      `,
    );
    // Effect runs once on initial subscription; constant has no deps, so
    // it never invalidates.
    expect(stdout).toBe("runs=1");
    expect(exitCode).toBe(0);
  });
});

// Regression — fixed bug where the wrapper-arrow's parse-pass scopes were
// pushed at `p.lexer.loc()` (start of RHS), colliding with the inner arrow's
// own args scope and tripping the strictly-monotonic scopes_in_order check
// with a "Scope location N must be greater than M" panic. The wrapper now
// anchors at `equals_loc - 1` / `equals_loc` so it always sits strictly
// between the previous decl's scopes and any inner scope the RHS pushes.
describe("Parabun: arrow-as-RHS regression (was crashing the parser)", () => {
  it("`signal NAME = () => …` parses and round-trips the function as the cell value", async () => {
    const { stdout, exitCode } = await runFixture(
      "signal-arrow-rhs",
      `
        signal x = () => 5;
        console.log(typeof x.get(), x.get()());
      `,
    );
    expect(stdout).toBe("function 5");
    expect(exitCode).toBe(0);
  });

  it("`derived NAME = () => …` parses and stores the function as the derived value", async () => {
    const { stdout, exitCode } = await runFixture(
      "derived-arrow-rhs",
      `
        derived y = () => 7;
        console.log(typeof y.get(), y.get()());
      `,
    );
    expect(stdout).toBe("function 7");
    expect(exitCode).toBe(0);
  });

  it("`signal NAME = function() {…}` (function expression RHS) parses too", async () => {
    const { stdout, exitCode } = await runFixture(
      "signal-fn-expr-rhs",
      `
        signal x = function () { return 99; };
        console.log(x.get()());
      `,
    );
    expect(stdout).toBe("99");
    expect(exitCode).toBe(0);
  });

  it("multi-decl with arrow RHS in every slot — exercises per-decl scope-loc bumping", async () => {
    const { stdout, exitCode } = await runFixture(
      "multi-decl-arrows",
      `
        signal  a = () => 1, b = () => 2;
        derived c = () => 3, d = () => 4;
        console.log(a.get()(), b.get()(), c.get()(), d.get()());
      `,
    );
    expect(stdout).toBe("1 2 3 4");
    expect(exitCode).toBe(0);
  });

  it("arrow RHS with parameters (`(n, m) => n + m`) survives the wrapper too", async () => {
    const { stdout, exitCode } = await runFixture(
      "derived-arrow-params-rhs",
      `
        derived add = (n, m) => n + m;
        console.log(add.get()(3, 4));
      `,
    );
    expect(stdout).toBe("7");
    expect(exitCode).toBe(0);
  });

  it("nested arrow inside a normal-looking RHS still works", async () => {
    const { stdout, exitCode } = await runFixture(
      "signal-iife-rhs",
      `
        signal x = (() => 42)();
        console.log(x);
      `,
    );
    expect(stdout).toBe("42");
    expect(exitCode).toBe(0);
  });
});
