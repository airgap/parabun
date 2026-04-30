// Hardcoded module "para:parallel"
//
// Parabun: parallel map over arrays via a Worker pool. The mapping function
// must be pure (no closures, no `this`, no impure globals). We ship it to the
// worker by calling `.toString()`, which is only sound because the function
// is pure by contract.

const signalsMod = require("./signals.ts");

// Structural Signal types — keep this module agnostic of para:signals's
// class hierarchy. Same shape as audio.ts / camera.ts / vision.ts / rtp.ts.
type Signal<T> = {
  get(): T;
  peek(): T;
  subscribe(cb: (v: T) => void): () => void;
};
type WritableSignal<T> = Signal<T> & { set(v: T): void };
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

// `pmapPool` is the implicit pool that pmap/preduce ramp up under demand.
// Renamed from `pool` to free that name for the public `pool()` factory
// below. The two pools don't share state — pmap workers run the
// stringify-fn protocol; user pools run the module-path protocol.
let pmapPool: PoolWorker[] = [];
let poolUrl: string | null = null;

function ensurePool(size: number): PoolWorker[] {
  if (poolUrl === null) {
    const blob = new Blob([WORKER_SRC], { type: "application/javascript" });
    poolUrl = URL.createObjectURL(blob);
  }
  while (pmapPool.length < size) {
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
    pmapPool.push(entry);
  }
  return pmapPool;
}

