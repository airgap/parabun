// Parabun Metal backend for bun:gpu.
//
// Loaded by src/js/bun/gpu.ts — exposes a `Backend`-conforming object that
// drives Apple Silicon (and Intel Mac) GPUs via Metal. We reach Metal
// through C entry points from:
//   - /System/Library/Frameworks/Metal.framework/Metal (MTLCreateSystemDefaultDevice)
//   - /usr/lib/libobjc.A.dylib (objc_getClass, sel_registerName, objc_msgSend)
//
// Every non-bootstrap Metal call (newCommandQueue,
// newLibraryWithSource:options:error:, …) is an Obj-C message send
// dispatched through objc_msgSend. arm64 uses a single objc_msgSend
// symbol for all message signatures — the ABI is dictated by the call
// site — so we dlopen libobjc once per distinct `(args, returns)` shape
// we need; each opens the same underlying function with a different
// bun:ffi wrapper.
//
// Scope today: simdMap-affine (y = k1*x + k0) on Float32Array — the one
// kernel proven end-to-end against the MSL compiler + a roundtrip. dot,
// matVec, matmul fall back to bun:simd, matching the CUDA backend's
// Phase-1 shape.
//
// Memory: the MSL source is compiled in probe(). The resulting library,
// function, pipeline, and queue are held for the backend's lifetime.
// Per-dispatch MTLBuffers are allocated + released inside launchAffineF32
// with try/finally. dispose() releases all retained Obj-C objects.

const simd = require("../simd.ts");

type FArray = Float32Array | Float64Array;

// Opaque handle returned by `hold(arr)`. Carries a resident MTLBuffer so
// that subsequent matVec calls skip both the memcpy and the MTLBuffer
// allocation. The brand property lets gpu.ts pass handles through
// `FArray | GpuHandle` union sites and detect them cheaply.
type GpuHandle = {
  __bunGpuHandle: true;
  backend: "metal" | "cuda" | "cpu";
  type: "f32" | "f64";
  length: number;
  buffer: bigint; // MTLBuffer id (0n once released or on non-Metal hosts)
  view: FArray; // Original typed array — kept alive so the NOCOPY pointer stays valid
  released: boolean;
};

function isGpuHandle(x: unknown): x is GpuHandle {
  return typeof x === "object" && x !== null && (x as any).__bunGpuHandle === true;
}

// Unwrap a handle or pass-through a typed array. Throws on released
// handles so use-after-release is a consistent error across every op,
// not just matVec.
function unwrapHandle<T extends FArray>(x: T | GpuHandle): T {
  if (isGpuHandle(x)) {
    if (x.released) throw new Error("bun:gpu: op called on released handle");
    return x.view as T;
  }
  return x;
}

const LIBOBJC = "/usr/lib/libobjc.A.dylib";
const METAL_FRAMEWORK = "/System/Library/Frameworks/Metal.framework/Metal";

// ─── MSL kernel ───────────────────────────────────────────────────────────
// Mirrors the PTX kernel in ./cuda.ts — one thread per element, guarded
// by a bounds check. fma matches the numeric behavior of CUDA's fma.rn.f32
// within rounding (Metal's default fp math is precise on Apple GPUs).

const MSL_SOURCE = `
#include <metal_stdlib>
using namespace metal;

kernel void simdMapAffineF32(
    device const float *inPtr     [[buffer(0)]],
    device       float *outPtr    [[buffer(1)]],
    constant     uint  &n         [[buffer(2)]],
    constant     float &k1        [[buffer(3)]],
    constant     float &k0        [[buffer(4)]],
    uint                gid       [[thread_position_in_grid]])
{
    if (gid >= n) return;
    outPtr[gid] = fma(k1, inPtr[gid], k0);
}

// Row-major M x K matrix times a K-vector -> M-vector.
//
// Each threadgroup is exactly one simdgroup (32 threads on Apple Silicon)
// handling exactly one output row. The 32 lanes split the K-column dot
// product stride-wise — lane t reads r[t], r[t+32], r[t+64], ... — then
// simd_sum tree-reduces the 32 partial sums into one value that lane 0
// writes to outPtr[row].
//
// Why this beats the naive one-thread-per-row version: coalescing. With
// 32 threads of one simdgroup reading mat[row*K + {j, j+1, ..., j+31}] in
// lockstep, the GPU issues one 128-byte load per iteration instead of 32
// stride-K loads. Same for vec[]. The FMA count per row is unchanged (K)
// but effective memory bandwidth doubles-to-triples on M-series.
//
// The tree reduction in simd_sum produces a different rounding order
// from bun:simd's left-to-right accumulator, so outputs may differ from
// simd.matVec by up to a few ULP — the cross-check tolerates this.
kernel void matVecF32(
    device const float *mat       [[buffer(0)]],
    device const float *vec       [[buffer(1)]],
    device       float *outPtr    [[buffer(2)]],
    constant     uint  &m         [[buffer(3)]],
    constant     uint  &k         [[buffer(4)]],
    uint                row       [[threadgroup_position_in_grid]],
    uint                lane      [[thread_position_in_threadgroup]])
{
    if (row >= m) return;
    device const float *r = mat + (ulong)row * k;
    float acc = 0.0f;
    for (uint j = lane; j < k; j += 32) acc = fma(r[j], vec[j], acc);
    acc = simd_sum(acc);
    if (lane == 0) outPtr[row] = acc;
}

// Row-major matmul: C[m, n] = A[m, k] @ B[k, n].
//
// 32x32 output tile per threadgroup, one thread per output cell (1024
// threads = the Apple GPU max-per-threadgroup limit). We walk K in 32-wide
// strips, co-loading the A-tile and B-tile into threadgroup memory, then
// each thread does 32 FMAs into its private accumulator.
//
// Shape vs the CUDA PTX kernel: CUDA uses 64 threads with a 4x4 register
// tile per thread for the same 32x32 output tile; Metal's simdgroup width
// is 32 and register files are larger per-thread, but 1024 threads/TG is
// the hard cap, so we use one-thread-per-cell here. Same output shape,
// different work-per-thread. For the shapes bun:gpu targets (Q @ E^T in
// retrieval workloads: M=Q≈64, K=D=384, N=100k) the bottleneck is the
// 9.6 GB SMEM + register fill, not the FMA rate — the simpler kernel
// should hit the same memory ceiling.
kernel void matmulF32(
    device const float *A         [[buffer(0)]],
    device const float *B         [[buffer(1)]],
    device       float *C         [[buffer(2)]],
    constant     uint  &M         [[buffer(3)]],
    constant     uint  &K         [[buffer(4)]],
    constant     uint  &N         [[buffer(5)]],
    uint2               gid       [[threadgroup_position_in_grid]],
    uint2               lid       [[thread_position_in_threadgroup]])
{
    constexpr uint TS = 32u;
    threadgroup float As[TS][TS];
    threadgroup float Bs[TS][TS];

    uint row = gid.y * TS + lid.y;
    uint col = gid.x * TS + lid.x;

    float acc = 0.0f;
    for (uint t = 0; t < K; t += TS) {
        uint aCol = t + lid.x;
        uint bRow = t + lid.y;
        As[lid.y][lid.x] = (row < M && aCol < K) ? A[(ulong)row * K + aCol] : 0.0f;
        Bs[lid.y][lid.x] = (bRow < K && col < N) ? B[(ulong)bRow * N + col] : 0.0f;
        threadgroup_barrier(mem_flags::mem_threadgroup);
        for (uint s = 0; s < TS; s++) acc = fma(As[lid.y][s], Bs[s][lid.x], acc);
        threadgroup_barrier(mem_flags::mem_threadgroup);
    }

    if (row < M && col < N) C[(ulong)row * N + col] = acc;
}
`;

