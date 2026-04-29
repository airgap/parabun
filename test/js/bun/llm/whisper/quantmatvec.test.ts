import { describe, expect, test } from "bun:test";
import llm from "bun:llm";

// Correctness tests for `llm.quantMatVec` (LYK-755). Each test constructs
// a synthetic GGML block matching the on-disk format, computes matVec
// via the quant path, and compares against an explicit dequantize +
// naive matVec reference. Numerical tolerance accounts for fp16 scale
// rounding only — the inner dot product should match exactly.

const QK = 32;

function f32ToF16Bits(f: number): number {
  const buf = new ArrayBuffer(4);
  new Float32Array(buf)[0] = f;
  const u = new Uint32Array(buf)[0];
  // Standard IEEE 754 fp32 → fp16 via bit twiddle. Subnormals + edge
  // cases not exercised by these tests; use the simple round-to-nearest
  // path consistent with how whisper.cpp writes block scales.
  const sign = (u >>> 31) & 0x1;
  const exp = (u >>> 23) & 0xff;
  const mant = u & 0x7fffff;
  if (exp === 0xff) return (sign << 15) | 0x7c00 | (mant >> 13);
  if (exp === 0) return sign << 15;
  const newExp = exp - 127 + 15;
  if (newExp <= 0) return sign << 15;
  if (newExp >= 31) return (sign << 15) | 0x7c00;
  return (sign << 15) | (newExp << 10) | (mant >> 13);
}

function writeF16(buf: Uint8Array, off: number, f: number): void {
  const bits = f32ToF16Bits(f);
  buf[off] = bits & 0xff;
  buf[off + 1] = (bits >>> 8) & 0xff;
}

// f16-roundtrip a value the same way the on-disk scale was rounded.
function f16Round(f: number): number {
  const buf = new ArrayBuffer(4);
  const view = new Uint32Array(buf);
  const bits = f32ToF16Bits(f);
  // Inverse of f32ToF16Bits — produce the f32 the matVec sees on read.
  const sign = (bits >>> 15) & 0x1;
  const exp = (bits >>> 10) & 0x1f;
  const mant = bits & 0x3ff;
  if (exp === 0) {
    if (mant === 0) return sign ? -0 : 0;
    return (sign ? -1 : 1) * Math.pow(2, -14) * (mant / 1024);
  }
  if (exp === 31) return mant === 0 ? (sign ? -Infinity : Infinity) : NaN;
  return (sign ? -1 : 1) * Math.pow(2, exp - 15) * (1 + mant / 1024);
}

function naiveMatVec(W: Float32Array, vec: Float32Array, rows: number, cols: number): Float32Array {
  const out = new Float32Array(rows);
  for (let r = 0; r < rows; r++) {
    let s = 0;
    for (let c = 0; c < cols; c++) s += W[r * cols + c] * vec[c];
    out[r] = s;
  }
  return out;
}

function makeVec(cols: number, seed: number): Float32Array {
  const v = new Float32Array(cols);
  for (let i = 0; i < cols; i++) v[i] = Math.sin(seed + i * 0.317) * 0.5;
  return v;
}

describe("bun:llm quantMatVec — Q8_0", () => {
  test("matches dequant + naive matVec exactly", () => {
    const rows = 5;
    const cols = 64; // 2 blocks per row
    const blocksPerRow = cols / QK;
    const blockBytes = 34;
    const data = new Uint8Array(rows * blocksPerRow * blockBytes);
    const ref = new Float32Array(rows * cols);

    // Build Q8_0 blocks with deterministic int8 + fp16 scales.
    let off = 0;
    for (let r = 0; r < rows; r++) {
      for (let b = 0; b < blocksPerRow; b++) {
        const scale = 0.01 * (1 + r + b);
        writeF16(data, off, scale);
        const dScaled = f16Round(scale);
        for (let j = 0; j < QK; j++) {
          const q = ((r * 13 + b * 7 + j * 3) % 251) - 128; // i8
          data[off + 2 + j] = q & 0xff;
          ref[r * cols + b * QK + j] = dScaled * q;
        }
        off += blockBytes;
      }
    }
    const w = { ftype: 8, data, blocksPerRow, cols, rows };
    const vec = makeVec(cols, 1);
    const got = llm.quantMatVec(w, vec);
    const want = naiveMatVec(ref, vec, rows, cols);
    expect(got.length).toBe(rows);
    for (let r = 0; r < rows; r++) {
      expect(got[r]).toBeCloseTo(want[r], 4);
    }
  });
});

describe("bun:llm quantMatVec — Q4_0", () => {
  test("matches dequant + naive matVec", () => {
    const rows = 4;
    const cols = 64;
    const blocksPerRow = cols / QK;
    const blockBytes = 18;
    const data = new Uint8Array(rows * blocksPerRow * blockBytes);
    const ref = new Float32Array(rows * cols);

    let off = 0;
    for (let r = 0; r < rows; r++) {
      for (let b = 0; b < blocksPerRow; b++) {
        const scale = 0.05 * (1 + r);
        writeF16(data, off, scale);
        const dScaled = f16Round(scale);
        for (let j = 0; j < 16; j++) {
          // Pack two 4-bit values per byte. Element j in low nibble, j+16 in high.
          const lo = (r + j) & 0x0f;
          const hi = (r + j + 5) & 0x0f;
          data[off + 2 + j] = lo | (hi << 4);
          ref[r * cols + b * QK + j] = dScaled * (lo - 8);
          ref[r * cols + b * QK + 16 + j] = dScaled * (hi - 8);
        }
        off += blockBytes;
      }
    }
    const w = { ftype: 2, data, blocksPerRow, cols, rows };
    const vec = makeVec(cols, 2);
    const got = llm.quantMatVec(w, vec);
    const want = naiveMatVec(ref, vec, rows, cols);
    for (let r = 0; r < rows; r++) {
      expect(got[r]).toBeCloseTo(want[r], 4);
    }
  });
});

