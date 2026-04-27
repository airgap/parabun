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
  cuMemAllocHost_v2: (ptrPtr: number, size: bigint) => number;
  cuMemFreeHost: (ptr: bigint) => number;
  cuMemcpyHtoD_v2: (dst: bigint, src: number, size: bigint) => number;
  cuMemcpyDtoH_v2: (dst: number, src: bigint, size: bigint) => number;
  cuModuleLoadData: (modPtr: number, img: number) => number;
  cuModuleLoadDataEx: (
    modPtr: number,
    img: number,
    numOptions: number,
    options: number,
    optionValues: number,
  ) => number;
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
let ffiToArrayBuffer: ((ptr: bigint | number, byteOffset: number, byteLength: number) => ArrayBuffer) | null = null;

// ─── cuBLAS FFI bindings (optional) ───────────────────────────────────────
// libcublas ships with the CUDA toolkit, NOT the driver. Hosts that have
// only the NVIDIA driver (a common production setup) won't have it. We
// dlopen lazily and silently fall back to our hand-rolled PTX matmul
// when libcublas isn't available.
//
// Probe order: standard linker paths → versioned sonames (.13 / .12 / .11) →
// the BUN_PARABUN_CUBLAS_PATH env var as a last-resort override.

type CublasSymbols = {
  cublasCreate_v2: (handlePtr: number) => number;
  cublasDestroy_v2: (handle: bigint) => number;
  cublasSgemm_v2: (
    handle: bigint,
    transA: number,
    transB: number,
    m: number,
    n: number,
    k: number,
    alpha: number,
    A: bigint,
    lda: number,
    B: bigint,
    ldb: number,
    beta: number,
    C: bigint,
    ldc: number,
  ) => number;
  cublasSgemmStridedBatched: (
    handle: bigint,
    transA: number,
    transB: number,
    m: number,
    n: number,
    k: number,
    alpha: number,
    A: bigint,
    lda: number,
    strideA: bigint,
    B: bigint,
    ldb: number,
    strideB: bigint,
    beta: number,
    C: bigint,
    ldc: number,
    strideC: bigint,
    batchCount: number,
  ) => number;
};

const CUBLAS_OP_N = 0;
const CUBLAS_OP_T = 1;

let cublasLib: { symbols: CublasSymbols; close: () => void } | null = null;
let cublasHandle: bigint = 0n;
let cublasProbed = false;

function tryLoadCublas(): boolean {
  if (cublasProbed) return cublasLib !== null;
  cublasProbed = true;
  if (!cudaLib) return false; // need driver loaded first

  const { dlopen, FFIType } = require("../ffi.ts");

  const candidates: string[] = [];
  const envOverride = (process.env as any)?.BUN_PARABUN_CUBLAS_PATH as string | undefined;
  if (envOverride) candidates.push(envOverride);
  if (process.platform === "win32") {
    candidates.push("cublas64_13.dll", "cublas64_12.dll", "cublas64_11.dll");
  } else {
    candidates.push("libcublas.so", "libcublas.so.13", "libcublas.so.12", "libcublas.so.11");
  }

  for (const name of candidates) {
    try {
      const lib = dlopen(name, {
        cublasCreate_v2: { args: [FFIType.ptr], returns: FFIType.i32 },
        cublasDestroy_v2: { args: [FFIType.u64], returns: FFIType.i32 },
        cublasSgemm_v2: {
          args: [
            FFIType.u64,
            FFIType.i32,
            FFIType.i32,
            FFIType.i32,
            FFIType.i32,
            FFIType.i32,
            FFIType.ptr,
            FFIType.u64,
            FFIType.i32,
            FFIType.u64,
            FFIType.i32,
            FFIType.ptr,
            FFIType.u64,
            FFIType.i32,
          ],
          returns: FFIType.i32,
        },
        cublasSgemmStridedBatched: {
          args: [
            FFIType.u64,
            FFIType.i32,
            FFIType.i32,
            FFIType.i32,
            FFIType.i32,
            FFIType.i32,
            FFIType.ptr,
            FFIType.u64,
            FFIType.i32,
            FFIType.i64,
            FFIType.u64,
            FFIType.i32,
            FFIType.i64,
            FFIType.ptr,
            FFIType.u64,
            FFIType.i32,
            FFIType.i64,
            FFIType.i32,
          ],
          returns: FFIType.i32,
        },
      });
      // Create a handle bound to the current CUDA context.
      const handleBuf = new BigUint64Array(1);
      const r = lib.symbols.cublasCreate_v2(ffiPtr!(handleBuf));
      if (r !== 0) {
        try {
          lib.close();
        } catch {}
        continue;
      }
      cublasLib = lib;
      cublasHandle = handleBuf[0];
      return true;
    } catch {
      // try next candidate
    }
  }
  return false;
}

function tryLoadCuda(): boolean {
  if (cudaLib !== null) return true;
  try {
    const { dlopen, FFIType, ptr, toArrayBuffer } = require("../ffi.ts");
    ffiPtr = ptr;
    ffiToArrayBuffer = toArrayBuffer;
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
      cuMemAllocHost_v2: { args: [FFIType.ptr, FFIType.u64], returns: FFIType.i32 },
      cuMemFreeHost: { args: [FFIType.u64], returns: FFIType.i32 },
      cuMemcpyHtoD_v2: { args: [FFIType.u64, FFIType.ptr, FFIType.u64], returns: FFIType.i32 },
      cuMemcpyDtoH_v2: { args: [FFIType.ptr, FFIType.u64, FFIType.u64], returns: FFIType.i32 },
      cuModuleLoadData: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.i32 },
      cuModuleLoadDataEx: {
        args: [FFIType.ptr, FFIType.ptr, FFIType.u32, FFIType.ptr, FFIType.ptr],
        returns: FFIType.i32,
      },
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
//   matmulF32        — (M×K)·(K×N) → M×N. 8×8 threadblock (64 threads =
//                      2 warps) computes a 32×32 output tile with register
//                      tiling: each thread accumulates a 4×4 sub-tile.
//                      Cooperative global→SMEM load fills As[32][32] /
//                      Bs[32][32] (16 slots per thread), bar.sync'd, then
//                      the inner K-loop does 32 iterations of {4 aVals + 4
//                      bVals from SMEM, 16 fma.rn.f32's}. Compute/SMEM
//                      ratio is 2.0 FMAs/load (vs 0.5 in a one-thread-per-
//                      cell kernel) — that's the whole point. Vectorized
//                      ld.global.v4.f32 and tensor cores are the remaining
//                      headroom; current cold is ~1–2 % of device peak.
//   dotF32           — a·b → scalar. Grid of 1024 blocks × 32 threads (one
//                      warp per block). Each thread stride-loops the vector
//                      with fma.rn.f32; within the warp a shfl.sync.bfly
//                      butterfly reduces to a single per-block f32 partial;
//                      host sums the 1024 partials. Same reduction shape as
//                      matVecF32 — that's why the kernel is small.
//
// PTX 7.0 is the floor — the non-sync shfl.bfly was removed in PTX 6.0, so
// we use shfl.sync.bfly.b32 with a full 0xffffffff membermask (the warp is
// fully active by construction — block size is exactly 32).

// Init block for the 4×4 per-thread accumulator tile.
const MATMUL_INIT_ACC = Array.from({ length: 16 }, (_, i) => `    mov.f32       %f${1 + i}, 0f00000000;`).join("\n");

// Unrolled inner K-loop for register-tiled matmulF32 (32 iterations).
// Each iter loads 4 aVals (column kk of As, rows ty*4..ty*4+3) and
// 4 bVals (row kk of Bs, cols tx*4..tx*4+3), then does 16 FMAs into
// the thread's 4×4 accumulator tile. 8 SMEM loads + 16 FMAs per kk →
// compute/SMEM ratio 2.0 (vs 0.5 in the one-thread-per-cell kernel).
//
// Per-thread SMEM bases:
//   aPtrBase = MMAs + ty*512  (byte addr of row ty*4 in As)
//   bPtrBase = MMBs + tx*16   (byte addr of col tx*4 in Bs)
// Per-iter offsets:
//   As[ty*4+i, kk] = aPtrBase + kk*4  + i*128
//   Bs[kk, tx*4+j] = bPtrBase + kk*128 + j*4
const MATMUL_K_UNROLL = Array.from({ length: 32 }, (_, kk) => {
  const lines: string[] = [];
  const aOff = kk * 4;
  const bOff = kk * 128;
  for (let i = 0; i < 4; i++) {
    lines.push(`    ld.shared.f32 %f${17 + i}, [%r30 + ${aOff + i * 128}];`);
  }
  for (let j = 0; j < 4; j++) {
    lines.push(`    ld.shared.f32 %f${21 + j}, [%r32 + ${bOff + j * 4}];`);
  }
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const acc = 1 + i * 4 + j;
      lines.push(`    fma.rn.f32    %f${acc}, %f${17 + i}, %f${21 + j}, %f${acc};`);
    }
  }
  return lines.join("\n");
}).join("\n");

// Unrolled 4×4 output store with per-row/per-col edge predicates.
// Uses: rowBase=%r8, colBase=%r9, M=%r1, N=%r3, cPtr=%rd3. Assumes
// %p5..%p8 are precomputed col predicates (col0..col3 < N).
const MATMUL_REG_STORE = (() => {
  const lines: string[] = [];
  for (let i = 0; i < 4; i++) {
    if (i === 0) {
      lines.push(`    mov.u32       %r36, %r8;`);
    } else {
      lines.push(`    add.u32       %r36, %r8, ${i};`);
    }
    lines.push(`    setp.lt.u32   %p4, %r36, %r1;`);
    lines.push(`    mad.lo.s32    %r37, %r36, %r3, %r9;`);
    lines.push(`    mul.wide.u32  %rd8, %r37, 4;`);
    lines.push(`    add.s64       %rd10, %rd3, %rd8;`);
    for (let j = 0; j < 4; j++) {
      const accReg = 1 + i * 4 + j;
      const colPred = 5 + j;
      lines.push(`    and.pred      %p9, %p4, %p${colPred};`);
      lines.push(`    @%p9 st.global.f32 [%rd10 + ${j * 4}], %f${accReg};`);
    }
  }
  return lines.join("\n");
})();

const PTX_MODULE = `
.version 7.0
.target sm_50
.address_size 64

// Module-scope shared tiles for matmulF32. Declared here (not inside the
// entry) because ptxas rejects shared-in-entry with + offset addressing
// across some versions; module scope is the compatible form.
.shared .align 4 .b32 MMAs[1024];
.shared .align 4 .b32 MMBs[1024];

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

.visible .entry matmulF32(
    .param .u64 aPtr,
    .param .u64 bPtr,
    .param .u64 cPtr,
    .param .u32 m,
    .param .u32 k,
    .param .u32 n
)
{
    .reg .pred  %p<10>;
    .reg .b32   %r<60>;
    .reg .f32   %f<27>;
    .reg .b64   %rd<20>;

    ld.param.u64  %rd1, [aPtr];
    ld.param.u64  %rd2, [bPtr];
    ld.param.u64  %rd3, [cPtr];
    ld.param.u32  %r1,  [m];
    ld.param.u32  %r2,  [k];
    ld.param.u32  %r3,  [n];

    cvta.to.global.u64 %rd1, %rd1;
    cvta.to.global.u64 %rd2, %rd2;
    cvta.to.global.u64 %rd3, %rd3;

    mov.u32       %r4, %tid.x;       // tx 0..7
    mov.u32       %r5, %tid.y;       // ty 0..7
    mov.u32       %r6, %ctaid.x;     // bx
    mov.u32       %r7, %ctaid.y;     // by

    // rowBase = by*32 + ty*4  (first of 4 output rows this thread writes)
    shl.b32       %r8, %r7, 5;
    shl.b32       %r11, %r5, 2;
    add.u32       %r8, %r8, %r11;
    // colBase = bx*32 + tx*4  (first of 4 output cols this thread writes)
    shl.b32       %r9, %r6, 5;
    shl.b32       %r11, %r4, 2;
    add.u32       %r9, %r9, %r11;

    // flat thread id (0..63): flat = ty*8 + tx. Used only by the cooperative
    // global->SMEM load loop to assign 16 tile slots per thread.
    shl.b32       %r10, %r5, 3;
    add.u32       %r10, %r10, %r4;

    // Per-thread SMEM bases for the inner K-loop:
    //   %r30 = MMAs + ty*4*32*4 = MMAs + ty*512  (byte addr of row ty*4)
    //   %r32 = MMBs + tx*4*4    = MMBs + tx*16   (byte addr of col tx*4)
    mov.u32       %r33, MMAs;
    shl.b32       %r34, %r5, 9;
    add.u32       %r30, %r33, %r34;
    mov.u32       %r33, MMBs;
    shl.b32       %r34, %r4, 4;
    add.u32       %r32, %r33, %r34;

${MATMUL_INIT_ACC}

    mov.u32       %r13, 0;           // t (K-tile start)

MMTLOOP:
    setp.ge.u32   %p1, %r13, %r2;
    @%p1 bra      MMEPI;

    // Cooperative global->SMEM load. 64 threads, 1024 tile slots -> 16 slots
    // per thread. Iteration i in 0..15: linIdx = flat + i*64; within warp
    // linIdx stride is 1 (flat strides 1), so a warp's 32 consecutive
    // linIdx hit 32 consecutive (asRow,asCol) in memory -> coalesced.
    mov.u32       %r14, 0;           // i = 0

LDLOOP:
    setp.ge.u32   %p2, %r14, 16;
    @%p2 bra      LDDONE;

    shl.b32       %r15, %r14, 6;         // i*64
    add.u32       %r16, %r10, %r15;      // linIdx = flat + i*64
    shr.u32       %r17, %r16, 5;         // asRow = linIdx >> 5
    and.b32       %r18, %r16, 31;        // asCol = linIdx & 31
    shl.b32       %r19, %r16, 2;         // shared byte offset = linIdx*4

    // A[by*32 + asRow, t + asCol]  -> As[linIdx]  (pred: row<M && col<K)
    shl.b32       %r20, %r7, 5;
    add.u32       %r20, %r20, %r17;      // A global row
    add.u32       %r21, %r13, %r18;      // A global col
    setp.lt.u32   %p3, %r20, %r1;
    setp.lt.u32   %p4, %r21, %r2;
    and.pred      %p3, %p3, %p4;
    mad.lo.s32    %r22, %r20, %r2, %r21;
    mul.wide.u32  %rd4, %r22, 4;
    add.s64       %rd5, %rd1, %rd4;
    mov.f32       %f25, 0f00000000;
    @%p3 ld.global.f32 %f25, [%rd5];
    mov.u32       %r23, MMAs;
    add.u32       %r23, %r23, %r19;
    st.shared.f32 [%r23], %f25;

    // B[t + asRow, bx*32 + asCol]  -> Bs[linIdx]  (pred: row<K && col<N)
    add.u32       %r24, %r13, %r17;      // B global row
    shl.b32       %r25, %r6, 5;
    add.u32       %r25, %r25, %r18;      // B global col
    setp.lt.u32   %p3, %r24, %r2;
    setp.lt.u32   %p4, %r25, %r3;
    and.pred      %p3, %p3, %p4;
    mad.lo.s32    %r26, %r24, %r3, %r25;
    mul.wide.u32  %rd6, %r26, 4;
    add.s64       %rd7, %rd2, %rd6;
    mov.f32       %f26, 0f00000000;
    @%p3 ld.global.f32 %f26, [%rd7];
    mov.u32       %r27, MMBs;
    add.u32       %r27, %r27, %r19;
    st.shared.f32 [%r27], %f26;

    add.u32       %r14, %r14, 1;
    bra           LDLOOP;

LDDONE:
    bar.sync 0;

    // Inner K-loop (unrolled 32x). Each kk: 4 aVals + 4 bVals from SMEM,
    // then 16 FMAs updating the 4x4 accumulator tile.
${MATMUL_K_UNROLL}

    bar.sync 0;

    add.u32       %r13, %r13, 32;
    bra           MMTLOOP;

MMEPI:
    // Precompute col predicates: col0..col3 < N  ->  %p5..%p8
    setp.lt.u32   %p5, %r9, %r3;
    add.u32       %r35, %r9, 1;
    setp.lt.u32   %p6, %r35, %r3;
    add.u32       %r35, %r9, 2;
    setp.lt.u32   %p7, %r35, %r3;
    add.u32       %r35, %r9, 3;
    setp.lt.u32   %p8, %r35, %r3;

${MATMUL_REG_STORE}

MMDONE:
    ret;
}

.visible .entry dotF32(
    .param .u64 aPtr,
    .param .u64 bPtr,
    .param .u64 outPtr,
    .param .u32 n
)
{
    .reg .pred  %p<3>;
    .reg .b32   %r<12>;
    .reg .f32   %f<6>;
    .reg .b64   %rd<12>;

    ld.param.u64  %rd1, [aPtr];
    ld.param.u64  %rd2, [bPtr];
    ld.param.u64  %rd3, [outPtr];
    ld.param.u32  %r1,  [n];

    mov.u32       %r2, %ctaid.x;
    mov.u32       %r3, %nctaid.x;
    mov.u32       %r4, %tid.x;

    cvta.to.global.u64 %rd4, %rd1;
    cvta.to.global.u64 %rd5, %rd2;

    mov.f32       %f1, 0f00000000;

    // i = ctaid*32 + tid; stride = nctaid*32
    shl.b32       %r5, %r2, 5;
    add.u32       %r6, %r5, %r4;
    shl.b32       %r7, %r3, 5;

DOTLOOP:
    setp.ge.u32   %p1, %r6, %r1;
    @%p1 bra      DOTREDUCE;

    mul.wide.u32  %rd6, %r6, 4;
    add.s64       %rd7, %rd4, %rd6;
    add.s64       %rd8, %rd5, %rd6;
    ld.global.f32 %f2, [%rd7];
    ld.global.f32 %f3, [%rd8];
    fma.rn.f32    %f1, %f2, %f3, %f1;

    add.u32       %r6, %r6, %r7;
    bra           DOTLOOP;

DOTREDUCE:
    mov.b32       %r8, %f1;
    shfl.sync.bfly.b32 %r9, %r8, 16, 0x1f, 0xffffffff;
    mov.b32       %f4, %r9;
    add.f32       %f1, %f1, %f4;

    mov.b32       %r8, %f1;
    shfl.sync.bfly.b32 %r9, %r8, 8, 0x1f, 0xffffffff;
    mov.b32       %f4, %r9;
    add.f32       %f1, %f1, %f4;

    mov.b32       %r8, %f1;
    shfl.sync.bfly.b32 %r9, %r8, 4, 0x1f, 0xffffffff;
    mov.b32       %f4, %r9;
    add.f32       %f1, %f1, %f4;

    mov.b32       %r8, %f1;
    shfl.sync.bfly.b32 %r9, %r8, 2, 0x1f, 0xffffffff;
    mov.b32       %f4, %r9;
    add.f32       %f1, %f1, %f4;

    mov.b32       %r8, %f1;
    shfl.sync.bfly.b32 %r9, %r8, 1, 0x1f, 0xffffffff;
    mov.b32       %f4, %r9;
    add.f32       %f1, %f1, %f4;

    // thread 0 writes partial[ctaid.x]
    setp.ne.u32   %p2, %r4, 0;
    @%p2 bra      DOTDONE;

    mul.wide.u32  %rd9, %r2, 4;
    cvta.to.global.u64 %rd10, %rd3;
    add.s64       %rd11, %rd10, %rd9;
    st.global.f32 [%rd11], %f1;

DOTDONE:
    ret;
}
`;

// ─── State ────────────────────────────────────────────────────────────────

type FArray = Float32Array | Float64Array;

