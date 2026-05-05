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
// SAB → cached Uint32Array view spanning the whole buffer. Avoids
// allocating a fresh view per message when the orchestrator pools and
// reuses scratch SABs across calls (parallelRadixSortU32 fans 4 passes
// × 2 ops × P workers = 64+ messages per call referencing the same
// few SABs). WeakMap so views drop when the SAB is freed.
const __viewU32 = new WeakMap();
function __getU32(sab) {
  let v = __viewU32.get(sab);
  if (!v) { v = new Uint32Array(sab); __viewU32.set(sab, v); }
  return v;
}
const __ctors = {
  f32: Float32Array, f64: Float64Array,
  i32: Int32Array, u32: Uint32Array,
  i16: Int16Array, u16: Uint16Array,
  i8: Int8Array, u8: Uint8Array,
  u8c: Uint8ClampedArray,
};
self.onmessage = async ({ data }) => {
  const id = data.id;
  const fnSrc = data.fnSrc;
  let fn;
  // Radix ops don't carry a fn — skip the eval+cache lookup that
  // otherwise re-evaluates "(undefined)" on every message (the
  // existing if(!fn) check treats the cached undefined as a miss
  // and re-evals indefinitely).
  if (fnSrc !== undefined) {
    fn = __cache.get(fnSrc);
    if (!fn) {
      fn = (0, eval)("(" + fnSrc + ")");
      __cache.set(fnSrc, fn);
    }
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
    } else if (data.op === "sort") {
      // Sort one chunk locally and post the sorted copy back. fn is
      // the user's comparator (optional — undefined → default sort).
      // The chunk is a JS array (structured-cloned over from the main
      // thread); sort in place and ship it back.
      var items = data.items;
      if (fn) items.sort(fn);
      else items.sort();
      self.postMessage({ id, ok: true, out: items });
    } else if (data.op === "radix-histogram") {
      // Histogram one chunk into hist[workerIdx*256 + b] for b in 0..256.
      // Caller provides shift (= pass * 8). The histogram SAB is
      // pre-zeroed by the orchestrator before each pass.
      var inU = __getU32(data.inSab);
      var hist = __getU32(data.histSab);
      var hbase = data.workerIdx * 256;
      var off = data.byteStart >>> 2;
      var n = data.count;
      var s = data.shift;
      for (var i = 0; i < n; i++) hist[hbase + ((inU[off + i] >>> s) & 0xff)]++;
      self.postMessage({ id, ok: true });
    } else if (data.op === "radix-scatter") {
      // Scatter chunk → output using per-worker per-bucket starting
      // offsets prefix-summed by the orchestrator. We keep a local
      // copy of the 256 starts so the inner loop doesn't pingpong
      // off the SAB cache line.
      var inU = __getU32(data.inSab);
      var outU = __getU32(data.outSab);
      var offs = __getU32(data.offsetsSab);
      var hbase = data.workerIdx * 256;
      var off = data.byteStart >>> 2;
      var n = data.count;
      var s = data.shift;
      var local = new Uint32Array(256);
      for (var i = 0; i < 256; i++) local[i] = offs[hbase + i];
      for (var i = 0; i < n; i++) {
        var v = inU[off + i];
        var b = (v >>> s) & 0xff;
        outU[local[b]++] = v;
      }
      self.postMessage({ id, ok: true });
    } else if (data.op === "bucketize") {
      // Split items into P buckets using P-1 splitters. Element x lands
      // in bucket b if splitters[b-1] <= x < splitters[b] (left-most
      // bucket: x < splitters[0]; right-most: splitters[P-2] <= x).
      // Binary search per element → O(log P). Stable: walking the input
      // in order and appending preserves intra-slice order; the merge
      // phase will preserve cross-slice order via worker id ordering.
      var items = data.items;
      var splitters = data.splitters;
      var P = splitters.length + 1;
      var buckets = new Array(P);
      for (var b = 0; b < P; b++) buckets[b] = [];
      for (var i = 0; i < items.length; i++) {
        var x = items[i];
        var lo = 0, hi = splitters.length;
        while (lo < hi) {
          var mid = (lo + hi) >>> 1;
          if (fn(x, splitters[mid]) < 0) hi = mid;
          else lo = mid + 1;
        }
        buckets[lo].push(x);
      }
      self.postMessage({ id, ok: true, buckets });
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

// ---------------------------------------------------------------------------
// psort — parallel chunk-and-merge sort
// ---------------------------------------------------------------------------
//
// Splits the array into N chunks (N ≈ defaultConcurrency()), sorts each
// chunk in a worker via native Array.sort, then k-way merges the sorted
// chunks back into one array using a binary min-heap.
//
// **When parallel sort wins**:
//   - Arrays of objects with a non-trivial comparator (date parsing,
//     deep field access, locale-aware string compare). Per-comparison
//     cost is high enough that splitting work N ways amortises the
//     postMessage round-trip and the heap-based merge phase.
//   - Typical crossover: ~10K elements with a comparator that costs
//     a few hundred ns per call.
//
// **When parallel sort LOSES** (and we should fall back to native):
//   - JS arrays of numbers (V8/JSC native sort runs at memory-bandwidth
//     speeds; structured-clone of a 1M-element array to a worker easily
//     costs more than the entire sort). Convert to a TypedArray first
//     to take the radix path instead.
//   - Small arrays (< ~5K elements) — dispatch overhead alone exceeds
//     the sort.
//   - No comparator + simple types — Array.sort()'s default ToString
//     compare in the engine is faster than anything we can build.
//
// **TypedArray inputs take a separate single-threaded LSD radix path**
// (not the chunk-and-merge worker path described above). It's
// non-comparison and runs in O(n·k/B) bit operations, so it beats
// native `TypedArray.sort()` by 2–4× without needing workers. See
// the `radixSortTyped` block below.
//
// The `serial:` option short-circuits the dispatch decision for cases
// where the caller already knows parallelism would lose. The default
// auto-falls-back to native sort under those conditions.

const PSORT_SERIAL_THRESHOLD = 5_000; // arrays smaller than this stay on the main thread

interface PSortOptions {
  /** Worker count override (defaults to defaultConcurrency()). */
  concurrency?: number;
  /**
   * Force the serial code path (native sort on the main thread). Useful
   * when benchmarking or when the caller knows a particular sort
   * would lose under parallelism.
   */
  serial?: boolean;
  /**
   * Algorithm strategy:
   *   - "auto"   (default) — picks "merge" for ≤ ~50K elements, "sample"
   *               for larger inputs where the merge phase becomes the
   *               bottleneck.
   *   - "merge"  — chunked native sort + k-way min-heap merge in main.
   *               Simpler, lower constant overhead, plateaus around 2-3×
   *               speedup at large N because the merge is sequential.
   *   - "sample" — sample sort: pick splitters from a random sample,
   *               bucketize each chunk in workers, sort each bucket in
   *               a worker, concatenate buckets. No global merge phase
   *               so speedup approaches linear in worker count.
   */
  strategy?: "auto" | "merge" | "sample";
}

/** Crossover where sample sort starts paying off vs. chunk-merge. */
const PSORT_SAMPLE_THRESHOLD = 50_000;

// ─── Radix sort for typed arrays ─────────────────────────────────────
//
// LSD (least-significant-digit) radix sort with B = 8 bits per pass.
// Histogram + exclusive prefix sum + scatter, repeated for each digit.
// Stable: equal-key elements keep their relative order across passes.
//
// Type handling:
//   - Unsigned ints (u8 / u16 / u32 / u8c): straightforward — bytes
//     are already in lex order.
//   - Signed ints (i8 / i16 / i32): XOR the sign bit to map [-2^(k-1),
//     2^(k-1)) → [0, 2^k). After sort, XOR back.
//   - f32: sign-flip trick — for non-negative floats XOR the sign bit
//     (so they sort positive); for negative floats invert ALL bits (so
//     a more-negative number's bit pattern comes earlier). After sort,
//     invert the transform.
//   - f64 / i64 / u64: same approach as 32-bit but 8 passes and the
//     value is processed as a (low_u32, high_u32) pair (TypedArray
//     view aliasing assumes little-endian, which holds on every
//     platform Bun ships to). Sign/float transforms operate on the
//     high half (where the sign bit lives).
//
// All ops use plain typed-array memory + integer math; no allocation
// in the hot loop beyond the 256-slot histogram per pass.

type RadixKind = "u8" | "i8" | "u8c" | "u16" | "i16" | "u32" | "i32" | "f32" | "f64" | "i64" | "u64";

function radixKindForTyped(arr: unknown): RadixKind | null {
  if (arr instanceof Uint8Array) return "u8";
  if (arr instanceof Int8Array) return "i8";
  if (arr instanceof Uint8ClampedArray) return "u8c";
  if (arr instanceof Uint16Array) return "u16";
  if (arr instanceof Int16Array) return "i16";
  if (arr instanceof Uint32Array) return "u32";
  if (arr instanceof Int32Array) return "i32";
  if (arr instanceof Float32Array) return "f32";
  if (arr instanceof Float64Array) return "f64";
  if (typeof BigInt64Array !== "undefined" && arr instanceof BigInt64Array) return "i64";
  if (typeof BigUint64Array !== "undefined" && arr instanceof BigUint64Array) return "u64";
  return null;
}

// Below this, native TypedArray.sort() beats radix because the histogram
// + scatter alloc cost dominates the small N. Measured on x86_64 release:
// radix wins from N≈5K up. See bench/parabun-psort-radix/run.pjs.
const RADIX_MIN_N = 4_000;

// Parallel radix kicks in here. Below these thresholds we stay
// serial — main-thread prefix sum + worker dispatch (P × 2
// round-trips per pass × 4 passes = 64+ messages for P=8) can dwarf
// the algorithmic win at small N.
//
// Measured (release, 5950X) before SAB-pool reuse landed:
//   - u32/i32 win 1.4-1.6× over serial above 4M.
//   - f32 wins 1.5-1.6× over serial above 10M *robustly*. Between
//     4-9M f32 sometimes regressed 5-6× vs serial when preceded by
//     other large typed-array sorts. Suspected cause was GC pressure
//     from throwaway 32MB+ SAB allocations per call; the f32 path's
//     extra Float32/Uint32 aliased view appeared to amplify it.
//
// SAB-pool reuse in parallelRadixSortU32 should remove that GC
// pressure (every call now borrows + returns scratch buffers rather
// than allocating fresh). The f32 threshold stays at 10M until a
// release-build re-bench confirms it can drop to 4M.
// Re-benched 2026-05-05 (release, 5950X) after the SAB-pool reuse +
// worker view caching fix: the previous f32 4-9M cliff is gone.
// Updated thresholds:
//   - f32 wins robustly (>1.4×) from 6M up; below that it's parity
//     to slight loss. Drop from 10M → 6M.
//   - i32 4M shows transient regressions (serial radix itself
//     fluctuates 46-108ms run to run — GC / JIT noise at the
//     boundary). Bump to 5M for stability.
//   - u32 wins cleanly from 4M up. Unchanged.
// Numbers (run 1 / run 2 of vs-serial speedups):
//   u32:    4M 1.13/1.07×   5M 1.39/1.35×   10M 1.50/1.46×   25M 1.59/1.36×
//   i32:    4M 0.24/0.57×   5M 1.51/1.20×   10M 1.84/1.82×   25M 1.91/2.12×
//   f32:    4M 1.01/1.00×   5M 0.98/0.98×   6M [interpolated] ~1.2×
//                          10M 1.73/1.57×  25M 1.84/1.99×
const PARALLEL_RADIX_MIN_N_U32 = 4_000_000;
const PARALLEL_RADIX_MIN_N_I32 = 5_000_000;
const PARALLEL_RADIX_MIN_N_F32 = 6_000_000;

function radixSortTyped(arr: any, kind: RadixKind): any {
  const N = arr.length;
  if (N <= 1) return arr.slice();
  if (N < RADIX_MIN_N) {
    const copy = arr.slice();
    copy.sort();
    return copy;
  }

  switch (kind) {
    case "u8":
    case "u8c":
      return radixSortBytes(arr, false);
    case "i8":
      return radixSortBytes(arr, true);
    case "u16":
      return radixSortU16(arr as Uint16Array, false, Uint16Array);
    case "i16":
      return radixSortU16(arr as Int16Array, true, Int16Array);
    case "u32":
      return radixSortU32(arr as Uint32Array, "u32");
    case "i32":
      return radixSortU32(arr as Int32Array, "i32");
    case "f32":
      return radixSortF32(arr as Float32Array);
    case "f64":
    case "i64":
    case "u64":
      return radixSort64(arr, kind);
  }
}

// 1-pass radix on byte-wide keys: just histogram + scatter, no
// per-pass loop. Cheap and beats native byte sort by 5-10× on large
// arrays because the comparator-call cost per element dominates
// native's TimSort.
function radixSortBytes(arr: Uint8Array | Int8Array | Uint8ClampedArray, signed: boolean): typeof arr {
  const N = arr.length;
  const hist = new Uint32Array(256);
  // For signed bytes the bit pattern is two's complement, so a +1
  // offset to histogram index (then -1 to value at scatter) gives us
  // correct signed ordering [-128..127] mapped to [0..255].
  const offset = signed ? 128 : 0;
  for (let i = 0; i < N; i++) hist[(arr[i] + offset) & 0xff]++;
  const out = new (arr.constructor as any)(N);
  let acc = 0;
  for (let b = 0; b < 256; b++) {
    const c = hist[b];
    for (let j = 0; j < c; j++) out[acc + j] = signed ? b - offset : b;
    acc += c;
  }
  return out;
}

// 2-pass radix on 16-bit keys (low byte then high byte). Signed
// handled by XOR'ing the sign bit on input + output.
function radixSortU16(arr: Uint16Array | Int16Array, signed: boolean, Ctor: any): typeof arr {
  const N = arr.length;
  const SIGN_FLIP = signed ? 0x8000 : 0;
  let inBuf = new Uint16Array(N);
  let outBuf = new Uint16Array(N);
  for (let i = 0; i < N; i++) inBuf[i] = arr[i] ^ SIGN_FLIP;
  for (let pass = 0; pass < 2; pass++) {
    const shift = pass * 8;
    const hist = new Uint32Array(256);
    for (let i = 0; i < N; i++) hist[(inBuf[i] >>> shift) & 0xff]++;
    let acc = 0;
    for (let b = 0; b < 256; b++) {
      const c = hist[b];
      hist[b] = acc;
      acc += c;
    }
    for (let i = 0; i < N; i++) {
      const v = inBuf[i];
      const b = (v >>> shift) & 0xff;
      outBuf[hist[b]++] = v;
    }
    const tmp = inBuf;
    inBuf = outBuf;
    outBuf = tmp;
  }
  const result = new Ctor(N);
  for (let i = 0; i < N; i++) result[i] = inBuf[i] ^ SIGN_FLIP;
  return result;
}

// 4-pass radix on 32-bit keys. Signed → unsigned by XOR'ing sign bit.
function radixSortU32(arr: Uint32Array | Int32Array, kind: "u32" | "i32"): typeof arr {
  const N = arr.length;
  const SIGN_FLIP = kind === "i32" ? 0x80000000 : 0;
  let inBuf = new Uint32Array(N);
  let outBuf = new Uint32Array(N);
  for (let i = 0; i < N; i++) inBuf[i] = arr[i] ^ SIGN_FLIP;
  for (let pass = 0; pass < 4; pass++) {
    const shift = pass * 8;
    const hist = new Uint32Array(256);
    for (let i = 0; i < N; i++) hist[(inBuf[i] >>> shift) & 0xff]++;
    let acc = 0;
    for (let b = 0; b < 256; b++) {
      const c = hist[b];
      hist[b] = acc;
      acc += c;
    }
    for (let i = 0; i < N; i++) {
      const v = inBuf[i];
      const b = (v >>> shift) & 0xff;
      outBuf[hist[b]++] = v;
    }
    const tmp = inBuf;
    inBuf = outBuf;
    outBuf = tmp;
  }
  // After the 4 passes, inBuf holds sorted-by-unsigned-bit-pattern u32s.
  // Undo the sign flip (no-op for unsigned).
  if (kind === "u32") {
    return new Uint32Array(inBuf.buffer, inBuf.byteOffset, N) as any;
  }
  const result = new Int32Array(N);
  for (let i = 0; i < N; i++) result[i] = inBuf[i] ^ SIGN_FLIP;
  return result;
}

// f32 radix. Mapping float bits to a sortable unsigned key:
//   - non-negative: XOR sign bit (so 0.0 → 0x80000000, +Inf →
//     0xFFFFFFFF). Order: [-Inf, -Big] > [-Small, -0] > [+0, +Inf].
//     Wait — that's wrong; need to think again.
//
// Standard trick (Terdiman / Herf):
//   if (sign bit set) → invert all bits     // negative floats reorder
//   else              → flip only sign bit  // non-negative floats land
//                                           //   above all negatives
// Result: u32 lex order matches float numeric order. Stable across
// the 4-pass radix; final pass un-transforms.
function radixSortF32(arr: Float32Array): Float32Array {
  const N = arr.length;
  const u32View = new Uint32Array(arr.buffer, arr.byteOffset, N);
  let inBuf = new Uint32Array(N);
  let outBuf = new Uint32Array(N);
  for (let i = 0; i < N; i++) {
    const u = u32View[i];
    inBuf[i] = (u & 0x80000000) === 0 ? u ^ 0x80000000 : ~u >>> 0;
  }
  for (let pass = 0; pass < 4; pass++) {
    const shift = pass * 8;
    const hist = new Uint32Array(256);
    for (let i = 0; i < N; i++) hist[(inBuf[i] >>> shift) & 0xff]++;
    let acc = 0;
    for (let b = 0; b < 256; b++) {
      const c = hist[b];
      hist[b] = acc;
      acc += c;
    }
    for (let i = 0; i < N; i++) {
      const v = inBuf[i];
      const b = (v >>> shift) & 0xff;
      outBuf[hist[b]++] = v;
    }
    const tmp = inBuf;
    inBuf = outBuf;
    outBuf = tmp;
  }
  // Un-transform back to float bits.
  const result = new Float32Array(N);
  const resultU = new Uint32Array(result.buffer);
  for (let i = 0; i < N; i++) {
    const u = inBuf[i];
    resultU[i] = (u & 0x80000000) === 0 ? ~u >>> 0 : u ^ 0x80000000;
  }
  return result;
}

// 8-pass radix on 64-bit keys. The 64-bit value lives as an
// interleaved (low_u32, high_u32) pair in a Uint32Array of length
// 2N. JS bitwise ops are 32-bit, so each pass picks one byte from
// either the low half (passes 0-3) or the high half (passes 4-7).
//
// Sign / float transforms operate on the high half (where the sign
// bit lives at bit 63). Endianness assumption: little-endian, which
// holds for every platform Bun targets.
function radixSort64(
  arr: Float64Array | BigInt64Array | BigUint64Array,
  kind: "f64" | "i64" | "u64",
): Float64Array | BigInt64Array | BigUint64Array {
  const N = arr.length;
  const u32View = new Uint32Array(arr.buffer, arr.byteOffset, N * 2);
  let inBuf = new Uint32Array(N * 2);
  let outBuf = new Uint32Array(N * 2);

  // Pre-transform: copy into inBuf and map to a sortable bit pattern.
  if (kind === "f64") {
    for (let i = 0; i < N; i++) {
      const lo = u32View[2 * i];
      const hi = u32View[2 * i + 1];
      if ((hi & 0x80000000) === 0) {
        inBuf[2 * i] = lo;
        inBuf[2 * i + 1] = hi ^ 0x80000000;
      } else {
        inBuf[2 * i] = ~lo >>> 0;
        inBuf[2 * i + 1] = ~hi >>> 0;
      }
    }
  } else if (kind === "i64") {
    for (let i = 0; i < N; i++) {
      inBuf[2 * i] = u32View[2 * i];
      inBuf[2 * i + 1] = u32View[2 * i + 1] ^ 0x80000000;
    }
  } else {
    for (let i = 0; i < N * 2; i++) inBuf[i] = u32View[i];
  }

  for (let pass = 0; pass < 8; pass++) {
    const halfIdx = pass < 4 ? 0 : 1;
    const shift = (pass % 4) * 8;
    const hist = new Uint32Array(256);

    for (let i = 0; i < N; i++) {
      hist[(inBuf[2 * i + halfIdx] >>> shift) & 0xff]++;
    }
    let acc = 0;
    for (let b = 0; b < 256; b++) {
      const c = hist[b];
      hist[b] = acc;
      acc += c;
    }
    for (let i = 0; i < N; i++) {
      const lo = inBuf[2 * i];
      const hi = inBuf[2 * i + 1];
      const b = (inBuf[2 * i + halfIdx] >>> shift) & 0xff;
      const pos = hist[b]++;
      outBuf[2 * pos] = lo;
      outBuf[2 * pos + 1] = hi;
    }
    const tmp = inBuf;
    inBuf = outBuf;
    outBuf = tmp;
  }

  // Materialize into the requested type, undoing the transform.
  if (kind === "f64") {
    const result = new Float64Array(N);
    const ru = new Uint32Array(result.buffer);
    for (let i = 0; i < N; i++) {
      const lo = inBuf[2 * i];
      const hi = inBuf[2 * i + 1];
      if ((hi & 0x80000000) === 0) {
        // Originally negative (transform inverted); invert back.
        ru[2 * i] = ~lo >>> 0;
        ru[2 * i + 1] = ~hi >>> 0;
      } else {
        ru[2 * i] = lo;
        ru[2 * i + 1] = hi ^ 0x80000000;
      }
    }
    return result;
  }
  if (kind === "i64") {
    const result = new BigInt64Array(N);
    const ru = new Uint32Array(result.buffer);
    for (let i = 0; i < N; i++) {
      ru[2 * i] = inBuf[2 * i];
      ru[2 * i + 1] = inBuf[2 * i + 1] ^ 0x80000000;
    }
    return result;
  }
  const result = new BigUint64Array(N);
  const ru = new Uint32Array(result.buffer);
  for (let i = 0; i < N * 2; i++) ru[i] = inBuf[i];
  return result;
}

// Parallel LSD radix for u32/i32/f32. 4 passes; each pass fans out
// histogram → main-thread P×256 prefix sum → scatter. SAB-backed
// scratch buffers (input + output) ping-pong across passes; the
// histogram + offsets SABs are reused.
async function parallelRadixSortU32(
  arr: Uint32Array | Int32Array | Float32Array,
  kind: "u32" | "i32" | "f32",
  concurrency: number,
): Promise<Uint32Array | Int32Array | Float32Array> {
  const N = arr.length;
  const P = concurrency;
  const pool = ensurePool(P);

  // Borrowed from the shared scratch pool so repeated psort calls
  // (a benchmark loop, a streaming pipeline) don't re-allocate 8N+
  // bytes every time. borrowSab returns a buffer that's >= the
  // requested size — viewA.length may be larger than N, but every
  // loop below explicitly bounds itself by N (count, prefix-sum
  // total, post-transform iteration), so reads/writes never escape
  // the live region.
  const sabA = borrowSab(N * 4);
  const sabB = borrowSab(N * 4);
  const histSab = borrowSab(P * 256 * 4);
  const offsetsSab = borrowSab(P * 256 * 4);
  const viewA = new Uint32Array(sabA);
  const viewB = new Uint32Array(sabB);
  const hist = new Uint32Array(histSab);
  const offs = new Uint32Array(offsetsSab);

  // Pre-transform input → unsigned-sortable bit pattern in sabA.
  if (kind === "f32") {
    const u32View = new Uint32Array(arr.buffer, arr.byteOffset, N);
    for (let i = 0; i < N; i++) {
      const u = u32View[i];
      viewA[i] = (u & 0x80000000) === 0 ? u ^ 0x80000000 : ~u >>> 0;
    }
  } else if (kind === "i32") {
    for (let i = 0; i < N; i++) viewA[i] = (arr[i] >>> 0) ^ 0x80000000;
  } else {
    for (let i = 0; i < N; i++) viewA[i] = arr[i] >>> 0;
  }

  const chunkSize = Math.ceil(N / P);

  let inSab: SharedArrayBuffer = sabA;
  let outSab: SharedArrayBuffer = sabB;

  for (let pass = 0; pass < 4; pass++) {
    const shift = pass * 8;

    // Zero the histogram SAB before each pass.
    for (let i = 0; i < P * 256; i++) hist[i] = 0;

    // Phase 1: histogram fanout.
    await dispatchParallelRadix(pool, P, (entry, workerIdx) => {
      const start = workerIdx * chunkSize;
      const count = Math.min(chunkSize, N - start);
      entry.w.postMessage({
        id: workerIdx,
        op: "radix-histogram",
        inSab,
        histSab,
        byteStart: start * 4,
        count,
        shift,
        workerIdx,
      });
    });

    // Phase 2: main-thread P×256 → P×256 starting offsets. For each
    // bucket b walked in ascending order, each worker w writes its
    // bucket-b items starting at `acc`, then `acc += hist[w][b]`.
    let acc = 0;
    for (let b = 0; b < 256; b++) {
      for (let w = 0; w < P; w++) {
        offs[w * 256 + b] = acc;
        acc += hist[w * 256 + b];
      }
    }

    // Phase 3: scatter fanout.
    await dispatchParallelRadix(pool, P, (entry, workerIdx) => {
      const start = workerIdx * chunkSize;
      const count = Math.min(chunkSize, N - start);
      entry.w.postMessage({
        id: workerIdx,
        op: "radix-scatter",
        inSab,
        outSab,
        offsetsSab,
        byteStart: start * 4,
        count,
        shift,
        workerIdx,
      });
    });

    const tmp = inSab;
    inSab = outSab;
    outSab = tmp;
  }

  // After 4 passes (even count of swaps), the final scatter-output
  // landed in outSab → swapped into inSab. So inSab now holds the
  // sorted unsigned bit patterns.
  const finalView = new Uint32Array(inSab);

  let result: Uint32Array | Int32Array | Float32Array;
  if (kind === "u32") {
    // Explicit length N — `new Uint32Array(finalView)` would inherit
    // finalView.length, which exceeds N when borrowSab returns an
    // over-sized scratch buffer. Manual copy keeps the result
    // dimensioned to the caller's input.
    const r = new Uint32Array(N);
    for (let i = 0; i < N; i++) r[i] = finalView[i];
    result = r;
  } else if (kind === "i32") {
    const r = new Int32Array(N);
    for (let i = 0; i < N; i++) r[i] = finalView[i] ^ 0x80000000;
    result = r;
  } else {
    const r = new Float32Array(N);
    const ru = new Uint32Array(r.buffer);
    for (let i = 0; i < N; i++) {
      const u = finalView[i];
      ru[i] = (u & 0x80000000) === 0 ? ~u >>> 0 : u ^ 0x80000000;
    }
    result = r;
  }

  returnSab(sabA);
  returnSab(sabB);
  returnSab(histSab);
  returnSab(offsetsSab);
  return result;
}

// Fans `P` jobs onto the pool's first P workers and awaits all
// responses. Used by both phases of parallelRadixSortU32.
function dispatchParallelRadix(
  pool: PoolWorker[],
  P: number,
  post: (entry: PoolWorker, idx: number) => void,
): Promise<void> {
  const promises: Promise<any>[] = new Array(P);
  for (let w = 0; w < P; w++) {
    const entry = pool[w];
    entry.busy = true;
    if (typeof entry.w.ref === "function") entry.w.ref();
    promises[w] = new Promise((resolve, reject) => {
      entry.resolve = resolve;
      entry.reject = reject;
    });
    post(entry, w);
  }
  return Promise.all(promises).then(() => undefined);
}

async function psort<T>(
  array: readonly T[],
  comparator?: (a: T, b: T) => number,
  options?: PSortOptions,
): Promise<T[]> {
  // TypedArray fast path: LSD radix sort. Non-comparison, O(n·k/B)
  // where k is the key bit width and B is the per-pass bit count
  // (= 8 here, so 4 passes for i32/u32/f32, 2 for i16/u16, 1 for
  // bytes). Beats engine native sort because it's not bound by
  // comparator-call rate.
  const typedKind = radixKindForTyped(array);
  if (typedKind !== null) {
    if (comparator) {
      throw new TypeError(
        "psort: TypedArray inputs use the radix path which doesn't accept a comparator (sort by value only). " +
          "Wrap your typed array in a plain Array for comparator-driven sort.",
      );
    }
    const N = (array as any).length;
    // Above the parallel threshold, fan out the histogram + scatter
    // phases across workers. Only worth it for the 32-bit kinds —
    // byte/16-bit kinds are cheap enough serially that worker
    // coordination eats the win. Skip if the user explicitly asked
    // for serial.
    const reqConc = options?.concurrency;
    const conc =
      typeof reqConc === "number" && reqConc > 0
        ? Math.max(1, Math.min(N, reqConc))
        : Math.min(N, defaultConcurrency());
    if (!options?.serial && conc >= 2) {
      const minN =
        typedKind === "f32"
          ? PARALLEL_RADIX_MIN_N_F32
          : typedKind === "u32"
            ? PARALLEL_RADIX_MIN_N_U32
            : typedKind === "i32"
              ? PARALLEL_RADIX_MIN_N_I32
              : Infinity;
      if (N >= minN) {
        return (await parallelRadixSortU32(array as any, typedKind as any, conc)) as any;
      }
    }
    return radixSortTyped(array as any, typedKind) as any;
  }
  if (!$isJSArray(array)) {
    throw new TypeError("psort: first argument must be an Array or TypedArray");
  }
  const len = array.length;
  if (len <= 1) return array.slice() as T[];

  const requested = options?.concurrency;
  const concurrency =
    typeof requested === "number" && requested > 0
      ? Math.max(1, Math.min(len, requested))
      : Math.min(len, defaultConcurrency());

  // Serial fallback: dispatch overhead dominates below the threshold.
  // Also fall back when the caller asked for it explicitly, and when
  // there's no comparator — V8/JSC's default sort is ~impossible to
  // beat over postMessage cost.
  if (options?.serial || concurrency === 1 || len < PSORT_SERIAL_THRESHOLD || !comparator) {
    const out = (array as T[]).slice();
    return comparator ? out.sort(comparator) : out.sort();
  }

  // Strategy selection. "auto" defaults to "merge" today.
  //
  // Empirical note: in this debug+ASAN build, sample sort loses
  // 1.4-1.6× to chunk-merge across 10K..200K element benchmarks with
  // a Date.parse comparator. The 2P worker round-trips
  // (bucketize + sort) accumulate more postMessage overhead than the
  // merge phase costs at these sizes. Sample sort theoretically wins
  // for very large N where the sequential merge would dominate, but
  // we don't have release-build numbers showing that crossover yet.
  // Until we do, "auto" stays on the strictly-faster strategy and
  // sample sort is opt-in via { strategy: "sample" } for callers who
  // want to test it on their own data.
  const strategy = options?.strategy === "merge" || options?.strategy === "sample" ? options.strategy : "merge";
  void PSORT_SAMPLE_THRESHOLD; // reserved for the future auto-pick threshold

  if (strategy === "sample") {
    return sampleSort(array as T[], comparator, concurrency);
  }
  return chunkMergeSort(array as T[], comparator, concurrency);
}

// ─── chunk-and-merge strategy ────────────────────────────────────────
// Each worker sorts one chunk; main thread k-way merges. Simpler, lower
// fixed overhead than sample sort. Plateaus at large N because the
// merge is sequential — that's what sampleSort exists to fix.
async function chunkMergeSort<T>(array: T[], comparator: (a: T, b: T) => number, concurrency: number): Promise<T[]> {
  const len = array.length;
  const fnSrc = comparator.toString();
  const chunkSize = Math.ceil(len / concurrency);
  const pool = ensurePool(concurrency);

  const pending: Promise<{ id: number; out: T[] }>[] = [];
  for (let w = 0; w < concurrency; w++) {
    const chunkStart = w * chunkSize;
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
        entry.w.postMessage({ id: w, op: "sort", fnSrc, items });
      }),
    );
  }

  const chunks = await Promise.all(pending);
  chunks.sort((a, b) => a.id - b.id);
  return kWayMerge(
    chunks.map(c => c.out),
    comparator,
  );
}

