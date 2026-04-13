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
  const concurrency = Math.max(
    1,
    Math.min(len, typeof requested === "number" && requested > 0 ? requested : defaultConcurrency()),
  );

  const fnSrc = fn.toString();
  const workers = ensurePool(concurrency);
  const chunkSize = Math.ceil(len / concurrency);

  const pending: Promise<{ id: number; out: U[] }>[] = [];
  for (let w = 0; w < concurrency; w++) {
    const start = w * chunkSize;
    if (start >= len) break;
    const end = Math.min(start + chunkSize, len);
    const items = array.slice(start, end);
    const entry = workers[w];
    entry.busy = true;
    if (typeof entry.w.ref === "function") entry.w.ref();
    pending.push(
      new Promise((resolve, reject) => {
        entry.resolve = (data: any) => resolve({ id: w, out: data.out });
        entry.reject = reject;
        entry.w.postMessage({ id: w, fnSrc, items, baseIndex: start });
      }),
    );
  }

  const chunks = await Promise.all(pending);
  const result: U[] = new Array(len);
  for (const { id, out } of chunks) {
    const start = id * chunkSize;
    for (let i = 0; i < out.length; i++) result[start + i] = out[i];
  }
  return result;
}

export default { pmap, disposeWorkers };
