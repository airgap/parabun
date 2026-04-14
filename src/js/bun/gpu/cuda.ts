// Parabun CUDA backend for bun:gpu.
//
// Loaded by src/js/bun/gpu.ts — exposes a `Backend`-conforming object that
// drives NVIDIA GPUs via the CUDA Driver API (libcuda.so.1 / nvcuda.dll).
// Kernels are hand-written PTX validated at cuModuleLoadData time by the
// driver's bundled JIT (libnvidia-ptxjitcompiler.so).
//
// Why Driver API (not Runtime API / libcudart):
//   - libcuda.so.1 ships with the NVIDIA graphics driver on every
//     CUDA-capable host; zero extra install needed (no cudatoolkit).
//   - PTX is validated/compiled by the driver at module-load time, so we
//     skip nvcc/nvrtc entirely.
//
// ASAN interferes with CUDA's signal handlers: under asan-instrumented
// bun, cuInit returns CUDA_ERROR_OUT_OF_MEMORY (2). Use
// `bun bd --asan=off` for CUDA testing; release builds are unaffected.
//
// Scope today:
//   - simdMap-affine (y = k1*x + k0) on Float32Array — proven end-to-end
//     against cuCtxSynchronize on RTX hosts.
//   - matVec f32 — warp-reduced MSL-equivalent kernel (one warp per row,
//     stride-32 partial dot, shfl.bfly reduction). Correct but the "wins"
//     threshold is parked at Infinity because the per-call
//     cuMemAlloc + cuMemcpyHtoD + cuCtxSynchronize dominates compute
//     at every size we measure on an RTX 4070 Ti (~0.09–0.4× speedup —
//     see bench/parabun-gpu-matvec). Residency (alloc once + reuse)
//     is the real unlock here; kernel tuning won't move the needle.
// dot / matmul still fall back to bun:simd.

const simd = require("../simd.ts");

// ─── FFI bindings ─────────────────────────────────────────────────────────

const LIBNAME = process.platform === "win32" ? "nvcuda.dll" : "libcuda.so.1";

type CudaSymbols = {
  cuInit: (flags: number) => number;
  cuDeviceGetCount: (countPtr: number) => number;
  cuDeviceGet: (devPtr: number, ord: number) => number;
  cuDeviceGetName: (buf: number, n: number, dev: number) => number;
  cuCtxCreate_v2: (ctxPtr: number, flags: number, dev: number) => number;
  cuCtxDestroy_v2: (ctx: bigint) => number;
  cuCtxSynchronize: () => number;
  cuMemAlloc_v2: (ptrPtr: number, size: bigint) => number;
  cuMemFree_v2: (ptr: bigint) => number;
  cuMemcpyHtoD_v2: (dst: bigint, src: number, size: bigint) => number;
  cuMemcpyDtoH_v2: (dst: number, src: bigint, size: bigint) => number;
  cuModuleLoadData: (modPtr: number, img: number) => number;
  cuModuleUnload: (mod: bigint) => number;
  cuModuleGetFunction: (fnPtr: number, mod: bigint, name: number) => number;
  cuLaunchKernel: (
    fn: bigint,
    gridX: number,
    gridY: number,
    gridZ: number,
    blockX: number,
    blockY: number,
    blockZ: number,
    sharedMem: number,
    stream: bigint,
    params: number,
    extra: number | null,
  ) => number;
};

let cudaLib: { symbols: CudaSymbols; close: () => void } | null = null;
let ffiPtr: ((x: any) => number) | null = null;

