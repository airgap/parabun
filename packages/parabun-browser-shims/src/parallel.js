// Browser shim for `bun:parallel`. The upstream runs tasks across a
// persistent worker pool keyed on pure function source — `fn.toString()`
// shipped to each worker, SharedArrayBuffer for TypedArrays. In the
// browser V1 we keep the signatures intact and run tasks sequentially
// on the main thread. A future version can move to
// `navigator.hardwareConcurrency` Web Workers behind the same API
// (requires a bundler step to materialize the worker module from the
// stringified fn; that's more involved than the other shims).

async function pmap(fn, input, _opts) {
  // pmap accepts arrays and TypedArrays; the upstream preserves the
  // input type in its output. We mirror that.
  const n = input.length;
  if (ArrayBuffer.isView(input)) {
    const Ctor = input.constructor;
    const out = new Ctor(n);
    for (let i = 0; i < n; i++) out[i] = await fn(input[i], i);
    return out;
  }
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = await fn(input[i], i);
  return out;
}

async function preduce(fn, init, input, _opts) {
  let acc = init;
  const n = input.length;
  for (let i = 0; i < n; i++) {
    acc = await fn(acc, input[i], i);
  }
  return acc;
}

// The upstream exposes a disposer for its worker pool — callers often
// use `bun:parallel`'s `disposeWorkers()` in tests or hot-reload paths.
// No pool in the browser, so this is a no-op.
function disposeWorkers() {}

// Internal state helpers the upstream exposes for tests. Keep them
// present so callers that probe heuristics don't crash.
const _heuristicState = { hasWorker: false, concurrency: 1 };
function _resetHeuristic() {}

export { pmap, preduce, disposeWorkers, _heuristicState, _resetHeuristic };
export default { pmap, preduce, disposeWorkers, _heuristicState, _resetHeuristic };
