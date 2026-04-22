// Hardcoded module "bun:signals"
//
// Parabun: fine-grained reactive primitives. Three shapes:
//   signal(v)    → State signal, .get()/.set()/.peek()
//   derived(fn)  → Computed signal. Lazy, cached, invalidated on dep change.
//   effect(fn)   → runs fn in a tracked context, re-runs on any dep change.
//                  Returns a disposer. If fn returns a function, that runs as
//                  cleanup before the next run and on dispose (React-style).
//
// Plus batch(fn) to group synchronous writes into a single flush, and
// untrack(fn) to read signals without subscribing.
//
// The language surface (`signal let x = 0`, `effect { ... }`) desugars to
// calls against this module — same play as `arena { ... }` → bun:arena.

let currentTarget: ComputedSignal<any> | EffectImpl | null = null;
let batchDepth = 0;
const pendingEffects: Set<EffectImpl> = new Set();

function flush(): void {
  if (batchDepth > 0) return;
  // Drain in insertion order, re-snapshotting across iterations since an
  // effect's run may enqueue later effects.
  while (pendingEffects.size > 0) {
    const snapshot = Array.from(pendingEffects);
    pendingEffects.clear();
    for (const e of snapshot) {
      if (!e._disposed && !e._running) e._run();
    }
  }
}

class ReadableSignal<T> {
  _subs: Set<ComputedSignal<any> | EffectImpl> = new Set();

  peek(): T {
    throw new Error("abstract");
  }

  get(): T {
    if (currentTarget) currentTarget._trackDep(this);
    return this.peek();
  }

  valueOf(): T {
    return this.get();
  }

  toString(): string {
    return String(this.get());
  }

  toJSON(): T {
    return this.get();
  }

  subscribe(cb: (v: T) => void): () => void {
    const e = new EffectImpl(() => {
      cb(this.get());
    });
    return () => e.dispose();
  }

  _subscribe(s: ComputedSignal<any> | EffectImpl): void {
    this._subs.add(s);
  }

  _unsubscribe(s: ComputedSignal<any> | EffectImpl): void {
    this._subs.delete(s);
  }

  _notify(): void {
    if (this._subs.size === 0) return;
    const snapshot = Array.from(this._subs);
    for (const s of snapshot) s._markDirty();
    if (batchDepth === 0) flush();
  }
}

class StateSignal<T> extends ReadableSignal<T> {
  private _value: T;

  constructor(v: T) {
    super();
    this._value = v;
  }

  peek(): T {
    return this._value;
  }

  set(v: T): void {
    if (Object.is(this._value, v)) return;
    this._value = v;
    this._notify();
  }

  update(fn: (old: T) => T): void {
    this.set(fn(this._value));
  }
}

class ComputedSignal<T> extends ReadableSignal<T> {
  private _compute: () => T;
  private _cached!: T;
  private _dirty = true;
  _deps: Set<ReadableSignal<any>> = new Set();

  constructor(fn: () => T) {
    super();
    this._compute = fn;
  }

  peek(): T {
    if (this._dirty) this._recompute();
    return this._cached;
  }

  set(_v: T): void {
    throw new TypeError("Cannot set a derived signal. Use signal() for writable state.");
  }

  _trackDep(dep: ReadableSignal<any>): void {
    if (this._deps.has(dep)) return;
    this._deps.add(dep);
    dep._subscribe(this);
  }

  _markDirty(): void {
    if (this._dirty) return;
    this._dirty = true;
    if (this._subs.size === 0) return;
    const snapshot = Array.from(this._subs);
    for (const s of snapshot) s._markDirty();
  }

  private _recompute(): void {
    for (const d of this._deps) d._unsubscribe(this);
    this._deps.clear();
    const prev = currentTarget;
    currentTarget = this;
    try {
      this._cached = this._compute();
    } finally {
      currentTarget = prev;
    }
    this._dirty = false;
  }
}

class EffectImpl {
  private _fn: () => void | (() => void);
  private _cleanup: (() => void) | void = undefined;
  _deps: Set<ReadableSignal<any>> = new Set();
  _disposed = false;
  _scheduled = false;
  _running = false;

  constructor(fn: () => void | (() => void)) {
    this._fn = fn;
    this._run();
  }

  _trackDep(dep: ReadableSignal<any>): void {
    if (this._deps.has(dep)) return;
    this._deps.add(dep);
    dep._subscribe(this);
  }

  _markDirty(): void {
    if (this._disposed || this._running || this._scheduled) return;
    this._scheduled = true;
    pendingEffects.add(this);
  }

  _run(): void {
    if (this._disposed) return;
    this._scheduled = false;
    this._running = true;
    if (typeof this._cleanup === "function") {
      try {
        this._cleanup();
      } catch {}
    }
    this._cleanup = undefined;
    for (const d of this._deps) d._unsubscribe(this);
    this._deps.clear();
    const prev = currentTarget;
    currentTarget = this;
    try {
      const ret = this._fn();
      if (typeof ret === "function") this._cleanup = ret;
    } finally {
      currentTarget = prev;
      this._running = false;
    }
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    if (typeof this._cleanup === "function") {
      try {
        this._cleanup();
      } catch {}
    }
    this._cleanup = undefined;
    for (const d of this._deps) d._unsubscribe(this);
    this._deps.clear();
    pendingEffects.delete(this);
  }
}

function signal<T>(v: T): StateSignal<T> {
  return new StateSignal(v);
}

function derived<T>(fn: () => T): ComputedSignal<T> {
  if (!$isCallable(fn)) {
    throw $ERR_INVALID_ARG_TYPE("fn", "function", fn);
  }
  return new ComputedSignal(fn);
}

function effect(fn: () => void | (() => void)): () => void {
  if (!$isCallable(fn)) {
    throw $ERR_INVALID_ARG_TYPE("fn", "function", fn);
  }
  const e = new EffectImpl(fn);
  return () => e.dispose();
}

function batch<R>(fn: () => R): R {
  if (!$isCallable(fn)) {
    throw $ERR_INVALID_ARG_TYPE("fn", "function", fn);
  }
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) flush();
  }
}

function untrack<R>(fn: () => R): R {
  if (!$isCallable(fn)) {
    throw $ERR_INVALID_ARG_TYPE("fn", "function", fn);
  }
  const prev = currentTarget;
  currentTarget = null;
  try {
    return fn();
  } finally {
    currentTarget = prev;
  }
}

export default { signal, derived, effect, batch, untrack, Signal: ReadableSignal };
