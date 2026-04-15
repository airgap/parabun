// Hardcoded module "bun:arena"
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

// scope(fn): run fn, then request a single async GC at the end. Useful when
// a batch of work produces a lot of short-lived objects and you want the
// collection to happen at a predictable point (end of batch) rather than
// mid-work. It is NOT a bump allocator — we can't intercept JSC's object
// allocations without modifying the engine. On realistic workloads the
// impact is latency-smoothing, not throughput.
function scope<R>(fn: () => R): R {
  const result = fn();
  // @ts-ignore — Bun.gc(false) schedules an async Eden collection
  if (typeof Bun !== "undefined" && typeof Bun.gc === "function") Bun.gc(false);
  return result;
}

export default { Pool, scope };