// ─── FFI: base symbols ─────────────────────────────────────────────────────
// Anything not requiring objc_msgSend lives here. We use separate dlopen
// calls below for each objc_msgSend signature we need.

type MetalSymbols = {
  MTLCreateSystemDefaultDevice: () => bigint;
};

type ObjcBaseSymbols = {
  sel_registerName: (name: number) => bigint;
  objc_getClass: (name: number) => bigint;
};

type MsgSend_id_SEL = (self: bigint, op: bigint) => bigint;
type MsgSend_id_SEL_id = (self: bigint, op: bigint, a1: bigint) => bigint;
type MsgSend_id_SEL_id_id_ptr = (self: bigint, op: bigint, a1: bigint, a2: bigint, a3: number | null) => bigint;
type MsgSend_id_SEL_id_ptr = (self: bigint, op: bigint, a1: bigint, a2: number | null) => bigint;
type MsgSend_id_SEL_id_u64_u64 = (self: bigint, op: bigint, a1: bigint, a2: bigint, a3: bigint) => bigint;
type MsgSend_id_SEL_ptr_u64_u64 = (self: bigint, op: bigint, a1: number, a2: bigint, a3: bigint) => void;
type MsgSend_id_SEL_ptr_u64_u64_ret = (self: bigint, op: bigint, a1: number, a2: bigint, a3: bigint) => bigint;
type MsgSend_id_SEL_u64_u64 = (self: bigint, op: bigint, a1: bigint, a2: bigint) => bigint;
type MsgSend_id_SEL_ptr_ptr = (self: bigint, op: bigint, a1: number, a2: number) => void;
// newBufferWithBytesNoCopy:length:options:deallocator: — 6 args, all u64,
// returns id. The `deallocator` block is passed as 0n (nil) since alloc()
// owns the memory for the backend's lifetime.
type MsgSend_id_SEL_u64_u64_u64_u64 = (
  self: bigint,
  op: bigint,
  a1: bigint,
  a2: bigint,
  a3: bigint,
  a4: bigint,
) => bigint;

let metalLib: { symbols: MetalSymbols; close: () => void } | null = null;
let objcBase: { symbols: ObjcBaseSymbols; close: () => void } | null = null;
let ffiPtr: ((x: any) => number) | null = null;
let ffiToArrayBuffer: ((ptr: number, off: number, len: number) => ArrayBuffer) | null = null;
let CStringCtor: any = null;

// Typed objc_msgSend variants. Each is the SAME underlying libobjc symbol
// loaded under a different bun:ffi type signature — arm64's objc_msgSend
// has no vararg runtime dispatch, so this is safe.
let msgSend_2: MsgSend_id_SEL | null = null; // (id, SEL) -> id
let msgSend_3_id: MsgSend_id_SEL_id | null = null; // (id, SEL, id) -> id
let msgSend_4_id_ptr: MsgSend_id_SEL_id_ptr | null = null; // (id, SEL, id, ptr) -> id
let msgSend_5_id_id_ptr: MsgSend_id_SEL_id_id_ptr | null = null; // (id, SEL, id, id, ptr) -> id
let msgSend_5_id_u64_u64: MsgSend_id_SEL_id_u64_u64 | null = null; // (id, SEL, id, u64, u64) -> void
let msgSend_5_ptr_u64_u64: MsgSend_id_SEL_ptr_u64_u64 | null = null; // (id, SEL, ptr, u64, u64) -> void (setBytes:length:atIndex:)
let msgSend_5_ptr_u64_u64_ret: MsgSend_id_SEL_ptr_u64_u64_ret | null = null; // same shape, but id return (newBufferWithBytes:length:options:)
let msgSend_4_u64_u64: MsgSend_id_SEL_u64_u64 | null = null; // (id, SEL, u64, u64) -> id
let msgSend_4_ptr_ptr: MsgSend_id_SEL_ptr_ptr | null = null; // (id, SEL, ptr, ptr) -> void
let msgSend_6_u64x4: MsgSend_id_SEL_u64_u64_u64_u64 | null = null; // newBufferWithBytesNoCopy:length:options:deallocator:

// libc bindings for page-aligned allocation (posix_memalign + getpagesize).
// Loaded lazily inside tryLoad() to avoid paying the dlopen cost on non-
// darwin hosts or when alloc() is never called.
type LibcSymbols = {
  posix_memalign: (out: number, alignment: bigint, size: bigint) => number;
  free: (ptr: bigint) => void;
  getpagesize: () => number;
};
let libc: { symbols: LibcSymbols; close: () => void } | null = null;
let pageSize = 16384;

// ─── State ────────────────────────────────────────────────────────────────

let probed = false;
let probeResult = false;
let device: bigint = 0n;
let deviceName = "";
// [device hasUnifiedMemory] — true on Apple Silicon (the CPU and GPU share a
// single physical DRAM pool, so Shared-storage MTLBuffers are truly
// zero-copy) and false on discrete-GPU Intel Macs (where Shared storage
// still works but the driver DMAs over PCIe on each dispatch, which is
// what the ticket's 2-4× claim is calibrated *against*). The probe result
// is informational today — the backend uses Shared everywhere regardless —
// but callers can read it via getHasUnifiedMemory() to decide whether to
// bother staging inputs through alloc() + hold() for the NOCOPY path.
let hasUnifiedMemory = false;
let commandQueue: bigint = 0n;
let metalLibraryObj: bigint = 0n;
// simdMap kernel
let simdMapFn: bigint = 0n;
let simdMapPipeline: bigint = 0n;
let simdMapMaxTg = 1024;
// matVec kernel — threadgroup size is fixed at 32 (one simdgroup on
// Apple Silicon), so the pipeline's maxTotalThreadsPerThreadgroup is
// probed but not consulted at launch time.
let matVecFn: bigint = 0n;
let matVecPipeline: bigint = 0n;
let matmulFn: bigint = 0n;
let matmulPipeline: bigint = 0n;

