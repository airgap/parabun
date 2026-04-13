// Hardcoded module "bun:simd"
//
// Parabun: vector primitives over typed arrays, designed for use with `pure`
// functions and the `|>` pipeline operator.
//
//   import { mulScalar, add, sum, dot, simdMap } from "bun:simd";
//   const y32 = mulScalar(new Float32Array([1, 2, 3, 4]), 3);  // → [3, 6, 9, 12]
//   const y64 = mulScalar(new Float64Array([1, 2, 3, 4]), 3);  // same, f64x2 path
//
// Fast paths:
//   - All primitives (mulScalar, addScalar, add, mul, sum, dot) use
//     hand-assembled WASM v128 kernels when available (gated via
//     `isWasmAvailable()`). Float32Array inputs dispatch to f32x4 kernels,
//     Float64Array inputs to f64x2 kernels. JS tight typed-array loops are
//     kept as a fallback for both element widths.

type FArray = Float32Array | Float64Array;

// --- WASM v128 module builder ---
//
// Hand-assembles a tiny module exporting a linear memory plus one SIMD
// kernel per (primitive × element width). Composed from byte-level helpers
// so each instruction is visible next to its WAT form.

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

function f64le(x: number): number[] {
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setFloat64(0, x, true);
  return [buf[0], buf[1], buf[2], buf[3], buf[4], buf[5], buf[6], buf[7]];
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
  F64 = 0x7c,
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
  f64Const: (x: number) => [0x44, ...f64le(x)],
  i32Add: () => [0x6a],
  i32Mul: () => [0x6c],
  i32Shl: () => [0x74],
  i32GtS: () => [0x4a],
  i32GeS: () => [0x4e],
  f32Load: () => [0x2a, 0x00, 0x00],
  f32Store: () => [0x38, 0x00, 0x00],
  f64Load: () => [0x2b, 0x00, 0x00],
  f64Store: () => [0x39, 0x00, 0x00],
  f32Add: () => [0x92],
  f32Mul: () => [0x94],
  f64Add: () => [0xa0],
  f64Mul: () => [0xa2],
  v128Load: () => [0xfd, 0x00, 0x00, 0x00],
  v128Store: () => [0xfd, 0x0b, 0x00, 0x00],
  f32x4Splat: () => [0xfd, 0x13],
  f32x4ExtractLane: (lane: number) => [0xfd, 0x1f, lane],
  f32x4Add: () => [0xfd, 0xe4, 0x01],
  f32x4Mul: () => [0xfd, 0xe6, 0x01],
  f64x2Splat: () => [0xfd, 0x14],
  f64x2ExtractLane: (lane: number) => [0xfd, 0x21, lane],
  f64x2Add: () => [0xfd, 0xf0, 0x01],
  f64x2Mul: () => [0xfd, 0xf2, 0x01],
};

// Element-width configuration shared across kernels.
type NumCfg = {
  stride: number; // elements per v128 (4 for f32, 2 for f64)
  shift: number; // log2 of bytes/elem (2 for f32, 3 for f64)
  lanes: number; // same as stride; kept for clarity
  vecSplat: number[];
  vecAdd: number[];
  vecMul: number[];
  scalarLoad: number[];
  scalarStore: number[];
  scalarAdd: number[];
  scalarMul: number[];
  scalarZero: number[];
  extractLane: (lane: number) => number[];
};

const F32Cfg: NumCfg = {
  stride: 4,
  shift: 2,
  lanes: 4,
  vecSplat: op.f32x4Splat(),
  vecAdd: op.f32x4Add(),
  vecMul: op.f32x4Mul(),
  scalarLoad: op.f32Load(),
  scalarStore: op.f32Store(),
  scalarAdd: op.f32Add(),
  scalarMul: op.f32Mul(),
  scalarZero: op.f32Const(0),
  extractLane: lane => op.f32x4ExtractLane(lane),
};

const F64Cfg: NumCfg = {
  stride: 2,
  shift: 3,
  lanes: 2,
  vecSplat: op.f64x2Splat(),
  vecAdd: op.f64x2Add(),
  vecMul: op.f64x2Mul(),
  scalarLoad: op.f64Load(),
  scalarStore: op.f64Store(),
  scalarAdd: op.f64Add(),
  scalarMul: op.f64Mul(),
  scalarZero: op.f64Const(0),
  extractLane: lane => op.f64x2ExtractLane(lane),
};

// --- Kernel bodies ---
//
// Memory layout (shared between F32 and F64 kernels, one at a time):
//   - scalar ops (mulScalar, addScalar, sum): a @ memory[0 .. len*elemBytes)
//   - binary ops (add, mul, dot):             a @ memory[0 .. len*elemBytes),
//                                             b @ memory[len*elemBytes .. 2*len*elemBytes)
// JS wrappers copy inputs in and slice outputs out; kernels operate in place.

