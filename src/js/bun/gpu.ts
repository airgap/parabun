// Hardcoded module "bun:gpu"
//
// Parabun: GPU-accelerated vector primitives over typed arrays. Same public
// surface as bun:simd for `dot`, `matVec`, `simdMap` — plus `matmul`, which
// is where GPU really earns its keep. Designed to slot in behind
// `bun:pipeline` fusion as a Tier 3 when the buffer crosses a size threshold.
//
//   import gpu from "bun:gpu";
//   if (gpu.winsForSize("matVec", nRows, 4)) {
//     return gpu.matVec(matrix, vector, nRows, nCols);
//   }
//   return simd.matVec(matrix, vector, nRows, nCols);
//
// Backends:
//   - "metal": Apple Silicon (M1, M3, …). Obj-C FFI to MTLDevice +
//              MTLComputePipelineState. Zero-copy via unified memory.
//   - "cuda":  NVIDIA GPUs on Linux + Windows. bun:ffi to libcuda.so.1 /
//              nvcuda.dll via the Driver API. Hand-written PTX kernels.
//   - "cpu":   Fallback — forwards every op to bun:simd. Always available.
//
// Backend selection is lazy + sticky. On first use we probe in order
// [metal, cpu] on macOS and [cuda, cpu] elsewhere, and cache the result.
// `setBackend("cpu")` forces the fallback; `setBackend("auto")` re-probes.
//
// Each backend registers itself via `backends[name]`; this file never
// imports platform-specific code directly. The backend file's probe() is
// the only thing that decides whether the backend is usable on this host.

const simd = require("./simd.ts");
const cudaBackend = require("./gpu/cuda.ts");
const metalBackend = require("./gpu/metal.ts");

type FArray = Float32Array | Float64Array;

export type BackendName = "metal" | "cuda" | "cpu";
export type BackendChoice = BackendName | "auto";

export type OpKind = "dot" | "matVec" | "matmul" | "simdMap";

// Opaque handle returned by `hold(arr)`. Kept resident across matVec calls
// on backends that benefit (Metal: reused MTLBuffer); a no-op wrapper on
// backends that don't (CPU, CUDA today). The brand property lets every
// backend's matVec distinguish `handle` from `Float32Array` cheaply.
export type GpuHandle = {
  readonly __bunGpuHandle: true;
  readonly backend: BackendName;
  readonly type: "f32" | "f64";
  readonly length: number;
  // Backend-internal fields (not part of the public contract):
  buffer: bigint;
  view: FArray;
  released: boolean;
};

function isGpuHandle(x: unknown): x is GpuHandle {
  return typeof x === "object" && x !== null && (x as any).__bunGpuHandle === true;
}

// ─── Backend protocol ──────────────────────────────────────────────────────
//
// Every backend implements this interface. The `cpu` backend is an alias
// that forwards to bun:simd for ops it supports, and a JS fallback for
// matmul (simd doesn't have native matmul — we build it on matVec).
//
// Backend implementations MUST NOT throw on missing ops; they return
// `undefined` from `probe()` if unavailable on the host. This lets the
// selector fall through cleanly.

interface Backend {
  readonly name: BackendName;
  probe(): boolean;
  winsForSize(op: OpKind, n: number, elemBytes: number): boolean;
  dot(a: FArray, b: FArray): number;
  matVec(matrix: FArray | GpuHandle, vector: FArray, nRows: number, nCols: number): FArray;
  matmul(a: FArray, b: FArray, m: number, k: number, n: number): FArray;
  simdMap(fn: (x: number, i: number) => number, a: FArray): FArray;
  alloc(length: number, type: "f32" | "f64"): FArray;
  isAligned(arr: FArray): boolean;
  hold(arr: FArray): GpuHandle;
  releaseHandle(handle: GpuHandle): void;
  dispose(): void;
}

// ─── CPU backend (always available — forwards to bun:simd) ──────────────────