function tryLoad(): boolean {
  if (metalLib !== null && objcBase !== null) return true;
  try {
    const { dlopen, FFIType, ptr, CString, toArrayBuffer } = require("../ffi.ts");
    ffiPtr = ptr;
    CStringCtor = CString;
    ffiToArrayBuffer = toArrayBuffer;

    metalLib = dlopen(METAL_FRAMEWORK, {
      MTLCreateSystemDefaultDevice: { args: [], returns: FFIType.u64 },
    }) as any;

    objcBase = dlopen(LIBOBJC, {
      sel_registerName: { args: [FFIType.ptr], returns: FFIType.u64 },
      objc_getClass: { args: [FFIType.ptr], returns: FFIType.u64 },
    }) as any;

    // Per-signature objc_msgSend wrappers — same underlying symbol,
    // different bun:ffi marshaling. arm64 has one objc_msgSend address;
    // each dlopen produces an independent JIT wrapper.
    msgSend_2 = dlopen(LIBOBJC, {
      objc_msgSend: { args: [FFIType.u64, FFIType.u64], returns: FFIType.u64 },
    }).symbols.objc_msgSend as any;
    msgSend_3_id = dlopen(LIBOBJC, {
      objc_msgSend: { args: [FFIType.u64, FFIType.u64, FFIType.u64], returns: FFIType.u64 },
    }).symbols.objc_msgSend as any;
    msgSend_4_id_ptr = dlopen(LIBOBJC, {
      objc_msgSend: { args: [FFIType.u64, FFIType.u64, FFIType.u64, FFIType.ptr], returns: FFIType.u64 },
    }).symbols.objc_msgSend as any;
    msgSend_5_id_id_ptr = dlopen(LIBOBJC, {
      objc_msgSend: {
        args: [FFIType.u64, FFIType.u64, FFIType.u64, FFIType.u64, FFIType.ptr],
        returns: FFIType.u64,
      },
    }).symbols.objc_msgSend as any;
    msgSend_5_id_u64_u64 = dlopen(LIBOBJC, {
      objc_msgSend: {
        args: [FFIType.u64, FFIType.u64, FFIType.u64, FFIType.u64, FFIType.u64],
        returns: FFIType.void,
      },
    }).symbols.objc_msgSend as any;
    msgSend_5_ptr_u64_u64 = dlopen(LIBOBJC, {
      objc_msgSend: {
        args: [FFIType.u64, FFIType.u64, FFIType.ptr, FFIType.u64, FFIType.u64],
        returns: FFIType.void,
      },
    }).symbols.objc_msgSend as any;
    msgSend_5_ptr_u64_u64_ret = dlopen(LIBOBJC, {
      objc_msgSend: {
        args: [FFIType.u64, FFIType.u64, FFIType.ptr, FFIType.u64, FFIType.u64],
        returns: FFIType.u64,
      },
    }).symbols.objc_msgSend as any;
    msgSend_4_u64_u64 = dlopen(LIBOBJC, {
      objc_msgSend: { args: [FFIType.u64, FFIType.u64, FFIType.u64, FFIType.u64], returns: FFIType.u64 },
    }).symbols.objc_msgSend as any;
    msgSend_4_ptr_ptr = dlopen(LIBOBJC, {
      objc_msgSend: { args: [FFIType.u64, FFIType.u64, FFIType.ptr, FFIType.ptr], returns: FFIType.void },
    }).symbols.objc_msgSend as any;
    msgSend_6_u64x4 = dlopen(LIBOBJC, {
      objc_msgSend: {
        args: [FFIType.u64, FFIType.u64, FFIType.u64, FFIType.u64, FFIType.u64, FFIType.u64],
        returns: FFIType.u64,
      },
    }).symbols.objc_msgSend as any;

    libc = dlopen("libc.dylib", {
      posix_memalign: { args: [FFIType.ptr, FFIType.u64, FFIType.u64], returns: FFIType.i32 },
      free: { args: [FFIType.u64], returns: FFIType.void },
      getpagesize: { args: [], returns: FFIType.i32 },
    }) as any;
    pageSize = libc!.symbols.getpagesize();

    return true;
  } catch {
    metalLib = null;
    objcBase = null;
    libc = null;
    return false;
  }
}

// ─── Selector cache ────────────────────────────────────────────────────────

const selCache = new Map<string, bigint>();
function sel(name: string): bigint {
  const hit = selCache.get(name);
  if (hit !== undefined) return hit;
  const bytes = new TextEncoder().encode(name + "\0");
  const s = objcBase!.symbols.sel_registerName(ffiPtr!(bytes));
  selCache.set(name, s);
  return s;
}

function cls(name: string): bigint {
  const bytes = new TextEncoder().encode(name + "\0");
  return objcBase!.symbols.objc_getClass(ffiPtr!(bytes));
}

// NSString from a UTF-8 buffer: [[NSString alloc] initWithUTF8String:]
function nsstring(text: string): bigint {
  const nsStringCls = cls("NSString");
  if (nsStringCls === 0n) return 0n;
  const allocated = msgSend_2!(nsStringCls, sel("alloc"));
  if (allocated === 0n) return 0n;
  const bytes = new TextEncoder().encode(text + "\0");
  return msgSend_3_id!(allocated, sel("initWithUTF8String:"), BigInt(ffiPtr!(bytes)));
}

function objcRelease(obj: bigint): void {
  if (obj !== 0n) msgSend_2!(obj, sel("release"));
}

// ─── Probe + one-time kernel compile ───────────────────────────────────────

function probe(): boolean {
  if (probed) return probeResult;
  probed = true;
  if (process.platform !== "darwin") return false;
  if (!tryLoad()) return false;

  const dev = metalLib!.symbols.MTLCreateSystemDefaultDevice();
  if (dev === 0n) return false;
  device = dev;

  // [[device name] UTF8String] → const char*
  const nsstr = msgSend_2!(dev, sel("name"));
  if (nsstr !== 0n) {
    const cstr = msgSend_2!(nsstr, sel("UTF8String"));
    if (cstr !== 0n) {
      try {
        deviceName = String(new CStringCtor(Number(cstr)));
      } catch {
        deviceName = "";
      }
    }
  }

  // hasUnifiedMemory is an MTLDevice BOOL property (macOS 10.15+). BOOL
  // on arm64 returns in the low byte of x0; objc_msgSend returning u64
  // zero-extends, so !== 0n is the correct truthiness test.
  hasUnifiedMemory = msgSend_2!(dev, sel("hasUnifiedMemory")) !== 0n;

  // Compile MSL: [device newLibraryWithSource:source options:nil error:&err]
  // `error` is an NSError** out-param — we pass null and inspect the return.
  const source = nsstring(MSL_SOURCE);
  if (source === 0n) return false;
  const lib = msgSend_5_id_id_ptr!(dev, sel("newLibraryWithSource:options:error:"), source, 0n, null);
  objcRelease(source);
  if (lib === 0n) return false;
  metalLibraryObj = lib;

  // Compile both pipelines from the single library. One failure on either
  // pipeline unwinds everything — we either have both kernels or neither.
  const sm = compileKernel(lib, "simdMapAffineF32");
  if (sm === null) {
    objcRelease(lib);
    metalLibraryObj = 0n;
    return false;
  }
  simdMapFn = sm.fn;
  simdMapPipeline = sm.pipe;
  simdMapMaxTg = sm.maxTg;

  const mv = compileKernel(lib, "matVecF32");
  if (mv === null) {
    objcRelease(simdMapPipeline);
    objcRelease(simdMapFn);
    objcRelease(lib);
    simdMapPipeline = 0n;
    simdMapFn = 0n;
    metalLibraryObj = 0n;
    return false;
  }
  matVecFn = mv.fn;
  matVecPipeline = mv.pipe;

  const mm = compileKernel(lib, "matmulF32");
  if (mm === null) {
    objcRelease(matVecPipeline);
    objcRelease(matVecFn);
    objcRelease(simdMapPipeline);
    objcRelease(simdMapFn);
    objcRelease(lib);
    matVecPipeline = 0n;
    matVecFn = 0n;
    simdMapPipeline = 0n;
    simdMapFn = 0n;
    metalLibraryObj = 0n;
    return false;
  }
  matmulFn = mm.fn;
  matmulPipeline = mm.pipe;

  const queue = msgSend_2!(dev, sel("newCommandQueue"));
  if (queue === 0n) {
    objcRelease(matmulPipeline);
    objcRelease(matmulFn);
    objcRelease(matVecPipeline);
    objcRelease(matVecFn);
    objcRelease(simdMapPipeline);
    objcRelease(simdMapFn);
    objcRelease(lib);
    matmulPipeline = 0n;
    matmulFn = 0n;
    matVecPipeline = 0n;
    matVecFn = 0n;
    simdMapPipeline = 0n;
    simdMapFn = 0n;
    metalLibraryObj = 0n;
    return false;
  }
  commandQueue = queue;

  probeResult = true;
  return true;
}

