// Browser shim for `para:parallel`. Defaults to a persistent Web Worker
// pool (one per hardwareConcurrency core) backing `pmap` / `preduce`,
// with a transparent sequential fallback when Worker + `new Function`
// aren't available (CSP-restricted contexts, non-browser hosts).
//
// The upstream contract already requires `pmap` / `preduce` callbacks
// to be **pure** — they're shipped across the worker boundary via
// `fn.toString()` and rehydrated with `new Function(...)`, so closures
// over outer scope are not supported. That's the same constraint
// native Parabun enforces; the browser path here matches it.
//
// Inputs stay as plain `postMessage` copies (structured clone). For
// TypedArray inputs we transfer the OUTPUT chunk's buffer back instead
// of copying, which is enough to keep per-chunk overhead proportional
// to the chunk's element count. A future upgrade can reach for
// SharedArrayBuffer when cross-origin isolation headers (COOP/COEP)
// are present so large inputs aren't copied in either direction.

// ── Worker script, inlined as a blob URL ────────────────────────────────

const WORKER_SOURCE = /* js */ `
let fn = null;
let fnSrc = null;

self.onmessage = (e) => {
  const msg = e.data;
  if (msg.kind === 'init') {
    if (msg.fnSrc !== fnSrc) {
      try {
        fn = (new Function('return (' + msg.fnSrc + ')'))();
        fnSrc = msg.fnSrc;
      } catch (err) {
        self.postMessage({ kind: 'error', id: msg.id, error: String(err) });
        return;
      }
    }
    self.postMessage({ kind: 'ready', id: msg.id });
    return;
  }
  if (msg.kind === 'map') {
    try {
      const { chunk, start, id } = msg;
      let out;
      if (ArrayBuffer.isView(chunk)) {
        out = new chunk.constructor(chunk.length);
        for (let i = 0; i < chunk.length; i++) out[i] = fn(chunk[i], start + i);
      } else {
        out = new Array(chunk.length);
        for (let i = 0; i < chunk.length; i++) out[i] = fn(chunk[i], start + i);
      }
      const transfer = ArrayBuffer.isView(out) ? [out.buffer] : [];
      self.postMessage({ kind: 'map', id, out }, transfer);
    } catch (err) {
      self.postMessage({ kind: 'error', id: msg.id, error: String(err) });
    }
    return;
  }
  if (msg.kind === 'reduce') {
    try {
      const { chunk, init, start, id } = msg;
      let acc = init;
      for (let i = 0; i < chunk.length; i++) acc = fn(acc, chunk[i], start + i);
      self.postMessage({ kind: 'reduce', id, acc });
    } catch (err) {
      self.postMessage({ kind: 'error', id: msg.id, error: String(err) });
    }
  }
};
`;

function supportsWorkers() {
  return (
    typeof Worker !== "undefined" &&
    typeof Blob !== "undefined" &&
    typeof URL !== "undefined" &&
    // `new Function(...)` is blocked under strict CSP `script-src` without
    // `unsafe-eval`; detect at module load so we can short-circuit to the
    // sequential fallback.
    (() => {
      try {
        new Function("return 1")();
        return true;
      } catch {
        return false;
      }
    })()
  );
}

const _heuristicState = {
  hasWorker: false,
  concurrency: 1,
  pool: null,
  blobURL: null,
};

function _initPool() {
  if (_heuristicState.pool) return _heuristicState.pool;
  if (!supportsWorkers()) {
    _heuristicState.pool = [];
    return _heuristicState.pool;
  }
  const concurrency = Math.max(1, navigator.hardwareConcurrency ?? 4);
  const blob = new Blob([WORKER_SOURCE], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  const workers = [];
  for (let i = 0; i < concurrency; i++) workers.push(new Worker(url));
  _heuristicState.hasWorker = true;
  _heuristicState.concurrency = concurrency;
  _heuristicState.pool = workers;
  _heuristicState.blobURL = url;
  return workers;
}

let _nextId = 1;
function _rpc(worker, msg, transfer) {
  const id = _nextId++;
  msg.id = id;
  return new Promise((resolve, reject) => {
    const onMessage = e => {
      if (e.data.id !== id) return;
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      if (e.data.kind === "error") reject(new Error(e.data.error));
      else resolve(e.data);
    };
    const onError = err => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      reject(err);
    };
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.postMessage(msg, transfer ?? []);
  });
}

