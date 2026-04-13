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

type Source<T> = Iterable<T> | AsyncIterable<T>;
type StreamFn<T> = (x: T, i: number) => unknown;
type Stream<T> = AsyncGenerator<T, void, unknown>;
type Transform<T, U> = (source: Source<T>) => Stream<U>;

function map<T, U>(fn: (x: T, i: number) => U | Promise<U>): Transform<T, U> {
  return async function* (source: Source<T>): Stream<U> {
    let i = 0;
    for await (const x of source) {
      yield await fn(x, i++);
    }
  };
}

function filter<T>(pred: (x: T, i: number) => boolean | Promise<boolean>): Transform<T, T> {
  return async function* (source: Source<T>): Stream<T> {
    let i = 0;
    for await (const x of source) {
      if (await pred(x, i++)) yield x;
    }
  };
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

async function collect<T>(source: Source<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const x of source) out.push(x);
  return out;
}

function reduce<T, A>(fn: (acc: A, x: T, i: number) => A | Promise<A>, init: A) {
  return async function (source: Source<T>): Promise<A> {
    let acc = init;
    let i = 0;
    for await (const x of source) {
      acc = await fn(acc, x, i++);
    }
    return acc;
  };
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
  range,
  pipe,
};
