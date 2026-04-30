// Standalone Metal matVec micro-benchmark: measures the cost of input
// staging for a 1024×1024 f32 matrix (= 4 MiB) across three paths:
//
//   (A) COPY    — newBufferWithBytes:length:options:
//                 (current para:gpu metal.ts path; memcpy into MTLBuffer)
//   (B) NOCOPY  — newBufferWithBytesNoCopy:length:options:deallocator:
//                 (page-aligned input; no memcpy; still creates an MTLBuffer
//                 header per call)
//   (C) RESIDENT — MTLBuffer created once, reused across calls
//                 (Tier 4 lower-bound; pure kernel cost + encoder setup)
//
// Runs against a minimal matVecF32 kernel (one threadgroup per row,
// simd_sum within the threadgroup — same shape as metal.ts).
//
// Usage:  bun run bench/parabun-metal-zerocopy/run.mjs
// Target: Apple Silicon macOS, stock bun 1.3+ (no parabun extensions).

import { dlopen, FFIType, ptr, CString, toArrayBuffer } from "bun:ffi";

// ─── ffi plumbing ─────────────────────────────────────────────────────────

const libc = dlopen("libc.dylib", {
  posix_memalign: { args: [FFIType.ptr, FFIType.u64, FFIType.u64], returns: FFIType.i32 },
  free: { args: [FFIType.u64], returns: FFIType.void },
  getpagesize: { args: [], returns: FFIType.i32 },
});

const metal = dlopen("/System/Library/Frameworks/Metal.framework/Metal", {
  MTLCreateSystemDefaultDevice: { args: [], returns: FFIType.u64 },
});

const LIBOBJC = "/usr/lib/libobjc.A.dylib";
const objc = dlopen(LIBOBJC, {
  sel_registerName: { args: [FFIType.ptr], returns: FFIType.u64 },
  objc_getClass: { args: [FFIType.ptr], returns: FFIType.u64 },
});

// Per-signature objc_msgSend wrappers
const send2 = dlopen(LIBOBJC, {
  objc_msgSend: { args: [FFIType.u64, FFIType.u64], returns: FFIType.u64 },
}).symbols.objc_msgSend;
const send3_id = dlopen(LIBOBJC, {
  objc_msgSend: { args: [FFIType.u64, FFIType.u64, FFIType.u64], returns: FFIType.u64 },
}).symbols.objc_msgSend;
const send5_id_id_ptr = dlopen(LIBOBJC, {
  objc_msgSend: { args: [FFIType.u64, FFIType.u64, FFIType.u64, FFIType.u64, FFIType.ptr], returns: FFIType.u64 },
}).symbols.objc_msgSend;
const send5_ptr_u64_u64_ret = dlopen(LIBOBJC, {
  objc_msgSend: { args: [FFIType.u64, FFIType.u64, FFIType.ptr, FFIType.u64, FFIType.u64], returns: FFIType.u64 },
}).symbols.objc_msgSend;
const send6 = dlopen(LIBOBJC, {
  objc_msgSend: {
    args: [FFIType.u64, FFIType.u64, FFIType.u64, FFIType.u64, FFIType.u64, FFIType.u64],
    returns: FFIType.u64,
  },
}).symbols.objc_msgSend;
const send4_u64_u64 = dlopen(LIBOBJC, {
  objc_msgSend: { args: [FFIType.u64, FFIType.u64, FFIType.u64, FFIType.u64], returns: FFIType.u64 },
}).symbols.objc_msgSend;
const send5_id_u64_u64 = dlopen(LIBOBJC, {
  objc_msgSend: { args: [FFIType.u64, FFIType.u64, FFIType.u64, FFIType.u64, FFIType.u64], returns: FFIType.void },
}).symbols.objc_msgSend;
const send5_ptr_u64_u64 = dlopen(LIBOBJC, {
  objc_msgSend: { args: [FFIType.u64, FFIType.u64, FFIType.ptr, FFIType.u64, FFIType.u64], returns: FFIType.void },
}).symbols.objc_msgSend;
const send4_ptr_ptr = dlopen(LIBOBJC, {
  objc_msgSend: { args: [FFIType.u64, FFIType.u64, FFIType.ptr, FFIType.ptr], returns: FFIType.void },
}).symbols.objc_msgSend;