function _chunk(input, nChunks) {
  const n = input.length;
  const chunkSize = Math.ceil(n / nChunks);
  const chunks = [];
  for (let i = 0; i < n; i += chunkSize) {
    const end = Math.min(i + chunkSize, n);
    const sub = ArrayBuffer.isView(input) ? input.slice(i, end) : input.slice(i, end);
    chunks.push({ sub, start: i });
  }
  return chunks;
}

async function pmap(fn, input, opts = {}) {
  const pool = _initPool();
  if (pool.length === 0) {
    // Sequential fallback — no Workers available.
    const n = input.length;
    if (ArrayBuffer.isView(input)) {
      const out = new input.constructor(n);
      for (let i = 0; i < n; i++) out[i] = await fn(input[i], i);
      return out;
    }
    const out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = await fn(input[i], i);
    return out;
  }

  const concurrency = Math.min(opts.concurrency ?? pool.length, pool.length, input.length || 1);
  const workers = pool.slice(0, concurrency);
  const fnSrc = fn.toString();

  await Promise.all(workers.map(w => _rpc(w, { kind: "init", fnSrc })));

  const chunks = _chunk(input, concurrency);
  const results = await Promise.all(
    chunks.map(({ sub, start }, i) => _rpc(workers[i], { kind: "map", chunk: sub, start })),
  );

  const n = input.length;
  if (ArrayBuffer.isView(input)) {
    const out = new input.constructor(n);
    let offset = 0;
    for (const { out: partial } of results) {
      out.set(partial, offset);
      offset += partial.length;
    }
    return out;
  }
  const out = new Array(n);
  let offset = 0;
  for (const { out: partial } of results) {
    for (let k = 0; k < partial.length; k++) out[offset + k] = partial[k];
    offset += partial.length;
  }
  return out;
}

async function preduce(fn, init, input, opts = {}) {
  const pool = _initPool();
  if (pool.length === 0) {
    let acc = init;
    for (let i = 0; i < input.length; i++) acc = await fn(acc, input[i], i);
    return acc;
  }

  const concurrency = Math.min(opts.concurrency ?? pool.length, pool.length, input.length || 1);
  const workers = pool.slice(0, concurrency);
  const fnSrc = fn.toString();

  await Promise.all(workers.map(w => _rpc(w, { kind: "init", fnSrc })));

  // Per-chunk reduce in each worker, then linear fold of the N partials
  // on the main thread. Requires `fn` to be associative for correctness
  // under parallel chunking — the same requirement native `preduce`
  // imposes.
  const chunks = _chunk(input, concurrency);
  const partials = await Promise.all(
    chunks.map(({ sub, start }, i) => _rpc(workers[i], { kind: "reduce", chunk: sub, init, start })),
  );

  let acc = init;
  for (const { acc: partial } of partials) acc = fn(acc, partial);
  return acc;
}

function disposeWorkers() {
  const { pool, blobURL } = _heuristicState;
  if (pool) for (const w of pool) w.terminate();
  if (blobURL) URL.revokeObjectURL(blobURL);
  _heuristicState.pool = null;
  _heuristicState.blobURL = null;
  _heuristicState.hasWorker = false;
  _heuristicState.concurrency = 1;
}

function _resetHeuristic() {
  disposeWorkers();
}

export { pmap, preduce, disposeWorkers, _heuristicState, _resetHeuristic };
export default { pmap, preduce, disposeWorkers, _heuristicState, _resetHeuristic };
