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
  releasePinned,
  dispose,
  getDeviceName,
};
