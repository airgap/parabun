// Browser shim for `bun:simd`. The upstream dispatches to
// hand-assembled WebAssembly v128 kernels; the browser shim provides
// scalar loops with the same signatures. Fidelity is bit-exact on
// basic arithmetic; performance tradeoff is the whole point of the
// upstream, so expect 5–20× slower on large TypedArrays.
//
// A later revision can swap these for WebAssembly SIMD (128-bit v128
// is widely supported since 2022) behind the same API; the scalar
// implementation here is the fallback path either way.

function mulScalar(a, k) {
  const n = a.length;
  const out = new a.constructor(n);
  for (let i = 0; i < n; i++) out[i] = a[i] * k;
  return out;
}

function addScalar(a, k) {
  const n = a.length;
  const out = new a.constructor(n);
  for (let i = 0; i < n; i++) out[i] = a[i] + k;
  return out;
}

function add(a, b) {
  const n = a.length;
  const out = new a.constructor(n);
  for (let i = 0; i < n; i++) out[i] = a[i] + b[i];
  return out;
}

function mul(a, b) {
  const n = a.length;
  const out = new a.constructor(n);
  for (let i = 0; i < n; i++) out[i] = a[i] * b[i];
  return out;
}

function sum(a) {
  let s = 0;
  const n = a.length;
  for (let i = 0; i < n; i++) s += a[i];
  return s;
}

function dot(a, b) {
  let s = 0;
  const n = a.length;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

function matVec(mat, vec, M, K) {
  const out = new vec.constructor(M);
  for (let i = 0; i < M; i++) {
    let s = 0;
    const row = i * K;
    for (let j = 0; j < K; j++) s += mat[row + j] * vec[j];
    out[i] = s;
  }
  return out;
}

function simdMap(fn, a) {
  const n = a.length;
  const out = new a.constructor(n);
  for (let i = 0; i < n; i++) out[i] = fn(a[i]);
  return out;
}

function topK(a, k) {
  const n = a.length;
  const idx = new Int32Array(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  idx.sort((x, y) => a[y] - a[x]);
  return { indices: idx.slice(0, k), values: a.constructor.from(idx.slice(0, k), i => a[i]) };
}

function alloc(n, type) {
  if (type === "f32" || type === "float32") return new Float32Array(n);
  if (type === "f64" || type === "float64") return new Float64Array(n);
  throw new Error(`bun:simd alloc: unsupported dtype "${type}" (browser shim supports f32 / f64)`);
}

const isWasmAvailable = () => false;
const isWasmBacked = () => false;
const wasmWinsForSize = () => false;
const hasUnifiedMemoryGPU = () => false;
const hasDiscreteGPU = () => false;

export {
  mulScalar,
  addScalar,
  add,
  mul,
  sum,
  dot,
  matVec,
  topK,
  simdMap,
  alloc,
  isWasmAvailable,
  isWasmBacked,
  wasmWinsForSize,
  hasUnifiedMemoryGPU,
  hasDiscreteGPU,
};
export default {
  mulScalar,
  addScalar,
  add,
  mul,
  sum,
  dot,
  matVec,
  topK,
  simdMap,
  alloc,
  isWasmAvailable,
  isWasmBacked,
  wasmWinsForSize,
  hasUnifiedMemoryGPU,
  hasDiscreteGPU,
};
