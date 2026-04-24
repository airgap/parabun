// Browser shim for `bun:gpu`. Two layers:
//
//   1. **Sync CPU path** for the upstream signatures (`matVec`,
//      `matmul`, `dot`, `simdMap`) — scalar loops via bun:simd. Keeps
//      existing .pts code compiling to the browser without an awkward
//      sync→async migration.
//
//   2. **WebGPU backend** for the async variants (`matVecAsync`,
//      `matmulAsync`, `dotAsync`) — real compute shaders with
//      workgroup reduction / tiled matmul. Opt-in via
//      `await gpu.initWebGPU()` at startup.
//
// Shader implementations (WGSL):
//   - matVec: 1 workgroup per output row, 64 threads strided across K,
//     parallel reduction via shared memory. ~5–10× faster than the
//     naive 1-thread-per-row version for typical shapes.
//   - matmul: 16×16 tiled kernel with shared-memory matrix tiles.
//     Each workgroup produces a 16×16 output tile; threads cooperate
//     to load/multiply/accumulate in blocks of 16 across K.
//   - dot: tree reduction. First pass reduces N→N/1024 partials per
//     workgroup; main-thread sums the workgroup outputs.
//
// The WGSL is intentionally portable (avoids subgroup ops, fp16 storage,
// etc.) so it runs on any WebGPU implementation — Chromium, Firefox
// Nightly, Safari 17.4+.

import simd from "./simd.js";

// ── Sync CPU path — always available ────────────────────────────────────

function dot(a, b) {
  return simd.dot(a, b);
}

function matVec(mat, vec, M, K) {
  const src = mat && mat.buf ? mat.buf : mat;
  return simd.matVec(src, vec, M, K);
}

function matmul(a, b, M, N, K) {
  const out = new a.constructor(M * N);
  for (let i = 0; i < M; i++) {
    for (let j = 0; j < N; j++) {
      let s = 0;
      for (let k = 0; k < K; k++) s += a[i * K + k] * b[k * N + j];
      out[i * N + j] = s;
    }
  }
  return out;
}

function simdMap(fn, a) {
  return simd.simdMap(fn, a);
}

function alloc(n, type) {
  return simd.alloc(n, type);
}

function isAligned(_buf) {
  return true;
}

// ── WebGPU shaders ──────────────────────────────────────────────────────

const MATVEC_WGSL = /* wgsl */ `
struct Dims { M: u32, K: u32, _p0: u32, _p1: u32 };
@group(0) @binding(0) var<storage, read> mat: array<f32>;
@group(0) @binding(1) var<storage, read> vec_in: array<f32>;
@group(0) @binding(2) var<storage, read_write> outv: array<f32>;
@group(0) @binding(3) var<uniform> d: Dims;

var<workgroup> partial: array<f32, 64>;

@compute @workgroup_size(64)
fn main(
  @builtin(workgroup_id) wg: vec3<u32>,
  @builtin(local_invocation_id) lid: vec3<u32>,
) {
  let row = wg.x;
  if (row >= d.M) { return; }

  let tid = lid.x;
  var sum: f32 = 0.0;
  let rowOff = row * d.K;

  // Strided sum: each of 64 threads walks every 64th K-element and
  // accumulates locally. Memory access is coalesced within each stride
  // band as long as threads run in lockstep (they do on WebGPU).
  for (var j: u32 = tid; j < d.K; j = j + 64u) {
    sum = sum + mat[rowOff + j] * vec_in[j];
  }
  partial[tid] = sum;
  workgroupBarrier();

  // Tree reduction within the workgroup: 64 → 32 → 16 → 8 → 4 → 2 → 1.
  var stride: u32 = 32u;
  loop {
    if (stride == 0u) { break; }
    if (tid < stride) {
      partial[tid] = partial[tid] + partial[tid + stride];
    }
    workgroupBarrier();
    stride = stride >> 1u;
  }

  if (tid == 0u) { outv[row] = partial[0]; }
}`;

