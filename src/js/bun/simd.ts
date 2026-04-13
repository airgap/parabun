// Hardcoded module "bun:simd"
//
// Parabun: vector primitives over typed arrays, designed for use with `pure`
// functions and the `|>` pipeline operator.
//
//   import { mulScalar, add, sum, dot, simdMap } from "bun:simd";
//   const y = mulScalar(new Float32Array([1, 2, 3, 4]), 3); // → [3, 6, 9, 12]
//
// Fast paths:
//   - `mulScalar` uses a hand-assembled WASM v128 (f32x4) kernel when available
//     (gated via `isWasmAvailable()`). All other primitives use tight
//     typed-array JS loops for now — JSC's FTL tier auto-vectorizes them.
//     More WASM kernels are tracked in LLMs.md pending work.

type F32 = Float32Array;

// --- WASM v128 module builder ---
//
// Hand-assembles a tiny module exporting a linear memory and one f32x4 kernel
// (`mulScalar`). Composed from byte-level helpers so each instruction is
// visible next to its WAT form.

function uleb(n: number): number[] {
  const out: number[] = [];
  do {
    let b = n & 0x7f;
    n >>>= 7;
    if (n !== 0) b |= 0x80;
    out.push(b);
  } while (n !== 0);
  return out;
}

function sleb(n: number): number[] {
  const out: number[] = [];
  let more = true;
  while (more) {
    let b = n & 0x7f;
    n >>= 7;
    const signBit = b & 0x40;
    if ((n === 0 && !signBit) || (n === -1 && signBit)) more = false;
    else b |= 0x80;
    out.push(b);
  }
  return out;
}

function f32le(x: number): number[] {
  const buf = new Uint8Array(4);
  new DataView(buf.buffer).setFloat32(0, x, true);
  return [buf[0], buf[1], buf[2], buf[3]];
}

function vec(items: number[]): number[] {
  return [...uleb(items.length), ...items];
}

function str(s: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i));
  return [...uleb(bytes.length), ...bytes];
}

function section(id: number, payload: number[]): number[] {
  return [id, ...uleb(payload.length), ...payload];
}

const I32 = 0x7f,
  F32 = 0x7d,
  V128 = 0x7b;
const BLOCK_VOID = 0x40;

// Instruction helpers — each returns a byte array.
const op = {
  end: () => [0x0b],
  block: () => [0x02, BLOCK_VOID],
  loop: () => [0x03, BLOCK_VOID],
  br: (n: number) => [0x0c, ...uleb(n)],
  brIf: (n: number) => [0x0d, ...uleb(n)],
  localGet: (i: number) => [0x20, ...uleb(i)],
  localSet: (i: number) => [0x21, ...uleb(i)],
  i32Const: (n: number) => [0x41, ...sleb(n)],
  f32Const: (x: number) => [0x43, ...f32le(x)],
  i32Add: () => [0x6a],
  i32Shl: () => [0x74],
  i32GtS: () => [0x4a],
  i32GeS: () => [0x4e],
  f32Load: () => [0x2a, 0x00, 0x00],
  f32Store: () => [0x38, 0x00, 0x00],
  f32Mul: () => [0x94],
  v128Load: () => [0xfd, 0x00, 0x00, 0x00],
  v128Store: () => [0xfd, 0x0b, 0x00, 0x00],
  f32x4Splat: () => [0xfd, 0x13],
  f32x4Mul: () => [0xfd, 0xe6, 0x01],
};

