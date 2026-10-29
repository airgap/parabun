// Babel-free subset for bundlers/consumers that only need the
// position/region-preserving syntactic transforms (the `.pui` LSP
// projection: editors/lsp/pui-transform.ts).
//
// Do NOT import these from the package index (`@lyku/para-transpile`): the
// index statically imports `transformBareRead` + `transformUsingPolyfill`
// (src/index.ts), which pull `@babel/*`. Bundling that into the LSP
// pui-transform graph breaks any build without `@babel/*` resolvable
// (parabun CI : caused build #235's failure). This entry re-exports only
// the leaf transforms, each of which is `@babel`-free (rewriteCodeRegions
// / scanner-based, no scope analysis, no helper injection).
//
// Keep this dependency-light: only add exports whose transform file does
// NOT (transitively) import `@babel/*`.

export { transformDecimal } from "./transforms/decimal.js";
export { transformErrorChain } from "./transforms/error-chain.js";
export { transformFun } from "./transforms/fun.js";
export { transformIs } from "./transforms/is.js";
export { transformPipeline } from "./transforms/pipeline.js";
export { transformPure } from "./transforms/pure.js";
export { transformRanges } from "./transforms/ranges.js";