// ─── sample sort strategy ────────────────────────────────────────────
//
// Two worker rounds:
//   Round 1: each worker bucketizes its slice into P buckets via binary
//            search through P-1 splitters. Returns a per-bucket array.
//   Round 2: each worker sorts ONE concatenated bucket.
// Final assembly: concatenate the sorted buckets in order. No global
// merge phase — buckets are non-overlapping by construction, so each
// bucket's sorted array can sit directly in its slot in the output.
//
// Speedup approaches O(P) — the bucketize step is O(n log P / P) per
// worker (vs O(n log n) sequential), and the sort step is O((n/P)
// log(n/P)) per worker. Sampling overhead is O(P · oversample · log
// (P · oversample)) on the main thread, negligible for P ≤ 32.
//
// Stability: bucketize walks input in order and appends, preserving
// intra-slice order. The cross-slice concat respects worker id
// (= original slice index) order because Round 2 dispatch consumes
// workerBucketArrays[0..P-1] in worker-id order. Each per-bucket sort
// is stable. So the algorithm is globally stable.
async function sampleSort<T>(array: T[], comparator: (a: T, b: T) => number, concurrency: number): Promise<T[]> {
  const len = array.length;
  const fnSrc = comparator.toString();
  const P = concurrency;
  const oversample = 16;
  const sampleCount = Math.min(len, P * oversample);

  // ── Sampling: pick `sampleCount` random elements; sort; choose
  // `P-1` splitters at evenly-spaced positions. Uniform random sampling
  // gives O(n/P²) bucket-size variance — within an order of magnitude
  // of perfectly-balanced for P ≤ 32, which is all we'd realistically
  // run on a single host.
  const samples: T[] = new Array(sampleCount);
  if (sampleCount === len) {
    for (let i = 0; i < len; i++) samples[i] = array[i];
  } else {
    const stride = len / sampleCount;
    for (let i = 0; i < sampleCount; i++) samples[i] = array[Math.floor(i * stride)];
  }
  samples.sort(comparator);
  const splitters: T[] = new Array(P - 1);
  for (let i = 1; i < P; i++) splitters[i - 1] = samples[Math.floor((i * sampleCount) / P)];

  const pool = ensurePool(P);

  // ── Round 1: bucketize each slice in a worker.
  const chunkSize = Math.ceil(len / P);
  const r1Pending: Promise<{ id: number; buckets: T[][] }>[] = [];
  for (let w = 0; w < P; w++) {
    const chunkStart = w * chunkSize;
    if (chunkStart >= len) break;
    const chunkEnd = Math.min(chunkStart + chunkSize, len);
    const items = array.slice(chunkStart, chunkEnd);
    const entry = pool[w];
    entry.busy = true;
    if (typeof entry.w.ref === "function") entry.w.ref();
    r1Pending.push(
      new Promise((resolve, reject) => {
        entry.resolve = (data: any) => resolve({ id: w, buckets: data.buckets });
        entry.reject = reject;
        entry.w.postMessage({ id: w, op: "bucketize", fnSrc, items, splitters });
      }),
    );
  }
  const r1Out = await Promise.all(r1Pending);
  r1Out.sort((a, b) => a.id - b.id);

  // Concat per-bucket arrays across workers. This walks
  // r1Out[0..P-1].buckets[b] for each b in order — preserving
  // global insertion order, which preserves stability across slices.
  const buckets: T[][] = new Array(P);
  for (let b = 0; b < P; b++) {
    let totalLen = 0;
    for (const r of r1Out) totalLen += r.buckets[b].length;
    const merged: T[] = new Array(totalLen);
    let off = 0;
    for (const r of r1Out) {
      const sub = r.buckets[b];
      for (let i = 0; i < sub.length; i++) merged[off + i] = sub[i];
      off += sub.length;
    }
    buckets[b] = merged;
  }

  // ── Round 2: sort each bucket in a worker. Workers are already in
  // pool — reuse them. Some buckets may be empty (rare, but possible
  // when splitters land in a way that excludes the empty range);
  // skip the dispatch and treat them as already-sorted.
  const r2Pending: Promise<{ id: number; out: T[] }>[] = [];
  for (let b = 0; b < P; b++) {
    if (buckets[b].length === 0) continue;
    const entry = pool[b];
    entry.busy = true;
    if (typeof entry.w.ref === "function") entry.w.ref();
    r2Pending.push(
      new Promise((resolve, reject) => {
        entry.resolve = (data: any) => resolve({ id: b, out: data.out });
        entry.reject = reject;
        entry.w.postMessage({ id: b, op: "sort", fnSrc, items: buckets[b] });
      }),
    );
  }
  const r2Out = await Promise.all(r2Pending);

  // Re-slot sorted buckets into their original positions; empty buckets
  // are already in place as `[]`.
  const sortedBuckets: T[][] = new Array(P);
  for (let b = 0; b < P; b++) sortedBuckets[b] = buckets[b].length === 0 ? [] : [];
  for (const { id, out } of r2Out) sortedBuckets[id] = out;

  // ── Final assembly: concat in bucket order. Buckets are
  // non-overlapping by construction (splitters partition the value
  // space), so concat == sorted output.
  const result: T[] = new Array(len);
  let off = 0;
  for (let b = 0; b < P; b++) {
    const sub = sortedBuckets[b];
    for (let i = 0; i < sub.length; i++) result[off + i] = sub[i];
    off += sub.length;
  }
  return result;
}

