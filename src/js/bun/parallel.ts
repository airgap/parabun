// Hardcoded module "bun:parallel"
//
// Parabun: parallel map over arrays via a Worker pool. The mapping function
// must be pure (no closures, no `this`, no impure globals). We ship it to the
// worker by calling `.toString()`, which is only sound because the function
// is pure by contract.
//
// Pool lifecycle:
//   The pool is lazy and persistent — workers are spawned on the first
//   `pmap` call that needs them, then kept alive for reuse across subsequent
//   calls. Each worker caches compiled kernels by source string, so repeat
//   invocations with the same function skip the `eval` step. Call
//   `disposeWorkers()` to tear the pool down explicitly (e.g. in tests or
//   before process exit).

type MapFn<T, U> = (value: T, index: number) => U | Promise<U>;

interface PMapOptions {
  concurrency?: number;
}

const MAX_DEFAULT_CONCURRENCY = 8;

function defaultConcurrency(): number {
  // @ts-ignore navigator is available in Bun
  const hc = typeof navigator !== "undefined" ? navigator.hardwareConcurrency : 0;
  if (typeof hc === "number" && hc > 0) return Math.min(hc, MAX_DEFAULT_CONCURRENCY);
  return 4;
}

// Worker source. The worker caches compiled fns by source string so that
// repeated pmap() calls with the same fn skip the eval() step entirely.
// Handles pmap (regular + SAB TypedArray) and preduce messages.
const WORKER_SRC = `
const __cache = new Map();
const __ctors = {
  f32: Float32Array, f64: Float64Array,
  i32: Int32Array, u32: Uint32Array,
  i16: Int16Array, u16: Uint16Array,
  i8: Int8Array, u8: Uint8Array,
  u8c: Uint8ClampedArray,
};
self.onmessage = async ({ data }) => {
  const { id, fnSrc } = data;
  let fn = __cache.get(fnSrc);
  if (!fn) {
    fn = (0, eval)("(" + fnSrc + ")");
    __cache.set(fnSrc, fn);
  }
  try {
    if (data.op === "reduce") {
      var mapFn = null;
      if (data.mapFnSrc) {
        mapFn = __cache.get(data.mapFnSrc);
        if (!mapFn) {
          mapFn = (0, eval)("(" + data.mapFnSrc + ")");
          __cache.set(data.mapFnSrc, mapFn);
        }
      }
      var acc = data.init;
      if (data.reduceSab !== undefined) {
        var Ctor = __ctors[data.elemType];
        var input = new Ctor(data.reduceSab, data.byteStart, data.count);
        for (var i = 0; i < data.count; i++) {
          var v = mapFn ? mapFn(input[i], data.baseIndex + i) : input[i];
          acc = fn(acc, v, data.baseIndex + i);
        }
      } else {
        var items = data.items, baseIndex = data.baseIndex;
        for (var i = 0; i < items.length; i++) {
          var v = mapFn ? mapFn(items[i], baseIndex + i) : items[i];
          acc = await fn(acc, v, baseIndex + i);
        }
      }
      self.postMessage({ id, ok: true, acc });
    } else if (data.inputSab !== undefined) {
      var Ctor = __ctors[data.elemType];
      var input = new Ctor(data.inputSab, data.byteStart, data.count);
      var output = new Ctor(data.outputSab, data.byteStart, data.count);
      for (var i = 0; i < data.count; i++) {
        output[i] = fn(input[i], data.baseIndex + i);
      }
      self.postMessage({ id, ok: true });
    } else {
      var items = data.items, baseIndex = data.baseIndex;
      var out = new Array(items.length);
      for (var i = 0; i < items.length; i++) {
        out[i] = await fn(items[i], baseIndex + i);
      }
      self.postMessage({ id, ok: true, out });
    }
  } catch (err) {
    self.postMessage({ id, ok: false, err: err && err.message ? String(err.message) : String(err) });
  }
};
`;

type PoolWorker = {
  w: Worker;
  busy: boolean;
  resolve: ((data: any) => void) | null;
  reject: ((err: Error) => void) | null;
};