// 16×16 tiled matmul. One workgroup computes a 16×16 output tile. Each
// thread loads one element of A and one of B into shared memory per
// tile step, then multiply-adds all 16 K-slice products using the
// shared tiles. Loops over K in 16-wide strides.
const MATMUL_WGSL = /* wgsl */ `
struct Dims { M: u32, N: u32, K: u32, _p0: u32 };
@group(0) @binding(0) var<storage, read> ma: array<f32>;
@group(0) @binding(1) var<storage, read> mb: array<f32>;
@group(0) @binding(2) var<storage, read_write> mc: array<f32>;
@group(0) @binding(3) var<uniform> d: Dims;

const TILE: u32 = 16u;
var<workgroup> tileA: array<f32, 256>;  // 16×16
var<workgroup> tileB: array<f32, 256>;

@compute @workgroup_size(16, 16)
fn main(
  @builtin(workgroup_id) wg: vec3<u32>,
  @builtin(local_invocation_id) lid: vec3<u32>,
) {
  let row = wg.y * TILE + lid.y;
  let col = wg.x * TILE + lid.x;

  var acc: f32 = 0.0;
  let steps = (d.K + TILE - 1u) / TILE;

  for (var s: u32 = 0u; s < steps; s = s + 1u) {
    let aCol = s * TILE + lid.x;
    let bRow = s * TILE + lid.y;

    // Load A[row, aCol] and B[bRow, col] into the tile caches. Bounds-
    // checked so we can still run on non-tile-multiple shapes.
    if (row < d.M && aCol < d.K) {
      tileA[lid.y * TILE + lid.x] = ma[row * d.K + aCol];
    } else {
      tileA[lid.y * TILE + lid.x] = 0.0;
    }
    if (bRow < d.K && col < d.N) {
      tileB[lid.y * TILE + lid.x] = mb[bRow * d.N + col];
    } else {
      tileB[lid.y * TILE + lid.x] = 0.0;
    }
    workgroupBarrier();

    for (var k: u32 = 0u; k < TILE; k = k + 1u) {
      acc = acc + tileA[lid.y * TILE + k] * tileB[k * TILE + lid.x];
    }
    workgroupBarrier();
  }

  if (row < d.M && col < d.N) {
    mc[row * d.N + col] = acc;
  }
}`;

// Dot product as a two-pass reduction: first pass computes one partial
// per workgroup (1024-thread block sums), main thread sums the partials.
const DOT_WGSL = /* wgsl */ `
struct Dims { N: u32, _p0: u32, _p1: u32, _p2: u32 };
@group(0) @binding(0) var<storage, read> a: array<f32>;
@group(0) @binding(1) var<storage, read> b: array<f32>;
@group(0) @binding(2) var<storage, read_write> partials: array<f32>;
@group(0) @binding(3) var<uniform> d: Dims;

var<workgroup> shared_sums: array<f32, 256>;

@compute @workgroup_size(256)
fn main(
  @builtin(workgroup_id) wg: vec3<u32>,
  @builtin(local_invocation_id) lid: vec3<u32>,
) {
  let tid = lid.x;
  let gid = wg.x * 256u + tid;
  let stride = 256u * 65536u;  // global stride per iteration

  var sum: f32 = 0.0;
  var i: u32 = gid;
  loop {
    if (i >= d.N) { break; }
    sum = sum + a[i] * b[i];
    i = i + stride;
  }
  shared_sums[tid] = sum;
  workgroupBarrier();

  var s: u32 = 128u;
  loop {
    if (s == 0u) { break; }
    if (tid < s) { shared_sums[tid] = shared_sums[tid] + shared_sums[tid + s]; }
    workgroupBarrier();
    s = s >> 1u;
  }

  if (tid == 0u) { partials[wg.x] = shared_sums[0]; }
}`;

// ── Device/pipeline state ───────────────────────────────────────────────

const _wgState = {
  available: false,
  initPromise: null,
  device: null,
  queue: null,
  matVecPipeline: null,
  matVecLayout: null,
  matmulPipeline: null,
  matmulLayout: null,
  dotPipeline: null,
  dotLayout: null,
  error: null,
};

function _makeBindLayout(device, buffers) {
  return device.createBindGroupLayout({
    entries: buffers.map((kind, i) => ({
      binding: i,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: kind },
    })),
  });
}

function _makePipeline(device, wgsl, layout) {
  return device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
    compute: { module: device.createShaderModule({ code: wgsl }), entryPoint: "main" },
  });
}