function tryLoadCuda(): boolean {
  if (cudaLib !== null) return true;
  try {
    const { dlopen, FFIType, ptr } = require("../ffi.ts");
    ffiPtr = ptr;
    cudaLib = dlopen(LIBNAME, {
      cuInit: { args: [FFIType.u32], returns: FFIType.i32 },
      cuDeviceGetCount: { args: [FFIType.ptr], returns: FFIType.i32 },
      cuDeviceGet: { args: [FFIType.ptr, FFIType.i32], returns: FFIType.i32 },
      cuDeviceGetName: { args: [FFIType.ptr, FFIType.i32, FFIType.i32], returns: FFIType.i32 },
      cuCtxCreate_v2: { args: [FFIType.ptr, FFIType.u32, FFIType.i32], returns: FFIType.i32 },
      cuCtxDestroy_v2: { args: [FFIType.u64], returns: FFIType.i32 },
      cuCtxSynchronize: { args: [], returns: FFIType.i32 },
      cuMemAlloc_v2: { args: [FFIType.ptr, FFIType.u64], returns: FFIType.i32 },
      cuMemFree_v2: { args: [FFIType.u64], returns: FFIType.i32 },
      cuMemcpyHtoD_v2: { args: [FFIType.u64, FFIType.ptr, FFIType.u64], returns: FFIType.i32 },
      cuMemcpyDtoH_v2: { args: [FFIType.ptr, FFIType.u64, FFIType.u64], returns: FFIType.i32 },
      cuModuleLoadData: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.i32 },
      cuModuleUnload: { args: [FFIType.u64], returns: FFIType.i32 },
      cuModuleGetFunction: { args: [FFIType.ptr, FFIType.u64, FFIType.ptr], returns: FFIType.i32 },
      cuLaunchKernel: {
        args: [
          FFIType.u64,
          FFIType.u32,
          FFIType.u32,
          FFIType.u32,
          FFIType.u32,
          FFIType.u32,
          FFIType.u32,
          FFIType.u32,
          FFIType.u64,
          FFIType.ptr,
          FFIType.ptr,
        ],
        returns: FFIType.i32,
      },
    }) as any;
    return true;
  } catch {
    cudaLib = null;
    return false;
  }
}

// ─── PTX kernel library ───────────────────────────────────────────────────
//
// One module with all kernels; cuModuleLoadData parses once. Add kernels
// here as the backend grows.
//   simdMapAffineF32 — out[i] = fma(k1, in[i], k0), one thread per element.
//   matVecF32        — M×K · K → M, one warp per row, stride-32 partial dot
//                      followed by shfl.sync.bfly butterfly reduction. Matches
//                      the Metal simdgroup-reduction kernel; kernel is correct
//                      but dispatched past a hard "wins" threshold at Infinity
//                      until we have a real RTX benchmark.
//
// PTX 7.0 is the floor — the non-sync shfl.bfly was removed in PTX 6.0, so
// we use shfl.sync.bfly.b32 with a full 0xffffffff membermask (the warp is
// fully active by construction — block size is exactly 32).

