# @lyku/para-transpile

TypeScript implementation of Para source transforms. It turns `.pts` source
into JavaScript that uses the matching `@lyku/para-*` runtime packages.
The canonical parser lives in [Parabun](https://parabun.script.dev).

## Availability and validation

This restored package is private and available through this repository's
workspace links. Its version is `0.0.0-dev`; this checkout does not provide
a published npm release or committed build output.

The authored source, tests and parity fixtures were restored from Parabun
commit `cdf7b5d4dfd26f267d358e387a6ed2ebb538f146`, before the package was
deleted. Package references use the current `@lyku/para-*` namespace.
Canonical-parser parity requires separate qualification against the current
checkout. Historical results do not establish current parity.

## Source transforms

The restored implementation includes these transforms. This inventory
describes the source; it is not a current qualification result.

| Syntax                                 | Transformation                             |
| -------------------------------------- | ------------------------------------------ |
| `..!`, `..&`, `..>`                    | Catch, finally and then chains             |
| `\|>`                                  | Pipeline expressions                       |
| `..`, `..=`                            | Ranges                                     |
| `pure`, `fun`                          | Keyword lowering                           |
| `signal`, `effect`, `when`, `~>`, `->` | Reactive declarations, blocks and bindings |
| `defer`, `defer await`                 | Resource disposal                          |
| `memo`, `arena`                        | Memoization and arena blocks               |
| Bare signal reads                      | Signal access and derived expressions      |
| Decimal literals, schema `is`          | Runtime helper expressions                 |
| `using`, `await using`                 | Disposal polyfill and helper injection     |

The `./syntactic` entry exports seven scanner-based transforms without
importing Babel. The full package entry also includes Babel-based passes
for scope-sensitive rewriting and disposal lowering.

### Disposal lowering

`defer EXPR;` and `defer await EXPR;` lower to `using` and `await using`
declarations. A subsequent pass rewrites these to try/catch/finally blocks
and injects `__addDisposableResource` and `__disposeResources` helpers.
This is intended to support hosts without native `using` syntax;
compatibility with those hosts requires separate qualification.

## Workspace use

Install workspace dependencies from the repository root so the LSP and
its local packages share the workspace type dependencies. Consumers can
then import source through the package's `bun` export condition:

```ts
import { transpile } from "@lyku/para-transpile";

const js = transpile(`
  const handler = err => console.error(err);
  const result = fetch("/api").then(r => r.json()) ..! handler;
`);
```

The CLI source in `src/cli.ts` accepts `transpile FILE` or reads standard
input when no file is supplied. The `build` script generates the `dist`
entry points; generated files are not included in this restoration.

Generated entry points use explicit JavaScript extensions so Node can
resolve the package's ESM imports. The source is checked with TypeScript's
`NodeNext` module resolution. After building, Node consumers can import
`@lyku/para-transpile` or its `./syntactic` entry, and run the CLI with
`node dist/cli.js transpile FILE` from the package directory. Integration
tests compile a disposable copy and exercise both exports and the CLI
under Node.

Hosting the compiler under Node does not make every generated program
portable to Node. Some transforms emit `bun:wrap` imports or references to
the matching Para runtime packages; executing those programs requires a
host that provides those helpers.

## License

MIT