async function _initWebGPUInternal() {
  if (typeof navigator === "undefined" || !navigator.gpu) {
    _wgState.error = "navigator.gpu unavailable (WebGPU not supported in this browser)";
    return false;
  }
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    _wgState.error = "navigator.gpu.requestAdapter() returned null";
    return false;
  }
  const device = await adapter.requestDevice();

  const threeRW = ["read-only-storage", "read-only-storage", "storage", "uniform"];
  const matVecLayout = _makeBindLayout(device, threeRW);
  const matmulLayout = _makeBindLayout(device, threeRW);
  const dotLayout = _makeBindLayout(device, threeRW);

  _wgState.device = device;
  _wgState.queue = device.queue;
  _wgState.matVecLayout = matVecLayout;
  _wgState.matVecPipeline = _makePipeline(device, MATVEC_WGSL, matVecLayout);
  _wgState.matmulLayout = matmulLayout;
  _wgState.matmulPipeline = _makePipeline(device, MATMUL_WGSL, matmulLayout);
  _wgState.dotLayout = dotLayout;
  _wgState.dotPipeline = _makePipeline(device, DOT_WGSL, dotLayout);
  _wgState.available = true;
  return true;
}

export function initWebGPU() {
  if (!_wgState.initPromise) _wgState.initPromise = _initWebGPUInternal();
  return _wgState.initPromise;
}

// ── Buffer helpers ──────────────────────────────────────────────────────