const cpuBackend: Backend = {
  name: "cpu",
  probe() {
    return true;
  },
  winsForSize() {
    return false;
  },
  dot(a, b) {
    return simd.dot(a, b);
  },
  matVec(matrix, vector, nRows, nCols) {
    if (isGpuHandle(matrix) && matrix.released) {
      throw new Error("bun:gpu: matVec called on released handle");
    }
    const matView = isGpuHandle(matrix) ? matrix.view : matrix;
    return simd.matVec(matView as any, vector as any, nRows, nCols);
  },
  matmul(a, b, m, k, n) {
    if (a.constructor !== b.constructor) {
      throw new TypeError(
        `a and b must both be Float32Array or both be Float64Array; got ${a.constructor.name} and ${b.constructor.name}`,
      );
    }
    const out = (a instanceof Float32Array ? new Float32Array(m * n) : new Float64Array(m * n)) as FArray;
    // Row-major A (m×k), row-major B (k×n), row-major out (m×n).
    // Naive triple loop with accumulator promoted out of the inner loop.
    // GPU backends replace this with a proper tiled kernel.
    for (let i = 0; i < m; i++) {
      const aRow = i * k;
      const oRow = i * n;
      for (let p = 0; p < k; p++) {
        const av = a[aRow + p];
        if (av === 0) continue;
        const bRow = p * n;
        for (let j = 0; j < n; j++) out[oRow + j] += av * b[bRow + j];
      }
    }
    return out;
  },
  simdMap(fn, a) {
    return simd.simdMap(fn, a as any);
  },
  alloc(length, type) {
    if (!Number.isInteger(length) || length < 0) {
      throw new RangeError(`length must be a non-negative integer; got ${length}`);
    }
    if (type !== "f32" && type !== "f64") {
      throw new TypeError(`type must be "f32" or "f64"; got ${String(type)}`);
    }
    return type === "f32" ? new Float32Array(length) : new Float64Array(length);
  },
  isAligned(_arr) {
    return false;
  },
  hold(arr) {
    if (!(arr instanceof Float32Array) && !(arr instanceof Float64Array)) {
      throw new TypeError(
        `hold requires Float32Array or Float64Array; got ${(arr as any)?.constructor?.name ?? typeof arr}`,
      );
    }
    return {
      __bunGpuHandle: true as const,
      backend: "cpu" as const,
      type: arr instanceof Float32Array ? "f32" : "f64",
      length: arr.length,
      buffer: 0n,
      view: arr,
      released: false,
    };
  },
  releaseHandle(handle) {
    if (!isGpuHandle(handle)) {
      throw new TypeError(`release expected a GpuHandle; got ${typeof handle}`);
    }
    handle.released = true;
  },
  dispose() {},
};

const backends: Record<BackendName, Backend> = {
  metal: metalBackend as Backend,
  cuda: cudaBackend as Backend,
  cpu: cpuBackend,
};

// ─── Backend selection ─────────────────────────────────────────────────────

// `process.platform` and `process.arch` are inlined + dead-code eliminated
// at bundle time per the builtins build pipeline (see src/js/CLAUDE.md), so
// the platform check below is free at runtime.
const PLATFORM = process.platform;

function defaultProbeOrder(): BackendName[] {
  if (PLATFORM === "darwin") return ["metal", "cpu"];
  return ["cuda", "cpu"];
}

let active: Backend | null = null;

function resolveActive(): Backend {
  if (active !== null) return active;
  for (const name of defaultProbeOrder()) {
    const b = backends[name];
    if (b.probe()) {
      active = b;
      return b;
    }
  }
  // `cpu` always probes true, so we're guaranteed to hit this only if
  // someone deletes the cpu backend. Keep the assert for safety.
  $assert(false, "bun:gpu: no backend available (cpu missing?)");
  active = cpuBackend;
  return cpuBackend;
}

function activeBackend(): BackendName {
  return resolveActive().name;
}

function hasBackend(name: BackendName): boolean {
  const b = backends[name];
  if (!b) return false;
  return b.probe();
}

function setBackend(choice: BackendChoice): BackendName {
  if (choice === "auto") {
    active = null;
    return activeBackend();
  }
  const b = backends[choice];
  if (!b) throw new RangeError(`bun:gpu: unknown backend ${JSON.stringify(choice)}`);
  if (!b.probe()) throw new Error(`bun:gpu: backend ${choice} is not available on this host`);
  active = b;
  return choice;
}

// ─── Threshold query ───────────────────────────────────────────────────────
//
// Delegates to the active backend. Callers use this to decide between bun:simd
// and bun:gpu without hard-coding sizes:
//
//   if (gpu.winsForSize("matVec", nRows * nCols, 4)) { ... }
//
// The `cpu` backend always returns `false` — that's intentional, so
// consumers can guard with `if (winsForSize(...))` and fall through to
// bun:simd without a second check.

function winsForSize(op: OpKind, n: number, elemBytes: number): boolean {
  return resolveActive().winsForSize(op, n, elemBytes);
}

// ─── Public ops ────────────────────────────────────────────────────────────

function dot(a: FArray, b: FArray): number {
  return resolveActive().dot(a, b);
}