function compileKernel(lib: bigint, name: string): { fn: bigint; pipe: bigint; maxTg: number } | null {
  const nsName = nsstring(name);
  if (nsName === 0n) return null;
  const fn = msgSend_3_id!(lib, sel("newFunctionWithName:"), nsName);
  objcRelease(nsName);
  if (fn === 0n) return null;
  const pipe = msgSend_4_id_ptr!(device, sel("newComputePipelineStateWithFunction:error:"), fn, null);
  if (pipe === 0n) {
    objcRelease(fn);
    return null;
  }
  let maxTg = 1024;
  try {
    const t = msgSend_2!(pipe, sel("maxTotalThreadsPerThreadgroup"));
    if (t !== 0n) maxTg = Number(t);
  } catch {}
  return { fn, pipe, maxTg };
}

// ─── Affine detector (mirrors cuda.ts / simd.ts) ───────────────────────────
// Four-point probe (x=-1,0,1,2) catches piecewise functions like relu.

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

// MTLResourceOptions flags. StorageModeShared (0) makes the buffer CPU- and
// GPU-accessible on Apple Silicon with zero-copy — no explicit synchronize
// needed for the sizes we're working with. (Old AMD Macs would prefer
// Managed, but this backend's primary target is Apple Silicon.)
const MTL_STORAGE_MODE_SHARED = 0;

// ─── Kernel launch: simdMapAffineF32 ───────────────────────────────────────

function launchAffineF32(a: Float32Array, k1: number, k0: number): Float32Array {
  const n = a.length;
  const bytes = BigInt(n * 4);

  // newBufferWithBytes:length:options: — copies `a` into GPU-visible memory.
  const inBuf = msgSend_5_ptr_u64_u64_ret!(
    device,
    sel("newBufferWithBytes:length:options:"),
    ffiPtr!(a),
    bytes,
    BigInt(MTL_STORAGE_MODE_SHARED),
  );
  if (inBuf === 0n) throw new Error("bun:gpu metal: newBufferWithBytes failed");

  let outBuf: bigint = 0n;
  let cmdBuf: bigint = 0n;
  let encoder: bigint = 0n;
  try {
    outBuf = msgSend_4_u64_u64!(device, sel("newBufferWithLength:options:"), bytes, BigInt(MTL_STORAGE_MODE_SHARED));
    if (outBuf === 0n) throw new Error("bun:gpu metal: newBufferWithLength failed");

    cmdBuf = msgSend_2!(commandQueue, sel("commandBuffer"));
    if (cmdBuf === 0n) throw new Error("bun:gpu metal: commandBuffer failed");

    encoder = msgSend_2!(cmdBuf, sel("computeCommandEncoder"));
    if (encoder === 0n) throw new Error("bun:gpu metal: computeCommandEncoder failed");

    // setComputePipelineState:
    msgSend_3_id!(encoder, sel("setComputePipelineState:"), simdMapPipeline);
    // setBuffer:offset:atIndex: for in=0, out=1
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), inBuf, 0n, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), outBuf, 0n, 1n);
    // setBytes:length:atIndex: for n, k1, k0 at buffer indices 2/3/4
    const pN = new Uint32Array([n]);
    const pK1 = new Float32Array([k1]);
    const pK0 = new Float32Array([k0]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pN), 4n, 2n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pK1), 4n, 3n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pK0), 4n, 4n);

    // dispatchThreads:threadsPerThreadgroup: takes two MTLSize (3× u64)
    // structs by value. On arm64, aggregates >16 bytes are passed via
    // indirect reference — we hand over the address of our packed
    // BigUint64Array and the ABI treats that as the by-value struct.
    const tgSize = Math.min(simdMapMaxTg, 256);
    const grid = new BigUint64Array([BigInt(n), 1n, 1n]);
    const threads = new BigUint64Array([BigInt(tgSize), 1n, 1n]);
    msgSend_4_ptr_ptr!(encoder, sel("dispatchThreads:threadsPerThreadgroup:"), ffiPtr!(grid), ffiPtr!(threads));

    msgSend_2!(encoder, sel("endEncoding"));
    msgSend_2!(cmdBuf, sel("commit"));
    msgSend_2!(cmdBuf, sel("waitUntilCompleted"));

    // Copy out: [outBuf contents] → void*, then read n*4 bytes.
    const contents = msgSend_2!(outBuf, sel("contents"));
    if (contents === 0n) throw new Error("bun:gpu metal: outBuf contents is null");
    const out = new Float32Array(n);
    const view = new Float32Array(ffiToArrayBuffer!(Number(contents), 0, n * 4));
    out.set(view);
    return out;
  } finally {
    // encoder is auto-released on endEncoding; command buffer is
    // auto-released by the queue when complete. Buffers we created with
    // `new…` need explicit release.
    objcRelease(inBuf);
    if (outBuf !== 0n) objcRelease(outBuf);
  }
}

// ─── Buffer staging ────────────────────────────────────────────────────────
// newBufferFromF32 picks newBufferWithBytesNoCopy: when the caller's typed
// array is page-aligned (macOS only requires pointer alignment; length is
// unconstrained), else falls back to newBufferWithBytes: which copies into
// an MTLBuffer-owned region.
//
// For large matrices the internal memcpy is the single biggest item in
// matVec latency — see bench/parabun-metal-zerocopy for measurements on M4
// showing the copy path is ~5× slower than nocopy at 64 MiB.