const PTX_MODULE = `
.version 7.0
.target sm_50
.address_size 64

.visible .entry simdMapAffineF32(
    .param .u64 inPtr,
    .param .u64 outPtr,
    .param .u32 n,
    .param .f32 k1,
    .param .f32 k0
)
{
    .reg .pred  %p<2>;
    .reg .b32   %r<6>;
    .reg .f32   %f<4>;
    .reg .b64   %rd<11>;

    ld.param.u64  %rd1, [inPtr];
    ld.param.u64  %rd2, [outPtr];
    ld.param.u32  %r2,  [n];

    mov.u32       %r3, %ntid.x;
    mov.u32       %r4, %ctaid.x;
    mov.u32       %r5, %tid.x;
    mad.lo.s32    %r1, %r4, %r3, %r5;

    setp.ge.s32   %p1, %r1, %r2;
    @%p1 bra      DONE;

    cvta.to.global.u64 %rd4, %rd1;
    mul.wide.s32  %rd5, %r1, 4;
    add.s64       %rd6, %rd4, %rd5;
    ld.global.f32 %f1, [%rd6];

    ld.param.f32  %f2, [k1];
    ld.param.f32  %f3, [k0];
    fma.rn.f32    %f1, %f2, %f1, %f3;

    cvta.to.global.u64 %rd9, %rd2;
    add.s64       %rd10, %rd9, %rd5;
    st.global.f32 [%rd10], %f1;

DONE:
    ret;
}

.visible .entry matVecF32(
    .param .u64 matPtr,
    .param .u64 vecPtr,
    .param .u64 outPtr,
    .param .u32 m,
    .param .u32 k
)
{
    .reg .pred  %p<4>;
    .reg .b32   %r<10>;
    .reg .f32   %f<6>;
    .reg .b64   %rd<14>;

    ld.param.u64  %rd1, [matPtr];
    ld.param.u64  %rd2, [vecPtr];
    ld.param.u64  %rd3, [outPtr];
    ld.param.u32  %r1,  [m];
    ld.param.u32  %r2,  [k];

    mov.u32       %r3, %ctaid.x;
    mov.u32       %r4, %tid.x;

    setp.ge.u32   %p1, %r3, %r1;
    @%p1 bra      MVDONE;

    mul.wide.u32  %rd4, %r3, %r2;
    shl.b64       %rd4, %rd4, 2;
    cvta.to.global.u64 %rd5, %rd1;
    add.s64       %rd6, %rd5, %rd4;

    cvta.to.global.u64 %rd7, %rd2;

    mov.f32       %f1, 0f00000000;
    mov.u32       %r6, %r4;

MVLOOP:
    setp.ge.u32   %p2, %r6, %r2;
    @%p2 bra      MVREDUCE;

    mul.wide.u32  %rd8, %r6, 4;
    add.s64       %rd9, %rd6, %rd8;
    add.s64       %rd10, %rd7, %rd8;
    ld.global.f32 %f2, [%rd9];
    ld.global.f32 %f3, [%rd10];
    fma.rn.f32    %f1, %f2, %f3, %f1;

    add.u32       %r6, %r6, 32;
    bra           MVLOOP;

MVREDUCE:
    mov.b32       %r7, %f1;
    shfl.sync.bfly.b32 %r8, %r7, 16, 0x1f, 0xffffffff;
    mov.b32       %f4, %r8;
    add.f32       %f1, %f1, %f4;

    mov.b32       %r7, %f1;
    shfl.sync.bfly.b32 %r8, %r7, 8, 0x1f, 0xffffffff;
    mov.b32       %f4, %r8;
    add.f32       %f1, %f1, %f4;

    mov.b32       %r7, %f1;
    shfl.sync.bfly.b32 %r8, %r7, 4, 0x1f, 0xffffffff;
    mov.b32       %f4, %r8;
    add.f32       %f1, %f1, %f4;

    mov.b32       %r7, %f1;
    shfl.sync.bfly.b32 %r8, %r7, 2, 0x1f, 0xffffffff;
    mov.b32       %f4, %r8;
    add.f32       %f1, %f1, %f4;

    mov.b32       %r7, %f1;
    shfl.sync.bfly.b32 %r8, %r7, 1, 0x1f, 0xffffffff;
    mov.b32       %f4, %r8;
    add.f32       %f1, %f1, %f4;

    setp.ne.u32   %p3, %r4, 0;
    @%p3 bra      MVDONE;

    mul.wide.u32  %rd11, %r3, 4;
    cvta.to.global.u64 %rd12, %rd3;
    add.s64       %rd13, %rd12, %rd11;
    st.global.f32 [%rd13], %f1;

MVDONE:
    ret;
}
`;

// ─── State ────────────────────────────────────────────────────────────────

type FArray = Float32Array | Float64Array;

// GpuHandle stub — CUDA's matVec path reallocates device memory per call,
// so a "held" handle just wraps the view and matVec reads via view. When a
// real cuMemAlloc+persist path lands, buffer will carry the device pointer.
type GpuHandle = {
  __bunGpuHandle: true;
  backend: "metal" | "cuda" | "cpu";
  type: "f32" | "f64";
  length: number;
  buffer: bigint;
  view: FArray;
  released: boolean;
};

function isGpuHandle(x: unknown): x is GpuHandle {
  return typeof x === "object" && x !== null && (x as any).__bunGpuHandle === true;
}

function unwrapHandle<T extends FArray>(x: T | GpuHandle): T {
  if (isGpuHandle(x)) {
    if (x.released) throw new Error("bun:gpu: op called on released handle");
    return x.view as T;
  }
  return x;
}

let probed = false;
let probeResult = false;
let ctx: bigint | null = null;
let mod: bigint | null = null;
let fnAffineF32: bigint | null = null;
let fnMatVecF32: bigint | null = null;
let deviceName: string = "";