const selCache = new Map();
function sel(name) {
  let s = selCache.get(name);
  if (s !== undefined) return s;
  const buf = new TextEncoder().encode(name + "\0");
  s = objc.symbols.sel_registerName(ptr(buf));
  selCache.set(name, s);
  return s;
}
function cls(name) {
  const buf = new TextEncoder().encode(name + "\0");
  return objc.symbols.objc_getClass(ptr(buf));
}
function nsstring(text) {
  const NSString = cls("NSString");
  const a = send2(NSString, sel("alloc"));
  const buf = new TextEncoder().encode(text + "\0");
  return send3_id(a, sel("initWithUTF8String:"), BigInt(ptr(buf)));
}
function release(obj) {
  if (obj !== 0n) send2(obj, sel("release"));
}

// ─── page-aligned allocator ──────────────────────────────────────────────

const PAGE = libc.symbols.getpagesize();
function allocPageAligned(bytes) {
  const rounded = Math.ceil(bytes / PAGE) * PAGE;
  const outPtr = new BigUint64Array(1);
  const rc = libc.symbols.posix_memalign(ptr(outPtr), BigInt(PAGE), BigInt(rounded));
  if (rc !== 0) throw new Error(`posix_memalign failed: ${rc}`);
  const addr = outPtr[0];
  const ab = toArrayBuffer(Number(addr), 0, rounded);
  return { view: new Float32Array(ab, 0, bytes / 4), addr, bytes: rounded };
}

// ─── Metal setup ──────────────────────────────────────────────────────────

const MSL = `
#include <metal_stdlib>
using namespace metal;

kernel void matVecF32(device const float* mat [[buffer(0)]],
                      device const float* vec [[buffer(1)]],
                      device float* out       [[buffer(2)]],
                      constant uint& M         [[buffer(3)]],
                      constant uint& K         [[buffer(4)]],
                      uint tgid [[threadgroup_position_in_grid]],
                      uint tid  [[thread_position_in_threadgroup]]) {
  const uint row = tgid;
  if (row >= M) return;
  float s = 0.0;
  for (uint j = tid; j < K; j += 32) s += mat[row * K + j] * vec[j];
  s = simd_sum(s);
  if (tid == 0) out[row] = s;
}
`;

const MTL_STORAGE_MODE_SHARED = 0; // MTLResourceStorageModeShared << 4 = 0

const device = metal.symbols.MTLCreateSystemDefaultDevice();
if (device === 0n) {
  console.error("No Metal device");
  process.exit(1);
}
const queue = send2(device, sel("newCommandQueue"));

// Compile library
{
  const src = nsstring(MSL);
  const lib = send5_id_id_ptr(device, sel("newLibraryWithSource:options:error:"), src, 0n, null);
  release(src);
  if (lib === 0n) {
    console.error("MSL compile failed");
    process.exit(1);
  }
  var library = lib;
}
const fnName = nsstring("matVecF32");
const fn = send3_id(library, sel("newFunctionWithName:"), fnName);
release(fnName);
if (fn === 0n) {
  console.error("newFunctionWithName failed");
  process.exit(1);
}
const pipeline = send5_id_id_ptr(device, sel("newComputePipelineStateWithFunction:error:"), fn, 0n, null);
if (pipeline === 0n) {
  console.error("newComputePipelineStateWithFunction failed");
  process.exit(1);
}

// Device name
{
  const ns = send2(device, sel("name"));
  const cstr = send2(ns, sel("UTF8String"));
  console.log("Metal device:", String(new CString(Number(cstr))));
}
console.log(`Page size: ${PAGE} bytes\n`);

// ─── matVec dispatch paths ────────────────────────────────────────────────

