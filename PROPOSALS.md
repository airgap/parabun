# Parabun Language Proposals

Brain-dump of DX extensions for `.pts` / `.pjs`. Status legend: `[ ]` not started, `[~]` in progress, `[x]` shipped. Each proposal lists syntax, desugar target, rationale, cost estimate, dependencies, and open questions.

Design rules (ethos — don't break these):

1. **Parse-time desugar only.** No runtime additions for syntax features. If it can't compile to standard JS, it doesn't belong in the language layer — put it in a `bun:*` module instead.
2. **Composable with existing extensions.** New operators must interact sensibly with `pure`, `..=`, `..!`, `..&`, `|>`. If there's ambiguity, spell out the precedence table.
3. **Zero conflict with standard JS/TS.** Must not break valid TypeScript parsing. If a token sequence is legal TS today, it must still mean the same thing in `.pts`.
4. **Debuggable.** Source-map spans must map back to the sugar, not the desugared IIFE/arrow. Failing that, the sugar should not materially change line-column geometry.
5. **One obvious use.** If an extension solves two unrelated problems, it's probably two extensions.

---

## Priority Queue (build order)

Ordered by value-per-unit-effort, skewed toward things that **compose with extensions we already shipped** (so they compound):

1. `[x]` **Throw expressions** — `?? throw E` — proves the pattern, tiny blast radius. **SHIPPED** (15 new tests; 146 parser/pure/purity tests still green)
2. `[x]` **Placeholder in `|>`** — `x |> f(_, 2)` — makes the pipeline actually useful with multi-arg APIs. **SHIPPED** (18 new tests; 244 parser-side tests total green)
3. `[x]` **Method shorthand in `|>`** — `x |> .trim()` — pairs with placeholder, kills the arrow-wrap tax. **SHIPPED** (17 new tests; 176 total parser-side tests green)
4. `[x]` **`defer`** — composes with our `using`-based resource story; real pain relief. **SHIPPED** (20 new tests; 313 parser-side tests total green)
5. `[x]` **`memo pure fn`** — headline-level feature; safe *only* because we already prove purity. **SHIPPED** (20 new tests; 282 parser-side tests total green)
6. `[ ]` **Function composition `>>`** — trivial, makes pipelines point-free
7. `[ ]` **Do-blocks** — statement-as-expression; enables cleaner match later
8. `[ ]` **Range literals `1..10` / `1..=10`** — cheap ergonomics, safe desugar
9. `[ ]` **Arena blocks** — composes with `bun:arena`, scope-based cleanup
10. `[ ]` **`pure { ... }` blocks** — purity scope inside impure functions
11. `[ ]` **Match expressions** — biggest surface area; ship last

---

## 1. Throw expressions

**Syntax:**
```pts
const user = maybeUser ?? throw new Error("not found");
const port = parseInt(env.PORT ?? throw "PORT required", 10);
assert(x > 0, x < 10) || throw new RangeError(`out of bounds: ${x}`);
```

**Desugar:**
```js
const user = maybeUser ?? (() => { throw new Error("not found"); })();
```

**Rationale:** `throw` is a statement in JS, so you can't use it in expression position — forcing an `if/throw` block just to guard a nullable value is a recurring papercut. TC39 proposal has been stage-2 forever. Our `..!` / `..&` ecosystem already leans on treating control-flow as expressions, so this slots in naturally.

**Where the expression is legal:** RHS of `??`, `||`, `&&`, `?:`. Anywhere an `expr` is expected. No special-casing needed — it's just a new prefix expression that happens to always throw.

**Parser change:** `parsePrefix.zig` — add `throw` as a prefix keyword when `allow_throw_expression` is true. Currently `throw` is a statement in `parseStmt.zig`. Keep the statement form unchanged; add prefix handler when in expression context.

**Desugar implementation:** Wrap the throw in `E.Arrow` (no params, body: single throw stmt) then call it with `E.Call`. Identical to how other thunks are built in parseSuffix.

**Cost:** ~40 lines of Zig + 4-6 tests. 1 evening.

**Open questions:**
- Does `x ?? throw e |> f` parse as `x ?? throw(e |> f)` or `x ?? (throw e) |> f`? Answer: `throw` binds loosely, captures rest of expression. This matches `return` semantics intuition. Confirmed in TC39 proposal.
- Should we also allow `throw` in arrow expression body (`const f = x => throw new Error(x)`)? Yes — falls out for free once throw is a prefix expression.

---

## 2. Placeholder in `|>`

**Syntax:**
```pts
users |> filter(_, isActive) |> map(_, .name)
input |> parseInt(_, 10)
buffer |> writeToFile(path, _, { flags: "a" })
```

**Desugar:**
```js
map(filter(users, isActive), u => u.name);
parseInt(input, 10);
writeToFile(path, buffer, { flags: "a" });
```

**Rationale:** The hadley/F# style pipeline (`x |> f`) only works if every RHS is a unary function. Real JS APIs are multi-arg (`filter(arr, pred)`, `map(arr, fn)`, `parseInt(s, radix)`). Forcing users to write `x |> (v => filter(v, pred))` kills pipelines on day one. Placeholder fixes this.

**Semantics:** RHS of `|>` may be a call expression with one or more `_` placeholders. Exactly one `_` means "the piped value goes here"; multiple `_` means "repeat the piped value" (rare but well-defined). Zero `_` falls back to current behavior (function-valued RHS).

**Desugar detail:** If the RHS is a call `f(a, _, c)`, desugar to `f(a, x, c)`. If there are multiple `_`, bind once: `((x) => f(x, a, x))(x)` — prevents double-evaluation of the LHS. If LHS is a simple identifier/literal, we can skip the IIFE.

**Parser change:** In `parseSuffix.zig`, when handling `.pipe`, inspect the RHS. If it's a call expression, walk the arg list for `E.Identifier{ name: "_" }` and substitute. Otherwise use the current `f(x)` path. The `_` identifier is not currently reserved in JS/TS, so there's a mild concern about shadowing — see open questions.

**Cost:** ~80 lines + 8 tests. 1 day.

**Open questions:**
- **Shadowing `_` as a variable name.** Lodash users sometimes bind `_` as a local. Options: (a) only treat `_` as placeholder when the local scope does not bind it — adds scope-walking; (b) always treat `_` as placeholder inside pipeline RHS and document it; (c) use a different sigil (`$`, `?`, `%`). I lean toward (b) with a loud doc note. Alternative sigil `#` conflicts with TC39 private fields; `$` conflicts with jQuery/Playwright idioms; `?` conflicts with optional chaining. `_` wins on readability.
- **Spread with placeholder.** `f(..._, b)` — what does that mean? Reject at parse time; document as "placeholder must be a plain arg."
- **Member calls.** `x |> obj.method(_, 2)` — should work the same way. Desugars to `obj.method(x, 2)`.

---

## 3. Method shorthand in `|>`

**Syntax:**
```pts
csv |> .trim() |> .split(",") |> .map(s => s.toUpperCase())
```

**Desugar:**
```js
csv.trim().split(",").map(s => s.toUpperCase())
```

**Rationale:** The single most common pipeline target is "call a method on the piped value." Without this, users write `x |> (v => v.trim())` and give up. With this, the pipeline becomes a readable alternative to method chaining that also interoperates with free functions (via placeholder).

**Semantics:** If the RHS of `|>` begins with `.` (followed by an identifier), it's a method shorthand. `x |> .foo` → `x.foo` (property access). `x |> .foo()` → `x.foo()` (method call). `x |> .foo(1, 2)` → `x.foo(1, 2)`.

**Interacts with placeholder how?** `x |> .foo(_, 2)` — here `_` still means "the piped value" but the method is called on the piped value, so `_` would double-bind. Proposal: inside method shorthand, `_` is illegal (parse error: "redundant placeholder — the piped value is already `this`"). Keeps semantics clear.

**Parser change:** In `parseSuffix.zig` pipeline handler, peek for a `.` token as the first token after `|>`. If present, build an `E.Index` / `E.Call` with the piped value as the base.

**Cost:** ~40 lines + 6 tests. Half a day.

**Open questions:**
- **Chained access.** `x |> .a.b.c` — should work, just chains through property accesses until it hits something that ends the pipeline step (next `|>`, newline with no continuation, etc.). Standard prefix-dotted-chain parse.
- **Computed property.** `x |> .[key]` — yes, desugars to `x[key]`. Spell it out in tests.
- **Optional chaining.** `x |> ?.foo()` — desugars to `x?.foo()`. Useful when the piped value is nullable.

---

## 4. `defer` — SHIPPED

**Syntax:**
```pts
function readConfig(path) {
  const fd = fs.openSync(path);
  defer fs.closeSync(fd);
  const data = fs.readFileSync(fd);
  defer log("config-read");
  return JSON.parse(data);
}
```

**Desugar (as shipped, Strategy A — using-based):**
```js
import { __parabunDefer0, __callDispose, __using } from "bun:wrap";
function readConfig(path) {
  const fd = fs.openSync(path);
  using __parabun_defer_1$ = __parabunDefer0(() => fs.closeSync(fd));
  const data = fs.readFileSync(fd);
  using __parabun_defer_2$ = __parabunDefer0(() => log("config-read"));
  return JSON.parse(data);
}
```

The runtime helper is a one-liner: `thunk => ({ [Symbol.dispose]: thunk })`. `__parabunAsyncDefer0` is the `await using` counterpart returning `{ [Symbol.asyncDispose]: thunk }`. Everything else — LIFO order, early-return dispose, throw propagation, per-iteration loop scoping, `SuppressedError` chaining — is plain ES2024 `using` semantics.

**`defer await`.** Inside an async function, `defer await EXPR` desugars to `await using X = __parabunAsyncDefer0(async () => EXPR)`. Outside an async function, `defer await` is a parse error.

**`defer` as an identifier.** Keyword trigger requires `defer` be immediately followed (no newline) by something that starts an expression. A newline, `=`, `;`, `.`, `,`, `)`, etc. keeps `defer` as a plain identifier — `const defer = 1; defer;` still works.

**Resolved notes:**
- **Loop body:** each iteration's defers dispose before the next — follows directly from `using` scoping.
- **Throws:** exceptions propagate; multiple throwing defers chain via `SuppressedError`.
- **Late binding:** the deferred expression evaluates in a closure over the surrounding scope, so captured locals see their value *at dispose time*, not at defer-site.

**Tests:** `test/bundler/transpiler/parabun-defer.test.js` — 20 tests covering parse-time desugar, LIFO disposal, early-return, throw propagation, loop-per-iteration, async defer ordering, SuppressedError chaining, and `defer` as a plain identifier in non-keyword positions.

---

## 5. `memo pure fn` — SHIPPED

**Syntax:**
```pts
memo pure function fib(n) {
  if (n < 2) return n;
  return fib(n - 1) + fib(n - 2);
}
```

**Desugar (as shipped):**
```js
const fib = __parabunMemo(function(n) {
  if (n < 2) return n;
  return fib(n - 1) + fib(n - 2);
}, 1);
```

The inner function is rendered anonymous so recursive references (`fib(n-1)`) resolve to the outer `const` — the memoized wrapper — instead of binding to a named-function-expression self-reference that would bypass the cache.

**Key strategy (as shipped — exceeds the original v1 plan):**
- **Arity 0** — singleton cache, first result is reused forever.
- **Arity 1, no rest** — direct `Map` keyed by the argument (object identity for non-primitives, no stringify cost).
- **Arity ≥2 or rest** — nested `Map` chain, one level per arg. Terminal values sit under a private `Symbol` sentinel at each depth so different-arity calls sharing a prefix don't collide.

**Async semantics:** in-flight promises are shared between concurrent callers (natural dedupe). Rejected promises are evicted; fulfilled promises stay cached.

**`memo` without `pure`** is a parse error. `memo` in other positions (variable names, property accesses) is unaffected.

**Resolved notes:**
- **Cache size.** Unbounded in v1. Add `memo(N)` bounded-LRU when a real use-case comes in.
- **Interaction with `pmap`.** Each worker sees its own cache — not shared (workers run the desugared wrapper independently).
- **Recursion.** Verified: `fib(20)` invokes the body 21 times, not 21,891.

---

## 6. Function composition `>>`

**Syntax:**
```pts
const parseJSON = JSON.parse;
const strip = (s) => s.trim();
const load = strip >> parseJSON;   // (s) => parseJSON(strip(s))
const capitalize = toLower >> titleCase;
```

**Desugar:**
```js
const load = (__x) => parseJSON(strip(__x));
const capitalize = (__x) => titleCase(toLower(__x));
```

**Rationale:** Standard in Haskell, F#, Ramda. Makes point-free pipelines possible, lets users pre-compose validators/transformers without allocating an arrow per step. Cheap, obvious.

**Semantics:** `f >> g` is left-to-right composition (Elm/F# convention, not Haskell's right-to-left `.`). Variadic: `f >> g >> h` → `x => h(g(f(x)))`. Associates left. Precedence: same as pipeline (`|>`), tighter than nullish.

**Collision check:** `>>` is the right-shift bit operator in JS. Breaking that would be catastrophic. **Only treat `>>` as composition when both operands are statically known to be call-shaped** (Identifier, PropertyAccess, Arrow, FunctionExpression, or parenthesized call-shaped). Everything else stays bit-shift. This is unambiguous at parse time.

Actually — on second pass, that static-check approach is brittle. Safer: require a new spelling like `|*|` or `∘` (pretentious). Or use `>>>` (unsigned right-shift — already taken). **Best option: use `>>` only in `.pts` files, behind a pragma: `// parabun:composition`.** In the default mode, keep `>>` as bit-shift. Users who want composition opt in per-file.

Actually — cleaner: **drop it for v1.** Composition is achievable today with `x => g(f(x))`. Revisit if users complain.

**Status:** Punt to v2. Listed for completeness.

---

## 7. Do-blocks

**Syntax:**
```pts
const user = do {
  const raw = await fetch(url);
  const json = await raw.json();
  normalize(json);
};

const msg = do {
  if (err.code === "ENOENT") "not found";
  else if (err.code === "EACCES") "permission denied";
  else err.message;
};
```

**Desugar:**
```js
const user = await (async () => {
  const raw = await fetch(url);
  const json = await raw.json();
  return normalize(json);
})();
```

The last expression statement becomes the return value. Synchronous `do` uses a sync IIFE. If the block contains an `await`, the IIFE is async (and the enclosing context must be async too, else parse error).

**Rationale:** JS forces you to pick: `const x = cond ? a : b` (expression, limited) or `let x; if (cond) x = a; else x = b;` (statements, verbose, `let`). Do-blocks give you statements-producing-a-value, which is what most ML-family languages have had for decades. Pairs with match expressions later.

**Semantics:**
- Last statement in the block, if an expression statement, is the result.
- Last statement is an `if/else` chain: result is the value of the taken branch (the branch must end in an expression statement).
- Last statement is a `throw` / `return`: legal (result type is `never`).
- Last statement is a `for` / `while`: parse error ("do-block must end in an expression").

TC39 has a stage-1 proposal for this exact thing. We ship the same semantics.

**Parser change:** `parsePrefix.zig` — treat `do` as a prefix keyword when followed by `{`. Parse the block, then rewrite: if last statement is an expr statement, replace with a return-statement of that expression; if last is an if-chain, recurse into each branch. Wrap in an IIFE.

**Cost:** ~150 lines + 12 tests. 2-3 days.

**Open questions:**
- **`do` in non-async context with `await`.** Error at parse time. Clear error message: "do-block contains await; enclosing function must be async."
- **`return` inside do-block.** Ambiguous — returns from the do-block, or from the outer function? TC39 says: returns from the outer function. We follow. That means the IIFE wrapper is tricky — a direct return inside the IIFE would return from the IIFE, not the outer function. Desugar needs to thread a sentinel or use a different strategy (label + break, or a continuation-passing rewrite). **Punt: v1 forbids `return` inside do-blocks. Parse error.** v2 handles it properly.
- **`break` / `continue`.** Same problem. v1: forbid. v2: support.

---

## 8. Range literals

**Syntax:**
```pts
for (const i of 1..10) { /* i from 1 to 9 */ }
for (const i of 1..=10) { /* i from 1 to 10 */ }
const arr = [...0..100];
```

**Desugar:**
```js
for (let i = 1; i < 10; i++) { /* ... */ }
for (let i = 1; i <= 10; i++) { /* ... */ }
const arr = Array.from({ length: 100 }, (_, i) => i);
```

For `for-of` specifically, we can do the zero-alloc desugar (just a counter loop). For spread contexts we need an actual iterable — use `Array.from` or a helper.

**Rationale:** `for (let i = 0; i < n; i++)` is 25 characters of boilerplate for what should be one token. Most ranges are simple counters; this covers 90% of them.

**Semantics:**
- `a..b` — exclusive upper bound, integer step 1.
- `a..=b` — inclusive upper bound.
- Step: v1 step is always 1. No `a..b by 2` in v1 (keeps parser simple; revisit if we see demand).
- **Only integers** at the syntax level. `1.5..3.5` is a parse error. (BigInt? Future.)

**Collision check:** `a..b` doesn't currently parse in JS. `..` is our existing prefix for `..=`, `..!`, `..&`. We need to make sure the lexer distinguishes "`..` as range" vs "`..=` / `..!` / `..&` as operator prefix". Answer: after a numeric/identifier operand, `..` followed by a number/identifier is a range. `..=` / `..!` / `..&` followed by a callable expression is our existing operator. The tokenizer can disambiguate on the trailing character (`=` vs `!` vs `&` vs digit/ident).

Actually — `..=` is already our await-assign operator, and `1..=10` looks very similar. Is there ambiguity? `const x ..= expr` is await-assign (declaration context). `1..=10` is a range (expression context). Disambiguation by context: await-assign only appears as part of a declaration (`const x ..=`) or assignment (`x ..=`). Range only appears in expression position. No actual conflict because `const x ..= 10` has `..=` immediately after an identifier in a declaration, while `1..=10` starts with a literal. But the lexer sees tokens, not context. Careful spec needed.

**Parser change:** Add range as a binary operator at tight precedence (tighter than arithmetic? same as multiplicative? — spec says tighter). Lexer: recognize `..=` followed by a digit or non-callable as range; followed by identifier/member/call as await-assign. Fallback: require `const`/`let`/`var` on the LHS for `..=` as await-assign, treat bare `..=` between two expressions as range.

**Cost:** ~80 lines + 8 tests. 1 day. Lexer disambiguation adds risk; budget extra.

**Open questions:**
- **Method calls on ranges.** `(1..10).map(...)` — would need the range to be a real iterable. Ship only the for-of fast path in v1.
- **Negative step.** `10..1` — empty range (matches Python). To reverse: `.reverse()` or explicit `i--` loop.

---

## 9. Arena blocks

**Syntax:**
```pts
import { withArena } from "bun:arena";

arena (a) {
  const buf = a.alloc(Float32Array, 1024);
  const result = process(buf);
  return result; // buf reclaimed at end of block
}
```

**Desugar:**
```js
await withArena((a) => {
  const buf = a.alloc(Float32Array, 1024);
  const result = process(buf);
  return result;
});
```

**Rationale:** `bun:arena` already exists as a runtime module, but using it requires wrapping everything in a callback. `arena (a) { ... }` makes it a first-class scope, matching how people think about arenas ("this region, these allocations, freed when I leave"). Composes with the existing `bun:arena` primitive — pure sugar, no runtime addition.

**Parser change:** `parseStmt.zig` — recognize `arena` as a keyword only when followed by `(identifier)` and a block. Low collision risk (`arena` isn't a reserved word and isn't a common variable). Desugar to an `await withArena(async (a) => { ... })` call. Needs the arena module to be imported — we can auto-inject the import at desugar time, or require users to import it explicitly and error otherwise. Prefer explicit import (simpler, more predictable).

**Cost:** ~70 lines + 6 tests. 1 day.

**Open questions:**
- **Sync vs async.** `bun:arena` is async-friendly (workers, etc.). Do we need both `arena` and `sync arena`? v1: always async. Document.
- **Nested arenas.** Each gets its own scope. Falls out of the desugar.
- **Return values.** The block's return value is the arena's return value. Must not be an arena-allocated reference (it'd be freed on exit). Document the hazard; can't catch it statically without effects typing.

---

## 10. `pure { ... }` blocks

**Syntax:**
```pts
function processRequest(req) {
  const rawBody = await req.text();

  pure {
    const parsed = JSON.parse(rawBody);
    const validated = validate(parsed);
    const normalized = normalize(validated);
    // this, console, Math.random all error here
    return normalized;
  }
}
```

**Desugar:** No runtime change — the block becomes a regular block, the purity check is compile-time only. The block body is scanned for impure references (same rules as `pure fn`) and any violation is a parse error.

**Rationale:** You have a mostly-impure function with a hot pure inner region. Currently you have to either extract the region into a `pure` helper (adds indirection, naming tax) or give up purity checking for that region. `pure { ... }` gives you the compile-time guarantee without the extraction.

This is also where **memoization could hook in automatically**: since the block is provably pure, we can hoist it into a memoized closure (bonus feature, v2).

**Parser change:** `parseStmt.zig` — `pure {` as a prefix for block statements, set the `is_pure` flag on the enclosing parse state for the block's duration, reset afterward. Reuse the existing purity-checking infrastructure in `parsePrefix.zig`.

**Cost:** ~40 lines + 6 tests. Half a day.

**Open questions:**
- **`pure { ... }` as expression.** Also allow it as an expression? (Returns the last expression, like a do-block.) Yes — stack naturally with do-blocks. Ship after do-blocks.
- **Calling impure functions from a `pure` block.** Parse error, same as inside a pure function.

---

## 11. Match expressions

**Syntax:**
```pts
const label = match shape {
  { kind: "circle", r } => `circle r=${r}`,
  { kind: "square", side } => `square s=${side}`,
  { kind: "triangle", a, b, c } when a === b && b === c => "equilateral",
  { kind: "triangle" } => "other triangle",
  _ => "unknown",
};
```

**Desugar:**
```js
const label = (() => {
  const __v = shape;
  if (__v.kind === "circle") {
    const { r } = __v;
    return `circle r=${r}`;
  }
  if (__v.kind === "square") {
    const { side } = __v;
    return `square s=${side}`;
  }
  if (__v.kind === "triangle") {
    const { a, b, c } = __v;
    if (a === b && b === c) return "equilateral";
  }
  if (__v.kind === "triangle") {
    return "other triangle";
  }
  return "unknown";
})();
```

**Rationale:** Exhaustive pattern matching is the single biggest missing piece in JS. TS can check discriminated unions in `switch` / `if`, but there's no expression form, no destructuring in the pattern, no guards, and no exhaustiveness unless you write `assertNever`. Match expressions close all four gaps.

**Subset for v1:**
- Literal patterns: `1`, `"foo"`, `true`, `null`, `undefined`.
- Object patterns: `{ kind: "foo", x, y }` — match literal fields, capture others.
- Array patterns: `[a, b, ...rest]`.
- Wildcard: `_`.
- Guards: `pattern when expr`.
- Or-patterns: `1 | 2 | 3`.

**Not in v1:**
- Type patterns (`x as number`) — needs TS type info; defer.
- Range patterns (`1..10 => ...`) — ship after range literals land.
- Nested binding with renaming — keep it simple.

**Exhaustiveness:** If the scrutinee's TS type is a discriminated union and not every variant is matched (or a wildcard present), emit a **parse-time warning** (not error, because we may not have full type info). Full exhaustiveness requires LSP-level type flow. Ship lint-level in v1, tighten later.

**Parser change:** `parsePrefix.zig` — `match` as a prefix expression when followed by an expression and `{`. Substantial new grammar for patterns. Desugars to an IIFE containing a chain of if-statements. Patterns are compiled bottom-up from a small pattern AST.

**Cost:** ~500 lines + 25+ tests. **1 week minimum.** Highest complexity in the queue.

**Open questions:** dozens. Defer detailed spec until after 1-10 land.

---

## Deferred / Rejected

- **`>>` function composition** — collides with bit-shift; revisit with a pragma or different sigil.
- **`::` method reference** — Rust-style UFCS / old-JS pipeline proposal bind syntax. Superseded by placeholder + method shorthand in `|>`.
- **`x?.()` variants** — already standard.
- **`if let` / let-chains** — subsumed by match expressions.
- **Partial application `f(_, 2)` outside pipelines** — slippery scope rules; keep `_` placeholder scoped to pipelines only.
- **Named tuples** — doesn't compose with anything; objects are fine.

---

## Implementation Notes

**Parser locations (reference):**

| Location | What lives there |
|---|---|
| `src/ast/parsePrefix.zig` | Prefix expression forms (pure, this-check). Add: `throw` (expr), `do` block, `match`. |
| `src/ast/parseSuffix.zig` | Infix operators: `..!`, `..&`, `|>`. Extend: placeholder in `|>`, method shorthand in `|>`, range `..` / `..=`. |
| `src/ast/parseStmt.zig` | Statement forms: `pure` (stmt-level), `defer`, `arena`, `pure { }`. |
| `src/ast/parse.zig` | `parsePurePrefixExpr` helpers. Extend for new prefix forms. |
| `src/ast/parseFn.zig` | `is_pure` threading. Extend for `memo`. |
| `src/options.zig` | Extension registration. No change unless we add new file extensions. |

**Test conventions:** one file per feature in `test/bundler/transpiler/parabun-<feature>.test.js`. Name tests with the operator/keyword (`parabun-throw-expr.test.js`, `parabun-pipeline-placeholder.test.js`, etc.). Use the existing `parabun-parser.test.js` patterns.

**LSP updates:** each new keyword/operator needs a hover doc, a completion item, and a semantic token scope. Edit `editors/lsp/parabun-lsp.ts`.

**LLMs.md:** must be updated with every new feature — it's the spec reference for AI tooling and new contributors.

**README.md:** only the highest-visibility features land in the README (the language-extensions section is already the "optional footnote" per project positioning). Don't bloat it with every operator — defer everything not in the top 5 to `LLMs.md`.
