import { describe, expect, test } from "bun:test";
import { transpile } from "../src/index";

describe("signal declaration", () => {
  test("simple", () => {
    expect(transpile("signal x = 0;")).toBe(`const x = require("para:signals").signal(0);`);
  });

  test("with type annotation", () => {
    expect(transpile("signal x: number = 0;")).toBe(`const x = require("para:signals").signal(0);`);
  });

  test("with complex initializer (object)", () => {
    expect(transpile("signal user = { name: 'a', age: 0 };")).toBe(
      `const user = require("para:signals").signal({ name: 'a', age: 0 });`,
    );
  });

  test("with array initializer", () => {
    expect(transpile("signal items: Todo[] = [];")).toBe(`const items = require("para:signals").signal([]);`);
  });

  test("multiple on separate lines", () => {
    const out = transpile("signal a = 1;\nsignal b = 2;");
    expect(out).toBe(`const a = require("para:signals").signal(1);\nconst b = require("para:signals").signal(2);`);
  });

  test("does not fire inside string", () => {
    expect(transpile(`const s = "signal x = 0";`)).toBe(`const s = "signal x = 0";`);
  });
});

describe("effect block", () => {
  test("simple body", () => {
    expect(transpile("effect { console.log(x); }")).toBe(`require("para:signals").effect(() => { console.log(x); })`);
  });

  test("multi-statement body", () => {
    const out = transpile("effect { a(); b(); c(); }");
    expect(out).toBe(`require("para:signals").effect(() => { a(); b(); c(); })`);
  });

  test("nested braces in body", () => {
    expect(transpile("effect { if (x) { y(); } }")).toBe(`require("para:signals").effect(() => { if (x) { y(); } })`);
  });

  test("does not fire inside string", () => {
    expect(transpile(`const s = "effect { foo }";`)).toBe(`const s = "effect { foo }";`);
  });
});

describe("arena block", () => {
  test("simple body", () => {
    expect(transpile("arena { work(); }")).toBe(`require("para:arena").scope(() => { work(); })`);
  });
});

describe("when block", () => {
  test("when EXPR { body }", () => {
    expect(transpile("when count > 5 { fire(); }")).toBe(
      `require("para:signals").when(() => count > 5, () => { fire(); })`,
    );
  });

  test("when not EXPR { body } negates the predicate", () => {
    expect(transpile("when not online { showOffline(); }")).toBe(
      `require("para:signals").when(() => !(online), () => { showOffline(); })`,
    );
  });

  test("nested braces in body", () => {
    expect(transpile("when x { if (y) { z(); } }")).toBe(
      `require("para:signals").when(() => x, () => { if (y) { z(); } })`,
    );
  });

  test("complex predicate", () => {
    expect(transpile("when a && b > 5 { go(); }")).toBe(
      `require("para:signals").when(() => a && b > 5, () => { go(); })`,
    );
  });
});

describe("paired when form", () => {
  test("when X { } when not { } emits two calls", () => {
    const out = transpile("when ready { onReady(); } when not { onWait(); }");
    expect(out).toBe(
      `require("para:signals").when(() => ready, () => { onReady(); }); ` +
        `require("para:signals").when(() => !(ready), () => { onWait(); })`,
    );
  });

  test("when not X { } when not { } flips the edge — second uses raw predicate", () => {
    const out = transpile("when not online { drop(); } when not { resume(); }");
    expect(out).toBe(
      `require("para:signals").when(() => !(online), () => { drop(); }); ` +
        `require("para:signals").when(() => online, () => { resume(); })`,
    );
  });

  test("when X { } when not Y { } is NOT paired (Y is its own predicate)", () => {
    const out = transpile("when a { f(); } when not b { g(); }");
    expect(out).toContain(`when(() => a, () => { f(); })`);
    expect(out).toContain(`when(() => !(b), () => { g(); })`);
  });
});
