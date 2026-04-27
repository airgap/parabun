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

  /**
   * Write `src` into the device buffer at the given element offset. Used
   * by callers that maintain a growable device-resident cache (e.g.
   * Whisper's KV caches, where each decode step appends one row of K and
   * V without re-uploading the whole cache).
   */
  writeAt(offsetElems: number, src: Float32Array): void {
    if (this.#disposed) throw new Error("GpuFloat32Array: already disposed");
    if (!Number.isInteger(offsetElems) || offsetElems < 0) {
      throw new RangeError("GpuFloat32Array.writeAt: offsetElems must be a non-negative integer");
    }
    if (offsetElems + src.length > this.#view.length) {
      throw new RangeError(
        `GpuFloat32Array.writeAt: ${src.length}@${offsetElems} overflows length ${this.#view.length}`,
      );
    }
    // Mirror the write into the host view so .view stays consistent.
    this.#view.set(src, offsetElems);
    const backend = backends[this.#handle.backend] ?? resolveActive();
    if (backend.writeHandleAt) {
      backend.writeHandleAt(this.#handle, offsetElems, src);
    }
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
  /**
   * Batched matmul: `batchCount` independent [m,k]·[k,n] = [m,n] products
   * in one call. Strides are in elements (not bytes). On CUDA with cuBLAS
   * available this dispatches to `cublasSgemmStridedBatched` — one launch
   * regardless of batchCount; on other backends, it loops. Useful for
   * per-head attention (Q@K^T, attn@V) where head-major layouts let one
   * call cover all heads.
   */
  matmulBatched?(
    a: FArray | GpuHandle,
    b: FArray | GpuHandle,
    batchCount: number,
    m: number,
    k: number,
    n: number,
    strideA: number,
    strideB: number,
    strideC: number,
    out?: FArray,
  ): FArray;
  /**
   * Multi-head scaled-dot-product self-attention. Q, K, V are
   * [N, nHead*headDim] row-major; output has the same shape. Backends
   * that implement this fuse the per-head Q@K^T → softmax → attn@V
   * pipeline into one kernel launch — the alternative is N matmul
   * launches plus a JS softmax loop, which dominates at small head
   * dims.
   */
  sdpaSelf?(
    Q: FArray | GpuHandle,
    K: FArray | GpuHandle,
    V: FArray | GpuHandle,
    N: number,
    nHead: number,
    headDim: number,
    out?: Float32Array,
  ): Float32Array;
  /**
   * Single-query multi-head SDPA — one query row against `kvLen` cached
   * keys/values. The per-token decoder pattern (decoder self-attention
   * with growing KV cache, decoder cross-attention against precomputed
   * encoder K/V). Backends that implement this fuse the per-head
   * Q · K^T → softmax → attn · V into one kernel launch.
   */
  sdpaSingleQuery?(
    Q: FArray | GpuHandle,
    K: FArray | GpuHandle,
    V: FArray | GpuHandle,
    kvLen: number,
    nHead: number,
    headDim: number,
    out?: Float32Array,
  ): Float32Array;
  /**
   * 2D valid-mode convolution. `input` is iH×iW row-major Float32Array,
   * `kernel` is kH×kW row-major Float32Array. Output is (iH-kH+1)×(iW-kW+1)
   * row-major Float32Array. Backends MAY implement this; if a backend
   * doesn't, the public wrapper falls back to the CPU implementation.
   */
  conv2D?(
    input: Float32Array | GpuHandle,
    kernel: Float32Array | GpuHandle,
    iW: number,
    iH: number,
    kW: number,
    kH: number,
  ): Float32Array;
  /**
   * Inclusive prefix sum over `input`. Output length matches input. Backends
   * MAY implement this; if a backend doesn't, the public wrapper falls back
   * to the CPU reference.
   */
  scan?(input: Float32Array | GpuHandle): Float32Array;
  /**
   * Reduction. `op` is "sum" | "min" | "max"; result is a single number.
   * Backends MAY implement this; if they don't, the public wrapper falls
   * back to the CPU reference.
   */
  reduce?(input: Float32Array | GpuHandle, op: "sum" | "min" | "max"): number;
  /**
   * Index-of-extremum lookups. Both return -1 on empty input (the public
   * wrapper translates that to a thrown RangeError); NaN propagates as
   * NaN. Tie-break: first occurrence (lowest index wins).
   */
  argMin?(input: Float32Array | GpuHandle): number;
  argMax?(input: Float32Array | GpuHandle): number;
  /**
   * Population (or sample, with `ddof: 1`) variance over `Float32Array`.
   * Two-pass: backend reduces for the mean, then reduces (x - mean)².
   * Returns NaN on empty input or `ddof >= n`. Backends MAY implement;
   * the public wrapper falls back to the CPU reference.
   */
  variance?(input: Float32Array | GpuHandle, ddof: number): number;
  /**
   * Single-launch fused Gaussian blur on packed RGBA uint8 — used by
   * bun:image's GPU dispatch path. Returns null if the backend has no
   * GPU implementation available (e.g. CUDA without NVRTC), so the
   * public wrapper can fall through to the CPU path.
   */
  imageBlurRGBA?(input: Uint8Array, w: number, h: number, radius: number): Uint8Array | null;
  /**
   * Bin-counting histogram. Returns a Uint32Array of length `bins`.
   * `min` and `max` are pre-resolved by the public wrapper. Backends
   * MAY implement this for device-side privatized histograms.
   */
  histogram?(input: Float32Array | GpuHandle, bins: number, min: number, max: number): Uint32Array;
  simdMap(fn: (x: number, i: number) => number, a: FArray | GpuHandle): FArray;
  alloc(length: number, type: "f32" | "f64", opts?: { pinned?: boolean }): FArray;
  isAligned(arr: FArray): boolean;
  hold(arr: FArray): GpuHandle;
  releaseHandle(handle: GpuHandle): void;
  /**
   * Write a host typed array into a device-held handle at the given
   * element offset. Used by GpuFloat32Array.writeAt for growable
   * device-resident caches. Backends that don't expose partial-write
   * primitives (CPU, where the handle is just a wrapper around the
   * host array) can leave this undefined — the wrapper has already
   * mirrored the write into its host view.
   */
  writeHandleAt?(handle: GpuHandle, offsetElems: number, src: FArray): void;
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

// CPU reference for inclusive prefix sum (a.k.a. inclusive scan).
// out[i] = in[0] + in[1] + ... + in[i]. Kahan-compensated accumulation
// keeps the float-add round-off bounded even for long inputs — the
// straightforward `acc += in[i]` accumulates O(n·ε) error, which becomes
// visible past a few hundred thousand elements. Compensated summation
// holds the per-step error in a separate float and re-injects it.
//
// GPU backends override via Backend.scan with a parallel Hillis-Steele
// (or Blelloch on CUDA / Metal) implementation; this CPU path is the
// fallback and the correctness reference.
function cpuScan(input: Float32Array): Float32Array {
  const n = input.length;
  const out = new Float32Array(n);
  let acc = 0;
  let comp = 0; // Kahan compensation for the running sum
  for (let i = 0; i < n; i++) {
    const y = input[i] - comp;
    const t = acc + y;
    comp = t - acc - y;
    acc = t;
    out[i] = acc;
  }
  return out;
}

// CPU reductions. Same Kahan trick for sum so long inputs stay accurate;
// straight loops for min/max. Empty-input semantics match the well-known
// JS `Math.min` / `Math.max` / `[].reduce(... 0)` conventions:
//   sum([]) = 0,  min([]) = +Infinity,  max([]) = -Infinity.
function cpuReduceF32(input: Float32Array, op: "sum" | "min" | "max"): number {
  const n = input.length;
  if (op === "sum") {
    let acc = 0;
    let comp = 0;
    for (let i = 0; i < n; i++) {
      const y = input[i] - comp;
      const t = acc + y;
      comp = t - acc - y;
      acc = t;
    }
    return acc;
  }
  if (op === "min") {
    let m = Infinity;
    for (let i = 0; i < n; i++) {
      const v = input[i];
      // NaN propagates: any NaN in the input → NaN result, matching Math.min.
      if (Number.isNaN(v)) return NaN;
      if (v < m) m = v;
    }
    return m;
  }
  // op === "max"
  let m = -Infinity;
  for (let i = 0; i < n; i++) {
    const v = input[i];
    if (Number.isNaN(v)) return NaN;
    if (v > m) m = v;
  }
  return m;
}

// CPU histogram. Counts how many input values fall into each of `bins`
// equal-width buckets across [min, max]. Values outside the range are
// dropped (silent — callers can pass [reduce min, reduce max] to count
// everything). NaN is also dropped.
//
// The top edge is inclusive: a value exactly equal to `max` lands in
// the last bin instead of falling off the end. Without this, a uniform
// 0..1 input with max=1 would always undercount the last bin by one.
function cpuHistogramF32(input: Float32Array, bins: number, min: number, max: number): Uint32Array {
  const out = new Uint32Array(bins);
  if (min === max) {
    // Degenerate range — every (in-range, non-NaN) value goes in bin 0.
    let n = 0;
    for (let i = 0; i < input.length; i++) {
      const v = input[i];
      if (Number.isNaN(v) || v !== min) continue;
      n++;
    }
    out[0] = n;
    return out;
  }
  const scale = bins / (max - min);
  const last = bins - 1;
  for (let i = 0; i < input.length; i++) {
    const v = input[i];
    if (Number.isNaN(v) || v < min || v > max) continue;
    let bin = (v - min) * scale;
    bin = bin | 0; // truncate toward 0 (input is ≥ 0 after the subtraction)
    if (bin > last) bin = last; // top-edge inclusivity
    out[bin]++;
  }
  return out;
}

// CPU variance via numerically-stable two-pass. Pass 1 computes a Kahan-
// compensated mean; pass 2 sums (x - mean)². The single-pass naive
// formula sum(x²) - (sum(x))²/n is dramatically less stable for inputs
// far from zero — by the time the values get squared the cancellation
// dominates the answer. Two-pass costs an extra read but stays
// well-conditioned across the whole f32 range.
//
// `ddof` controls the divisor. ddof = 0 (default, "population variance")
// divides by n; ddof = 1 ("sample variance") divides by n - 1 to give
// an unbiased estimator. ddof >= n returns NaN (the divisor would go
// non-positive). Empty input also returns NaN.
function cpuVarianceF32(input: Float32Array, ddof: number): number {
  const n = input.length;
  if (n === 0) return NaN;
  if (n - ddof <= 0) return NaN;
  // Pass 1: compensated mean.
  let acc = 0;
  let comp = 0;
  for (let i = 0; i < n; i++) {
    const y = input[i] - comp;
    const t = acc + y;
    comp = t - acc - y;
    acc = t;
  }
  const mean = acc / n;
  // Pass 2: sum of squared deviations from the mean.
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const d = input[i] - mean;
    sumSq += d * d;
  }
  return sumSq / (n - ddof);
}

function cpuVarianceU32(input: Uint32Array, ddof: number): number {
  const n = input.length;
  if (n === 0) return NaN;
  if (n - ddof <= 0) return NaN;
  // u32 sums fit in f64 without loss for any plausible n (max value
  // < 2^32 * 2^53 / 2^32 = 2^53), so a plain f64 accumulator is exact.
  let sum = 0;
  for (let i = 0; i < n; i++) sum += input[i];
  const mean = sum / n;
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const d = input[i] - mean;
    sumSq += d * d;
  }
  return sumSq / (n - ddof);
}

// CPU quantile (and median = quantile(0.5)). Sorts a fresh copy of the
// input, then linearly interpolates between adjacent order statistics —
// matches numpy's default "linear" interpolation:
//   pos = q * (n - 1)
//   value = sorted[floor(pos)] * (1 - frac) + sorted[ceil(pos)] * frac
//
// Empty input returns NaN (also matching numpy).
//
// Sort is O(n log n) — fine for arbitrary q. For median specifically a
// proper Quickselect would be O(n); the cost difference only matters for
// huge arrays, so the simple path is the right v1.
function cpuQuantileF32(input: Float32Array, q: number): number {
  const n = input.length;
  if (n === 0) return NaN;
  const sorted = new Float32Array(input);
  sorted.sort();
  const pos = q * (n - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  const frac = pos - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

function cpuQuantileU32(input: Uint32Array, q: number): number {
  const n = input.length;
  if (n === 0) return NaN;
  // Float32 sort is enough — Uint32 max is 2^32 - 1, beyond f32's exactly-
  // representable range, so use a Float64Array for the sorted copy to keep
  // the interpolation exact.
  const sorted = new Float64Array(input);
  sorted.sort();
  const pos = q * (n - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  const frac = pos - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

// CPU argmin/argmax. Returns the *index* of the smallest/largest element.
// Tie-break: first occurrence (i.e. the earliest index that holds the
// extremum), matching numpy's argmin/argmax convention. NaN propagates by
// returning the index of the first NaN — consistent with reduce's
// "NaN-in → NaN-out" semantics: callers can chain `input[argMin] === NaN`
// to detect contamination without re-scanning.
//
// Empty input throws — there is no meaningful "argmin of nothing" and
// returning -1 would silently break compositional code.
function cpuArgMinF32(input: Float32Array): number {
  const n = input.length;
  if (n === 0) throw new RangeError("bun:gpu.argMin: empty input has no extremum");
  if (Number.isNaN(input[0])) return 0;
  let mi = 0;
  let m = input[0];
  for (let i = 1; i < n; i++) {
    const v = input[i];
    if (Number.isNaN(v)) return i;
    if (v < m) {
      m = v;
      mi = i;
    }
  }
  return mi;
}

function cpuArgMaxF32(input: Float32Array): number {
  const n = input.length;
  if (n === 0) throw new RangeError("bun:gpu.argMax: empty input has no extremum");
  if (Number.isNaN(input[0])) return 0;
  let mi = 0;
  let m = input[0];
  for (let i = 1; i < n; i++) {
    const v = input[i];
    if (Number.isNaN(v)) return i;
    if (v > m) {
      m = v;
      mi = i;
    }
  }
  return mi;
}

function cpuArgMinU32(input: Uint32Array): number {
  const n = input.length;
  if (n === 0) throw new RangeError("bun:gpu.argMin: empty input has no extremum");
  let mi = 0;
  let m = input[0];
  for (let i = 1; i < n; i++) {
    if (input[i] < m) {
      m = input[i];
      mi = i;
    }
  }
  return mi;
}

function cpuArgMaxU32(input: Uint32Array): number {
  const n = input.length;
  if (n === 0) throw new RangeError("bun:gpu.argMax: empty input has no extremum");
  let mi = 0;
  let m = input[0];
  for (let i = 1; i < n; i++) {
    if (input[i] > m) {
      m = input[i];
      mi = i;
    }
  }
  return mi;
}

function cpuReduceU32(input: Uint32Array, op: "sum" | "min" | "max"): number {
  const n = input.length;
  if (op === "sum") {
    let acc = 0;
    for (let i = 0; i < n; i++) acc = (acc + input[i]) >>> 0;
    return acc;
  }
  if (op === "min") {
    if (n === 0) return Infinity;
    let m = input[0];
    for (let i = 1; i < n; i++) if (input[i] < m) m = input[i];
    return m;
  }
  // op === "max"
  if (n === 0) return -Infinity;
  let m = input[0];
  for (let i = 1; i < n; i++) if (input[i] > m) m = input[i];
  return m;
}

// Integer prefix sum. No Kahan compensation needed — `>>> 0` makes the
// running total wrap at 2^32 like a u32 add, so the result matches what
// a parallel scan kernel would produce on a u32 lane. Compaction-style
// inputs (0/1 indicators marking elements to keep) never approach
// 2^32, so the wrap is theoretical for those use cases.
function cpuScanU32(input: Uint32Array): Uint32Array {
  const n = input.length;
  const out = new Uint32Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc = (acc + input[i]) >>> 0;
    out[i] = acc;
  }
  return out;
}

// CPU reference for 2D valid-mode convolution. Naive triple loop with the
// kernel-element accumulator promoted out of the inner loop. GPU backends
// substitute their own kernels via Backend.conv2D; this also serves as the
// fallback when a backend doesn't implement conv2D yet.
function cpuConv2D(
  input: Float32Array,
  kernel: Float32Array,
  iW: number,
  iH: number,
  kW: number,
  kH: number,
): Float32Array {
  const oW = iW - kW + 1;
  const oH = iH - kH + 1;
  const out = new Float32Array(oW * oH);
  for (let y = 0; y < oH; y++) {
    for (let x = 0; x < oW; x++) {
      let acc = 0;
      for (let ky = 0; ky < kH; ky++) {
        const inRow = (y + ky) * iW + x;
        const kRow = ky * kW;
        for (let kx = 0; kx < kW; kx++) {
          acc += input[inRow + kx] * kernel[kRow + kx];
        }
      }
      out[y * oW + x] = acc;
    }
  }
  return out;
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
  conv2D(input, kernel, iW, iH, kW, kH) {
    return cpuConv2D(
      unwrapHandle(input as any) as Float32Array,
      unwrapHandle(kernel as any) as Float32Array,
      iW,
      iH,
      kW,
      kH,
    );
  },
  scan(input) {
    return cpuScan(unwrapHandle(input as any) as Float32Array);
  },
  reduce(input, op) {
    return cpuReduceF32(unwrapHandle(input as any) as Float32Array, op);
  },
  histogram(input, bins, min, max) {
    return cpuHistogramF32(unwrapHandle(input as any) as Float32Array, bins, min, max);
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

function matmulBatched(
  a: FArray | GpuHandle | GpuFloat32Array,
  b: FArray | GpuHandle | GpuFloat32Array,
  batchCount: number,
  m: number,
  k: number,
  n: number,
  strideA: number,
  strideB: number,
  strideC: number,
  out?: FArray,
): FArray {
  if (!Number.isInteger(batchCount) || batchCount < 0) {
    throw new RangeError("matmulBatched: batchCount must be a non-negative integer");
  }
  if (!Number.isInteger(m) || m < 0) throw new RangeError("matmulBatched: m must be a non-negative integer");
  if (!Number.isInteger(k) || k < 0) throw new RangeError("matmulBatched: k must be a non-negative integer");
  if (!Number.isInteger(n) || n < 0) throw new RangeError("matmulBatched: n must be a non-negative integer");
  const backend = resolveActive();
  if (backend.matmulBatched) {
    return backend.matmulBatched(unwrapGpuArg(a), unwrapGpuArg(b), batchCount, m, k, n, strideA, strideB, strideC, out);
  }
  // Fallback: per-batch loop through the regular matmul.
  const av = unwrapGpuArg(a) as FArray;
  const bv = unwrapGpuArg(b) as FArray;
  const dst = (out as Float32Array | undefined) ?? new Float32Array(batchCount * strideC);
  for (let bi = 0; bi < batchCount; bi++) {
    const aSlice = av.subarray(bi * strideA, bi * strideA + m * k) as Float32Array;
    const bSlice = bv.subarray(bi * strideB, bi * strideB + k * n) as Float32Array;
    const cSlice = dst.subarray(bi * strideC, bi * strideC + m * n) as Float32Array;
    backend.matmul(aSlice, bSlice, m, k, n, cSlice);
  }
  return dst;
}

function sdpaSelf(
  Q: FArray | GpuHandle | GpuFloat32Array,
  K: FArray | GpuHandle | GpuFloat32Array,
  V: FArray | GpuHandle | GpuFloat32Array,
  N: number,
  nHead: number,
  headDim: number,
  out?: Float32Array,
): Float32Array {
  if (!Number.isInteger(N) || N <= 0) throw new RangeError("sdpaSelf: N must be a positive integer");
  if (!Number.isInteger(nHead) || nHead <= 0) throw new RangeError("sdpaSelf: nHead must be a positive integer");
  if (!Number.isInteger(headDim) || headDim <= 0) {
    throw new RangeError("sdpaSelf: headDim must be a positive integer");
  }
  const backend = resolveActive();
  if (backend.sdpaSelf) {
    return backend.sdpaSelf(unwrapGpuArg(Q), unwrapGpuArg(K), unwrapGpuArg(V), N, nHead, headDim, out);
  }
  // CPU fallback (matches the encoder's pre-fused JS scaled dot product).
  const dim = nHead * headDim;
  const Qh = unwrapGpuArg(Q) as Float32Array;
  const Kh = unwrapGpuArg(K) as Float32Array;
  const Vh = unwrapGpuArg(V) as Float32Array;
  const dst = out ?? new Float32Array(N * dim);
  const invSqrtHead = 1.0 / Math.sqrt(headDim);
  for (let h = 0; h < nHead; h++) {
    for (let i = 0; i < N; i++) {
      const scores = new Float32Array(N);
      const qBase = i * dim + h * headDim;
      let max = -Infinity;
      for (let j = 0; j < N; j++) {
        const kBase = j * dim + h * headDim;
        let sc = 0;
        for (let d = 0; d < headDim; d++) sc += Qh[qBase + d] * Kh[kBase + d];
        sc *= invSqrtHead;
        scores[j] = sc;
        if (sc > max) max = sc;
      }
      let sum = 0;
      for (let j = 0; j < N; j++) {
        const e = Math.exp(scores[j] - max);
        scores[j] = e;
        sum += e;
      }
      const inv = sum > 0 ? 1.0 / sum : 0;
      const outBase = i * dim + h * headDim;
      for (let d = 0; d < headDim; d++) dst[outBase + d] = 0;
      for (let j = 0; j < N; j++) {
        const wj = scores[j] * inv;
        if (wj === 0) continue;
        const vBase = j * dim + h * headDim;
        for (let d = 0; d < headDim; d++) dst[outBase + d] += wj * Vh[vBase + d];
      }
    }
  }
  return dst;
}

function sdpaSingleQuery(
  Q: FArray | GpuHandle | GpuFloat32Array,
  K: FArray | GpuHandle | GpuFloat32Array,
  V: FArray | GpuHandle | GpuFloat32Array,
  kvLen: number,
  nHead: number,
  headDim: number,
  out?: Float32Array,
): Float32Array {
  if (!Number.isInteger(kvLen) || kvLen <= 0) throw new RangeError("sdpaSingleQuery: kvLen must be a positive integer");
  if (!Number.isInteger(nHead) || nHead <= 0) throw new RangeError("sdpaSingleQuery: nHead must be a positive integer");
  if (!Number.isInteger(headDim) || headDim <= 0) {
    throw new RangeError("sdpaSingleQuery: headDim must be a positive integer");
  }
  const backend = resolveActive();
  if (backend.sdpaSingleQuery) {
    return backend.sdpaSingleQuery(unwrapGpuArg(Q), unwrapGpuArg(K), unwrapGpuArg(V), kvLen, nHead, headDim, out);
  }
  // CPU fallback (matches the streaming softmax kernel semantics).
  const dim = nHead * headDim;
  const Qh = unwrapGpuArg(Q) as Float32Array;
  const Kh = unwrapGpuArg(K) as Float32Array;
  const Vh = unwrapGpuArg(V) as Float32Array;
  const dst = out ?? new Float32Array(dim);
  const invSqrtHead = 1.0 / Math.sqrt(headDim);
  for (let h = 0; h < nHead; h++) {
    const scores = new Float32Array(kvLen);
    let max = -Infinity;
    for (let t = 0; t < kvLen; t++) {
      let sc = 0;
      for (let d = 0; d < headDim; d++) sc += Qh[h * headDim + d] * Kh[t * dim + h * headDim + d];
      sc *= invSqrtHead;
      scores[t] = sc;
      if (sc > max) max = sc;
    }
    let sum = 0;
    for (let t = 0; t < kvLen; t++) {
      const e = Math.exp(scores[t] - max);
      scores[t] = e;
      sum += e;
    }
    const inv = sum > 0 ? 1.0 / sum : 0;
    const oBase = h * headDim;
    for (let d = 0; d < headDim; d++) dst[oBase + d] = 0;
    for (let t = 0; t < kvLen; t++) {
      const w = scores[t] * inv;
      if (w === 0) continue;
      for (let d = 0; d < headDim; d++) dst[oBase + d] += w * Vh[t * dim + h * headDim + d];
    }
  }
  return dst;
}

function simdMap(fn: (x: number, i: number) => number, a: Float32Array): Float32Array;
function simdMap(fn: (x: number, i: number) => number, a: Float64Array): Float64Array;
function simdMap(fn: (x: number, i: number) => number, a: GpuHandle | GpuFloat32Array): FArray;
function simdMap(fn: (x: number, i: number) => number, a: FArray | GpuHandle | GpuFloat32Array): FArray {
  return resolveActive().simdMap(fn, unwrapGpuArg(a));
}

// 2D valid-mode convolution. `input` is iH×iW row-major Float32Array,
// `kernel` is kH×kW row-major Float32Array. Output is (iH-kH+1)×(iW-kW+1).
// Used by `bun:image` for resize / blur / sharpen / edge-detect; useful as
// a general 2D-correlation primitive for any pipeline that needs it.
//
// f32 only for v1. f64 follows when there's a use case for it; image and
// signal processing live in f32.
//
// Behavior on each backend:
//   - cpu:   naive nested loop (correctness reference)
//   - metal: GPU dispatch when backend.conv2D is wired (LYK-724 follow-up);
//            falls through to CPU reference until then
//   - cuda:  same — GPU when wired, CPU until then
function conv2D(
  input: Float32Array | GpuHandle | GpuFloat32Array,
  kernel: Float32Array | GpuHandle | GpuFloat32Array,
  iW: number,
  iH: number,
  kW: number,
  kH: number,
): Float32Array {
  if (!Number.isInteger(iW) || iW < 1) throw new RangeError("iW must be a positive integer");
  if (!Number.isInteger(iH) || iH < 1) throw new RangeError("iH must be a positive integer");
  if (!Number.isInteger(kW) || kW < 1) throw new RangeError("kW must be a positive integer");
  if (!Number.isInteger(kH) || kH < 1) throw new RangeError("kH must be a positive integer");
  if (kW > iW) throw new RangeError(`kernel width ${kW} > input width ${iW}`);
  if (kH > iH) throw new RangeError(`kernel height ${kH} > input height ${iH}`);
  if (input.length !== iW * iH) {
    throw new RangeError(`input length ${input.length} != iW * iH (${iW} * ${iH} = ${iW * iH})`);
  }
  if (kernel.length !== kW * kH) {
    throw new RangeError(`kernel length ${kernel.length} != kW * kH (${kW} * ${kH} = ${kW * kH})`);
  }
  const backend = resolveActive();
  const a = unwrapGpuArg(input as any);
  const k = unwrapGpuArg(kernel as any);
  if (backend.conv2D) return backend.conv2D(a as any, k as any, iW, iH, kW, kH);
  // Fallback: backend doesn't implement conv2D yet, use CPU reference.
  const aV = isGpuHandle(a) ? (a.view as Float32Array) : (a as Float32Array);
  const kV = isGpuHandle(k) ? (k.view as Float32Array) : (k as Float32Array);
  return cpuConv2D(aV, kV, iW, iH, kW, kH);
}

// Inclusive prefix sum (cumulative running total). Output[i] = sum(input[0..i]).
// Float32Array → Float32Array (Kahan-compensated). Uint32Array → Uint32Array
// (u32-wrapping add). Both are useful: f32 for cumulative-distribution and
// integral-image work, u32 for parallel compaction (count → write indices).
//
// Behavior on each backend:
//   - cpu:   Kahan-compensated linear loop (correctness reference)
//   - metal: GPU dispatch when backend.scan is wired; falls through to CPU
//   - cuda:  same — GPU when wired, CPU until then
//
// Common uses: parallel compaction (compute write indices for stream-filter
// outputs), cumulative distributions, integral images, summed-area tables,
// and any algorithm that needs "where does my output go in a packed array".
function scan(input: Float32Array): Float32Array;
function scan(input: Uint32Array): Uint32Array;
function scan(input: GpuHandle | GpuFloat32Array): Float32Array;
function scan(input: Float32Array | Uint32Array | GpuHandle | GpuFloat32Array): Float32Array | Uint32Array {
  if (input instanceof Uint32Array) {
    // u32 path doesn't go through the backend hook today — backends advertise
    // f32 scan only; u32 compaction stays on CPU until there's a use case
    // pulling for a device-side u32 kernel.
    return cpuScanU32(input);
  }
  if (!(input instanceof Float32Array) && !isGpuHandle(input) && !isGpuFloat32Array(input)) {
    throw new TypeError(
      `bun:gpu.scan: input must be a Float32Array, Uint32Array, GpuHandle, or GpuFloat32Array; got ${
        (input as any)?.constructor?.name ?? typeof input
      }`,
    );
  }
  const backend = resolveActive();
  const a = unwrapGpuArg(input as any);
  if (backend.scan) return backend.scan(a as any);
  // Backend doesn't implement scan yet — fall back to the CPU reference.
  const aV = isGpuHandle(a) ? (a.view as Float32Array) : (a as Float32Array);
  return cpuScan(aV);
}

// Reduction. Returns a single number — the sum, min, or max of the input.
// Float32Array uses Kahan-compensated summation for `sum`; min/max are plain
// loops with NaN-propagation matching JS Math.min/Math.max. Uint32Array uses
// u32-wrapping add for `sum` and direct comparisons for min/max.
//
// Empty inputs follow the well-known JS conventions:
//   sum([]) = 0,  min([]) = +Infinity,  max([]) = -Infinity.
//
// Backends MAY override the f32 path via Backend.reduce; the u32 path stays
// on CPU until someone needs a device-side integer reduction.
function reduce(input: Float32Array | Uint32Array | GpuHandle | GpuFloat32Array, op: "sum" | "min" | "max"): number {
  if (op !== "sum" && op !== "min" && op !== "max") {
    throw new TypeError(`bun:gpu.reduce: op must be "sum", "min", or "max"; got ${JSON.stringify(op)}`);
  }
  if (input instanceof Uint32Array) {
    return cpuReduceU32(input, op);
  }
  if (!(input instanceof Float32Array) && !isGpuHandle(input) && !isGpuFloat32Array(input)) {
    throw new TypeError(
      `bun:gpu.reduce: input must be a Float32Array, Uint32Array, GpuHandle, or GpuFloat32Array; got ${
        (input as any)?.constructor?.name ?? typeof input
      }`,
    );
  }
  const backend = resolveActive();
  const a = unwrapGpuArg(input as any);
  if (backend.reduce) return backend.reduce(a as any, op);
  const aV = isGpuHandle(a) ? (a.view as Float32Array) : (a as Float32Array);
  return cpuReduceF32(aV, op);
}

// Single-launch fused Gaussian blur on packed RGBA uint8. Used by
// bun:image's `image.blur(img, { gpu: true })` path so the entire op
// happens in one CUDA / Metal kernel invocation, sidestepping the
// JS-side deinterleave / reinterleave that would dominate a per-
// channel `conv2D` dispatch.
//
// Returns null when the active backend has no GPU implementation
// available (CPU backend, or CUDA without NVRTC). Callers pass radius
// in [0, 100]; the kernel uses an edge-clamped 2D Gaussian with
// σ = radius/3 to match the C++ blur.
function imageBlurRGBA(input: Uint8Array, w: number, h: number, radius: number): Uint8Array | null {
  if (!(input instanceof Uint8Array)) {
    throw new TypeError("bun:gpu.imageBlurRGBA: input must be a Uint8Array");
  }
  if (!Number.isInteger(w) || w < 1 || !Number.isInteger(h) || h < 1) {
    throw new RangeError("bun:gpu.imageBlurRGBA: w and h must be positive integers");
  }
  if (!Number.isInteger(radius) || radius < 0 || radius > 100) {
    throw new RangeError("bun:gpu.imageBlurRGBA: radius must be an integer in [0, 100]");
  }
  if (input.length !== w * h * 4) {
    throw new RangeError(`bun:gpu.imageBlurRGBA: input length ${input.length} != w*h*4 (${w}*${h}*4 = ${w * h * 4})`);
  }
  const backend = resolveActive();
  if (!backend.imageBlurRGBA) return null;
  return backend.imageBlurRGBA(input, w, h, radius);
}

// Bin-counting histogram. Counts how many input values fall into each of
// `bins` equal-width buckets across `[min, max]`. Returns a Uint32Array of
// length `bins`. Values outside the range and NaN are dropped silently —
// pass [reduce(input, "min"), reduce(input, "max")] (the default) to count
// every finite value.
//
// The top edge is inclusive: a value exactly equal to `max` lands in the
// last bin instead of being dropped. This matches numpy.histogram's
// "right edge of last bin is closed" behavior.
//
// Common uses: image-pixel intensity distributions, telemetry latency
// buckets, ML quantization step sizing, anomaly detection.
function histogram(
  input: Float32Array | GpuHandle | GpuFloat32Array,
  bins: number,
  opts?: { min?: number; max?: number },
): Uint32Array {
  if (!Number.isInteger(bins) || bins < 1) {
    throw new RangeError(`bun:gpu.histogram: bins must be a positive integer; got ${bins}`);
  }
  if (!(input instanceof Float32Array) && !isGpuHandle(input) && !isGpuFloat32Array(input)) {
    throw new TypeError(
      `bun:gpu.histogram: input must be a Float32Array, GpuHandle, or GpuFloat32Array; got ${
        (input as any)?.constructor?.name ?? typeof input
      }`,
    );
  }
  const a = unwrapGpuArg(input as any);
  const aV = isGpuHandle(a) ? (a.view as Float32Array) : (a as Float32Array);

  // Resolve range. If the caller didn't pin both edges we compute them via
  // the existing reduce path — same Kahan-irrelevant min/max kernel that
  // backends will eventually accelerate. NaN-only / empty inputs collapse
  // to an all-zero histogram (no values to count).
  const minOpt = opts?.min;
  const maxOpt = opts?.max;
  let min = minOpt !== undefined ? minOpt : cpuReduceF32(aV, "min");
  let max = maxOpt !== undefined ? maxOpt : cpuReduceF32(aV, "max");
  if (typeof min !== "number" || typeof max !== "number") {
    throw new TypeError("bun:gpu.histogram: opts.min and opts.max must be numbers");
  }
  if (Number.isNaN(min) || Number.isNaN(max) || !Number.isFinite(min) || !Number.isFinite(max)) {
    // NaN or ±Infinity range — nothing meaningful to bucket against.
    return new Uint32Array(bins);
  }
  if (min > max) {
    throw new RangeError(`bun:gpu.histogram: min ${min} must be <= max ${max}`);
  }

  const backend = resolveActive();
  if (backend.histogram) return backend.histogram(a as any, bins, min, max);
  return cpuHistogramF32(aV, bins, min, max);
}

type VarianceOptions = {
  /**
   * Delta degrees of freedom. Divisor is `n - ddof`.
   *   `0` (default) — population variance, what numpy returns by default.
   *   `1`           — sample variance (Bessel-corrected, unbiased estimator).
   * Values >= n return NaN since the divisor would go non-positive.
   */
  ddof?: number;
};

// Variance via numerically-stable two-pass. Float32Array uses Kahan-
// compensated mean, Uint32Array uses plain f64 (u32 sums fit exactly).
// Empty input returns NaN; so does `ddof >= n`.
function variance(input: Float32Array | Uint32Array | GpuHandle | GpuFloat32Array, opts: VarianceOptions = {}): number {
  const ddof = opts.ddof ?? 0;
  if (typeof ddof !== "number" || !Number.isFinite(ddof) || ddof < 0) {
    throw new RangeError(`bun:gpu.variance: ddof must be a finite non-negative number; got ${ddof}`);
  }
  if (input instanceof Uint32Array) return cpuVarianceU32(input, ddof);
  if (!(input instanceof Float32Array) && !isGpuHandle(input) && !isGpuFloat32Array(input)) {
    throw new TypeError(
      `bun:gpu.variance: input must be a Float32Array, Uint32Array, GpuHandle, or GpuFloat32Array; got ${
        (input as any)?.constructor?.name ?? typeof input
      }`,
    );
  }
  const backend = resolveActive();
  const a = unwrapGpuArg(input as any);
  if (backend.variance) return backend.variance(a as any, ddof);
  const aV = isGpuHandle(a) ? (a.view as Float32Array) : (a as Float32Array);
  return cpuVarianceF32(aV, ddof);
}

// Standard deviation = sqrt(variance). Same options.
function stddev(input: Float32Array | Uint32Array | GpuHandle | GpuFloat32Array, opts: VarianceOptions = {}): number {
  const v = variance(input, opts);
  return Math.sqrt(v);
}

// Quantile (linear-interpolated between adjacent order statistics).
// `q` in [0, 1]: 0 → min, 0.5 → median, 1 → max. Float32Array input
// returns a Float32 (well, a Number — JS doesn't distinguish in storage);
// Uint32Array input returns a Number that may be fractional for
// even-length inputs at q=0.5.
//
// Empty input → NaN (numpy convention).
//
// Sort-based, so O(n log n). For very large arrays where you only need
// the median, a future quickselect path could drop this to O(n); for
// now this matches numpy's default precision and keeps the code small.
function quantile(input: Float32Array | Uint32Array | GpuHandle | GpuFloat32Array, q: number): number {
  if (typeof q !== "number" || !(q >= 0 && q <= 1)) {
    throw new RangeError(`bun:gpu.quantile: q must be a number in [0, 1]; got ${q}`);
  }
  if (input instanceof Uint32Array) return cpuQuantileU32(input, q);
  if (!(input instanceof Float32Array) && !isGpuHandle(input) && !isGpuFloat32Array(input)) {
    throw new TypeError(
      `bun:gpu.quantile: input must be a Float32Array, Uint32Array, GpuHandle, or GpuFloat32Array; got ${
        (input as any)?.constructor?.name ?? typeof input
      }`,
    );
  }
  const a = unwrapGpuArg(input as any);
  const aV = isGpuHandle(a) ? (a.view as Float32Array) : (a as Float32Array);
  return cpuQuantileF32(aV, q);
}

// Median is just quantile(0.5) — exposed as its own export so the
// common case doesn't have to spell out the magic number.
function median(input: Float32Array | Uint32Array | GpuHandle | GpuFloat32Array): number {
  return quantile(input, 0.5);
}

// Index of the smallest element. Tie-break: first occurrence. NaN in the
// input returns the index of the first NaN (consistent with reduce's NaN
// propagation). Empty input throws RangeError.
//
// Useful for top-1 selection, peak-finding, and any "which index won" query.
function argMin(input: Float32Array | Uint32Array | GpuHandle | GpuFloat32Array): number {
  if (input instanceof Uint32Array) return cpuArgMinU32(input);
  if (!(input instanceof Float32Array) && !isGpuHandle(input) && !isGpuFloat32Array(input)) {
    throw new TypeError(
      `bun:gpu.argMin: input must be a Float32Array, Uint32Array, GpuHandle, or GpuFloat32Array; got ${
        (input as any)?.constructor?.name ?? typeof input
      }`,
    );
  }
  const backend = resolveActive();
  const a = unwrapGpuArg(input as any);
  if (backend.argMin) return backend.argMin(a as any);
  const aV = isGpuHandle(a) ? (a.view as Float32Array) : (a as Float32Array);
  return cpuArgMinF32(aV);
}

// Index of the largest element. Same tie-break / NaN / empty rules as argMin.
function argMax(input: Float32Array | Uint32Array | GpuHandle | GpuFloat32Array): number {
  if (input instanceof Uint32Array) return cpuArgMaxU32(input);
  if (!(input instanceof Float32Array) && !isGpuHandle(input) && !isGpuFloat32Array(input)) {
    throw new TypeError(
      `bun:gpu.argMax: input must be a Float32Array, Uint32Array, GpuHandle, or GpuFloat32Array; got ${
        (input as any)?.constructor?.name ?? typeof input
      }`,
    );
  }
  const backend = resolveActive();
  const a = unwrapGpuArg(input as any);
  if (backend.argMax) return backend.argMax(a as any);
  const aV = isGpuHandle(a) ? (a.view as Float32Array) : (a as Float32Array);
  return cpuArgMaxF32(aV);
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
// Implemented on CUDA and Metal; the CPU backend throws. The returned
// handle carries `qFormat: "q4_K"` and matVec dispatches to the on-chip
// dequant kernel without ever materializing fp32 weights.
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
  matmulBatched,
  sdpaSelf,
  sdpaSingleQuery,
  conv2D,
  scan,
  reduce,
  argMin,
  argMax,
  histogram,
  median,
  quantile,
  variance,
  stddev,
  imageBlurRGBA,
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
