// Hardcoded module "bun:parallel"
//
// Parabun: parallel map over arrays via a Worker pool. The mapping function
// must be pure (no closures, no `this`, no impure globals). We ship it to the
// worker by calling `.toString()`, which is only sound because the function
// is pure by contract.

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

function buildWorkerSource(fnSrc: string): string {
  // The worker evaluates the user function once, then services chunk jobs.
  // Errors are forwarded back with a sentinel so the main thread can reject.
  return (
    "const __pfn = (" +
    fnSrc +
    ");\n" +
    "self.onmessage = async ({ data }) => {\n" +
    "  const { id, items, baseIndex } = data;\n" +
    "  try {\n" +
    "    const out = new Array(items.length);\n" +
    "    for (let i = 0; i < items.length; i++) {\n" +
    "      out[i] = await __pfn(items[i], baseIndex + i);\n" +
    "    }\n" +
    "    self.postMessage({ id, ok: true, out });\n" +
    "  } catch (err) {\n" +
    "    self.postMessage({ id, ok: false, err: err && err.message ? String(err.message) : String(err) });\n" +
    "  }\n" +
    "};\n"
  );
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
  const src = buildWorkerSource(fnSrc);
  const blob = new Blob([src], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);

  const workers: Worker[] = new Array(concurrency);
  try {
    for (let i = 0; i < concurrency; i++) {
      workers[i] = new Worker(url);
    }

    const chunkSize = Math.ceil(len / concurrency);
    const pending: Promise<{ id: number; out: U[] }>[] = [];

    for (let w = 0; w < concurrency; w++) {
      const start = w * chunkSize;
      if (start >= len) break;
      const end = Math.min(start + chunkSize, len);
      const items = array.slice(start, end);
      const worker = workers[w];
      pending.push(
        new Promise((resolve, reject) => {
          worker.onmessage = (ev: MessageEvent) => {
            const { data } = ev;
            if (data && data.ok) {
              resolve({ id: w, out: data.out });
            } else {
              reject(new Error(data?.err ?? "pmap worker failed"));
            }
          };
          worker.onerror = (ev: ErrorEvent) => {
            reject(new Error(ev.message || "pmap worker error"));
          };
          worker.postMessage({ id: w, items, baseIndex: start });
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
  } finally {
    for (const w of workers) {
      if (w) w.terminate();
    }
    URL.revokeObjectURL(url);
  }
}

export default { pmap };
