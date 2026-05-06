// Hardcoded module "@para/signals"
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
// calls against this module — same play as `arena { ... }` → @para/arena.

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
    throw new TypeError("@para/signals.fromAsync: first argument must be an async iterable");
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
    throw new TypeError("@para/signals.pump: first argument must be an async iterable");
  }
  if (!(sig instanceof StateSignal)) {
    throw new TypeError("@para/signals.pump: second argument must be a writable signal (from `signal()`)");
  }
  if (mapFn !== undefined && !$isCallable(mapFn)) {
    throw $ERR_INVALID_ARG_TYPE("mapFn", "function", mapFn);
  }
  return startPump<T, V>(iterable, sig, mapFn);
}

/**
 * Drive a signal from a periodic call. `fn` runs immediately once, then
 * every `periodMs` thereafter; the returned `signal` holds the latest
 * resolved value (`undefined` until the first call settles). `fn` can
 * be sync or async; thrown errors are swallowed (the signal keeps its
 * previous value).
 *
 * The internal timer `.unref()`s itself, so a bare `fromInterval(...)`
 * call doesn't pin the event loop on its own — pair it with an
 * `effect { ... }` block or another keep-alive when you want the
 * process to stay running on its account.
 *
 * Common shape for periodic sensor reads:
 *
 *   const temp = signals.fromInterval(
 *     () => sensor.smbus.readWord(0xFA),
 *     500,
 *   );
 *   effect { console.log("temp:", temp.signal.get()); }
 */
function fromInterval<T>(fn: () => T | Promise<T>, periodMs: number): DriverHandle<T | undefined> {
  if (!$isCallable(fn)) {
    throw $ERR_INVALID_ARG_TYPE("fn", "function", fn);
  }
  if (typeof periodMs !== "number" || !Number.isFinite(periodMs) || periodMs < 1) {
    throw new RangeError("@para/signals.fromInterval: periodMs must be a positive finite number");
  }
  const sig = new StateSignal<T | undefined>(undefined);
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    try {
      const v = await fn();
      if (!stopped) sig.set(v);
    } catch {
      // Swallow; signal keeps its previous value. Failed reads shouldn't
      // bubble up and crash the process; if the caller wants to react to
      // errors they can wrap fn() themselves.
    }
  };
  const id = setInterval(tick, periodMs);
  id?.unref?.();
  // Run immediately so the first value lands without waiting periodMs.
  tick();
  return {
    signal: sig,
    dispose: () => {
      stopped = true;
      clearInterval(id);
    },
  };
}

// ─── Edge-detection helper ─────────────────────────────────────────────────
//
// `when(src, fn)` calls `fn` once each time `src` transitions from falsy to
// truthy. Initial state is taken as already-observed — a source that starts
// truthy does NOT fire on first run; only subsequent false→true transitions
// do. The falling edge is just the rising edge of the negated predicate:
// `when(() => !x.get(), fn)`. The block syntax `when not X { … }` desugars
// to that form automatically, so user code rarely writes the negation by hand.
//
// `src` can be either a `Signal<T>` or a predicate function. The predicate
// form auto-derives — passing `() => a.get() && b.get() === "x"` saves the
// explicit `derived(...)` wrapper, which is almost always what callers would
// do otherwise. Reads inside the predicate are tracked the same way they
// would be inside an `effect`.
//
// Returns a disposer with the same semantics as `effect()`.

type EdgeSource<T> = ReadableSignal<T> | (() => T);

function readEdgeSource<T>(source: EdgeSource<T>): { peek: () => boolean; read: () => boolean } {
  if (source instanceof ReadableSignal) {
    return { peek: () => !!source.peek(), read: () => !!source.get() };
  }
  if ($isCallable(source)) {
    return { peek: () => !!untrack(() => (source as () => T)()), read: () => !!(source as () => T)() };
  }
  throw new TypeError("@para/signals.when: first argument must be a signal or a predicate function");
}

function when<T>(source: EdgeSource<T>, fn: () => void): () => void {
  if (!$isCallable(fn)) {
    throw $ERR_INVALID_ARG_TYPE("fn", "function", fn);
  }
  const { peek, read } = readEdgeSource(source);
  let prev = peek();
  return effect(() => {
    const now = read();
    if (now && !prev) fn();
    prev = now;
  });
}