// Scalar-op body template: out[i] = op(a[i], c). Works for mulScalar (vecMul /
// scalarMul) and addScalar (vecAdd / scalarAdd). Param: $len (0), $c (1).
// Locals: $i (2), $addr (3), $k (v128, 4).
function scalarOpBody(cfg: NumCfg, vecOp: number[], scalarOp: number[]): number[] {
  return [
    ...op.localGet(1),
    ...cfg.vecSplat,
    ...op.localSet(4),
    // SIMD loop
    ...op.block(),
    ...op.loop(),
    ...op.localGet(2),
    ...op.i32Const(cfg.stride),
    ...op.i32Add(),
    ...op.localGet(0),
    ...op.i32GtS(),
    ...op.brIf(1),
    ...op.localGet(2),
    ...op.i32Const(cfg.shift),
    ...op.i32Shl(),
    ...op.localSet(3),
    ...op.localGet(3),
    ...op.localGet(3),
    ...op.v128Load(),
    ...op.localGet(4),
    ...vecOp,
    ...op.v128Store(),
    ...op.localGet(2),
    ...op.i32Const(cfg.stride),
    ...op.i32Add(),
    ...op.localSet(2),
    ...op.br(0),
    ...op.end(),
    ...op.end(),
    // Scalar tail
    ...op.block(),
    ...op.loop(),
    ...op.localGet(2),
    ...op.localGet(0),
    ...op.i32GeS(),
    ...op.brIf(1),
    ...op.localGet(2),
    ...op.i32Const(cfg.shift),
    ...op.i32Shl(),
    ...op.localSet(3),
    ...op.localGet(3),
    ...op.localGet(3),
    ...cfg.scalarLoad,
    ...op.localGet(1),
    ...scalarOp,
    ...cfg.scalarStore,
    ...op.localGet(2),
    ...op.i32Const(1),
    ...op.i32Add(),
    ...op.localSet(2),
    ...op.br(0),
    ...op.end(),
    ...op.end(),
    ...op.end(),
  ];
}

// Binary-vec body: a[i] = op(a[i], b[i]).
// Param: $len (0). Locals: $i (1), $addr_a (2), $addr_b (3), $len_bytes (4).
function binaryVecBody(cfg: NumCfg, vecOp: number[], scalarOp: number[]): number[] {
  return [
    ...op.localGet(0),
    ...op.i32Const(cfg.shift),
    ...op.i32Shl(),
    ...op.localSet(4),
    ...op.block(),
    ...op.loop(),
    ...op.localGet(1),
    ...op.i32Const(cfg.stride),
    ...op.i32Add(),
    ...op.localGet(0),
    ...op.i32GtS(),
    ...op.brIf(1),
    ...op.localGet(1),
    ...op.i32Const(cfg.shift),
    ...op.i32Shl(),
    ...op.localSet(2),
    ...op.localGet(2),
    ...op.localGet(4),
    ...op.i32Add(),
    ...op.localSet(3),
    ...op.localGet(2),
    ...op.localGet(2),
    ...op.v128Load(),
    ...op.localGet(3),
    ...op.v128Load(),
    ...vecOp,
    ...op.v128Store(),
    ...op.localGet(1),
    ...op.i32Const(cfg.stride),
    ...op.i32Add(),
    ...op.localSet(1),
    ...op.br(0),
    ...op.end(),
    ...op.end(),
    ...op.block(),
    ...op.loop(),
    ...op.localGet(1),
    ...op.localGet(0),
    ...op.i32GeS(),
    ...op.brIf(1),
    ...op.localGet(1),
    ...op.i32Const(cfg.shift),
    ...op.i32Shl(),
    ...op.localSet(2),
    ...op.localGet(2),
    ...op.localGet(4),
    ...op.i32Add(),
    ...op.localSet(3),
    ...op.localGet(2),
    ...op.localGet(2),
    ...cfg.scalarLoad,
    ...op.localGet(3),
    ...cfg.scalarLoad,
    ...scalarOp,
    ...cfg.scalarStore,
    ...op.localGet(1),
    ...op.i32Const(1),
    ...op.i32Add(),
    ...op.localSet(1),
    ...op.br(0),
    ...op.end(),
    ...op.end(),
    ...op.end(),
  ];
}

// Horizontal reduce for an accumulator v128 local into a scalar f32/f64.
// Emits: localGet(accV), extract(0), [localGet(accV), extract(L), scalarAdd]*, localSet(accS).
function horizReduce(cfg: NumCfg, accVIdx: number, accSIdx: number): number[] {
  const out: number[] = [...op.localGet(accVIdx), ...cfg.extractLane(0)];
  for (let lane = 1; lane < cfg.lanes; lane++) {
    out.push(...op.localGet(accVIdx), ...cfg.extractLane(lane), ...cfg.scalarAdd);
  }
  out.push(...op.localSet(accSIdx));
  return out;
}