let pool: PoolWorker[] = [];
let poolUrl: string | null = null;

function ensurePool(size: number): PoolWorker[] {
  if (poolUrl === null) {
    const blob = new Blob([WORKER_SRC], { type: "application/javascript" });
    poolUrl = URL.createObjectURL(blob);
  }
  while (pool.length < size) {
    const w = new Worker(poolUrl);
    // Unref so an idle pool doesn't keep the event loop alive — Bun would
    // otherwise wait forever for "live" workers after the user's last pmap()
    // resolves. Re-ref while a job is in flight so the process won't exit
    // mid-task.
    if (typeof w.unref === "function") w.unref();
    const entry: PoolWorker = {
      w,
      busy: false,
      resolve: null,
      reject: null,
    };
    entry.w.onmessage = (ev: MessageEvent) => {
      const { data } = ev;
      const resolve = entry.resolve;
      const reject = entry.reject;
      entry.busy = false;
      entry.resolve = null;
      entry.reject = null;
      if (typeof entry.w.unref === "function") entry.w.unref();
      if (data && data.ok) resolve?.(data);
      else reject?.(new Error(data?.err ?? "pmap worker failed"));
    };
    entry.w.onerror = (ev: ErrorEvent) => {
      const reject = entry.reject;
      entry.busy = false;
      entry.resolve = null;
      entry.reject = null;
      if (typeof entry.w.unref === "function") entry.w.unref();
      reject?.(new Error(ev.message || "pmap worker error"));
    };
    pool.push(entry);
  }
  return pool;
}

function disposeWorkers(): void {
  for (const p of pool) p.w.terminate();
  pool = [];
  if (poolUrl !== null) {
    URL.revokeObjectURL(poolUrl);
    poolUrl = null;
  }
}

// ---------------------------------------------------------------------------
// SharedArrayBuffer scratch pool (LYK-716)
//
// SABs are reused across pmap calls to avoid repeated allocation. The pool
// is a simple sorted free-list capped at SAB_POOL_MAX entries.
// ---------------------------------------------------------------------------

const SAB_POOL_MAX = 8;
const sabPool: SharedArrayBuffer[] = [];

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

function borrowSab(bytes: number): SharedArrayBuffer {
  for (let i = 0; i < sabPool.length; i++) {
    if (sabPool[i].byteLength >= bytes) {
      return sabPool.splice(i, 1)[0];
    }
  }
  return new SharedArrayBuffer(Math.max(65536, nextPow2(bytes)));
}

function returnSab(sab: SharedArrayBuffer): void {
  if (sabPool.length < SAB_POOL_MAX) {
    sabPool.push(sab);
    sabPool.sort((a, b) => a.byteLength - b.byteLength);
  }
}

// ---------------------------------------------------------------------------
// TypedArray detection
// ---------------------------------------------------------------------------

type ElemType = "f32" | "f64" | "i32" | "u32" | "i16" | "u16" | "i8" | "u8" | "u8c";

function getElemType(arr: unknown): ElemType | null {
  if (arr instanceof Float32Array) return "f32";
  if (arr instanceof Float64Array) return "f64";
  if (arr instanceof Int32Array) return "i32";
  if (arr instanceof Uint32Array) return "u32";
  if (arr instanceof Int16Array) return "i16";
  if (arr instanceof Uint16Array) return "u16";
  if (arr instanceof Int8Array) return "i8";
  if (arr instanceof Uint8Array) return "u8";
  if (arr instanceof Uint8ClampedArray) return "u8c";
  return null;
}

// ---------------------------------------------------------------------------
// Adaptive-concurrency heuristic
// ---------------------------------------------------------------------------

const SERIAL_THRESHOLD_NS = 1_000_000;
const TWO_WORKER_NS = 2_000_000;
const FOUR_WORKER_NS = 10_000_000;
const PROBE_MAX_ITEMS = 64;
const PROBE_MAX_NS = 1_000_000;
const EMA_ALPHA = 0.3;

