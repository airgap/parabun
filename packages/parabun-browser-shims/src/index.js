// Aggregate entry point. NOTE: this package is in deprecation as the
// per-module split lands. New integrations should pull individual
// `@para/<module>` packages directly (`@para/signals`, `@para/parallel`,
// `@para/simd` so far). Subpath imports here forward to those packages.
// Slated for removal in 0.4.x.
//
// Most integrations will import the individual modules directly via
// bundler aliasing (see README); this file exists for ad-hoc use
// (`import * as shims from "parabun-browser-shims"`).

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
  "para:arena": new URL("./arena.js", import.meta.url).pathname,
  "para:signals": new URL("./signals.js", import.meta.url).pathname,
  "bun:wrap": new URL("./wrap.js", import.meta.url).pathname,
  "para:parallel": new URL("./parallel.js", import.meta.url).pathname,
  "para:simd": new URL("./simd.js", import.meta.url).pathname,
  "parabun:gpu": new URL("./gpu.js", import.meta.url).pathname,
  "parabun:llm": new URL("./llm.js", import.meta.url).pathname,
};
