// Hardcoded module "bun:pipeline"
//
// Parabun: lazy streaming combinators for the `|>` operator.
//
//   import { map, filter, take, collect } from "bun:pipeline";
//   const out = await (source |> map(double) |> filter(even) |> take(10) |> collect);
//
// Every combinator returns an async generator that consumes any iterable or
// async iterable and yields lazily — nothing runs until a terminal (collect,
// reduce, forEach, toArray) pulls. Pure functions are the intended input but
// not enforced at runtime.
//
// Tier 2 (auto-accel): when the source is a Float32Array or Float64Array and
// the chain is a run of `map`s, each `map` extends a FusedChain descriptor
// instead of wrapping the previous layer in another async generator. The
// fusion-aware terminals (`collect`, `sum`, `toFloat32Array`,
// `toFloat64Array`) walk the chain, compose affine kernels when possible,
// and dispatch to `bun:simd` as a single pass. Non-fusion-aware combinators
// (filter/take/etc.) still accept a FusedChain because it exposes
// `Symbol.asyncIterator`, so they realize the chain on demand and proceed
// on the existing async-generator path.

const simd = require("./simd.ts");

// bun:gpu is loaded lazily the first time we consider promoting a chain to
// the GPU tier. Keeping it lazy means a pipeline that never grows a big
// Float32Array never pays for backend probing / MSL compilation.
let gpuMod: any = null;
let gpuLookedUp = false;
function getGpu(): any {
  if (gpuLookedUp) return gpuMod;
  gpuLookedUp = true;
  try {
    gpuMod = require("./gpu.ts");
  } catch {
    gpuMod = null;
  }
  return gpuMod;
}

type FArray = Float32Array | Float64Array;
type Source<T> = Iterable<T> | AsyncIterable<T>;
type Stream<T> = AsyncGenerator<T, void, unknown>;
type Transform<T, U> = (source: Source<T>) => Stream<U>;

type FusedMap = { kind: "map"; fn: (x: number, i: number) => number };

interface FusedChain {
  __parabunFused: true;
  source: FArray;
  ops: FusedMap[];
  [Symbol.asyncIterator](): AsyncGenerator<number, void, unknown>;
}

function isFArray(x: unknown): x is FArray {
  return x instanceof Float32Array || x instanceof Float64Array;
}

function isFusedChain(x: unknown): x is FusedChain {
  return typeof x === "object" && x !== null && (x as any).__parabunFused === true;
}

function makeChain(source: FArray, ops: FusedMap[]): FusedChain {
  return {
    __parabunFused: true,
    source,
    ops,
    async *[Symbol.asyncIterator](): AsyncGenerator<number, void, unknown> {
      const realized = realizeChain(this as FusedChain);
      for (let i = 0; i < realized.length; i++) yield realized[i];
    },
  };
}

const AFFINE_TOL = 1e-5;

function probeAffine(fn: (x: number, i: number) => number): { k1: number; k0: number } | null {
  if (typeof fn !== "function") return null;
  if (fn.length > 1) return null;
  try {
    const g = fn as (x: number) => number;
    const yn1 = g(-1);
    const y0 = g(0);
    const y1 = g(1);
    const y2 = g(2);
    if (!Number.isFinite(yn1) || !Number.isFinite(y0) || !Number.isFinite(y1) || !Number.isFinite(y2)) return null;
    const k1 = y1 - y0;
    const k0 = y0;
    if (Math.abs(y2 - (2 * k1 + k0)) > AFFINE_TOL * (1 + Math.abs(y2))) return null;
    if (Math.abs(yn1 - (-k1 + k0)) > AFFINE_TOL * (1 + Math.abs(yn1))) return null;
    return { k1, k0 };
  } catch {
    return null;
  }
}

// Attempt to collapse all ops in the chain into a single affine (K, C) such
// that chain(x) === x * K + C. Returns null if any op is non-affine or index-
// dependent. (y = x*a+b then y*c+d = x*(a*c) + (b*c+d).)
function composeAffineChain(ops: FusedMap[]): { K: number; C: number } | null {
  let K = 1;
  let C = 0;
  for (const op of ops) {
    const aff = probeAffine(op.fn);
    if (aff === null) return null;
    K = K * aff.k1;
    C = C * aff.k1 + aff.k0;
  }
  return { K, C };
}

// Tier 3 — GPU dispatch for f32 affine chains. When the fused chain
// collapses to a single `x*K + C` and the backend beats bun:simd at this
// size, route the single affine pass to the GPU (one kernel launch vs
// two SIMD passes: mulScalar + addScalar). Non-affine chains and f64
// stay on bun:simd — neither Metal nor CUDA ship a kernel for them yet.
function affineGpuF32(source: Float32Array, K: number, C: number): Float32Array | null {
  const gpu = getGpu();
  if (gpu === null) return null;
  try {
    if (!gpu.winsForSize("simdMap", source.length, 4)) return null;
    return gpu.simdMap((x: number) => K * x + C, source);
  } catch {
    return null;
  }
}