function disposeWorkers(): void {
  for (const p of pmapPool) p.w.terminate();
  pmapPool = [];
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

// ─── User-managed worker pool (module-path dispatch) ──────────────────────
// A persistent pool whose workers preload a TypeScript / JavaScript module
// at startup. Dispatch is by exported-function name — no source stringi-
// fication, no eval per call. This is the "real" worker pool that lifts
// the pmap/preduce ceiling for callers who already have their work
// organized in modules.
//
//   const p = pool({ size: 8, module: import.meta.resolve("./worker-utils.ts") });
//   const result = await p.run("processItem", item);
//   p.dispose();
//
// Module path MUST be an absolute file URL or absolute path — the worker
// has no notion of the caller's CWD and Blob-URL workers can't resolve
// relative imports against the source module.

const POOL_WORKER_SRC = `
let __ns = null;
self.onmessage = async ({ data }) => {
  const { id, type } = data;
  try {
    if (type === "init") {
      __ns = await import(data.modulePath);
      self.postMessage({ id, ok: true });
      return;
    }
    if (type === "run") {
      if (__ns === null) throw new Error("pool worker not initialized");
      const fn = __ns[data.fnName] ?? __ns.default?.[data.fnName];
      if (typeof fn !== "function") throw new Error("function not exported: " + data.fnName);
      const result = await fn.apply(undefined, data.args);
      self.postMessage({ id, ok: true, result });
      return;
    }
    throw new Error("unknown message type: " + type);
  } catch (err) {
    self.postMessage({ id, ok: false, err: err && err.message ? String(err.message) : String(err) });
  }
};
`;

interface PoolWorkerEntry {
  w: Worker;
  busy: boolean;
  /**
   * Stays `true` until the worker reports init success. Tracked separately
   * from `busy` so dispose() can distinguish "still initializing" from
   * "running a user call" — only the latter has a user-facing pending
   * promise to reject. A failed init turns into a rejected `initOk` and
   * the worker stays unusable; future run() calls won't dispatch to it.
   */
  initId: number;
  initOk: boolean | null; // null = pending, true = ready, false = failed
}

interface PendingCall {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
}

/**
 * Reactive surface on the persistent worker pool (LYK-741/764). Three
 * Signal-shaped fields update synchronously at every state-mutation site
 * (init, run-dispatch, drainQueue, message return, dispose). Useful for a
 * monitoring dashboard that wants to show pool utilization without polling.
 */
interface PoolSignals {
  /** Number of workers in the pool that have completed init successfully. */
  workersCount: { get(): number; peek(): number; subscribe(cb: (v: number) => void): () => void };
  /** Number of run-requests waiting on an idle worker. */
  queued: { get(): number; peek(): number; subscribe(cb: (v: number) => void): () => void };
  /** Number of run-requests currently executing on workers. */
  inflight: { get(): number; peek(): number; subscribe(cb: (v: number) => void): () => void };
}

interface Pool {
  /** Run an exported function on an idle worker. Resolves with the function's return value. */
  run<T = unknown>(fnName: string, ...args: unknown[]): Promise<T>;
  /**
   * Chunk an array and dispatch each chunk to a different worker via a
   * named export. The export takes one chunk (an array) and returns a
   * mapped chunk; map() concatenates the results in source order.
   *
   * Closure-aware (the user's module evaluates in workers with full scope
   * — imports, module-level state, the works) and persistent (workers
   * are reused across map / reduce / run calls). This is the v2 path on
   * top of the persistent Pool: closures and shared state cross naturally
   * because the function lives in a real module file rather than being
   * eval'd from `fn.toString()`.
   *
   *   // worker.js
   *   import { lookupTable } from "./lookups.js";
   *   export function scoreChunk(rows) {
   *     return rows.map(r => r.value * lookupTable[r.key]);
   *   }
   *
   *   // main
   *   await using p = parallel.pool({ module: "/abs/worker.js", size: 8 });
   *   const scores = await p.map("scoreChunk", rows);
   */
  map<T = unknown, U = unknown>(fnName: string, array: readonly T[], opts?: { chunks?: number }): Promise<U[]>;
  /**
   * Chunk an array and reduce. Each worker receives a chunk and folds it
   * with the named export, returning a partial. Partials are then merged
   * pairwise on the main thread via a second named export.
   *
   *   // worker.js
   *   export function sumChunk(rows) {
   *     let s = 0;
   *     for (const r of rows) s += r.value;
   *     return s;
   *   }
   *   export function sumMerge(a, b) {
   *     return a + b;
   *   }
   *
   *   // main
   *   const total = await p.reduce("sumChunk", "sumMerge", rows);
   */
  reduce<T = unknown, A = unknown>(
    chunkFn: string,
    mergeFn: string,
    array: readonly T[],
    opts?: { chunks?: number; init?: A },
  ): Promise<A>;
  /** Terminate all workers and reject any pending calls. */
  dispose(): void;
  /** Number of workers in the pool. */
  readonly size: number;
  /** Reactive diagnostic signals (LYK-741/764). */
  readonly signals: PoolSignals;
  /** AsyncDisposable so callers can `await using p = pool(...)`. */
  [Symbol.asyncDispose](): Promise<void>;
}

function pool(opts: { size?: number; module: string }): Pool {
  const moduleArg = opts?.module;
  if (typeof moduleArg !== "string" || moduleArg.length === 0) {
    throw new TypeError("para:parallel pool: `module` must be an absolute path or file: URL string");
  }
  // Heuristic: reject obviously-relative paths early so callers don't get a
  // confusing "module not found" from the worker. Bare specifiers (e.g.
  // package names) are allowed; they resolve from the worker context.
  if (moduleArg.startsWith("./") || moduleArg.startsWith("../")) {
    throw new TypeError(
      "para:parallel pool: `module` must be absolute — relative paths can't resolve in a worker. " +
        'Use `import.meta.resolve("./...")` or `path.resolve(...)`.',
    );
  }

  const size = Math.max(1, Math.floor(opts.size ?? defaultConcurrency()));

  // One blob URL per pool — keeps the worker source isolated from the
  // pmap pool and lets dispose() revoke it cleanly.
  const blob = new Blob([POOL_WORKER_SRC], { type: "application/javascript" });
  const blobUrl = URL.createObjectURL(blob);

  let nextId = 1;
  // `pending` only holds run-call promises. Init responses are matched
  // against an entry's `initId` field instead, so dispose() can reject
  // pending run calls without touching init state.
  const pending = new Map<number, PendingCall>();
  let disposed = false;
  let initFailureMessage: string | null = null;

  // Reactive diagnostic signals (LYK-741/764). Updated synchronously at
  // every state-mutation site below: makeWorker init-response, run dispatch,
  // drainQueue dispatch, message return, dispose.
  const sigWorkersCount: WritableSignal<number> = signalsMod.signal(0);
  const sigQueued: WritableSignal<number> = signalsMod.signal(0);
  const sigInflight: WritableSignal<number> = signalsMod.signal(0);
  function syncPoolSignals(): void {
    let ready = 0;
    for (const e of workers) if (e.initOk === true) ready++;
    if (sigWorkersCount.peek() !== ready) sigWorkersCount.set(ready);
    if (sigQueued.peek() !== queue.length) sigQueued.set(queue.length);
    if (sigInflight.peek() !== pending.size) sigInflight.set(pending.size);
  }

  function makeWorker(): PoolWorkerEntry {
    const w = new Worker(blobUrl);
    if (typeof w.unref === "function") w.unref();

    w.onmessage = (ev: MessageEvent) => {
      const { id, ok, result, err } = ev.data ?? {};
      const entry = workers.find(e => e.w === w);
      // Init response — handled per-entry, not via `pending`.
      if (entry && id === entry.initId) {
        entry.initOk = ok === true;
        if (!ok) {
          // Init failure means the worker can't be used. Leave busy=true
          // so the dispatcher skips it; surface to any future run() with
          // a clear error rather than queueing forever.
          initFailureMessage = err || "pool worker init failed";
          // Reject any queued calls — they'll never run on this worker
          // and there's no way to recover. Re-check after every init
          // failure so a slow-init worker that succeeds later still gets
          // the queue if that's what ends up happening.
          if (workers.every(e => e.initOk === false)) {
            for (const c of queue) c.reject(new Error(initFailureMessage));
            queue.length = 0;
          }
        } else {
          entry.busy = false;
          drainQueue();
        }
        if (typeof w.unref === "function") w.unref();
        syncPoolSignals();
        return;
      }
      // Run-call response.
      const p = pending.get(id);
      if (!p) return;
      pending.delete(id);
      if (entry) entry.busy = false;
      if (typeof w.unref === "function") w.unref();
      drainQueue();
      syncPoolSignals();
      if (ok) p.resolve(result);
      else p.reject(new Error(err || "pool worker failed"));
    };
    w.onerror = (ev: ErrorEvent) => {
      // Worker-level error (e.g. JSC startup failure). Reject any pending
      // run calls bound to this specific worker. Init-time errors come
      // through onmessage with ok:false so they're handled above; this
      // path is for runtime-killed workers.
      const entry = workers.find(e => e.w === w);
      if (entry) entry.busy = false;
      // Best-effort: reject all pending if we can't tell which call was
      // on this worker (we don't currently track that mapping).
      for (const [id, p] of pending) {
        pending.delete(id);
        p.reject(new Error(ev.message || "pool worker error"));
      }
    };

    const initId = nextId++;
    w.postMessage({ id: initId, type: "init", modulePath: moduleArg });
    if (typeof w.ref === "function") w.ref();
    return { w, busy: true, initId, initOk: null };
  }

  const workers: PoolWorkerEntry[] = [];
  for (let i = 0; i < size; i++) workers.push(makeWorker());

  // FIFO queue of run-requests waiting for an idle worker.
  type QueuedCall = { fnName: string; args: unknown[]; resolve: (v: unknown) => void; reject: (e: Error) => void };
  const queue: QueuedCall[] = [];

  function drainQueue(): void {
    let mutated = false;
    while (queue.length > 0) {
      const idle = workers.find(e => e.initOk === true && !e.busy);
      if (!idle) break;
      const call = queue.shift()!;
      idle.busy = true;
      const id = nextId++;
      pending.set(id, { resolve: call.resolve, reject: call.reject });
      if (typeof idle.w.ref === "function") idle.w.ref();
      idle.w.postMessage({ id, type: "run", fnName: call.fnName, args: call.args });
      mutated = true;
    }
    if (mutated) syncPoolSignals();
  }

  function run<T>(fnName: string, ...args: unknown[]): Promise<T> {
    if (disposed) return Promise.reject(new Error("para:parallel pool: disposed"));
    // If every worker failed init, fail fast — queueing forever is worse.
    if (workers.length > 0 && workers.every(e => e.initOk === false)) {
      return Promise.reject(new Error(initFailureMessage ?? "para:parallel pool: all workers failed to init"));
    }
    return new Promise<T>((resolve, reject) => {
      // A worker is dispatchable only when its init has succeeded
      // (initOk === true) AND it's not already busy with a run call. Init-
      // pending workers are skipped — drainQueue picks up the call when
      // their init message returns.
      const idle = workers.find(e => e.initOk === true && !e.busy);
      if (idle) {
        idle.busy = true;
        const id = nextId++;
        pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
        if (typeof idle.w.ref === "function") idle.w.ref();
        idle.w.postMessage({ id, type: "run", fnName, args });
      } else {
        queue.push({ fnName, args, resolve: resolve as (v: unknown) => void, reject });
      }
      syncPoolSignals();
    });
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    for (const e of workers) e.w.terminate();
    workers.length = 0;
    // Reject pending RUN calls (init pending entries don't live in
    // `pending` anymore — their promises are tied to the worker entry
    // and just become unobservable after terminate()).
    for (const [, p] of pending) p.reject(new Error("para:parallel pool: disposed"));
    pending.clear();
    // Reject queued run calls so the user's awaiting promises terminate.
    for (const c of queue) c.reject(new Error("para:parallel pool: disposed"));
    queue.length = 0;
    URL.revokeObjectURL(blobUrl);
    syncPoolSignals();
  }

  // Chunk-based fan-out helpers. Each chunk crosses the worker boundary
  // intact (one postMessage per chunk), so the named export handles a
  // batch rather than per-element calls. That amortizes the per-call
  // dispatch overhead across the chunk size.
  function chunkBounds(len: number, requested?: number): number[] {
    if (len === 0) return [];
    const target = Math.max(1, Math.floor(requested ?? Math.max(1, workers.length || 1)));
    const chunks = Math.min(len, target);
    const base = Math.floor(len / chunks);
    const extra = len % chunks;
    const bounds: number[] = [0];
    let cursor = 0;
    for (let c = 0; c < chunks; c++) {
      cursor += base + (c < extra ? 1 : 0);
      bounds.push(cursor);
    }
    return bounds;
  }

  async function map<T, U>(fnName: string, array: readonly T[], opts?: { chunks?: number }): Promise<U[]> {
    if (typeof fnName !== "string" || fnName.length === 0) {
      throw new TypeError("para:parallel pool.map: fnName must be a non-empty string");
    }
    if (!Array.isArray(array)) {
      throw new TypeError("para:parallel pool.map: array must be a JS array");
    }
    const len = array.length;
    if (len === 0) return [];
    const bounds = chunkBounds(len, opts?.chunks);
    const promises: Array<Promise<U[]>> = [];
    for (let c = 0; c < bounds.length - 1; c++) {
      const slice = (array as T[]).slice(bounds[c], bounds[c + 1]);
      promises.push(run<U[]>(fnName, slice));
    }
    const partials = await Promise.all(promises);
    let total = 0;
    for (const p of partials) total += (p as U[]).length;
    const out: U[] = new Array(total);
    let offset = 0;
    for (const p of partials) {
      for (let i = 0; i < (p as U[]).length; i++) out[offset + i] = (p as U[])[i];
      offset += (p as U[]).length;
    }
    return out;
  }

  async function reduce<T, A>(
    chunkFn: string,
    mergeFn: string,
    array: readonly T[],
    opts?: { chunks?: number; init?: A },
  ): Promise<A> {
    if (typeof chunkFn !== "string" || chunkFn.length === 0) {
      throw new TypeError("para:parallel pool.reduce: chunkFn must be a non-empty string");
    }
    if (typeof mergeFn !== "string" || mergeFn.length === 0) {
      throw new TypeError("para:parallel pool.reduce: mergeFn must be a non-empty string");
    }
    if (!Array.isArray(array)) {
      throw new TypeError("para:parallel pool.reduce: array must be a JS array");
    }
    const len = array.length;
    const init = opts?.init;
    if (len === 0) return init as A;

    const bounds = chunkBounds(len, opts?.chunks);
    const promises: Array<Promise<A>> = [];
    for (let c = 0; c < bounds.length - 1; c++) {
      const slice = (array as T[]).slice(bounds[c], bounds[c + 1]);
      promises.push(run<A>(chunkFn, slice));
    }
    const partials = await Promise.all(promises);

    // Merge pairwise via the named merge fn. Run the merge on the workers
    // too — most merges are tiny (sum of numbers, union of sets) so the
    // overhead is comparable to running on the main thread, but using
    // workers means the merge doesn't block other code on the main thread.
    let acc: A = init !== undefined ? init : (partials.shift() as A);
    for (const p of partials) {
      acc = await run<A>(mergeFn, acc, p);
    }
    return acc;
  }

  return {
    run,
    map,
    reduce,
    dispose,
    get size() {
      return workers.length;
    },
    signals: {
      workersCount: sigWorkersCount as Signal<number>,
      queued: sigQueued as Signal<number>,
      inflight: sigInflight as Signal<number>,
    },
    [Symbol.asyncDispose]: async () => {
      dispose();
    },
  };
}

// ─── Shared-memory primitives ──────────────────────────────────────────────
// Mutex + Semaphore on top of Atomics.waitAsync/notify. The backing
// SharedArrayBuffer is exposed via `.sab` so the same primitive can be
// shared with workers (just postMessage the SAB and re-wrap on the other
// side: `new Mutex(receivedSab)`).
//
// These are non-reentrant: a holder calling lock() a second time will
// deadlock against itself. Match Web's Lock API which has the same
// semantics. Recursive locking would need a separate class with a
// holder-id tracker, and that's not what most use cases want.

interface MutexSnapshot {
  __bunMutex: true;
  sab: SharedArrayBuffer;
}

class Mutex {
  // A 1-int32 view into a SharedArrayBuffer. Value 0 = unlocked, 1 = locked.
  // We hold both the SAB (so we can hand it to workers) and the typed view
  // (so Atomics.* calls don't have to re-construct it per call).
  readonly sab: SharedArrayBuffer;
  readonly #view: Int32Array;

  /**
   * Construct a fresh mutex (default), or wrap an existing
   * SharedArrayBuffer received from another thread.
   */
  constructor(sab?: SharedArrayBuffer) {
    if (sab !== undefined) {
      if (sab.byteLength < 4) throw new RangeError("para:parallel: Mutex SAB must be >= 4 bytes");
      this.sab = sab;
    } else {
      this.sab = new SharedArrayBuffer(4);
    }
    this.#view = new Int32Array(this.sab, 0, 1);
  }

  /**
   * Acquire the lock. Resolves when the lock is held by this caller.
   * Multiple awaiting callers are woken in unspecified order — the kernel
   * decides; do not rely on FIFO.
   */
  async lock(): Promise<void> {
    const v = this.#view;
    for (;;) {
      // Fast path: try to flip 0 → 1 with a single atomic compareExchange.
      if (Atomics.compareExchange(v, 0, 0, 1) === 0) return;
      // Slow path: wait until someone notifies us that the lock changed.
      // waitAsync returns sync if the value already moved off 1.
      const r = Atomics.waitAsync(v, 0, 1);
      if (r.async) {
        const reason = await r.value;
        if (reason === "timed-out") continue; // shouldn't happen — we passed no timeout
      }
      // Loop and retry the CAS.
    }
  }

  /**
   * Try to acquire the lock without blocking. Returns `true` if acquired,
   * `false` if it was already held.
   */
  tryLock(): boolean {
    return Atomics.compareExchange(this.#view, 0, 0, 1) === 0;
  }

  /**
   * Release the lock and wake up to one waiter. Calling unlock() on a
   * mutex you don't hold is undefined behavior (we can't cheaply detect
   * it without tracking holder identity).
   */
  unlock(): void {
    Atomics.store(this.#view, 0, 0);
    Atomics.notify(this.#view, 0, 1);
  }

  /**
   * Run `fn` while holding the lock. Acquires before calling, releases on
   * either return or throw. Returns whatever `fn` returns.
   */
  async with<T>(fn: () => T | Promise<T>): Promise<T> {
    await this.lock();
    try {
      return await fn();
    } finally {
      this.unlock();
    }
  }

  /** True if the lock is currently held by some caller. */
  get locked(): boolean {
    return Atomics.load(this.#view, 0) !== 0;
  }

  /**
   * Snapshot for postMessage / structured-clone. Pass the result to the
   * `Mutex` constructor on the receiving thread to wrap the same lock.
   */
  toJSON(): MutexSnapshot {
    return { __bunMutex: true, sab: this.sab };
  }
}

interface SemaphoreSnapshot {
  __bunSemaphore: true;
  sab: SharedArrayBuffer;
}

class Semaphore {
  // Counter semaphore. Value = number of free permits. acquire() takes
  // one (wait if zero), release() returns one (wake one waiter).
  readonly sab: SharedArrayBuffer;
  readonly #view: Int32Array;

  constructor(initialPermits: number, sab?: SharedArrayBuffer) {
    if (!Number.isInteger(initialPermits) || initialPermits < 0) {
      throw new RangeError("para:parallel: Semaphore initialPermits must be a non-negative integer");
    }
    if (sab !== undefined) {
      if (sab.byteLength < 4) throw new RangeError("para:parallel: Semaphore SAB must be >= 4 bytes");
      this.sab = sab;
    } else {
      this.sab = new SharedArrayBuffer(4);
      // Initialize the counter on a fresh SAB. Wrapping an existing SAB
      // skips this — the constructor in another thread will see whatever
      // the originating thread already set up.
      const init = new Int32Array(this.sab, 0, 1);
      Atomics.store(init, 0, initialPermits);
    }
    this.#view = new Int32Array(this.sab, 0, 1);
  }

  /** Try to take one permit synchronously. Returns true if taken. */
  tryAcquire(): boolean {
    const v = this.#view;
    for (;;) {
      const cur = Atomics.load(v, 0);
      if (cur <= 0) return false;
      if (Atomics.compareExchange(v, 0, cur, cur - 1) === cur) return true;
      // CAS lost — another thread took or returned a permit. Retry.
    }
  }

  /** Take one permit, waiting if none are free. */
  async acquire(): Promise<void> {
    const v = this.#view;
    for (;;) {
      const cur = Atomics.load(v, 0);
      if (cur > 0) {
        if (Atomics.compareExchange(v, 0, cur, cur - 1) === cur) return;
        // Lost CAS race; retry without sleeping.
        continue;
      }
      // No permits available — wait for someone to release one.
      const r = Atomics.waitAsync(v, 0, 0);
      if (r.async) {
        const reason = await r.value;
        if (reason === "timed-out") continue;
      }
      // Loop and retry the CAS.
    }
  }

  /** Return one permit, waking one waiter (if any). */
  release(): void {
    Atomics.add(this.#view, 0, 1);
    Atomics.notify(this.#view, 0, 1);
  }

  /**
   * Run `fn` while holding one permit. Acquires before, releases on
   * return or throw.
   */
  async with<T>(fn: () => T | Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  /** Current number of free permits. Snapshot — may change immediately. */
  get permits(): number {
    return Atomics.load(this.#view, 0);
  }

  toJSON(): SemaphoreSnapshot {
    return { __bunSemaphore: true, sab: this.sab };
  }
}

export default { pmap, preduce, disposeWorkers, _heuristicState, _resetHeuristic, Mutex, Semaphore, pool };
