// Browser shim for `bun:gpu`. The upstream targets Metal (macOS) and
// CUDA (Linux/Windows); the browser equivalent is WebGPU / WebGL2.
// V1 of this shim is a **CPU fallback** — every call runs as a scalar
// loop on the main thread. This keeps all call sites functional and
// bit-exact with upstream's CPU fallback path; performance is poor
// but correctness holds.
//
// TODO: upgrade `matVec`, `matmul`, `simdMap` to WebGPU compute
// shaders (preferred) with a WebGL2 fragment-shader fallback. The
// `hold` / `holdQ4K` / `holdQ6K` functions should return thin handles
// that stash a device-side buffer when a GPU is available, otherwise
// fall back to the existing CPU Array.

import simd from "./simd.js";

function dot(a, b) {
  return simd.dot(a, b);
}

function matVec(mat, vec, M, K) {
  return simd.matVec(mat, vec, M, K);
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

// `hold()` materializes a "device-resident" matrix in the upstream. In
// the browser shim it's a noop identity wrapper — callers pass the
// returned handle back to matVec etc. and we treat it as the original
// buffer.
function hold(buf) {
  return { kind: "cpu", buf };
}
function holdQ4K(buf) {
  return { kind: "q4k", buf };
}
function holdQ6K(buf) {
  return { kind: "q6k", buf };
}
function release(_held) {}
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
  return "cpu";
}
function hasBackend(_name) {
  return false;
}
function setBackend(_name) {}
function winsForSize() {
  return false;
}
function calibrate() {}
function dispose() {}
function describe() {
  return {
    backend: "cpu",
    note: "parabun-browser-shims: no GPU backend wired. Add one at src/gpu.js.",
  };
}
function getDevOps() {
  return { matVec, matmul, dot };
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