function probe(): boolean {
  if (probed) return probeResult;
  probed = true;

  if (!tryLoadCuda()) return false;
  const s = cudaLib!.symbols;
  const ptr = ffiPtr!;

  if (s.cuInit(0) !== 0) return false;

  const cnt = new Int32Array(1);
  if (s.cuDeviceGetCount(ptr(cnt)) !== 0 || cnt[0] === 0) return false;

  const devBuf = new Int32Array(1);
  if (s.cuDeviceGet(ptr(devBuf), 0) !== 0) return false;
  const device = devBuf[0];

  const nameBuf = new Uint8Array(256);
  s.cuDeviceGetName(ptr(nameBuf), nameBuf.length, device);
  const nameEnd = nameBuf.indexOf(0);
  deviceName = new TextDecoder().decode(nameBuf.subarray(0, nameEnd < 0 ? nameBuf.length : nameEnd));

  const ctxBuf = new BigUint64Array(1);
  if (s.cuCtxCreate_v2(ptr(ctxBuf), 0, device) !== 0) return false;
  ctx = ctxBuf[0];

  const ptxBytes = new TextEncoder().encode(PTX_MODULE + "\0");
  const modBuf = new BigUint64Array(1);
  if (s.cuModuleLoadData(ptr(modBuf), ptr(ptxBytes)) !== 0) {
    s.cuCtxDestroy_v2(ctx);
    ctx = null;
    return false;
  }
  mod = modBuf[0];

  const affineName = new TextEncoder().encode("simdMapAffineF32\0");
  const affineBuf = new BigUint64Array(1);
  if (s.cuModuleGetFunction(ptr(affineBuf), mod, ptr(affineName)) !== 0) {
    s.cuModuleUnload(mod);
    s.cuCtxDestroy_v2(ctx);
    mod = null;
    ctx = null;
    return false;
  }
  fnAffineF32 = affineBuf[0];

  const matVecName = new TextEncoder().encode("matVecF32\0");
  const matVecBuf = new BigUint64Array(1);
  if (s.cuModuleGetFunction(ptr(matVecBuf), mod, ptr(matVecName)) !== 0) {
    s.cuModuleUnload(mod);
    s.cuCtxDestroy_v2(ctx);
    fnAffineF32 = null;
    mod = null;
    ctx = null;
    return false;
  }
  fnMatVecF32 = matVecBuf[0];

  probeResult = true;
  return true;
}

// ─── Affine simdMap detector (mirrors simd.ts) ────────────────────────────
//
// Fires three probe points (x=0,1,2); if the function is linear it
// uniquely determines y = k1*x + k0 and we can push it to the GPU.
// Same tolerance as the simd-side detector so behavior stays consistent.

const AFFINE_TOL = 1e-5;

function tryAffineKernel(fn: (x: number) => number): { k1: number; k0: number } | null {
  try {
    const y0 = fn(0);
    const y1 = fn(1);
    const y2 = fn(2);
    if (!Number.isFinite(y0) || !Number.isFinite(y1) || !Number.isFinite(y2)) return null;
    const k1 = y1 - y0;
    const k0 = y0;
    if (Math.abs(y2 - (2 * k1 + k0)) > AFFINE_TOL * (1 + Math.abs(y2))) return null;
    return { k1, k0 };
  } catch {
    return null;
  }
}

// ─── Kernel launch: simdMapAffineF32 ──────────────────────────────────────
//
// Alloc in/out device buffers, HtoD the input, launch with a 1-D grid of
// 256-thread blocks, sync, DtoH copy out. try/finally guarantees cuMemFree
// even if the launch or sync fails.

