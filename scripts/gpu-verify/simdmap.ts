// End-to-end PTX bring-up for parabun:gpu CUDA backend.
//
// Run: bun bd --asan=off run scripts/gpu-verify/simdmap.ts
//
// ASAN must be off — it interferes with CUDA's signal handlers and cuInit
// fails with CUDA_ERROR_OUT_OF_MEMORY under asan-instrumented bun. The real
// CUDA backend lives in src/js/bun/gpu/cuda.ts; this script is the throwaway
// bring-up harness for iterating on PTX strings before extraction.
import { dlopen, FFIType, ptr } from "bun:ffi";

// ─── CUDA Driver API ──────────────────────────────────────────────────────
const cuda = dlopen("libcuda.so.1", {
  cuInit: { args: [FFIType.u32], returns: FFIType.i32 },
  cuDeviceGetCount: { args: [FFIType.ptr], returns: FFIType.i32 },
  cuDeviceGet: { args: [FFIType.ptr, FFIType.i32], returns: FFIType.i32 },
  cuDeviceGetName: { args: [FFIType.ptr, FFIType.i32, FFIType.i32], returns: FFIType.i32 },
  cuCtxCreate_v2: { args: [FFIType.ptr, FFIType.u32, FFIType.i32], returns: FFIType.i32 },
  cuCtxDestroy_v2: { args: [FFIType.u64], returns: FFIType.i32 },
  cuMemAlloc_v2: { args: [FFIType.ptr, FFIType.u64], returns: FFIType.i32 },
  cuMemFree_v2: { args: [FFIType.u64], returns: FFIType.i32 },
  cuMemcpyHtoD_v2: { args: [FFIType.u64, FFIType.ptr, FFIType.u64], returns: FFIType.i32 },
  cuMemcpyDtoH_v2: { args: [FFIType.ptr, FFIType.u64, FFIType.u64], returns: FFIType.i32 },
  cuModuleLoadData: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.i32 },
  cuModuleUnload: { args: [FFIType.u64], returns: FFIType.i32 },
  cuModuleGetFunction: { args: [FFIType.ptr, FFIType.u64, FFIType.ptr], returns: FFIType.i32 },
  cuLaunchKernel: {
    args: [
      FFIType.u64, // CUfunction
      FFIType.u32,
      FFIType.u32,
      FFIType.u32, // grid dims
      FFIType.u32,
      FFIType.u32,
      FFIType.u32, // block dims
      FFIType.u32, // shared mem bytes
      FFIType.u64, // stream (0 = default)
      FFIType.ptr, // kernelParams (void**)
      FFIType.ptr, // extra
    ],
    returns: FFIType.i32,
  },
  cuCtxSynchronize: { args: [], returns: FFIType.i32 },
  cuGetErrorString: { args: [FFIType.i32, FFIType.ptr], returns: FFIType.i32 },
});

function check(r: number, where: string): void {
  if (r === 0) return;
  // pull error name
  const strPtr = new BigUint64Array(1);
  cuda.symbols.cuGetErrorString(r, ptr(strPtr));
  throw new Error(`${where}: CUDA error ${r}`);
}