const perItemEma = new Map<string, number>();

function updateEma(fnSrc: string, sampleNs: number): void {
  const prior = perItemEma.get(fnSrc);
  if (prior === undefined) {
    perItemEma.set(fnSrc, sampleNs);
  } else {
    perItemEma.set(fnSrc, (1 - EMA_ALPHA) * prior + EMA_ALPHA * sampleNs);
  }
}

function chooseWorkers(estTotalNs: number, len: number): number {
  if (estTotalNs < SERIAL_THRESHOLD_NS) return 0;
  if (estTotalNs < TWO_WORKER_NS) return Math.min(len, 2);
  if (estTotalNs < FOUR_WORKER_NS) return Math.min(len, 4);
  return Math.min(len, defaultConcurrency());
}

function _heuristicState(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of perItemEma) out[k] = v;
  return out;
}

function _resetHeuristic(): void {
  perItemEma.clear();
}

// ---------------------------------------------------------------------------
// pmap — main entry point
// ---------------------------------------------------------------------------

async function pmap<T, U>(fn: MapFn<T, U>, array: readonly T[], options?: PMapOptions): Promise<U[]> {
  if (!$isCallable(fn)) {
    throw new TypeError("pmap: first argument must be a function");
  }

  // TypedArray fast path: SAB-backed zero-copy transfer
  const elemType = getElemType(array);
  if (elemType !== null) {
    return pmapTyped(fn as any, array as any, elemType, options) as any;
  }

  if (!$isJSArray(array)) {
    throw new TypeError("pmap: second argument must be an array or TypedArray");
  }

  const len = array.length;
  if (len === 0) return [];

  const requested = options?.concurrency;
  const fnSrc = fn.toString();

  if (typeof requested === "number" && requested > 0) {
    const requestedInt = Math.max(1, Math.min(len, requested));
    if (requestedInt === 1) {
      return await runInline(fn, fnSrc, array, 0, new Array(len));
    }
    return dispatchWorkers(fn, fnSrc, array, 0, []);
  }

  const prior = perItemEma.get(fnSrc);
  if (prior !== undefined) {
    const workers = chooseWorkers(prior * len, len);
    if (workers === 0) {
      return await runInline(fn, fnSrc, array, 0, new Array(len));
    }
    return dispatchWorkers(fn, fnSrc, array, workers, []);
  }

  const probeTarget = Math.min(len, PROBE_MAX_ITEMS);
  const result: U[] = new Array(len);
  const probeStart = Bun.nanoseconds();
  let probed = 0;
  for (; probed < probeTarget; probed++) {
    const r = fn(array[probed], probed) as U | Promise<U>;
    if (r !== null && typeof r === "object" && typeof (r as any).then === "function") {
      result[probed] = await (r as Promise<U>);
    } else {
      result[probed] = r as U;
    }
    if (Bun.nanoseconds() - probeStart >= PROBE_MAX_NS) {
      probed++;
      break;
    }
  }
  const probeElapsed = Bun.nanoseconds() - probeStart;
  const perItem = probed > 0 ? probeElapsed / probed : 0;
  updateEma(fnSrc, perItem);

  if (probed === len) return result;

  const remaining = len - probed;
  const workers = chooseWorkers(perItem * remaining, remaining);
  if (workers === 0) return runInline(fn, fnSrc, array, probed, result);
  return dispatchWorkers(fn, fnSrc, array, workers, result.slice(0, probed));
}

// ---------------------------------------------------------------------------
// TypedArray pmap — SAB-backed zero-copy path
// ---------------------------------------------------------------------------

// For TypedArrays the dispatch overhead with SAB is much lower than
// structured clone (~10x), so we use lower thresholds.
const TYPED_SERIAL_THRESHOLD = 1000;

