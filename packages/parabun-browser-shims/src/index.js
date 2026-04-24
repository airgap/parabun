// Aggregate entry point. Most integrations will import the individual
// modules directly via bundler aliasing (see README); this file exists
// for ad-hoc use (`import * as shims from "parabun-browser-shims"`).

export * as arena from "./arena.js";
export * as signals from "./signals.js";
export * as wrap from "./wrap.js";
export * as parallel from "./parallel.js";
export * as simd from "./simd.js";
export * as gpu from "./gpu.js";
export * as llm from "./llm.js";
export * as quant from "./quant.js";

// Bundler-agnostic alias map. Bundler configs can `spread` this into
// their `resolve.alias` / `build.rollupOptions.plugins` to map the
// `bun:*` specifiers Parabun desugarings emit onto the shim modules.
export const bunAliases = {
  "bun:arena": new URL("./arena.js", import.meta.url).pathname,
  "bun:signals": new URL("./signals.js", import.meta.url).pathname,
  "bun:wrap": new URL("./wrap.js", import.meta.url).pathname,
  "bun:parallel": new URL("./parallel.js", import.meta.url).pathname,
  "bun:simd": new URL("./simd.js", import.meta.url).pathname,
  "bun:gpu": new URL("./gpu.js", import.meta.url).pathname,
  "bun:llm": new URL("./llm.js", import.meta.url).pathname,
};