// Opaque handle returned by `hold(arr)`. On CUDA, `buffer` carries the
// device pointer returned by cuMemAlloc_v2; a held Float32Array pays the
// HtoD cost once at hold() time and every subsequent matVec reuses the
// resident device memory. `view` stays pinned so the user can read back
// from it and so release() knows what was wrapped. f64 arrays don't get a
// device pointer today because no CUDA kernel consumes them yet — those
// handles pass through to simd with a cheap view wrap.
//
// `qFormat` marks a quantized weight: the device buffer holds raw Q4_K
// super-blocks rather than fp32 values, and matVec dispatches to a
// format-specific dequant+dot kernel. `view` is set to an empty Float32Array
// stub because the public GpuHandle contract requires it, but callers
// should not read it for quantized handles (length still reflects the
// logical element count so shape checks work).
type GpuHandle = {
  __bunGpuHandle: true;
  backend: "metal" | "cuda" | "cpu";
  type: "f32" | "f64";
  length: number;
  buffer: bigint;
  view: FArray;
  released: boolean;
  qFormat?: "q4_K" | "q6_K";
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
let fnMatmulF32: bigint | null = null;
let fnDotF32: bigint | null = null;
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

  // Use cuModuleLoadDataEx so we can surface the ptxas error text when
  // the PTX fails to compile — invaluable when iterating on kernels.
  // CU_JIT_ERROR_LOG_BUFFER = 5, CU_JIT_ERROR_LOG_BUFFER_SIZE_BYTES = 6
  const ptxBytes = new TextEncoder().encode(PTX_MODULE + "\0");
  const modBuf = new BigUint64Array(1);
  const errLog = new Uint8Array(8192);
  const options = new Uint32Array([5, 6]);
  const optVals = new BigUint64Array([BigInt(ptr(errLog)), BigInt(errLog.length)]);
  if (s.cuModuleLoadDataEx(ptr(modBuf), ptr(ptxBytes), 2, ptr(options), ptr(optVals)) !== 0) {
    const end = errLog.indexOf(0);
    if (end > 0) {
      console.error(`bun:gpu cuda: PTX module load failed:\n${new TextDecoder().decode(errLog.subarray(0, end))}`);
    }
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

  const matmulName = new TextEncoder().encode("matmulF32\0");
  const matmulBuf = new BigUint64Array(1);
  if (s.cuModuleGetFunction(ptr(matmulBuf), mod, ptr(matmulName)) !== 0) {
    s.cuModuleUnload(mod);
    s.cuCtxDestroy_v2(ctx);
    fnAffineF32 = null;
    fnMatVecF32 = null;
    mod = null;
    ctx = null;
    return false;
  }
  fnMatmulF32 = matmulBuf[0];

  // Best-effort cuBLAS probe — if libcublas is on the system we use its
  // matmul (cublasSgemm) instead of the PTX kernel above. The PTX kernel
  // stays loaded as the fallback; nothing else here changes.
  tryLoadCublas();

  const dotName = new TextEncoder().encode("dotF32\0");
  const dotBuf = new BigUint64Array(1);
  if (s.cuModuleGetFunction(ptr(dotBuf), mod, ptr(dotName)) !== 0) {
    s.cuModuleUnload(mod);
    s.cuCtxDestroy_v2(ctx);
    fnAffineF32 = null;
    fnMatVecF32 = null;
    fnMatmulF32 = null;
    mod = null;
    ctx = null;
    return false;
  }
  fnDotF32 = dotBuf[0];

  probeResult = true;

  // Rehydrate the persisted per-host calibration if one exists. We do this
  // lazily inside probe so it runs at most once per process, after we've
  // read the GPU device name (part of the cache key).
  applyCachedCalibration();

  return true;
}

// ─── Affine simdMap detector (mirrors simd.ts) ────────────────────────────
//
// Fires four probe points (x=-1,0,1,2); if the function is linear it
// uniquely determines y = k1*x + k0 and we can push it to the GPU.
// The x=-1 probe catches piecewise functions like relu that pass 3-point.
// Same tolerance as the simd-side detector so behavior stays consistent.

const AFFINE_TOL = 1e-5;

function tryAffineKernel(fn: (x: number) => number): { k1: number; k0: number } | null {
  try {
    const yn1 = fn(-1);
    const y0 = fn(0);
    const y1 = fn(1);
    const y2 = fn(2);
    if (!Number.isFinite(yn1) || !Number.isFinite(y0) || !Number.isFinite(y1) || !Number.isFinite(y2)) return null;
    const k1 = y1 - y0;
    const k0 = y0;
    if (Math.abs(y2 - (2 * k1 + k0)) > AFFINE_TOL * (1 + Math.abs(y2))) return null;
    if (Math.abs(yn1 - (-k1 + k0)) > AFFINE_TOL * (1 + Math.abs(yn1))) return null;
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

function launchMatVecF32(mat: Float32Array | GpuHandle, vec: Float32Array, m: number, k: number): Float32Array {
  const s = cudaLib!.symbols;
  const ptr = ffiPtr!;
  const matBytes = BigInt(m * k * 4);
  const vecBytes = BigInt(k * 4);
  const outBytes = BigInt(m * 4);

  // Held mat (Tier 4 residency): cuMemAlloc + cuMemcpyHtoD already ran in
  // hold(); we just reuse the resident device pointer and skip the free.
  // Unheld mat: alloc + HtoD here, free in the finally block.
  let dMat: bigint;
  let matOwned: boolean;
  if (isGpuHandle(mat)) {
    if (mat.released) throw new Error("bun:gpu: matVec called on released handle");
    if (mat.buffer === 0n) throw new Error("bun:gpu cuda: handle has no device buffer (f64?)");
    dMat = mat.buffer;
    matOwned = false;
  } else {
    const dMatBuf = new BigUint64Array(1);
    if (s.cuMemAlloc_v2(ptr(dMatBuf), matBytes) !== 0) throw new Error("bun:gpu cuda: cuMemAlloc(mat) failed");
    dMat = dMatBuf[0];
    matOwned = true;
  }

  let dVec: bigint = 0n;
  let dOut: bigint = 0n;
  try {
    const dVecBuf = new BigUint64Array(1);
    if (s.cuMemAlloc_v2(ptr(dVecBuf), vecBytes) !== 0) throw new Error("bun:gpu cuda: cuMemAlloc(vec) failed");
    dVec = dVecBuf[0];

    const dOutBuf = new BigUint64Array(1);
    if (s.cuMemAlloc_v2(ptr(dOutBuf), outBytes) !== 0) throw new Error("bun:gpu cuda: cuMemAlloc(out) failed");
    dOut = dOutBuf[0];

    if (matOwned) {
      if (s.cuMemcpyHtoD_v2(dMat, ptr(mat as Float32Array), matBytes) !== 0) {
        throw new Error("bun:gpu cuda: cuMemcpyHtoD(mat) failed");
      }
    }
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
    if (matOwned && dMat !== 0n) s.cuMemFree_v2(dMat);
    if (dVec !== 0n) s.cuMemFree_v2(dVec);
    if (dOut !== 0n) s.cuMemFree_v2(dOut);
  }
}

// ─── Kernel launch: matmulF32 ─────────────────────────────────────────────
//
// (M×K)·(K×N) → M×N. Three device buffers (A, B, C). Grid is 2D: one thread
// per output cell, 16×16 threadblock. Either input may arrive held (Tier 4
// residency) — held inputs skip their cuMemAlloc+HtoD+free. C is always
// freshly allocated, HtoD'd from nothing, and DtoH'd back to the host output.

function launchMatmulF32(
  a: Float32Array | GpuHandle,
  b: Float32Array | GpuHandle,
  m: number,
  k: number,
  n: number,
  out?: Float32Array,
): Float32Array {
  const s = cudaLib!.symbols;
  const ptr = ffiPtr!;
  const aBytes = BigInt(m * k * 4);
  const bBytes = BigInt(k * n * 4);
  const cBytes = BigInt(m * n * 4);

  let dA: bigint;
  let aOwned: boolean;
  if (isGpuHandle(a)) {
    if (a.released) throw new Error("bun:gpu: matmul called on released handle");
    if (a.buffer === 0n) throw new Error("bun:gpu cuda: handle has no device buffer (f64?)");
    dA = a.buffer;
    aOwned = false;
  } else {
    const dABuf = new BigUint64Array(1);
    if (s.cuMemAlloc_v2(ptr(dABuf), aBytes) !== 0) throw new Error("bun:gpu cuda: cuMemAlloc(A) failed");
    dA = dABuf[0];
    aOwned = true;
  }

  let dB: bigint;
  let bOwned: boolean;
  if (isGpuHandle(b)) {
    if (b.released) throw new Error("bun:gpu: matmul called on released handle");
    if (b.buffer === 0n) throw new Error("bun:gpu cuda: handle has no device buffer (f64?)");
    dB = b.buffer;
    bOwned = false;
  } else {
    const dBBuf = new BigUint64Array(1);
    if (s.cuMemAlloc_v2(ptr(dBBuf), bBytes) !== 0) {
      if (aOwned) s.cuMemFree_v2(dA);
      throw new Error("bun:gpu cuda: cuMemAlloc(B) failed");
    }
    dB = dBBuf[0];
    bOwned = true;
  }

  let dC: bigint = 0n;
  try {
    const dCBuf = new BigUint64Array(1);
    if (s.cuMemAlloc_v2(ptr(dCBuf), cBytes) !== 0) throw new Error("bun:gpu cuda: cuMemAlloc(C) failed");
    dC = dCBuf[0];

    if (aOwned) {
      if (s.cuMemcpyHtoD_v2(dA, ptr(a as Float32Array), aBytes) !== 0) {
        throw new Error("bun:gpu cuda: cuMemcpyHtoD(A) failed");
      }
    }
    if (bOwned) {
      if (s.cuMemcpyHtoD_v2(dB, ptr(b as Float32Array), bBytes) !== 0) {
        throw new Error("bun:gpu cuda: cuMemcpyHtoD(B) failed");
      }
    }

    const pABuf = new BigUint64Array([dA]);
    const pBBuf = new BigUint64Array([dB]);
    if (cublasLib !== null) {
      // cuBLAS path: dispatch through cublasSgemm. cuBLAS uses column-major,
      // but our row-major layout maps cleanly via the standard transpose
      // trick: row-major C[m,n] = A[m,k] · B[k,n] becomes column-major
      // C^T[n,m] = B^T_col[n,k] · A^T_col[k,m], so we call sgemm with the
      // pointers swapped and OP_N for both, ldA=k, ldB=n, ldC=n.
      const alphaBuf = new Float32Array([1.0]);
      const betaBuf = new Float32Array([0.0]);
      const r = cublasLib.symbols.cublasSgemm_v2(
        cublasHandle,
        CUBLAS_OP_N,
        CUBLAS_OP_N,
        n,
        m,
        k,
        ptr(alphaBuf),
        dB,
        n,
        dA,
        k,
        ptr(betaBuf),
        dC,
        n,
      );
      if (r !== 0) throw new Error(`bun:gpu cublasSgemm failed (${r})`);
      if (s.cuCtxSynchronize() !== 0) throw new Error("bun:gpu cuda: cuCtxSynchronize failed");
    } else {
      const pABuf = new BigUint64Array([dA]);
      const pBBuf = new BigUint64Array([dB]);
      const pCBuf = new BigUint64Array([dC]);
      const pM = new Uint32Array([m]);
      const pK = new Uint32Array([k]);
      const pN = new Uint32Array([n]);
      const paramPtrs = new BigUint64Array([
        BigInt(ptr(pABuf)),
        BigInt(ptr(pBBuf)),
        BigInt(ptr(pCBuf)),
        BigInt(ptr(pM)),
        BigInt(ptr(pK)),
        BigInt(ptr(pN)),
      ]);

      // 8×8 threadblock (64 threads = 2 warps); each thread accumulates a
      // 4×4 output sub-tile, so the block still computes a 32×32 output tile.
      // Grid covers ceil(n/32) × ceil(m/32) — identical to the naive kernel.
      const OUT_TILE = 32;
      const gridX = Math.floor((n + OUT_TILE - 1) / OUT_TILE);
      const gridY = Math.floor((m + OUT_TILE - 1) / OUT_TILE);
      const r = s.cuLaunchKernel(fnMatmulF32!, gridX, gridY, 1, 8, 8, 1, 0, 0n, ptr(paramPtrs), null);
      if (r !== 0) throw new Error(`bun:gpu cuda: cuLaunchKernel(matmul) failed (${r})`);
      if (s.cuCtxSynchronize() !== 0) throw new Error("bun:gpu cuda: cuCtxSynchronize failed");
    }

    // DtoH directly into the caller's buffer when provided — including
    // SharedArrayBuffer-backed Float32Arrays. From CUDA's perspective it's
    // just a host pointer; shared-ness is invisible. This is the whole
    // point of the out-buffer API: skip the CPU-side copy that parallel
    // top-K was paying at Q=256.
    const dst = out ?? new Float32Array(m * n);
    if (s.cuMemcpyDtoH_v2(ptr(dst), dC, cBytes) !== 0) throw new Error("bun:gpu cuda: cuMemcpyDtoH(C) failed");
    return dst;
  } finally {
    if (aOwned && dA !== 0n) s.cuMemFree_v2(dA);
    if (bOwned && dB !== 0n) s.cuMemFree_v2(dB);
    if (dC !== 0n) s.cuMemFree_v2(dC);
  }
}

// ─── Kernel launch: conv2D ────────────────────────────────────────────────
// Valid-mode 2D convolution. The kernel function is resolved through the
// NVRTC dev-ops module (probeDevOps), so this launcher is only callable
// when devOpsFns is non-null. The public wrapper falls back to CPU when
// it isn't.

function launchConv2DF32(
  input: Float32Array | GpuHandle,
  kernel: Float32Array | GpuHandle,
  iW: number,
  iH: number,
  kW: number,
  kH: number,
): Float32Array {
  const s = cudaLib!.symbols;
  const ptr = ffiPtr!;
  const oW = iW - kW + 1;
  const oH = iH - kH + 1;
  const inBytes = BigInt(iW * iH * 4);
  const kBytes = BigInt(kW * kH * 4);
  const outBytes = BigInt(oW * oH * 4);

  let dIn: bigint;
  let inOwned: boolean;
  if (isGpuHandle(input)) {
    if (input.released) throw new Error("bun:gpu: conv2D called on released handle");
    if (input.buffer === 0n) throw new Error("bun:gpu cuda: handle has no device buffer (f64?)");
    dIn = input.buffer;
    inOwned = false;
  } else {
    const dInBuf = new BigUint64Array(1);
    if (s.cuMemAlloc_v2(ptr(dInBuf), inBytes) !== 0) throw new Error("bun:gpu cuda: cuMemAlloc(input) failed");
    dIn = dInBuf[0];
    inOwned = true;
  }

  let dK: bigint;
  let kOwned: boolean;
  if (isGpuHandle(kernel)) {
    if (kernel.released) throw new Error("bun:gpu: conv2D called on released handle");
    if (kernel.buffer === 0n) throw new Error("bun:gpu cuda: kernel handle has no device buffer");
    dK = kernel.buffer;
    kOwned = false;
  } else {
    const dKBuf = new BigUint64Array(1);
    if (s.cuMemAlloc_v2(ptr(dKBuf), kBytes) !== 0) {
      if (inOwned) s.cuMemFree_v2(dIn);
      throw new Error("bun:gpu cuda: cuMemAlloc(kernel) failed");
    }
    dK = dKBuf[0];
    kOwned = true;
  }

  let dOut: bigint = 0n;
  try {
    const dOutBuf = new BigUint64Array(1);
    if (s.cuMemAlloc_v2(ptr(dOutBuf), outBytes) !== 0) throw new Error("bun:gpu cuda: cuMemAlloc(output) failed");
    dOut = dOutBuf[0];

    if (inOwned) {
      if (s.cuMemcpyHtoD_v2(dIn, ptr(input as Float32Array), inBytes) !== 0) {
        throw new Error("bun:gpu cuda: cuMemcpyHtoD(input) failed");
      }
    }
    if (kOwned) {
      if (s.cuMemcpyHtoD_v2(dK, ptr(kernel as Float32Array), kBytes) !== 0) {
        throw new Error("bun:gpu cuda: cuMemcpyHtoD(kernel) failed");
      }
    }

    const pInBuf = new BigUint64Array([dIn]);
    const pKBuf = new BigUint64Array([dK]);
    const pOutBuf = new BigUint64Array([dOut]);
    const pIW = new Uint32Array([iW]);
    const pIH = new Uint32Array([iH]);
    const pKW = new Uint32Array([kW]);
    const pKH = new Uint32Array([kH]);
    const paramPtrs = new BigUint64Array([
      BigInt(ptr(pInBuf)),
      BigInt(ptr(pKBuf)),
      BigInt(ptr(pOutBuf)),
      BigInt(ptr(pIW)),
      BigInt(ptr(pIH)),
      BigInt(ptr(pKW)),
      BigInt(ptr(pKH)),
    ]);

    // 16×16 blocks; grid covers ceil(oW/16) × ceil(oH/16).
    const gridX = Math.floor((oW + 15) / 16);
    const gridY = Math.floor((oH + 15) / 16);
    const r = s.cuLaunchKernel(devOpsFns!.conv2D, gridX, gridY, 1, 16, 16, 1, 0, 0n, ptr(paramPtrs), null);
    if (r !== 0) throw new Error(`bun:gpu cuda: cuLaunchKernel(conv2D) failed (${r})`);
    if (s.cuCtxSynchronize() !== 0) throw new Error("bun:gpu cuda: cuCtxSynchronize failed");

    const out = new Float32Array(oW * oH);
    if (s.cuMemcpyDtoH_v2(ptr(out), dOut, outBytes) !== 0) throw new Error("bun:gpu cuda: cuMemcpyDtoH(output) failed");
    return out;
  } finally {
    if (inOwned && dIn !== 0n) s.cuMemFree_v2(dIn);
    if (kOwned && dK !== 0n) s.cuMemFree_v2(dK);
    if (dOut !== 0n) s.cuMemFree_v2(dOut);
  }
}

// ─── Kernel launch: gaussian_blur_rgba_u8 ─────────────────────────────────
// Single-launch fused RGBA blur — one thread per output pixel computes
// all four channels with one set of kernel weight loads. Sidesteps the
// JS-side per-channel deinterleave that dominates the conv2D-based
// dispatch.
//
// Persistent device buffers + pinned host buffers: cuMemAlloc / cuMemFree
// of 64 MB on every call costs ~50 ms by itself, and cuMemcpy of pageable
// host memory takes a slow driver-staged path (sub-1 GB/s). The fix is
// (a) keep the device buffers around across calls, and (b) stage host
// data through cuMemAllocHost-pinned memory so the H2D / D2H DMA can run
// at PCIe line rate. Cache both at module scope keyed by byte size;
// repeated same-size dispatches reuse them. Free on backend dispose().
//
// Caller must ensure NVRTC is available (probeDevOps()); the public
// wrapper on bun:gpu falls back to CPU otherwise.
const cachedDeviceBuffers: Map<bigint, bigint> = new Map();
const cachedPinnedBuffers: Map<bigint, bigint> = new Map();

function getCachedDevBuf(bytes: bigint): bigint {
  const hit = cachedDeviceBuffers.get(bytes);
  if (hit !== undefined) return hit;
  const s = cudaLib!.symbols;
  const ptr = ffiPtr!;
  const buf = new BigUint64Array(1);
  if (s.cuMemAlloc_v2(ptr(buf), bytes) !== 0) {
    throw new Error(`bun:gpu cuda: cuMemAlloc(${bytes}) failed`);
  }
  cachedDeviceBuffers.set(bytes, buf[0]);
  return buf[0];
}

function getCachedPinnedBuf(bytes: bigint): bigint {
  const hit = cachedPinnedBuffers.get(bytes);
  if (hit !== undefined) return hit;
  const s = cudaLib!.symbols;
  const ptr = ffiPtr!;
  const buf = new BigUint64Array(1);
  if (s.cuMemAllocHost_v2(ptr(buf), bytes) !== 0) {
    throw new Error(`bun:gpu cuda: cuMemAllocHost(${bytes}) failed`);
  }
  cachedPinnedBuffers.set(bytes, buf[0]);
  return buf[0];
}

function freeCachedDevBufs(): void {
  const s = cudaLib?.symbols;
  if (!s) {
    cachedDeviceBuffers.clear();
    cachedPinnedBuffers.clear();
    return;
  }
  for (const ptr of cachedDeviceBuffers.values()) s.cuMemFree_v2(ptr);
  cachedDeviceBuffers.clear();
  for (const ptr of cachedPinnedBuffers.values()) s.cuMemFreeHost(ptr);
  cachedPinnedBuffers.clear();
}

function launchGaussianBlurRGBAu8(input: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  const s = cudaLib!.symbols;
  const ptr = ffiPtr!;
  const tab = ffiToArrayBuffer!;
  const inBytes = BigInt(input.length);
  const kSize = 2 * radius + 1;
  const kBytes = BigInt(kSize * 4);

  // Build the 1D Gaussian once on the host. Same coefficients as the C++
  // path so callers see consistent output across CPU and GPU.
  const sigma = radius / 3 + 1e-6;
  const k1d = new Float32Array(kSize);
  let sum = 0;
  for (let i = 0; i < kSize; i++) {
    const x = i - radius;
    k1d[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += k1d[i];
  }
  for (let i = 0; i < kSize; i++) k1d[i] /= sum;

  // Get persistent device buffers — alloc on first hit at each size, reuse
  // on subsequent calls. Use distinct cache keys for input vs output so a
  // single-size repeated call always hits the same buffer pair.
  const dIn = getCachedDevBuf(inBytes);
  const dOut = getCachedDevBuf(inBytes + 1n);
  const dKern = getCachedDevBuf(kBytes);

  // Pinned host buffers for the input + output staging. Copying through
  // these lets cuMemcpyHtoD / cuMemcpyDtoH DMA at full PCIe line rate
  // instead of the slow driver-staged path used for pageable Uint8Array
  // pointers. The CPU-side memcpy into the pinned buffer is fast (inline
  // typed-array .set()).
  const pinnedInPtr = getCachedPinnedBuf(inBytes);
  const pinnedOutPtr = getCachedPinnedBuf(inBytes + 1n);
  // Convert the pinned bigint pointer to a Uint8Array view we can write
  // into. 48-bit user-space pointers fit in a JS Number exactly.
  const pinnedInView = new Uint8Array(tab(Number(pinnedInPtr), 0, input.length));
  const pinnedOutView = new Uint8Array(tab(Number(pinnedOutPtr), 0, input.length));
  pinnedInView.set(input);

  if (s.cuMemcpyHtoD_v2(dIn, Number(pinnedInPtr), inBytes) !== 0) {
    throw new Error("bun:gpu cuda: cuMemcpyHtoD(input) failed");
  }
  if (s.cuMemcpyHtoD_v2(dKern, ptr(k1d), kBytes) !== 0) {
    throw new Error("bun:gpu cuda: cuMemcpyHtoD(kern) failed");
  }

  const pIn = new BigUint64Array([dIn]);
  const pOut = new BigUint64Array([dOut]);
  const pW = new Uint32Array([w]);
  const pH = new Uint32Array([h]);
  const pK = new BigUint64Array([dKern]);
  const pR = new Int32Array([radius]);
  const paramPtrs = new BigUint64Array([
    BigInt(ptr(pIn)),
    BigInt(ptr(pOut)),
    BigInt(ptr(pW)),
    BigInt(ptr(pH)),
    BigInt(ptr(pK)),
    BigInt(ptr(pR)),
  ]);

  // 16×16 blocks; cover ceil(w/16) × ceil(h/16).
  const gridX = Math.floor((w + 15) / 16);
  const gridY = Math.floor((h + 15) / 16);
  // Tiled kernel for radius ≤ 16 — block-cooperative shared-mem load
  // amortizes the kSize²-redundant reads of the global-memory version.
  // For radius > 16 the (16+2r)² × 4 bytes shared-mem tile would be too
  // large, so fall back to the global-mem kernel.
  const useTiled = radius <= 16;
  const fn = useTiled ? devOpsFns!.gaussianBlurRGBAu8Tiled : devOpsFns!.gaussianBlurRGBAu8;
  const sharedBytes = useTiled ? (16 + 2 * radius) * (16 + 2 * radius) * 4 : 0;
  const r = s.cuLaunchKernel(fn, gridX, gridY, 1, 16, 16, 1, sharedBytes, 0n, ptr(paramPtrs), null);
  if (r !== 0) throw new Error(`bun:gpu cuda: cuLaunchKernel(gaussianBlurRGBAu8) failed (${r})`);
  if (s.cuCtxSynchronize() !== 0) throw new Error("bun:gpu cuda: cuCtxSynchronize failed");

  const out = new Uint8Array(input.length);
  if (s.cuMemcpyDtoH_v2(Number(pinnedOutPtr), dOut, inBytes) !== 0) {
    throw new Error("bun:gpu cuda: cuMemcpyDtoH(output) failed");
  }
  out.set(pinnedOutView);
  return out;
}

// ─── Kernel launch: reduce (sum / min / max) ──────────────────────────────
// REDUCE_GRID blocks × 256 threads each, two-stage. Block phase computes
// a per-block partial via tree reduction; host phase sums / mins / maxes
// the GRID partials. Identity values match the JS conventions (sum→0,
// min→+∞, max→-∞), so an empty input falls out correctly without a
// special case.
//
// Held-handle inputs reuse the device buffer. Float32Array inputs go
// through the standard cuMemAlloc / cuMemcpyHtoD round-trip — on Gen-3+
// PCIe the GPU wins handily; on slow PCIe (Gen-1 x8 idle desktops) the
// CPU reduce will beat this on a one-shot call. The held-handle path is
// the production case.
const REDUCE_BLOCK = 256;
const REDUCE_GRID = 1024;

function launchReduceF32(input: Float32Array | GpuHandle, op: "sum" | "min" | "max"): number {
  if (!probeDevOps()) {
    // No NVRTC — caller must fall back to CPU.
    throw new Error("bun:gpu cuda: NVRTC not available; reduce requires devOps module");
  }
  const s = cudaLib!.symbols;
  const ptr = ffiPtr!;
  const aView = isGpuHandle(input) ? (input.view as Float32Array) : input;
  const n = aView.length;

  if (n === 0) {
    return op === "sum" ? 0 : op === "min" ? Infinity : -Infinity;
  }

  const aBytes = BigInt(n * 4);
  const partialsBytes = BigInt(REDUCE_GRID * 4);

  let dA: bigint;
  let aOwned: boolean;
  if (isGpuHandle(input)) {
    if (input.released) throw new Error("bun:gpu: reduce called on released handle");
    if (input.buffer === 0n) throw new Error("bun:gpu cuda: handle has no device buffer (f64?)");
    dA = input.buffer;
    aOwned = false;
  } else {
    const dABuf = new BigUint64Array(1);
    if (s.cuMemAlloc_v2(ptr(dABuf), aBytes) !== 0) {
      throw new Error("bun:gpu cuda: cuMemAlloc(input) failed");
    }
    dA = dABuf[0];
    aOwned = true;
    if (s.cuMemcpyHtoD_v2(dA, ptr(aView), aBytes) !== 0) {
      s.cuMemFree_v2(dA);
      throw new Error("bun:gpu cuda: cuMemcpyHtoD(input) failed");
    }
  }

  const dPartialsBuf = new BigUint64Array(1);
  if (s.cuMemAlloc_v2(ptr(dPartialsBuf), partialsBytes) !== 0) {
    if (aOwned) s.cuMemFree_v2(dA);
    throw new Error("bun:gpu cuda: cuMemAlloc(partials) failed");
  }
  const dPartials = dPartialsBuf[0];

  const fn = op === "sum" ? devOpsFns!.reduceSum : op === "min" ? devOpsFns!.reduceMin : devOpsFns!.reduceMax;

  const pIn = new BigUint64Array([dA]);
  const pOut = new BigUint64Array([dPartials]);
  const pN = new Uint32Array([n]);
  const paramPtrs = new BigUint64Array([BigInt(ptr(pIn)), BigInt(ptr(pOut)), BigInt(ptr(pN))]);

  const r = s.cuLaunchKernel(fn, REDUCE_GRID, 1, 1, REDUCE_BLOCK, 1, 1, 0, 0n, ptr(paramPtrs), null);
  if (r !== 0) {
    s.cuMemFree_v2(dPartials);
    if (aOwned) s.cuMemFree_v2(dA);
    throw new Error(`bun:gpu cuda: cuLaunchKernel(reduce_${op}) failed (${r})`);
  }
  if (s.cuCtxSynchronize() !== 0) {
    s.cuMemFree_v2(dPartials);
    if (aOwned) s.cuMemFree_v2(dA);
    throw new Error("bun:gpu cuda: cuCtxSynchronize failed");
  }

  // Pull partials back, run final reduction on host. REDUCE_GRID = 1024
  // floats is 4 KB — DtoH is essentially free vs the kernel time.
  const partials = new Float32Array(REDUCE_GRID);
  if (s.cuMemcpyDtoH_v2(ptr(partials), dPartials, partialsBytes) !== 0) {
    s.cuMemFree_v2(dPartials);
    if (aOwned) s.cuMemFree_v2(dA);
    throw new Error("bun:gpu cuda: cuMemcpyDtoH(partials) failed");
  }

  s.cuMemFree_v2(dPartials);
  if (aOwned) s.cuMemFree_v2(dA);

  // Final host reduction. Use the same NaN-propagating semantics as the
  // device kernel + the public CPU reference.
  if (op === "sum") {
    let sum = 0;
    let c = 0;
    for (let i = 0; i < REDUCE_GRID; i++) {
      const y = partials[i] - c;
      const t = sum + y;
      c = t - sum - y;
      sum = t;
    }
    return sum;
  }
  if (op === "min") {
    let m = Infinity;
    for (let i = 0; i < REDUCE_GRID; i++) {
      const v = partials[i];
      if (Number.isNaN(v)) return NaN;
      if (v < m) m = v;
    }
    return m;
  }
  // max
  let m = -Infinity;
  for (let i = 0; i < REDUCE_GRID; i++) {
    const v = partials[i];
    if (Number.isNaN(v)) return NaN;
    if (v > m) m = v;
  }
  return m;
}

// ─── Kernel launch: histogram ─────────────────────────────────────────────
// Privatized histogram. Each block keeps its own bins[] in dynamic shared
// memory (size = bins * 4 bytes), atomicAdds within the block, then merges
// to global with one atomicAdd per non-zero bin per block.
//
// Shared-memory cap on most GPUs is 48 KB → up to 12K bins. Above that we
// throw and let the public wrapper fall back to CPU. Image-style histograms
// (256 bins) and latency buckets (~30 bins) are all comfortably small.

const HIST_BLOCK = 256;
const HIST_GRID = 512;

function launchHistogramF32(
  input: Float32Array | GpuHandle,
  bins: number,
  min: number,
  max: number,
): Uint32Array | null {
  if (!probeDevOps()) return null;
  if (bins <= 0 || bins > 12288) return null;
  const s = cudaLib!.symbols;
  const ptr = ffiPtr!;
  const aView = isGpuHandle(input) ? (input.view as Float32Array) : input;
  const n = aView.length;
  const out = new Uint32Array(bins);
  if (n === 0) return out;

  const aBytes = BigInt(n * 4);
  const outBytes = BigInt(bins * 4);

  let dA: bigint;
  let aOwned: boolean;
  if (isGpuHandle(input)) {
    if (input.released) throw new Error("bun:gpu: histogram called on released handle");
    if (input.buffer === 0n) throw new Error("bun:gpu cuda: handle has no device buffer (f64?)");
    dA = input.buffer;
    aOwned = false;
  } else {
    const dABuf = new BigUint64Array(1);
    if (s.cuMemAlloc_v2(ptr(dABuf), aBytes) !== 0) {
      throw new Error("bun:gpu cuda: cuMemAlloc(input) failed");
    }
    dA = dABuf[0];
    aOwned = true;
    if (s.cuMemcpyHtoD_v2(dA, ptr(aView), aBytes) !== 0) {
      s.cuMemFree_v2(dA);
      throw new Error("bun:gpu cuda: cuMemcpyHtoD(input) failed");
    }
  }

  const dOutBuf = new BigUint64Array(1);
  if (s.cuMemAlloc_v2(ptr(dOutBuf), outBytes) !== 0) {
    if (aOwned) s.cuMemFree_v2(dA);
    throw new Error("bun:gpu cuda: cuMemAlloc(out) failed");
  }
  const dOut = dOutBuf[0];
  // Zero the output bins (MEM_SET_D32 would be cleaner but requires more
  // FFI surface; a small HtoD of zeroes is fine).
  const zero = new Uint32Array(bins);
  if (s.cuMemcpyHtoD_v2(dOut, ptr(zero), outBytes) !== 0) {
    s.cuMemFree_v2(dOut);
    if (aOwned) s.cuMemFree_v2(dA);
    throw new Error("bun:gpu cuda: cuMemcpyHtoD(zero) failed");
  }

  const pIn = new BigUint64Array([dA]);
  const pOut = new BigUint64Array([dOut]);
  const pN = new Uint32Array([n]);
  const pBins = new Uint32Array([bins]);
  const pMin = new Float32Array([min]);
  const pMax = new Float32Array([max]);
  const paramPtrs = new BigUint64Array([
    BigInt(ptr(pIn)),
    BigInt(ptr(pOut)),
    BigInt(ptr(pN)),
    BigInt(ptr(pBins)),
    BigInt(ptr(pMin)),
    BigInt(ptr(pMax)),
  ]);

  const r = s.cuLaunchKernel(
    devOpsFns!.histogram,
    HIST_GRID,
    1,
    1,
    HIST_BLOCK,
    1,
    1,
    Number(outBytes),
    0n, // dynamic shared mem = bins * 4
    ptr(paramPtrs),
    null,
  );
  if (r !== 0) {
    s.cuMemFree_v2(dOut);
    if (aOwned) s.cuMemFree_v2(dA);
    throw new Error(`bun:gpu cuda: cuLaunchKernel(histogram) failed (${r})`);
  }
  if (s.cuCtxSynchronize() !== 0) {
    s.cuMemFree_v2(dOut);
    if (aOwned) s.cuMemFree_v2(dA);
    throw new Error("bun:gpu cuda: cuCtxSynchronize failed");
  }

  if (s.cuMemcpyDtoH_v2(ptr(out), dOut, outBytes) !== 0) {
    s.cuMemFree_v2(dOut);
    if (aOwned) s.cuMemFree_v2(dA);
    throw new Error("bun:gpu cuda: cuMemcpyDtoH(out) failed");
  }
  s.cuMemFree_v2(dOut);
  if (aOwned) s.cuMemFree_v2(dA);
  return out;
}

// ─── Kernel launch: scan (inclusive prefix sum) ───────────────────────────
// Three-stage launch driven by the kernels above.
//   Stage 1: per-block scan + emit blockSums[i] = block i's total.
//   Stage 2: single-block scan over blockSums (rounded up to power-of-2).
//   Stage 3: each block i ≥ 1 adds blockSums[i-1] to its own output.
//
// Bounded at SCAN_BLOCK² = 65,536 elements per call. Above that, returns
// null so the public wrapper falls back to CPU. Recursive multi-stage
// scan (which would lift the limit) is a follow-up.
const SCAN_BLOCK = 256;
const SCAN_MAX_ELEMS = SCAN_BLOCK * SCAN_BLOCK;

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

function launchScanF32(input: Float32Array | GpuHandle): Float32Array | null {
  if (!probeDevOps()) return null;
  const aView = isGpuHandle(input) ? (input.view as Float32Array) : input;
  const n = aView.length;
  if (n === 0) return new Float32Array(0);
  if (n > SCAN_MAX_ELEMS) return null; // caller falls back to CPU

  const s = cudaLib!.symbols;
  const ptr = ffiPtr!;
  const aBytes = BigInt(n * 4);
  const numBlocks = Math.ceil(n / SCAN_BLOCK);
  const blockSumsLen = nextPow2(numBlocks);
  const blockSumsBytes = BigInt(blockSumsLen * 4);

  // Allocate input + output + blockSums on device.
  let dA: bigint;
  let aOwned: boolean;
  if (isGpuHandle(input)) {
    if (input.released) throw new Error("bun:gpu: scan called on released handle");
    if (input.buffer === 0n) throw new Error("bun:gpu cuda: handle has no device buffer (f64?)");
    dA = input.buffer;
    aOwned = false;
  } else {
    const dABuf = new BigUint64Array(1);
    if (s.cuMemAlloc_v2(ptr(dABuf), aBytes) !== 0) {
      throw new Error("bun:gpu cuda: cuMemAlloc(input) failed");
    }
    dA = dABuf[0];
    aOwned = true;
    if (s.cuMemcpyHtoD_v2(dA, ptr(aView), aBytes) !== 0) {
      s.cuMemFree_v2(dA);
      throw new Error("bun:gpu cuda: cuMemcpyHtoD(input) failed");
    }
  }

  const dOutBuf = new BigUint64Array(1);
  if (s.cuMemAlloc_v2(ptr(dOutBuf), aBytes) !== 0) {
    if (aOwned) s.cuMemFree_v2(dA);
    throw new Error("bun:gpu cuda: cuMemAlloc(out) failed");
  }
  const dOut = dOutBuf[0];

  const dSumsBuf = new BigUint64Array(1);
  if (s.cuMemAlloc_v2(ptr(dSumsBuf), blockSumsBytes) !== 0) {
    s.cuMemFree_v2(dOut);
    if (aOwned) s.cuMemFree_v2(dA);
    throw new Error("bun:gpu cuda: cuMemAlloc(blockSums) failed");
  }
  const dSums = dSumsBuf[0];
  // Zero the padding tail of blockSums (rounded-up area beyond numBlocks)
  // so the second-stage scan picks up zeros there. Simple: zero the
  // whole buffer up front.
  const zero = new Float32Array(blockSumsLen);
  if (s.cuMemcpyHtoD_v2(dSums, ptr(zero), blockSumsBytes) !== 0) {
    s.cuMemFree_v2(dSums);
    s.cuMemFree_v2(dOut);
    if (aOwned) s.cuMemFree_v2(dA);
    throw new Error("bun:gpu cuda: cuMemcpyHtoD(blockSums zero) failed");
  }

  const cleanup = () => {
    s.cuMemFree_v2(dSums);
    s.cuMemFree_v2(dOut);
    if (aOwned) s.cuMemFree_v2(dA);
  };

  // ── Stage 1 — per-block scan + emit blockSums.
  {
    const pIn = new BigUint64Array([dA]);
    const pOut = new BigUint64Array([dOut]);
    const pSums = new BigUint64Array([dSums]);
    const pN = new Uint32Array([n]);
    const params = new BigUint64Array([BigInt(ptr(pIn)), BigInt(ptr(pOut)), BigInt(ptr(pSums)), BigInt(ptr(pN))]);
    const r = s.cuLaunchKernel(
      devOpsFns!.scanBlockInclusive,
      numBlocks,
      1,
      1,
      SCAN_BLOCK,
      1,
      1,
      0,
      0n,
      ptr(params),
      null,
    );
    if (r !== 0) {
      cleanup();
      throw new Error(`bun:gpu cuda: cuLaunchKernel(scan_block_inclusive) failed (${r})`);
    }
  }

  // ── Stage 2 — scan blockSums in a single block.
  {
    const pSums = new BigUint64Array([dSums]);
    const pNB = new Uint32Array([numBlocks]);
    const params = new BigUint64Array([BigInt(ptr(pSums)), BigInt(ptr(pNB))]);
    const r = s.cuLaunchKernel(
      devOpsFns!.scanBlocksumsInclusive,
      1,
      1,
      1,
      blockSumsLen,
      1,
      1,
      0,
      0n,
      ptr(params),
      null,
    );
    if (r !== 0) {
      cleanup();
      throw new Error(`bun:gpu cuda: cuLaunchKernel(scan_blocksums_inclusive) failed (${r})`);
    }
  }

  // ── Stage 3 — add prior-block offsets back. Skipped if there's only one
  // block (no offsets to add).
  if (numBlocks > 1) {
    const pOut = new BigUint64Array([dOut]);
    const pSums = new BigUint64Array([dSums]);
    const pN = new Uint32Array([n]);
    const params = new BigUint64Array([BigInt(ptr(pOut)), BigInt(ptr(pSums)), BigInt(ptr(pN))]);
    const r = s.cuLaunchKernel(devOpsFns!.scanAddOffsets, numBlocks, 1, 1, SCAN_BLOCK, 1, 1, 0, 0n, ptr(params), null);
    if (r !== 0) {
      cleanup();
      throw new Error(`bun:gpu cuda: cuLaunchKernel(scan_add_offsets) failed (${r})`);
    }
  }

  if (s.cuCtxSynchronize() !== 0) {
    cleanup();
    throw new Error("bun:gpu cuda: cuCtxSynchronize failed");
  }

  const out = new Float32Array(n);
  if (s.cuMemcpyDtoH_v2(ptr(out), dOut, aBytes) !== 0) {
    cleanup();
    throw new Error("bun:gpu cuda: cuMemcpyDtoH(out) failed");
  }
  cleanup();
  return out;
}

// ─── Kernel launch: argmin / argmax ───────────────────────────────────────
// Same shape as launchReduceF32 — REDUCE_GRID blocks × 256 threads each
// emit per-block (value, index) partials, then the host scans the partials
// for the global winner. Returns the index. Empty input throws (matches
// gpu.ts argMin / argMax conventions); all-NaN input returns NaN.
const ARGMIN_BLOCK = 256;
const ARGMIN_GRID = 1024;

function launchArgF32(input: Float32Array | GpuHandle, mode: "min" | "max"): number {
  if (!probeDevOps()) {
    // CPU fallback that mirrors gpu.ts's cpuArgMinF32 / cpuArgMaxF32
    // exactly: NaN is silently skipped via the false `<` / `>` comparison
    // (no early return). All-NaN input returns 0 (the initial seed). This
    // keeps the no-NVRTC and with-NVRTC paths byte-for-byte equivalent.
    const view = isGpuHandle(input) ? (input.view as Float32Array) : input;
    if (view.length === 0) {
      throw new RangeError(`bun:gpu cuda: arg${mode} on empty input`);
    }
    let bestI = 0;
    let bestV = view[0];
    for (let i = 1; i < view.length; i++) {
      const v = view[i];
      if (mode === "min" ? v < bestV : v > bestV) {
        bestV = v;
        bestI = i;
      }
    }
    return bestI;
  }

  const s = cudaLib!.symbols;
  const ptr = ffiPtr!;
  const aView = isGpuHandle(input) ? (input.view as Float32Array) : input;
  const n = aView.length;
  if (n === 0) throw new RangeError(`bun:gpu cuda: arg${mode} on empty input`);

  const aBytes = BigInt(n * 4);
  const partialVBytes = BigInt(ARGMIN_GRID * 4);
  const partialIBytes = BigInt(ARGMIN_GRID * 4);

  let dA: bigint;
  let aOwned: boolean;
  if (isGpuHandle(input)) {
    if (input.released) throw new Error(`bun:gpu: arg${mode} called on released handle`);
    if (input.buffer === 0n) throw new Error("bun:gpu cuda: handle has no device buffer (f64?)");
    dA = input.buffer;
    aOwned = false;
  } else {
    const dABuf = new BigUint64Array(1);
    if (s.cuMemAlloc_v2(ptr(dABuf), aBytes) !== 0) {
      throw new Error("bun:gpu cuda: cuMemAlloc(input) failed");
    }
    dA = dABuf[0];
    aOwned = true;
    if (s.cuMemcpyHtoD_v2(dA, ptr(aView), aBytes) !== 0) {
      s.cuMemFree_v2(dA);
      throw new Error("bun:gpu cuda: cuMemcpyHtoD(input) failed");
    }
  }

  const dPVBuf = new BigUint64Array(1);
  if (s.cuMemAlloc_v2(ptr(dPVBuf), partialVBytes) !== 0) {
    if (aOwned) s.cuMemFree_v2(dA);
    throw new Error("bun:gpu cuda: cuMemAlloc(partial_v) failed");
  }
  const dPIBuf = new BigUint64Array(1);
  if (s.cuMemAlloc_v2(ptr(dPIBuf), partialIBytes) !== 0) {
    s.cuMemFree_v2(dPVBuf[0]);
    if (aOwned) s.cuMemFree_v2(dA);
    throw new Error("bun:gpu cuda: cuMemAlloc(partial_i) failed");
  }
  const dPV = dPVBuf[0];
  const dPI = dPIBuf[0];

  const cleanup = () => {
    s.cuMemFree_v2(dPV);
    s.cuMemFree_v2(dPI);
    if (aOwned) s.cuMemFree_v2(dA);
  };

  const fn = mode === "min" ? devOpsFns!.argminGrid : devOpsFns!.argmaxGrid;
  const pIn = new BigUint64Array([dA]);
  const pPV = new BigUint64Array([dPV]);
  const pPI = new BigUint64Array([dPI]);
  const pN = new Uint32Array([n]);
  const params = new BigUint64Array([BigInt(ptr(pIn)), BigInt(ptr(pPV)), BigInt(ptr(pPI)), BigInt(ptr(pN))]);

  const r = s.cuLaunchKernel(fn, ARGMIN_GRID, 1, 1, ARGMIN_BLOCK, 1, 1, 0, 0n, ptr(params), null);
  if (r !== 0) {
    cleanup();
    throw new Error(`bun:gpu cuda: cuLaunchKernel(arg${mode}_f32) failed (${r})`);
  }
  if (s.cuCtxSynchronize() !== 0) {
    cleanup();
    throw new Error("bun:gpu cuda: cuCtxSynchronize failed");
  }

  // Pull both partial buffers back, find the global winner host-side.
  const partialV = new Float32Array(ARGMIN_GRID);
  const partialI = new Uint32Array(ARGMIN_GRID);
  if (s.cuMemcpyDtoH_v2(ptr(partialV), dPV, partialVBytes) !== 0) {
    cleanup();
    throw new Error("bun:gpu cuda: cuMemcpyDtoH(partial_v) failed");
  }
  if (s.cuMemcpyDtoH_v2(ptr(partialI), dPI, partialIBytes) !== 0) {
    cleanup();
    throw new Error("bun:gpu cuda: cuMemcpyDtoH(partial_i) failed");
  }
  cleanup();

  // Host-side merge. SENTINEL = 0xffffffff for blocks that saw only NaN.
  // The kernel already NaN-skipped, so partials we look at have valid
  // (value, index) pairs. All-NaN input → no partial is valid → return 0
  // to match gpu.ts's cpuArgMinF32 / cpuArgMaxF32 convention (which also
  // returns 0 because nothing beats the initial NaN seed).
  let bestI = -1;
  let bestV = mode === "min" ? Infinity : -Infinity;
  for (let p = 0; p < ARGMIN_GRID; p++) {
    const i = partialI[p];
    if (i === 0xffffffff) continue;
    const v = partialV[p];
    if (bestI < 0) {
      bestI = i;
      bestV = v;
      continue;
    }
    if (mode === "min") {
      if (v < bestV || (v === bestV && i < bestI)) {
        bestI = i;
        bestV = v;
      }
    } else {
      if (v > bestV || (v === bestV && i < bestI)) {
        bestI = i;
        bestV = v;
      }
    }
  }
  return bestI < 0 ? 0 : bestI;
}

// ─── Kernel launch: variance ──────────────────────────────────────────────
// Two-pass: first reduce_sum_f32 → host divides by n for the mean, then
// variance_sumsq_f32 with that mean → host divides by (n - ddof). Reuses
// the existing reduce machinery for pass 1; allocates one dedicated
// partials buffer for pass 2. Held-handle inputs skip both HtoD passes.
//
// Returns NaN on empty input or `ddof >= n`. CPU fallback (no NVRTC)
// mirrors gpu.ts's cpuVarianceF32 — Kahan-compensated mean + Σ deviation²
// in JS.
function launchVarianceF32(input: Float32Array | GpuHandle, ddof: number): number {
  const view = isGpuHandle(input) ? (input.view as Float32Array) : input;
  const n = view.length;
  if (n === 0 || ddof >= n) return NaN;

  if (!probeDevOps()) {
    // CPU fallback that matches gpu.ts's cpuVarianceF32 semantics.
    let sum = 0;
    let c = 0;
    for (let i = 0; i < n; i++) {
      const y = view[i] - c;
      const t = sum + y;
      c = t - sum - y;
      sum = t;
    }
    const mean = sum / n;
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      const d = view[i] - mean;
      sumSq += d * d;
    }
    return sumSq / (n - ddof);
  }

  const s = cudaLib!.symbols;
  const ptr = ffiPtr!;
  const aBytes = BigInt(n * 4);
  const partialsBytes = BigInt(REDUCE_GRID * 4);

  // Stage input on device (or reuse the held buffer).
  let dA: bigint;
  let aOwned: boolean;
  if (isGpuHandle(input)) {
    if (input.released) throw new Error("bun:gpu: variance called on released handle");
    if (input.buffer === 0n) throw new Error("bun:gpu cuda: handle has no device buffer (f64?)");
    dA = input.buffer;
    aOwned = false;
  } else {
    const dABuf = new BigUint64Array(1);
    if (s.cuMemAlloc_v2(ptr(dABuf), aBytes) !== 0) {
      throw new Error("bun:gpu cuda: cuMemAlloc(input) failed");
    }
    dA = dABuf[0];
    aOwned = true;
    if (s.cuMemcpyHtoD_v2(dA, ptr(view), aBytes) !== 0) {
      s.cuMemFree_v2(dA);
      throw new Error("bun:gpu cuda: cuMemcpyHtoD(input) failed");
    }
  }

  const dPartialsBuf = new BigUint64Array(1);
  if (s.cuMemAlloc_v2(ptr(dPartialsBuf), partialsBytes) !== 0) {
    if (aOwned) s.cuMemFree_v2(dA);
    throw new Error("bun:gpu cuda: cuMemAlloc(partials) failed");
  }
  const dPartials = dPartialsBuf[0];

  const cleanup = () => {
    s.cuMemFree_v2(dPartials);
    if (aOwned) s.cuMemFree_v2(dA);
  };

  // ── Pass 1: reduce_sum_f32 → partials → host sum → mean.
  {
    const pIn = new BigUint64Array([dA]);
    const pOut = new BigUint64Array([dPartials]);
    const pN = new Uint32Array([n]);
    const params = new BigUint64Array([BigInt(ptr(pIn)), BigInt(ptr(pOut)), BigInt(ptr(pN))]);
    const r = s.cuLaunchKernel(devOpsFns!.reduceSum, REDUCE_GRID, 1, 1, REDUCE_BLOCK, 1, 1, 0, 0n, ptr(params), null);
    if (r !== 0) {
      cleanup();
      throw new Error(`bun:gpu cuda: cuLaunchKernel(reduce_sum for variance) failed (${r})`);
    }
  }

  if (s.cuCtxSynchronize() !== 0) {
    cleanup();
    throw new Error("bun:gpu cuda: cuCtxSynchronize after pass 1 failed");
  }

  const partials = new Float32Array(REDUCE_GRID);
  if (s.cuMemcpyDtoH_v2(ptr(partials), dPartials, partialsBytes) !== 0) {
    cleanup();
    throw new Error("bun:gpu cuda: cuMemcpyDtoH(partials pass 1) failed");
  }
  let totalSum = 0;
  let c = 0;
  for (let i = 0; i < REDUCE_GRID; i++) {
    const y = partials[i] - c;
    const t = totalSum + y;
    c = t - totalSum - y;
    totalSum = t;
  }
  const mean = totalSum / n;

  // ── Pass 2: variance_sumsq_f32 with the precomputed mean.
  {
    const pIn = new BigUint64Array([dA]);
    const pOut = new BigUint64Array([dPartials]);
    const pN = new Uint32Array([n]);
    const pMean = new Float32Array([mean]);
    const params = new BigUint64Array([BigInt(ptr(pIn)), BigInt(ptr(pOut)), BigInt(ptr(pN)), BigInt(ptr(pMean))]);
    const r = s.cuLaunchKernel(
      devOpsFns!.varianceSumsq,
      REDUCE_GRID,
      1,
      1,
      REDUCE_BLOCK,
      1,
      1,
      0,
      0n,
      ptr(params),
      null,
    );
    if (r !== 0) {
      cleanup();
      throw new Error(`bun:gpu cuda: cuLaunchKernel(variance_sumsq) failed (${r})`);
    }
  }

  if (s.cuCtxSynchronize() !== 0) {
    cleanup();
    throw new Error("bun:gpu cuda: cuCtxSynchronize after pass 2 failed");
  }

  const partials2 = new Float32Array(REDUCE_GRID);
  if (s.cuMemcpyDtoH_v2(ptr(partials2), dPartials, partialsBytes) !== 0) {
    cleanup();
    throw new Error("bun:gpu cuda: cuMemcpyDtoH(partials pass 2) failed");
  }
  cleanup();

  let sumSq = 0;
  let c2 = 0;
  for (let i = 0; i < REDUCE_GRID; i++) {
    const y = partials2[i] - c2;
    const t = sumSq + y;
    c2 = t - sumSq - y;
    sumSq = t;
  }
  return sumSq / (n - ddof);
}

// ─── Kernel launch: dotF32 ────────────────────────────────────────────────
//
// a·b → scalar. Grid of DOT_GRID blocks × 32 threads. Each thread stride-loops
// the vector with an fma.rn.f32 accumulator; within each warp (= block) a
// shfl.sync.bfly butterfly reduces to a single partial; thread 0 of each
// block stores that partial to a device array of DOT_GRID f32 values. Host
// then sums the partials. Either input may arrive held (Tier 4); a held
// input skips its HtoD.

const DOT_GRID = 1024;

function launchDotF32(a: Float32Array | GpuHandle, b: Float32Array | GpuHandle): number {
  const s = cudaLib!.symbols;
  const ptr = ffiPtr!;
  const aView = isGpuHandle(a) ? (a.view as Float32Array) : a;
  const n = aView.length;
  const aBytes = BigInt(n * 4);
  const bBytes = BigInt(n * 4);
  const partialsBytes = BigInt(DOT_GRID * 4);

  let dA: bigint;
  let aOwned: boolean;
  if (isGpuHandle(a)) {
    if (a.released) throw new Error("bun:gpu: dot called on released handle");
    if (a.buffer === 0n) throw new Error("bun:gpu cuda: handle has no device buffer (f64?)");
    dA = a.buffer;
    aOwned = false;
  } else {
    const dABuf = new BigUint64Array(1);
    if (s.cuMemAlloc_v2(ptr(dABuf), aBytes) !== 0) throw new Error("bun:gpu cuda: cuMemAlloc(A) failed");
    dA = dABuf[0];
    aOwned = true;
  }

  let dB: bigint;
  let bOwned: boolean;
  if (isGpuHandle(b)) {
    if (b.released) throw new Error("bun:gpu: dot called on released handle");
    if (b.buffer === 0n) throw new Error("bun:gpu cuda: handle has no device buffer (f64?)");
    dB = b.buffer;
    bOwned = false;
  } else {
    const dBBuf = new BigUint64Array(1);
    if (s.cuMemAlloc_v2(ptr(dBBuf), bBytes) !== 0) {
      if (aOwned) s.cuMemFree_v2(dA);
      throw new Error("bun:gpu cuda: cuMemAlloc(B) failed");
    }
    dB = dBBuf[0];
    bOwned = true;
  }

  let dPart: bigint = 0n;
  try {
    const dPartBuf = new BigUint64Array(1);
    if (s.cuMemAlloc_v2(ptr(dPartBuf), partialsBytes) !== 0)
      throw new Error("bun:gpu cuda: cuMemAlloc(partials) failed");
    dPart = dPartBuf[0];

    if (aOwned) {
      if (s.cuMemcpyHtoD_v2(dA, ptr(a as Float32Array), aBytes) !== 0) {
        throw new Error("bun:gpu cuda: cuMemcpyHtoD(A) failed");
      }
    }
    if (bOwned) {
      if (s.cuMemcpyHtoD_v2(dB, ptr(b as Float32Array), bBytes) !== 0) {
        throw new Error("bun:gpu cuda: cuMemcpyHtoD(B) failed");
      }
    }

    const pABuf = new BigUint64Array([dA]);
    const pBBuf = new BigUint64Array([dB]);
    const pPartBuf = new BigUint64Array([dPart]);
    const pN = new Uint32Array([n]);
    const paramPtrs = new BigUint64Array([
      BigInt(ptr(pABuf)),
      BigInt(ptr(pBBuf)),
      BigInt(ptr(pPartBuf)),
      BigInt(ptr(pN)),
    ]);

    const r = s.cuLaunchKernel(fnDotF32!, DOT_GRID, 1, 1, 32, 1, 1, 0, 0n, ptr(paramPtrs), null);
    if (r !== 0) throw new Error(`bun:gpu cuda: cuLaunchKernel(dot) failed (${r})`);
    if (s.cuCtxSynchronize() !== 0) throw new Error("bun:gpu cuda: cuCtxSynchronize failed");

    const partials = new Float32Array(DOT_GRID);
    if (s.cuMemcpyDtoH_v2(ptr(partials), dPart, partialsBytes) !== 0) {
      throw new Error("bun:gpu cuda: cuMemcpyDtoH(partials) failed");
    }
    // Final host reduction. DOT_GRID = 1024 f32 values; the summation order
    // deviates from SIMD's, so results match SIMD only within f32-FMA tolerance.
    let sum = 0;
    for (let i = 0; i < DOT_GRID; i++) sum += partials[i];
    return sum;
  } finally {
    if (aOwned && dA !== 0n) s.cuMemFree_v2(dA);
    if (bOwned && dB !== 0n) s.cuMemFree_v2(dB);
    if (dPart !== 0n) s.cuMemFree_v2(dPart);
  }
}

// ─── Size threshold ───────────────────────────────────────────────────────
//
// GPU dispatch has a fixed round-trip cost (~2 cuMemAlloc + HtoD + DtoH +
// one sync ≈ a few hundred µs on a warm context). Below this, staying on
// CPU/WASM is faster. The default is tuned empirically on an RTX 4070 Ti;
// `calibrate()` overwrites it with a per-host measured crossover and
// persists the result under `~/.cache/parabun/` (see calibrate() below).
// On subsequent module loads we rehydrate the cached value during probe()
// so every host converges on its own best threshold without re-measuring.

const DEFAULT_MIN_SIMDMAP_ELEMS = 1 << 18; // 256k f32 = 1 MB — fallback
let MIN_SIMDMAP_ELEMS = DEFAULT_MIN_SIMDMAP_ELEMS;

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

// matmul dispatch threshold: at M*N*K below this, the PTX naive kernel
// doesn't win against bun:simd's tiled JS loop because per-call HtoD+sync
// dominates. Held inputs bypass this (their HtoD already happened).
// `wins` stays at Infinity for now — the held path is the winner; cold
// dispatch is parked. Revisit once we have a 4070 Ti matmul benchmark.
const MIN_MATMUL_DISPATCH_FLOPS = 1 << 24; // 16M multiply-adds (e.g. 256^3)
const MIN_MATMUL_WINS_FLOPS = Number.POSITIVE_INFINITY;

// dot: cold GPU loses 9–18× to bun:simd at every size we measured on an RTX
// 4070 Ti — the per-call HtoD (pageable memory copy at ~760 MB/s) dominates
// the warp-reduce kernel no matter how big the vector is. Residency is the
// only path that wins, so dispatch and wins thresholds are both parked at
// Infinity; callers opt into GPU dot by holding their vectors via gpu.hold.
// See bench/parabun-gpu-dot for the numbers.
const MIN_DOT_DISPATCH_ELEMS = Number.POSITIVE_INFINITY;
const MIN_DOT_WINS_ELEMS = Number.POSITIVE_INFINITY;

function winsForSize(op: string, n: number, elemBytes: number): boolean {
  if (!probed && !probe()) return false;
  if (!probeResult) return false;
  if (op === "simdMap") return elemBytes === 4 && n >= MIN_SIMDMAP_ELEMS;
  if (op === "matVec") return elemBytes === 4 && n >= MIN_MATVEC_WINS_ELEMS;
  if (op === "matmul") return elemBytes === 4 && n >= MIN_MATMUL_WINS_FLOPS;
  if (op === "dot") return elemBytes === 4 && n >= MIN_DOT_WINS_ELEMS;
  return false;
}

// ─── Per-host calibration ─────────────────────────────────────────────────
//
// `simdMap` is the only op today where the CPU→GPU crossover genuinely
// varies by hardware; matVec / matmul / dot all lose to bun:simd at every
// measured size on the non-resident path, so their thresholds are parked
// at Infinity. `calibrate()` sweeps a handful of sizes with the real PTX
// kernel vs bun:simd, finds the smallest N where GPU wins by ≥10% (margin
// absorbs host noise), and persists the result to
// `~/.cache/parabun/gpu-calibrate-<hash>.json`. The hash keys on
// deviceName + backend + platform + arch so a laptop dock switch (or a
// per-user GPU swap) invalidates cleanly.
//
// No auto-calibration on first use: waking up a fresh process with a
// 200–500 ms sweep inside someone's request path is a worse UX than the
// static default. Callers opt in with `gpu.calibrate()` (typically at
// boot) and we cache the result forever afterward.

const CALIBRATION_VERSION = 1;
const CALIBRATION_SIZES = [1 << 14, 1 << 16, 1 << 17, 1 << 18, 1 << 19, 1 << 20, 1 << 22];
const CALIBRATION_ITERS = 5;
const CALIBRATION_WIN_MARGIN = 1.1; // GPU must beat CPU by ≥10%

type CalibrationFile = {
  version: number;
  backend: string;
  deviceName: string;
  platform: string;
  arch: string;
  timestamp: number;
  simdMap: number | "infinity"; // JSON.stringify drops Infinity → string sentinel
};

function cacheDir(): string {
  const os = require("node:os");
  const path = require("node:path");
  const base = process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), ".cache");
  return path.join(base, "parabun");
}

function cacheKeyHash(): string {
  const crypto = require("node:crypto");
  const key = `cuda|${deviceName}|${process.platform}|${process.arch}`;
  return crypto.createHash("sha1").update(key).digest("hex").slice(0, 12);
}

function cacheFilePath(): string {
  const path = require("node:path");
  return path.join(cacheDir(), `gpu-calibrate-${cacheKeyHash()}.json`);
}

function applyCachedCalibration(): void {
  if (process.env.BUN_PARABUN_SKIP_CALIBRATION === "1") return;
  let raw: string;
  try {
    const fs = require("node:fs");
    raw = fs.readFileSync(cacheFilePath(), "utf8");
  } catch {
    return; // no cache yet — keep the default
  }
  try {
    const obj = JSON.parse(raw) as CalibrationFile;
    if (obj.version !== CALIBRATION_VERSION) return;
    if (obj.backend !== "cuda" || obj.deviceName !== deviceName) return;
    if (obj.platform !== process.platform || obj.arch !== process.arch) return;
    if (obj.simdMap === "infinity") {
      MIN_SIMDMAP_ELEMS = Number.POSITIVE_INFINITY;
    } else if (typeof obj.simdMap === "number" && obj.simdMap > 0) {
      MIN_SIMDMAP_ELEMS = obj.simdMap;
    }
  } catch {
    // corrupted cache — ignore and keep the default
  }
}

function median(samples: number[]): number {
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

function sweepSimdMapCrossover(): number {
  // Warm up both paths once across all sizes so JIT + driver state are
  // hot before we sample. The largest size also forces the PCIe ring
  // into steady state.
  const fn = (x: number) => 2 * x + 1;
  const inputs: Array<{ n: number; a: Float32Array }> = [];
  for (const n of CALIBRATION_SIZES) {
    const a = new Float32Array(n);
    for (let i = 0; i < n; i++) a[i] = i * 0.001;
    inputs.push({ n, a });
  }
  for (const { a } of inputs) {
    launchAffineF32(a, 2, 1);
    simd.simdMap(fn, a);
  }

  for (const { n, a } of inputs) {
    const gpuSamples: number[] = [];
    const cpuSamples: number[] = [];
    for (let i = 0; i < CALIBRATION_ITERS; i++) {
      const g0 = Bun.nanoseconds();
      launchAffineF32(a, 2, 1);
      gpuSamples.push(Bun.nanoseconds() - g0);
      const c0 = Bun.nanoseconds();
      simd.simdMap(fn, a);
      cpuSamples.push(Bun.nanoseconds() - c0);
    }
    const gpuNs = median(gpuSamples);
    const cpuNs = median(cpuSamples);
    if (gpuNs * CALIBRATION_WIN_MARGIN < cpuNs) return n;
  }
  return Number.POSITIVE_INFINITY;
}

function calibrate(): { simdMap: number; cacheFile: string; deviceName: string } {
  if (!probed && !probe()) throw new Error("bun:gpu cuda: cannot calibrate — backend not available");
  if (!probeResult) throw new Error("bun:gpu cuda: cannot calibrate — probe failed");

  const crossover = sweepSimdMapCrossover();
  MIN_SIMDMAP_ELEMS = crossover;

  const record: CalibrationFile = {
    version: CALIBRATION_VERSION,
    backend: "cuda",
    deviceName,
    platform: process.platform,
    arch: process.arch,
    timestamp: Date.now(),
    simdMap: Number.isFinite(crossover) ? crossover : "infinity",
  };

  try {
    const fs = require("node:fs");
    fs.mkdirSync(cacheDir(), { recursive: true });
    fs.writeFileSync(cacheFilePath(), JSON.stringify(record, null, 2));
  } catch (err) {
    // Calibration is never required for correctness. Log but don't throw —
    // the in-memory MIN_SIMDMAP_ELEMS is still correct for this process.
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`bun:gpu cuda: failed to persist calibration (${msg}) — using in-memory value`);
  }

  return { simdMap: crossover, cacheFile: cacheFilePath(), deviceName };
}

// ─── Backend methods ──────────────────────────────────────────────────────

function dot(a: FArray | GpuHandle, b: FArray | GpuHandle): number {
  const aIsHandle = isGpuHandle(a);
  const bIsHandle = isGpuHandle(b);
  if (aIsHandle && a.released) throw new Error("bun:gpu: dot called on released handle");
  if (bIsHandle && b.released) throw new Error("bun:gpu: dot called on released handle");
  const av = aIsHandle ? a.view : (a as FArray);
  const bv = bIsHandle ? b.view : (b as FArray);
  // GPU dispatch when both sides are Float32Array and either (a) a residency
  // handle already staged its HtoD, or (b) the vector is big enough to
  // amortize the cold round-trip. Otherwise fall through to simd.
  const residentA = aIsHandle && a.type === "f32" && a.buffer !== 0n;
  const residentB = bIsHandle && b.type === "f32" && b.buffer !== 0n;
  const anyResident = residentA || residentB;
  if (
    av instanceof Float32Array &&
    bv instanceof Float32Array &&
    av.length === bv.length &&
    probe() &&
    (anyResident || av.length >= MIN_DOT_DISPATCH_ELEMS)
  ) {
    return launchDotF32(
      aIsHandle ? (a as GpuHandle) : (av as Float32Array),
      bIsHandle ? (b as GpuHandle) : (bv as Float32Array),
    );
  }
  return simd.dot(av, bv);
}

function matVec(matrix: FArray | GpuHandle, vector: FArray, nRows: number, nCols: number): FArray {
  const matIsHandle = isGpuHandle(matrix);
  if (matIsHandle && matrix.released) {
    throw new Error("bun:gpu: matVec called on released handle");
  }
  const matView = matIsHandle ? matrix.view : (matrix as FArray);
  // Held F32 handles keep their resident device pointer — dispatch even if
  // the size is below the dispatch threshold, since the HtoD copy that
  // gates "is GPU worthwhile" already happened at hold() time.
  const residentF32 = matIsHandle && matrix.type === "f32" && matrix.buffer !== 0n;
  if (
    matView instanceof Float32Array &&
    vector instanceof Float32Array &&
    probe() &&
    (residentF32 || nRows * nCols >= MIN_MATVEC_DISPATCH_ELEMS)
  ) {
    return launchMatVecF32(matIsHandle ? matrix : matView, vector, nRows, nCols);
  }
  return simd.matVec(matView as any, vector as any, nRows, nCols);
}

function matmul(a: FArray | GpuHandle, b: FArray | GpuHandle, m: number, k: number, n: number, out?: FArray): FArray {
  const aIsHandle = isGpuHandle(a);
  const bIsHandle = isGpuHandle(b);
  if (aIsHandle && a.released) throw new Error("bun:gpu: matmul called on released handle");
  if (bIsHandle && b.released) throw new Error("bun:gpu: matmul called on released handle");
  const av = aIsHandle ? a.view : (a as FArray);
  const bv = bIsHandle ? b.view : (b as FArray);
  if (av.constructor !== bv.constructor) {
    throw new TypeError(
      `a and b must both be Float32Array or both be Float64Array; got ${av.constructor.name} and ${bv.constructor.name}`,
    );
  }
  // Dispatch the PTX matmul when both inputs are f32 and either (a) a residency
  // handle already staged its HtoD, or (b) the work is big enough to amortize
  // a cold dispatch. Otherwise fall back to the simd JS triple loop.
  const residentA = aIsHandle && a.type === "f32" && a.buffer !== 0n;
  const residentB = bIsHandle && b.type === "f32" && b.buffer !== 0n;
  const anyResident = residentA || residentB;
  if (
    av instanceof Float32Array &&
    bv instanceof Float32Array &&
    probe() &&
    (anyResident || m * n * k >= MIN_MATMUL_DISPATCH_FLOPS)
  ) {
    return launchMatmulF32(
      aIsHandle ? (a as GpuHandle) : (av as Float32Array),
      bIsHandle ? (b as GpuHandle) : (bv as Float32Array),
      m,
      k,
      n,
      out instanceof Float32Array ? out : undefined,
    );
  }
  let dst: FArray;
  if (out !== undefined) {
    if (out.constructor !== av.constructor) {
      throw new TypeError(`out type ${out.constructor.name} must match a/b type ${av.constructor.name}`);
    }
    dst = out;
    for (let i = 0; i < m * n; i++) dst[i] = 0;
  } else {
    dst = (av instanceof Float32Array ? new Float32Array(m * n) : new Float64Array(m * n)) as FArray;
  }
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
}

// Batched matmul. Computes `batchCount` independent [m,k]·[k,n] = [m,n]
// products in a single kernel launch when cuBLAS is available, falling
// back to a per-batch loop otherwise. Strides are in elements (not bytes)
// — the offset between successive matrices in each input/output array.
function matmulBatched(
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
): FArray {
  if (batchCount <= 0) throw new RangeError("matmulBatched: batchCount must be > 0");
  if (batchCount === 1) return matmul(a, b, m, k, n, out);

  const aIsHandle = isGpuHandle(a);
  const bIsHandle = isGpuHandle(b);
  if (aIsHandle && a.released) throw new Error("bun:gpu: matmulBatched called on released handle");
  if (bIsHandle && b.released) throw new Error("bun:gpu: matmulBatched called on released handle");
  const av = aIsHandle ? a.view : (a as FArray);
  const bv = bIsHandle ? b.view : (b as FArray);
  if (!(av instanceof Float32Array) || !(bv instanceof Float32Array)) {
    throw new TypeError("matmulBatched: f32 only for now");
  }

  const totalC = batchCount * strideC;
  const dst = (out as Float32Array | undefined) ?? new Float32Array(totalC);

  if (cublasLib && probe()) {
    // Stage inputs onto the device. For handle inputs, reuse the
    // already-resident device buffer; for raw arrays, do an HtoD.
    const s = cudaLib!.symbols;
    const ptr = ffiPtr!;
    const totalA = batchCount * strideA;
    const totalB = batchCount * strideB;
    const aBytes = BigInt(totalA * 4);
    const bBytes = BigInt(totalB * 4);
    const cBytes = BigInt(totalC * 4);

    let dA: bigint;
    let aOwned = false;
    if (aIsHandle && a.buffer !== 0n) {
      dA = a.buffer;
    } else {
      const buf = new BigUint64Array(1);
      if (s.cuMemAlloc_v2(ptr(buf), aBytes) !== 0) throw new Error("cuMemAlloc(A) failed");
      dA = buf[0];
      aOwned = true;
      if (s.cuMemcpyHtoD_v2(dA, ptr(av), aBytes) !== 0) throw new Error("cuMemcpyHtoD(A) failed");
    }
    let dB: bigint;
    let bOwned = false;
    if (bIsHandle && b.buffer !== 0n) {
      dB = b.buffer;
    } else {
      const buf = new BigUint64Array(1);
      if (s.cuMemAlloc_v2(ptr(buf), bBytes) !== 0) {
        if (aOwned) s.cuMemFree_v2(dA);
        throw new Error("cuMemAlloc(B) failed");
      }
      dB = buf[0];
      bOwned = true;
      if (s.cuMemcpyHtoD_v2(dB, ptr(bv), bBytes) !== 0) throw new Error("cuMemcpyHtoD(B) failed");
    }

    let dC: bigint = 0n;
    try {
      const cBuf = new BigUint64Array(1);
      if (s.cuMemAlloc_v2(ptr(cBuf), cBytes) !== 0) throw new Error("cuMemAlloc(C) failed");
      dC = cBuf[0];

      // Same row-major→column-major flip as matmul: compute C^T = B^T · A^T,
      // pass B/A swapped with OP_N for both.
      const alphaBuf = new Float32Array([1.0]);
      const betaBuf = new Float32Array([0.0]);
      const r = cublasLib.symbols.cublasSgemmStridedBatched(
        cublasHandle,
        CUBLAS_OP_N,
        CUBLAS_OP_N,
        n,
        m,
        k,
        ptr(alphaBuf),
        dB,
        n,
        BigInt(strideB),
        dA,
        k,
        BigInt(strideA),
        ptr(betaBuf),
        dC,
        n,
        BigInt(strideC),
        batchCount,
      );
      if (r !== 0) throw new Error(`cublasSgemmStridedBatched failed (${r})`);
      if (s.cuCtxSynchronize() !== 0) throw new Error("cuCtxSynchronize failed");
      if (s.cuMemcpyDtoH_v2(ptr(dst), dC, cBytes) !== 0) throw new Error("cuMemcpyDtoH(C) failed");
      return dst;
    } finally {
      if (aOwned && dA !== 0n) s.cuMemFree_v2(dA);
      if (bOwned && dB !== 0n) s.cuMemFree_v2(dB);
      if (dC !== 0n) s.cuMemFree_v2(dC);
    }
  }

  // CPU fallback: per-batch loop.
  for (let b = 0; b < batchCount; b++) {
    const aSlice = av.subarray(b * strideA, b * strideA + m * k);
    const bSlice = bv.subarray(b * strideB, b * strideB + k * n);
    const cSlice = dst.subarray(b * strideC, b * strideC + m * n);
    for (let i = 0; i < m; i++) {
      const aRow = i * k;
      const oRow = i * n;
      for (let j = 0; j < n; j++) {
        let s = 0;
        for (let p = 0; p < k; p++) s += aSlice[aRow + p] * bSlice[p * n + j];
        cSlice[oRow + j] = s;
      }
    }
  }
  return dst;
}

// ─── Dynamic kernel compilation via NVRTC ─────────────────────────────────
//
// For non-affine pure numeric functions, translate JS → CUDA C → PTX via
// NVRTC (runtime compilation). Compiled modules are cached by function
// source string. Falls back to WASM if NVRTC is unavailable or translation
// fails.

const NVRTC_LIBNAMES =
  process.platform === "win32"
    ? ["nvrtc64_120_0.dll", "nvrtc64_110_0.dll"]
    : ["libnvrtc.so", "libnvrtc.so.12", "libnvrtc.so.11"];

type NvrtcSymbols = {
  nvrtcCreateProgram: (
    prog: number,
    src: number,
    name: number,
    numHeaders: number,
    headers: number | null,
    includeNames: number | null,
  ) => number;
  nvrtcCompileProgram: (prog: bigint, numOptions: number, options: number | null) => number;
  nvrtcGetPTXSize: (prog: bigint, sizePtr: number) => number;
  nvrtcGetPTX: (prog: bigint, ptx: number) => number;
  nvrtcDestroyProgram: (progPtr: number) => number;
  nvrtcGetProgramLogSize: (prog: bigint, sizePtr: number) => number;
  nvrtcGetProgramLog: (prog: bigint, log: number) => number;
};

let nvrtcLib: { symbols: NvrtcSymbols; close: () => void } | null = null;
let nvrtcProbed = false;
let nvrtcAvailable = false;

function tryLoadNvrtc(): boolean {
  if (nvrtcProbed) return nvrtcAvailable;
  nvrtcProbed = true;
  const { dlopen, FFIType } = require("../ffi.ts");
  const spec = {
    nvrtcCreateProgram: {
      args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.i32, FFIType.ptr, FFIType.ptr],
      returns: FFIType.i32,
    },
    nvrtcCompileProgram: { args: [FFIType.u64, FFIType.i32, FFIType.ptr], returns: FFIType.i32 },
    nvrtcGetPTXSize: { args: [FFIType.u64, FFIType.ptr], returns: FFIType.i32 },
    nvrtcGetPTX: { args: [FFIType.u64, FFIType.ptr], returns: FFIType.i32 },
    nvrtcDestroyProgram: { args: [FFIType.ptr], returns: FFIType.i32 },
    nvrtcGetProgramLogSize: { args: [FFIType.u64, FFIType.ptr], returns: FFIType.i32 },
    nvrtcGetProgramLog: { args: [FFIType.u64, FFIType.ptr], returns: FFIType.i32 },
  };
  for (const name of NVRTC_LIBNAMES) {
    try {
      nvrtcLib = dlopen(name, spec) as any;
      nvrtcAvailable = true;
      return true;
    } catch {
      continue;
    }
  }
  nvrtcLib = null;
  return false;
}

