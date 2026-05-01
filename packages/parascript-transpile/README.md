# @parascript/transpile

Standalone transpiler for [ParaScript](https://para.script.dev) — turns `.pts` source into standard JavaScript that runs anywhere via [`parabun-browser-shims`](https://www.npmjs.com/package/parabun-browser-shims). No Parabun runtime required at build time.

The canonical ParaScript transpiler lives inside the [Parabun](https://parabun.script.dev) fork of Bun (Zig). This package is a TypeScript reimplementation, intended for projects that don't (or can't) install Parabun on their build host: browsers, Lambda, Cloudflare Workers, Deno, Node, the [ParaScript playground](https://para.script.dev/play).

## Status — v0.0.1

Early. Covers the structural desugarings; **does not yet implement the bare-read sugar** (rewriting `count` to `count.get()` inside tracked contexts), so user code must call `.get()` / `.set()` explicitly until v0.2.

| Feature | Status |
| --- | --- |
| `..!` / `..&` (catch / finally chain operators) | ✅ |
| `\|>` pipeline operator | planned (v0.0.2) |
| `..` / `..=` ranges | planned (v0.0.2) |
| `pure` keyword strip | planned (v0.0.2) |
| `signal NAME = EXPR;` declaration | planned (v0.0.3) |
| `effect { … }` block | planned (v0.0.3) |
| `when EXPR { … }` / paired form | planned (v0.0.3) |
| `~>` / `->` reactive bindings | planned (v0.0.3) |
| `defer` / `defer await` | planned (v0.0.4) |
| `memo` declarator | planned (v0.0.4) |
| `arena { … }` block | planned (v0.0.4) |
| **bare-read sugar** (`x` → `x.get()`) | needs scope analysis — v0.2 |

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