// ─── Resource-tied signals ─────────────────────────────────────────────────
//
// `resource(setup)` builds a handle whose lifecycle is explicit. Hardware
// modules (mic, camera, sensors) emit signals tied to a real underlying
// resource — when it closes, those signals should become inert and effects
// observing them should unwind cleanly. This is the primitive that makes
// that lifecycle first-class.
//
//   const mic = resource(({ signal: sig, onDispose }) => {
//     const peak = sig(0);
//     const handle = openMic();                     // pretend hardware
//     handle.onPeak(v => peak.set(v));
//     onDispose(() => handle.close());
//     return { peak };                              // becomes mic.peak
//   });
//
//   mic.peak.get();                                  // current peak level
//   mic.alive.get();                                 // boolean, true until dispose
//   mic.use(() => console.log(mic.peak.get()));      // effect bound to lifetime
//   mic.dispose();                                   // close + cleanups + alive=false
//
// Setup runs synchronously and may register cleanups via ctx.onDispose.
// Cleanups run in reverse-registration order on dispose. If setup throws,
// any cleanups registered before the throw still run.

interface ResourceContext {
  signal: typeof signal;
  derived: typeof derived;
  onDispose: (fn: () => void) => void;
  alive: ReadableSignal<boolean>;
}

interface ResourceHandle {
  alive: ReadableSignal<boolean>;
  dispose: () => void;
  use: (fn: () => void | (() => void)) => () => void;
  [Symbol.dispose]: () => void;
  [Symbol.asyncDispose]: () => Promise<void>;
}

function resource<E extends Record<string, unknown>>(
  setup: (ctx: ResourceContext) => E | undefined,
): E & ResourceHandle {
  if (!$isCallable(setup)) {
    throw $ERR_INVALID_ARG_TYPE("setup", "function", setup);
  }
  const alive = new StateSignal<boolean>(true);
  const cleanups: Array<() => void> = [];
  const ctx: ResourceContext = {
    signal,
    derived,
    onDispose(fn) {
      if ($isCallable(fn)) cleanups.push(fn);
    },
    alive,
  };

  let exports: E | undefined;
  try {
    exports = setup(ctx);
  } catch (err) {
    while (cleanups.length > 0) {
      const c = cleanups.pop()!;
      try {
        c();
      } catch {}
    }
    throw err;
  }

  let disposed = false;
  function dispose(): void {
    if (disposed) return;
    disposed = true;
    alive.set(false);
    while (cleanups.length > 0) {
      const c = cleanups.pop()!;
      try {
        c();
      } catch {}
    }
  }

  const handle = (exports ?? ({} as E)) as E & ResourceHandle;
  handle.alive = alive;
  handle.dispose = dispose;
  handle[Symbol.dispose] = dispose;
  handle[Symbol.asyncDispose] = () => {
    dispose();
    return Promise.resolve();
  };
  handle.use = function use(fn) {
    const stop = effect(fn);
    cleanups.push(stop);
    return stop;
  };
  return handle;
}

// ─── Async-source adapters (resource-shaped) ───────────────────────────
//
// `fromAsync` / `fromInterval` / `pump` predate the resource() primitive
// and stay as-is for backward compat. The new entries below are
// resource-handles, so they pair cleanly with `using` declarations and
// nest inside other resources via `ctx.onDispose(child.dispose)`.

function fromAsyncIter<T>(
  source: AsyncIterable<T> | Iterable<T> | AsyncIterator<T>,
  init?: T,
): { value: ReadableSignal<T | undefined> } & ResourceHandle {
  return resource(({ signal: sig, onDispose }) => {
    const value = sig<T | undefined>(init);
    const it: AsyncIterator<T> =
      (source as any)[Symbol.asyncIterator] != null
        ? (source as AsyncIterable<T>)[Symbol.asyncIterator]()
        : (source as any)[Symbol.iterator] != null
          ? wrapSyncIter((source as Iterable<T>)[Symbol.iterator]())
          : (source as AsyncIterator<T>);
    let stopped = false;
    onDispose(() => {
      stopped = true;
      try {
        it.return?.(undefined as any);
      } catch {}
    });
    (async () => {
      try {
        while (!stopped) {
          const r = await it.next();
          if (r.done || stopped) break;
          value.set(r.value);
        }
      } catch {}
    })();
    return { value };
  });
}