function isPageAlignedAddr(addr: number): boolean {
  if (pageSize <= 0) return false;
  return (addr & (pageSize - 1)) === 0;
}

function newBufferFromF32(arr: Float32Array, byteLen: bigint): bigint {
  const addr = ffiPtr!(arr);
  if (isPageAlignedAddr(addr)) {
    return msgSend_6_u64x4!(
      device,
      sel("newBufferWithBytesNoCopy:length:options:deallocator:"),
      BigInt(addr),
      byteLen,
      BigInt(MTL_STORAGE_MODE_SHARED),
      0n,
    );
  }
  return msgSend_5_ptr_u64_u64_ret!(
    device,
    sel("newBufferWithBytes:length:options:"),
    addr,
    byteLen,
    BigInt(MTL_STORAGE_MODE_SHARED),
  );
}

// ─── Page-aligned alloc ────────────────────────────────────────────────────
// Returns a Float32Array / Float64Array whose backing pointer is a multiple
// of the system page size (16 KiB on Apple Silicon, 4 KiB on Intel). Memory
// is owned by posix_memalign and never freed — allocations persist for the
// backend's lifetime, matching bun:simd.alloc's commit-for-lifetime model.
// The intent is that callers stage hot inputs through alloc() so matVec can
// take the NOCOPY path; freeing would require a FinalizationRegistry + care
// around Metal's aliased MTLBuffer lifetimes, which is out of scope here.

function alloc(length: number, type: "f32" | "f64", _opts?: { pinned?: boolean }): FArray {
  if (!Number.isInteger(length) || length < 0) {
    throw new RangeError(`length must be a non-negative integer; got ${length}`);
  }
  if (type !== "f32" && type !== "f64") {
    throw new TypeError(`type must be "f32" or "f64"; got ${String(type)}`);
  }
  // `pinned: true` on Metal is subsumed by page-aligned unified memory (the
  // NOCOPY dispatch path alloc already takes). Accept the flag for API
  // uniformity with CUDA; no behavior difference.
  if (!probe()) throw new Error("bun:gpu metal: backend unavailable");
  const elemBytes = type === "f32" ? 4 : 8;
  const byteLen = length * elemBytes;
  if (byteLen === 0) return type === "f32" ? new Float32Array(0) : new Float64Array(0);
  const outPtr = new BigUint64Array(1);
  const rc = libc!.symbols.posix_memalign(ffiPtr!(outPtr), BigInt(pageSize), BigInt(byteLen));
  if (rc !== 0) throw new Error(`bun:gpu metal: posix_memalign failed (rc=${rc})`);
  const addr = Number(outPtr[0]);
  const ab = ffiToArrayBuffer!(addr, 0, byteLen);
  return type === "f32" ? new Float32Array(ab) : new Float64Array(ab);
}

function isAligned(arr: FArray): boolean {
  if (!(arr instanceof Float32Array) && !(arr instanceof Float64Array)) return false;
  if (!probe()) return false;
  return isPageAlignedAddr(ffiPtr!(arr));
}

// ─── hold / releaseHandle ──────────────────────────────────────────────────
// `hold(arr)` creates one MTLBuffer pointing at the array's memory (NOCOPY
// if the array is page-aligned, COPY into an MTLBuffer-owned region if not)
// and returns a handle the caller passes back into matVec. The handle's
// MTLBuffer is reused across dispatches — the bench/parabun-metal-zerocopy
// RESIDENT row (30-150% faster than NOCOPY) is what this API exposes.
//
// Only Float32Array is wired through the MTLBuffer today because matVec on
// f64 still forwards to bun:simd. f64 handles allocate no buffer and just
// wrap the view, so `release` is a no-op; matVec sees `view` and falls
// through to simd.
//
// The handle holds a reference to `view` so the backing pointer stays live
// as long as the handle does — critical for NOCOPY where Metal reads
// directly from the user's memory.

function hold(arr: FArray): GpuHandle {
  if (!(arr instanceof Float32Array) && !(arr instanceof Float64Array)) {
    throw new TypeError(
      `hold requires Float32Array or Float64Array; got ${(arr as any)?.constructor?.name ?? typeof arr}`,
    );
  }
  if (!probe()) throw new Error("bun:gpu metal: backend unavailable");
  const type: "f32" | "f64" = arr instanceof Float32Array ? "f32" : "f64";
  let buffer: bigint = 0n;
  if (arr instanceof Float32Array && arr.byteLength > 0) {
    buffer = newBufferFromF32(arr, BigInt(arr.byteLength));
    if (buffer === 0n) throw new Error("bun:gpu metal: newBuffer failed in hold");
  }
  return {
    __bunGpuHandle: true,
    backend: "metal",
    type,
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
  if (handle.buffer !== 0n) {
    objcRelease(handle.buffer);
    handle.buffer = 0n;
  }
  handle.released = true;
}

// Metal's `alloc` returns page-aligned memory owned by posix_memalign; we
// deliberately leak that memory today because MTLBuffer NOCOPY aliases it.
// Accept `releasePinned` calls as no-ops for API parity with CUDA.
function releasePinned(_arr: FArray): boolean {
  return false;
}

// ─── Kernel launch: matVecF32 ──────────────────────────────────────────────
// M×K matrix · K-vector → M-vector, one thread per row. Same buffer/encoder
// choreography as launchAffineF32, different pipeline + buffer layout.

function launchMatVecF32(mat: Float32Array | GpuHandle, vec: Float32Array, m: number, k: number): Float32Array {
  const matBytes = BigInt(m * k * 4);
  const vecBytes = BigInt(k * 4);
  const outBytes = BigInt(m * 4);

  // If the caller passed a GpuHandle, reuse its MTLBuffer (Tier 4 residency).
  // Otherwise, stage the typed array: page-aligned inputs take NOCOPY,
  // everything else falls back to newBufferWithBytes: (one memcpy per call).
  // See bench/parabun-metal-zerocopy/README.md — RESIDENT is 30-150% faster
  // than NOCOPY and 2-10× faster than COPY at >= 4 MiB.
  let matBuf: bigint;
  let matBufOwned: boolean;
  if (isGpuHandle(mat)) {
    if (mat.released) throw new Error("bun:gpu: matVec called on released handle");
    if (mat.buffer === 0n) throw new Error("bun:gpu metal: handle has no MTLBuffer (f64?)");
    matBuf = mat.buffer;
    matBufOwned = false;
  } else {
    matBuf = newBufferFromF32(mat, matBytes);
    if (matBuf === 0n) throw new Error("bun:gpu metal: newBuffer (mat) failed");
    matBufOwned = true;
  }

  let vecBuf: bigint = 0n;
  let outBuf: bigint = 0n;
  let cmdBuf: bigint = 0n;
  let encoder: bigint = 0n;
  try {
    vecBuf = newBufferFromF32(vec, vecBytes);
    if (vecBuf === 0n) throw new Error("bun:gpu metal: newBuffer (vec) failed");

    outBuf = msgSend_4_u64_u64!(device, sel("newBufferWithLength:options:"), outBytes, BigInt(MTL_STORAGE_MODE_SHARED));
    if (outBuf === 0n) throw new Error("bun:gpu metal: newBufferWithLength (out) failed");

    cmdBuf = msgSend_2!(commandQueue, sel("commandBuffer"));
    if (cmdBuf === 0n) throw new Error("bun:gpu metal: commandBuffer failed");

    encoder = msgSend_2!(cmdBuf, sel("computeCommandEncoder"));
    if (encoder === 0n) throw new Error("bun:gpu metal: computeCommandEncoder failed");

    msgSend_3_id!(encoder, sel("setComputePipelineState:"), matVecPipeline);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), matBuf, 0n, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), vecBuf, 0n, 1n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), outBuf, 0n, 2n);
    const pM = new Uint32Array([m]);
    const pK = new Uint32Array([k]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pM), 4n, 3n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pK), 4n, 4n);

    // Launch M threadgroups of 32 threads each. Each threadgroup is one
    // simdgroup on Apple Silicon (simdgroup width = 32), so the kernel's
    // `simd_sum` tree-reduces within a single TG without needing a
    // threadgroup barrier. dispatchThreadgroups (not dispatchThreads) so
    // the TG count is M exactly — no partial trailing TG, no edge cases.
    const tgCount = new BigUint64Array([BigInt(m), 1n, 1n]);
    const threadsPerTg = new BigUint64Array([32n, 1n, 1n]);
    msgSend_4_ptr_ptr!(
      encoder,
      sel("dispatchThreadgroups:threadsPerThreadgroup:"),
      ffiPtr!(tgCount),
      ffiPtr!(threadsPerTg),
    );

    msgSend_2!(encoder, sel("endEncoding"));
    msgSend_2!(cmdBuf, sel("commit"));
    msgSend_2!(cmdBuf, sel("waitUntilCompleted"));

    const contents = msgSend_2!(outBuf, sel("contents"));
    if (contents === 0n) throw new Error("bun:gpu metal: outBuf contents is null");
    const out = new Float32Array(m);
    const view = new Float32Array(ffiToArrayBuffer!(Number(contents), 0, m * 4));
    out.set(view);
    return out;
  } finally {
    if (matBufOwned) objcRelease(matBuf);
    if (vecBuf !== 0n) objcRelease(vecBuf);
    if (outBuf !== 0n) objcRelease(outBuf);
  }
}

