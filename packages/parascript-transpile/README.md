# @parascript/transpile

Standalone transpiler for [ParaScript](https://para.script.dev) — turns `.pts` source into standard JavaScript that runs anywhere via [`parabun-browser-shims`](https://www.npmjs.com/package/parabun-browser-shims). No Parabun runtime required at build time.

The canonical ParaScript transpiler lives inside the [Parabun](https://parabun.script.dev) fork of Bun (Zig). This package is a TypeScript reimplementation, intended for projects that don't (or can't) install Parabun on their build host: browsers, Lambda, Cloudflare Workers, Deno, Node, the [ParaScript playground](https://para.script.dev/play).

## Status — IN DEVELOPMENT, not yet released

`package.json` is `private: true` and version `0.0.0-dev`. We don't ship a partial transpiler — the npm publish gate stays closed until every ParaScript desugaring listed below works end-to-end and matches the canonical Zig parser's output.

| Feature | Status |
| --- | --- |
| `..!` / `..&` (catch / finally chain operators) | ✅ |
| `\|>` pipeline operator | ✅ |
| `..` / `..=` ranges | ✅ |
| `pure` keyword strip | ✅ |
| `signal NAME = EXPR;` declaration | ✅ |
| `effect { … }` block | ✅ |
| `when EXPR { … }` / paired form | ✅ |
| `~>` / `->` reactive bindings | ✅ |
| `defer` / `defer await` | ✅ |
| `memo` declarator | ✅ |
| `arena { … }` block | ✅ |
| **bare-read sugar** (`x` → `x.get()`) | ✅ |
| `signal x = expr-with-signals` auto-promotes to derived | ✅ |
| Parity test against canonical Zig parser output | ✅ (11/12 fixtures byte-equivalent after normalization) |
| `bun:wrap` import injection for runtime helpers | ✅ |
| `defer` byte-parity to canonical `using` polyfill | intentional divergence — see below |

### Intentional divergence: `defer` lowering

For `defer EXPR;` and `defer await EXPR;`, this transpiler emits ES2024
`using` / `await using` declarations directly:

```js
using __paraDefer0 = __parabunDefer0(() => cleanup());
await using __paraDefer1 = __parabunAsyncDefer0(async () => flush());
```

The canonical Zig parser inlines the `using` polyfill (try/catch/finally
wrappers + `__using` helper calls) so the output runs on ES2018+. The
runtime semantics are identical; the lowering shape differs.

Modern hosts handle ES2024 `using` natively (Bun, Node 22+, current
browsers), and every mainstream bundler (esbuild, swc, Babel,
TypeScript) downlevels `using` for older targets. The standalone
trusts the host bundler/runtime to handle the polyfill; this is the
Parity skip-list entry for `defer.pts`.

## Install

```bash
npm install @parascript/transpile parabun-browser-shims
```

## Use

```ts
import { transpile } from "@parascript/transpile";

const js = transpile(`
  const handler = err => console.error(err);
  const result = fetch("/api").then(r => r.json()) ..! handler;
`);

// js is standard ES2022:
//   const handler = err => console.error(err);
//   const result = fetch("/api").then(r => r.json()).catch(handler);
```

## CLI

```bash
parascript transpile src/main.pts > dist/main.js
parascript transpile < src/main.pts > dist/main.js
```

## License

MIT
