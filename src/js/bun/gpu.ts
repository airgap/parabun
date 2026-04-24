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
  // Optional quant marker: if present, the device buffer holds raw quantized
  // bytes (not fp32) and matVec dispatches to an on-chip dequant kernel. The
  // `length` field remains the logical (dequantized) element count.
  readonly qFormat?: "q4_K" | "q6_K";
  // Backend-internal fields (not part of the public contract):
  buffer: bigint;
  view: FArray;
  released: boolean;
};

function isGpuHandle(x: unknown): x is GpuHandle {
  return typeof x === "object" && x !== null && (x as any).__bunGpuHandle === true;
}

// ─── Auto-residency wrapper ────────────────────────────────────────────────
//
// GpuFloat32Array wraps a Float32Array + GpuHandle so callers don't have to
// thread `hold()` / `release()` through their code. Construction auto-holds;
// disposal (explicit via `using`, or falling out of scope for the GC safety
// net) auto-releases. Every op that takes a GpuHandle also accepts one of
// these — they unwrap to the underlying handle at the dispatch site.
//
//   using index = new GpuFloat32Array(embeddings);
//   const scores = gpu.matmul(queries, index, Q, D, N);
//   // released here when `index` falls out of scope
//
// The GC safety net (FinalizationRegistry) is a fallback only — non-
// deterministic and may run arbitrarily late, so don't rely on it to
// bound device memory. Always prefer `using` or an explicit `.release()`.
//
// On backends where `hold()` is a no-op (CPU today, and CUDA for f64),
// the wrapper is effectively a thin view; the API stays uniform.

const gpuFinalizer = new FinalizationRegistry<{ handle: GpuHandle }>(cell => {
  if (!cell.handle.released) {
    const origin = backends[cell.handle.backend] ?? cpuBackend;
    origin.releaseHandle(cell.handle);
  }
});

class GpuFloat32Array {
  readonly #handle: GpuHandle;
  readonly #view: Float32Array;
  #disposed: boolean;

