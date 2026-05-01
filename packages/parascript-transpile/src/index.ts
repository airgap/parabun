// @parascript/transpile — standalone ParaScript transpiler.
//
// Public surface:
//   transpile(src, options?) → JS string
//
// v0.0.1 covers the structural desugarings that don't need scope analysis.
// Bare-read sugar (rewriting `x` to `x.get()` inside tracked contexts)
// requires real scope tracking and lands in v0.2; until then user code
// must call `.get()` / `.set()` explicitly.

import { transformErrorChain } from "./transforms/error-chain";
import { transformPipeline } from "./transforms/pipeline";
import { transformPure } from "./transforms/pure";
import { transformRanges } from "./transforms/ranges";

export type TranspileOptions = {
  /** Source filename — used in error messages only. Default `"<input>"`. */
  filename?: string;
};

// Pass order matters:
//   1. `pure` strip — turns the keyword into whitespace before any operator
//      transform sees it, so `pure (x) => x` becomes a normal arrow.
//   2. Pipeline `|>` — collapses pipeline chains. Runs before error-chain so
//      `data |> transform ..! handler` lowers to `transform(data).catch(handler)`
//      (the |> binds tighter; we resolve it first).
//   3. Error-chain `..!` / `..&` — converts to .catch() / .finally() chains.
//   4. Ranges `..` / `..=` — runs LAST among the dot-family rewrites so it
//      doesn't consume `..!` / `..&` operands by mistake.
export function transpile(src: string, _options: TranspileOptions = {}): string {
  let out = src;
  out = transformPure(out);
  out = transformPipeline(out);
  out = transformErrorChain(out);
  out = transformRanges(out);
  return out;
}

export { transformErrorChain, transformPipeline, transformPure, transformRanges };