async function pmapTyped(
  fn: (value: number, index: number) => number,
  array: any,
  elemType: ElemType,
  options?: PMapOptions,
): Promise<any> {
  const len = array.length;
  if (len === 0) return new array.constructor(0);

  const fnSrc = fn.toString();
  const requested = options?.concurrency;

  // Small arrays or explicit concurrency=1 → inline
  if (len < TYPED_SERIAL_THRESHOLD || (typeof requested === "number" && requested === 1)) {
    return runTypedInline(fn, array);
  }

  const concurrency =
    typeof requested === "number" && requested > 1 ? Math.min(len, requested) : Math.min(len, defaultConcurrency());

  return dispatchTypedWorkers(fnSrc, array, elemType, concurrency);
}

function runTypedInline(fn: (value: number, index: number) => number, array: any): any {
  const len = array.length;
  const out = new array.constructor(len);
  for (let i = 0; i < len; i++) {
    out[i] = fn(array[i], i);
  }
  return out;
}

async function dispatchTypedWorkers(fnSrc: string, array: any, elemType: ElemType, concurrency: number): Promise<any> {
  const len = array.length;
  const bytesPerElem = array.BYTES_PER_ELEMENT as number;
  const totalBytes = len * bytesPerElem;

  const inputSab = borrowSab(totalBytes);
  const outputSab = borrowSab(totalBytes);

  // One copy: source → input SAB
  const Ctor = array.constructor as any;
  const inputView = new Ctor(inputSab, 0, len);
  inputView.set(array);

  const workers = ensurePool(concurrency);
  const chunkSize = Math.ceil(len / concurrency);

  const pending: Promise<void>[] = [];
  for (let w = 0; w < concurrency; w++) {
    const chunkStart = w * chunkSize;
    if (chunkStart >= len) break;
    const count = Math.min(chunkSize, len - chunkStart);
    const byteStart = chunkStart * bytesPerElem;

    const entry = workers[w];
    entry.busy = true;
    if (typeof entry.w.ref === "function") entry.w.ref();
    pending.push(
      new Promise<void>((resolve, reject) => {
        entry.resolve = () => resolve();
        entry.reject = reject;
        entry.w.postMessage({
          id: w,
          fnSrc,
          inputSab,
          outputSab,
          elemType,
          byteStart,
          count,
          baseIndex: chunkStart,
        });
      }),
    );
  }

  await Promise.all(pending);

  // One copy: output SAB → result TypedArray
  const outputView = new Ctor(outputSab, 0, len);
  const result = new Ctor(len);
  result.set(outputView);

  returnSab(inputSab);
  returnSab(outputSab);

  return result;
}

// ---------------------------------------------------------------------------
// Regular array dispatch (unchanged)
// ---------------------------------------------------------------------------

async function runInline<T, U>(
  fn: MapFn<T, U>,
  fnSrc: string,
  array: readonly T[],
  start: number,
  out: U[],
): Promise<U[]> {
  const len = array.length;
  const t0 = Bun.nanoseconds();
  for (let i = start; i < len; i++) {
    const r = fn(array[i], i) as U | Promise<U>;
    if (r !== null && typeof r === "object" && typeof (r as any).then === "function") {
      out[i] = await (r as Promise<U>);
    } else {
      out[i] = r as U;
    }
  }
  const observed = len - start;
  if (observed > 0) updateEma(fnSrc, (Bun.nanoseconds() - t0) / observed);
  return out;
}

