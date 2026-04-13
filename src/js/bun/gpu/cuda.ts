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
// Scope today: simdMap-affine (y = k1*x + k0) on Float32Array — the one
// kernel proven end-to-end against cuCtxSynchronize. dot / matVec / matmul
// fall back to bun:simd; GPU tilings land in follow-up commits.

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
`;

// ─── State ────────────────────────────────────────────────────────────────

type FArray = Float32Array | Float64Array;

let probed = false;
let probeResult = false;
let ctx: bigint | null = null;
let mod: bigint | null = null;
let fnAffineF32: bigint | null = null;
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

  const fnName = new TextEncoder().encode("simdMapAffineF32\0");
  const fnBuf = new BigUint64Array(1);
  if (s.cuModuleGetFunction(ptr(fnBuf), mod, ptr(fnName)) !== 0) {
    s.cuModuleUnload(mod);
    s.cuCtxDestroy_v2(ctx);
    mod = null;
    ctx = null;
    return false;
  }
  fnAffineF32 = fnBuf[0];

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

// ─── Size threshold ───────────────────────────────────────────────────────
//
// GPU dispatch has a fixed round-trip cost (~2 cuMemAlloc + HtoD + DtoH +
// one sync ≈ a few hundred µs on a warm context). Below this, staying on
// CPU/WASM is faster. Tuned empirically on an RTX 4070 Ti — revisit once
// we have real benchmarks in bench/parabun-gpu/.

const MIN_SIMDMAP_ELEMS = 1 << 18; // 256k f32 = 1 MB

function winsForSize(op: string, n: number, elemBytes: number): boolean {
  if (!probed && !probe()) return false;
  if (!probeResult) return false;
  if (op === "simdMap") return elemBytes === 4 && n >= MIN_SIMDMAP_ELEMS;
  return false;
}

// ─── Backend methods ──────────────────────────────────────────────────────

function dot(a: FArray, b: FArray): number {
  return simd.dot(a, b);
}

function matVec(matrix: FArray, vector: FArray, nRows: number, nCols: number): FArray {
  return simd.matVec(matrix as any, vector as any, nRows, nCols);
}

function matmul(a: FArray, b: FArray, m: number, k: number, n: number): FArray {
  if (a.constructor !== b.constructor) {
    throw new TypeError(
      `a and b must both be Float32Array or both be Float64Array; got ${a.constructor.name} and ${b.constructor.name}`,
    );
  }
  const out = (a instanceof Float32Array ? new Float32Array(m * n) : new Float64Array(m * n)) as FArray;
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
}

function simdMap(fn: (x: number, i: number) => number, a: FArray): FArray {
  if (typeof fn !== "function") throw new TypeError("fn must be a function");
  if (a instanceof Float32Array && fn.length <= 1 && probe() && a.length >= MIN_SIMDMAP_ELEMS) {
    const aff = tryAffineKernel(fn as (x: number) => number);
    if (aff) return launchAffineF32(a, aff.k1, aff.k0);
  }
  return simd.simdMap(fn, a as any);
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
  probed = false;
  probeResult = false;
}

// ─── Debug introspection ──────────────────────────────────────────────────

function getDeviceName(): string {
  return deviceName;
}

export default {
  name: "cuda" as const,
  probe,
  winsForSize,
  dot,
  matVec,
  matmul,
  simdMap,
  dispose,
  getDeviceName,
};