function makeMatBuf_copy(mat) {
  // newBufferWithBytes:length:options:
  return send5_ptr_u64_u64_ret(
    device,
    sel("newBufferWithBytes:length:options:"),
    ptr(mat),
    BigInt(mat.byteLength),
    BigInt(MTL_STORAGE_MODE_SHARED),
  );
}
function makeMatBuf_noCopy(matPtrU64, byteLen) {
  // newBufferWithBytesNoCopy:length:options:deallocator:
  return send6(
    device,
    sel("newBufferWithBytesNoCopy:length:options:deallocator:"),
    matPtrU64,
    BigInt(byteLen),
    BigInt(MTL_STORAGE_MODE_SHARED),
    0n,
  );
}

function dispatch(matBuf, vecBuf, outBuf, M, K) {
  const cmdBuf = send2(queue, sel("commandBuffer"));
  const enc = send2(cmdBuf, sel("computeCommandEncoder"));
  send3_id(enc, sel("setComputePipelineState:"), pipeline);
  send5_id_u64_u64(enc, sel("setBuffer:offset:atIndex:"), matBuf, 0n, 0n);
  send5_id_u64_u64(enc, sel("setBuffer:offset:atIndex:"), vecBuf, 0n, 1n);
  send5_id_u64_u64(enc, sel("setBuffer:offset:atIndex:"), outBuf, 0n, 2n);
  const pM = new Uint32Array([M]);
  const pK = new Uint32Array([K]);
  send5_ptr_u64_u64(enc, sel("setBytes:length:atIndex:"), ptr(pM), 4n, 3n);
  send5_ptr_u64_u64(enc, sel("setBytes:length:atIndex:"), ptr(pK), 4n, 4n);
  const tgCount = new BigUint64Array([BigInt(M), 1n, 1n]);
  const threadsPerTg = new BigUint64Array([32n, 1n, 1n]);
  send4_ptr_ptr(enc, sel("dispatchThreadgroups:threadsPerThreadgroup:"), ptr(tgCount), ptr(threadsPerTg));
  send2(enc, sel("endEncoding"));
  send2(cmdBuf, sel("commit"));
  send2(cmdBuf, sel("waitUntilCompleted"));
}

// ─── bench harness ────────────────────────────────────────────────────────

