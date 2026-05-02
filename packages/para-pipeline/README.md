# @para/pipeline

Lazy streaming combinators for the `|>` operator. `map`, `filter`, `take`, `collect`, `sum`, `reduce`, `forEach` over any iterable or async iterable.

```js
import { map, filter, take, collect } from "@para/pipeline";

const out = await (
  source
  |> map(double)
  |> filter(even)
  |> take(10)
  |> collect
);
```

Without the `.pts` `|>` syntax, the same chain is plain function composition:

```js
const out = await collect(take(10)(filter(even)(map(double)(source))));
```

## Fusion

When the source is a `Float32Array` or `Float64Array`, adjacent `map` calls extend a fused chain instead of wrapping each layer in another async generator. Fusion-aware terminals (`collect`, `sum`, `toFloat32Array`, `toFloat64Array`) walk the chain, compose affine kernels when possible, and dispatch to `@para/simd` as a single pass.

```js
import { map, sum } from "@para/pipeline";
const arr = new Float32Array([1, 2, 3, 4]);
await (arr |> map(x => x * 2) |> map(x => x + 1) |> sum); // single SIMD pass
```

## On the ParaBun runtime

Single-affine chains (`x*K + C` collapsed) on Float32Array sources opportunistically promote to `parabun:gpu` when it's available and `gpu.winsForSize(...)` says yes. The lookup is dynamic and silently falls back to `@para/simd` when `parabun:gpu` isn't resolvable (Node, browsers, anywhere outside ParaBun) — same code path either way.

## Status

`private:true / 0.0.0-dev` — pending the workspace split. See [parabun.script.dev](https://parabun.script.dev) for the runtime-bundled story today.