function realizeChain(chain: FusedChain): FArray {
  const { source, ops } = chain;
  if (ops.length === 0) return source;
  const aff = composeAffineChain(ops);
  if (aff !== null) {
    const { K, C } = aff;
    if (K === 1 && C === 0) return source;
    if (source instanceof Float32Array) {
      const gpuOut = affineGpuF32(source, K, C);
      if (gpuOut !== null) return gpuOut;
    }
    if (C === 0) return simd.mulScalar(source, K);
    if (K === 1) return simd.addScalar(source, C);
    const scaled = simd.mulScalar(source, K);
    return simd.addScalar(scaled, C);
  }
  const composed = (x: number, i: number) => {
    let v = x;
    for (const op of ops) v = op.fn(v, i);
    return v;
  };
  return simd.simdMap(composed, source);
}

function sumChain(chain: FusedChain): number {
  const { source, ops } = chain;
  if (ops.length === 0) return simd.sum(source);
  const aff = composeAffineChain(ops);
  if (aff !== null) {
    return aff.K * simd.sum(source) + aff.C * source.length;
  }
  return simd.sum(realizeChain(chain));
}

function reduceChain(chain: FusedChain, reduceFn: (acc: any, x: any) => any, init: any): any {
  const { source, ops } = chain;
  if (ops.length === 0) {
    let acc = init;
    for (let i = 0; i < source.length; i++) acc = reduceFn(acc, source[i]);
    return acc;
  }
  const composed = (x: number, i: number) => {
    let v = x;
    for (const op of ops) v = op.fn(v, i);
    return v;
  };
  let acc = init;
  for (let i = 0; i < source.length; i++) acc = reduceFn(acc, composed(source[i], i));
  return acc;
}

function map<T, U>(fn: (x: T, i: number) => U | Promise<U>): Transform<T, U> {
  const transform: any = function (source: any): any {
    if (isFArray(source)) {
      return makeChain(source, [{ kind: "map", fn: fn as any }]);
    }
    if (isFusedChain(source)) {
      return makeChain(source.source, [...source.ops, { kind: "map", fn: fn as any }]);
    }
    return (async function* (): Stream<U> {
      let i = 0;
      for await (const x of source as Source<T>) {
        yield await fn(x, i++);
      }
    })();
  };
  transform.__pbTag = "map";
  transform.__pbFn = fn;
  return transform;
}

function filter<T>(pred: (x: T, i: number) => boolean | Promise<boolean>): Transform<T, T> {
  const transform: any = async function* (source: Source<T>): Stream<T> {
    let i = 0;
    for await (const x of source) {
      if (await pred(x, i++)) yield x;
    }
  };
  transform.__pbTag = "filter";
  transform.__pbFn = pred;
  return transform;
}

function take<T>(n: number): Transform<T, T> {
  return async function* (source: Source<T>): Stream<T> {
    if (n <= 0) return;
    let i = 0;
    for await (const x of source) {
      yield x;
      if (++i >= n) return;
    }
  };
}

function drop<T>(n: number): Transform<T, T> {
  return async function* (source: Source<T>): Stream<T> {
    let i = 0;
    for await (const x of source) {
      if (i++ < n) continue;
      yield x;
    }
  };
}

function takeWhile<T>(pred: (x: T) => boolean | Promise<boolean>): Transform<T, T> {
  return async function* (source: Source<T>): Stream<T> {
    for await (const x of source) {
      if (!(await pred(x))) return;
      yield x;
    }
  };
}

function dropWhile<T>(pred: (x: T) => boolean | Promise<boolean>): Transform<T, T> {
  return async function* (source: Source<T>): Stream<T> {
    let dropping = true;
    for await (const x of source) {
      if (dropping) {
        if (await pred(x)) continue;
        dropping = false;
      }
      yield x;
    }
  };
}

function flat<T>(): Transform<Iterable<T> | AsyncIterable<T>, T> {
  return async function* (source: Source<Iterable<T> | AsyncIterable<T>>): Stream<T> {
    for await (const inner of source) {
      for await (const x of inner) yield x;
    }
  };
}

function flatMap<T, U>(fn: (x: T, i: number) => Source<U> | Promise<Source<U>>): Transform<T, U> {
  return async function* (source: Source<T>): Stream<U> {
    let i = 0;
    for await (const x of source) {
      const inner = await fn(x, i++);
      for await (const y of inner) yield y;
    }
  };
}