// sum(len: i32) -> f32/f64 — horizontal sum of a @ memory[0 .. len*elemBytes).
// Param: $len (0). Locals: $i (1), $addr (2), $acc_v (v128, 3), $acc_s (f32/f64, 4).
function sumBody(cfg: NumCfg): number[] {
  return [
    ...cfg.scalarZero,
    ...cfg.vecSplat,
    ...op.localSet(3),
    ...op.block(),
    ...op.loop(),
    ...op.localGet(1),
    ...op.i32Const(cfg.stride),
    ...op.i32Add(),
    ...op.localGet(0),
    ...op.i32GtS(),
    ...op.brIf(1),
    ...op.localGet(1),
    ...op.i32Const(cfg.shift),
    ...op.i32Shl(),
    ...op.localSet(2),
    ...op.localGet(3),
    ...op.localGet(2),
    ...op.v128Load(),
    ...cfg.vecAdd,
    ...op.localSet(3),
    ...op.localGet(1),
    ...op.i32Const(cfg.stride),
    ...op.i32Add(),
    ...op.localSet(1),
    ...op.br(0),
    ...op.end(),
    ...op.end(),
    ...horizReduce(cfg, 3, 4),
    ...op.block(),
    ...op.loop(),
    ...op.localGet(1),
    ...op.localGet(0),
    ...op.i32GeS(),
    ...op.brIf(1),
    ...op.localGet(1),
    ...op.i32Const(cfg.shift),
    ...op.i32Shl(),
    ...op.localSet(2),
    ...op.localGet(4),
    ...op.localGet(2),
    ...cfg.scalarLoad,
    ...cfg.scalarAdd,
    ...op.localSet(4),
    ...op.localGet(1),
    ...op.i32Const(1),
    ...op.i32Add(),
    ...op.localSet(1),
    ...op.br(0),
    ...op.end(),
    ...op.end(),
    ...op.localGet(4),
    ...op.end(),
  ];
}

// dot(len: i32) -> f32/f64 — sum of a[i]*b[i].
// Locals: $i (1), $addr_a (2), $addr_b (3), $len_bytes (4),
//         $acc_v (v128, 5), $acc_s (f32/f64, 6).
function dotBody(cfg: NumCfg): number[] {
  return [
    ...op.localGet(0),
    ...op.i32Const(cfg.shift),
    ...op.i32Shl(),
    ...op.localSet(4),
    ...cfg.scalarZero,
    ...cfg.vecSplat,
    ...op.localSet(5),
    ...op.block(),
    ...op.loop(),
    ...op.localGet(1),
    ...op.i32Const(cfg.stride),
    ...op.i32Add(),
    ...op.localGet(0),
    ...op.i32GtS(),
    ...op.brIf(1),
    ...op.localGet(1),
    ...op.i32Const(cfg.shift),
    ...op.i32Shl(),
    ...op.localSet(2),
    ...op.localGet(2),
    ...op.localGet(4),
    ...op.i32Add(),
    ...op.localSet(3),
    ...op.localGet(5),
    ...op.localGet(2),
    ...op.v128Load(),
    ...op.localGet(3),
    ...op.v128Load(),
    ...cfg.vecMul,
    ...cfg.vecAdd,
    ...op.localSet(5),
    ...op.localGet(1),
    ...op.i32Const(cfg.stride),
    ...op.i32Add(),
    ...op.localSet(1),
    ...op.br(0),
    ...op.end(),
    ...op.end(),
    ...horizReduce(cfg, 5, 6),
    ...op.block(),
    ...op.loop(),
    ...op.localGet(1),
    ...op.localGet(0),
    ...op.i32GeS(),
    ...op.brIf(1),
    ...op.localGet(1),
    ...op.i32Const(cfg.shift),
    ...op.i32Shl(),
    ...op.localSet(2),
    ...op.localGet(2),
    ...op.localGet(4),
    ...op.i32Add(),
    ...op.localSet(3),
    ...op.localGet(6),
    ...op.localGet(2),
    ...cfg.scalarLoad,
    ...op.localGet(3),
    ...cfg.scalarLoad,
    ...cfg.scalarMul,
    ...cfg.scalarAdd,
    ...op.localSet(6),
    ...op.localGet(1),
    ...op.i32Const(1),
    ...op.i32Add(),
    ...op.localSet(1),
    ...op.br(0),
    ...op.end(),
    ...op.end(),
    ...op.localGet(6),
    ...op.end(),
  ];
}

