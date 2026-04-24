# parabun-browser-shims

Browser-compatible shims for the `bun:*` modules that Parabun's
parse-time desugarings import:

| Module | Browser fidelity |
|---|---|
| `bun:arena` | No-op. Browsers don't expose GC control — `arena { body }` runs the body inline, same observable behavior. |
| `bun:signals` | Real implementation (~150 LOC). `signal` / `derived` / `effect` / `batch` / `untrack` all work. |
| `bun:wrap` | Real implementation. Carries the `__parabunMemo` / `__parabunDefer0` / `__parabunRange` runtime, including `.forget()` / `.clear()` / `.bypass()` cache invalidation. |
| `bun:parallel` | Sequential fallback. `pmap` / `preduce` run on the main thread; Worker-backed version is future work. |
| `bun:simd` | Scalar JS loops. Correct output; 5–20× slower than native v128 on large TypedArrays. |
| `bun:gpu` | CPU fallback (uses `bun:simd`). Tagged `TODO` for WebGPU / WebGL2 implementations. |
| `bun:llm` | Throws on load with a clear message. A WebGPU port of the Q4_K / Q6_K kernels is possible but substantial work. |

Language surface that *doesn't* need a shim — all of these desugar to
plain JS: `pure`, `memo` (statement and arrow forms), `|>`, `..=`,
`..!`, `..&`, `..` (range), `defer` / `defer await` (compile to ES2024
`using`), `throw` as expression.

## Install

```sh
npm i parabun-browser-shims
```

## Bundler alias — Vite

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { bunAliases } from "parabun-browser-shims";

export default defineConfig({
  resolve: { alias: bunAliases },
});
```

## Bundler alias — esbuild

```ts
import * as esbuild from "esbuild";
import { bunAliases } from "parabun-browser-shims";

await esbuild.build({
  entryPoints: ["src/app.pts"],
  bundle: true,
  outfile: "dist/app.js",
  alias: bunAliases,
});
```

## Bundler alias — Webpack

```ts
// webpack.config.ts
import { bunAliases } from "parabun-browser-shims";

export default {
  resolve: { alias: bunAliases },
};
```

## Bundler alias — Rollup

```ts
import alias from "@rollup/plugin-alias";
import { bunAliases } from "parabun-browser-shims";

export default {
  plugins: [alias({ entries: bunAliases })],
};
```

## Upgrading a shim

Each module is a single `src/*.js` file. Swap the CPU fallback for a
WebGPU / WebGL2 backend where it matters (most sensible candidates:
`bun:gpu` matVec, `bun:simd` via WASM v128, `bun:parallel` via Web
Workers backed by SharedArrayBuffer). The API surface mirrors
upstream, so a drop-in replacement for any single shim is local to
that file.

## License

MIT.