const MATH_REPLACEMENTS: [RegExp, string][] = [
  [/\bMath\.sin\b/g, "sinf"],
  [/\bMath\.cos\b/g, "cosf"],
  [/\bMath\.tan\b/g, "tanf"],
  [/\bMath\.asin\b/g, "asinf"],
  [/\bMath\.acos\b/g, "acosf"],
  [/\bMath\.atan\b/g, "atanf"],
  [/\bMath\.atan2\b/g, "atan2f"],
  [/\bMath\.exp\b/g, "expf"],
  [/\bMath\.log\b/g, "logf"],
  [/\bMath\.log2\b/g, "log2f"],
  [/\bMath\.log10\b/g, "log10f"],
  [/\bMath\.sqrt\b/g, "sqrtf"],
  [/\bMath\.cbrt\b/g, "cbrtf"],
  [/\bMath\.abs\b/g, "fabsf"],
  [/\bMath\.floor\b/g, "floorf"],
  [/\bMath\.ceil\b/g, "ceilf"],
  [/\bMath\.round\b/g, "roundf"],
  [/\bMath\.trunc\b/g, "truncf"],
  [/\bMath\.sign\b/g, "copysignf(1.0f, "],
  [/\bMath\.min\b/g, "fminf"],
  [/\bMath\.max\b/g, "fmaxf"],
  [/\bMath\.pow\b/g, "powf"],
  [/\bMath\.hypot\b/g, "hypotf"],
  [/\bMath\.PI\b/g, "3.14159265358979323846f"],
  [/\bMath\.E\b/g, "2.71828182845904523536f"],
  [/\bMath\.LN2\b/g, "0.6931471805599453f"],
  [/\bMath\.LN10\b/g, "2.302585092994046f"],
  [/\bMath\.SQRT2\b/g, "1.4142135623730951f"],
];