describe("bun:llm quantMatVec — Q5_0", () => {
  test("matches dequant + naive matVec", () => {
    const rows = 3;
    const cols = 32;
    const blocksPerRow = 1;
    const blockBytes = 22;
    const data = new Uint8Array(rows * blockBytes);
    const ref = new Float32Array(rows * cols);

    let off = 0;
    for (let r = 0; r < rows; r++) {
      const scale = 0.03 * (1 + r);
      writeF16(data, off, scale);
      const dScaled = f16Round(scale);
      let qh = 0;
      for (let j = 0; j < 32; j++) {
        if ((r * 5 + j) & 1) qh |= 1 << j;
      }
      data[off + 2] = qh & 0xff;
      data[off + 3] = (qh >>> 8) & 0xff;
      data[off + 4] = (qh >>> 16) & 0xff;
      data[off + 5] = (qh >>> 24) & 0xff;
      for (let j = 0; j < 16; j++) {
        const lo = (r + j) & 0x0f;
        const hi = (r + j + 9) & 0x0f;
        data[off + 6 + j] = lo | (hi << 4);
        const xh0 = ((qh >>> j) & 1) << 4;
        const xh1 = ((qh >>> (j + 16)) & 1) << 4;
        const x0 = (lo | xh0) - 16;
        const x1 = (hi | xh1) - 16;
        ref[r * cols + j] = dScaled * x0;
        ref[r * cols + 16 + j] = dScaled * x1;
      }
      off += blockBytes;
    }
    const w = { ftype: 6, data, blocksPerRow, cols, rows };
    const vec = makeVec(cols, 4);
    const got = llm.quantMatVec(w, vec);
    const want = naiveMatVec(ref, vec, rows, cols);
    for (let r = 0; r < rows; r++) {
      expect(got[r]).toBeCloseTo(want[r], 4);
    }
  });
});

describe("bun:llm quantMatVec — Q5_1", () => {
  test("matches dequant + naive matVec", () => {
    const rows = 3;
    const cols = 32;
    const blocksPerRow = 1;
    const blockBytes = 24;
    const data = new Uint8Array(rows * blockBytes);
    const ref = new Float32Array(rows * cols);

    let off = 0;
    for (let r = 0; r < rows; r++) {
      const scale = 0.02 * (1 + r);
      const minVal = -0.1 * r;
      writeF16(data, off, scale);
      writeF16(data, off + 2, minVal);
      const dScaled = f16Round(scale);
      const mScaled = f16Round(minVal);
      // Compose a 32-bit hi-bits mask.
      let qh = 0;
      for (let j = 0; j < 32; j++) {
        if ((r + j) & 1) qh |= 1 << j;
      }
      data[off + 4] = qh & 0xff;
      data[off + 5] = (qh >>> 8) & 0xff;
      data[off + 6] = (qh >>> 16) & 0xff;
      data[off + 7] = (qh >>> 24) & 0xff;
      // Pack low nibbles.
      for (let j = 0; j < 16; j++) {
        const lo = (r * 3 + j) & 0x0f;
        const hi = (r * 5 + j + 7) & 0x0f;
        data[off + 8 + j] = lo | (hi << 4);
        const xh0 = ((qh >>> j) & 1) << 4;
        const xh1 = ((qh >>> (j + 16)) & 1) << 4;
        const x0 = lo | xh0;
        const x1 = hi | xh1;
        ref[r * cols + j] = dScaled * x0 + mScaled;
        ref[r * cols + 16 + j] = dScaled * x1 + mScaled;
      }
      off += blockBytes;
    }
    const w = { ftype: 7, data, blocksPerRow, cols, rows };
    const vec = makeVec(cols, 3);
    const got = llm.quantMatVec(w, vec);
    const want = naiveMatVec(ref, vec, rows, cols);
    for (let r = 0; r < rows; r++) {
      expect(got[r]).toBeCloseTo(want[r], 4);
    }
  });
});

describe("bun:llm quantMatVec — error paths", () => {
  test("dim mismatch throws", () => {
    const w = { ftype: 8, data: new Uint8Array(34), blocksPerRow: 1, cols: 32, rows: 1 };
    expect(() => llm.quantMatVec(w, new Float32Array(31))).toThrow(/dim mismatch/);
  });

  test("unknown ftype throws", () => {
    const w = { ftype: 99, data: new Uint8Array(0), blocksPerRow: 0, cols: 0, rows: 0 };
    expect(() => llm.quantMatVec(w, new Float32Array(0))).toThrow(/ftype/);
  });
});