// ─── Kernel launch: matmulF32 ──────────────────────────────────────────────
// C = A·B where A is M×K, B is K×N, C is M×N, all row-major f32.
// Same buffer/encoder choreography as launchMatVecF32; different pipeline,
// different grid. Grid covers ceil(N/32) × ceil(M/32); threadgroup is
// 32×32 = 1024 threads (Apple GPU max per TG).

function launchMatmulF32(
  a: Float32Array | GpuHandle,
  b: Float32Array | GpuHandle,
  m: number,
  k: number,
  n: number,
  out?: Float32Array,
): Float32Array {
  const aBytes = BigInt(m * k * 4);
  const bBytes = BigInt(k * n * 4);
  const cBytes = BigInt(m * n * 4);

  let aBuf: bigint;
  let aBufOwned: boolean;
  if (isGpuHandle(a)) {
    if (a.released) throw new Error("bun:gpu: matmul called on released handle");
    if (a.buffer === 0n) throw new Error("bun:gpu metal: handle has no MTLBuffer (f64?)");
    aBuf = a.buffer;
    aBufOwned = false;
  } else {
    aBuf = newBufferFromF32(a, aBytes);
    if (aBuf === 0n) throw new Error("bun:gpu metal: newBuffer (A) failed");
    aBufOwned = true;
  }

  let bBuf: bigint;
  let bBufOwned: boolean;
  if (isGpuHandle(b)) {
    if (b.released) throw new Error("bun:gpu: matmul called on released handle");
    if (b.buffer === 0n) throw new Error("bun:gpu metal: handle has no MTLBuffer (f64?)");
    bBuf = b.buffer;
    bBufOwned = false;
  } else {
    bBuf = newBufferFromF32(b, bBytes);
    if (bBuf === 0n) {
      if (aBufOwned) objcRelease(aBuf);
      throw new Error("bun:gpu metal: newBuffer (B) failed");
    }
    bBufOwned = true;
  }

  let outBuf: bigint = 0n;
  let cmdBuf: bigint = 0n;
  let encoder: bigint = 0n;
  try {
    outBuf = msgSend_4_u64_u64!(device, sel("newBufferWithLength:options:"), cBytes, BigInt(MTL_STORAGE_MODE_SHARED));
    if (outBuf === 0n) throw new Error("bun:gpu metal: newBufferWithLength (C) failed");

    cmdBuf = msgSend_2!(commandQueue, sel("commandBuffer"));
    if (cmdBuf === 0n) throw new Error("bun:gpu metal: commandBuffer failed");

    encoder = msgSend_2!(cmdBuf, sel("computeCommandEncoder"));
    if (encoder === 0n) throw new Error("bun:gpu metal: computeCommandEncoder failed");

    msgSend_3_id!(encoder, sel("setComputePipelineState:"), matmulPipeline);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), aBuf, 0n, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), bBuf, 0n, 1n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), outBuf, 0n, 2n);
    const pM = new Uint32Array([m]);
    const pK = new Uint32Array([k]);
    const pN = new Uint32Array([n]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pM), 4n, 3n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pK), 4n, 4n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pN), 4n, 5n);

    const OUT_TILE = 32;
    const tgX = BigInt(Math.floor((n + OUT_TILE - 1) / OUT_TILE));
    const tgY = BigInt(Math.floor((m + OUT_TILE - 1) / OUT_TILE));
    const tgCount = new BigUint64Array([tgX, tgY, 1n]);
    const threadsPerTg = new BigUint64Array([32n, 32n, 1n]);
    msgSend_4_ptr_ptr!(
      encoder,
      sel("dispatchThreadgroups:threadsPerThreadgroup:"),
      ffiPtr!(tgCount),
      ffiPtr!(threadsPerTg),
    );

    msgSend_2!(encoder, sel("endEncoding"));
    msgSend_2!(cmdBuf, sel("commit"));
    msgSend_2!(cmdBuf, sel("waitUntilCompleted"));

    const contents = msgSend_2!(outBuf, sel("contents"));
    if (contents === 0n) throw new Error("bun:gpu metal: outBuf contents is null");
    const view = new Float32Array(ffiToArrayBuffer!(Number(contents), 0, m * n * 4));
    // Copy into caller-provided buffer when present (including SAB-backed).
    // Metal shared-storage buffers can't alias a JS SharedArrayBuffer, so we
    // still pay one memcpy — but it's GPU→shared-storage host pointer, not
    // the JS-side Float32Array.prototype.set that was killing parallel top-K.
    const dst = out ?? new Float32Array(m * n);
    dst.set(view);
    return dst;
  } finally {
    if (aBufOwned) objcRelease(aBuf);
    if (bBufOwned) objcRelease(bBuf);
    if (outBuf !== 0n) objcRelease(outBuf);
  }
}

