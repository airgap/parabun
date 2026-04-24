// Browser shim for `bun:signals` — a minimal synchronous reactive core
// matching the upstream surface (signal / derived / effect / batch /
// untrack).
//
// Design sketch:
//   - `signal()` — writable value. Reads subscribe the current effect;
//     writes mark subscribers dirty and schedule them.
//   - `derived()` — lazy memoized computation. Re-computes on read
//     when dirty; re-subscribes to its dynamic dep set each time.
//   - `effect()` — imperative subscriber. Re-runs when any dep changes.
//   - Effects are queued and drained synchronously via a `flushing`
//     flag that prevents re-entrant drains (scheduling inside a drain
//     just appends to the queue).

let currentEffect = null;
let batchDepth = 0;
let flushing = false;
const queue = new Set();

function enqueue(e) {
  queue.add(e);
  if (batchDepth === 0 && !flushing) drain();
}

function drain() {
  flushing = true;
  try {
    while (queue.size) {
      const pending = Array.from(queue);
      queue.clear();
      for (const e of pending) {
        if (!e._disposed) e._execute();
      }
    }
  } finally {
    flushing = false;
  }
}

function track(node) {
  if (currentEffect) {
    currentEffect._deps.add(node);
    node._subs.add(currentEffect);
  }
}

class WritableSignal {
  constructor(value) {
    this._value = value;
    this._subs = new Set();
  }
  get() {
    track(this);
    return this._value;
  }
  peek() {
    return this._value;
  }
  set(v) {
    if (Object.is(v, this._value)) return;
    this._value = v;
    // Batch the invalidation cascade so effects that transitively
    // depend on this signal (directly AND via a derived) don't run
    // before the derived has been marked dirty.
    batchDepth++;
    try {
      for (const s of Array.from(this._subs)) s._invalidate();
    } finally {
      batchDepth--;
      if (batchDepth === 0) drain();
    }
  }
  update(fn) {
    this.set(fn(this._value));
  }
  subscribe(listener) {
    const e = new Effect(() => listener(this.get()));
    return () => e.dispose();
  }
}

class DerivedSignal {
  constructor(compute) {
    this._compute = compute;
    this._value = undefined;
    this._dirty = true;
    this._subs = new Set();
    this._deps = new Set();
  }
  get() {
    if (this._dirty) this._recompute();
    track(this);
    return this._value;
  }
  peek() {
    if (this._dirty) this._recompute();
    return this._value;
  }
  _recompute() {
    for (const d of this._deps) d._subs.delete(this);
    this._deps.clear();
    const prev = currentEffect;
    currentEffect = this;
    try {
      this._value = this._compute();
    } finally {
      currentEffect = prev;
    }
    this._dirty = false;
  }
  _invalidate() {
    if (this._dirty) return;
    this._dirty = true;
    // A derived is a "node" from an effect's perspective — its own subs
    // (effects that read this derived) need to re-run.
    for (const s of Array.from(this._subs)) s._invalidate();
  }
  // Derived plays the effect role when it's the tracking context during
  // _recompute; _deps + _subs mirror Effect's shape so Signal.set can
  // treat all subscribers uniformly.
  get _deps_ref() {
    return this._deps;
  }
}

class Effect {
  constructor(fn) {
    this.fn = fn;
    this._deps = new Set();
    this._cleanup = null;
    this._disposed = false;
    this._execute();
  }
  _execute() {
    if (this._disposed) return;
    if (typeof this._cleanup === "function") {
      try {
        this._cleanup();
      } catch {}
      this._cleanup = null;
    }
    for (const d of this._deps) d._subs.delete(this);
    this._deps.clear();
    const prev = currentEffect;
    currentEffect = this;
    try {
      const ret = this.fn();
      if (typeof ret === "function") this._cleanup = ret;
    } finally {
      currentEffect = prev;
    }
  }
  _invalidate() {
    if (this._disposed) return;
    enqueue(this);
  }
  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    if (typeof this._cleanup === "function") {
      try {
        this._cleanup();
      } catch {}
    }
    for (const d of this._deps) d._subs.delete(this);
    this._deps.clear();
  }
}

export function signal(value) {
  return new WritableSignal(value);
}

export function derived(compute) {
  return new DerivedSignal(compute);
}

export function effect(fn) {
  const e = new Effect(fn);
  return () => e.dispose();
}

export function batch(fn) {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) drain();
  }
}

export function untrack(fn) {
  const prev = currentEffect;
  currentEffect = null;
  try {
    return fn();
  } finally {
    currentEffect = prev;
  }
}

export const Signal = WritableSignal;

export default { signal, derived, effect, batch, untrack, Signal };