  constructor(source: Float32Array | number) {
    let arr: Float32Array;
    if (typeof source === "number") {
      arr = resolveActive().alloc(source, "f32") as Float32Array;
    } else if (source instanceof Float32Array) {
      arr = source;
    } else {
      throw new TypeError(
        `GpuFloat32Array: expected Float32Array or length (number); got ${
          (source as any)?.constructor?.name ?? typeof source
        }`,
      );
    }
    this.#view = arr;
    this.#handle = resolveActive().hold(arr);
    this.#disposed = false;
    gpuFinalizer.register(this, { handle: this.#handle }, this);
  }

  get length(): number {
    return this.#view.length;
  }

  get view(): Float32Array {
    if (this.#disposed) throw new Error("GpuFloat32Array: already disposed");
    return this.#view;
  }

  // Internal accessor used by unwrapGpuArg at dispatch sites. Not exposed on
  // the public surface — callers should pass the wrapper itself to ops.
  get __handle(): GpuHandle {
    if (this.#disposed) throw new Error("GpuFloat32Array: already disposed");
    return this.#handle;
  }

  release(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    gpuFinalizer.unregister(this);
    const origin = backends[this.#handle.backend] ?? resolveActive();
    origin.releaseHandle(this.#handle);
  }

  [Symbol.dispose](): void {
    this.release();
  }
}

function isGpuFloat32Array(x: unknown): x is GpuFloat32Array {
  return x instanceof GpuFloat32Array;
}

// Lightweight wrapper around a pre-built GpuHandle (e.g. from holdQ4K or any
// quant-format upload). Does not own a host Float32Array — the `.view`
// accessor throws to prevent accidental fp32 reads of quantized bytes.
// Callers use `.__handle` at dispatch sites (same shape as GpuFloat32Array)
// so the forward-pass code can stay polymorphic.
class GpuHandleArray {
  readonly #handle: GpuHandle;
  #disposed: boolean;

  constructor(handle: GpuHandle) {
    if (!isGpuHandle(handle)) {
      throw new TypeError("GpuHandleArray: expected a GpuHandle");
    }
    this.#handle = handle;
    this.#disposed = false;
    gpuFinalizer.register(this, { handle }, this);
  }

  get length(): number {
    return this.#handle.length;
  }

  get view(): Float32Array {
    throw new Error(
      `GpuHandleArray: .view is unavailable for ${this.#handle.qFormat ?? "quant"} handles — use the device path`,
    );
  }

  get __handle(): GpuHandle {
    if (this.#disposed) throw new Error("GpuHandleArray: already disposed");
    return this.#handle;
  }

  release(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    gpuFinalizer.unregister(this);
    const origin = backends[this.#handle.backend] ?? resolveActive();
    origin.releaseHandle(this.#handle);
  }

  [Symbol.dispose](): void {
    this.release();
  }
}

// Normalize any accepted input shape to the raw FArray/GpuHandle the
// backend ops expect. Wrappers unwrap to their inner handle; handles pass
// through untouched; typed arrays pass through untouched.
function unwrapGpuArg<T extends FArray>(x: T | GpuHandle | GpuFloat32Array): T | GpuHandle {
  if (isGpuFloat32Array(x)) return x.__handle;
  return x;
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
  dot(a: FArray | GpuHandle, b: FArray | GpuHandle): number;
  matVec(matrix: FArray | GpuHandle, vector: FArray, nRows: number, nCols: number): FArray;
  matmul(a: FArray | GpuHandle, b: FArray | GpuHandle, m: number, k: number, n: number, out?: FArray): FArray;
  simdMap(fn: (x: number, i: number) => number, a: FArray | GpuHandle): FArray;
  alloc(length: number, type: "f32" | "f64", opts?: { pinned?: boolean }): FArray;
  isAligned(arr: FArray): boolean;
  hold(arr: FArray): GpuHandle;
  releaseHandle(handle: GpuHandle): void;
  releasePinned?(arr: FArray): boolean;
  calibrate?(): CalibrationResult;
  dispose(): void;
}

export type CalibrationResult = {
  simdMap: number; // Infinity if GPU never wins
  cacheFile: string;
  deviceName: string;
};

function unwrapHandle<T extends FArray>(x: T | GpuHandle): T {
  if (isGpuHandle(x)) {
    if (x.released) throw new Error("bun:gpu: op called on released handle");
    return x.view as T;
  }
  return x;
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
    return simd.dot(unwrapHandle(a), unwrapHandle(b));
  },
  matVec(matrix, vector, nRows, nCols) {
    const matView = unwrapHandle(matrix);
    return simd.matVec(matView as any, vector as any, nRows, nCols);
  },
  matmul(a, b, m, k, n, out) {
    const av = unwrapHandle(a);
    const bv = unwrapHandle(b);
    if (av.constructor !== bv.constructor) {
      throw new TypeError(
        `a and b must both be Float32Array or both be Float64Array; got ${av.constructor.name} and ${bv.constructor.name}`,
      );
    }
    let dst: FArray;
    if (out !== undefined) {
      if (out.constructor !== av.constructor) {
        throw new TypeError(`out type ${out.constructor.name} must match a/b type ${av.constructor.name}`);
      }
      dst = out;
      // Caller-provided buffer may be reused — zero before accumulating.
      for (let i = 0; i < m * n; i++) dst[i] = 0;
    } else {
      dst = (av instanceof Float32Array ? new Float32Array(m * n) : new Float64Array(m * n)) as FArray;
    }
    // Row-major A (m×k), row-major B (k×n), row-major out (m×n).
    // Naive triple loop with accumulator promoted out of the inner loop.
    // GPU backends replace this with a proper tiled kernel.
    for (let i = 0; i < m; i++) {
      const aRow = i * k;
      const oRow = i * n;
      for (let p = 0; p < k; p++) {
        const x = av[aRow + p];
        if (x === 0) continue;
        const bRow = p * n;
        for (let j = 0; j < n; j++) dst[oRow + j] += x * bv[bRow + j];
      }
    }
    return dst;
  },
  simdMap(fn, a) {
    return simd.simdMap(fn, unwrapHandle(a) as any);
  },
  alloc(length, type, _opts) {
    if (!Number.isInteger(length) || length < 0) {
      throw new RangeError(`length must be a non-negative integer; got ${length}`);
    }
    if (type !== "f32" && type !== "f64") {
      throw new TypeError(`type must be "f32" or "f64"; got ${String(type)}`);
    }
    // `pinned: true` is a silent no-op on CPU — the flag exists for CUDA
    // and Metal to opt into DMA-capable / unified-memory allocations; CPU
    // just returns a plain typed array either way.
    return type === "f32" ? new Float32Array(length) : new Float64Array(length);
  },
  isAligned(_arr) {
    return false;
  },
  releasePinned(_arr) {
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

// Per-host calibration — sweeps the real GPU kernel against bun:simd at a
// small set of sizes, persists the measured CPU→GPU crossover under
// `~/.cache/parabun/gpu-calibrate-<hash>.json`, and rehydrates it on
// subsequent process starts. Intended to be called once at app boot; the
// sweep takes on the order of 200–500ms end-to-end and should not run on
// a request path. Throws on the CPU backend (nothing to calibrate).
//
// Returns the measured `simdMap` crossover in elements (or `Infinity` if
// GPU never wins on this host), plus the persisted cache path and device
// name so callers can log a one-liner. Setting
// `BUN_PARABUN_SKIP_CALIBRATION=1` bypasses the cache read on module load
// — useful for tests that need a known-clean default.
function calibrate(): CalibrationResult {
  const b = resolveActive();
  if (!b.calibrate) {
    throw new Error(`bun:gpu: backend ${b.name} has no crossover to calibrate`);
  }
  return b.calibrate();
}

// ─── Public ops ────────────────────────────────────────────────────────────

function dot(a: FArray | GpuHandle | GpuFloat32Array, b: FArray | GpuHandle | GpuFloat32Array): number {
  return resolveActive().dot(unwrapGpuArg(a), unwrapGpuArg(b));
}

function matVec(matrix: Float32Array, vector: Float32Array, nRows: number, nCols: number): Float32Array;
function matVec(matrix: Float64Array, vector: Float64Array, nRows: number, nCols: number): Float64Array;
function matVec(matrix: GpuHandle, vector: Float32Array, nRows: number, nCols: number): Float32Array;
function matVec(matrix: GpuFloat32Array, vector: Float32Array, nRows: number, nCols: number): Float32Array;
function matVec(matrix: FArray | GpuHandle | GpuFloat32Array, vector: FArray, nRows: number, nCols: number): FArray {
  return resolveActive().matVec(unwrapGpuArg(matrix), vector, nRows, nCols);
}

function matmul(a: Float32Array, b: Float32Array, m: number, k: number, n: number, out?: Float32Array): Float32Array;
function matmul(a: Float64Array, b: Float64Array, m: number, k: number, n: number, out?: Float64Array): Float64Array;
function matmul(
  a: GpuHandle | GpuFloat32Array,
  b: GpuHandle | GpuFloat32Array,
  m: number,
  k: number,
  n: number,
  out?: Float32Array,
): FArray;
function matmul(
  a: FArray | GpuHandle | GpuFloat32Array,
  b: FArray | GpuHandle | GpuFloat32Array,
  m: number,
  k: number,
  n: number,
  out?: FArray,
): FArray {
  if (!Number.isInteger(m) || m < 0) throw new RangeError("m must be a non-negative integer");
  if (!Number.isInteger(k) || k < 0) throw new RangeError("k must be a non-negative integer");
  if (!Number.isInteger(n) || n < 0) throw new RangeError("n must be a non-negative integer");
  if (a.length !== m * k) throw new RangeError(`a length ${a.length} != m * k (${m} * ${k} = ${m * k})`);
  if (b.length !== k * n) throw new RangeError(`b length ${b.length} != k * n (${k} * ${n} = ${k * n})`);
  if (out !== undefined) {
    if (!(out instanceof Float32Array) && !(out instanceof Float64Array)) {
      throw new TypeError(
        `out must be Float32Array or Float64Array; got ${(out as any)?.constructor?.name ?? typeof out}`,
      );
    }
    if (out.length < m * n) {
      throw new RangeError(`out length ${out.length} < m * n (${m} * ${n} = ${m * n})`);
    }
  }
  return resolveActive().matmul(unwrapGpuArg(a), unwrapGpuArg(b), m, k, n, out);
}

function simdMap(fn: (x: number, i: number) => number, a: Float32Array): Float32Array;
function simdMap(fn: (x: number, i: number) => number, a: Float64Array): Float64Array;
function simdMap(fn: (x: number, i: number) => number, a: GpuHandle | GpuFloat32Array): FArray;
function simdMap(fn: (x: number, i: number) => number, a: FArray | GpuHandle | GpuFloat32Array): FArray {
  return resolveActive().simdMap(fn, unwrapGpuArg(a));
}

// Page-aligned typed array suitable for zero-copy staging into the active
// backend's device memory. On Metal, alloc()'d matrices take the NOCOPY
// dispatch path in matVec — see bench/parabun-metal-zerocopy/README.md for
// the size/speed tradeoff. On CPU (and today's CUDA) it just returns a
// plain typed array since the backend has no benefit from alignment.
function alloc(length: number, type: "f32", opts?: { pinned?: boolean }): Float32Array;
function alloc(length: number, type: "f64", opts?: { pinned?: boolean }): Float64Array;
function alloc(length: number, type: "f32" | "f64", opts?: { pinned?: boolean }): FArray {
  return resolveActive().alloc(length, type, opts);
}

function isAligned(arr: FArray): boolean {
  return resolveActive().isAligned(arr);
}

// Free memory previously allocated with `alloc(n, t, { pinned: true })`.
// Returns true if `arr` was pinned on the active backend, false if it was a
// plain typed array (no-op). On backends that don't support pinning (CPU,
// today's Metal), always returns false — caller code stays portable.
function releasePinned(arr: FArray): boolean {
  const backend = resolveActive();
  return backend.releasePinned ? backend.releasePinned(arr) : false;
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

// Hold a Q4_K-quantized tensor on the active backend. `blocks` is the raw
// super-block byte stream as stored in GGUF (144 bytes per 256-element
// super-block, row-major). `nElems` is the logical dequantized element count.
// Only the CUDA backend currently implements this; other backends throw.
// The returned handle carries `qFormat: "q4_K"` and matVec will dispatch to
// the on-chip dequant kernel without ever materializing fp32 weights.
function holdQ4K(blocks: Uint8Array, nElems: number): GpuHandle {
  const b = resolveActive() as any;
  if (typeof b.holdQ4K !== "function") {
    throw new Error(`bun:gpu: backend ${b.name ?? "unknown"} does not support Q4_K residency`);
  }
  return b.holdQ4K(blocks, nElems);
}

// Hold a Q6_K-quantized tensor on the active backend. Same shape as holdQ4K
// but for 210-byte super-blocks. Used for the higher-quality tensors
// (token_embd, wv, wDown) in a Q4_K_M mix.
function holdQ6K(blocks: Uint8Array, nElems: number): GpuHandle {
  const b = resolveActive() as any;
  if (typeof b.holdQ6K !== "function") {
    throw new Error(`bun:gpu: backend ${b.name ?? "unknown"} does not support Q6_K residency`);
  }
  return b.holdQ6K(blocks, nElems);
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

// Escape hatch to the active backend's device-resident kernel surface
// (bun:llm forward-pass path). Returns null unless the active backend is
// CUDA _and_ NVRTC is available to compile the device-ops module. See
// src/js/bun/gpu/cuda.ts `DevOps` for the full shape.
function getDevOps(): any {
  const b = resolveActive();
  const fn = (b as any).getDevOps;
  return typeof fn === "function" ? fn() : null;
}

// Internal accessor that returns whatever devOps-shape functions the
// active backend has wired, even if the full forward-pass surface is
// incomplete. Used by incremental-port tests to exercise individual
// kernels as they land. bun:llm never calls this — it only calls
// getDevOps(), which returns null until the full surface is ready.
function _getPartialDevOps(): any {
  const b = resolveActive();
  const fn = (b as any)._getPartialDevOps;
  return typeof fn === "function" ? fn() : null;
}

export default {
  dot,
  matVec,
  matmul,
  simdMap,
  alloc,
  isAligned,
  hold,
  holdQ4K,
  holdQ6K,
  release,
  releasePinned,
  GpuFloat32Array,
  GpuHandleArray,
  activeBackend,
  hasBackend,
  setBackend,
  winsForSize,
  calibrate,
  dispose,
  describe,
  getDevOps,
  _getPartialDevOps,
};
