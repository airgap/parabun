// Hardcoded module "bun:simd"
//
// Parabun: vector primitives over typed arrays, designed for use with `pure`
// functions and the `|>` pipeline operator.
//
//   import { mulScalar, add, sum, dot, simdMap } from "bun:simd";
//   const y = mulScalar(new Float32Array([1, 2, 3, 4]), 3); // → [3, 6, 9, 12]
//
// Initial implementation: tight typed-array loops. JSC's FTL tier
// auto-vectorizes these on hot paths. A hand-coded WASM v128 fast path is
// planned as follow-up for ops that would benefit most (mulScalar, add,
// mul, dot over large Float32Arrays).

type F32 = Float32Array;

function requireF32(a: unknown, argName: string): F32 {
  if (!(a instanceof Float32Array)) {
    throw new TypeError(`${argName} must be a Float32Array`);
  }
  return a;
}

function requireSameLen(a: F32, b: F32): void {
  if (a.length !== b.length) {
    throw new RangeError(`array lengths differ: ${a.length} vs ${b.length}`);
  }
}

function mulScalar(a: F32, c: number): F32 {
  requireF32(a, "a");
  const n = a.length;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = a[i] * c;
  return out;
}

function addScalar(a: F32, c: number): F32 {
  requireF32(a, "a");
  const n = a.length;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = a[i] + c;
  return out;
}

function add(a: F32, b: F32): F32 {
  requireF32(a, "a");
  requireF32(b, "b");
  requireSameLen(a, b);
  const n = a.length;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = a[i] + b[i];
  return out;
}

function mul(a: F32, b: F32): F32 {
  requireF32(a, "a");
  requireF32(b, "b");
  requireSameLen(a, b);
  const n = a.length;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = a[i] * b[i];
  return out;
}

function sum(a: F32): number {
  requireF32(a, "a");
  const n = a.length;
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i];
  return s;
}

function dot(a: F32, b: F32): number {
  requireF32(a, "a");
  requireF32(b, "b");
  requireSameLen(a, b);
  const n = a.length;
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

// --- simdMap ---
//
// Attempts to recognize the kernel as an affine transform `x * k1 + k0` by
// probing the function with a handful of numeric inputs. If the map is affine
// (to within FP tolerance), we dispatch to the SIMD-friendly `mulScalar` +
// `addScalar` combination. Otherwise we fall back to a scalar loop.
//
// Only sound for pure unary numeric functions — the "pure" contract guarantees
// the probe calls are observably equivalent to the real calls.

const AFFINE_TOL = 1e-5;

function tryAffineKernel(fn: (x: number) => number): { k1: number; k0: number } | null {
  try {
    const y0 = fn(0);
    const y1 = fn(1);
    const y2 = fn(2);
    if (!Number.isFinite(y0) || !Number.isFinite(y1) || !Number.isFinite(y2)) return null;
    const k1 = y1 - y0;
    const k0 = y0;
    // Verify linearity at x=2.
    if (Math.abs(y2 - (2 * k1 + k0)) > AFFINE_TOL * (1 + Math.abs(y2))) return null;
    return { k1, k0 };
  } catch {
    return null;
  }
}

function simdMap(fn: (x: number, i: number) => number, a: F32): F32 {
  requireF32(a, "a");
  if (typeof fn !== "function") throw new TypeError("fn must be a function");
  const n = a.length;
  const out = new Float32Array(n);

  // Only try the affine fast path for single-arg kernels (ignoring index).
  if (fn.length <= 1) {
    const aff = tryAffineKernel(fn as (x: number) => number);
    if (aff) {
      const { k1, k0 } = aff;
      for (let i = 0; i < n; i++) out[i] = a[i] * k1 + k0;
      return out;
    }
  }

  for (let i = 0; i < n; i++) out[i] = fn(a[i], i);
  return out;
}

export default {
  mulScalar,
  addScalar,
  add,
  mul,
  sum,
  dot,
  simdMap,
};