// matVec(nRows, nCols, matOffset, vecOffset, outOffset) -> ()
// out[i] = sum_j matrix[i*nCols + j] * vector[j], for i in [0, nRows).
// Matrix is row-major at matOffset; vector at vecOffset; output at outOffset.
// Locals:
//  5: row (i32)           10: rowByteStart (i32)
//  6: j (i32)             11: nColBytes (i32)       — nCols << shift, invariant
//  7: jBytes (i32)        12: acc_v (v128)
//  8: aAddr (i32)         13: acc_s (f32/f64)
//  9: bAddr (i32)
function matVecBody(cfg: NumCfg): number[] {
  return [
    // nColBytes = nCols << shift
    ...op.localGet(1),
    ...op.i32Const(cfg.shift),
    ...op.i32Shl(),
    ...op.localSet(11),
    // outer row loop
    ...op.block(),
    ...op.loop(),
    ...op.localGet(5),
    ...op.localGet(0),
    ...op.i32GeS(),
    ...op.brIf(1),
    // rowByteStart = matOffset + row * nColBytes
    ...op.localGet(2),
    ...op.localGet(5),
    ...op.localGet(11),
    ...op.i32Mul(),
    ...op.i32Add(),
    ...op.localSet(10),
    // acc_v = splat(0)
    ...cfg.scalarZero,
    ...cfg.vecSplat,
    ...op.localSet(12),
    // j = 0
    ...op.i32Const(0),
    ...op.localSet(6),
    // SIMD col loop
    ...op.block(),
    ...op.loop(),
    ...op.localGet(6),
    ...op.i32Const(cfg.stride),
    ...op.i32Add(),
    ...op.localGet(1),
    ...op.i32GtS(),
    ...op.brIf(1),
    // jBytes = j << shift
    ...op.localGet(6),
    ...op.i32Const(cfg.shift),
    ...op.i32Shl(),
    ...op.localSet(7),
    // aAddr = rowByteStart + jBytes
    ...op.localGet(10),
    ...op.localGet(7),
    ...op.i32Add(),
    ...op.localSet(8),
    // bAddr = vecOffset + jBytes
    ...op.localGet(3),
    ...op.localGet(7),
    ...op.i32Add(),
    ...op.localSet(9),
    // acc_v += v128(aAddr) * v128(bAddr)
    ...op.localGet(12),
    ...op.localGet(8),
    ...op.v128Load(),
    ...op.localGet(9),
    ...op.v128Load(),
    ...cfg.vecMul,
    ...cfg.vecAdd,
    ...op.localSet(12),
    // j += stride
    ...op.localGet(6),
    ...op.i32Const(cfg.stride),
    ...op.i32Add(),
    ...op.localSet(6),
    ...op.br(0),
    ...op.end(),
    ...op.end(),
    // horiz reduce acc_v -> acc_s
    ...horizReduce(cfg, 12, 13),
    // scalar col tail
    ...op.block(),
    ...op.loop(),
    ...op.localGet(6),
    ...op.localGet(1),
    ...op.i32GeS(),
    ...op.brIf(1),
    ...op.localGet(6),
    ...op.i32Const(cfg.shift),
    ...op.i32Shl(),
    ...op.localSet(7),
    ...op.localGet(10),
    ...op.localGet(7),
    ...op.i32Add(),
    ...op.localSet(8),
    ...op.localGet(3),
    ...op.localGet(7),
    ...op.i32Add(),
    ...op.localSet(9),
    ...op.localGet(13),
    ...op.localGet(8),
    ...cfg.scalarLoad,
    ...op.localGet(9),
    ...cfg.scalarLoad,
    ...cfg.scalarMul,
    ...cfg.scalarAdd,
    ...op.localSet(13),
    ...op.localGet(6),
    ...op.i32Const(1),
    ...op.i32Add(),
    ...op.localSet(6),
    ...op.br(0),
    ...op.end(),
    ...op.end(),
    // out[outOffset + row*elemBytes] = acc_s
    ...op.localGet(4),
    ...op.localGet(5),
    ...op.i32Const(cfg.shift),
    ...op.i32Shl(),
    ...op.i32Add(),
    ...op.localGet(13),
    ...cfg.scalarStore,
    // row += 1
    ...op.localGet(5),
    ...op.i32Const(1),
    ...op.i32Add(),
    ...op.localSet(5),
    ...op.br(0),
    ...op.end(),
    ...op.end(),
    ...op.end(),
  ];
}