// ─── Size threshold ────────────────────────────────────────────────────────
// Matches cuda.ts — the fixed per-dispatch cost (buffer alloc + pipeline
// binding + GPU/CPU round-trip) makes the CPU path faster under ~256k f32.

const MIN_SIMDMAP_ELEMS = 1 << 18;
// matVec has two separate thresholds on purpose:
//
//   - MIN_MATVEC_DISPATCH_ELEMS: above this, `matVec` runs on the MSL kernel
//     when the caller hands us f32 inputs. This exists so tests and
//     benchmarks exercise the real GPU path, not just the simd fallback.
//   - MIN_MATVEC_WINS_ELEMS:     above this, `winsForSize("matVec", ...)`
//     returns true. This is what pipeline-style callers use to decide
//     whether to route the op to bun:gpu in the first place.
//
// The naive newBufferWithBytes: path was a wash with CPU at all sizes
// because its internal memcpy dominated. The NOCOPY path (bytes-no-copy
// against page-aligned input) flips the balance: at 1 M f32 elems / 4 MiB
// it's ~2× faster than CPU; at 4 M it's ~4×; at 16 M it's ~4× (see
// bench/parabun-metal-zerocopy/README.md). Dispatch threshold and wins
// threshold are collapsed back to one value now that the kernel actually
// wins above it.
//
// Callers that want the wins at or above this size MUST stage inputs
// through gpu.alloc — opportunistic alignment of arbitrary Float32Arrays
// almost never fires (JSC's typed-array backing is aligned to ~16 bytes,
// not page boundaries).
const MIN_MATVEC_DISPATCH_ELEMS = 1 << 20;
const MIN_MATVEC_WINS_ELEMS = 1 << 20;
// Matches cuda.ts: 16M multiply-adds — e.g. 256^3 or 32×384×32k.
// Below this the triple-loop fallback beats the MTLBuffer staging cost.
const MIN_MATMUL_DISPATCH_FLOPS = 1 << 24;

function winsForSize(op: string, n: number, elemBytes: number): boolean {
  if (!probed && !probe()) return false;
  if (!probeResult) return false;
  if (op === "simdMap") return elemBytes === 4 && n >= MIN_SIMDMAP_ELEMS;
  if (op === "matVec") return elemBytes === 4 && n >= MIN_MATVEC_WINS_ELEMS;
  if (op === "matmul") return elemBytes === 4 && n >= MIN_MATMUL_DISPATCH_FLOPS;
  return false;
}

// ─── Backend methods ───────────────────────────────────────────────────────

function dot(a: FArray | GpuHandle, b: FArray | GpuHandle): number {
  return simd.dot(unwrapHandle(a), unwrapHandle(b));
}

function matVec(matrix: FArray | GpuHandle, vector: FArray, nRows: number, nCols: number): FArray {
  const matIsHandle = isGpuHandle(matrix);
  if (matIsHandle && matrix.released) {
    throw new Error("bun:gpu: matVec called on released handle");
  }
  const matView = matIsHandle ? matrix.view : (matrix as FArray);
  if (
    matView instanceof Float32Array &&
    vector instanceof Float32Array &&
    probe() &&
    nRows * nCols >= MIN_MATVEC_DISPATCH_ELEMS &&
    // f64 handles can't take the MSL kernel; matIsHandle with f64 → simd path.
    (!matIsHandle || matrix.type === "f32")
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
  // MSL kernel path: f32 inputs, probe succeeded, and either (a) a resident
  // handle already staged its MTLBuffer, or (b) the work is big enough to
  // amortize a cold dispatch. Otherwise fall back to the triple loop.
  const residentA = aIsHandle && a.type === "f32" && a.buffer !== 0n;
  const residentB = bIsHandle && b.type === "f32" && b.buffer !== 0n;
  const anyResident = residentA || residentB;
  if (
    av instanceof Float32Array &&
    bv instanceof Float32Array &&
    (out === undefined || out instanceof Float32Array) &&
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

// ─── Dynamic MSL kernel compilation ──────────────────────────────────────
//
// For non-affine pure functions on Float32Array, compile a custom MSL
// compute shader at runtime via [MTLDevice newLibraryWithSource:...].
// Same approach as the NVRTC path in cuda.ts but targeting Metal.

const MSL_MATH_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bMath\.sin\b/g, "sin"],
  [/\bMath\.cos\b/g, "cos"],
  [/\bMath\.tan\b/g, "tan"],
  [/\bMath\.asin\b/g, "asin"],
  [/\bMath\.acos\b/g, "acos"],
  [/\bMath\.atan\b/g, "atan"],
  [/\bMath\.atan2\b/g, "atan2"],
  [/\bMath\.exp\b/g, "exp"],
  [/\bMath\.log\b/g, "log"],
  [/\bMath\.log2\b/g, "log2"],
  [/\bMath\.log10\b/g, "log10"],
  [/\bMath\.sqrt\b/g, "sqrt"],
  [/\bMath\.cbrt\b/g, "cbrt"],
  [/\bMath\.abs\b/g, "abs"],
  [/\bMath\.floor\b/g, "floor"],
  [/\bMath\.ceil\b/g, "ceil"],
  [/\bMath\.round\b/g, "round"],
  [/\bMath\.trunc\b/g, "trunc"],
  [/\bMath\.sign\b/g, "sign"],
  [/\bMath\.min\b/g, "min"],
  [/\bMath\.max\b/g, "max"],
  [/\bMath\.pow\b/g, "pow"],
  [/\bMath\.hypot\b/g, "hypot"],
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

  if (!fnSrc.includes("{") || fnSrc.indexOf("{") > fnSrc.indexOf("=>")) {
    const expr = rest.replace(/\s*;?\s*$/, "");
    if (expr.length === 0) return null;
    return { param, expr };
  }

  const retMatch = rest.match(/^\s*return\s+(.+?)\s*;?\s*}\s*$/);
  if (!retMatch) return null;
  return { param, expr: retMatch[1] };
}

function translateExprToMSL(expr: string, param: string): string | null {
  let msl = expr;
  msl = msl.replace(
    /(\b\w+(?:\([^)]*\))?|\([^)]+\)|\d+(?:\.\d+)?)\s*\*\*\s*(\b\w+(?:\([^)]*\))?|\([^)]+\)|\d+(?:\.\d+)?)/g,
    "pow($1, $2)",
  );
  for (const [pat, rep] of MSL_MATH_REPLACEMENTS) msl = msl.replace(pat, rep);
  msl = msl.replace(/===/g, "==").replace(/!==/g, "!=");
  const mslBuiltins =
    /\b(sin|cos|tan|asin|acos|atan|atan2|exp|log|log2|log10|sqrt|cbrt|abs|floor|ceil|round|trunc|sign|min|max|pow|hypot)\b/g;
  const stripped = msl.replace(mslBuiltins, "").replace(new RegExp("\\b" + param + "\\b", "g"), "");
  if (/[a-zA-Z_]/.test(stripped)) return null;
  return msl;
}