function extractReturnExpr(fnSrc: string): { param: string; expr: string } | null {
  let m: RegExpMatchArray | null;
  m = fnSrc.match(/^\s*(?:pure\s+)?(?:function\s+\w*)?\s*\(\s*(\w+)\s*(?:,\s*\w+\s*)?\)\s*(?:=>|{)\s*/);
  if (!m) m = fnSrc.match(/^\s*(?:pure\s+)?\(\s*(\w+)\s*(?:,\s*\w+\s*)?\)\s*=>\s*/);
  if (!m) m = fnSrc.match(/^\s*(?:pure\s+)?(\w+)\s*=>\s*/);
  if (!m) return null;

  const param = m[1];
  const rest = fnSrc.slice(m[0].length);

  // Arrow with expression body: (x) => expr
  if (!fnSrc.includes("{") || fnSrc.indexOf("{") > fnSrc.indexOf("=>")) {
    const expr = rest.replace(/\s*;?\s*$/, "");
    if (expr.length === 0) return null;
    return { param, expr };
  }

  // Function body with single return
  const retMatch = rest.match(/^\s*return\s+(.+?)\s*;?\s*}\s*$/);
  if (!retMatch) return null;
  return { param, expr: retMatch[1] };
}

function translateExprToCuda(expr: string, param: string): string | null {
  let cuda = expr;
  // Replace ** with powf
  cuda = cuda.replace(
    /(\b\w+(?:\([^)]*\))?|\([^)]+\)|\d+(?:\.\d+)?)\s*\*\*\s*(\b\w+(?:\([^)]*\))?|\([^)]+\)|\d+(?:\.\d+)?)/g,
    "powf($1, $2)",
  );
  // Replace Math builtins
  for (const [pat, rep] of MATH_REPLACEMENTS) cuda = cuda.replace(pat, rep);
  // Replace === and !== with == and !=
  cuda = cuda.replace(/===/g, "==").replace(/!==/g, "!=");
  // Bail if there are any remaining identifiers besides the param and CUDA builtins
  const cudaBuiltins =
    /\b(sinf|cosf|tanf|asinf|acosf|atanf|atan2f|expf|logf|log2f|log10f|sqrtf|cbrtf|fabsf|floorf|ceilf|roundf|truncf|copysignf|fminf|fmaxf|powf|hypotf)\b/g;
  const stripped = cuda.replace(cudaBuiltins, "").replace(new RegExp("\\b" + param + "\\b", "g"), "");
  // Only numbers, operators, parens, whitespace, commas should remain
  if (/[a-zA-Z_]/.test(stripped)) return null;
  return cuda;
}

function generateCudaKernelSrc(cudaExpr: string, param: string): string {
  return `extern "C" __global__ void custom_map(const float* __restrict__ in, float* __restrict__ out, unsigned int count) {
  unsigned int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i >= count) return;
  float ${param} = in[i];
  out[i] = ${cudaExpr};
}
`;
}

type CachedKernel = { mod: bigint; fn: bigint };
const kernelCache = new Map<string, CachedKernel | null>();

function compileCustomKernel(fnSrc: string): CachedKernel | null {
  const cached = kernelCache.get(fnSrc);
  if (cached !== undefined) return cached;

  if (!tryLoadNvrtc() || !cudaLib || ctx === null) {
    kernelCache.set(fnSrc, null);
    return null;
  }

  const extracted = extractReturnExpr(fnSrc);
  if (!extracted) {
    kernelCache.set(fnSrc, null);
    return null;
  }

  const cudaExpr = translateExprToCuda(extracted.expr, extracted.param);
  if (!cudaExpr) {
    kernelCache.set(fnSrc, null);
    return null;
  }

  const src = generateCudaKernelSrc(cudaExpr, extracted.param);
  const s = nvrtcLib!.symbols;
  const ptr = ffiPtr!;

  const srcBytes = new TextEncoder().encode(src + "\0");
  const nameBytes = new TextEncoder().encode("custom_map.cu\0");
  const progBuf = new BigUint64Array(1);

  if (s.nvrtcCreateProgram(ptr(progBuf), ptr(srcBytes), ptr(nameBytes), 0, null, null) !== 0) {
    kernelCache.set(fnSrc, null);
    return null;
  }
  const prog = progBuf[0];

  const compileResult = s.nvrtcCompileProgram(prog, 0, null);
  if (compileResult !== 0) {
    s.nvrtcDestroyProgram(ptr(progBuf));
    kernelCache.set(fnSrc, null);
    return null;
  }

  const ptxSizeBuf = new BigUint64Array(1);
  if (s.nvrtcGetPTXSize(prog, ptr(ptxSizeBuf)) !== 0) {
    s.nvrtcDestroyProgram(ptr(progBuf));
    kernelCache.set(fnSrc, null);
    return null;
  }
  const ptxSize = Number(ptxSizeBuf[0]);
  const ptxBuf = new Uint8Array(ptxSize);
  if (s.nvrtcGetPTX(prog, ptr(ptxBuf)) !== 0) {
    s.nvrtcDestroyProgram(ptr(progBuf));
    kernelCache.set(fnSrc, null);
    return null;
  }
  s.nvrtcDestroyProgram(ptr(progBuf));

  const cs = cudaLib!.symbols;
  const modBuf = new BigUint64Array(1);
  if (cs.cuModuleLoadData(ptr(modBuf), ptr(ptxBuf)) !== 0) {
    kernelCache.set(fnSrc, null);
    return null;
  }
  const customMod = modBuf[0];

  const fnNameBytes = new TextEncoder().encode("custom_map\0");
  const fnBuf = new BigUint64Array(1);
  if (cs.cuModuleGetFunction(ptr(fnBuf), customMod, ptr(fnNameBytes)) !== 0) {
    cs.cuModuleUnload(customMod);
    kernelCache.set(fnSrc, null);
    return null;
  }

  const entry: CachedKernel = { mod: customMod, fn: fnBuf[0] };
  kernelCache.set(fnSrc, entry);
  return entry;
}

function launchCustomF32(a: Float32Array, kernel: CachedKernel): Float32Array {
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

    const pInBuf = new BigUint64Array([dIn]);
    const pOutBuf = new BigUint64Array([dOut]);
    const pN = new Uint32Array([n]);
    const params = new BigUint64Array([BigInt(ptr(pInBuf)), BigInt(ptr(pOutBuf)), BigInt(ptr(pN))]);

    const blockSize = 256;
    const gridSize = Math.ceil(n / blockSize);
    if (s.cuLaunchKernel(kernel.fn, gridSize, 1, 1, blockSize, 1, 1, 0, 0n, ptr(params), null) !== 0) {
      throw new Error("bun:gpu cuda: cuLaunchKernel failed");
    }
    if (s.cuCtxSynchronize() !== 0) throw new Error("bun:gpu cuda: cuCtxSynchronize failed");

    const out = new Float32Array(n);
    if (s.cuMemcpyDtoH_v2(ptr(out), dOut, bytes) !== 0) throw new Error("bun:gpu cuda: cuMemcpyDtoH failed");
    return out;
  } finally {
    s.cuMemFree_v2(dIn);
    s.cuMemFree_v2(dOut);
  }
}

function conv2D(
  input: Float32Array | GpuHandle,
  kernel: Float32Array | GpuHandle,
  iW: number,
  iH: number,
  kW: number,
  kH: number,
): Float32Array {
  // GPU path requires NVRTC + the dev-ops module. Fall through to a CPU
  // loop if that's unavailable so callers get correct (just slow) results.
  if (!probeDevOps()) {
    const inputView = isGpuHandle(input) ? (input.view as Float32Array) : input;
    const kernelView = isGpuHandle(kernel) ? (kernel.view as Float32Array) : kernel;
    const oW = iW - kW + 1;
    const oH = iH - kH + 1;
    const out = new Float32Array(oW * oH);
    for (let y = 0; y < oH; y++) {
      for (let x = 0; x < oW; x++) {
        let acc = 0;
        for (let ky = 0; ky < kH; ky++) {
          const inRow = (y + ky) * iW + x;
          const kRow = ky * kW;
          for (let kx = 0; kx < kW; kx++) acc += inputView[inRow + kx] * kernelView[kRow + kx];
        }
        out[y * oW + x] = acc;
      }
    }
    return out;
  }
  return launchConv2DF32(input, kernel, iW, iH, kW, kH);
}