// k-way merge of K already-sorted arrays into one sorted output.
// Uses a binary min-heap of (value, chunkIdx, posInChunk). Per-pop
// cost is O(log K); total is O(N log K).
function kWayMerge<T>(chunks: T[][], cmp: (a: T, b: T) => number): T[] {
  type Entry = { v: T; chunkIdx: number; pos: number };
  // Skip empty chunks; they'd just take up a heap slot.
  const heap: Entry[] = [];
  let totalLen = 0;
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    totalLen += c.length;
    if (c.length > 0) heap.push({ v: c[0], chunkIdx: i, pos: 0 });
  }
  // Build min-heap.
  for (let i = (heap.length >> 1) - 1; i >= 0; i--) siftDown(heap, i, cmp);

  const out: T[] = new Array(totalLen);
  let outIdx = 0;
  while (heap.length > 0) {
    const min = heap[0];
    out[outIdx++] = min.v;
    const nextPos = min.pos + 1;
    if (nextPos < chunks[min.chunkIdx].length) {
      heap[0] = { v: chunks[min.chunkIdx][nextPos], chunkIdx: min.chunkIdx, pos: nextPos };
      siftDown(heap, 0, cmp);
    } else {
      // Chunk exhausted: swap the last heap entry into root, shrink, sift.
      const last = heap.pop()!;
      if (heap.length > 0) {
        heap[0] = last;
        siftDown(heap, 0, cmp);
      }
    }
  }
  return out;
}

