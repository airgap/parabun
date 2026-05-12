// LYK-827: expression-context `_` shorthand for one-arg lambdas.
//
// `arr.filter(_ > 0)` → `arr.filter((__pu) => __pu > 0)`. The wrap runs
// in parseCallArgs after each arg is parsed: any arg expression that
// contains a free `_` (not nested inside an arrow / function literal)
// and isn't itself bare `_` gets wrapped in `(__pu) => <expr>`. Bare
// `_` at top-level arg position stays untouched — that's the pipeline
// placeholder slot handled by `tryPipelinePlaceholder` (e.g.
// `data |> normalize(_, opts)` → `normalize(data, opts)`).
//
// Each test transpiles and inspects the output for the substituted
// param name (`__pu`) plus the rewritten expression shape. Behavioral
// round-trip is covered by the broader pipeline / functional tests.

import { describe, expect, test } from "bun:test";

function ts(code, options = {}) {
  return new Bun.Transpiler({
    loader: "tsx",
    ...options,
  }).transformSync(code);
}

describe("Parabun expression-context `_` shorthand", () => {
  test("binary op on right of `_`", () => {
    const out = ts(`const r = arr.map(_ * 2);`);
    expect(out).toContain("(__pu)");
    expect(out).toContain("__pu * 2");
  });

  test("binary op on left of `_`", () => {
    const out = ts(`const r = arr.map(2 * _);`);
    expect(out).toContain("(__pu)");
    expect(out).toContain("2 * __pu");
  });

  test("comparison op (filter predicate shape)", () => {
    const out = ts(`const r = arr.filter(_ > 0);`);
    expect(out).toContain("(__pu)");
    expect(out).toContain("__pu > 0");
  });

  test("strict equality with null", () => {
    const out = ts(`const r = arr.some(_ === null);`);
    expect(out).toContain("(__pu)");
    expect(out).toContain("__pu === null");
  });

  test("function call wrapping `_`", () => {
    const out = ts(`const r = arr.every(Math.abs(_) > 0);`);
    expect(out).toContain("(__pu)");
    expect(out).toContain("Math.abs(__pu)");
  });

  test("multiple `_` in one arg share the same param", () => {
    const out = ts(`const r = arr.map(_ + _);`);
    expect(out).toContain("(__pu)");
    expect(out).toContain("__pu + __pu");
    // Should NOT generate a second distinct param.
    const match = out.match(/__pu/g) ?? [];
    // Three: the param decl `(__pu)`, plus the two body refs.
    expect(match.length).toBeGreaterThanOrEqual(3);
  });

  test("composes with bare-dot lambda inside the expression", () => {
    const out = ts(`const r = arr.map(_.score * 2);`);
    expect(out).toContain("(__pu)");
    expect(out).toContain("__pu.score * 2");
  });

  test("conditional / ternary expression", () => {
    const out = ts(`const r = arr.map(_ > 0 ? _ : 0);`);
    expect(out).toContain("(__pu)");
    expect(out).toContain("__pu > 0");
    expect(out).toContain("? __pu :");
  });

  test("unary minus on `_`", () => {
    const out = ts(`const r = arr.map(-_);`);
    expect(out).toContain("(__pu)");
    // Negation lowers depending on emitter; the operand should be the
    // synthetic param.
    expect(out).toMatch(/-\s*__pu/);
  });

  test("does NOT wrap when arg is bare `_` (top-level placeholder slot)", () => {
    // Outside a pipeline, bare `_` is just an identifier reference.
    // The wrap rule explicitly skips this case so the existing pipeline
    // placeholder logic (`tryPipelinePlaceholder` in parseSuffix.zig)
    // still has a bare `_` to substitute when this call is the rhs of
    // `|>`. We can confirm "no wrap happened" by checking no `__pu`
    // appears in the output.
    const out = ts(`const r = arr.map(_);`);
    expect(out).not.toContain("__pu");
  });

  test("pipeline placeholder still substitutes (no double-wrap)", () => {
    // `data |> normalize(_, opts)` should fold to `normalize(data, opts)`,
    // not to `normalize((__pu) => data)`.
    const out = ts(`
      const data = [1, 2, 3];
      const opts = { bias: 10 };
      const r = data |> normalize(_, opts);
    `);
    expect(out).toContain("normalize(data, opts)");
    expect(out).not.toContain("__pu");
  });

  test("pipeline with expression-`_` wraps then threads", () => {
    // `data |> filter(_ > 0)` — the inner `_ > 0` wraps to a lambda
    // first. When `filter` is a known stream-fusion combinator, the
    // pipeline fuses the predicate into a single-loop reduce shape
    // and the per-element name is replaced with the fusion driver's
    // own iteration variable. The `__pu` symbol vanishes in that
    // case — what we check for is that the predicate body's literal
    // (`> 0`) made it through to the fused loop, which proves the
    // wrap+substitute pipeline ran (otherwise filter would have
    // received a bare `_` identifier reference, blowing up at runtime).
    const out = ts(`
      import { filter, collect } from "@para/pipeline";
      const data = [1, -2, 3];
      const r = data |> filter(_ > 0) |> collect;
    `);
    // Predicate literal survives into the fused loop body.
    expect(out).toContain("> 0");
    // No stray bare `_` left as an identifier — that would mean the
    // wrap didn't happen.
    expect(out).not.toMatch(/\b_\b(?!\$)/);
  });

  test("does not recurse into nested arrows in the arg", () => {
    // `arr.map(x => arr2.filter(_ > 0))` — outer arrow has its own
    // param (`x`); the inner `_ > 0` wraps independently. The outer
    // arg is a complete arrow expression, so the outer wrap rule
    // does NOT trigger (containsFreeUnderscore stops at e_arrow).
    const out = ts(`const r = arr.map(x => arr2.filter(_ > 0));`);
    // Outer arrow uses `x` as its param — unchanged.
    expect(out).toContain("(x)");
    // Inner _-lambda wraps with __pu.
    expect(out).toContain("(__pu)");
    expect(out).toContain("__pu > 0");
  });

  test("does not wrap an arg that is already an arrow", () => {
    // `arr.map((x) => x * 2)` — no `_` anywhere, no wrap.
    const out = ts(`const r = arr.map((x) => x * 2);`);
    expect(out).not.toContain("__pu");
    expect(out).toContain("x * 2");
  });

  test("multi-arg call: each arg evaluated independently", () => {
    // `f(_ > 0, _ * 2)` — each arg gets its own __pu lambda since
    // each is wrapped independently in parseCallArgs.
    const out = ts(`const r = f(_ > 0, _ * 2);`);
    // Two separate __pu params (one per arg).
    expect(out).toContain("__pu > 0");
    expect(out).toContain("__pu * 2");
  });
});
