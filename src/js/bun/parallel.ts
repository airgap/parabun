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
const WORKER_SRC = `
const __cache = new Map();
self.onmessage = async ({ data }) => {
  const { id, fnSrc, items, baseIndex } = data;
  let fn = __cache.get(fnSrc);
  if (!fn) {
    fn = (0, eval)("(" + fnSrc + ")");
    __cache.set(fnSrc, fn);
  }
  try {
    const out = new Array(items.length);
    for (let i = 0; i < items.length; i++) {
      out[i] = await fn(items[i], baseIndex + i);
    }
    self.postMessage({ id, ok: true, out });
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

// Adaptive-concurrency heuristic.
//
// Historically pmap always dispatched `defaultConcurrency()` workers
// regardless of per-item cost; that loses to `.map()` when the per-item
// work is below Worker postMessage + structured-clone overhead (~50-150 μs
// per chunk round-trip on Bun). We now:
//
//   1. Probe up to 64 items on the main thread to measure per-item cost
//      (first call per distinct fn source).
//   2. Cache the probed cost in an EMA keyed on `fn.toString()`.
//   3. Size the worker fan-out based on the estimated total serial time:
//      - below 1 ms    → run everything on the main thread (0 workers)
//      - below 2 ms    → fan out to 2 workers
//      - below 10 ms   → fan out to 4 workers
//      - otherwise     → fan out to defaultConcurrency()
//
// A caller-supplied `{ concurrency: N }` always overrides the heuristic —
// we trust the user when they ask for a specific fan-out.
//
// Thresholds are calibrated against measured Bun Worker dispatch overhead
// (~400μs per chunk on 2026-04-x builds — structured-clone + postMessage
// + Promise.all synchronization). If that drops (e.g. SharedArrayBuffer-
// based transfer), the heuristic can be re-tuned without touching pmap
// shape.
const SERIAL_THRESHOLD_NS = 1_000_000;
const TWO_WORKER_NS = 2_000_000;
const FOUR_WORKER_NS = 10_000_000;
const PROBE_MAX_ITEMS = 64;
const PROBE_MAX_NS = 1_000_000; // bail out of probe after ≥1ms of work
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

// Test/inspection hook — returns the current EMA map as a plain object.
// Not part of the stable public API; mainly useful for heuristic tuning.
function _heuristicState(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of perItemEma) out[k] = v;
  return out;
}

function _resetHeuristic(): void {
  perItemEma.clear();
}

async function pmap<T, U>(fn: MapFn<T, U>, array: readonly T[], options?: PMapOptions): Promise<U[]> {
  if (!$isCallable(fn)) {
    throw new TypeError("pmap: first argument must be a function");
  }
  if (!$isJSArray(array)) {
    throw new TypeError("pmap: second argument must be an array");
  }

  const len = array.length;
  if (len === 0) return [];

  const requested = options?.concurrency;
  const fnSrc = fn.toString();

  // Explicit concurrency override → honor exactly, including concurrency=1
  // which skips the pool entirely.
  if (typeof requested === "number" && requested > 0) {
    const requestedInt = Math.max(1, Math.min(len, requested));
    if (requestedInt === 1) {
      return await runInline(fn, fnSrc, array, 0, new Array(len));
    }
    return dispatchWorkers(fn, fnSrc, array, 0, []);
  }

  // Heuristic path: probe (or use EMA) to size the fan-out.
  const prior = perItemEma.get(fnSrc);
  if (prior !== undefined) {
    const workers = chooseWorkers(prior * len, len);
    if (workers === 0) {
      return await runInline(fn, fnSrc, array, 0, new Array(len));
    }
    return dispatchWorkers(fn, fnSrc, array, workers, []);
  }

  // Unknown fn — probe the first N items on the main thread, bail out if
  // the probe itself exceeds PROBE_MAX_NS so slow per-item work doesn't
  // starve the pool. The probe uses the same sync-fast-path runner as
  // the inline hot path so a trivial sync fn isn't penalized.
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

// Synchronous-fast-path inline runner. Calls `fn` against array[start..end)
// and fills `out` in place. If `fn` never returns a Promise we avoid the
// per-item `await` microtask entirely, which is what closes the gap with
// `.map()` on trivial per-item work; the moment we see a thenable we
// switch to awaiting the rest.
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

// Fan-out helper. If `prefix` is non-empty it's the already-computed
// probe results for array[0..prefix.length); we dispatch the rest.
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
  // Intentionally do NOT updateEma from the dispatch path: the wall time
  // here conflates per-item work with dispatch + structured-clone overhead,
  // so blending it into the EMA biases the estimate upward and pins us to
  // a bad fan-out decision across subsequent calls. The EMA is a pure
  // inline-cost signal — probe + runInline are the only writers.
  return result;
}

export default { pmap, disposeWorkers, _heuristicState, _resetHeuristic };