// Image-specific RGBA-uint8 Gaussian blur. Single-launch fused kernel —
// caller passes packed RGBA bytes + dims + radius and gets packed RGBA
// bytes back. Sidesteps the JS-side per-channel deinterleave that
// dominates the conv2D-based dispatch path.
function imageBlurRGBA(input: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  if (radius < 0 || radius > 100) throw new RangeError("radius must be in [0, 100]");
  if (radius === 0) {
    const out = new Uint8Array(input.length);
    out.set(input);
    return out;
  }
  if (input.length !== w * h * 4) {
    throw new RangeError(`imageBlurRGBA: input length ${input.length} != w*h*4 (${w}*${h}*4 = ${w * h * 4})`);
  }
  // Requires NVRTC; backends that don't have it return null and the public
  // gpu.imageBlurRGBA wrapper falls through to a different path.
  if (!probeDevOps()) return null as any;
  return launchGaussianBlurRGBAu8(input, w, h, radius);
}

// Reduce dispatch — see launchReduceF32 for kernel details. NVRTC-only path;
// without dev-ops we return Number.NaN as a sentinel and the public wrapper
// in gpu.ts falls back to the CPU reference. (The Backend.reduce contract
// returns a number, so we can't return null here.)
function reduce(input: FArray | GpuHandle, op: "sum" | "min" | "max"): number {
  const view = isGpuHandle(input) ? (input.view as Float32Array) : input;
  if (!(view instanceof Float32Array)) {
    throw new TypeError("bun:gpu cuda: reduce requires Float32Array (f64 not yet supported)");
  }
  if (!probeDevOps()) {
    // Caller-side fallback: do the CPU reduce inline so the public wrapper
    // doesn't need to know we punted.
    if (op === "sum") {
      let sum = 0,
        c = 0;
      for (let i = 0; i < view.length; i++) {
        const y = view[i] - c;
        const t = sum + y;
        c = t - sum - y;
        sum = t;
      }
      return sum;
    }
    if (op === "min") {
      let m = Infinity;
      for (let i = 0; i < view.length; i++) {
        const v = view[i];
        if (Number.isNaN(v)) return NaN;
        if (v < m) m = v;
      }
      return m;
    }
    let m = -Infinity;
    for (let i = 0; i < view.length; i++) {
      const v = view[i];
      if (Number.isNaN(v)) return NaN;
      if (v > m) m = v;
    }
    return m;
  }
  return launchReduceF32(input as Float32Array | GpuHandle, op);
}

// Histogram dispatch — see launchHistogramF32. Returns null when the
// backend can't service the request (no NVRTC, or bins > 12K shared-mem
// cap) and the public wrapper drops to CPU.
function histogram(input: FArray | GpuHandle, bins: number, min: number, max: number): Uint32Array {
  const view = isGpuHandle(input) ? (input.view as Float32Array) : input;
  if (!(view instanceof Float32Array)) {
    throw new TypeError("bun:gpu cuda: histogram requires Float32Array (f64 not yet supported)");
  }
  const out = launchHistogramF32(input as Float32Array | GpuHandle, bins, min, max);
  if (out !== null) return out;
  // Fallback to CPU when NVRTC isn't available or bins exceeds shared-mem.
  const result = new Uint32Array(bins);
  if (view.length === 0 || min >= max) return result;
  const scale = bins / (max - min);
  for (let i = 0; i < view.length; i++) {
    const v = view[i];
    if (Number.isNaN(v) || v < min || v > max) continue;
    let bin = ((v - min) * scale) | 0;
    if (bin >= bins) bin = bins - 1;
    result[bin]++;
  }
  return result;
}

// Scan dispatch — inclusive prefix sum over Float32Array. Returns null
// (then a CPU fallback inline) when NVRTC isn't available or the input
// exceeds the v1 SCAN_MAX_ELEMS cap of 65,536 — recursive multi-stage
// scan to lift the cap is follow-up work.
function scan(input: FArray | GpuHandle): FArray {
  const view = isGpuHandle(input) ? (input.view as Float32Array) : input;
  if (!(view instanceof Float32Array)) {
    throw new TypeError("bun:gpu cuda: scan requires Float32Array (f64 not yet supported)");
  }
  const out = launchScanF32(input as Float32Array | GpuHandle);
  if (out !== null) return out;
  // CPU fallback — Kahan-compensated inclusive scan, matches gpu.ts's
  // CPU reference. Used when NVRTC is missing or n > SCAN_MAX_ELEMS.
  const cpu = new Float32Array(view.length);
  let sum = 0;
  let c = 0;
  for (let i = 0; i < view.length; i++) {
    const y = view[i] - c;
    const t = sum + y;
    c = t - sum - y;
    sum = t;
    cpu[i] = sum;
  }
  return cpu;
}

// argMin / argMax dispatch — see launchArgF32. NVRTC-only path; the launcher
// itself contains the CPU fallback for the no-NVRTC case so we don't need
// to duplicate it here.
function argMin(input: FArray | GpuHandle): number {
  const view = isGpuHandle(input) ? (input.view as Float32Array) : input;
  if (!(view instanceof Float32Array)) {
    throw new TypeError("bun:gpu cuda: argMin requires Float32Array (f64 not yet supported)");
  }
  return launchArgF32(input as Float32Array | GpuHandle, "min");
}

function argMax(input: FArray | GpuHandle): number {
  const view = isGpuHandle(input) ? (input.view as Float32Array) : input;
  if (!(view instanceof Float32Array)) {
    throw new TypeError("bun:gpu cuda: argMax requires Float32Array (f64 not yet supported)");
  }
  return launchArgF32(input as Float32Array | GpuHandle, "max");
}

// Variance dispatch — see launchVarianceF32. Two-pass (reduce_sum for the
// mean, then variance_sumsq with that mean). NVRTC-only path; the launcher
// itself contains the CPU fallback.
function variance(input: FArray | GpuHandle, ddof: number): number {
  const view = isGpuHandle(input) ? (input.view as Float32Array) : input;
  if (!(view instanceof Float32Array)) {
    throw new TypeError("bun:gpu cuda: variance requires Float32Array (f64 not yet supported)");
  }
  return launchVarianceF32(input as Float32Array | GpuHandle, ddof);
}

function simdMap(fn: (x: number, i: number) => number, a: FArray | GpuHandle): FArray {
  if (typeof fn !== "function") throw new TypeError("fn must be a function");
  const view = unwrapHandle(a);
  if (view instanceof Float32Array && fn.length <= 1 && probe() && view.length >= MIN_SIMDMAP_ELEMS) {
    const aff = tryAffineKernel(fn as (x: number) => number);
    if (aff) return launchAffineF32(view, aff.k1, aff.k0);
    const kernel = compileCustomKernel(fn.toString());
    if (kernel) return launchCustomF32(view, kernel);
  }
  return simd.simdMap(fn, view as any);
}

function dispose(): void {
  freeCachedDevBufs();
  if (cudaLib) {
    for (const entry of kernelCache.values()) {
      if (entry) cudaLib.symbols.cuModuleUnload(entry.mod);
    }
    kernelCache.clear();
  }
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
  fnMatmulF32 = null;
  fnDotF32 = null;
  probed = false;
  probeResult = false;
}

// ─── Debug introspection ──────────────────────────────────────────────────

function getDeviceName(): string {
  return deviceName;
}

// Pinned-host-memory allocation (cuMemAllocHost_v2).
//
// Pageable Float32Arrays force the CUDA driver to stage HtoD transfers
// through a private internal pinned buffer — an extra memcpy per dispatch.
// When the caller hands us memory that's already pinned, `cuMemcpyHtoD_v2`
// DMAs straight to the device from the user buffer, so PCIe transfers drop
// roughly 2–3× on large payloads (matmul, matVec). The win is biggest
// where the workload is PCIe-bound, i.e. medium buffers where compute
// doesn't hide the copy; residency (hold) is still the right answer when
// the same buffer is reused many times.
//
// We track pinned buffers via (a) a WeakMap for explicit release lookup
// and (b) a FinalizationRegistry as a GC safety net. Callers SHOULD call
// `releasePinned(arr)` deterministically — FinalizationRegistry timing is
// non-deterministic and pinned memory is a scarce resource (page-locked).
const pinnedPtrs = new WeakMap<ArrayBufferLike, bigint>();
const pinnedFinalizer = new FinalizationRegistry<bigint>(hostPtr => {
  if (cudaLib && hostPtr !== 0n) cudaLib.symbols.cuMemFreeHost(hostPtr);
});

type AllocOptions = { pinned?: boolean };

function alloc(length: number, type: "f32" | "f64", opts?: AllocOptions): FArray {
  if (!Number.isInteger(length) || length < 0) {
    throw new RangeError(`length must be a non-negative integer; got ${length}`);
  }
  if (type !== "f32" && type !== "f64") {
    throw new TypeError(`type must be "f32" or "f64"; got ${String(type)}`);
  }
  if (opts?.pinned && length > 0 && probe()) {
    const elemBytes = type === "f32" ? 4 : 8;
    const bytes = length * elemBytes;
    const s = cudaLib!.symbols;
    const p = ffiPtr!;
    const tab = ffiToArrayBuffer!;
    const dPtrBuf = new BigUint64Array(1);
    if (s.cuMemAllocHost_v2(p(dPtrBuf), BigInt(bytes)) !== 0) {
      throw new Error("bun:gpu cuda: cuMemAllocHost failed");
    }
    const hostPtr = dPtrBuf[0];
    // toArrayBuffer wants a Number-typed Pointer; convert from the bigint
    // u64 the CUDA Driver API returned. 48-bit user-space pointers fit in
    // a JS Number exactly — see Metal's alloc for the same conversion.
    const ab = tab(Number(hostPtr), 0, bytes);
    pinnedPtrs.set(ab, hostPtr);
    pinnedFinalizer.register(ab, hostPtr, ab);
    const view = type === "f32" ? new Float32Array(ab) : new Float64Array(ab);
    // Memory from cuMemAllocHost isn't zero-initialized — match ArrayBuffer
    // semantics so callers can't observe stale bytes.
    view.fill(0);
    return view;
  }
  return type === "f32" ? new Float32Array(length) : new Float64Array(length);
}

// Free a previously pinned allocation. Returns true if `arr` was pinned,
// false if it was a plain typed array (in which case this is a no-op). Safe
// to call on a buffer whose finalizer already ran — we unregister so
// double-free can't happen.
function releasePinned(arr: FArray): boolean {
  if (!(arr instanceof Float32Array) && !(arr instanceof Float64Array)) {
    throw new TypeError(
      `releasePinned requires Float32Array or Float64Array; got ${(arr as any)?.constructor?.name ?? typeof arr}`,
    );
  }
  const ab = arr.buffer;
  const hostPtr = pinnedPtrs.get(ab);
  if (hostPtr === undefined) return false;
  pinnedPtrs.delete(ab);
  pinnedFinalizer.unregister(ab);
  if (cudaLib && hostPtr !== 0n) cudaLib.symbols.cuMemFreeHost(hostPtr);
  return true;
}

function isAligned(arr: FArray): boolean {
  // Pinned buffers are the only "aligned" allocation we distinguish — the
  // Metal backend uses this flag for its zero-copy path; on CUDA it tells
  // callers whether PCIe DMA will go direct.
  return pinnedPtrs.has(arr.buffer);
}

// Tier 4 residency: hold(arr) on an f32 array does the cuMemAlloc +
// cuMemcpyHtoD once, so subsequent matVec calls against the handle skip
// the per-call copy. f64 handles aren't wired to a CUDA kernel yet, so
// those just wrap the view and matVec falls through to bun:simd.
//
// Lifetime: caller MUST call release(handle). releaseHandle is
// idempotent, and after it runs any op that dereferences the handle
// throws a "released handle" error.
function hold(arr: FArray): GpuHandle {
  if (!(arr instanceof Float32Array) && !(arr instanceof Float64Array)) {
    throw new TypeError(
      `hold requires Float32Array or Float64Array; got ${(arr as any)?.constructor?.name ?? typeof arr}`,
    );
  }
  let buffer: bigint = 0n;
  if (arr instanceof Float32Array && arr.byteLength > 0 && probe()) {
    const s = cudaLib!.symbols;
    const p = ffiPtr!;
    const bytes = BigInt(arr.byteLength);
    const dPtrBuf = new BigUint64Array(1);
    if (s.cuMemAlloc_v2(p(dPtrBuf), bytes) !== 0) {
      throw new Error("bun:gpu cuda: cuMemAlloc failed in hold");
    }
    const dPtr = dPtrBuf[0];
    if (s.cuMemcpyHtoD_v2(dPtr, p(arr), bytes) !== 0) {
      s.cuMemFree_v2(dPtr);
      throw new Error("bun:gpu cuda: cuMemcpyHtoD failed in hold");
    }
    buffer = dPtr;
  }
  return {
    __bunGpuHandle: true,
    backend: "cuda",
    type: arr instanceof Float32Array ? "f32" : "f64",
    length: arr.length,
    buffer,
    view: arr,
    released: false,
  };
}
function releaseHandle(handle: GpuHandle): void {
  if (!isGpuHandle(handle)) {
    throw new TypeError(`release expected a GpuHandle; got ${typeof handle}`);
  }
  if (handle.released) return;
  if (handle.buffer !== 0n && cudaLib) {
    cudaLib.symbols.cuMemFree_v2(handle.buffer);
    handle.buffer = 0n;
  }
  handle.released = true;
}

// Hold a Q4_K quantized tensor on device. `blocks` contains raw 144-byte
// super-blocks laid out row-major (one row's blocks contiguous, then
// next row). `nElems` is the logical (dequantized) element count.
// Returns a GpuHandle with qFormat="q4_K"; matVec will dispatch to the
// on-chip dequant kernel. Does not retain the host bytes.
const Q4K_BLOCK_BYTES = 144;
const Q6K_BLOCK_BYTES = 210;

// Hold a Q6_K quantized tensor on device. `blocks` is the raw 210-byte
// super-block stream, row-major. `nElems` is the logical dequantized
// element count. Mirror of `holdQ4K`.
function holdQ6K(blocks: Uint8Array, nElems: number): GpuHandle {
  if (!(blocks instanceof Uint8Array)) {
    throw new TypeError(`holdQ6K requires Uint8Array; got ${(blocks as any)?.constructor?.name ?? typeof blocks}`);
  }
  if (!Number.isInteger(nElems) || nElems <= 0 || (nElems & 255) !== 0) {
    throw new RangeError(`holdQ6K: nElems must be a positive multiple of 256; got ${nElems}`);
  }
  const expectedBytes = (nElems / 256) * Q6K_BLOCK_BYTES;
  if (blocks.byteLength !== expectedBytes) {
    throw new RangeError(`holdQ6K: expected ${expectedBytes} bytes for ${nElems} elements; got ${blocks.byteLength}`);
  }
  if (!probe()) throw new Error("bun:gpu cuda: not available");

  const s = cudaLib!.symbols;
  const p = ffiPtr!;
  const dPtrBuf = new BigUint64Array(1);
  const bytes = BigInt(blocks.byteLength);
  if (s.cuMemAlloc_v2(p(dPtrBuf), bytes) !== 0) {
    throw new Error("bun:gpu cuda: cuMemAlloc failed in holdQ6K");
  }
  const dPtr = dPtrBuf[0];
  if (s.cuMemcpyHtoD_v2(dPtr, p(blocks), bytes) !== 0) {
    s.cuMemFree_v2(dPtr);
    throw new Error("bun:gpu cuda: cuMemcpyHtoD failed in holdQ6K");
  }
  return {
    __bunGpuHandle: true,
    backend: "cuda",
    type: "f32",
    length: nElems,
    buffer: dPtr,
    view: new Float32Array(0),
    released: false,
    qFormat: "q6_K",
  };
}

function holdQ4K(blocks: Uint8Array, nElems: number): GpuHandle {
  if (!(blocks instanceof Uint8Array)) {
    throw new TypeError(`holdQ4K requires Uint8Array; got ${(blocks as any)?.constructor?.name ?? typeof blocks}`);
  }
  if (!Number.isInteger(nElems) || nElems <= 0 || (nElems & 255) !== 0) {
    throw new RangeError(`holdQ4K: nElems must be a positive multiple of 256; got ${nElems}`);
  }
  const expectedBytes = (nElems / 256) * Q4K_BLOCK_BYTES;
  if (blocks.byteLength !== expectedBytes) {
    throw new RangeError(`holdQ4K: expected ${expectedBytes} bytes for ${nElems} elements; got ${blocks.byteLength}`);
  }
  if (!probe()) throw new Error("bun:gpu cuda: not available");

  const s = cudaLib!.symbols;
  const p = ffiPtr!;
  const dPtrBuf = new BigUint64Array(1);
  const bytes = BigInt(blocks.byteLength);
  if (s.cuMemAlloc_v2(p(dPtrBuf), bytes) !== 0) {
    throw new Error("bun:gpu cuda: cuMemAlloc failed in holdQ4K");
  }
  const dPtr = dPtrBuf[0];
  if (s.cuMemcpyHtoD_v2(dPtr, p(blocks), bytes) !== 0) {
    s.cuMemFree_v2(dPtr);
    throw new Error("bun:gpu cuda: cuMemcpyHtoD failed in holdQ4K");
  }
  return {
    __bunGpuHandle: true,
    backend: "cuda",
    type: "f32",
    length: nElems,
    buffer: dPtr,
    view: new Float32Array(0), // stub: callers must not read .view on q-handles
    released: false,
    qFormat: "q4_K",
  };
}

// ─── Device-resident kernel module (NVRTC-compiled) ───────────────────────
//
// The kernels above are the "cross-PCIe" API: every matVec / dot / matmul
// call HtoDs its inputs and DtoH's its output. That's fine for one-shot
// calls, but catastrophic for a transformer decode loop where the 8KB
// residual stream ping-pongs across PCIe ~113 times per token. For
// bun:llm (and future device-residency consumers) we expose a second
// surface — `devOps` — where the caller explicitly allocates device
// scratch buffers and drives ops with device pointers only. No HtoD/DtoH
// in the hot path; the only host↔device traffic per token is the 4-byte
// argmax result at the end.
//
// Implementation: one CUDA C source bundle compiled via NVRTC at first
// use. PTX hand-coding for 11+ kernels would be unshippably painful,
// and NVRTC's per-module compile time (~200ms) is paid exactly once
// per process. If NVRTC isn't installed, `devOps` returns null and
// bun:llm falls back to the old host-loop path.
//
// Kernel conventions:
//   - All kernels operate on f32 only.
//   - Device pointers are passed as u64 (cuLaunchKernel convention).
//   - Scalar dims are u32; scales/eps are f32.
//   - Layout matches the host-side code exactly (row-major, head-major
//     for multi-head tensors) so parity is trivial to check.