function chunk<T>(size: number): Transform<T, T[]> {
  if (size <= 0) throw new RangeError("chunk: size must be > 0");
  return async function* (source: Source<T>): Stream<T[]> {
    let buf: T[] = [];
    for await (const x of source) {
      buf.push(x);
      if (buf.length === size) {
        yield buf;
        buf = [];
      }
    }
    if (buf.length > 0) yield buf;
  };
}

function tap<T>(fn: (x: T, i: number) => unknown): Transform<T, T> {
  return async function* (source: Source<T>): Stream<T> {
    let i = 0;
    for await (const x of source) {
      await fn(x, i++);
      yield x;
    }
  };
}

// Terminals — these consume a source and return a Promise of a value.

async function collect<T>(source: Source<T> | FArray | FusedChain): Promise<T[]> {
  if (isFusedChain(source)) {
    const realized = realizeChain(source);
    const out: T[] = new Array(realized.length);
    for (let i = 0; i < realized.length; i++) out[i] = realized[i] as any;
    return out;
  }
  if (isFArray(source)) {
    const out: T[] = new Array(source.length);
    for (let i = 0; i < source.length; i++) out[i] = source[i] as any;
    return out;
  }
  const out: T[] = [];
  for await (const x of source as Source<T>) out.push(x);
  return out;
}

function reduce<T, A>(fn: (acc: A, x: T, i: number) => A | Promise<A>, init: A) {
  const terminal: any = async function (source: Source<T>): Promise<A> {
    if (isFusedChain(source)) {
      return reduceChain(source, fn as any, init);
    }
    let acc = init;
    let i = 0;
    for await (const x of source) {
      acc = await fn(acc, x, i++);
    }
    return acc;
  };
  terminal.__pbTag = "reduce";
  terminal.__pbFn = fn;
  terminal.__pbInit = init;
  return terminal;
}

function forEach<T>(fn: (x: T, i: number) => unknown | Promise<unknown>) {
  return async function (source: Source<T>): Promise<void> {
    let i = 0;
    for await (const x of source) {
      await fn(x, i++);
    }
  };
}

async function count<T>(source: Source<T>): Promise<number> {
  let n = 0;
  for await (const _ of source) n++;
  return n;
}

async function sum(source: Source<number> | FArray | FusedChain): Promise<number> {
  if (isFusedChain(source)) return sumChain(source);
  if (isFArray(source)) return simd.sum(source);
  let s = 0;
  for await (const x of source as Source<number>) s += x as number;
  return s;
}

async function toFloat32Array(source: Source<number> | FArray | FusedChain): Promise<Float32Array> {
  if (isFusedChain(source)) {
    const realized = realizeChain(source);
    return realized instanceof Float32Array ? realized : new Float32Array(realized);
  }
  if (source instanceof Float32Array) return source;
  if (source instanceof Float64Array) return new Float32Array(source);
  const buf: number[] = [];
  for await (const x of source as Source<number>) buf.push(x);
  return new Float32Array(buf);
}

async function toFloat64Array(source: Source<number> | FArray | FusedChain): Promise<Float64Array> {
  if (isFusedChain(source)) {
    const realized = realizeChain(source);
    return realized instanceof Float64Array ? realized : new Float64Array(realized);
  }
  if (source instanceof Float64Array) return source;
  if (source instanceof Float32Array) return new Float64Array(source);
  const buf: number[] = [];
  for await (const x of source as Source<number>) buf.push(x);
  return new Float64Array(buf);
}

// `range(stop)` / `range(start, stop[, step])` — a lazy integer source.
function* range(a: number, b?: number, step: number = 1): Iterable<number> {
  const start = b === undefined ? 0 : a;
  const stop = b === undefined ? a : b;
  if (step === 0) throw new RangeError("range: step must not be 0");
  if (step > 0) {
    for (let i = start; i < stop; i += step) yield i;
  } else {
    for (let i = start; i > stop; i += step) yield i;
  }
}

// `pipe(source, ...transforms)` — eager application for users who prefer a
// call-style API over `|>`.
function pipe<T>(source: Source<T>, ...transforms: Array<(s: any) => any>): any {
  let out: any = source;
  for (const t of transforms) out = t(out);
  return out;
}

// ---------------------------------------------------------------------------
// pipeParallel — parallel pipeline execution via bun:parallel
//
// Inspects tagged stages to identify parallelizable segments:
// - Consecutive `map` stages are composed into a single function and
//   dispatched via `pmap` (data parallelism across workers).
// - A terminal `reduce` is dispatched via `preduce`.
// - Non-parallelizable stages (filter, take, drop, etc.) act as barriers:
//   data is collected, the barrier runs serially, and the next parallel
//   segment picks up the output.
// - Untagged (opaque) stages fall back to serial streaming.
//
// For small inputs (< 256 items), falls back to serial `pipe`.
// ---------------------------------------------------------------------------