function wrapSyncIter<T>(it: Iterator<T>): AsyncIterator<T> {
  return {
    next: () => Promise.resolve(it.next()),
    return: (v?: any) => Promise.resolve(it.return ? it.return(v) : { done: true, value: v }),
  };
}

function fromStream<T>(stream: ReadableStream<T>, init?: T): { value: ReadableSignal<T | undefined> } & ResourceHandle {
  if (stream == null || typeof (stream as any).getReader !== "function") {
    throw new TypeError("@para/signals.fromStream: first argument must be a ReadableStream");
  }
  return resource(({ signal: sig, onDispose }) => {
    const value = sig<T | undefined>(init);
    const reader = stream.getReader();
    let stopped = false;
    onDispose(() => {
      stopped = true;
      try {
        reader.cancel().catch(() => {});
      } catch {}
    });
    (async () => {
      try {
        while (!stopped) {
          const r = await reader.read();
          if (r.done || stopped) break;
          value.set(r.value);
        }
      } catch {}
    })();
    return { value };
  });
}

function fromEventTarget<T = Event>(
  target: EventTarget,
  eventName: string,
  opts: { initial?: T; map?: (e: Event) => T } = {},
): { value: ReadableSignal<T | undefined> } & ResourceHandle {
  if (target == null || typeof (target as any).addEventListener !== "function") {
    throw new TypeError("@para/signals.fromEventTarget: first argument must be an EventTarget");
  }
  const map = opts.map;
  return resource(({ signal: sig, onDispose }) => {
    const value = sig<T | undefined>(opts.initial);
    const handler = (e: Event) => value.set(map ? map(e) : (e as unknown as T));
    target.addEventListener(eventName, handler);
    onDispose(() => {
      try {
        target.removeEventListener(eventName, handler);
      } catch {}
    });
    return { value };
  });
}

// ─── Rate-limit operators ──────────────────────────────────────────────────
//
// Hardware emits faster than UI / consumers want. `throttled` keeps the
// leading edge with a trailing flush; `debounced` only emits after silence.
// Both return resources so the underlying upstream effect is cleanly
// disposable.

function throttled<T>(source: ReadableSignal<T>, ms: number): { value: ReadableSignal<T> } & ResourceHandle {
  if (!(source instanceof ReadableSignal)) {
    throw new TypeError("@para/signals.throttled: first argument must be a signal");
  }
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) {
    throw new RangeError("@para/signals.throttled: ms must be a non-negative finite number");
  }
  return resource(({ signal: sig, onDispose }) => {
    const out = sig<T>(source.peek());
    let lastEmit = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pending: T | undefined;
    let havePending = false;
    const stop = effect(() => {
      const v = source.get();
      const now = Date.now();
      const elapsed = now - lastEmit;
      if (elapsed >= ms) {
        if (timer) {
          clearTimeout(timer);
          timer = null;
          havePending = false;
        }
        if (!Object.is(v, out.peek())) {
          lastEmit = now;
          out.set(v);
        }
      } else {
        pending = v;
        havePending = true;
        if (!timer) {
          timer = setTimeout(() => {
            timer = null;
            if (havePending) {
              havePending = false;
              lastEmit = Date.now();
              if (!Object.is(pending, out.peek())) out.set(pending as T);
            }
          }, ms - elapsed);
        }
      }
    });
    onDispose(() => {
      stop();
      if (timer) clearTimeout(timer);
    });
    return { value: out };
  });
}

function debounced<T>(source: ReadableSignal<T>, ms: number): { value: ReadableSignal<T> } & ResourceHandle {
  if (!(source instanceof ReadableSignal)) {
    throw new TypeError("@para/signals.debounced: first argument must be a signal");
  }
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) {
    throw new RangeError("@para/signals.debounced: ms must be a non-negative finite number");
  }
  return resource(({ signal: sig, onDispose }) => {
    const out = sig<T>(source.peek());
    let timer: ReturnType<typeof setTimeout> | null = null;
    const stop = effect(() => {
      const v = source.get();
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (!Object.is(v, out.peek())) out.set(v);
      }, ms);
    });
    onDispose(() => {
      stop();
      if (timer) clearTimeout(timer);
    });
    return { value: out };
  });
}

export default {
  signal,
  derived,
  effect,
  batch,
  untrack,
  fromAsync,
  fromInterval,
  pump,
  when,
  resource,
  fromAsyncIter,
  fromStream,
  fromEventTarget,
  throttled,
  debounced,
  Signal: ReadableSignal,
};