function runCase({ M, K }) {
  const matBytes = M * K * 4;
  const vecBytes = K * 4;
  const outBytes = M * 4;
  console.log(`\n=== matVec ${M}x${K} f32 (mat=${(matBytes / 1024 / 1024).toFixed(2)} MiB) ===`);

  // Plain Float32Array matrix (typical user-provided buffer; not page-aligned)
  const matPlain = new Float32Array(M * K);
  for (let i = 0; i < matPlain.length; i++) matPlain[i] = Math.sin(i);
  const vecPlain = new Float32Array(K);
  for (let j = 0; j < K; j++) vecPlain[j] = Math.cos(j);

  // Page-aligned matrix + vector (for nocopy path)
  const matAligned = allocPageAligned(matBytes);
  const vecAligned = allocPageAligned(vecBytes);
  matAligned.view.set(matPlain);
  vecAligned.view.set(vecPlain);

  // Pre-created outBuf (reused across paths and calls)
  const outBuf = send4_u64_u64(
    device,
    sel("newBufferWithLength:options:"),
    BigInt(outBytes),
    BigInt(MTL_STORAGE_MODE_SHARED),
  );

  // Pre-created matBuf / vecBuf for RESIDENT path (nocopy, allocated once)
  const matBuf_resident = makeMatBuf_noCopy(matAligned.addr, matAligned.bytes);
  const vecBuf_resident = makeMatBuf_noCopy(vecAligned.addr, vecAligned.bytes);

  function bench(label, fn) {
    // warmup
    for (let i = 0; i < 10; i++) fn();
    const samples = [];
    const N = 100;
    for (let i = 0; i < N; i++) {
      const t0 = Bun.nanoseconds();
      fn();
      samples.push(Number(Bun.nanoseconds() - t0) / 1e6);
    }
    samples.sort((a, b) => a - b);
    const min = samples[0];
    const med = samples[Math.floor(N / 2)];
    const p95 = samples[Math.floor(N * 0.95)];
    console.log(`${label.padEnd(28)}  min=${min.toFixed(3)}ms  med=${med.toFixed(3)}ms  p95=${p95.toFixed(3)}ms`);
  }

  // (A) COPY — plain input
  bench("(A) COPY new+dispatch", () => {
    const matBuf = makeMatBuf_copy(matPlain);
    const vecBuf = makeMatBuf_copy(vecPlain);
    dispatch(matBuf, vecBuf, outBuf, M, K);
    release(matBuf);
    release(vecBuf);
  });

  // (B) NOCOPY — page-aligned input
  bench("(B) NOCOPY new+dispatch", () => {
    const matBuf = makeMatBuf_noCopy(matAligned.addr, matAligned.bytes);
    const vecBuf = makeMatBuf_noCopy(vecAligned.addr, vecAligned.bytes);
    dispatch(matBuf, vecBuf, outBuf, M, K);
    release(matBuf);
    release(vecBuf);
  });

  // (C) RESIDENT — MTLBuffer created once, reused
  bench("(C) RESIDENT dispatch only", () => {
    dispatch(matBuf_resident, vecBuf_resident, outBuf, M, K);
  });

  // (B') NOCOPY with explicit memcpy — stage user's non-aligned mat into
  // a pre-allocated page-aligned scratch buffer, then NOCOPY against the
  // scratch. Separates "win from skipping memcpy" from "win from avoiding
  // MTLBuffer's internal staging path".
  bench("(B') NOCOPY + memcpy scratch", () => {
    matAligned.view.set(matPlain); // memcpy into page-aligned scratch
    const matBuf = makeMatBuf_noCopy(matAligned.addr, matAligned.bytes);
    const vecBuf = makeMatBuf_noCopy(vecAligned.addr, vecAligned.bytes);
    dispatch(matBuf, vecBuf, outBuf, M, K);
    release(matBuf);
    release(vecBuf);
  });

  // (D) CPU tight loop — what JSC's auto-vectorizer gives us on f32 arm64.
  // This is the bar the GPU path has to beat for MIN_MATVEC_WINS_ELEMS
  // to move off Infinity.
  const cpuOut = new Float32Array(M);
  bench("(D) CPU tight loop", () => {
    for (let i = 0; i < M; i++) {
      let s = 0;
      const rowBase = i * K;
      for (let j = 0; j < K; j++) s += matPlain[rowBase + j] * vecPlain[j];
      cpuOut[i] = s;
    }
  });

  // Sanity: verify results from each path agree
  {
    const matBuf_a = makeMatBuf_copy(matPlain);
    const vecBuf_a = makeMatBuf_copy(vecPlain);
    dispatch(matBuf_a, vecBuf_a, outBuf, M, K);
    release(matBuf_a);
    release(vecBuf_a);
    const contents = send2(outBuf, sel("contents"));
    const outA = new Float32Array(toArrayBuffer(Number(contents), 0, outBytes)).slice();

    dispatch(matBuf_resident, vecBuf_resident, outBuf, M, K);
    const outC = new Float32Array(toArrayBuffer(Number(contents), 0, outBytes)).slice();

    let maxDelta = 0;
    for (let i = 0; i < M; i++) maxDelta = Math.max(maxDelta, Math.abs(outA[i] - outC[i]));
    console.log(`COPY vs RESIDENT max |Δ|: ${maxDelta.toExponential(2)}`);
  }

  // Cleanup
  release(matBuf_resident);
  release(vecBuf_resident);
  release(outBuf);
  libc.symbols.free(matAligned.addr);
  libc.symbols.free(vecAligned.addr);
} // end runCase

for (const c of [
  { M: 512, K: 512 },
  { M: 1024, K: 1024 },
  { M: 2048, K: 2048 },
  { M: 4096, K: 4096 },
])
  runCase(c);

release(pipeline);
release(fn);
release(library);