// ─── PTX: simdMap affine ──────────────────────────────────────────────────
// out[i] = k1 * in[i] + k0, one thread per element.
// Compiled-by-hand against the NVIDIA PTX ISA reference; loaded via the
// driver's PTX JIT (libnvidia-ptxjitcompiler.so), which validates syntax
// at cuModuleLoadData time and throws with a clear error if it's wrong.
const PTX_SIMDMAP = `
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

// ─── Bring-up ─────────────────────────────────────────────────────────────
check(cuda.symbols.cuInit(0), "cuInit");

const countBuf = new Int32Array(1);
check(cuda.symbols.cuDeviceGetCount(ptr(countBuf)), "cuDeviceGetCount");
console.log(`devices: ${countBuf[0]}`);

const devBuf = new Int32Array(1);
check(cuda.symbols.cuDeviceGet(ptr(devBuf), 0), "cuDeviceGet");
const device = devBuf[0];

const nameBuf = new Uint8Array(256);
cuda.symbols.cuDeviceGetName(ptr(nameBuf), nameBuf.length, device);
const nameEnd = nameBuf.indexOf(0);
console.log(`device 0: ${new TextDecoder().decode(nameBuf.subarray(0, nameEnd))}`);

const ctxBuf = new BigUint64Array(1);
check(cuda.symbols.cuCtxCreate_v2(ptr(ctxBuf), 0, device), "cuCtxCreate_v2");
const ctx = ctxBuf[0];

const ptxBytes = new TextEncoder().encode(PTX_SIMDMAP + "\0");
const modBuf = new BigUint64Array(1);
check(cuda.symbols.cuModuleLoadData(ptr(modBuf), ptr(ptxBytes)), "cuModuleLoadData");
const mod = modBuf[0];

const fnName = new TextEncoder().encode("simdMapAffineF32\0");
const fnBuf = new BigUint64Array(1);
check(cuda.symbols.cuModuleGetFunction(ptr(fnBuf), mod, ptr(fnName)), "cuModuleGetFunction");
const fn = fnBuf[0];

// Test data: y = 3*x + 1 over [0, 1, 2, ..., N-1]
const N = 1 << 20; // 1M elements = 4 MB
const host = new Float32Array(N);
for (let i = 0; i < N; i++) host[i] = i;
const K1 = 3;
const K0 = 1;

// Allocate device buffers
const dInBuf = new BigUint64Array(1);
const dOutBuf = new BigUint64Array(1);
check(cuda.symbols.cuMemAlloc_v2(ptr(dInBuf), BigInt(N * 4)), "cuMemAlloc(in)");
check(cuda.symbols.cuMemAlloc_v2(ptr(dOutBuf), BigInt(N * 4)), "cuMemAlloc(out)");
const dIn = dInBuf[0];
const dOut = dOutBuf[0];

check(cuda.symbols.cuMemcpyHtoD_v2(dIn, ptr(host), BigInt(N * 4)), "cuMemcpyHtoD");

// Pack kernel params: array of pointers to each param slot.
const pInBuf = new BigUint64Array([dIn]);
const pOutBuf = new BigUint64Array([dOut]);
const pN = new Uint32Array([N]);
const pK1 = new Float32Array([K1]);
const pK0 = new Float32Array([K0]);

const paramPtrs = new BigUint64Array([
  BigInt(ptr(pInBuf)),
  BigInt(ptr(pOutBuf)),
  BigInt(ptr(pN)),
  BigInt(ptr(pK1)),
  BigInt(ptr(pK0)),
]);

// Launch: block 256, grid covers N
const blockDim = 256;
const gridDim = Math.floor((N + blockDim - 1) / blockDim);
check(cuda.symbols.cuLaunchKernel(fn, gridDim, 1, 1, blockDim, 1, 1, 0, 0n, ptr(paramPtrs), null), "cuLaunchKernel");
check(cuda.symbols.cuCtxSynchronize(), "cuCtxSynchronize");

// Copy output back.
const out = new Float32Array(N);
check(cuda.symbols.cuMemcpyDtoH_v2(ptr(out), dOut, BigInt(N * 4)), "cuMemcpyDtoH");

// Verify.
let errs = 0;
for (let i = 0; i < N; i++) {
  const expected = K1 * i + K0;
  if (Math.abs(out[i] - expected) > 1e-3) {
    if (errs < 5) console.log(`mismatch @${i}: got ${out[i]}, expected ${expected}`);
    errs++;
  }
}
console.log(errs === 0 ? `OK: ${N} elements, y = 3*x + 1` : `FAIL: ${errs} mismatches`);

// Cleanup.
check(cuda.symbols.cuMemFree_v2(dIn), "cuMemFree(in)");
check(cuda.symbols.cuMemFree_v2(dOut), "cuMemFree(out)");
check(cuda.symbols.cuModuleUnload(mod), "cuModuleUnload");
check(cuda.symbols.cuCtxDestroy_v2(ctx), "cuCtxDestroy_v2");