const PARALLEL_THRESHOLD = 256;

const parallel = require("./parallel.ts");

function composeFnSources(fns: Array<(x: any, i: number) => any>): (x: any, i: number) => any {
  if (fns.length === 1) return fns[0];
  const sources = fns.map(f => f.toString());
  return (0, eval)(
    "(function(x,i){var __f=[" + sources.join(",") + "],v=x;for(var j=0;j<__f.length;j++)v=__f[j](v,i);return v})",
  );
}

async function materialize(source: any): Promise<any[]> {
  if ($isJSArray(source)) return source;
  if (isFusedChain(source)) {
    const realized = realizeChain(source);
    const out = new Array(realized.length);
    for (let i = 0; i < realized.length; i++) out[i] = realized[i];
    return out;
  }
  if (isFArray(source)) {
    const out = new Array(source.length);
    for (let i = 0; i < source.length; i++) out[i] = source[i];
    return out;
  }
  if (source != null && typeof source[Symbol.iterator] === "function") {
    return Array.from(source);
  }
  if (source != null && typeof source[Symbol.asyncIterator] === "function") {
    const out: any[] = [];
    for await (const x of source) out.push(x);
    return out;
  }
  throw new TypeError("pipeParallel: source must be iterable");
}

type Segment =
  | { kind: "maps"; fns: Array<(x: any, i: number) => any> }
  | { kind: "filter"; fn: (x: any, i: number) => boolean }
  | { kind: "reduce"; fn: (acc: any, x: any, i: number) => any; init: any }
  | { kind: "opaque"; transform: (s: any) => any };

function classifyStages(stages: Array<(s: any) => any>): Segment[] {
  const segments: Segment[] = [];
  let pendingMaps: Array<(x: any, i: number) => any> = [];

  for (const stage of stages) {
    const tag = (stage as any).__pbTag;
    if (tag === "map") {
      pendingMaps.push((stage as any).__pbFn);
    } else {
      if (pendingMaps.length > 0) {
        segments.push({ kind: "maps", fns: pendingMaps });
        pendingMaps = [];
      }
      if (tag === "filter") {
        segments.push({ kind: "filter", fn: (stage as any).__pbFn });
      } else if (tag === "reduce") {
        segments.push({ kind: "reduce", fn: (stage as any).__pbFn, init: (stage as any).__pbInit });
      } else {
        segments.push({ kind: "opaque", transform: stage });
      }
    }
  }
  if (pendingMaps.length > 0) {
    segments.push({ kind: "maps", fns: pendingMaps });
  }
  return segments;
}

async function pipeParallel<T>(source: Source<T>, ...stages: Array<(s: any) => any>): Promise<any> {
  if (stages.length === 0) return materialize(source);

  let data = await materialize(source);

  if (data.length < PARALLEL_THRESHOLD) {
    let out: any = data;
    for (const s of stages) out = s(out);
    if (out != null && typeof out.then === "function") out = await out;
    if (out != null && typeof out[Symbol.asyncIterator] === "function") {
      const arr: any[] = [];
      for await (const x of out) arr.push(x);
      return arr;
    }
    return out;
  }

  const segments = classifyStages(stages);

  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si];
    switch (seg.kind) {
      case "maps": {
        const next = segments[si + 1];
        if (next && next.kind === "reduce") {
          const composed = composeFnSources(seg.fns);
          return parallel.preduce(next.fn, data, next.init, { mapFn: composed });
        }
        const composed = composeFnSources(seg.fns);
        data = await parallel.pmap(composed, data);
        break;
      }
      case "filter": {
        const fn = seg.fn;
        data = data.filter((x: any, i: number) => fn(x, i));
        break;
      }
      case "reduce": {
        return parallel.preduce(seg.fn, data, seg.init);
      }
      case "opaque": {
        let result = seg.transform(data);
        if (result != null && typeof result.then === "function") result = await result;
        if (result != null && typeof result[Symbol.asyncIterator] === "function") {
          const arr: any[] = [];
          for await (const x of result) arr.push(x);
          data = arr;
        } else if ($isJSArray(result)) {
          data = result;
        } else {
          return result;
        }
        break;
      }
    }
  }

  return data;
}

export default {
  map,
  filter,
  take,
  drop,
  takeWhile,
  dropWhile,
  flat,
  flatMap,
  chunk,
  tap,
  collect,
  reduce,
  forEach,
  count,
  sum,
  toFloat32Array,
  toFloat64Array,
  range,
  pipe,
  pipeParallel,
};