function generateMSLKernelSrc(mslExpr: string, param: string): string {
  return `#include <metal_stdlib>
using namespace metal;
kernel void custom_map(
    device const float *inPtr  [[buffer(0)]],
    device       float *outPtr [[buffer(1)]],
    constant     uint  &n      [[buffer(2)]],
    uint                gid    [[thread_position_in_grid]])
{
    if (gid >= n) return;
    float ${param} = inPtr[gid];
    outPtr[gid] = ${mslExpr};
}
`;
}

type CachedMSLKernel = { pipeline: bigint; fn: bigint; lib: bigint; maxTg: number };
const mslKernelCache = new Map<string, CachedMSLKernel | null>();

function compileCustomMSLKernel(fnSrc: string): CachedMSLKernel | null {
  const cached = mslKernelCache.get(fnSrc);
  if (cached !== undefined) return cached;

  if (!probe()) {
    mslKernelCache.set(fnSrc, null);
    return null;
  }

  const extracted = extractReturnExpr(fnSrc);
  if (!extracted) {
    mslKernelCache.set(fnSrc, null);
    return null;
  }

  const mslExpr = translateExprToMSL(extracted.expr, extracted.param);
  if (!mslExpr) {
    mslKernelCache.set(fnSrc, null);
    return null;
  }

  const src = generateMSLKernelSrc(mslExpr, extracted.param);
  const nsSrc = nsstring(src);
  if (nsSrc === 0n) {
    mslKernelCache.set(fnSrc, null);
    return null;
  }

  const lib = msgSend_5_id_id_ptr!(device, sel("newLibraryWithSource:options:error:"), nsSrc, 0n, null);
  objcRelease(nsSrc);
  if (lib === 0n) {
    mslKernelCache.set(fnSrc, null);
    return null;
  }

  const result = compileKernel(lib, "custom_map");
  if (result === null) {
    objcRelease(lib);
    mslKernelCache.set(fnSrc, null);
    return null;
  }

  const entry: CachedMSLKernel = { pipeline: result.pipe, fn: result.fn, lib, maxTg: result.maxTg };
  mslKernelCache.set(fnSrc, entry);
  return entry;
}

function launchCustomMSLF32(a: Float32Array, kernel: CachedMSLKernel): Float32Array {
  const n = a.length;
  const bytes = BigInt(n * 4);

  const inBuf = msgSend_5_ptr_u64_u64_ret!(
    device,
    sel("newBufferWithBytes:length:options:"),
    ffiPtr!(a),
    bytes,
    BigInt(MTL_STORAGE_MODE_SHARED),
  );
  if (inBuf === 0n) throw new Error("bun:gpu metal: newBufferWithBytes failed");

  let outBuf: bigint = 0n;
  let cmdBuf: bigint = 0n;
  let encoder: bigint = 0n;
  try {
    outBuf = msgSend_4_u64_u64!(device, sel("newBufferWithLength:options:"), bytes, BigInt(MTL_STORAGE_MODE_SHARED));
    if (outBuf === 0n) throw new Error("bun:gpu metal: newBufferWithLength failed");

    cmdBuf = msgSend_2!(commandQueue, sel("commandBuffer"));
    if (cmdBuf === 0n) throw new Error("bun:gpu metal: commandBuffer failed");

    encoder = msgSend_2!(cmdBuf, sel("computeCommandEncoder"));
    if (encoder === 0n) throw new Error("bun:gpu metal: computeCommandEncoder failed");

    msgSend_3_id!(encoder, sel("setComputePipelineState:"), kernel.pipeline);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), inBuf, 0n, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), outBuf, 0n, 1n);

    const pN = new Uint32Array([n]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pN), 4n, 2n);

    const tg = Math.min(kernel.maxTg, 256);
    const grid = new BigUint64Array([BigInt(n), 1n, 1n]);
    const threads = new BigUint64Array([BigInt(tg), 1n, 1n]);
    msgSend_4_ptr_ptr!(encoder, sel("dispatchThreads:threadsPerThreadgroup:"), ffiPtr!(grid), ffiPtr!(threads));

    msgSend_2!(encoder, sel("endEncoding"));
    msgSend_2!(cmdBuf, sel("commit"));
    msgSend_2!(cmdBuf, sel("waitUntilCompleted"));

    const contents = msgSend_2!(outBuf, sel("contents"));
    if (contents === 0n) throw new Error("bun:gpu metal: contents returned null");
    const out = new Float32Array(n);
    out.set(new Float32Array(ffiToArrayBuffer!(contents, 0, n * 4)));
    return out;
  } finally {
    if (encoder !== 0n) objcRelease(encoder);
    if (cmdBuf !== 0n) objcRelease(cmdBuf);
    if (outBuf !== 0n) objcRelease(outBuf);
    objcRelease(inBuf);
  }
}

function simdMap(fn: (x: number, i: number) => number, a: FArray | GpuHandle): FArray {
  if (typeof fn !== "function") throw new TypeError("fn must be a function");
  const view = unwrapHandle(a);
  if (view instanceof Float32Array && fn.length <= 1 && probe() && view.length >= MIN_SIMDMAP_ELEMS) {
    const aff = tryAffineKernel(fn as (x: number) => number);
    if (aff) return launchAffineF32(view, aff.k1, aff.k0);
    const kernel = compileCustomMSLKernel(fn.toString());
    if (kernel) return launchCustomMSLF32(view, kernel);
  }
  return simd.simdMap(fn, view as any);
}

function dispose(): void {
  for (const entry of mslKernelCache.values()) {
    if (entry) {
      objcRelease(entry.pipeline);
      objcRelease(entry.fn);
      objcRelease(entry.lib);
    }
  }
  mslKernelCache.clear();
  if (commandQueue !== 0n) {
    objcRelease(commandQueue);
    commandQueue = 0n;
  }
  if (matmulPipeline !== 0n) {
    objcRelease(matmulPipeline);
    matmulPipeline = 0n;
  }
  if (matmulFn !== 0n) {
    objcRelease(matmulFn);
    matmulFn = 0n;
  }
  if (matVecPipeline !== 0n) {
    objcRelease(matVecPipeline);
    matVecPipeline = 0n;
  }
  if (matVecFn !== 0n) {
    objcRelease(matVecFn);
    matVecFn = 0n;
  }
  if (simdMapPipeline !== 0n) {
    objcRelease(simdMapPipeline);
    simdMapPipeline = 0n;
  }
  if (simdMapFn !== 0n) {
    objcRelease(simdMapFn);
    simdMapFn = 0n;
  }
  if (metalLibraryObj !== 0n) {
    objcRelease(metalLibraryObj);
    metalLibraryObj = 0n;
  }
  device = 0n;
  selCache.clear();
  probed = false;
  probeResult = false;
  deviceName = "";
  hasUnifiedMemory = false;
}

function getDeviceName(): string {
  return deviceName;
}

function getHasUnifiedMemory(): boolean {
  return hasUnifiedMemory;
}

export default {
  name: "metal" as const,
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
  getHasUnifiedMemory,
};
