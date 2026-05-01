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
| **bare-read sugar** (`x` → `x.get()`) | not started — needs scope analysis |
| `signal x = expr-with-signals` auto-promotes to derived | not started — needs scope analysis |
| Parity test against canonical Zig parser output | not started |

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
