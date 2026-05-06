// Hardcoded module "@para/arena"
//
// Parabun: buffer pool for typed arrays. Avoids the per-call allocation +
// zero-init + GC-tracking cost of `new Uint8Array(N)` in hot loops by
// letting callers borrow from a free list and return when done.
//
// This is the "actually useful in real code" surface — no `pure function`
// contract, no SIMD shape requirement, no SAB gymnastics. If your hot path
// allocates short-lived typed arrays of a known size, a Pool cuts the
// allocator/GC hit. If it doesn't, this module is a no-op for you.

type TypedArrayCtor =
  | Uint8ArrayConstructor
  | Uint8ClampedArrayConstructor
  | Int8ArrayConstructor
  | Uint16ArrayConstructor
  | Int16ArrayConstructor
  | Uint32ArrayConstructor
  | Int32ArrayConstructor
  | Float32ArrayConstructor
  | Float64ArrayConstructor
  | BigInt64ArrayConstructor
  | BigUint64ArrayConstructor;

type TypedArrayOf<T extends TypedArrayCtor> = InstanceType<T>;

class Pool<T extends TypedArrayCtor> {
  readonly TypedArray: T;
  readonly size: number;
  readonly limit: number;
  readonly clear: boolean;
  private free: TypedArrayOf<T>[] = [];
  private liveCount = 0;

  constructor(TypedArray: T, size: number, opts?: { limit?: number; clear?: boolean; prewarm?: number }) {
    if (!(size > 0 && Number.isInteger(size))) {
      throw new TypeError("Pool: size must be a positive integer");
    }
    this.TypedArray = TypedArray;
    this.size = size;
    this.limit = opts?.limit ?? Infinity;
    // Security-sensitive callers want `clear: true` so recycled buffers
    // don't carry old bytes. Default off — the whole point of a pool is
    // to skip the zero-init cost.
    this.clear = opts?.clear ?? false;
    const prewarm = opts?.prewarm ?? 0;
    for (let i = 0; i < prewarm; i++) {
      this.free.push(new TypedArray(size) as TypedArrayOf<T>);
    }
  }

  acquire(): TypedArrayOf<T> {
    this.liveCount++;
    const buf = this.free.pop();
    if (buf !== undefined) {
      if (this.clear) (buf as unknown as { fill: (v: number) => void }).fill(0);
      return buf;
    }
    return new this.TypedArray(this.size) as TypedArrayOf<T>;
  }

  release(buf: TypedArrayOf<T>): void {
    if (!(buf instanceof this.TypedArray) || buf.length !== this.size) {
      throw new TypeError("Pool.release: buffer shape mismatch");
    }
    this.liveCount--;
    if (this.free.length < this.limit) this.free.push(buf);
  }

  use<R>(fn: (buf: TypedArrayOf<T>) => R): R {
    const buf = this.acquire();
    try {
      return fn(buf);
    } finally {
      this.release(buf);
    }
  }

  stats(): { size: number; free: number; live: number; limit: number } {
    return { size: this.size, free: this.free.length, live: this.liveCount, limit: this.limit };
  }
}

const { runWithDeferredGC } = $cpp("ArenaInternals.cpp", "createArenaInternals");

// scope(fn): defer JSC garbage collection for the synchronous duration of fn,
// then request an async Eden collection on scope exit. The deferral is
// implemented via JSC::DeferGC — short-lived allocations inside fn pile up
// instead of triggering mid-work Eden passes, then the heap drains at a
// predictable point (scope end) rather than at unpredictable allocation
// thresholds. This is latency-smoothing, not a bump allocator: the heap still
// pays the eventual collection cost, just at a time of the caller's choosing.
//
// Caveat — fn must be synchronous and bounded. DeferGC accumulates without an
// upper safety threshold; allocating unboundedly inside scope can OOM before
// the dtor releases. Microtasks queued from fn fire after the scope's deferral
// has already released, so async work inside `scope(async () => { ... })` does
// NOT run with GC deferred.
function scope<R>(fn: () => R): R {
  if (!$isCallable(fn)) {
    throw $ERR_INVALID_ARG_TYPE("fn", "function", fn);
  }
  return runWithDeferredGC(fn);
}

export default { Pool, scope };