const DEV_CUDA_SOURCE = `
// NVRTC ships without <math.h> / <limits>, so synthesize the constants.
#define F_INF  __int_as_float(0x7f800000)
#define F_NINF __int_as_float(0xff800000)
#define F_NAN  __int_as_float(0x7fc00000)

// fp16 → fp32 without <cuda_fp16.h>. The PTX "cvt.f32.f16" instruction
// handles subnormals/Inf/NaN identically to __half2float. Used in K-quant
// dequant kernels (d and dmin are fp16).
static __device__ __forceinline__ float fp16_to_fp32(unsigned short h) {
    float r;
    asm("cvt.f32.f16 %0, %1;" : "=f"(r) : "h"(h));
    return r;
}

// Embedding lookup: copy row tokenId of the f32 embedding table into x.
extern "C" __global__ void embed_lookup_f32(
    const float* __restrict__ embd,
    float* __restrict__ x,
    unsigned int tokenId,
    unsigned int dModel
) {
    unsigned int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < dModel) x[i] = embd[(size_t)tokenId * dModel + i];
}

// Q6_K embed_lookup: same byte layout as matvec_q6k_f32, but emits
// dequantized fp32 instead of accumulating. 128 threads, single block.
// dModel must be a multiple of 256. Caller guarantees k_sblocks >= 1.
extern "C" __global__ void embed_lookup_q6k_f32(
    const unsigned char* __restrict__ embd,
    float* __restrict__ x,
    unsigned int tokenId,
    unsigned int dModel
) {
    __shared__ float sD;
    __shared__ signed char sSc[16];
    __shared__ unsigned char sQl[128];
    __shared__ unsigned char sQh[64];

    unsigned int tid = threadIdx.x;
    unsigned int k_sblocks = dModel >> 8;
    const unsigned char* rowBase = embd + (size_t)tokenId * k_sblocks * 210u;

    for (unsigned int sb = 0; sb < k_sblocks; sb++) {
        const unsigned char* blk = rowBase + (size_t)sb * 210u;
        sQl[tid] = blk[tid];
        if (tid < 64u) sQh[tid] = blk[128u + tid];
        if (tid < 16u) sSc[tid] = (signed char)blk[192u + tid];
        if (tid == 0) {
            unsigned short dh = (unsigned short)blk[208] | ((unsigned short)blk[209] << 8);
            sD = fp16_to_fp32(dh);
        }
        __syncthreads();

        #pragma unroll
        for (int which_half = 0; which_half < 2; which_half++) {
            unsigned int qi = tid + (which_half == 0 ? 0u : 128u);
            unsigned int g = qi >> 7;
            unsigned int i_in_g = qi & 127u;
            unsigned int which = i_in_g >> 5;
            unsigned int l = i_in_g & 31u;
            unsigned int is = l >> 4;
            unsigned int sc_idx = g * 8u + which * 2u + is;
            unsigned int ql_idx = g * 64u + (which & 1u) * 32u + l;
            unsigned int qh_idx = g * 32u + l;
            unsigned int qh_shift = which * 2u;
            unsigned int nibble = ((which >> 1) == 0u)
                ? ((unsigned int)sQl[ql_idx] & 0xFu)
                : ((unsigned int)sQl[ql_idx] >> 4);
            unsigned int high2 = ((unsigned int)sQh[qh_idx] >> qh_shift) & 3u;
            int q_byte = (int)(nibble | (high2 << 4));
            int q_signed = q_byte - 32;
            x[sb * 256u + qi] = sD * (float)sSc[sc_idx] * (float)q_signed;
        }
        __syncthreads();
    }
}

// Q4_K embed_lookup: dequantizes a single row of Q4_K super-blocks.
extern "C" __global__ void embed_lookup_q4k_f32(
    const unsigned char* __restrict__ embd,
    float* __restrict__ x,
    unsigned int tokenId,
    unsigned int dModel
) {
    __shared__ float sD;
    __shared__ float sDmin;
    __shared__ unsigned char sScales[12];
    __shared__ unsigned char sQs[128];

    unsigned int tid = threadIdx.x;
    unsigned int k_sblocks = dModel >> 8;
    const unsigned char* rowBase = embd + (size_t)tokenId * k_sblocks * 144u;

    for (unsigned int sb = 0; sb < k_sblocks; sb++) {
        const unsigned char* blk = rowBase + (size_t)sb * 144u;
        if (tid == 0) {
            unsigned short dh = (unsigned short)blk[0] | ((unsigned short)blk[1] << 8);
            sD = fp16_to_fp32(dh);
        } else if (tid == 1) {
            unsigned short dmh = (unsigned short)blk[2] | ((unsigned short)blk[3] << 8);
            sDmin = fp16_to_fp32(dmh);
        } else if (tid < 14u) {
            sScales[tid - 2u] = blk[2u + tid];
        }
        if (tid < 128u) sQs[tid] = blk[16u + tid];
        __syncthreads();

        #pragma unroll
        for (int which = 0; which < 2; which++) {
            unsigned int qi = tid + (which == 0 ? 0u : 128u);
            unsigned int sb_idx = qi >> 5;
            unsigned int element = qi & 31u;
            unsigned int byte_idx = 32u * (sb_idx >> 1) + element;
            unsigned char byte = sQs[byte_idx];
            unsigned int q = (sb_idx & 1u) ? ((unsigned int)byte >> 4) : ((unsigned int)byte & 0xFu);

            unsigned int sc, mn;
            if (sb_idx < 4u) {
                sc = (unsigned int)sScales[sb_idx] & 63u;
                mn = (unsigned int)sScales[sb_idx + 4u] & 63u;
            } else {
                unsigned int s_jp4 = (unsigned int)sScales[sb_idx + 4u];
                unsigned int s_jm4 = (unsigned int)sScales[sb_idx - 4u];
                unsigned int s_j   = (unsigned int)sScales[sb_idx];
                sc = (s_jp4 & 0xFu) | (((s_jm4 >> 6) & 3u) << 4);
                mn = ((s_jp4 >> 4) & 0xFu) | (((s_j >> 6) & 3u) << 4);
            }

            x[sb * 256u + qi] = sD * (float)sc * (float)q - sDmin * (float)mn;
        }
        __syncthreads();
    }
}

// RMSNorm: y = (x / sqrt(mean(x^2) + eps)) * weight. Single block; one
// warp-reduce across the whole vector. Block size should be >= 32 and
// <= 1024; caller picks 256 for dModel=2048 (8 elems/thread).
extern "C" __global__ void rmsnorm_f32(
    const float* __restrict__ x,
    const float* __restrict__ w,
    float* __restrict__ y,
    unsigned int n,
    float eps
) {
    __shared__ float warpSum[32];
    __shared__ float sScale[1];

    unsigned int tid = threadIdx.x;
    unsigned int bs = blockDim.x;
    unsigned int lane = tid & 31u;
    unsigned int warp = tid >> 5;

    float local = 0.0f;
    for (unsigned int i = tid; i < n; i += bs) {
        float v = x[i];
        local += v * v;
    }
    for (int off = 16; off > 0; off >>= 1) local += __shfl_xor_sync(0xffffffff, local, off);
    if (lane == 0) warpSum[warp] = local;
    __syncthreads();

    if (warp == 0) {
        unsigned int nwarps = (bs + 31u) >> 5;
        local = (tid < nwarps) ? warpSum[lane] : 0.0f;
        for (int off = 16; off > 0; off >>= 1) local += __shfl_xor_sync(0xffffffff, local, off);
        if (tid == 0) sScale[0] = rsqrtf(local / (float)n + eps);
    }
    __syncthreads();
    float scale = sScale[0];
    for (unsigned int i = tid; i < n; i += bs) {
        y[i] = x[i] * scale * w[i];
    }
}

// y[i] = a[i] + b[i]
extern "C" __global__ void add_f32(const float* a, const float* b, float* y, unsigned int n) {
    unsigned int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < n) y[i] = a[i] + b[i];
}

// x[i] += d[i]   (residual add, in-place)
extern "C" __global__ void accum_f32(float* __restrict__ x, const float* __restrict__ d, unsigned int n) {
    unsigned int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < n) x[i] += d[i];
}

// x[i] += b[i]   (Q/K/V bias for Qwen2)
extern "C" __global__ void bias_add_f32(float* __restrict__ x, const float* __restrict__ b, unsigned int n) {
    unsigned int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < n) x[i] += b[i];
}

// SwiGLU fused: gate[i] = silu(gate[i]) * up[i]  =  (gate / (1+exp(-gate))) * up
extern "C" __global__ void silu_mul_f32(float* __restrict__ gate, const float* __restrict__ up, unsigned int n) {
    unsigned int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < n) {
        float g = gate[i];
        float sig = 1.0f / (1.0f + __expf(-g));
        gate[i] = g * sig * up[i];
    }
}

// RoPE NORM (interleaved pairs): for each head, rotate (x[2i], x[2i+1]).
// Launch: grid(nHeads), block(headDim/2).
extern "C" __global__ void rope_norm_f32(
    float* __restrict__ x,
    const float* __restrict__ invFreq,
    unsigned int headDim,
    unsigned int pos
) {
    unsigned int h = blockIdx.x;
    unsigned int i = threadIdx.x;
    unsigned int half = headDim >> 1;
    if (i >= half) return;
    unsigned int base = h * headDim + 2 * i;
    float theta = (float)pos * invFreq[i];
    float c, s;
    __sincosf(theta, &s, &c);
    float a = x[base];
    float b = x[base + 1];
    x[base]     = a * c - b * s;
    x[base + 1] = a * s + b * c;
}

// RoPE NEOX (split halves): for each head, rotate (x[i], x[half+i]).
// Launch: grid(nHeads), block(headDim/2).
extern "C" __global__ void rope_neox_f32(
    float* __restrict__ x,
    const float* __restrict__ invFreq,
    unsigned int headDim,
    unsigned int pos
) {
    unsigned int h = blockIdx.x;
    unsigned int i = threadIdx.x;
    unsigned int half = headDim >> 1;
    if (i >= half) return;
    unsigned int base = h * headDim;
    float theta = (float)pos * invFreq[i];
    float c, s;
    __sincosf(theta, &s, &c);
    float a = x[base + i];
    float b = x[base + half + i];
    x[base + i]        = a * c - b * s;
    x[base + half + i] = a * s + b * c;
}

// Copy src (length kvRowSize) into cache[pos*kvRowSize..].
extern "C" __global__ void kv_store_f32(
    const float* __restrict__ src,
    float* __restrict__ cache,
    unsigned int pos,
    unsigned int kvRowSize
) {
    unsigned int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < kvRowSize) cache[(size_t)pos * kvRowSize + i] = src[i];
}

// Attention scores for one head, one past-position. Grid(nHeads, ctxLen),
// block(headDim). Each block reduces dot(Q[h], K[t][kvh]) * scale into
// scores[h * scoreStride + t]. headDim must be a multiple of 32 (warp size).
extern "C" __global__ void attn_scores_f32(
    const float* __restrict__ q,
    const float* __restrict__ kCache,
    float* __restrict__ scores,
    unsigned int headDim,
    unsigned int kvRowSize,
    unsigned int groupSize,
    unsigned int scoreStride,
    float scale
) {
    __shared__ float warpV[32];

    unsigned int h = blockIdx.x;
    unsigned int t = blockIdx.y;
    unsigned int i = threadIdx.x;
    unsigned int lane = i & 31u;
    unsigned int warp = i >> 5;
    unsigned int kvh = h / groupSize;
    unsigned int qBase = h * headDim;
    size_t kBase = (size_t)t * kvRowSize + kvh * headDim;

    float v = (i < headDim) ? q[qBase + i] * kCache[kBase + i] : 0.0f;
    for (int off = 16; off > 0; off >>= 1) v += __shfl_xor_sync(0xffffffff, v, off);
    if (lane == 0) warpV[warp] = v;
    __syncthreads();
    if (warp == 0) {
        unsigned int nwarps = (headDim + 31u) >> 5;
        v = (i < nwarps) ? warpV[lane] : 0.0f;
        for (int off = 16; off > 0; off >>= 1) v += __shfl_xor_sync(0xffffffff, v, off);
        if (i == 0) scores[h * scoreStride + t] = v * scale;
    }
}

// Row softmax (numerically stable). Grid(rows), block(bs). Row stride
// allows scores to be sized to maxContext without copying the active
// prefix. Writes softmaxed values back into the same row.
extern "C" __global__ void softmax_row_f32(
    float* __restrict__ scores,
    unsigned int cols,
    unsigned int stride
) {
    __shared__ float warpMax[32];
    __shared__ float warpSum[32];
    __shared__ float sMax[1];
    __shared__ float sSum[1];

    unsigned int r = blockIdx.x;
    unsigned int tid = threadIdx.x;
    unsigned int bs = blockDim.x;
    unsigned int lane = tid & 31u;
    unsigned int warp = tid >> 5;
    float* row = scores + r * stride;

    // Max reduction
    float lmax = F_NINF;
    for (unsigned int i = tid; i < cols; i += bs) {
        float v = row[i];
        if (v > lmax) lmax = v;
    }
    for (int off = 16; off > 0; off >>= 1) {
        float o = __shfl_xor_sync(0xffffffff, lmax, off);
        if (o > lmax) lmax = o;
    }
    if (lane == 0) warpMax[warp] = lmax;
    __syncthreads();
    if (warp == 0) {
        unsigned int nwarps = (bs + 31u) >> 5;
        lmax = (tid < nwarps) ? warpMax[lane] : F_NINF;
        for (int off = 16; off > 0; off >>= 1) {
            float o = __shfl_xor_sync(0xffffffff, lmax, off);
            if (o > lmax) lmax = o;
        }
        if (tid == 0) sMax[0] = lmax;
    }
    __syncthreads();
    float maxV = sMax[0];

    // Exp + sum
    float lsum = 0.0f;
    for (unsigned int i = tid; i < cols; i += bs) {
        float e = __expf(row[i] - maxV);
        row[i] = e;
        lsum += e;
    }
    for (int off = 16; off > 0; off >>= 1) lsum += __shfl_xor_sync(0xffffffff, lsum, off);
    if (lane == 0) warpSum[warp] = lsum;
    __syncthreads();
    if (warp == 0) {
        unsigned int nwarps = (bs + 31u) >> 5;
        lsum = (tid < nwarps) ? warpSum[lane] : 0.0f;
        for (int off = 16; off > 0; off >>= 1) lsum += __shfl_xor_sync(0xffffffff, lsum, off);
        if (tid == 0) sSum[0] = lsum;
    }
    __syncthreads();
    float invSum = 1.0f / sSum[0];
    for (unsigned int i = tid; i < cols; i += bs) row[i] *= invSum;
}

// Attention output: out[h*headDim + i] = sum_t scores[h][t] * V[t][kvh][i]
// Launch: grid(nHeads), block(headDim). Each thread accumulates one output dim.
extern "C" __global__ void attn_output_f32(
    const float* __restrict__ scores,
    const float* __restrict__ vCache,
    float* __restrict__ out,
    unsigned int headDim,
    unsigned int kvRowSize,
    unsigned int groupSize,
    unsigned int ctxLen,
    unsigned int scoreStride
) {
    unsigned int h = blockIdx.x;
    unsigned int i = threadIdx.x;
    if (i >= headDim) return;
    unsigned int kvh = h / groupSize;
    unsigned int vHeadOff = kvh * headDim + i;
    const float* srow = scores + h * scoreStride;
    float acc = 0.0f;
    for (unsigned int t = 0; t < ctxLen; t++) {
        acc += srow[t] * vCache[(size_t)t * kvRowSize + vHeadOff];
    }
    out[h * headDim + i] = acc;
}

// Fused flash-attention: grid(nHeads), block(nthreads). One block per
// head computes dot(q, K_t) for every past t, runs online softmax, and
// weights V into out in a single pass — no scores buffer in global mem.
//
// Online softmax invariant (Rabe & Staats 2021): at iteration t, we keep
//   runMax  = max_{t' <= t}(score_{t'})
//   runSum  = sum_{t' <= t}(exp(score_{t'} - runMax))
//   runOut  = sum_{t' <= t}(exp(score_{t'} - runMax) * V_{t'})
// When score_t raises the max by Δ, we rescale runSum and runOut by
// exp(oldMax - newMax) — numerically stable without two passes.
//
// Launch dims: block = max(headDim, 32) threads (must be multiple of 32).
// Each thread owns one dim of q/V/out. headDim ≤ 256 required (shared
// arrays sized for Llama-3 headDim=64; adjust sQ/sOut sizes if we ever
// run a wider head). groupSize = nHead / nKvHead handles GQA.
extern "C" __global__ void flash_attn_f32(
    const float* __restrict__ q,
    const float* __restrict__ kCache,
    const float* __restrict__ vCache,
    float* __restrict__ out,
    unsigned int headDim,
    unsigned int kvRowSize,
    unsigned int groupSize,
    unsigned int ctxLen,
    float scale
) {
    __shared__ float sQ[256];
    __shared__ float sOut[256];
    __shared__ float sScore;
    __shared__ float warpRed[8];

    unsigned int h = blockIdx.x;
    unsigned int tid = threadIdx.x;
    unsigned int lane = tid & 31u;
    unsigned int warp = tid >> 5;
    unsigned int bs = blockDim.x;
    unsigned int nwarps = (bs + 31u) >> 5;
    unsigned int kvh = h / groupSize;

    if (tid < headDim) {
        sQ[tid] = q[h * headDim + tid];
        sOut[tid] = 0.0f;
    }
    __syncthreads();

    float runMax = F_NINF;
    float runSum = 0.0f;

    for (unsigned int t = 0; t < ctxLen; t++) {
        // dot(q, K[t, kvh]).
        float local = 0.0f;
        if (tid < headDim) {
            float k = kCache[(size_t)t * kvRowSize + kvh * headDim + tid];
            local = sQ[tid] * k;
        }
        for (int off = 16; off > 0; off >>= 1)
            local += __shfl_xor_sync(0xffffffff, local, off);
        if (lane == 0) warpRed[warp] = local;
        __syncthreads();
        if (warp == 0) {
            local = (tid < nwarps) ? warpRed[tid] : 0.0f;
            for (int off = 16; off > 0; off >>= 1)
                local += __shfl_xor_sync(0xffffffff, local, off);
            if (tid == 0) sScore = local * scale;
        }
        __syncthreads();

        float score = sScore;
        float newMax = fmaxf(runMax, score);
        float correction = __expf(runMax - newMax);
        float e = __expf(score - newMax);
        runSum = runSum * correction + e;
        runMax = newMax;

        if (tid < headDim) {
            float vv = vCache[(size_t)t * kvRowSize + kvh * headDim + tid];
            sOut[tid] = sOut[tid] * correction + e * vv;
        }
        // No trailing sync needed: warpRed writes happen before the next
        // __syncthreads() inside the next iteration's warp==0 reduction.
    }

    if (tid < headDim) {
        out[h * headDim + tid] = sOut[tid] / runSum;
    }
}

// Q4_K direct matVec: reads raw 144-byte super-blocks, dequantizes on
// chip, accumulates in fp32. k must be a multiple of 256 (super-block
// size). Layout per row: (k/256) super-blocks × 144 bytes.
//
// Super-block layout (matches llama.cpp block_q4_K):
//   +0..+1   fp16 d     (overall scale)
//   +2..+3   fp16 dmin  (overall offset)
//   +4..+15  12 bytes of packed 6-bit (scale, min) × 8 sub-blocks
//   +16..+143  128 bytes of 4-bit quants (8 groups of 32 elements)
//
// Dequant formula per element (sb = sub-block 0..7, i = 0..31):
//   q  = qs[32*(sb/2) + i] either low or high nibble (sb even → low)
//   sc = 6-bit scale for sub-block sb (packed in scales[0..11])
//   mn = 6-bit min   for sub-block sb
//   w  = d * sc * q - dmin * mn
//
// Layout: 1 warp (32 threads) per row; 4 warps per block (128 threads,
// 4 rows per block). Each lane handles 8 elements/sb (one per sub-block
// sb_idx 0..7, at column = lane). No __syncthreads (warp-local), warp
// reduction at the end, lane 0 writes the output.
//
// Why not shared memory for the super-block: each warp handles a
// different row, so nothing is shared between warps. Reading super-block
// bytes directly from global memory hits L1 (32 threads read 32
// consecutive bytes → one cache line), and we avoid the per-sb sync
// barrier that was serializing the old kernel.

extern "C" __global__ void matvec_q4k_f32(
    const unsigned char* __restrict__ mat,
    const float* __restrict__ vec,
    float* __restrict__ out,
    unsigned int m,
    unsigned int k_sblocks          // k / 256
) {
    unsigned int tid = threadIdx.x;
    unsigned int lane = tid & 31u;
    unsigned int warp_in_block = tid >> 5;         // 0..3
    unsigned int row = blockIdx.x * 4u + warp_in_block;
    if (row >= m) return;

    const unsigned char* rowBase = mat + (size_t)row * k_sblocks * 144u;

    float acc = 0.0f;
    for (unsigned int sb = 0; sb < k_sblocks; sb++) {
        const unsigned char* blk = rowBase + (size_t)sb * 144u;

        // Load metadata — each lane reads redundantly (cheap: L1 cached,
        // 32 lanes ask for same 4 bytes → one memory load).
        unsigned short dh  = (unsigned short)blk[0] | ((unsigned short)blk[1] << 8);
        unsigned short dmh = (unsigned short)blk[2] | ((unsigned short)blk[3] << 8);
        float d    = fp16_to_fp32(dh);
        float dmin = fp16_to_fp32(dmh);

        // Load the 12 scale bytes once into registers. Each lane reads
        // redundantly; 32 lanes × 12 bytes = 384 byte reads, all L1-resident.
        unsigned int sc0_3 = (unsigned int)blk[4] | ((unsigned int)blk[5] << 8)
                           | ((unsigned int)blk[6] << 16) | ((unsigned int)blk[7] << 24);
        unsigned int sc4_7 = (unsigned int)blk[8] | ((unsigned int)blk[9] << 8)
                           | ((unsigned int)blk[10] << 16) | ((unsigned int)blk[11] << 24);
        unsigned int sc8_11 = (unsigned int)blk[12] | ((unsigned int)blk[13] << 8)
                            | ((unsigned int)blk[14] << 16) | ((unsigned int)blk[15] << 24);
        // Handy byte extraction: byte k (0..11) from packed dwords.
        //   sc0_3  → bytes 0..3
        //   sc4_7  → bytes 4..7
        //   sc8_11 → bytes 8..11

        // Each lane owns column = lane; within this super-block we do
        // 8 FMAs (one per sub-block sb_idx=0..7).
        #pragma unroll 8
        for (unsigned int k = 0; k < 8u; k++) {
            unsigned int sb_idx  = k;
            unsigned int qi      = sb_idx * 32u + lane;                 // 0..255
            unsigned int byte_idx = 32u * (sb_idx >> 1) + lane;         // into qs[128]
            unsigned char byte   = blk[16u + byte_idx];
            unsigned int q = (sb_idx & 1u) ? ((unsigned int)byte >> 4) : ((unsigned int)byte & 0xFu);

            unsigned int sc, mn;
            if (sb_idx < 4u) {
                // scales[0..3] → sc for sbs 0..3; scales[4..7] → mn for sbs 0..3.
                unsigned int s_sc = (sc0_3 >> (sb_idx * 8u)) & 0xFFu;
                unsigned int s_mn = (sc4_7 >> (sb_idx * 8u)) & 0xFFu;
                sc = s_sc & 63u;
                mn = s_mn & 63u;
            } else {
                // llama.cpp get_scale_min_k4: for j = sb_idx (4..7),
                //   sc = (scales[j+4] & 0xF) | ((scales[j-4] >> 6) << 4)
                //   mn = (scales[j+4] >> 4) | ((scales[j]   >> 6) << 4)
                unsigned int s_jp4 = (sc8_11 >> ((sb_idx - 4u) * 8u)) & 0xFFu;   // scales[8..11]
                unsigned int s_jm4 = (sc0_3 >> ((sb_idx - 4u) * 8u)) & 0xFFu;    // scales[0..3]
                unsigned int s_j   = (sc4_7 >> ((sb_idx - 4u) * 8u)) & 0xFFu;    // scales[4..7]
                sc = (s_jp4 & 0xFu) | (((s_jm4 >> 6) & 3u) << 4);
                mn = ((s_jp4 >> 4) & 0xFu) | (((s_j >> 6) & 3u) << 4);
            }

            float w = d * (float)sc * (float)q - dmin * (float)mn;
            float v = vec[sb * 256u + qi];
            acc = fmaf(w, v, acc);
        }
    }

    // Warp reduction.
    for (int off = 16; off > 0; off >>= 1) acc += __shfl_xor_sync(0xffffffff, acc, off);
    if (lane == 0) out[row] = acc;
}

// Q6_K direct matVec: reads raw 210-byte super-blocks, dequantizes on
// chip, accumulates in fp32. k must be a multiple of 256 (super-block
// size). Layout per row: (k/256) super-blocks × 210 bytes.
//
// Super-block layout (matches llama.cpp block_q6_K):
//   +0..+127   ql[128]   4 low bits of 256 quants (packed two per byte)
//   +128..+191 qh[64]    2 high bits of 256 quants (packed four per byte)
//   +192..+207 sc[16]    int8 scales, one per 16 elements
//   +208..+209 fp16 d    super-block scale
//
// Dequant (matches ggml-quants.c dequantize_row_q6_K): for output index
// i in [0, 256), decompose i into g = i/128, i' = i%128, l = i'%32,
// which = i'/32 (0..3):
//   nibble = (which < 2) ? ql[g*64 + (which&1)*32 + l] & 0xF
//                        : ql[g*64 + (which&1)*32 + l] >> 4
//   high2  = (qh[g*32 + l] >> (which*2)) & 3
//   q      = (int)(nibble | (high2 << 4)) - 32         // signed 6-bit
//   sc_i   = sc[g*8 + which*2 + (l>>4)]                // int8
//   w      = d * sc_i * q
// Layout: 1 warp per row, 4 warps per block. Same structure as
// matvec_q4k_f32 above — warp-local, no inter-warp sync.
extern "C" __global__ void matvec_q6k_f32(
    const unsigned char* __restrict__ mat,
    const float* __restrict__ vec,
    float* __restrict__ out,
    unsigned int m,
    unsigned int k_sblocks         // k / 256
) {
    unsigned int tid = threadIdx.x;
    unsigned int lane = tid & 31u;
    unsigned int warp_in_block = tid >> 5;
    unsigned int row = blockIdx.x * 4u + warp_in_block;
    if (row >= m) return;

    const unsigned char* rowBase = mat + (size_t)row * k_sblocks * 210u;

    float acc = 0.0f;
    for (unsigned int sb = 0; sb < k_sblocks; sb++) {
        const unsigned char* blk = rowBase + (size_t)sb * 210u;

        // Super-block scale (fp16 at offset 208).
        unsigned short dh = (unsigned short)blk[208] | ((unsigned short)blk[209] << 8);
        float d = fp16_to_fp32(dh);

        // Each lane processes output indices qi = lane, lane+32, ..., lane+224
        // (8 outputs, one per k=0..7). Mapping back to ql/qh/sc indices:
        //   g = k >> 2, which = k & 3, l = lane (since lane is 0..31).
        #pragma unroll 8
        for (unsigned int k = 0; k < 8u; k++) {
            unsigned int qi = lane + k * 32u;
            unsigned int g      = k >> 2;                  // 0 for k=0..3, 1 for k=4..7
            unsigned int which  = k & 3u;                  // 0..3
            unsigned int ql_idx = g * 64u + (which & 1u) * 32u + lane;  // 0..127
            unsigned int qh_idx = g * 32u + lane;                        // 0..63
            unsigned int sc_idx = g * 8u + which * 2u + (lane >> 4);     // 0..15

            unsigned int qlv = blk[ql_idx];
            unsigned int qhv = blk[128u + qh_idx];
            signed char scv = (signed char)blk[192u + sc_idx];

            unsigned int nibble = (which < 2u) ? (qlv & 0xFu) : (qlv >> 4);
            unsigned int high2  = (qhv >> (which * 2u)) & 3u;
            int q_signed = (int)(nibble | (high2 << 4)) - 32;   // [-32, 31]

            float w = d * (float)scv * (float)q_signed;
            float v = vec[sb * 256u + qi];
            acc = fmaf(w, v, acc);
        }
    }

    for (int off = 16; off > 0; off >>= 1) acc += __shfl_xor_sync(0xffffffff, acc, off);
    if (lane == 0) out[row] = acc;
}

// Bandwidth-optimized matVec: float4 loads, 128 threads per row.
// Requires k % 4 == 0 (caller asserts). m rows × (k/4) float4 cols.
extern "C" __global__ void matvec_f32x4(
    const float4* __restrict__ mat,
    const float4* __restrict__ vec,
    float* __restrict__ out,
    unsigned int m,
    unsigned int k_div4
) {
    __shared__ float warpSum[4];
    unsigned int row = blockIdx.x;
    unsigned int tid = threadIdx.x;
    unsigned int lane = tid & 31u;
    unsigned int warp = tid >> 5;
    if (row >= m) return;

    const float4* mrow = mat + (size_t)row * k_div4;
    float acc = 0.0f;
    for (unsigned int i = tid; i < k_div4; i += 128u) {
        float4 m4 = mrow[i];
        float4 v4 = vec[i];
        acc = fmaf(m4.x, v4.x, acc);
        acc = fmaf(m4.y, v4.y, acc);
        acc = fmaf(m4.z, v4.z, acc);
        acc = fmaf(m4.w, v4.w, acc);
    }
    for (int off = 16; off > 0; off >>= 1) acc += __shfl_xor_sync(0xffffffff, acc, off);
    if (lane == 0) warpSum[warp] = acc;
    __syncthreads();
    if (warp == 0) {
        acc = (tid < 4) ? warpSum[tid] : 0.0f;
        for (int off = 2; off > 0; off >>= 1) acc += __shfl_xor_sync(0xffffffff, acc, off);
        if (tid == 0) out[row] = acc;
    }
}

// Argmax. Single block; tie-break toward lower index (matches host argmax).
// Writes the winning index to outIdx[0].
extern "C" __global__ void argmax_f32(
    const float* __restrict__ logits,
    int* __restrict__ outIdx,
    unsigned int n
) {
    __shared__ float warpV[32];
    __shared__ int warpI[32];

    unsigned int tid = threadIdx.x;
    unsigned int bs = blockDim.x;
    unsigned int lane = tid & 31u;
    unsigned int warp = tid >> 5;

    float bestV = F_NINF;
    int bestI = 0;
    for (unsigned int i = tid; i < n; i += bs) {
        float v = logits[i];
        if (v > bestV || (v == bestV && (int)i < bestI)) { bestV = v; bestI = (int)i; }
    }
    for (int off = 16; off > 0; off >>= 1) {
        float ov = __shfl_xor_sync(0xffffffff, bestV, off);
        int oi = __shfl_xor_sync(0xffffffff, bestI, off);
        if (ov > bestV || (ov == bestV && oi < bestI)) { bestV = ov; bestI = oi; }
    }
    if (lane == 0) { warpV[warp] = bestV; warpI[warp] = bestI; }
    __syncthreads();
    if (warp == 0) {
        unsigned int nwarps = (bs + 31u) >> 5;
        bestV = (tid < nwarps) ? warpV[lane] : F_NINF;
        bestI = (tid < nwarps) ? warpI[lane] : 0;
        for (int off = 16; off > 0; off >>= 1) {
            float ov = __shfl_xor_sync(0xffffffff, bestV, off);
            int oi = __shfl_xor_sync(0xffffffff, bestI, off);
            if (ov > bestV || (ov == bestV && oi < bestI)) { bestV = ov; bestI = oi; }
        }
        if (tid == 0) outIdx[0] = bestI;
    }
}

// ─── 2D convolution (valid mode) ───────────────────────────────────────────
// Output[y, x] = sum_{ky, kx} input[y+ky, x+kx] * kernel[ky, kx].
// Output dims: (iH-kH+1) × (iW-kW+1). One thread per output pixel; 16×16
// blocks (256 threads) for cache locality. Direct global loads + fmaf
// accumulator. Worth tile-optimizing later for kernels >= 7×7.
extern "C" __global__ void conv2d_f32(
    const float* __restrict__ input,
    const float* __restrict__ krn,
    float* __restrict__ outbuf,
    unsigned int iW,
    unsigned int iH,
    unsigned int kW,
    unsigned int kH
) {
    unsigned int x = blockIdx.x * blockDim.x + threadIdx.x;
    unsigned int y = blockIdx.y * blockDim.y + threadIdx.y;
    unsigned int oW = iW - kW + 1u;
    unsigned int oH = iH - kH + 1u;
    if (x >= oW || y >= oH) return;
    float acc = 0.0f;
    for (unsigned int ky = 0u; ky < kH; ky++) {
        unsigned int inRow = (y + ky) * iW + x;
        unsigned int kRow = ky * kW;
        for (unsigned int kx = 0u; kx < kW; kx++) {
            acc = fmaf(input[inRow + kx], krn[kRow + kx], acc);
        }
    }
    outbuf[y * oW + x] = acc;
}

// Fused RGBA-uint8 Gaussian blur. Two kernel variants: a tile-aware
// version that uses shared memory (radius ≤ 16, covers the common
// case — most practical photo blurs are radius 1-10), and a global-
// memory fallback for larger radii where the tile + halo wouldn't fit
// in shared memory.

// Tiled version. Each block computes a 16×16 output region. The block
// also cooperatively loads the (16 + 2r) × (16 + 2r) source tile into
// shared memory once; then each thread reads its kSize² weighted
// samples from shared mem instead of global. Reduces global memory
// traffic by ~kSize² (= 121 for radius=5).
//
// Shared mem usage: (16+32)² × 4 bytes = 9216 bytes max at radius 16.
// Comfortably under the 48 KB / SM limit on every CUDA arch we target.
extern "C" __global__ void gaussian_blur_rgba_u8_tiled(
    const unsigned char* __restrict__ src,
    unsigned char* __restrict__ dst,
    unsigned int w,
    unsigned int h,
    const float* __restrict__ kern1d,
    int radius
) {
    extern __shared__ unsigned char tile[];

    const int TILE = 16;
    const int tileW = TILE + 2 * radius;
    const int tileH = TILE + 2 * radius;
    const int tilePixels = tileW * tileH;

    const int blockX = blockIdx.x * TILE;
    const int blockY = blockIdx.y * TILE;
    const int tx = threadIdx.x;
    const int ty = threadIdx.y;
    const int tid = ty * TILE + tx;
    const int totalThreads = TILE * TILE;

    // Each thread loads (tilePixels / totalThreads) round-up source pixels
    // into shared memory, with edge clamp on out-of-bounds reads. The
    // load loop strides by totalThreads so contiguous threads load
    // contiguous pixels (coalesced reads from global).
    for (int i = tid; i < tilePixels; i += totalThreads) {
        int ly = i / tileW;
        int lx = i - ly * tileW;
        int sx = blockX + lx - radius;
        int sy = blockY + ly - radius;
        if (sx < 0) sx = 0;
        if (sx >= (int)w) sx = (int)w - 1;
        if (sy < 0) sy = 0;
        if (sy >= (int)h) sy = (int)h - 1;
        // Copy 4 bytes (one RGBA pixel) at once.
        const unsigned int* src32 = (const unsigned int*)src;
        unsigned int* tile32 = (unsigned int*)tile;
        tile32[i] = src32[sy * (int)w + sx];
    }
    __syncthreads();

    const int x = blockX + tx;
    const int y = blockY + ty;
    if (x >= (int)w || y >= (int)h) return;

    float r = 0.0f, g = 0.0f, b = 0.0f, a = 0.0f;
    int kSize = 2 * radius + 1;
    for (int ky = 0; ky < kSize; ky++) {
        float kyW = kern1d[ky];
        const int tileRow = (ty + ky) * tileW;
        for (int kx = 0; kx < kSize; kx++) {
            float kw = kyW * kern1d[kx];
            int tileIdx = (tileRow + tx + kx) * 4;
            r = fmaf((float)tile[tileIdx + 0], kw, r);
            g = fmaf((float)tile[tileIdx + 1], kw, g);
            b = fmaf((float)tile[tileIdx + 2], kw, b);
            a = fmaf((float)tile[tileIdx + 3], kw, a);
        }
    }

    int oIdx = (y * (int)w + x) * 4;
    int ri = (int)(r + 0.5f);
    int gi = (int)(g + 0.5f);
    int bi = (int)(b + 0.5f);
    int ai = (int)(a + 0.5f);
    if (ri < 0) ri = 0; else if (ri > 255) ri = 255;
    if (gi < 0) gi = 0; else if (gi > 255) gi = 255;
    if (bi < 0) bi = 0; else if (bi > 255) bi = 255;
    if (ai < 0) ai = 0; else if (ai > 255) ai = 255;
    dst[oIdx + 0] = (unsigned char)ri;
    dst[oIdx + 1] = (unsigned char)gi;
    dst[oIdx + 2] = (unsigned char)bi;
    dst[oIdx + 3] = (unsigned char)ai;
}

// Global-memory fallback for radius > 16 where shared-mem tile + halo
// wouldn't fit. Same correctness, naive direct global reads.
extern "C" __global__ void gaussian_blur_rgba_u8(
    const unsigned char* __restrict__ src,
    unsigned char* __restrict__ dst,
    unsigned int w,
    unsigned int h,
    const float* __restrict__ kern1d,
    int radius
) {
    int x = (int)(blockIdx.x * blockDim.x + threadIdx.x);
    int y = (int)(blockIdx.y * blockDim.y + threadIdx.y);
    if (x >= (int)w || y >= (int)h) return;

    float r = 0.0f, g = 0.0f, b = 0.0f, a = 0.0f;
    int kSize = 2 * radius + 1;
    for (int ky = 0; ky < kSize; ky++) {
        int sy = y + ky - radius;
        if (sy < 0) sy = 0;
        if (sy >= (int)h) sy = (int)h - 1;
        float kyW = kern1d[ky];
        for (int kx = 0; kx < kSize; kx++) {
            int sx = x + kx - radius;
            if (sx < 0) sx = 0;
            if (sx >= (int)w) sx = (int)w - 1;
            float kw = kyW * kern1d[kx];
            int idx = (sy * (int)w + sx) * 4;
            r = fmaf((float)src[idx + 0], kw, r);
            g = fmaf((float)src[idx + 1], kw, g);
            b = fmaf((float)src[idx + 2], kw, b);
            a = fmaf((float)src[idx + 3], kw, a);
        }
    }

    int oIdx = (y * (int)w + x) * 4;
    int ri = (int)(r + 0.5f);
    int gi = (int)(g + 0.5f);
    int bi = (int)(b + 0.5f);
    int ai = (int)(a + 0.5f);
    if (ri < 0) ri = 0; else if (ri > 255) ri = 255;
    if (gi < 0) gi = 0; else if (gi > 255) gi = 255;
    if (bi < 0) bi = 0; else if (bi > 255) bi = 255;
    if (ai < 0) ai = 0; else if (ai > 255) ai = 255;
    dst[oIdx + 0] = (unsigned char)ri;
    dst[oIdx + 1] = (unsigned char)gi;
    dst[oIdx + 2] = (unsigned char)bi;
    dst[oIdx + 3] = (unsigned char)ai;
}

// ─── Reduction (sum / min / max) ──────────────────────────────────────────
// Two-stage tree reduction. Each block reduces a strided slice of the input
// into one float partial; the host (or a second kernel launch in fancier
// implementations) sums the partials. Block size is fixed at 256, grid is
// driven by the launcher (REDUCE_GRID = 1024 — same shape as dotF32).
//
// Shared-mem layout: 256 floats, one per thread. Final 32-thread reduction
// uses warp-shuffle (__shfl_down_sync) so no syncthreads in the last stage.
//
// NaN behavior matches JS Math.min / Math.max — NaN propagates. The sum
// path picks up NaN naturally via float add; min/max guard with isnan().

__device__ __forceinline__ float reduce_min_op(float a, float b) {
    if (isnan(a) || isnan(b)) return F_NAN;
    return a < b ? a : b;
}
__device__ __forceinline__ float reduce_max_op(float a, float b) {
    if (isnan(a) || isnan(b)) return F_NAN;
    return a > b ? a : b;
}

extern "C" __global__ void reduce_sum_f32(
    const float* __restrict__ in,
    float* __restrict__ partials,
    unsigned int n
) {
    __shared__ float sdata[256];
    unsigned int tid = threadIdx.x;
    unsigned int idx = blockIdx.x * blockDim.x + tid;
    unsigned int stride = gridDim.x * blockDim.x;

    float acc = 0.0f;
    for (unsigned int i = idx; i < n; i += stride) acc += in[i];
    sdata[tid] = acc;
    __syncthreads();

    for (unsigned int s = blockDim.x / 2; s > 32; s >>= 1) {
        if (tid < s) sdata[tid] += sdata[tid + s];
        __syncthreads();
    }
    if (tid < 32) {
        float v = sdata[tid] + sdata[tid + 32];
        v += __shfl_down_sync(0xffffffff, v, 16);
        v += __shfl_down_sync(0xffffffff, v, 8);
        v += __shfl_down_sync(0xffffffff, v, 4);
        v += __shfl_down_sync(0xffffffff, v, 2);
        v += __shfl_down_sync(0xffffffff, v, 1);
        if (tid == 0) partials[blockIdx.x] = v;
    }
}

extern "C" __global__ void reduce_min_f32(
    const float* __restrict__ in,
    float* __restrict__ partials,
    unsigned int n
) {
    __shared__ float sdata[256];
    unsigned int tid = threadIdx.x;
    unsigned int idx = blockIdx.x * blockDim.x + tid;
    unsigned int stride = gridDim.x * blockDim.x;

    float acc = F_INF;
    for (unsigned int i = idx; i < n; i += stride) acc = reduce_min_op(acc, in[i]);
    sdata[tid] = acc;
    __syncthreads();

    for (unsigned int s = blockDim.x / 2; s > 32; s >>= 1) {
        if (tid < s) sdata[tid] = reduce_min_op(sdata[tid], sdata[tid + s]);
        __syncthreads();
    }
    if (tid < 32) {
        float v = reduce_min_op(sdata[tid], sdata[tid + 32]);
        v = reduce_min_op(v, __shfl_down_sync(0xffffffff, v, 16));
        v = reduce_min_op(v, __shfl_down_sync(0xffffffff, v, 8));
        v = reduce_min_op(v, __shfl_down_sync(0xffffffff, v, 4));
        v = reduce_min_op(v, __shfl_down_sync(0xffffffff, v, 2));
        v = reduce_min_op(v, __shfl_down_sync(0xffffffff, v, 1));
        if (tid == 0) partials[blockIdx.x] = v;
    }
}

extern "C" __global__ void reduce_max_f32(
    const float* __restrict__ in,
    float* __restrict__ partials,
    unsigned int n
) {
    __shared__ float sdata[256];
    unsigned int tid = threadIdx.x;
    unsigned int idx = blockIdx.x * blockDim.x + tid;
    unsigned int stride = gridDim.x * blockDim.x;

    float acc = F_NINF;
    for (unsigned int i = idx; i < n; i += stride) acc = reduce_max_op(acc, in[i]);
    sdata[tid] = acc;
    __syncthreads();

    for (unsigned int s = blockDim.x / 2; s > 32; s >>= 1) {
        if (tid < s) sdata[tid] = reduce_max_op(sdata[tid], sdata[tid + s]);
        __syncthreads();
    }
    if (tid < 32) {
        float v = reduce_max_op(sdata[tid], sdata[tid + 32]);
        v = reduce_max_op(v, __shfl_down_sync(0xffffffff, v, 16));
        v = reduce_max_op(v, __shfl_down_sync(0xffffffff, v, 8));
        v = reduce_max_op(v, __shfl_down_sync(0xffffffff, v, 4));
        v = reduce_max_op(v, __shfl_down_sync(0xffffffff, v, 2));
        v = reduce_max_op(v, __shfl_down_sync(0xffffffff, v, 1));
        if (tid == 0) partials[blockIdx.x] = v;
    }
}

// ─── Histogram (privatized atomic) ────────────────────────────────────────
// Each block keeps its own bin counts in shared memory; threads atomicAdd
// to shared (cheap, no contention beyond the ~32-way warp), then merge to
// global with one atomicAdd per bin per block. Caller passes bins as the
// dynamic shared-mem size in bytes (bins * 4); the kernel signature uses
// extern __shared__ to size the bins array at launch time.
//
// Top edge inclusive: a value exactly equal to maxv lands in the last bin.
// NaN and out-of-range values are dropped silently — matches the CPU
// histogram and numpy.histogram's convention.

extern "C" __global__ void histogram_f32(
    const float* __restrict__ in,
    unsigned int* __restrict__ out,
    unsigned int n,
    unsigned int bins,
    float minv,
    float maxv
) {
    extern __shared__ unsigned int sbins[];
    unsigned int tid = threadIdx.x;

    for (unsigned int i = tid; i < bins; i += blockDim.x) sbins[i] = 0;
    __syncthreads();

    float range = maxv - minv;
    float scale = range > 0.0f ? (float)bins / range : 0.0f;
    unsigned int idx = blockIdx.x * blockDim.x + tid;
    unsigned int stride = gridDim.x * blockDim.x;
    for (unsigned int i = idx; i < n; i += stride) {
        float v = in[i];
        if (isnan(v) || v < minv || v > maxv) continue;
        unsigned int bin = (unsigned int)((v - minv) * scale);
        if (bin >= bins) bin = bins - 1u;
        atomicAdd(&sbins[bin], 1u);
    }
    __syncthreads();

    for (unsigned int i = tid; i < bins; i += blockDim.x) {
        if (sbins[i] != 0u) atomicAdd(&out[i], sbins[i]);
    }
}

// ─── Inclusive prefix sum (scan) ──────────────────────────────────────────
// Three-kernel two-stage scan:
//
//   1. scan_block_inclusive_f32 — each block scans its own segment of
//      blockDim.x elements with Hillis-Steele in shared memory; thread 0
//      writes that block's grand total to blockSums[blockIdx.x].
//
//   2. scan_blocksums_inclusive_f32 — single-block inclusive scan over
//      blockSums (length numBlocks). Caller must launch with one block of
//      ceil(numBlocks)-rounded-up-to-power-of-2 threads. The result is
//      the cumulative offset that each block past the first needs to add
//      to its scanned segment.
//
//   3. scan_add_offsets_f32 — block i ≥ 1 picks up blockSums[i-1] (now
//      an exclusive offset relative to the global stream) and adds it to
//      every element of its segment.
//
// Block size 256 throughout. With one stage of block-sum scanning we
// support up to 256² = 65,536 elements per call. Larger inputs need
// either a recursive scan-of-scans or a host-side split — both are
// follow-up work; for now the launcher caps at 256² and routes larger
// inputs through the existing CPU reference.

extern "C" __global__ void scan_block_inclusive_f32(
    const float* __restrict__ in,
    float* __restrict__ out,
    float* __restrict__ blockSums,
    unsigned int n
) {
    __shared__ float sdata[256];
    unsigned int tid = threadIdx.x;
    unsigned int idx = blockIdx.x * blockDim.x + tid;

    sdata[tid] = (idx < n) ? in[idx] : 0.0f;
    __syncthreads();

    // Hillis-Steele inclusive scan: log2(blockDim.x) steps. At step s,
    // each thread tid >= s adds sdata[tid - s] into its slot. Need a
    // separate read-then-sync-then-write to avoid races.
    for (unsigned int s = 1; s < blockDim.x; s <<= 1) {
        float v = (tid >= s) ? sdata[tid - s] : 0.0f;
        __syncthreads();
        sdata[tid] += v;
        __syncthreads();
    }

    if (idx < n) out[idx] = sdata[tid];

    // Last thread of the block writes the block's total. Threads beyond
    // n contribute 0 so it's safe even on the tail block.
    if (tid == blockDim.x - 1u) blockSums[blockIdx.x] = sdata[tid];
}

// Single-block inclusive scan. Block size = numBlocks rounded up to a
// power of 2 (caller pads with zeroes). Used to convert per-block sums
// into per-block offsets.
extern "C" __global__ void scan_blocksums_inclusive_f32(
    float* __restrict__ blockSums,
    unsigned int numBlocks
) {
    __shared__ float sdata[1024];
    unsigned int tid = threadIdx.x;

    sdata[tid] = (tid < numBlocks) ? blockSums[tid] : 0.0f;
    __syncthreads();

    for (unsigned int s = 1; s < blockDim.x; s <<= 1) {
        float v = (tid >= s) ? sdata[tid - s] : 0.0f;
        __syncthreads();
        sdata[tid] += v;
        __syncthreads();
    }

    if (tid < numBlocks) blockSums[tid] = sdata[tid];
}

// Add prior-block offsets back to the per-block scanned values.
// Block i (i >= 1) adds blockSums[i-1] to every element of its segment.
extern "C" __global__ void scan_add_offsets_f32(
    float* __restrict__ out,
    const float* __restrict__ blockSums,
    unsigned int n
) {
    if (blockIdx.x == 0u) return;
    unsigned int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= n) return;
    out[idx] += blockSums[blockIdx.x - 1u];
}

// ─── argMin / argMax (index-of-extremum) ─────────────────────────────────
// Multi-block tournament. Each thread walks a strided slice of the input
// tracking its own (best_value, best_index) pair; threads then reduce
// into shared memory pairwise, with the lower index winning on equal
// values (matches JS .reduce()-with-< first-occurrence convention).
// Each block emits one (value, index) partial; the host scans the
// REDUCE_GRID partials for the global winner.
//
// NaN handling: skipped during the per-thread walk (NaN compares false
// to anything via lt / gt, so we won't accidentally pick it as the
// extremum). The host detects "no value found" (all-NaN input) and
// returns NaN to match the JS argMin / argMax conventions.
//
// Sentinel for "no value yet seen": index = 0xffffffff. The pairwise
// reducer treats sentinel-index as "lose any comparison".

extern "C" __global__ void argmin_grid_f32(
    const float* __restrict__ in,
    float* __restrict__ partial_v,
    unsigned int* __restrict__ partial_i,
    unsigned int n
) {
    __shared__ float sv[256];
    __shared__ unsigned int si[256];
    unsigned int tid = threadIdx.x;
    unsigned int idx = blockIdx.x * blockDim.x + tid;
    unsigned int stride = gridDim.x * blockDim.x;

    float bestV = F_INF;
    unsigned int bestI = 0xffffffffu;
    for (unsigned int i = idx; i < n; i += stride) {
        float v = in[i];
        if (isnan(v)) continue;
        if (bestI == 0xffffffffu || v < bestV || (v == bestV && i < bestI)) {
            bestV = v;
            bestI = i;
        }
    }
    sv[tid] = bestV;
    si[tid] = bestI;
    __syncthreads();

    for (unsigned int s = blockDim.x / 2; s > 0; s >>= 1) {
        if (tid < s) {
            float ov = sv[tid + s];
            unsigned int oi = si[tid + s];
            unsigned int mi = si[tid];
            float mv = sv[tid];
            bool better;
            if (oi == 0xffffffffu) better = false;
            else if (mi == 0xffffffffu) better = true;
            else if (ov < mv) better = true;
            else if (ov == mv && oi < mi) better = true;
            else better = false;
            if (better) {
                sv[tid] = ov;
                si[tid] = oi;
            }
        }
        __syncthreads();
    }

    if (tid == 0) {
        partial_v[blockIdx.x] = sv[0];
        partial_i[blockIdx.x] = si[0];
    }
}

// Variance — second pass given a precomputed mean: emit Σ(x - mean)²
// partials per block. The first pass is just reduce_sum_f32; the host
// turns the resulting sum into a mean, then launches this kernel and
// finally divides the post-launch partial sum by (n - ddof).
extern "C" __global__ void variance_sumsq_f32(
    const float* __restrict__ in,
    float* __restrict__ partials,
    unsigned int n,
    float mean
) {
    __shared__ float sdata[256];
    unsigned int tid = threadIdx.x;
    unsigned int idx = blockIdx.x * blockDim.x + tid;
    unsigned int stride = gridDim.x * blockDim.x;

    float acc = 0.0f;
    for (unsigned int i = idx; i < n; i += stride) {
        float d = in[i] - mean;
        acc += d * d;
    }
    sdata[tid] = acc;
    __syncthreads();

    for (unsigned int s = blockDim.x / 2; s > 32; s >>= 1) {
        if (tid < s) sdata[tid] += sdata[tid + s];
        __syncthreads();
    }
    if (tid < 32) {
        float v = sdata[tid] + sdata[tid + 32];
        v += __shfl_down_sync(0xffffffff, v, 16);
        v += __shfl_down_sync(0xffffffff, v, 8);
        v += __shfl_down_sync(0xffffffff, v, 4);
        v += __shfl_down_sync(0xffffffff, v, 2);
        v += __shfl_down_sync(0xffffffff, v, 1);
        if (tid == 0) partials[blockIdx.x] = v;
    }
}

extern "C" __global__ void argmax_grid_f32(
    const float* __restrict__ in,
    float* __restrict__ partial_v,
    unsigned int* __restrict__ partial_i,
    unsigned int n
) {
    __shared__ float sv[256];
    __shared__ unsigned int si[256];
    unsigned int tid = threadIdx.x;
    unsigned int idx = blockIdx.x * blockDim.x + tid;
    unsigned int stride = gridDim.x * blockDim.x;

    float bestV = F_NINF;
    unsigned int bestI = 0xffffffffu;
    for (unsigned int i = idx; i < n; i += stride) {
        float v = in[i];
        if (isnan(v)) continue;
        if (bestI == 0xffffffffu || v > bestV || (v == bestV && i < bestI)) {
            bestV = v;
            bestI = i;
        }
    }
    sv[tid] = bestV;
    si[tid] = bestI;
    __syncthreads();

    for (unsigned int s = blockDim.x / 2; s > 0; s >>= 1) {
        if (tid < s) {
            float ov = sv[tid + s];
            unsigned int oi = si[tid + s];
            unsigned int mi = si[tid];
            float mv = sv[tid];
            bool better;
            if (oi == 0xffffffffu) better = false;
            else if (mi == 0xffffffffu) better = true;
            else if (ov > mv) better = true;
            else if (ov == mv && oi < mi) better = true;
            else better = false;
            if (better) {
                sv[tid] = ov;
                si[tid] = oi;
            }
        }
        __syncthreads();
    }

    if (tid == 0) {
        partial_v[blockIdx.x] = sv[0];
        partial_i[blockIdx.x] = si[0];
    }
}
`;