async function dispatchWorkers<T, U>(
  _fn: MapFn<T, U>,
  fnSrc: string,
  array: readonly T[],
  workers: number,
  prefix: U[],
): Promise<U[]> {
  const len = array.length;
  const remainingStart = prefix.length;
  const remainingLen = len - remainingStart;
  const concurrency = workers > 0 ? workers : Math.min(remainingLen, defaultConcurrency());
  const pool = ensurePool(concurrency);
  const chunkSize = Math.ceil(remainingLen / concurrency);

  const pending: Promise<{ id: number; out: U[] }>[] = [];
  for (let w = 0; w < concurrency; w++) {
    const chunkStart = remainingStart + w * chunkSize;
    if (chunkStart >= len) break;
    const chunkEnd = Math.min(chunkStart + chunkSize, len);
    const items = array.slice(chunkStart, chunkEnd);
    const entry = pool[w];
    entry.busy = true;
    if (typeof entry.w.ref === "function") entry.w.ref();
    pending.push(
      new Promise((resolve, reject) => {
        entry.resolve = (data: any) => resolve({ id: w, out: data.out });
        entry.reject = reject;
        entry.w.postMessage({ id: w, fnSrc, items, baseIndex: chunkStart });
      }),
    );
  }

  const chunks = await Promise.all(pending);
  const result: U[] = new Array(len);
  for (let i = 0; i < prefix.length; i++) result[i] = prefix[i];
  for (const { id, out } of chunks) {
    const chunkStart = remainingStart + id * chunkSize;
    for (let i = 0; i < out.length; i++) result[chunkStart + i] = out[i];
  }
  return result;
}

// ---------------------------------------------------------------------------
// preduce — parallel reduce
// ---------------------------------------------------------------------------

type ReduceFn<T, A> = (accumulator: A, value: T, index: number) => A | Promise<A>;

const REDUCE_SERIAL_THRESHOLD = 512;

interface PreduceOptions extends PMapOptions {
  mapFn?: (x: any, i: number) => any;
}

async function preduce<T, A>(
  fn: ReduceFn<T, A>,
  array: readonly T[],
  initialValue: A,
  options?: PreduceOptions,
): Promise<A> {
  if (!$isCallable(fn)) {
    throw new TypeError("preduce: first argument must be a function");
  }

  const mapFn = options?.mapFn;

  const elemType = getElemType(array);
  if (elemType !== null) {
    return preduceTyped(fn as any, array as any, elemType, initialValue as any, options, mapFn) as any;
  }

  if (!$isJSArray(array)) {
    throw new TypeError("preduce: second argument must be an array or TypedArray");
  }

  const len = array.length;
  if (len === 0) return initialValue;

  const fnSrc = fn.toString();
  const mapFnSrc = mapFn ? mapFn.toString() : undefined;
  const requested = options?.concurrency;

  if (len < REDUCE_SERIAL_THRESHOLD || (typeof requested === "number" && requested === 1)) {
    return reduceInline(fn, array, initialValue, 0, mapFn);
  }

  const concurrency =
    typeof requested === "number" && requested > 1 ? Math.min(len, requested) : Math.min(len, defaultConcurrency());

  return dispatchReduceWorkers(fn, fnSrc, array, initialValue, concurrency, mapFnSrc);
}

async function reduceInline<T, A>(
  fn: ReduceFn<T, A>,
  array: readonly T[],
  init: A,
  start: number,
  mapFn?: (x: any, i: number) => any,
): Promise<A> {
  let acc = init;
  for (let i = start; i < array.length; i++) {
    const elem = mapFn ? mapFn(array[i], i) : array[i];
    const r = fn(acc, elem, i) as A | Promise<A>;
    if (r !== null && typeof r === "object" && typeof (r as any).then === "function") {
      acc = await (r as Promise<A>);
    } else {
      acc = r as A;
    }
  }
  return acc;
}

async function dispatchReduceWorkers<T, A>(
  fn: ReduceFn<T, A>,
  fnSrc: string,
  array: readonly T[],
  initialValue: A,
  concurrency: number,
  mapFnSrc?: string,
): Promise<A> {
  const len = array.length;
  const workers = ensurePool(concurrency);
  const chunkSize = Math.ceil(len / concurrency);

  const pending: Promise<{ id: number; acc: A }>[] = [];
  for (let w = 0; w < concurrency; w++) {
    const chunkStart = w * chunkSize;
    if (chunkStart >= len) break;
    const chunkEnd = Math.min(chunkStart + chunkSize, len);
    const items = array.slice(chunkStart, chunkEnd);
    const entry = workers[w];
    entry.busy = true;
    if (typeof entry.w.ref === "function") entry.w.ref();
    pending.push(
      new Promise((resolve, reject) => {
        entry.resolve = (data: any) => resolve({ id: w, acc: data.acc });
        entry.reject = reject;
        entry.w.postMessage({
          id: w,
          fnSrc,
          op: "reduce",
          items,
          baseIndex: chunkStart,
          init: initialValue,
          mapFnSrc,
        });
      }),
    );
  }

  const results = await Promise.all(pending);
  results.sort((a, b) => a.id - b.id);
  let acc = results[0].acc;
  for (let i = 1; i < results.length; i++) {
    acc = fn(acc, results[i].acc as any, -1) as A;
  }
  return acc;
}