// mulScalar(len: i32, c: f32) — multiplies Float32Array at memory[0..len*4) by c.
// Locals: $i (i32, idx 2), $addr (i32, idx 3), $k (v128, idx 4).
function mulScalarBody(): number[] {
  return [
    // k = f32x4.splat(c)
    ...op.localGet(1),
    ...op.f32x4Splat(),
    ...op.localSet(4),

    // SIMD loop: while (i + 4 <= len) { ... i += 4 }
    ...op.block(),
    ...op.loop(),
    // guard: (i + 4) > len -> break
    ...op.localGet(2),
    ...op.i32Const(4),
    ...op.i32Add(),
    ...op.localGet(0),
    ...op.i32GtS(),
    ...op.brIf(1),
    // addr = i << 2
    ...op.localGet(2),
    ...op.i32Const(2),
    ...op.i32Shl(),
    ...op.localSet(3),
    // v128.store(addr, f32x4.mul(v128.load(addr), k))
    ...op.localGet(3),
    ...op.localGet(3),
    ...op.v128Load(),
    ...op.localGet(4),
    ...op.f32x4Mul(),
    ...op.v128Store(),
    // i += 4
    ...op.localGet(2),
    ...op.i32Const(4),
    ...op.i32Add(),
    ...op.localSet(2),
    ...op.br(0),
    ...op.end(),
    ...op.end(),

    // Scalar tail: while (i < len) { ... i += 1 }
    ...op.block(),
    ...op.loop(),
    ...op.localGet(2),
    ...op.localGet(0),
    ...op.i32GeS(),
    ...op.brIf(1),
    ...op.localGet(2),
    ...op.i32Const(2),
    ...op.i32Shl(),
    ...op.localSet(3),
    ...op.localGet(3),
    ...op.localGet(3),
    ...op.f32Load(),
    ...op.localGet(1),
    ...op.f32Mul(),
    ...op.f32Store(),
    ...op.localGet(2),
    ...op.i32Const(1),
    ...op.i32Add(),
    ...op.localSet(2),
    ...op.br(0),
    ...op.end(),
    ...op.end(),

    ...op.end(), // function end
  ];
}

function buildModule(): Uint8Array {
  // Locals declaration: (count, type) groups. 2 × i32, 1 × v128.
  const locals = [0x02, ...uleb(2), I32, ...uleb(1), V128];
  const body = [...locals, ...mulScalarBody()];

  const bytes: number[] = [
    // magic + version
    0x00,
    0x61,
    0x73,
    0x6d,
    0x01,
    0x00,
    0x00,
    0x00,
    // Type section: type 0 = (i32, f32) -> ()
    ...section(1, [
      ...uleb(1), // 1 type
      0x60, // func
      ...vec([I32, F32]), // params
      ...vec([]), // results
    ]),
    // Function section: 1 function of type 0
    ...section(3, [...uleb(1), ...uleb(0)]),
    // Memory section: 1 page initial (64KB), no max
    ...section(5, [...uleb(1), 0x00, ...uleb(1)]),
    // Export section: memory "mem" + func "mulScalar"
    ...section(7, [...uleb(2), ...str("mem"), 0x02, ...uleb(0), ...str("mulScalar"), 0x00, ...uleb(0)]),
    // Code section: one function body
    ...section(10, [...uleb(1), ...uleb(body.length), ...body]),
  ];
  return new Uint8Array(bytes);
}

// --- Instantiate ---

type WasmExports = {
  mem: WebAssembly.Memory;
  mulScalar: (len: number, c: number) => void;
};

let wasm: WasmExports | null = null;
try {
  const mod = new WebAssembly.Module(buildModule());
  const inst = new WebAssembly.Instance(mod);
  // @ts-ignore — exports are untyped
  wasm = inst.exports as WasmExports;
} catch {
  wasm = null;
}

function isWasmAvailable(): boolean {
  return wasm !== null;
}

function ensureCapacity(bytesNeeded: number): Float32Array {
  const mem = wasm!.mem;
  if (mem.buffer.byteLength < bytesNeeded) {
    const need = Math.ceil((bytesNeeded - mem.buffer.byteLength) / 65536);
    mem.grow(need);
  }
  return new Float32Array(mem.buffer);
}

// --- Validators ---

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

// --- Primitives ---

function mulScalar(a: F32, c: number): F32 {
  requireF32(a, "a");
  const n = a.length;
  if (n === 0) return new Float32Array(0);
  if (wasm !== null) {
    const view = ensureCapacity(n * 4);
    view.set(a, 0);
    wasm.mulScalar(n, c);
    return view.slice(0, n);
  }
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

function simdMap(fn: (x: number, i: number) => number, a: F32): F32 {
  requireF32(a, "a");
  if (typeof fn !== "function") throw new TypeError("fn must be a function");
  const n = a.length;
  const out = new Float32Array(n);

  if (fn.length <= 1) {
    const aff = tryAffineKernel(fn as (x: number) => number);
    if (aff) {
      const { k1, k0 } = aff;
      // Scaled + offset: use the SIMD mulScalar if it's a pure multiply,
      // otherwise inline the affine form.
      if (k0 === 0) return mulScalar(a, k1);
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
  isWasmAvailable,
};