function matVec(matrix: Float32Array, vector: Float32Array, nRows: number, nCols: number): Float32Array;
function matVec(matrix: Float64Array, vector: Float64Array, nRows: number, nCols: number): Float64Array;
function matVec(matrix: GpuHandle, vector: Float32Array, nRows: number, nCols: number): Float32Array;
function matVec(matrix: FArray | GpuHandle, vector: FArray, nRows: number, nCols: number): FArray {
  return resolveActive().matVec(matrix, vector, nRows, nCols);
}

function matmul(a: Float32Array, b: Float32Array, m: number, k: number, n: number): Float32Array;
function matmul(a: Float64Array, b: Float64Array, m: number, k: number, n: number): Float64Array;
function matmul(a: FArray, b: FArray, m: number, k: number, n: number): FArray {
  if (!Number.isInteger(m) || m < 0) throw new RangeError("m must be a non-negative integer");
  if (!Number.isInteger(k) || k < 0) throw new RangeError("k must be a non-negative integer");
  if (!Number.isInteger(n) || n < 0) throw new RangeError("n must be a non-negative integer");
  if (a.length !== m * k) throw new RangeError(`a length ${a.length} != m * k (${m} * ${k} = ${m * k})`);
  if (b.length !== k * n) throw new RangeError(`b length ${b.length} != k * n (${k} * ${n} = ${k * n})`);
  return resolveActive().matmul(a, b, m, k, n);
}

function simdMap(fn: (x: number, i: number) => number, a: Float32Array): Float32Array;
function simdMap(fn: (x: number, i: number) => number, a: Float64Array): Float64Array;
function simdMap(fn: (x: number, i: number) => number, a: FArray): FArray {
  return resolveActive().simdMap(fn, a);
}

// Page-aligned typed array suitable for zero-copy staging into the active
// backend's device memory. On Metal, alloc()'d matrices take the NOCOPY
// dispatch path in matVec — see bench/parabun-metal-zerocopy/README.md for
// the size/speed tradeoff. On CPU (and today's CUDA) it just returns a
// plain typed array since the backend has no benefit from alignment.
function alloc(length: number, type: "f32"): Float32Array;
function alloc(length: number, type: "f64"): Float64Array;
function alloc(length: number, type: "f32" | "f64"): FArray {
  return resolveActive().alloc(length, type);
}

function isAligned(arr: FArray): boolean {
  return resolveActive().isAligned(arr);
}

// hold(arr) keeps a typed array GPU-resident across matVec calls. On Metal
// this creates one MTLBuffer up front (NOCOPY if `arr` is page-aligned, else
// a COPY into an MTLBuffer-owned region) and reuses it per dispatch; the
// bench/parabun-metal-zerocopy RESIDENT row (30-150% faster than NOCOPY) is
// what this API exposes. On CPU and today's CUDA, `hold` is a no-op wrapper
// so user code is portable — same call site, same handle, just no residency
// win.
//
// Lifetime: caller MUST call `release(handle)` when done. Re-using a
// released handle (matVec or release) throws. The handle holds a reference
// to the original typed array so its backing memory can't be GC'd while
// Metal still points at it.
function hold(arr: Float32Array): GpuHandle;
function hold(arr: Float64Array): GpuHandle;
function hold(arr: FArray): GpuHandle {
  return resolveActive().hold(arr);
}

function release(handle: GpuHandle): void {
  // Route to the handle's origin backend rather than the active one — if
  // the user switched backends after `hold`, the MTLBuffer we need to free
  // lives on the metal backend regardless of what's active now.
  const origin = backends[handle.backend] ?? resolveActive();
  origin.releaseHandle(handle);
}

function dispose(): void {
  // Dispose every probed backend (not just the active one) — if someone
  // switched away from metal to cpu mid-session, we still want to release
  // the MTLDevice / MTLCommandQueue it owned.
  for (const name of Object.keys(backends) as BackendName[]) {
    backends[name].dispose();
  }
  active = null;
}

// ─── Introspection ─────────────────────────────────────────────────────────

function describe(): {
  active: BackendName;
  available: BackendName[];
  platform: string;
} {
  const available: BackendName[] = [];
  for (const name of ["metal", "cuda", "cpu"] as BackendName[]) {
    if (backends[name].probe()) available.push(name);
  }
  return {
    active: activeBackend(),
    available,
    platform: PLATFORM,
  };
}

export default {
  dot,
  matVec,
  matmul,
  simdMap,
  alloc,
  isAligned,
  hold,
  release,
  activeBackend,
  hasBackend,
  setBackend,
  winsForSize,
  dispose,
  describe,
};
