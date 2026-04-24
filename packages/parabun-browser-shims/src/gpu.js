// Browser shim for `bun:gpu`. Provides:
//
//   - Sync CPU fallback for every op (via bun:simd scalar loops).
//     This is what code that does `gpu.matVec(...)` sees by default;
//     it preserves the upstream sync signature so .pts code compiles
//     to browser without an awkward await pass.
//
//   - Optional WebGPU backend for `matVecAsync` — apps that want GPU
//     acceleration on the browser call `await gpu.initWebGPU()` once
//     at startup, then use `await gpu.matVecAsync(...)`. WebGPU
//     readback is fundamentally async (mapAsync), so there's no way
//     to keep `matVec` itself sync while dispatching through WebGPU —
//     splitting the surface keeps the choice explicit.
//
//   - `gpu.hold(mat)` / `holdQ4K(mat)` / `holdQ6K(mat)` upload the
//     matrix to a GPU buffer on a best-effort basis; CPU-backed
//     handles are returned if WebGPU isn't initialized. Subsequent
//     `matVecAsync(held, vec, ...)` calls skip the matrix upload.

import simd from "./simd.js";

// ── Sync CPU path — always available ────────────────────────────────────

function dot(a, b) {
  return simd.dot(a, b);
}

function matVec(mat, vec, M, K) {
  // `mat` may be a GPU handle from `hold()`; unwrap it.
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

// ── WebGPU backend (opt-in, async) ──────────────────────────────────────

const MATVEC_WGSL = /* wgsl */ `
struct Dims { M: u32, K: u32, _pad0: u32, _pad1: u32 };
@group(0) @binding(0) var<storage, read> mat: array<f32>;
@group(0) @binding(1) var<storage, read> vec: array<f32>;
@group(0) @binding(2) var<storage, read_write> outv: array<f32>;
@group(0) @binding(3) var<uniform> dims: Dims;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= dims.M) { return; }
  var s: f32 = 0.0;
  let row = i * dims.K;
  for (var j: u32 = 0u; j < dims.K; j = j + 1u) {
    s = s + mat[row + j] * vec[j];
  }
  outv[i] = s;
}`;

const _wgState = {
  available: false,
  initPromise: null,
  device: null,
  queue: null,
  pipeline: null,
  layout: null,
  error: null,
};

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
  const module = device.createShaderModule({ code: MATVEC_WGSL });
  const layout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
    ],
  });
  const pipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
    compute: { module, entryPoint: "main" },
  });
  _wgState.device = device;
  _wgState.queue = device.queue;
  _wgState.pipeline = pipeline;
  _wgState.layout = layout;
  _wgState.available = true;
  return true;
}

export function initWebGPU() {
  if (!_wgState.initPromise) _wgState.initPromise = _initWebGPUInternal();
  return _wgState.initPromise;
}

function _writeMat(mat) {
  // Returns a pre-uploaded GPU storage buffer containing `mat` as f32.
  const { device, queue } = _wgState;
  const buf = device.createBuffer({
    size: mat.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  queue.writeBuffer(buf, 0, mat.buffer, mat.byteOffset, mat.byteLength);
  return buf;
}

export async function matVecAsync(mat, vec, M, K) {
  if (!_wgState.available) {
    // Backend not initialized (or unavailable) — CPU fallback.
    return matVec(mat, vec, M, K);
  }
  const { device, queue, pipeline, layout } = _wgState;

  const matBuf = mat && mat._gpuBuffer ? mat._gpuBuffer : _writeMat(mat && mat.buf ? mat.buf : mat);
  const ownMatBuf = !(mat && mat._gpuBuffer);

  const vecBuf = device.createBuffer({
    size: vec.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  queue.writeBuffer(vecBuf, 0, vec.buffer, vec.byteOffset, vec.byteLength);

  const outBytes = M * 4;
  const outBuf = device.createBuffer({
    size: outBytes,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  const dims = new Uint32Array([M, K, 0, 0]);
  const dimsBuf = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  queue.writeBuffer(dimsBuf, 0, dims);

  const bg = device.createBindGroup({
    layout,
    entries: [
      { binding: 0, resource: { buffer: matBuf } },
      { binding: 1, resource: { buffer: vecBuf } },
      { binding: 2, resource: { buffer: outBuf } },
      { binding: 3, resource: { buffer: dimsBuf } },
    ],
  });

  const readback = device.createBuffer({
    size: outBytes,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  const enc = device.createCommandEncoder();
  const pass = enc.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bg);
  pass.dispatchWorkgroups(Math.ceil(M / 64));
  pass.end();
  enc.copyBufferToBuffer(outBuf, 0, readback, 0, outBytes);
  queue.submit([enc.finish()]);

  await readback.mapAsync(GPUMapMode.READ);
  const result = new Float32Array(readback.getMappedRange().slice(0));
  readback.unmap();

  readback.destroy();
  vecBuf.destroy();
  outBuf.destroy();
  dimsBuf.destroy();
  if (ownMatBuf) matBuf.destroy();

  return result;
}

// ── hold() / release() ──────────────────────────────────────────────────

// When WebGPU is initialized, `hold()` uploads once and stashes the GPU
// buffer on the returned handle so subsequent `matVecAsync(held, ...)`
// calls skip the per-call upload. Without WebGPU it's a CPU passthrough
// handle, same as before.
function hold(buf) {
  if (_wgState.available) {
    const gpuBuf = _writeMat(buf);
    return { kind: "gpu", buf, _gpuBuffer: gpuBuf };
  }
  return { kind: "cpu", buf };
}
function holdQ4K(buf) {
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
  // matVec wins on WebGPU above ~64k-element matrices; below that,
  // setup + readback cost dominates.
  if (!_wgState.available) return false;
  if (op === "matVec") return n >= 65536;
  return false;
}
function calibrate() {}
function dispose() {
  if (_wgState.device) _wgState.device.destroy?.();
  _wgState.available = false;
  _wgState.device = null;
  _wgState.queue = null;
  _wgState.pipeline = null;
  _wgState.layout = null;
  _wgState.initPromise = null;
}
function describe() {
  return {
    backend: activeBackend(),
    webgpu: _wgState.available,
    error: _wgState.error,
    note: _wgState.available
      ? "parabun-browser-shims: WebGPU backend active. matVecAsync uses GPU; sync matVec stays CPU."
      : "parabun-browser-shims: CPU only. Call `await gpu.initWebGPU()` at startup to enable WebGPU matVecAsync.",
  };
}
function getDevOps() {
  return { matVec, matVecAsync, matmul, dot };
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
  matVec,
  matVecAsync,
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
  initWebGPU,
};
