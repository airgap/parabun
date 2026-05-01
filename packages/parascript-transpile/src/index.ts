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

export type TranspileOptions = {
  /** Source filename — used in error messages only. Default `"<input>"`. */
  filename?: string;
};

export function transpile(src: string, _options: TranspileOptions = {}): string {
  let out = src;
  out = transformErrorChain(out);
  return out;
}

export { transformErrorChain };