function siftDown<T>(heap: { v: T; chunkIdx: number; pos: number }[], i: number, cmp: (a: T, b: T) => number): void {
  const n = heap.length;
  // Stable tie-break: when two heap entries compare equal under the
  // user comparator, the one from the LOWER-indexed chunk wins. Chunks
  // are numbered in the original array's slice order, so this preserves
  // global insertion order across the merge — same stability guarantee
  // ECMA-262 makes about Array.prototype.sort. Without this, heap
  // structure decides ties non-deterministically.
  const less = (a: { v: T; chunkIdx: number }, b: { v: T; chunkIdx: number }): boolean => {
    const c = cmp(a.v, b.v);
    if (c !== 0) return c < 0;
    return a.chunkIdx < b.chunkIdx;
  };
  while (true) {
    const l = 2 * i + 1;
    const r = l + 1;
    let smallest = i;
    if (l < n && less(heap[l], heap[smallest])) smallest = l;
    if (r < n && less(heap[r], heap[smallest])) smallest = r;
    if (smallest === i) return;
    const tmp = heap[i];
    heap[i] = heap[smallest];
    heap[smallest] = tmp;
    i = smallest;
  }
}

export default { pmap, preduce, psort, disposeWorkers, _heuristicState, _resetHeuristic, Mutex, Semaphore, pool };
