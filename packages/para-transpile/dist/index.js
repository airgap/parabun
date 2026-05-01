// @parascript/transpile — standalone ParaScript transpiler.
//
// Public surface:
//   transpile(src, options?) → JS string
//
// v0.0.1 covers the structural desugarings that don't need scope analysis.
// Bare-read sugar (rewriting `x` to `x.get()` inside tracked contexts)
// requires real scope tracking and lands in v0.2; until then user code
// must call `.get()` / `.set()` explicitly.
import { transformBareRead } from "./transforms/bare-read";
import { transformBindings } from "./transforms/bindings";
import { transformBlocks } from "./transforms/blocks";
import { transformDefer } from "./transforms/defer";
import { transformErrorChain } from "./transforms/error-chain";
import { injectUsingHelpers } from "./transforms/inject-helpers";
import { transformMemo } from "./transforms/memo";
import { transformPipeline } from "./transforms/pipeline";
import { transformPure } from "./transforms/pure";
import { transformRanges } from "./transforms/ranges";
import { transformUsingPolyfill } from "./transforms/using-polyfill";
import { injectWrapImports } from "./transforms/wrap-imports";
// Pass order matters:
//   1. `pure` strip — turns the keyword into whitespace before any operator
//      transform sees it, so `pure (x) => x` becomes a normal arrow.
//   2. Block forms (signal/effect/arena/when) — these emit `.when(...)` and
//      `.effect(...)` calls whose bodies may then contain `|>` / `..!` /
//      etc. that the operator passes need to see, so blocks lower first.
//   3. Pipeline `|>` — collapses pipeline chains. Runs before error-chain
//      so `data |> transform ..! handler` lowers to
//      `transform(data).catch(handler)` (the |> binds tighter).
//   4. Error-chain `..!` / `..&` — converts to .catch() / .finally() chains.
//   5. Ranges `..` / `..=` — runs LAST among the dot-family rewrites so it
//      doesn't consume `..!` / `..&` operands by mistake.
export function transpile(src, _options = {}) {
    let out = src;
    out = transformPure(out);
    out = transformMemo(out);
    out = transformBlocks(out);
    out = transformBindings(out);
    out = transformDefer(out);
    out = transformPipeline(out);
    out = transformErrorChain(out);
    out = transformRanges(out);
    // Bare-read sugar runs after the structural transforms — parses the
    // fully-desugared output as JS via Babel, identifies signal bindings,
    // and rewrites bare reads/writes universally. Auto-promotes signal()
    // initializers that read other signals into derived().
    out = transformBareRead(out);
    // ES2024 `using` / `await using` polyfill — the defer transform emits
    // these, and most downstream targets (Node 18/20, pre-2024 browsers,
    // Workers) don't support them yet. Lower to TS-style try/catch/finally
    // with __addDisposableResource / __disposeResources calls.
    out = transformUsingPolyfill(out);
    // Inline the using-polyfill helpers (if referenced) BEFORE wrap imports
    // so the final order is: imports → helpers → code. Helpers are pure
    // function decls with no module dependencies of their own.
    out = injectUsingHelpers(out);
    // Final pass: prepend `import { __parabunRange, … } from "bun:wrap"`
    // for any runtime helpers the previous transforms emitted, so the
    // output is runnable on a host that resolves `bun:wrap` (Parabun
    // natively, or `parabun-browser-shims` aliased via the bundler).
    out = injectWrapImports(out);
    return out;
}
export { injectUsingHelpers, injectWrapImports, transformBareRead, transformBindings, transformBlocks, transformDefer, transformErrorChain, transformMemo, transformPipeline, transformPure, transformRanges, transformUsingPolyfill, };