function buildModule(): Uint8Array {
  // Type 0: (i32, f32) -> ()   — mulScalar, addScalar (F32)
  // Type 1: (i32)      -> ()   — add, mul (F32 and F64)
  // Type 2: (i32)      -> f32  — sum, dot (F32)
  // Type 3: (i32, f64) -> ()   — mulScalar, addScalar (F64)
  // Type 4: (i32)      -> f64  — sum, dot (F64)
  // Type 5: (i32, i32, i32, i32, i32) -> ()  — matVec (F32 and F64)
  const typeSection = section(1, [
    ...uleb(6),
    0x60,
    ...vec([I32, F32]),
    ...vec([]),
    0x60,
    ...vec([I32]),
    ...vec([]),
    0x60,
    ...vec([I32]),
    ...vec([F32]),
    0x60,
    ...vec([I32, F64]),
    ...vec([]),
    0x60,
    ...vec([I32]),
    ...vec([F64]),
    0x60,
    ...vec([I32, I32, I32, I32, I32]),
    ...vec([]),
  ]);

  // Function types, in this order:
  //  0: mulScalar   (t0)    6:  mulScalarF64 (t3)
  //  1: addScalar   (t0)    7:  addScalarF64 (t3)
  //  2: add         (t1)    8:  addF64       (t1)
  //  3: mul         (t1)    9:  mulF64       (t1)
  //  4: sum         (t2)   10:  sumF64       (t4)
  //  5: dot         (t2)   11:  dotF64       (t4)
  // 12: matVec      (t5)   13:  matVecF64    (t5)
  const funcTypes = [0, 0, 1, 1, 2, 2, 3, 3, 1, 1, 4, 4, 5, 5];
  const funcSection = section(3, [...uleb(funcTypes.length), ...funcTypes.flatMap(t => uleb(t))]);

  // Memory: 1 page initial (64 KiB), grows in JS as needed.
  const memSection = section(5, [...uleb(1), 0x00, ...uleb(1)]);

  const exports: Array<[string, number]> = [
    ["mulScalar", 0],
    ["addScalar", 1],
    ["add", 2],
    ["mul", 3],
    ["sum", 4],
    ["dot", 5],
    ["mulScalarF64", 6],
    ["addScalarF64", 7],
    ["addF64", 8],
    ["mulF64", 9],
    ["sumF64", 10],
    ["dotF64", 11],
    ["matVec", 12],
    ["matVecF64", 13],
  ];
  const exportPayload: number[] = [...uleb(exports.length + 1), ...str("mem"), 0x02, ...uleb(0)];
  for (const [name, idx] of exports) {
    exportPayload.push(...str(name), 0x00, ...uleb(idx));
  }
  const exportSection = section(7, exportPayload);

  // Locals declarations: (groupCount, count, type)*.
  const scalarOpLocals = [0x02, ...uleb(2), I32, ...uleb(1), V128]; // i, addr, k
  const binaryVecLocals = [0x01, ...uleb(4), I32]; // i, addr_a, addr_b, len_bytes
  const sumLocalsF32 = [0x03, ...uleb(2), I32, ...uleb(1), V128, ...uleb(1), F32];
  const sumLocalsF64 = [0x03, ...uleb(2), I32, ...uleb(1), V128, ...uleb(1), F64];
  const dotLocalsF32 = [0x03, ...uleb(4), I32, ...uleb(1), V128, ...uleb(1), F32];
  const dotLocalsF64 = [0x03, ...uleb(4), I32, ...uleb(1), V128, ...uleb(1), F64];
  // matVec locals: 7 i32 (row, j, jBytes, aAddr, bAddr, rowByteStart, nColBytes),
  // 1 v128 (acc_v), 1 scalar (acc_s). Params 0..4 are (nRows, nCols, matOffset,
  // vecOffset, outOffset), so declared locals start at index 5.
  const matVecLocalsF32 = [0x03, ...uleb(7), I32, ...uleb(1), V128, ...uleb(1), F32];
  const matVecLocalsF64 = [0x03, ...uleb(7), I32, ...uleb(1), V128, ...uleb(1), F64];

  const bodies: number[][] = [
    [...scalarOpLocals, ...scalarOpBody(F32Cfg, op.f32x4Mul(), op.f32Mul())],
    [...scalarOpLocals, ...scalarOpBody(F32Cfg, op.f32x4Add(), op.f32Add())],
    [...binaryVecLocals, ...binaryVecBody(F32Cfg, op.f32x4Add(), op.f32Add())],
    [...binaryVecLocals, ...binaryVecBody(F32Cfg, op.f32x4Mul(), op.f32Mul())],
    [...sumLocalsF32, ...sumBody(F32Cfg)],
    [...dotLocalsF32, ...dotBody(F32Cfg)],
    [...scalarOpLocals, ...scalarOpBody(F64Cfg, op.f64x2Mul(), op.f64Mul())],
    [...scalarOpLocals, ...scalarOpBody(F64Cfg, op.f64x2Add(), op.f64Add())],
    [...binaryVecLocals, ...binaryVecBody(F64Cfg, op.f64x2Add(), op.f64Add())],
    [...binaryVecLocals, ...binaryVecBody(F64Cfg, op.f64x2Mul(), op.f64Mul())],
    [...sumLocalsF64, ...sumBody(F64Cfg)],
    [...dotLocalsF64, ...dotBody(F64Cfg)],
    [...matVecLocalsF32, ...matVecBody(F32Cfg)],
    [...matVecLocalsF64, ...matVecBody(F64Cfg)],
  ];

  const codePayload: number[] = [...uleb(bodies.length)];
  for (const body of bodies) {
    codePayload.push(...uleb(body.length), ...body);
  }
  const codeSection = section(10, codePayload);

  return new Uint8Array([
    0x00,
    0x61,
    0x73,
    0x6d,
    0x01,
    0x00,
    0x00,
    0x00,
    ...typeSection,
    ...funcSection,
    ...memSection,
    ...exportSection,
    ...codeSection,
  ]);
}

// --- Instantiate ---