function launchAffineF32(a: Float32Array, k1: number, k0: number): Float32Array {
  const s = cudaLib!.symbols;
  const ptr = ffiPtr!;
  const n = a.length;
  const bytes = BigInt(n * 4);

  const dInBuf = new BigUint64Array(1);
  const dOutBuf = new BigUint64Array(1);
  if (s.cuMemAlloc_v2(ptr(dInBuf), bytes) !== 0) throw new Error("bun:gpu cuda: cuMemAlloc(in) failed");
  if (s.cuMemAlloc_v2(ptr(dOutBuf), bytes) !== 0) {
    s.cuMemFree_v2(dInBuf[0]);
    throw new Error("bun:gpu cuda: cuMemAlloc(out) failed");
  }
  const dIn = dInBuf[0];
  const dOut = dOutBuf[0];

  try {
    if (s.cuMemcpyHtoD_v2(dIn, ptr(a), bytes) !== 0) throw new Error("bun:gpu cuda: cuMemcpyHtoD failed");

    // kernelParams is void** — array of pointers to each param slot.
    const pInBuf = new BigUint64Array([dIn]);
    const pOutBuf = new BigUint64Array([dOut]);
    const pN = new Uint32Array([n]);
    const pK1 = new Float32Array([k1]);
    const pK0 = new Float32Array([k0]);
    const paramPtrs = new BigUint64Array([
      BigInt(ptr(pInBuf)),
      BigInt(ptr(pOutBuf)),
      BigInt(ptr(pN)),
      BigInt(ptr(pK1)),
      BigInt(ptr(pK0)),
    ]);

    const blockDim = 256;
    const gridDim = Math.floor((n + blockDim - 1) / blockDim);
    const r = s.cuLaunchKernel(fnAffineF32!, gridDim, 1, 1, blockDim, 1, 1, 0, 0n, ptr(paramPtrs), null);
    if (r !== 0) throw new Error(`bun:gpu cuda: cuLaunchKernel failed (${r})`);
    if (s.cuCtxSynchronize() !== 0) throw new Error("bun:gpu cuda: cuCtxSynchronize failed");

    const out = new Float32Array(n);
    if (s.cuMemcpyDtoH_v2(ptr(out), dOut, bytes) !== 0) throw new Error("bun:gpu cuda: cuMemcpyDtoH failed");
    return out;
  } finally {
    s.cuMemFree_v2(dIn);
    s.cuMemFree_v2(dOut);
  }
}

// ─── Kernel launch: matVecF32 ─────────────────────────────────────────────
//
// M×K · K → M. Three device buffers (mat, vec, out). Grid = M blocks of
// 32 threads each — one warp per row. Matches the Metal simdgroup kernel's
// reduction shape so correctness reasoning transfers. try/finally guarantees
// cuMemFree on every path.

function launchMatVecF32(mat: Float32Array, vec: Float32Array, m: number, k: number): Float32Array {
  const s = cudaLib!.symbols;
  const ptr = ffiPtr!;
  const matBytes = BigInt(m * k * 4);
  const vecBytes = BigInt(k * 4);
  const outBytes = BigInt(m * 4);

  const dMatBuf = new BigUint64Array(1);
  const dVecBuf = new BigUint64Array(1);
  const dOutBuf = new BigUint64Array(1);
  if (s.cuMemAlloc_v2(ptr(dMatBuf), matBytes) !== 0) throw new Error("bun:gpu cuda: cuMemAlloc(mat) failed");
  if (s.cuMemAlloc_v2(ptr(dVecBuf), vecBytes) !== 0) {
    s.cuMemFree_v2(dMatBuf[0]);
    throw new Error("bun:gpu cuda: cuMemAlloc(vec) failed");
  }
  if (s.cuMemAlloc_v2(ptr(dOutBuf), outBytes) !== 0) {
    s.cuMemFree_v2(dMatBuf[0]);
    s.cuMemFree_v2(dVecBuf[0]);
    throw new Error("bun:gpu cuda: cuMemAlloc(out) failed");
  }
  const dMat = dMatBuf[0];
  const dVec = dVecBuf[0];
  const dOut = dOutBuf[0];

  try {
    if (s.cuMemcpyHtoD_v2(dMat, ptr(mat), matBytes) !== 0) throw new Error("bun:gpu cuda: cuMemcpyHtoD(mat) failed");
    if (s.cuMemcpyHtoD_v2(dVec, ptr(vec), vecBytes) !== 0) throw new Error("bun:gpu cuda: cuMemcpyHtoD(vec) failed");

    const pMatBuf = new BigUint64Array([dMat]);
    const pVecBuf = new BigUint64Array([dVec]);
    const pOutBuf = new BigUint64Array([dOut]);
    const pM = new Uint32Array([m]);
    const pK = new Uint32Array([k]);
    const paramPtrs = new BigUint64Array([
      BigInt(ptr(pMatBuf)),
      BigInt(ptr(pVecBuf)),
      BigInt(ptr(pOutBuf)),
      BigInt(ptr(pM)),
      BigInt(ptr(pK)),
    ]);

    // gridDim = (m, 1, 1); blockDim = (32, 1, 1). One warp per row —
    // warp reduction via shfl.sync.bfly with a full membermask works
    // because the block is exactly one warp and always fully active.
    const r = s.cuLaunchKernel(fnMatVecF32!, m, 1, 1, 32, 1, 1, 0, 0n, ptr(paramPtrs), null);
    if (r !== 0) throw new Error(`bun:gpu cuda: cuLaunchKernel(matVec) failed (${r})`);
    if (s.cuCtxSynchronize() !== 0) throw new Error("bun:gpu cuda: cuCtxSynchronize failed");

    const out = new Float32Array(m);
    if (s.cuMemcpyDtoH_v2(ptr(out), dOut, outBytes) !== 0) throw new Error("bun:gpu cuda: cuMemcpyDtoH failed");
    return out;
  } finally {
    s.cuMemFree_v2(dMat);
    s.cuMemFree_v2(dVec);
    s.cuMemFree_v2(dOut);
  }
}

