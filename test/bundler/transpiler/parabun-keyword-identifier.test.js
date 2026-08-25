import { describe, expect, it } from "bun:test";

// Parabun adds `pure` and `fun` as keywords, and this is the cost of that: any
// dependency that already used those words as ordinary identifiers has to keep
// parsing. Prettier does, in its bundled chunks, and when it stopped parsing it
// took every downstream codegen build with it.
//
// The regression (parabun 1.3.14, LYK-1127): prettier's bundled `index.mjs`
// failed at `match.replace("*", () => subpath)` with "Expected '{' but found
// ';'" — an arrow function with an expression body, passed as a call argument
// after a string literal. Everything that transitively imports prettier died
// with it: mapi-types, db-types, handles, and the four *-handles-ts generators
// all format their output through it.
//
// The `match` in that expression is not a coincidence worth ignoring: parabun
// also has a `match` expression, and the failing line begins with an
// identifier named `match` followed by a `.`, so these tests pin both the
// contextual-keyword cases and the arrow-argument case that actually broke.

function transform(source) {
  return new Bun.Transpiler({ loader: "pts" }).transformSync(source).trim();
}

describe("Parabun: keywords that are also ordinary identifiers", () => {
  it("parses an arrow with an expression body as a later call argument", () => {
    // The exact shape from prettier's index.mjs.
    const out = transform(`const subpath = "s"; const r = match.replace("*", () => subpath);`);

    expect(out).toContain(`.replace("*"`);
    expect(out).toContain("subpath");
  });

  it("parses a variable named `match` followed by a member call", () => {
    // `match` leads a match-expression, so a bare identifier named `match` has
    // to stay an identifier when what follows is a `.` rather than a subject.
    const out = transform(`const match = "a*b"; const r = match.replace("*", () => "-");`);

    expect(out).toContain("match.replace");
  });

  it("parses `pure` and `fun` as class fields", () => {
    // prettier plugins/angular.mjs.
    const out = transform(`class C { pure = 1; fun = 2; get() { return this.pure + this.fun; } }`);

    expect(out).toContain("pure");
    expect(out).toContain("fun");
  });

  it("parses `pure` and `fun` as object properties", () => {
    // prettier plugins/flow.mjs.
    const out = transform(`const o = { fun: 3, pure: 4, nested: { fun: () => 5 } };`);

    expect(out).toContain("fun:");
    expect(out).toContain("pure:");
  });

  it("still treats `pure` and `fun` as keywords where they lead a declaration", () => {
    // Without this the tests above would also pass on a build that had simply
    // stopped treating either word as a keyword, which would be a different
    // regression wearing the same green.
    const declared = transform(`pure fun add(a, b) { return a + b; }`);

    expect(declared).toContain("add");
    expect(declared).not.toContain("pure fun");
  });
});