type WasmExports = {
  mem: WebAssembly.Memory;
  mulScalar: (len: number, c: number) => void;
  addScalar: (len: number, c: number) => void;
  add: (len: number) => void;
  mul: (len: number) => void;
  sum: (len: number) => number;
  dot: (len: number) => number;
  mulScalarF64: (len: number, c: number) => void;
  addScalarF64: (len: number, c: number) => void;
  addF64: (len: number) => void;
  mulF64: (len: number) => void;
  sumF64: (len: number) => number;
  dotF64: (len: number) => number;
  matVec: (nRows: number, nCols: number, matOffset: number, vecOffset: number, outOffset: number) => void;
  matVecF64: (nRows: number, nCols: number, matOffset: number, vecOffset: number, outOffset: number) => void;
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

function ensureCapacity(bytesNeeded: number): void {
  const mem = wasm!.mem;
  if (mem.buffer.byteLength < bytesNeeded) {
    const need = Math.ceil((bytesNeeded - mem.buffer.byteLength) / 65536);
    mem.grow(need);
  }
}

function f32View(): Float32Array {
  return new Float32Array(wasm!.mem.buffer);
}

function f64View(): Float64Array {
  return new Float64Array(wasm!.mem.buffer);
}

// --- Validators ---

function requireFArray(a: unknown, argName: string): FArray {
  if (a instanceof Float32Array || a instanceof Float64Array) return a;
  throw new TypeError(`${argName} must be a Float32Array or Float64Array`);
}

function requireSameTypeAndLen(a: FArray, b: FArray): void {
  if (a.constructor !== b.constructor) {
    throw new TypeError(
      `operands must both be Float32Array or both be Float64Array; got ${a.constructor.name} and ${b.constructor.name}`,
    );
  }
  if (a.length !== b.length) {
    throw new RangeError(`array lengths differ: ${a.length} vs ${b.length}`);
  }
}

function emptyLike(a: FArray): FArray {
  return a instanceof Float32Array ? new Float32Array(0) : new Float64Array(0);
}

function outLike(a: FArray, n: number): FArray {
  return a instanceof Float32Array ? new Float32Array(n) : new Float64Array(n);
}

// --- Primitives ---

function mulScalar(a: Float32Array, c: number): Float32Array;
function mulScalar(a: Float64Array, c: number): Float64Array;
function mulScalar(a: FArray, c: number): FArray {
  const arr = requireFArray(a, "a");
  const n = arr.length;
  if (n === 0) return emptyLike(arr);
  if (wasm !== null) {
    if (arr instanceof Float32Array) {
      ensureCapacity(n * 4);
      const view = f32View();
      view.set(arr, 0);
      wasm.mulScalar(n, c);
      return view.slice(0, n);
    }
    ensureCapacity(n * 8);
    const view = f64View();
    view.set(arr, 0);
    wasm.mulScalarF64(n, c);
    return view.slice(0, n);
  }
  const out = outLike(arr, n);
  for (let i = 0; i < n; i++) out[i] = arr[i] * c;
  return out;
}

function addScalar(a: Float32Array, c: number): Float32Array;
function addScalar(a: Float64Array, c: number): Float64Array;
function addScalar(a: FArray, c: number): FArray {
  const arr = requireFArray(a, "a");
  const n = arr.length;
  if (n === 0) return emptyLike(arr);
  if (wasm !== null) {
    if (arr instanceof Float32Array) {
      ensureCapacity(n * 4);
      const view = f32View();
      view.set(arr, 0);
      wasm.addScalar(n, c);
      return view.slice(0, n);
    }
    ensureCapacity(n * 8);
    const view = f64View();
    view.set(arr, 0);
    wasm.addScalarF64(n, c);
    return view.slice(0, n);
  }
  const out = outLike(arr, n);
  for (let i = 0; i < n; i++) out[i] = arr[i] + c;
  return out;
}

function add(a: Float32Array, b: Float32Array): Float32Array;
function add(a: Float64Array, b: Float64Array): Float64Array;
function add(a: FArray, b: FArray): FArray {
  const ax = requireFArray(a, "a");
  const bx = requireFArray(b, "b");
  requireSameTypeAndLen(ax, bx);
  const n = ax.length;
  if (n === 0) return emptyLike(ax);
  if (wasm !== null) {
    if (ax instanceof Float32Array) {
      ensureCapacity(n * 8);
      const view = f32View();
      view.set(ax, 0);
      view.set(bx as Float32Array, n);
      wasm.add(n);
      return view.slice(0, n);
    }
    ensureCapacity(n * 16);
    const view = f64View();
    view.set(ax, 0);
    view.set(bx as Float64Array, n);
    wasm.addF64(n);
    return view.slice(0, n);
  }
  const out = outLike(ax, n);
  for (let i = 0; i < n; i++) out[i] = ax[i] + bx[i];
  return out;
}

function mul(a: Float32Array, b: Float32Array): Float32Array;
function mul(a: Float64Array, b: Float64Array): Float64Array;
function mul(a: FArray, b: FArray): FArray {
  const ax = requireFArray(a, "a");
  const bx = requireFArray(b, "b");
  requireSameTypeAndLen(ax, bx);
  const n = ax.length;
  if (n === 0) return emptyLike(ax);
  if (wasm !== null) {
    if (ax instanceof Float32Array) {
      ensureCapacity(n * 8);
      const view = f32View();
      view.set(ax, 0);
      view.set(bx as Float32Array, n);
      wasm.mul(n);
      return view.slice(0, n);
    }
    ensureCapacity(n * 16);
    const view = f64View();
    view.set(ax, 0);
    view.set(bx as Float64Array, n);
    wasm.mulF64(n);
    return view.slice(0, n);
  }
  const out = outLike(ax, n);
  for (let i = 0; i < n; i++) out[i] = ax[i] * bx[i];
  return out;
}

// Reduce ops (sum, dot) copy the entire input into WASM memory and return a
// single scalar. At large sizes that copy-in cost dominates, and a JS tight
// loop — which reads the user's buffer directly — becomes faster than any
// SIMD win. The threshold below is total bytes-to-copy; anything above it
// takes the JS fallback. Tuned from `bench/simd.pjs`:
//   - F32 sum crosses around N ≈ 2 M (8 MB)
//   - F32 dot / F64 sum cross around N ≈ 512 K (4–8 MB)
//   - F64 dot crosses around N ≈ 256 K (4 MB)
// 4 MiB stays on the WASM side below each crossover and flips to JS above.
const REDUCE_WASM_MAX_BYTES = 4 * 1024 * 1024;

// Monomorphic tight-loop helpers for the reduce fallback. Each helper only
// ever sees one typed-array shape, so JSC's FTL tier can specialize +
// vectorize the body without a polymorphic-site bailout.
function sumTightF32(a: Float32Array): number {
  const n = a.length;
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i];
  return s;
}
function sumTightF64(a: Float64Array): number {
  const n = a.length;
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i];
  return s;
}
function dotTightF32(a: Float32Array, b: Float32Array): number {
  const n = a.length;
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}
function dotTightF64(a: Float64Array, b: Float64Array): number {
  const n = a.length;
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

function sum(a: FArray): number {
  const arr = requireFArray(a, "a");
  const n = arr.length;
  if (n === 0) return 0;
  const elemBytes = arr.BYTES_PER_ELEMENT;
  if (wasm !== null && n * elemBytes <= REDUCE_WASM_MAX_BYTES) {
    if (arr instanceof Float32Array) {
      ensureCapacity(n * 4);
      f32View().set(arr, 0);
      return wasm.sum(n);
    }
    ensureCapacity(n * 8);
    f64View().set(arr, 0);
    return wasm.sumF64(n);
  }
  return arr instanceof Float32Array ? sumTightF32(arr) : sumTightF64(arr);
}

function dot(a: FArray, b: FArray): number {
  const ax = requireFArray(a, "a");
  const bx = requireFArray(b, "b");
  requireSameTypeAndLen(ax, bx);
  const n = ax.length;
  if (n === 0) return 0;
  const elemBytes = ax.BYTES_PER_ELEMENT;
  if (wasm !== null && n * elemBytes * 2 <= REDUCE_WASM_MAX_BYTES) {
    if (ax instanceof Float32Array) {
      ensureCapacity(n * 8);
      const view = f32View();
      view.set(ax, 0);
      view.set(bx as Float32Array, n);
      return wasm.dot(n);
    }
    ensureCapacity(n * 16);
    const view = f64View();
    view.set(ax, 0);
    view.set(bx as Float64Array, n);
    return wasm.dotF64(n);
  }
  return ax instanceof Float32Array
    ? dotTightF32(ax, bx as Float32Array)
    : dotTightF64(ax as Float64Array, bx as Float64Array);
}

// --- matVec ---
//
// Single-call matrix-vector product: out[i] = dot(matrix[i], vector).
// Dispatches to one WASM kernel invocation for the entire matrix, amortizing
// boundary-crossing overhead that makes per-row `dot()` calls lose to a plain
// JSC FTL-vectorized scalar loop at small column counts (D ≲ 1024).

function matVecTightF32(m: Float32Array, v: Float32Array, nRows: number, nCols: number, out: Float32Array): void {
  for (let i = 0; i < nRows; i++) {
    const off = i * nCols;
    let s = 0;
    for (let j = 0; j < nCols; j++) s += m[off + j] * v[j];
    out[i] = s;
  }
}
function matVecTightF64(m: Float64Array, v: Float64Array, nRows: number, nCols: number, out: Float64Array): void {
  for (let i = 0; i < nRows; i++) {
    const off = i * nCols;
    let s = 0;
    for (let j = 0; j < nCols; j++) s += m[off + j] * v[j];
    out[i] = s;
  }
}

function matVec(matrix: Float32Array, vector: Float32Array, nRows: number, nCols: number): Float32Array;
function matVec(matrix: Float64Array, vector: Float64Array, nRows: number, nCols: number): Float64Array;
function matVec(matrix: FArray, vector: FArray, nRows: number, nCols: number): FArray {
  const mx = requireFArray(matrix, "matrix");
  const vx = requireFArray(vector, "vector");
  if (mx.constructor !== vx.constructor) {
    throw new TypeError(
      `matrix and vector must both be Float32Array or both be Float64Array; got ${mx.constructor.name} and ${vx.constructor.name}`,
    );
  }
  if (!Number.isInteger(nRows) || nRows < 0) throw new RangeError("nRows must be a non-negative integer");
  if (!Number.isInteger(nCols) || nCols < 0) throw new RangeError("nCols must be a non-negative integer");
  if (mx.length !== nRows * nCols) {
    throw new RangeError(`matrix length ${mx.length} != nRows * nCols (${nRows} * ${nCols} = ${nRows * nCols})`);
  }
  if (vx.length !== nCols) {
    throw new RangeError(`vector length ${vx.length} != nCols ${nCols}`);
  }
  if (nRows === 0) return emptyLike(mx);
  if (nCols === 0) return outLike(mx, nRows);

  if (wasm !== null) {
    if (mx instanceof Float32Array) {
      const totalBytes = (nRows * nCols + nCols + nRows) * 4;
      ensureCapacity(totalBytes);
      const view = f32View();
      const matOffset = 0;
      const vecOffsetEl = nRows * nCols;
      const outOffsetEl = vecOffsetEl + nCols;
      view.set(mx, matOffset);
      view.set(vx as Float32Array, vecOffsetEl);
      wasm.matVec(nRows, nCols, matOffset * 4, vecOffsetEl * 4, outOffsetEl * 4);
      return view.slice(outOffsetEl, outOffsetEl + nRows);
    }
    const totalBytes = (nRows * nCols + nCols + nRows) * 8;
    ensureCapacity(totalBytes);
    const view = f64View();
    const matOffset = 0;
    const vecOffsetEl = nRows * nCols;
    const outOffsetEl = vecOffsetEl + nCols;
    view.set(mx, matOffset);
    view.set(vx as Float64Array, vecOffsetEl);
    wasm.matVecF64(nRows, nCols, matOffset * 8, vecOffsetEl * 8, outOffsetEl * 8);
    return view.slice(outOffsetEl, outOffsetEl + nRows);
  }

  const out = outLike(mx, nRows);
  if (mx instanceof Float32Array) {
    matVecTightF32(mx, vx as Float32Array, nRows, nCols, out as Float32Array);
  } else {
    matVecTightF64(mx as Float64Array, vx as Float64Array, nRows, nCols, out as Float64Array);
  }
  return out;
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

function simdMap(fn: (x: number, i: number) => number, a: Float32Array): Float32Array;
function simdMap(fn: (x: number, i: number) => number, a: Float64Array): Float64Array;
function simdMap(fn: (x: number, i: number) => number, a: FArray): FArray {
  const arr = requireFArray(a, "a");
  if (typeof fn !== "function") throw new TypeError("fn must be a function");
  const n = arr.length;
  const out = outLike(arr, n);

  if (fn.length <= 1) {
    const aff = tryAffineKernel(fn as (x: number) => number);
    if (aff) {
      const { k1, k0 } = aff;
      if (k0 === 0) {
        return arr instanceof Float32Array
          ? (mulScalar(arr, k1) as Float32Array)
          : (mulScalar(arr as Float64Array, k1) as Float64Array);
      }
      for (let i = 0; i < n; i++) out[i] = arr[i] * k1 + k0;
      return out;
    }
  }

  for (let i = 0; i < n; i++) out[i] = fn(arr[i], i);
  return out;
}

// --- Auto-accel dispatch (Tier 1) ---
//
// Other bun: modules (notably bun:pipeline) need to know whether dispatching
// to our WASM kernels will pay off at a given size. `wasmWinsForSize` is the
// centralized query; it encapsulates:
//   - WASM availability (module compiled successfully at boot)
//   - Reduce-op copy-in threshold (the REDUCE_WASM_MAX_BYTES cutoff)
//   - A minimum element count below which the WASM call overhead (~µs)
//     dominates any parallelism win.
// Future GPU backends (Metal/MPS on unified-memory hardware; WebGPU
// otherwise) will plug in here. `hasUnifiedMemoryGPU` and `hasDiscreteGPU`
// are stubs that return false today; when Tier 3/4 land they'll gate
// backend selection without changing the query surface.

const MIN_WASM_ELEMENTS = 64;

type SimdOpKind = "map" | "scalar" | "binary" | "reduce";

function wasmWinsForSize(op: SimdOpKind, n: number, elemBytes: number): boolean {
  if (wasm === null) return false;
  if (n < MIN_WASM_ELEMENTS) return false;
  if (op === "reduce") {
    if (n * elemBytes > REDUCE_WASM_MAX_BYTES) return false;
  } else if (op === "binary") {
    // Binary ops copy both operands in; same byte budget as reduce applies,
    // but output ops still win above the threshold because they return an
    // array (not a scalar) so copy-out is part of the work regardless.
    // Leaving this permissive — measured in bench/simd.pjs.
  }
  return true;
}

function hasUnifiedMemoryGPU(): boolean {
  return false;
}

function hasDiscreteGPU(): boolean {
  return false;
}

export default {
  mulScalar,
  addScalar,
  add,
  mul,
  sum,
  dot,
  matVec,
  simdMap,
  isWasmAvailable,
  wasmWinsForSize,
  hasUnifiedMemoryGPU,
  hasDiscreteGPU,
};