// ---------------------------------------------------------------------------
// TypedArray preduce — SAB-backed path
// ---------------------------------------------------------------------------

async function preduceTyped(
  fn: (accumulator: number, value: number, index: number) => number,
  array: any,
  elemType: ElemType,
  initialValue: number,
  options?: PMapOptions,
  mapFn?: (x: any, i: number) => any,
): Promise<number> {
  const len = array.length;
  if (len === 0) return initialValue;

  const fnSrc = fn.toString();
  const mapFnSrc = mapFn ? mapFn.toString() : undefined;
  const requested = options?.concurrency;

  if (len < REDUCE_SERIAL_THRESHOLD || (typeof requested === "number" && requested === 1)) {
    return reduceTypedInline(fn, array, initialValue, mapFn);
  }

  const concurrency =
    typeof requested === "number" && requested > 1 ? Math.min(len, requested) : Math.min(len, defaultConcurrency());

  return dispatchReduceTypedWorkers(fnSrc, array, elemType, initialValue, concurrency, mapFnSrc);
}

function reduceTypedInline(
  fn: (acc: number, value: number, index: number) => number,
  array: any,
  init: number,
  mapFn?: (x: any, i: number) => any,
): number {
  let acc = init;
  for (let i = 0; i < array.length; i++) {
    const v = mapFn ? mapFn(array[i], i) : array[i];
    acc = fn(acc, v, i);
  }
  return acc;
}

async function dispatchReduceTypedWorkers(
  fnSrc: string,
  array: any,
  elemType: ElemType,
  initialValue: number,
  concurrency: number,
  mapFnSrc?: string,
): Promise<number> {
  const len = array.length;
  const bytesPerElem = array.BYTES_PER_ELEMENT as number;
  const totalBytes = len * bytesPerElem;

  const sab = borrowSab(totalBytes);
  const Ctor = array.constructor as any;
  const inputView = new Ctor(sab, 0, len);
  inputView.set(array);

  const workers = ensurePool(concurrency);
  const chunkSize = Math.ceil(len / concurrency);

  const pending: Promise<{ id: number; acc: number }>[] = [];
  for (let w = 0; w < concurrency; w++) {
    const chunkStart = w * chunkSize;
    if (chunkStart >= len) break;
    const count = Math.min(chunkSize, len - chunkStart);
    const byteStart = chunkStart * bytesPerElem;

    const entry = workers[w];
    entry.busy = true;
    if (typeof entry.w.ref === "function") entry.w.ref();
    pending.push(
      new Promise<{ id: number; acc: number }>((resolve, reject) => {
        entry.resolve = (data: any) => resolve({ id: w, acc: data.acc });
        entry.reject = reject;
        entry.w.postMessage({
          id: w,
          fnSrc,
          op: "reduce",
          reduceSab: sab,
          elemType,
          byteStart,
          count,
          baseIndex: chunkStart,
          init: initialValue,
          mapFnSrc,
        });
      }),
    );
  }

  const results = await Promise.all(pending);
  returnSab(sab);

  results.sort((a, b) => a.id - b.id);

  const fn = (0, eval)("(" + fnSrc + ")") as (acc: number, val: number, idx: number) => number;
  let acc = results[0].acc;
  for (let i = 1; i < results.length; i++) {
    acc = fn(acc, results[i].acc, -1);
  }
  return acc;
}

export default { pmap, preduce, disposeWorkers, _heuristicState, _resetHeuristic };
