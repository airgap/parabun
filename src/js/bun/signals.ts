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
// The language surface (`signal x = 0`, `effect { ... }`) desugars to
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

// ─── Iterator → Signal helpers ─────────────────────────────────────────────
//
// Common pattern: an async iterable produces values over time and we want
// the most recent one available as a Signal so effects / derived can react
// without writing the same `(async () => for await ...)` IIFE every time.
//
// `fromAsync(it, mapFn?, init?)` creates a fresh signal driven by the
// iterable. `pump(it, sig, mapFn?)` connects an iterable to an existing
// signal — useful when the signal pre-exists or you switch sources at
// runtime. Both return a disposer that breaks the loop via the iterator's
// `return()` method (which fires any finally block in a generator).

interface DriverHandle<T> {
  signal: ReadableSignal<T>;
  dispose: () => void;
}

function startPump<T, V>(
  iterable: AsyncIterable<T>,
  sig: StateSignal<V>,
  mapFn: ((v: T) => V) | undefined,
): () => void {
  let stopped = false;
  let iter: AsyncIterator<T> | null = null;
  (async () => {
    try {
      iter = iterable[Symbol.asyncIterator]();
      while (!stopped) {
        const r = await iter.next();
        if (r.done) break;
        sig.set(mapFn ? mapFn(r.value) : (r.value as unknown as V));
      }
    } catch {
      // Iterator threw / cancelled — caller already has the values it got.
    }
  })();
  return () => {
    if (stopped) return;
    stopped = true;
    try {
      iter?.return?.(undefined);
    } catch {}
  };
}

function fromAsync<T>(iterable: AsyncIterable<T>): DriverHandle<T | undefined>;
function fromAsync<T, V>(iterable: AsyncIterable<T>, mapFn: (v: T) => V, init?: V): DriverHandle<V | undefined>;
function fromAsync<T, V = T>(iterable: AsyncIterable<T>, mapFn?: (v: T) => V, init?: V): DriverHandle<V | undefined> {
  if (iterable == null || typeof (iterable as any)[Symbol.asyncIterator] !== "function") {
    throw new TypeError("bun:signals.fromAsync: first argument must be an async iterable");
  }
  if (mapFn !== undefined && !$isCallable(mapFn)) {
    throw $ERR_INVALID_ARG_TYPE("mapFn", "function", mapFn);
  }
  const sig = new StateSignal<V | undefined>(init);
  const dispose = startPump<T, V | undefined>(iterable, sig, mapFn as any);
  return { signal: sig, dispose };
}

function pump<T>(iterable: AsyncIterable<T>, sig: StateSignal<T>): () => void;
function pump<T, V>(iterable: AsyncIterable<T>, sig: StateSignal<V>, mapFn: (v: T) => V): () => void;
function pump<T, V = T>(iterable: AsyncIterable<T>, sig: StateSignal<V>, mapFn?: (v: T) => V): () => void {
  if (iterable == null || typeof (iterable as any)[Symbol.asyncIterator] !== "function") {
    throw new TypeError("bun:signals.pump: first argument must be an async iterable");
  }
  if (!(sig instanceof StateSignal)) {
    throw new TypeError("bun:signals.pump: second argument must be a writable signal (from `signal()`)");
  }
  if (mapFn !== undefined && !$isCallable(mapFn)) {
    throw $ERR_INVALID_ARG_TYPE("mapFn", "function", mapFn);
  }
  return startPump<T, V>(iterable, sig, mapFn);
}

export default { signal, derived, effect, batch, untrack, fromAsync, pump, Signal: ReadableSignal };