type DevOpsFns = {
  embedLookup: bigint;
  rmsnorm: bigint;
  add: bigint;
  accum: bigint;
  biasAdd: bigint;
  siluMul: bigint;
  ropeNorm: bigint;
  ropeNeox: bigint;
  kvStore: bigint;
  attnScores: bigint;
  softmaxRow: bigint;
  attnOutput: bigint;
  argmax: bigint;
  matVec: bigint;
  matVecQ4K: bigint;
  matVecQ6K: bigint;
  embedLookupQ4K: bigint;
  embedLookupQ6K: bigint;
  flashAttn: bigint;
  conv2D: bigint;
  gaussianBlurRGBAu8: bigint;
  gaussianBlurRGBAu8Tiled: bigint;
  reduceSum: bigint;
  reduceMin: bigint;
  reduceMax: bigint;
  histogram: bigint;
  scanBlockInclusive: bigint;
  scanBlocksumsInclusive: bigint;
  scanAddOffsets: bigint;
  /** General-purpose multi-block argmin/argmax over arbitrary-N Float32Arrays.
   *  Distinct from the existing `argmax` field above, which is bun:llm's
   *  hand-written single-block argmax for sampling logits. */
  argminGrid: bigint;
  argmaxGrid: bigint;
  varianceSumsq: bigint;
};

let devOpsProbed = false;
let devOpsMod: bigint | null = null;
let devOpsFns: DevOpsFns | null = null;

function probeDevOps(): boolean {
  if (devOpsProbed) return devOpsFns !== null;
  devOpsProbed = true;

  if (!probe()) return false;
  if (!tryLoadNvrtc()) return false;

  const ns = nvrtcLib!.symbols;
  const cs = cudaLib!.symbols;
  const p = ffiPtr!;

  const srcBytes = new TextEncoder().encode(DEV_CUDA_SOURCE + "\0");
  const nameBytes = new TextEncoder().encode("parabun_devops.cu\0");
  const progBuf = new BigUint64Array(1);
  if (ns.nvrtcCreateProgram(p(progBuf), p(srcBytes), p(nameBytes), 0, null, null) !== 0) return false;
  const prog = progBuf[0];

  // --use_fast_math enables __expf/__sincosf intrinsics + FTZ — fine for
  // inference, matches ollama/llama.cpp's default build flags.
  const optStrs = ["--use_fast_math\0", "--std=c++14\0"].map(s => new TextEncoder().encode(s));
  const optPtrs = new BigUint64Array(optStrs.map(a => BigInt(p(a))));
  const compileResult = ns.nvrtcCompileProgram(prog, optStrs.length, p(optPtrs));
  if (compileResult !== 0) {
    const logSizeBuf = new BigUint64Array(1);
    if (ns.nvrtcGetProgramLogSize(prog, p(logSizeBuf)) === 0) {
      const logBytes = new Uint8Array(Number(logSizeBuf[0]));
      ns.nvrtcGetProgramLog(prog, p(logBytes));
      const end = logBytes.indexOf(0);
      console.error(
        `bun:gpu cuda: devOps NVRTC compile failed:\n${new TextDecoder().decode(logBytes.subarray(0, end < 0 ? logBytes.length : end))}`,
      );
    }
    ns.nvrtcDestroyProgram(p(progBuf));
    return false;
  }

  const ptxSizeBuf = new BigUint64Array(1);
  if (ns.nvrtcGetPTXSize(prog, p(ptxSizeBuf)) !== 0) {
    ns.nvrtcDestroyProgram(p(progBuf));
    return false;
  }
  const ptxBuf = new Uint8Array(Number(ptxSizeBuf[0]));
  if (ns.nvrtcGetPTX(prog, p(ptxBuf)) !== 0) {
    ns.nvrtcDestroyProgram(p(progBuf));
    return false;
  }
  ns.nvrtcDestroyProgram(p(progBuf));

  const modBuf = new BigUint64Array(1);
  if (cs.cuModuleLoadData(p(modBuf), p(ptxBuf)) !== 0) return false;
  devOpsMod = modBuf[0];

  const getFn = (name: string): bigint | null => {
    const nameBytes = new TextEncoder().encode(name + "\0");
    const fnBuf = new BigUint64Array(1);
    if (cs.cuModuleGetFunction(p(fnBuf), devOpsMod!, p(nameBytes)) !== 0) return null;
    return fnBuf[0];
  };

  const names: (keyof DevOpsFns)[] = [
    "embedLookup",
    "rmsnorm",
    "add",
    "accum",
    "biasAdd",
    "siluMul",
    "ropeNorm",
    "ropeNeox",
    "kvStore",
    "attnScores",
    "softmaxRow",
    "attnOutput",
    "argmax",
    "matVec",
    "matVecQ4K",
    "matVecQ6K",
    "embedLookupQ4K",
    "embedLookupQ6K",
    "flashAttn",
    "conv2D",
    "gaussianBlurRGBAu8",
    "gaussianBlurRGBAu8Tiled",
    "reduceSum",
    "reduceMin",
    "reduceMax",
    "histogram",
    "scanBlockInclusive",
    "scanBlocksumsInclusive",
    "scanAddOffsets",
    "argminGrid",
    "argmaxGrid",
    "varianceSumsq",
  ];
  const kernelNames: Record<keyof DevOpsFns, string> = {
    embedLookup: "embed_lookup_f32",
    rmsnorm: "rmsnorm_f32",
    add: "add_f32",
    accum: "accum_f32",
    biasAdd: "bias_add_f32",
    siluMul: "silu_mul_f32",
    ropeNorm: "rope_norm_f32",
    ropeNeox: "rope_neox_f32",
    kvStore: "kv_store_f32",
    attnScores: "attn_scores_f32",
    softmaxRow: "softmax_row_f32",
    attnOutput: "attn_output_f32",
    argmax: "argmax_f32",
    matVec: "matvec_f32x4",
    matVecQ4K: "matvec_q4k_f32",
    matVecQ6K: "matvec_q6k_f32",
    embedLookupQ4K: "embed_lookup_q4k_f32",
    embedLookupQ6K: "embed_lookup_q6k_f32",
    flashAttn: "flash_attn_f32",
    conv2D: "conv2d_f32",
    gaussianBlurRGBAu8: "gaussian_blur_rgba_u8",
    gaussianBlurRGBAu8Tiled: "gaussian_blur_rgba_u8_tiled",
    reduceSum: "reduce_sum_f32",
    reduceMin: "reduce_min_f32",
    reduceMax: "reduce_max_f32",
    histogram: "histogram_f32",
    scanBlockInclusive: "scan_block_inclusive_f32",
    scanBlocksumsInclusive: "scan_blocksums_inclusive_f32",
    scanAddOffsets: "scan_add_offsets_f32",
    argminGrid: "argmin_grid_f32",
    argmaxGrid: "argmax_grid_f32",
    varianceSumsq: "variance_sumsq_f32",
  };

  const fns = {} as DevOpsFns;
  for (const k of names) {
    const fn = getFn(kernelNames[k]);
    if (fn === null) {
      cs.cuModuleUnload(devOpsMod!);
      devOpsMod = null;
      console.error(`bun:gpu cuda: devOps missing kernel ${kernelNames[k]}`);
      return false;
    }
    fns[k] = fn;
  }
  devOpsFns = fns;
  return true;
}