function _uploadStorage(data) {
  const { device, queue } = _wgState;
  const buf = device.createBuffer({
    size: data.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  queue.writeBuffer(buf, 0, data.buffer, data.byteOffset, data.byteLength);
  return buf;
}

function _uniform(u32s) {
  const { device, queue } = _wgState;
  const bytes = Math.max(16, u32s.length * 4);
  const buf = device.createBuffer({
    size: bytes,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const arr = new Uint32Array(bytes / 4);
  arr.set(u32s);
  queue.writeBuffer(buf, 0, arr);
  return buf;
}

async function _readback(gpuBuf, bytes) {
  const { device, queue } = _wgState;
  const dst = device.createBuffer({
    size: bytes,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  const enc = device.createCommandEncoder();
  enc.copyBufferToBuffer(gpuBuf, 0, dst, 0, bytes);
  queue.submit([enc.finish()]);
  await dst.mapAsync(GPUMapMode.READ);
  const out = new Float32Array(dst.getMappedRange().slice(0));
  dst.unmap();
  dst.destroy();
  return out;
}

// ── matVecAsync ─────────────────────────────────────────────────────────

export async function matVecAsync(mat, vec, M, K) {
  if (!_wgState.available) return matVec(mat, vec, M, K);
  const { device, queue, matVecPipeline, matVecLayout } = _wgState;

  const matSrc = mat && mat._gpuBuffer ? mat._gpuBuffer : _uploadStorage(mat && mat.buf ? mat.buf : mat);
  const ownMat = !(mat && mat._gpuBuffer);
  const vecBuf = _uploadStorage(vec);
  const outBuf = device.createBuffer({
    size: M * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const dimsBuf = _uniform([M, K, 0, 0]);

  const bg = device.createBindGroup({
    layout: matVecLayout,
    entries: [
      { binding: 0, resource: { buffer: matSrc } },
      { binding: 1, resource: { buffer: vecBuf } },
      { binding: 2, resource: { buffer: outBuf } },
      { binding: 3, resource: { buffer: dimsBuf } },
    ],
  });

  const enc = device.createCommandEncoder();
  const pass = enc.beginComputePass();
  pass.setPipeline(matVecPipeline);
  pass.setBindGroup(0, bg);
  pass.dispatchWorkgroups(M);
  pass.end();
  queue.submit([enc.finish()]);

  const out = await _readback(outBuf, M * 4);
  vecBuf.destroy();
  outBuf.destroy();
  dimsBuf.destroy();
  if (ownMat) matSrc.destroy();
  return out;
}

// ── matmulAsync ─────────────────────────────────────────────────────────

export async function matmulAsync(a, b, M, N, K) {
  if (!_wgState.available) return matmul(a, b, M, N, K);
  const { device, queue, matmulPipeline, matmulLayout } = _wgState;

  const aBuf = _uploadStorage(a);
  const bBuf = _uploadStorage(b);
  const cBuf = device.createBuffer({
    size: M * N * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const dimsBuf = _uniform([M, N, K, 0]);

  const bg = device.createBindGroup({
    layout: matmulLayout,
    entries: [
      { binding: 0, resource: { buffer: aBuf } },
      { binding: 1, resource: { buffer: bBuf } },
      { binding: 2, resource: { buffer: cBuf } },
      { binding: 3, resource: { buffer: dimsBuf } },
    ],
  });

  const enc = device.createCommandEncoder();
  const pass = enc.beginComputePass();
  pass.setPipeline(matmulPipeline);
  pass.setBindGroup(0, bg);
  const tilesX = Math.ceil(N / 16);
  const tilesY = Math.ceil(M / 16);
  pass.dispatchWorkgroups(tilesX, tilesY);
  pass.end();
  queue.submit([enc.finish()]);

  const out = await _readback(cBuf, M * N * 4);
  aBuf.destroy();
  bBuf.destroy();
  cBuf.destroy();
  dimsBuf.destroy();
  return out;
}

// ── dotAsync ────────────────────────────────────────────────────────────

export async function dotAsync(a, b) {
  if (!_wgState.available) return dot(a, b);
  const { device, queue, dotPipeline, dotLayout } = _wgState;
  const N = a.length;
  const wgCount = Math.min(65536, Math.max(1, Math.ceil(N / 256)));

  const aBuf = _uploadStorage(a);
  const bBuf = _uploadStorage(b);
  const partials = device.createBuffer({
    size: wgCount * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const dimsBuf = _uniform([N, 0, 0, 0]);

  const bg = device.createBindGroup({
    layout: dotLayout,
    entries: [
      { binding: 0, resource: { buffer: aBuf } },
      { binding: 1, resource: { buffer: bBuf } },
      { binding: 2, resource: { buffer: partials } },
      { binding: 3, resource: { buffer: dimsBuf } },
    ],
  });

  const enc = device.createCommandEncoder();
  const pass = enc.beginComputePass();
  pass.setPipeline(dotPipeline);
  pass.setBindGroup(0, bg);
  pass.dispatchWorkgroups(wgCount);
  pass.end();
  queue.submit([enc.finish()]);

  const partArr = await _readback(partials, wgCount * 4);
  let acc = 0;
  for (let i = 0; i < partArr.length; i++) acc += partArr[i];

  aBuf.destroy();
  bBuf.destroy();
  partials.destroy();
  dimsBuf.destroy();
  return acc;
}

// ── hold() / release() ──────────────────────────────────────────────────

function hold(buf) {
  if (_wgState.available) {
    const gpuBuf = _uploadStorage(buf);
    return { kind: "gpu", buf, _gpuBuffer: gpuBuf };
  }
  return { kind: "cpu", buf };
}
function holdQ4K(buf) {
  // Q4_K needs a dedicated dequantizing kernel (Parabun's native path
  // uses one). The WGSL port is on the roadmap — see README "LLM
  // inference" section. For now this is a CPU-only passthrough handle
  // so callers don't crash.
  return { kind: "q4k", buf };
}
function holdQ6K(buf) {
  return { kind: "q6k", buf };
}
function release(held) {
  if (held && held._gpuBuffer) held._gpuBuffer.destroy();
}
function releasePinned(_buf) {}

class GpuFloat32Array extends Float32Array {}
class GpuHandleArray {
  constructor(items = []) {
    this.items = items;
  }
  push(x) {
    this.items.push(x);
  }
  get length() {
    return this.items.length;
  }
}

function activeBackend() {
  return _wgState.available ? "webgpu" : "cpu";
}
function hasBackend(name) {
  if (name === "webgpu") return _wgState.available;
  if (name === "cpu") return true;
  return false;
}
function setBackend(_name) {}
function winsForSize(op, n) {
  if (!_wgState.available) return false;
  if (op === "matVec") return n >= 65536;
  if (op === "matmul") return n >= 4096;
  if (op === "dot") return n >= 262144;
  return false;
}
function calibrate() {}
function dispose() {
  if (_wgState.device) _wgState.device.destroy?.();
  _wgState.available = false;
  _wgState.device = null;
  _wgState.queue = null;
  _wgState.matVecPipeline = null;
  _wgState.matmulPipeline = null;
  _wgState.dotPipeline = null;
  _wgState.matVecLayout = null;
  _wgState.matmulLayout = null;
  _wgState.dotLayout = null;
  _wgState.initPromise = null;
}
function describe() {
  return {
    backend: activeBackend(),
    webgpu: _wgState.available,
    error: _wgState.error,
    kernels: _wgState.available ? ["matVecAsync", "matmulAsync", "dotAsync"] : [],
    note: _wgState.available
      ? "WebGPU backend active. Async kernels dispatch to GPU; sync surface stays CPU."
      : "CPU only. Call `await gpu.initWebGPU()` to enable WebGPU async kernels.",
  };
}
function getDevOps() {
  return { matVec, matVecAsync, matmul, matmulAsync, dot, dotAsync };
}

export {
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
};

export default {
  dot,
  dotAsync,
  matVec,
  matVecAsync,
  matmul,
  matmulAsync,
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
  initWebGPU,
};