// ─── Size threshold ───────────────────────────────────────────────────────
//
// GPU dispatch has a fixed round-trip cost (~2 cuMemAlloc + HtoD + DtoH +
// one sync ≈ a few hundred µs on a warm context). Below this, staying on
// CPU/WASM is faster. Tuned empirically on an RTX 4070 Ti — revisit once
// we have real benchmarks in bench/parabun-gpu/.

const MIN_SIMDMAP_ELEMS = 1 << 18; // 256k f32 = 1 MB

// matVec uses a split threshold (same reasoning as metal.ts):
//
//   - MIN_MATVEC_DISPATCH_ELEMS: above this, `matVec` runs the PTX kernel
//     when the caller hands us Float32 inputs. Lets tests and benchmarks
//     exercise the real GPU path.
//   - MIN_MATVEC_WINS_ELEMS:     above this, `winsForSize("matVec", ...)`
//     returns true — pipeline-style callers use this to decide whether to
//     route the op to bun:gpu at all.
//
// Benchmarked on an RTX 4070 Ti + PCIe 4.0 ×16: the non-resident path
// loses 3–10× to bun:simd at every size we care about because the
// cuMemcpyHtoD + cuCtxSynchronize per call dominates the actual kernel
// (see bench/parabun-gpu-matvec). `wins` stays at Infinity until the
// residency path (alloc once, reuse across calls) lands. When it does,
// collapse these into one constant.
const MIN_MATVEC_DISPATCH_ELEMS = 1 << 20;
const MIN_MATVEC_WINS_ELEMS = Number.POSITIVE_INFINITY;

function winsForSize(op: string, n: number, elemBytes: number): boolean {
  if (!probed && !probe()) return false;
  if (!probeResult) return false;
  if (op === "simdMap") return elemBytes === 4 && n >= MIN_SIMDMAP_ELEMS;
  if (op === "matVec") return elemBytes === 4 && n >= MIN_MATVEC_WINS_ELEMS;
  return false;
}

// ─── Backend methods ──────────────────────────────────────────────────────

function dot(a: FArray | GpuHandle, b: FArray | GpuHandle): number {
  return simd.dot(unwrapHandle(a), unwrapHandle(b));
}

function matVec(matrix: FArray | GpuHandle, vector: FArray, nRows: number, nCols: number): FArray {
  if (isGpuHandle(matrix) && matrix.released) {
    throw new Error("bun:gpu: matVec called on released handle");
  }
  const matView = isGpuHandle(matrix) ? matrix.view : (matrix as FArray);
  if (
    matView instanceof Float32Array &&
    vector instanceof Float32Array &&
    probe() &&
    nRows * nCols >= MIN_MATVEC_DISPATCH_ELEMS
  ) {
    return launchMatVecF32(matView, vector, nRows, nCols);
  }
  return simd.matVec(matView as any, vector as any, nRows, nCols);
}