// ─── GpuScratch: pure device buffer with no host view ─────────────────────
//
// Separate from GpuHandle because the residency story is opposite: a
// GpuHandle always has a host-side typed array (we `hold` a user's weight
// tensor); a GpuScratch is purely on device, allocated by us, never
// mirrored to host. Kept as a distinct type so we never accidentally try
// to read `.view` from scratch (would NPE), and so typechecks at the
// boundary catch misuse.

type GpuScratch = {
  __bunGpuScratch: true;
  backend: "cuda";
  type: "f32" | "i32";
  length: number;
  buffer: bigint;
  released: boolean;
  // Logical slice into another GpuScratch — shares the underlying device
  // allocation, so freeScratch() is a no-op.
  isSlice?: boolean;
};

function isGpuScratch(x: unknown): x is GpuScratch {
  return typeof x === "object" && x !== null && (x as any).__bunGpuScratch === true;
}

function devPtr(x: GpuScratch | GpuHandle): bigint {
  if (isGpuScratch(x)) {
    if (x.released) throw new Error("bun:gpu cuda: op on released scratch");
    return x.buffer;
  }
  if (x.released) throw new Error("bun:gpu cuda: op on released handle");
  if (x.buffer === 0n) throw new Error("bun:gpu cuda: handle has no device buffer");
  return x.buffer;
}

function allocScratch(length: number, type: "f32" | "i32" = "f32"): GpuScratch {
  if (!Number.isInteger(length) || length < 0) {
    throw new RangeError(`length must be a non-negative integer; got ${length}`);
  }
  if (!probe()) throw new Error("bun:gpu cuda: not available");
  const s = cudaLib!.symbols;
  const p = ffiPtr!;
  const bytes = BigInt(length * 4);
  const dPtrBuf = new BigUint64Array(1);
  if (length > 0 && s.cuMemAlloc_v2(p(dPtrBuf), bytes) !== 0) {
    throw new Error("bun:gpu cuda: cuMemAlloc(scratch) failed");
  }
  return {
    __bunGpuScratch: true,
    backend: "cuda",
    type,
    length,
    buffer: length > 0 ? dPtrBuf[0] : 0n,
    released: false,
  };
}

function scratchSlice(s: GpuScratch, elemOffset: number, length: number): GpuScratch {
  if (s.released) throw new Error("bun:gpu cuda: slice on released scratch");
  if (elemOffset < 0 || length < 0 || elemOffset + length > s.length) {
    throw new RangeError(`slice out of bounds: offset=${elemOffset}, length=${length}, total=${s.length}`);
  }
  return {
    __bunGpuScratch: true,
    backend: "cuda",
    type: s.type,
    length,
    buffer: s.buffer + BigInt(elemOffset * 4),
    released: false,
    isSlice: true,
  };
}

function freeScratch(s: GpuScratch): void {
  if (!isGpuScratch(s)) throw new TypeError("freeScratch expected a GpuScratch");
  if (s.released) return;
  if (s.isSlice) {
    s.released = true;
    return;
  }
  if (s.buffer !== 0n && cudaLib) cudaLib.symbols.cuMemFree_v2(s.buffer);
  s.buffer = 0n;
  s.released = true;
}

function uploadScratch(src: Float32Array | Int32Array, s: GpuScratch, dstElemOffset = 0): void {
  if (s.released) throw new Error("bun:gpu cuda: uploadScratch on released");
  if (dstElemOffset + src.length > s.length) {
    throw new RangeError(`uploadScratch: ${src.length} elems at offset ${dstElemOffset} > scratch length ${s.length}`);
  }
  if (src.length === 0) return;
  const sym = cudaLib!.symbols;
  const p = ffiPtr!;
  const bytes = BigInt(src.byteLength);
  const dst = s.buffer + BigInt(dstElemOffset * 4);
  if (sym.cuMemcpyHtoD_v2(dst, p(src), bytes) !== 0) {
    throw new Error("bun:gpu cuda: cuMemcpyHtoD(scratch) failed");
  }
}

function downloadScratch(s: GpuScratch, dst: Float32Array | Int32Array, srcElemOffset = 0): void {
  if (s.released) throw new Error("bun:gpu cuda: downloadScratch on released");
  if (srcElemOffset + dst.length > s.length) {
    throw new RangeError(
      `downloadScratch: ${dst.length} elems at offset ${srcElemOffset} > scratch length ${s.length}`,
    );
  }
  if (dst.length === 0) return;
  const sym = cudaLib!.symbols;
  const p = ffiPtr!;
  const bytes = BigInt(dst.byteLength);
  const src = s.buffer + BigInt(srcElemOffset * 4);
  if (sym.cuMemcpyDtoH_v2(p(dst), src, bytes) !== 0) {
    throw new Error("bun:gpu cuda: cuMemcpyDtoH(scratch) failed");
  }
}

// ─── Device-resident launch wrappers ──────────────────────────────────────
//
// Every launcher here takes device pointers (bigint) only — no HtoD/DtoH.
// Synchronization is the caller's responsibility; we only sync inside
// downloadScratch or argmax-result readback. The launcher helper inlines
// the FFI boilerplate so each kernel is five lines.

// ─── Fast launch path ─────────────────────────────────────────────────────
//
// Per-token the model launches ~350 kernels. Allocating typed-array param
// slots on every call burns ~3-7ms on GC + ffiPtr resolution. Instead each
// launcher owns a small pre-allocated bundle: 1 BigUint64Array per ptr slot,
// 1 Uint32Array per u32, 1 Float32Array per f32, plus cached BigInt
// pointers into each slot. cuLaunchKernel takes a single paramPtrs array
// (shared across all launchers — only the driver reads it synchronously).
//
// The address of paramPtrs is resolved once at init, and the scalar slot
// addresses are frozen at first-call lazy init. Each launcher mutates only
// scalar slot values + writes the N paramPtrs entries before calling
// cuLaunchKernel. Zero allocations per launch after warmup.

const PARAM_PTRS_MAX = 16;
let paramPtrs: BigUint64Array | null = null;
let paramPtrsAddr: number = 0;

type SlotKind = "ptr" | "u32" | "f32";
type KernelSlots = {
  nSlots: number;
  views: ArrayBufferView[];
  addrs: bigint[]; // addrs[i] === BigInt(ffiPtr(views[i]))
};

function makeSlots(kinds: SlotKind[]): KernelSlots {
  const p = ffiPtr!;
  if (!paramPtrs) {
    paramPtrs = new BigUint64Array(PARAM_PTRS_MAX);
    paramPtrsAddr = p(paramPtrs);
  }
  const views: ArrayBufferView[] = [];
  const addrs: bigint[] = [];
  for (const k of kinds) {
    const view: ArrayBufferView =
      k === "ptr" ? new BigUint64Array(1) : k === "u32" ? new Uint32Array(1) : new Float32Array(1);
    views.push(view);
    addrs.push(BigInt(p(view)));
  }
  return { nSlots: kinds.length, views, addrs };
}

function launchWith(
  fn: bigint,
  gx: number,
  gy: number,
  gz: number,
  bx: number,
  by: number,
  bz: number,
  s: KernelSlots,
): void {
  const pp = paramPtrs!;
  const addrs = s.addrs;
  for (let i = 0; i < s.nSlots; i++) pp[i] = addrs[i];
  const r = cudaLib!.symbols.cuLaunchKernel(fn, gx, gy, gz, bx, by, bz, 0, 0n, paramPtrsAddr, null);
  if (r !== 0) throw new Error(`bun:gpu cuda: cuLaunchKernel failed (${r})`);
}

function syncCtx(): void {
  if (cudaLib!.symbols.cuCtxSynchronize() !== 0) throw new Error("bun:gpu cuda: cuCtxSynchronize failed");
}

let slEmbed: KernelSlots | null = null;
let slEmbedQ4K: KernelSlots | null = null;
let slEmbedQ6K: KernelSlots | null = null;
function launchEmbedLookupDev(embd: GpuHandle, x: GpuScratch, tokenId: number, dModel: number): void {
  if (embd.qFormat === "q6_K") {
    const s = slEmbedQ6K ?? (slEmbedQ6K = makeSlots(["ptr", "ptr", "u32", "u32"]));
    (s.views[0] as BigUint64Array)[0] = devPtr(embd);
    (s.views[1] as BigUint64Array)[0] = devPtr(x);
    (s.views[2] as Uint32Array)[0] = tokenId;
    (s.views[3] as Uint32Array)[0] = dModel;
    launchWith(devOpsFns!.embedLookupQ6K, 1, 1, 1, 128, 1, 1, s);
    return;
  }
  if (embd.qFormat === "q4_K") {
    const s = slEmbedQ4K ?? (slEmbedQ4K = makeSlots(["ptr", "ptr", "u32", "u32"]));
    (s.views[0] as BigUint64Array)[0] = devPtr(embd);
    (s.views[1] as BigUint64Array)[0] = devPtr(x);
    (s.views[2] as Uint32Array)[0] = tokenId;
    (s.views[3] as Uint32Array)[0] = dModel;
    launchWith(devOpsFns!.embedLookupQ4K, 1, 1, 1, 128, 1, 1, s);
    return;
  }
  const s = slEmbed ?? (slEmbed = makeSlots(["ptr", "ptr", "u32", "u32"]));
  (s.views[0] as BigUint64Array)[0] = devPtr(embd);
  (s.views[1] as BigUint64Array)[0] = devPtr(x);
  (s.views[2] as Uint32Array)[0] = tokenId;
  (s.views[3] as Uint32Array)[0] = dModel;
  launchWith(devOpsFns!.embedLookup, ((dModel + 255) / 256) | 0, 1, 1, 256, 1, 1, s);
}

let slRmsnorm: KernelSlots | null = null;
function launchRmsnormDev(x: GpuScratch, w: GpuHandle | GpuScratch, y: GpuScratch, n: number, eps: number): void {
  const s = slRmsnorm ?? (slRmsnorm = makeSlots(["ptr", "ptr", "ptr", "u32", "f32"]));
  (s.views[0] as BigUint64Array)[0] = devPtr(x);
  (s.views[1] as BigUint64Array)[0] = devPtr(w);
  (s.views[2] as BigUint64Array)[0] = devPtr(y);
  (s.views[3] as Uint32Array)[0] = n;
  (s.views[4] as Float32Array)[0] = eps;
  // Single block. Pick size so there's plenty of work per thread but the
  // warp-reduce tree stays two-level (≤32 warps). dModel=2048 ⇒ 8 elems/thread.
  const bs = Math.min(1024, Math.max(32, 1 << Math.ceil(Math.log2(Math.max(32, Math.min(1024, n))))));
  launchWith(devOpsFns!.rmsnorm, 1, 1, 1, bs, 1, 1, s);
}

let slAccum: KernelSlots | null = null;
function launchAccumDev(x: GpuScratch, d: GpuScratch, n: number): void {
  const s = slAccum ?? (slAccum = makeSlots(["ptr", "ptr", "u32"]));
  (s.views[0] as BigUint64Array)[0] = devPtr(x);
  (s.views[1] as BigUint64Array)[0] = devPtr(d);
  (s.views[2] as Uint32Array)[0] = n;
  launchWith(devOpsFns!.accum, ((n + 255) / 256) | 0, 1, 1, 256, 1, 1, s);
}

let slBiasAdd: KernelSlots | null = null;
function launchBiasAddDev(x: GpuScratch, b: GpuHandle | GpuScratch, n: number): void {
  const s = slBiasAdd ?? (slBiasAdd = makeSlots(["ptr", "ptr", "u32"]));
  (s.views[0] as BigUint64Array)[0] = devPtr(x);
  (s.views[1] as BigUint64Array)[0] = devPtr(b);
  (s.views[2] as Uint32Array)[0] = n;
  launchWith(devOpsFns!.biasAdd, ((n + 255) / 256) | 0, 1, 1, 256, 1, 1, s);
}

let slSiluMul: KernelSlots | null = null;
function launchSiluMulDev(gate: GpuScratch, up: GpuScratch, n: number): void {
  const s = slSiluMul ?? (slSiluMul = makeSlots(["ptr", "ptr", "u32"]));
  (s.views[0] as BigUint64Array)[0] = devPtr(gate);
  (s.views[1] as BigUint64Array)[0] = devPtr(up);
  (s.views[2] as Uint32Array)[0] = n;
  launchWith(devOpsFns!.siluMul, ((n + 255) / 256) | 0, 1, 1, 256, 1, 1, s);
}

let slRope: KernelSlots | null = null;
function launchRopeDev(
  x: GpuScratch,
  invFreq: GpuScratch,
  nHeads: number,
  headDim: number,
  pos: number,
  mode: "norm" | "neox",
): void {
  const s = slRope ?? (slRope = makeSlots(["ptr", "ptr", "u32", "u32"]));
  (s.views[0] as BigUint64Array)[0] = devPtr(x);
  (s.views[1] as BigUint64Array)[0] = devPtr(invFreq);
  (s.views[2] as Uint32Array)[0] = headDim;
  (s.views[3] as Uint32Array)[0] = pos;
  const fn = mode === "neox" ? devOpsFns!.ropeNeox : devOpsFns!.ropeNorm;
  launchWith(fn, nHeads, 1, 1, headDim >> 1, 1, 1, s);
}

let slKVStore: KernelSlots | null = null;
function launchKVStoreDev(src: GpuScratch, cache: GpuScratch, pos: number, kvRowSize: number): void {
  const s = slKVStore ?? (slKVStore = makeSlots(["ptr", "ptr", "u32", "u32"]));
  (s.views[0] as BigUint64Array)[0] = devPtr(src);
  (s.views[1] as BigUint64Array)[0] = devPtr(cache);
  (s.views[2] as Uint32Array)[0] = pos;
  (s.views[3] as Uint32Array)[0] = kvRowSize;
  launchWith(devOpsFns!.kvStore, ((kvRowSize + 255) / 256) | 0, 1, 1, 256, 1, 1, s);
}

let slAttnScores: KernelSlots | null = null;
function launchAttnScoresDev(
  q: GpuScratch,
  kCache: GpuScratch,
  scores: GpuScratch,
  nHeads: number,
  headDim: number,
  kvRowSize: number,
  groupSize: number,
  scoreStride: number,
  ctxLen: number,
  scale: number,
): void {
  const s = slAttnScores ?? (slAttnScores = makeSlots(["ptr", "ptr", "ptr", "u32", "u32", "u32", "u32", "f32"]));
  (s.views[0] as BigUint64Array)[0] = devPtr(q);
  (s.views[1] as BigUint64Array)[0] = devPtr(kCache);
  (s.views[2] as BigUint64Array)[0] = devPtr(scores);
  (s.views[3] as Uint32Array)[0] = headDim;
  (s.views[4] as Uint32Array)[0] = kvRowSize;
  (s.views[5] as Uint32Array)[0] = groupSize;
  (s.views[6] as Uint32Array)[0] = scoreStride;
  (s.views[7] as Float32Array)[0] = scale;
  launchWith(devOpsFns!.attnScores, nHeads, ctxLen, 1, headDim, 1, 1, s);
}

let slSoftmax: KernelSlots | null = null;
function launchSoftmaxRowDev(scores: GpuScratch, rows: number, cols: number, stride: number): void {
  const s = slSoftmax ?? (slSoftmax = makeSlots(["ptr", "u32", "u32"]));
  (s.views[0] as BigUint64Array)[0] = devPtr(scores);
  (s.views[1] as Uint32Array)[0] = cols;
  (s.views[2] as Uint32Array)[0] = stride;
  // Pick a sensible block: next pow-2 ≥ cols, clamped to [32, 1024].
  const bs = Math.min(1024, Math.max(32, 1 << Math.ceil(Math.log2(Math.max(32, Math.min(1024, cols))))));
  launchWith(devOpsFns!.softmaxRow, rows, 1, 1, bs, 1, 1, s);
}

let slAttnOutput: KernelSlots | null = null;
function launchAttnOutputDev(
  scores: GpuScratch,
  vCache: GpuScratch,
  out: GpuScratch,
  nHeads: number,
  headDim: number,
  kvRowSize: number,
  groupSize: number,
  ctxLen: number,
  scoreStride: number,
): void {
  const s = slAttnOutput ?? (slAttnOutput = makeSlots(["ptr", "ptr", "ptr", "u32", "u32", "u32", "u32", "u32"]));
  (s.views[0] as BigUint64Array)[0] = devPtr(scores);
  (s.views[1] as BigUint64Array)[0] = devPtr(vCache);
  (s.views[2] as BigUint64Array)[0] = devPtr(out);
  (s.views[3] as Uint32Array)[0] = headDim;
  (s.views[4] as Uint32Array)[0] = kvRowSize;
  (s.views[5] as Uint32Array)[0] = groupSize;
  (s.views[6] as Uint32Array)[0] = ctxLen;
  (s.views[7] as Uint32Array)[0] = scoreStride;
  launchWith(devOpsFns!.attnOutput, nHeads, 1, 1, headDim, 1, 1, s);
}

// Fused flash-attention launcher. Replaces the attnScores + softmaxRow +
// attnOutput trio with a single dispatch: grid(nHeads), block aligned to a
// warp multiple ≥ headDim. Caller still owns Q, KV caches, and the output
// buffer; we never touch a scores scratch buffer.
let slFlashAttn: KernelSlots | null = null;
function launchFlashAttnDev(
  q: GpuScratch,
  kCache: GpuScratch,
  vCache: GpuScratch,
  out: GpuScratch,
  nHeads: number,
  headDim: number,
  kvRowSize: number,
  groupSize: number,
  ctxLen: number,
  scale: number,
): void {
  const s = slFlashAttn ?? (slFlashAttn = makeSlots(["ptr", "ptr", "ptr", "ptr", "u32", "u32", "u32", "u32", "f32"]));
  (s.views[0] as BigUint64Array)[0] = devPtr(q);
  (s.views[1] as BigUint64Array)[0] = devPtr(kCache);
  (s.views[2] as BigUint64Array)[0] = devPtr(vCache);
  (s.views[3] as BigUint64Array)[0] = devPtr(out);
  (s.views[4] as Uint32Array)[0] = headDim;
  (s.views[5] as Uint32Array)[0] = kvRowSize;
  (s.views[6] as Uint32Array)[0] = groupSize;
  (s.views[7] as Uint32Array)[0] = ctxLen;
  (s.views[8] as Float32Array)[0] = scale;
  // Block size: round headDim up to a warp multiple. The kernel uses
  // sQ[256]/sOut[256] — headDim must be ≤ 256.
  const block = Math.max(32, ((headDim + 31) >> 5) << 5);
  launchWith(devOpsFns!.flashAttn, nHeads, 1, 1, block, 1, 1, s);
}

let slArgmax: KernelSlots | null = null;
function launchArgmaxDev(logits: GpuScratch, outIdx: GpuScratch, n: number): void {
  const s = slArgmax ?? (slArgmax = makeSlots(["ptr", "ptr", "u32"]));
  (s.views[0] as BigUint64Array)[0] = devPtr(logits);
  (s.views[1] as BigUint64Array)[0] = devPtr(outIdx);
  (s.views[2] as Uint32Array)[0] = n;
  launchWith(devOpsFns!.argmax, 1, 1, 1, 1024, 1, 1, s);
}

// Device-resident matVec: y[r] = sum_c M[r*K + c] * x[c]. Uses the NVRTC-
// compiled matvec_f32x4 kernel: 128 threads per row, float4 loads (k must
// be a multiple of 4 — all Llama/Qwen2 dims we target already satisfy this).
// Falls back to the PTX matVecF32 if k is not aligned.
let slMatVec: KernelSlots | null = null;
let slMatVecPtx: KernelSlots | null = null;
let slMatVecQ4K: KernelSlots | null = null;
let slMatVecQ6K: KernelSlots | null = null;
function launchMatVecDev(mat: GpuHandle, x: GpuScratch, y: GpuScratch, m: number, k: number): void {
  if (mat.qFormat === "q4_K") {
    // On-chip dequant: 1 warp (32 threads) per row, 4 warps per block =
    // 128 threads per block, ⌈m/4⌉ blocks. Requires k % 256 == 0 —
    // validated at holdQ4K() time. m must be divisible by 4 for the
    // current kernel (all Llama projection rows match).
    const s = slMatVecQ4K ?? (slMatVecQ4K = makeSlots(["ptr", "ptr", "ptr", "u32", "u32"]));
    (s.views[0] as BigUint64Array)[0] = devPtr(mat);
    (s.views[1] as BigUint64Array)[0] = devPtr(x);
    (s.views[2] as BigUint64Array)[0] = devPtr(y);
    (s.views[3] as Uint32Array)[0] = m;
    (s.views[4] as Uint32Array)[0] = k >> 8;
    launchWith(devOpsFns!.matVecQ4K, (m + 3) >> 2, 1, 1, 128, 1, 1, s);
    return;
  }
  if (mat.qFormat === "q6_K") {
    const s = slMatVecQ6K ?? (slMatVecQ6K = makeSlots(["ptr", "ptr", "ptr", "u32", "u32"]));
    (s.views[0] as BigUint64Array)[0] = devPtr(mat);
    (s.views[1] as BigUint64Array)[0] = devPtr(x);
    (s.views[2] as BigUint64Array)[0] = devPtr(y);
    (s.views[3] as Uint32Array)[0] = m;
    (s.views[4] as Uint32Array)[0] = k >> 8;
    launchWith(devOpsFns!.matVecQ6K, (m + 3) >> 2, 1, 1, 128, 1, 1, s);
    return;
  }
  if ((k & 3) !== 0) {
    const s = slMatVecPtx ?? (slMatVecPtx = makeSlots(["ptr", "ptr", "ptr", "u32", "u32"]));
    (s.views[0] as BigUint64Array)[0] = devPtr(mat);
    (s.views[1] as BigUint64Array)[0] = devPtr(x);
    (s.views[2] as BigUint64Array)[0] = devPtr(y);
    (s.views[3] as Uint32Array)[0] = m;
    (s.views[4] as Uint32Array)[0] = k;
    launchWith(fnMatVecF32!, m, 1, 1, 32, 1, 1, s);
    return;
  }
  const s = slMatVec ?? (slMatVec = makeSlots(["ptr", "ptr", "ptr", "u32", "u32"]));
  (s.views[0] as BigUint64Array)[0] = devPtr(mat);
  (s.views[1] as BigUint64Array)[0] = devPtr(x);
  (s.views[2] as BigUint64Array)[0] = devPtr(y);
  (s.views[3] as Uint32Array)[0] = m;
  (s.views[4] as Uint32Array)[0] = k >> 2;
  launchWith(devOpsFns!.matVec, m, 1, 1, 128, 1, 1, s);
}

// Exposed devOps namespace. Returns null if NVRTC is unavailable — callers
// (bun:llm) must then fall back to the host-loop path.
function getDevOps(): DevOps | null {
  if (!probeDevOps()) return null;
  return {
    allocScratch,
    freeScratch,
    scratchSlice,
    uploadScratch,
    downloadScratch,
    sync: syncCtx,
    matVec: launchMatVecDev,
    embedLookup: launchEmbedLookupDev,
    rmsnorm: launchRmsnormDev,
    accum: launchAccumDev,
    biasAdd: launchBiasAddDev,
    siluMul: launchSiluMulDev,
    rope: launchRopeDev,
    kvStore: launchKVStoreDev,
    attnScores: launchAttnScoresDev,
    softmaxRow: launchSoftmaxRowDev,
    attnOutput: launchAttnOutputDev,
    flashAttn: launchFlashAttnDev,
    argmax: launchArgmaxDev,
  };
}

export type DevOps = {
  allocScratch(length: number, type?: "f32" | "i32"): GpuScratch;
  freeScratch(s: GpuScratch): void;
  scratchSlice(s: GpuScratch, elemOffset: number, length: number): GpuScratch;
  uploadScratch(src: Float32Array | Int32Array, s: GpuScratch, dstElemOffset?: number): void;
  downloadScratch(s: GpuScratch, dst: Float32Array | Int32Array, srcElemOffset?: number): void;
  sync(): void;
  matVec(mat: GpuHandle, x: GpuScratch, y: GpuScratch, m: number, k: number): void;
  embedLookup(embd: GpuHandle, x: GpuScratch, tokenId: number, dModel: number): void;
  rmsnorm(x: GpuScratch, w: GpuHandle | GpuScratch, y: GpuScratch, n: number, eps: number): void;
  accum(x: GpuScratch, d: GpuScratch, n: number): void;
  biasAdd(x: GpuScratch, b: GpuHandle | GpuScratch, n: number): void;
  siluMul(gate: GpuScratch, up: GpuScratch, n: number): void;
  rope(x: GpuScratch, invFreq: GpuScratch, nHeads: number, headDim: number, pos: number, mode: "norm" | "neox"): void;
  kvStore(src: GpuScratch, cache: GpuScratch, pos: number, kvRowSize: number): void;
  attnScores(
    q: GpuScratch,
    kCache: GpuScratch,
    scores: GpuScratch,
    nHeads: number,
    headDim: number,
    kvRowSize: number,
    groupSize: number,
    scoreStride: number,
    ctxLen: number,
    scale: number,
  ): void;
  softmaxRow(scores: GpuScratch, rows: number, cols: number, stride: number): void;
  attnOutput(
    scores: GpuScratch,
    vCache: GpuScratch,
    out: GpuScratch,
    nHeads: number,
    headDim: number,
    kvRowSize: number,
    groupSize: number,
    ctxLen: number,
    scoreStride: number,
  ): void;
  flashAttn(
    q: GpuScratch,
    kCache: GpuScratch,
    vCache: GpuScratch,
    out: GpuScratch,
    nHeads: number,
    headDim: number,
    kvRowSize: number,
    groupSize: number,
    ctxLen: number,
    scale: number,
  ): void;
  argmax(logits: GpuScratch, outIdx: GpuScratch, n: number): void;
};

export default {
  name: "cuda" as const,
  probe,
  winsForSize,
  dot,
  matVec,
  matmul,
  matmulBatched,
  conv2D,
  imageBlurRGBA,
  reduce,
  histogram,
  scan,
  argMin,
  argMax,
  variance,
  simdMap,
  alloc,
  isAligned,
  hold,
  holdQ4K,
  holdQ6K,
  releaseHandle,
  releasePinned,
  dispose,
  getDeviceName,
  calibrate,
  getDevOps,
};
