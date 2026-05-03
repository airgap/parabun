// Browser shim for `para:signals` — a minimal synchronous reactive core
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

// ─── Resource-tied signals (the differentiator) ─────────────────────────
//
// `resource(setup)` builds a handle whose lifecycle is explicit. A
// resource owns one or more signals plus any cleanup logic needed to
// release the underlying source (a mic, a camera, an open file, a
// WebSocket). When you `dispose()` the resource:
//
//   - Its `.alive` signal flips to false (one final notification to
//     any effect that observed it — typical pattern is to read .alive
//     in the same effect that reads the data signals).
//   - All `onDispose` cleanups registered during setup run, in
//     reverse-registration order.
//   - Effects bound via `.use(fn)` are automatically disposed.
//
// Setup signature: `setup({ signal, onDispose, alive })` returns an
// object whose own keys (typically signals) become public properties
// on the handle. The handle layers `alive` / `dispose` /
// `[Symbol.dispose]` / `[Symbol.asyncDispose]` / `use` on top.
//
//   const mic = resource(({ signal: sig, onDispose }) => {
//     const peak = sig(0);
//     const handle = openMic();
//     handle.onPeak(v => peak.set(v));
//     onDispose(() => handle.close());
//     return { peak };
//   });
//
//   mic.peak.get();        // current peak level
//   mic.alive.get();       // true until disposed
//   mic.use(() => console.log(mic.peak.get()));  // auto-stops on dispose
//   mic.dispose();         // close the mic, fire cleanups, mark inert

export function resource(setup) {
  const alive = new WritableSignal(true);
  const cleanups = [];
  const ctx = {
    signal,
    derived,
    onDispose(fn) {
      if (typeof fn !== "function") return;
      cleanups.push(fn);
    },
    alive,
  };

  let exports;
  try {
    exports = setup(ctx) || {};
  } catch (err) {
    // Setup failed — run any cleanups registered before the throw and
    // re-raise. Callers expect either a working handle or an exception.
    for (const c of cleanups.splice(0).reverse()) {
      try {
        c();
      } catch {}
    }
    throw err;
  }

  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    alive.set(false);
    for (const c of cleanups.splice(0).reverse()) {
      try {
        c();
      } catch {}
    }
  }

  const handle = {
    ...exports,
    alive,
    dispose,
    [Symbol.dispose]: dispose,
    [Symbol.asyncDispose]: () => {
      dispose();
      return Promise.resolve();
    },
    /**
     * Run an effect bound to this resource's lifecycle. The effect
     * fires immediately and on every dependency change, just like a
     * regular `effect()`, but disposes automatically when the
     * resource closes.
     */
    use(fn) {
      const stop = effect(fn);
      cleanups.push(stop);
      return stop;
    },
  };

  return handle;
}

// ─── Async-source adapters ──────────────────────────────────────────
//
// Hardware modules emit streams (audio frames, sensor ticks, video
// frames). These adapters lift the underlying primitive (AsyncIterable
// / ReadableStream / EventTarget) into a resource-tied signal that
// exposes the latest value — no manual pump loop in user code.

/**
 * Adapt an `AsyncIterable<T>` to a resource-tied signal. The signal
 * starts at `initial` and updates to each yielded value. Disposing
 * the resource calls the iterator's `return()` so generator-style
 * sources can release their state.
 */
export function fromAsyncIter(source, initial = undefined) {
  return resource(({ signal: sig, onDispose }) => {
    const value = sig(initial);
    const it = source[Symbol.asyncIterator]
      ? source[Symbol.asyncIterator]()
      : source[Symbol.iterator]
        ? wrapSyncIter(source[Symbol.iterator]())
        : source; // assume already an iterator

    let stopped = false;
    onDispose(() => {
      stopped = true;
      try {
        it.return?.();
      } catch {}
    });

    (async () => {
      try {
        while (!stopped) {
          const next = await it.next();
          if (next.done || stopped) break;
          value.set(next.value);
        }
      } catch {
        // Iterator threw — adapter just stops; consumers see .alive
        // remain true since the resource isn't formally disposed
        // (caller can subscribe to detect via no further updates).
      }
    })();

    return { value };
  });
}

function wrapSyncIter(it) {
  return {
    next: () => Promise.resolve(it.next()),
    return: v => (it.return ? Promise.resolve(it.return(v)) : Promise.resolve({ done: true, value: v })),
  };
}

/**
 * Adapt a `ReadableStream<T>` to a resource-tied signal. The reader
 * is cancelled on dispose.
 */
export function fromStream(stream, initial = undefined) {
  return resource(({ signal: sig, onDispose }) => {
    const value = sig(initial);
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
          const { value: v, done } = await reader.read();
          if (done || stopped) break;
          value.set(v);
        }
      } catch {}
    })();
    return { value };
  });
}

/**
 * Adapt an `EventTarget` (DOM, Node, Bun) to a resource-tied signal.
 * The listener is removed on dispose. Pass `map` to extract a value
 * from the Event (defaults to the Event itself).
 */
export function fromEventTarget(target, eventName, opts = {}) {
  const { initial = null, map = e => e } = opts;
  return resource(({ signal: sig, onDispose }) => {
    const value = sig(initial);
    const handler = e => value.set(map(e));
    target.addEventListener(eventName, handler);
    onDispose(() => {
      try {
        target.removeEventListener(eventName, handler);
      } catch {}
    });
    return { value };
  });
}

// ─── Rate-limit operators ───────────────────────────────────────────
//
// Hardware emits faster than UI / consumers want. `throttled` keeps
// the leading edge plus a trailing flush; `debounced` only emits
// after silence. Both return resources so the underlying effect
// subscription on the source is cleanly disposable.

/**
 * Emit at most once per `ms` window. Leading-edge: the first change
 * after a silent window emits immediately; subsequent changes within
 * the window get coalesced into a trailing emit at window end.
 */
export function throttled(source, ms) {
  return resource(({ signal: sig, onDispose }) => {
    const out = sig(source.peek());
    let lastEmit = 0;
    let timer = null;
    let pending;
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
        // Only commit lastEmit when we actually emit — otherwise the
        // initial effect run (which is a no-op when the source already
        // matches `out`) would eat the leading edge of the first real
        // change.
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
              if (!Object.is(pending, out.peek())) out.set(pending);
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

/**
 * Emit a value only after `ms` of silence following the last change.
 * The initial source value triggers the first emit after `ms`.
 */
export function debounced(source, ms) {
  return resource(({ signal: sig, onDispose }) => {
    const out = sig(source.peek());
    let timer = null;
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
  Signal,
  resource,
  fromAsyncIter,
  fromStream,
  fromEventTarget,
  throttled,
  debounced,
};
