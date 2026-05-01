import { describe, expect, test } from "bun:test";
import { transpile } from "../src/index";

// These tests exercise the AST pass that rewrites bare signal reads /
// writes inside tracked contexts. Each test feeds .pts source through
// the full transpile() pipeline and asserts the final JS output.
//
// Many assertions check for SUBSTRINGS rather than exact bytes because
// Babel's generator may reformat whitespace / quotes.

describe("bare-read inside effect block", () => {
  test("identifier read becomes .get()", () => {
    const out = transpile(`signal count = 0;\neffect { console.log(count); }`);
    expect(out).toContain("count.get()");
    expect(out).not.toMatch(/console\.log\(count\)/);
  });

  test("bare assignment becomes .set()", () => {
    const out = transpile(`signal count = 0;\neffect { count = 5; }`);
    expect(out).toContain("count.set(5)");
  });

  test("compound assignment (+=) lowers to set + get", () => {
    const out = transpile(`signal n = 0;\neffect { n += 3; }`);
    expect(out).toContain("n.set(n.get() + 3)");
  });

  test("post-increment (++) lowers to set + get + 1", () => {
    const out = transpile(`signal n = 0;\neffect { n++; }`);
    expect(out).toContain("n.set(n.get() + 1)");
  });

  test("post-decrement (--) lowers to set + get - 1", () => {
    const out = transpile(`signal n = 5;\neffect { n--; }`);
    expect(out).toContain("n.set(n.get() - 1)");
  });

  test("multi-signal expression — each gets .get()", () => {
    const out = transpile(`signal a = 1;\nsignal b = 2;\neffect { console.log(a + b); }`);
    expect(out).toContain("a.get()");
    expect(out).toContain("b.get()");
  });
});

describe("bare-read inside when predicate and body", () => {
  test("predicate identifier becomes .get()", () => {
    const out = transpile(`signal ready = false;\nwhen ready { go(); }`);
    expect(out).toContain("ready.get()");
  });

  test("predicate with logical ops — both signals tracked", () => {
    const out = transpile(`signal a = false;\nsignal b = false;\nwhen a && b { both(); }`);
    expect(out).toContain("a.get()");
    expect(out).toContain("b.get()");
  });

  test("body identifier becomes .get()", () => {
    const out = transpile(`signal n = 0;\nsignal go = false;\nwhen go { console.log(n); }`);
    expect(out).toContain("n.get()");
  });
});

describe("auto-promotion: signal initializer that reads other signals", () => {
  test("simple binary op promotes to derived", () => {
    const out = transpile(`signal a = 1;\nsignal b = a + 1;`);
    expect(out).toContain('require("para:signals").derived(() => a.get() + 1)');
    expect(out).not.toContain('require("para:signals").signal(a + 1)');
  });

  test("chained derivations", () => {
    const out = transpile(`signal a = 1;\nsignal b = a * 2;\nsignal c = b + a;`);
    expect(out).toContain("derived(() => a.get() * 2)");
    expect(out).toContain("derived(() => b.get() + a.get())");
  });

  test("standalone signal (no signal reads) stays signal()", () => {
    const out = transpile(`signal x = 0;`);
    expect(out).toContain('require("para:signals").signal(0)');
    expect(out).not.toContain("derived");
  });

  test("self-reference does NOT promote (initializer can't see its own binding)", () => {
    // `signal x = x` is a temporal-dead-zone error in TS, but our scanner
    // shouldn't claim it reads a signal. The result stays `.signal(x)`
    // (which the runtime will throw on, but the transpile shouldn't lie).
    const out = transpile(`signal x = x;`);
    expect(out).toContain(".signal(x)");
    expect(out).not.toContain("derived");
  });
});

describe("bare-read scope rules", () => {
  test("non-signal binding is not rewritten", () => {
    const out = transpile(`const plain = 5;\nsignal s = 0;\neffect { console.log(plain, s); }`);
    expect(out).toContain("s.get()");
    // `plain` is just a const, not a signal — no .get() call should be inserted.
    expect(out).not.toMatch(/plain\.get\(\)/);
  });

  test("shadowing — inner non-signal hides outer signal", () => {
    const out = transpile(`signal x = 0;\nfunction f() { const x = 5; return x; }\neffect { console.log(x); }`);
    // Outer x in effect → `.get()`. Inner x in f → bare reference.
    expect(out).toContain("x.get()");
    // Babel may rename the inner one; just ensure we didn't blanket-rewrite.
    expect(out).toMatch(/return x[;)]?/);
  });

  test("identifier outside any tracked context is NOT rewritten", () => {
    const out = transpile(`signal x = 0;\nconsole.log(x);`);
    // Outside an effect/when/derived — bare read stays bare.
    expect(out).toContain("console.log(x)");
    expect(out).not.toContain("x.get()");
  });
});

describe("bare-read inside ~> binding", () => {
  test("~> LHS reads get tracked", () => {
    const out = transpile(`signal name = "world";\nname ~> document.title;`);
    // The ~> rewrite produces `effect(() => { document.title = name; })`.
    // Then bare-read should turn `name` into `name.get()`.
    expect(out).toContain("name.get()");
  });
});
