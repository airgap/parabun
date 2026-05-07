import { describe, expect, test } from "bun:test";
import { bunEnv, bunExe } from "harness";

function ts(code, options = {}) {
  return new Bun.Transpiler({
    loader: "tsx",
    ...options,
  }).transformSync(code);
}

describe("pipeline inline fusion", () => {
  test("pure function with single param is inlined at |> site", () => {
    const out = ts(`
      pure function double(x: number) { return x * 2 }
      const result = 21 |> double
    `);
    expect(out).not.toContain("double(21)");
    expect(out).toContain("21 * 2");
  });

  test("chained pipelines inline both functions", () => {
    const out = ts(`
      pure function double(x: number) { return x * 2 }
      pure function inc(x: number) { return x + 1 }
      const result = 10 |> double |> inc
    `);
    expect(out).toContain("10 * 2 + 1");
  });

  test("inline pure function expression in pipeline (multiply)", () => {
    const out = ts(`
      const result = 5 |> pure function(x: number) { return x * 3 }
    `);
    expect(out).toContain("5 * 3");
  });

  test("inline pure function expression in pipeline", () => {
    const out = ts(`
      const result = 7 |> pure function(x: number) { return x + 10 }
    `);
    expect(out).toContain("7 + 10");
  });

  test("non-pure function is NOT inlined", () => {
    const out = ts(`
      function double(x: number) { return x * 2 }
      const result = 21 |> double
    `);
    expect(out).toContain("double(21)");
  });

  test("const-bound pure arrow is inlined at |> site", () => {
    const out = ts(`
      const double = pure (x: number) => x * 2
      const result = 21 |> double
    `);
    expect(out).not.toContain("double(21)");
    expect(out).toContain("21 * 2");
  });

  test("const-bound pure arrow with concise single param is inlined", () => {
    const out = ts(`
      const inc = pure x => x + 1
      const result = 10 |> inc
    `);
    expect(out).toContain("10 + 1");
  });

  test("const-bound pure arrow chains fuse end-to-end", () => {
    const out = ts(`
      const norm = pure (x: number) => x / 100
      const cap  = pure (x: number) => Math.min(x, 1)
      const out = raw |> norm |> cap
    `);
    expect(out).toContain("Math.min(raw / 100, 1)");
  });

  test("let-bound pure arrow is NOT inlined (rebindable)", () => {
    const out = ts(`
      let double = pure (x: number) => x * 2
      const result = 21 |> double
    `);
    expect(out).toContain("double(21)");
  });

  test("var-bound pure arrow is NOT inlined (rebindable)", () => {
    const out = ts(`
      var double = pure (x: number) => x * 2
      const result = 21 |> double
    `);
    expect(out).toContain("double(21)");
  });

  test("const-bound pure arrow with multi-statement body is NOT inlined", () => {
    const out = ts(`
      const complex = pure (x: number) => { const y = x * 2; return y + 1 }
      const result = 10 |> complex
    `);
    expect(out).toContain("complex(10)");
  });

  test("non-pure const-bound arrow is NOT inlined", () => {
    const out = ts(`
      const double = (x: number) => x * 2
      const result = 21 |> double
    `);
    expect(out).toContain("double(21)");
  });

  // Pure-fusion DCE: const-bound pure arrows whose only references were
  // absorbed by |> fusion (so use_count_estimate == 0 after visit) drop
  // out of the output entirely. Exports and non-fused references keep
  // the declaration alive.
  describe("pure-fusion DCE", () => {
    test("fully-fused const pure arrow is DCE'd", () => {
      const out = ts(`
        const norm = pure (x: number) => x / 100
        const cap  = pure (x: number) => Math.min(x, 1)
        console.log(raw |> norm |> cap)
      `);
      expect(out).not.toContain("const norm");
      expect(out).not.toContain("const cap");
      expect(out).toContain("Math.min(raw / 100, 1)");
    });

    test("partially-fused pure arrow is kept", () => {
      // `b` is referenced both as a value (b(5)) and via fusion.
      // The fusion still happens; the binding stays alive for the
      // direct call.
      const out = ts(`
        const b = pure (x: number) => x * 2
        console.log(b(5))
        console.log(10 |> b)
      `);
      expect(out).toContain("const b");
      expect(out).toContain("b(5)");
      expect(out).toContain("10 * 2");
    });

    test("exported pure arrow is kept", () => {
      const out = ts(`
        export const c = pure (x: number) => x + 3
        console.log(10 |> c)
      `);
      expect(out).toContain("export const c");
      expect(out).toContain("10 + 3");
    });

    test("late-exported pure arrow is kept", () => {
      const out = ts(`
        const d = pure (x: number) => x + 4
        console.log(10 |> d)
        export { d }
      `);
      expect(out).toContain("const d");
      expect(out).toContain("export { d }");
      expect(out).toContain("10 + 4");
    });

    test("let-bound pure arrow is kept (no fusion, no DCE)", () => {
      const out = ts(`
        let l = pure (x: number) => x + 5
        console.log(10 |> l)
      `);
      expect(out).toContain("let l");
      expect(out).toContain("l(10)");
    });

    test("non-pure arrow with no refs is kept (DCE only targets pure)", () => {
      // A regular const arrow is NOT a pure-fusion candidate, so even if
      // never referenced, the DCE pass leaves it alone — matches Bun's
      // baseline transpile behavior.
      const out = ts(`
        const unused = (x: number) => x + 9
        export const used = 1
      `);
      expect(out).toContain("const unused");
    });
  });

  // Stream fusion: chain of |> map/filter combinators ending in a known
  // terminal (sum, count, reduce, forEach, collect/toArray) collapses to
  // an IIFE-wrapped for-loop over the source so the intermediate per-step
  // arrays / call frames disappear into a single pass. Inline arrow
  // combinator args fuse too — scope-tree surgery in buildFusedReduce
  // re-threads scopes_in_order and parent links so the visit pass sees
  // depth-first AST order.
  describe("stream fusion", () => {
    test("map + sum collapses to a for-loop IIFE", () => {
      const out = ts(`
        function square(x: number) { return x * x }
        const r = nums |> map(square) |> sum
      `);
      expect(out).toContain("for (");
      expect(out).toContain("})(nums)");
      expect(out).toContain("square(");
      expect(out).not.toContain("sum(");
    });

    test("map + filter + sum collapses with continue", () => {
      const out = ts(`
        function square(x: number) { return x * x }
        function positive(x: number) { return x > 0 }
        const r = nums |> map(square) |> filter(positive) |> sum
      `);
      expect(out).toContain("for (");
      expect(out).toContain("})(nums)");
      expect(out).toContain("square(");
      expect(out).toContain("if (!positive(");
      expect(out).toContain("continue");
    });

    test("filter only + sum", () => {
      const out = ts(`
        function pos(x: number) { return x > 0 }
        const r = nums |> filter(pos) |> sum
      `);
      expect(out).toContain("for (");
      expect(out).toContain("if (!pos(");
      expect(out).toContain("continue");
    });

    test("count terminal increments by 1", () => {
      const out = ts(`
        function active(x: any) { return x.active }
        const r = items |> filter(active) |> count
      `);
      expect(out).toContain("for (");
      expect(out).toContain("+ 1");
    });

    test("reduce(init, fold) calls fold per element", () => {
      const out = ts(`
        function double(x: number) { return x * 2 }
        function add(a: number, b: number) { return a + b }
        const r = nums |> map(double) |> reduce(0, add)
      `);
      expect(out).toContain("for (");
      expect(out).toContain("double(");
      expect(out).toContain("add(");
    });

    test("forEach terminal — side effect per element, returns acc", () => {
      const out = ts(`
        function prep(x: any) { return x }
        function emit(x: any) { console.log(x) }
        items |> map(prep) |> forEach(emit)
      `);
      expect(out).toContain("for (");
      expect(out).toContain("emit(");
      expect(out).toContain("undefined");
    });

    test("collect terminal pushes into array", () => {
      const out = ts(`
        function valid(x: any) { return x.ok }
        const out2 = items |> filter(valid) |> collect
      `);
      expect(out).toContain("for (");
      expect(out).toContain(".push(");
      expect(out).toContain("[]");
    });

    test("toArray is an alias for collect", () => {
      const out = ts(`
        function valid(x: any) { return x.ok }
        const out2 = items |> filter(valid) |> toArray
      `);
      expect(out).toContain("for (");
      expect(out).toContain(".push(");
    });

    test("complex source — method-chain expression — works", () => {
      const out = ts(`
        function double(x: number) { return x * 2 }
        const r = data.points |> map(double) |> sum
      `);
      expect(out).toContain("for (");
      expect(out).toContain("})(data.points)");
    });

    test("chain continues after fusion — fused result feeds next |>", () => {
      const out = ts(`
        function double(x: number) { return x * 2 }
        function log(v: number) { return v }
        const r = nums |> map(double) |> sum |> log
      `);
      expect(out).toContain("log(");
      expect(out).toContain("for (");
    });

    test("inline arrow map body inlines (no IIFE call frame)", () => {
      const out = ts(`
        const r = nums |> map(x => x * 2) |> sum
      `);
      // The arrow body substitutes inline — no call wrapper survives.
      expect(out).toContain("for (");
      expect(out).not.toContain("(x) => x * 2");
    });

    test("two inline arrow combinator args inline together", () => {
      const out = ts(`
        const r = nums |> map(x => x * 2) |> filter(x => x > 0) |> sum
      `);
      expect(out).toContain("for (");
      expect(out).not.toContain("(x) => x * 2");
      expect(out).not.toContain("(x) => x > 0");
    });

    test("mixed inline arrow + named fn — arrow inlines, named fn calls", () => {
      const out = ts(`
        function pos(x: number) { return x > 0 }
        const r = nums |> map(x => x * 2) |> filter(pos) |> sum
      `);
      expect(out).toContain("for (");
      expect(out).not.toContain("(x) => x * 2");
      // Non-pure named fn: still a call.
      expect(out).toContain("if (!pos(");
    });

    test("pure inline arrow combinator inlines", () => {
      const out = ts(`
        const r = nums |> map(pure (x) => x * 2) |> sum
      `);
      expect(out).toContain("for (");
      expect(out).not.toContain("(x) => x * 2");
    });

    test("pure named function inlines into the loop body", () => {
      const out = ts(`
        pure function double(x: number) { return x * 2 }
        const r = nums |> map(double) |> sum
      `);
      // double's body is registered in pure_inline_fns and substitutes
      // into the synth body — no per-element call to double().
      expect(out).toContain("for (");
      // Body of `function double(x)` declaration is `x * 2`; the inlined
      // form is `__pvN$ * 2`. Neither path calls `double(...)` at runtime.
      expect(out).toContain("* 2");
      expect(out).not.toMatch(/double\(__pv/);
    });

    test("stmt-level chain unwraps the IIFE wrapper", () => {
      const out = ts(`
        function emit(x: any) { console.log(x) }
        items |> map(x => x * 2) |> forEach(emit)
      `);
      // Chain at stmt-level: visit's s_expr handler splices the synth
      // arrow's body stmts directly into the parent stmt list. No IIFE
      // wrapper survives — just the for-loop.
      expect(out).toContain("for (");
      expect(out).toContain("emit(");
      // No `((src) => {...})(items)` wrapper.
      expect(out).not.toMatch(/\(\(.*\)\s*=>\s*\{[\s\S]*\}\)\(items\)/);
    });

    test("const-decl chain keeps the IIFE (expression position)", () => {
      const out = ts(`
        const total = nums |> map(x => x * 2) |> sum
      `);
      // RHS of const needs an expression — the IIFE wraps the for-loop
      // so it sits in expression position.
      expect(out).toContain("for (");
      expect(out).toContain("})(nums)");
    });

    // Early-exit batch: take / find / findIndex / some / every / min / max.
    test("take(n) emits a counter + break", () => {
      const out = ts(`
        const r = nums |> take(3) |> sum
      `);
      expect(out).toContain("for (");
      expect(out).toContain(">= 3)");
      expect(out).toContain("break");
    });

    test("filter + take counts only filter-passing elements", () => {
      const out = ts(`
        function pos(x: number) { return x > 0 }
        const r = nums |> filter(pos) |> take(5) |> sum
      `);
      expect(out).toContain("if (!pos(");
      expect(out).toContain("continue");
      expect(out).toContain(">= 5)");
      expect(out).toContain("break");
    });

    test("find(pred) — early-exit terminal, init undefined", () => {
      const out = ts(`
        const r = nums |> find(x => x > 100)
      `);
      expect(out).toContain("for (");
      expect(out).toContain("undefined");
      expect(out).toContain("break");
      // Predicate inlined: `__pvN > 100`.
      expect(out).toMatch(/__pv[\w$]+ > 100/);
    });

    test("findIndex(pred) — early-exit, init -1, returns index", () => {
      const out = ts(`
        const r = nums |> findIndex(x => x === 42)
      `);
      expect(out).toContain("for (");
      expect(out).toContain("-1");
      expect(out).toContain("break");
      // The accumulator gets the index (__pi), not the value.
      expect(out).toMatch(/__pa[\w$]+ = __pi[\w$]+/);
    });

    test("some(pred) — true on first match", () => {
      const out = ts(`
        const r = nums |> some(x => x < 0)
      `);
      expect(out).toContain("for (");
      expect(out).toContain("= false");
      expect(out).toContain("= true");
      expect(out).toContain("break");
    });

    test("every(pred) — false on first non-match", () => {
      const out = ts(`
        const r = nums |> every(x => x >= 0)
      `);
      expect(out).toContain("for (");
      expect(out).toContain("= true");
      expect(out).toContain("= false");
      expect(out).toContain("break");
      // Predicate negated.
      expect(out).toMatch(/!\(__pv[\w$]+ >= 0\)/);
    });

    test("min — init Infinity, tracks smallest", () => {
      const out = ts(`
        const r = nums |> min
      `);
      expect(out).toContain("for (");
      // Init prints as `1 / 0` (Infinity) without symbol-renamer.
      expect(out).toMatch(/= 1 \/ 0/);
      expect(out).toMatch(/__pv[\w$]+ < __pa[\w$]+/);
    });

    test("max — init -Infinity, tracks largest", () => {
      const out = ts(`
        const r = nums |> max
      `);
      expect(out).toContain("for (");
      expect(out).toMatch(/= -1 \/ 0/);
      expect(out).toMatch(/__pv[\w$]+ > __pa[\w$]+/);
    });

    test("range source — exclusive `lo..hi |> map |> sum`", () => {
      // Bounds as variables so the const-fold pass doesn't pre-evaluate
      // the chain at parse time.
      const out = ts(`
        const r = lo..hi |> map(x => x * x) |> sum
      `);
      // 2-arg IIFE: ((__plo, __phi) => { ... })(lo, hi)
      expect(out).toContain("(lo, hi)");
      expect(out).toContain("for (");
      expect(out).toMatch(/__pi[\w$]+ < __phi/);
      expect(out).toMatch(/__pv[\w$]+ = __pi[\w$]+/);
    });

    test("range source — inclusive `lo..=hi` uses `<=` in the test", () => {
      const out = ts(`
        const r = lo..=hi |> filter(x => x > 0) |> sum
      `);
      expect(out).toContain("(lo, hi)");
      expect(out).toMatch(/__pi[\w$]+ <= __phi/);
    });

    test("range source with take + collect", () => {
      const out = ts(`
        const r = lo..hi |> map(x => x * 2) |> filter(x => x > 100) |> take(5) |> collect
      `);
      expect(out).toContain("(lo, hi)");
      expect(out).toContain("for (");
      expect(out).toContain(">= 5)");
      expect(out).toContain("break");
      expect(out).toContain(".push(");
    });

    // Compile-time pipeline evaluation — when the source is a literal AND
    // every step body + terminal evaluates at parse time, the chain
    // collapses to a literal. No for-loop, no IIFE.
    describe("compile-time fold", () => {
      test("array literal + map + sum folds to a number", () => {
        const out = ts(`const r = [1, 2, 3, 4, 5] |> map(x => x * x) |> sum`);
        expect(out).toContain("const r = 55");
        expect(out).not.toContain("for (");
      });

      test("array + filter + count folds", () => {
        const out = ts(`const r = [1, 2, 3, 4, 5] |> filter(x => x > 2) |> count`);
        expect(out).toContain("const r = 3");
        expect(out).not.toContain("for (");
      });

      test("min / max fold", () => {
        const out = ts(`
          const lo = [3, 1, 4, 1, 5, 9, 2, 6] |> min
          const hi = [3, 1, 4, 1, 5, 9, 2, 6] |> max
        `);
        expect(out).toContain("const lo = 1");
        expect(out).toContain("const hi = 9");
      });

      test("find / findIndex / some / every fold", () => {
        const out = ts(`
          const a = [10, 20, 30, 40] |> find(x => x > 25)
          const b = [10, 20, 30, 40] |> findIndex(x => x === 30)
          const c = [1, 2, -3, 4] |> some(x => x < 0)
          const d = [1, 2, 3, 4] |> every(x => x > 0)
        `);
        expect(out).toContain("const a = 30");
        expect(out).toContain("const b = 2");
        expect(out).toContain("const c = true");
        expect(out).toContain("const d = true");
      });

      test("collect produces an array literal", () => {
        const out = ts(`const r = [10, 20, 30] |> map(x => x * 0.85) |> collect`);
        // Output may be single-line `[8.5, 17, 25.5]` or wrapped.
        expect(out).toMatch(/8\.5/);
        expect(out).toMatch(/17/);
        expect(out).toMatch(/25\.5/);
        expect(out).not.toContain("for (");
      });

      test("range literal `1..=5` folds with map + collect", () => {
        const out = ts(`const r = 1..=5 |> map(x => x * x) |> collect`);
        expect(out).toMatch(/\b1\b/);
        expect(out).toMatch(/\b4\b/);
        expect(out).toMatch(/\b9\b/);
        expect(out).toMatch(/\b16\b/);
        expect(out).toMatch(/\b25\b/);
        expect(out).not.toContain("for (");
      });

      test("non-literal element falls through to runtime fusion", () => {
        const out = ts(`const r = [1, 2, x, 4] |> map(n => n * 2) |> sum`);
        // `x` isn't a literal — fold bails, fusion takes over.
        expect(out).toContain("for (");
      });

      test("non-evaluable body falls through to runtime fusion", () => {
        const out = ts(`const r = [1, 2, 3] |> map(n => Math.sqrt(n)) |> sum`);
        // Math.sqrt is a member access — not in our const evaluator's set.
        expect(out).toContain("for (");
      });

      test("oversize ranges don't fold (parse-time bloat guard)", () => {
        const out = ts(`const r = 0..10000 |> map(x => x * 2) |> sum`);
        // 10k elements > fold_limit; falls through to runtime loop.
        expect(out).toContain("for (");
      });
    });

    test("multiple fused chains in one file don't crash visit pass", () => {
      const out = ts(`
        const a = nums |> filter(x => x > 0) |> sum
        const b = nums |> find(x => x > 10)
        const c = nums |> map(x => x * 2) |> max
      `);
      // Three independent chains, each with inline arrows that get
      // their bodies substituted away — orphan scopes need to be
      // nulled correctly to avoid scope-mismatch on later chains.
      expect(out.match(/for \(/g)?.length ?? 0).toBe(3);
    });

    test("call-expression source stays unfused (async-iter safe)", () => {
      const out = ts(`
        function double(x: number) { return x * 2 }
        const r = source() |> map(double) |> sum
      `);
      // source() may return an async iterable that needs runtime semantics
      // (e.g. from @para/pipeline). Don't fuse calls.
      expect(out).toContain("sum(");
      expect(out).not.toContain("for (");
    });

    test("zero intermediate steps leaves chain unfused", () => {
      const out = ts(`
        const r = nums |> sum
      `);
      // No map / filter — nothing to fuse over. Falls back to sum(nums).
      expect(out).toContain("sum(");
      expect(out).not.toContain("for (");
    });

    test("unrecognized terminal bails", () => {
      const out = ts(`
        function double(x: number) { return x * 2 }
        const r = items |> map(double) |> custom
      `);
      expect(out).toContain("custom(");
      expect(out).not.toContain("for (");
    });

    test("unrecognized intermediate bails", () => {
      const out = ts(`
        const r = items |> custom(x) |> sum
      `);
      expect(out).toContain("sum(");
      expect(out).not.toContain("for (");
    });
  });

  test("multi-param pure function is NOT inlined", () => {
    const out = ts(`
      pure function add(a: number, b: number) { return a + b }
      const result = 21 |> add
    `);
    expect(out).toContain("add(21)");
  });

  test("pure function with complex body (not single return) is NOT inlined", () => {
    const out = ts(`
      pure function complex(x: number) { const y = x * 2; return y + 1 }
      const result = 10 |> complex
    `);
    expect(out).toContain("complex(10)");
  });

  test("inlined body with binary expression", () => {
    const out = ts(`
      pure function calc(x: number) { return x * 2 + 1 }
      const result = 5 |> calc
    `);
    expect(out).toContain("5 * 2 + 1");
  });

  test("inlined body with ternary expression", () => {
    const out = ts(`
      pure function clamp(x: number) { return x > 100 ? 100 : x }
      const result = val |> clamp
    `);
    expect(out).toContain("val > 100 ? 100 : val");
  });

  test("inlined body with property access", () => {
    const out = ts(`
      pure function len(x: string) { return x.length }
      const result = "hello" |> len
    `);
    expect(out).toContain('"hello".length');
  });

  test("inlined body with method call", () => {
    const out = ts(`
      pure function upper(x: string) { return x.toUpperCase() }
      const result = "hello" |> upper
    `);
    expect(out).toContain('"hello".toUpperCase()');
  });

  test("runtime correctness: simple pipeline inline", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        pure function double(x) { return x * 2 }
        console.log(21 |> double)
      `,
      ],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("42");
    expect(exitCode).toBe(0);
  });

  test("runtime correctness: chained pipeline inline", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        pure function double(x) { return x * 2 }
        pure function inc(x) { return x + 1 }
        console.log(10 |> double |> inc)
      `,
      ],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("21");
    expect(exitCode).toBe(0);
  });

  test("runtime correctness: inline function expression pipeline", async () => {
    await using proc = Bun.spawn({
      cmd: [bunExe(), "-e", `console.log(5 |> pure function(x) { return x * 3 })`],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("15");
    expect(exitCode).toBe(0);
  });

  test("runtime correctness: pipeline with ternary inline", async () => {
    await using proc = Bun.spawn({
      cmd: [
        bunExe(),
        "-e",
        `
        pure function clamp(x) { return x > 100 ? 100 : x }
        console.log(200 |> clamp)
      `,
      ],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("100");
    expect(exitCode).toBe(0);
  });
});