function matmul(a: FArray | GpuHandle, b: FArray | GpuHandle, m: number, k: number, n: number): FArray {
  const av = unwrapHandle(a);
  const bv = unwrapHandle(b);
  if (av.constructor !== bv.constructor) {
    throw new TypeError(
      `a and b must both be Float32Array or both be Float64Array; got ${av.constructor.name} and ${bv.constructor.name}`,
    );
  }
  const out = (av instanceof Float32Array ? new Float32Array(m * n) : new Float64Array(m * n)) as FArray;
  for (let i = 0; i < m; i++) {
    const aRow = i * k;
    const oRow = i * n;
    for (let p = 0; p < k; p++) {
      const x = av[aRow + p];
      if (x === 0) continue;
      const bRow = p * n;
      for (let j = 0; j < n; j++) out[oRow + j] += x * bv[bRow + j];
    }
  }
  return out;
}

function simdMap(fn: (x: number, i: number) => number, a: FArray | GpuHandle): FArray {
  if (typeof fn !== "function") throw new TypeError("fn must be a function");
  const view = unwrapHandle(a);
  if (view instanceof Float32Array && fn.length <= 1 && probe() && view.length >= MIN_SIMDMAP_ELEMS) {
    const aff = tryAffineKernel(fn as (x: number) => number);
    if (aff) return launchAffineF32(view, aff.k1, aff.k0);
  }
  return simd.simdMap(fn, view as any);
}

function dispose(): void {
  if (cudaLib && mod !== null) {
    cudaLib.symbols.cuModuleUnload(mod);
    mod = null;
  }
  if (cudaLib && ctx !== null) {
    cudaLib.symbols.cuCtxDestroy_v2(ctx);
    ctx = null;
  }
  fnAffineF32 = null;
  fnMatVecF32 = null;
  probed = false;
  probeResult = false;
}

// ─── Debug introspection ──────────────────────────────────────────────────

function getDeviceName(): string {
  return deviceName;
}

// Page-aligned alloc is a no-op on CUDA today — the dispatch path does its
// own cuMemAlloc+cuMemcpy per call, so caller-side alignment doesn't help.
// Matches the CPU stub so the bun:gpu public surface stays uniform.
// TODO: cudaHostAlloc / pinned memory for async DMA would be a real win
// here; out of scope for the Metal-focused input-staging lift.
function alloc(length: number, type: "f32" | "f64"): FArray {
  if (!Number.isInteger(length) || length < 0) {
    throw new RangeError(`length must be a non-negative integer; got ${length}`);
  }
  if (type !== "f32" && type !== "f64") {
    throw new TypeError(`type must be "f32" or "f64"; got ${String(type)}`);
  }
  return type === "f32" ? new Float32Array(length) : new Float64Array(length);
}
function isAligned(_arr: FArray): boolean {
  return false;
}

// hold/release stubs — CUDA backend has no residency yet (TODO: cuMemAlloc +
// cuMemcpyHtoD once so matVec reuses device memory across calls).
function hold(arr: FArray): GpuHandle {
  if (!(arr instanceof Float32Array) && !(arr instanceof Float64Array)) {
    throw new TypeError(
      `hold requires Float32Array or Float64Array; got ${(arr as any)?.constructor?.name ?? typeof arr}`,
    );
  }
  return {
    __bunGpuHandle: true,
    backend: "cuda",
    type: arr instanceof Float32Array ? "f32" : "f64",
    length: arr.length,
    buffer: 0n,
    view: arr,
    released: false,
  };
}
function releaseHandle(handle: GpuHandle): void {
  if (!isGpuHandle(handle)) {
    throw new TypeError(`release expected a GpuHandle; got ${typeof handle}`);
  }
  handle.released = true;
}

export default {
  name: "cuda" as const,
  probe,
  winsForSize,
  dot,
  matVec,
  matmul,
  simdMap,
  alloc,
  isAligned,
  hold,
  releaseHandle,
  dispose,
  getDeviceName,
};
