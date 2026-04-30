// GGUF v3 loader for Parabun's para:llm module.
//
// Parses: magic + version, metadata KV table, tensor-info table; then exposes
// named tensors as Float32Array views. Q8_0 dequant is done lazily on first
// tensor access and cached.
//
// Spec reference: https://github.com/ggml-org/ggml/blob/master/docs/gguf.md
// Only implements GGUF v3 (the one llama.cpp writes today). v2 differs in
// tensor-info dims width (u32 instead of u64) — not supported here.

// GGUF value types (gguf_metadata_value_type)
const GGUF_TYPE_UINT8 = 0;
const GGUF_TYPE_INT8 = 1;
const GGUF_TYPE_UINT16 = 2;
const GGUF_TYPE_INT16 = 3;
const GGUF_TYPE_UINT32 = 4;
const GGUF_TYPE_INT32 = 5;
const GGUF_TYPE_FLOAT32 = 6;
const GGUF_TYPE_BOOL = 7;
const GGUF_TYPE_STRING = 8;
const GGUF_TYPE_ARRAY = 9;
const GGUF_TYPE_UINT64 = 10;
const GGUF_TYPE_INT64 = 11;
const GGUF_TYPE_FLOAT64 = 12;

// GGML tensor types (ggml_type). Only the ones we actually load appear here;
// the rest throw on first sight so silent-wrong data never reaches the model.
const GGML_TYPE_F32 = 0;
const GGML_TYPE_F16 = 1;
const GGML_TYPE_Q8_0 = 8;
const GGML_TYPE_Q2_K = 10;
const GGML_TYPE_Q3_K = 11;
const GGML_TYPE_Q4_K = 12;
const GGML_TYPE_Q5_K = 13;
const GGML_TYPE_Q6_K = 14;

// Q8_0 block layout: fp16 scale + 32 int8 quants = 34 bytes per 32 elements.
const QK8_0 = 32;
const Q8_0_BLOCK_BYTES = 2 + QK8_0;

// Q4_K "super-block" layout (the K-quant family's workhorse):
//   fp16 d | fp16 dmin | 12B packed 6-bit scales & mins | 128B 4-bit quants
// = 144 bytes per 256 elements, split into 8 sub-blocks of 32 elements each.
// Each sub-block has its own 6-bit scale and 6-bit min; the super-block's
// d / dmin rescale them back to fp32. See ggml-common.h block_q4_K.
const QK_K = 256;
const Q4_K_SCALE_SIZE = 12;
const Q4_K_BLOCK_BYTES = 2 + 2 + Q4_K_SCALE_SIZE + QK_K / 2;

// Q2_K "super-block" layout — the smallest K-quant:
//   16B scales/mins (4-bit scale + 4-bit min) | 64B 2-bit quants | fp16 d | fp16 dmin
// = 84 bytes per 256 elements. Each 256-block splits into 16 sub-blocks of
// 16 elements; each sub-block has its own 4-bit scale and 4-bit min, with
// d/dmin rescaling back to fp32. Reconstruction is `y = d·sc·q − dmin·min`.
const Q2_K_BLOCK_BYTES = QK_K / 16 + QK_K / 4 + 2 + 2;

// Q3_K "super-block" layout:
//   32B hmask (high-bit mask) | 64B qs (low 2 bits) | 12B packed 6-bit scales | fp16 d
// = 110 bytes per 256 elements. Scales are bias-encoded (−32 offset), so the
// 6-bit unsigned value decodes to a signed int in −32..+31. Each of the 16
// sub-blocks reconstructs as `y = d·(sc−32)·(q_lo − (hmask_bit ? 0 : 4))`,
// where the high-bit mask flips a single hmask bit per (shift, chunk) pair.
const Q3_K_BLOCK_BYTES = QK_K / 8 + QK_K / 4 + 12 + 2;

// Q5_K "super-block" layout — identical framing to Q4_K but with an
// extra 32 bytes of `qh` carrying the 5th (high) bit of each quant:
//   fp16 d | fp16 dmin | 12B scales/mins | 32B qh | 128B qs
// = 176 bytes per 256 elements. Each qh byte contributes one high bit
// to 8 different elements — shared across sub-block pairs — so the
// mask shifts by 2 per pair (bit 0/1 for sub-blocks 0&1, 2/3 for 2&3,
// and so on). See ggml-quants.c dequantize_row_q5_K.
const Q5_K_BLOCK_BYTES = 2 + 2 + Q4_K_SCALE_SIZE + QK_K / 8 + QK_K / 2;

// Q6_K "super-block" layout (used for tensors Q4_K_M keeps at higher
// precision — usually token_embd and the last few ffn_down):
//   128B ql (low 4 bits) | 64B qh (high 2 bits) | 16B i8 scales | fp16 d
// = 210 bytes per 256 elements. Each 256-block is two 128-chunks, each
// chunk sharing 8 per-16-element scales, all rescaled by the block's d.
const Q6_K_BLOCK_BYTES = QK_K / 2 + QK_K / 4 + QK_K / 16 + 2;

type GGUFValue = number | bigint | boolean | string | GGUFValue[];

interface GGUFTensorInfo {
  name: string;
  dims: number[]; // row-major, outer-first (matches llama.cpp dump order)
  type: number; // GGML_TYPE_*
  offset: number; // from start of tensor_data region (post-alignment)
  byteLength: number;
}

class GGUFFile {
  readonly version: number;
  readonly alignment: number;
  readonly metadata: Map<string, GGUFValue>;
  readonly tensors: Map<string, GGUFTensorInfo>;

  // The mmap'd file as a single Uint8Array. We keep it alive for the lifetime
  // of the GGUFFile — slicing into it yields views that share the backing
  // buffer, so the whole file stays resident as long as any tensor view does.
  readonly #bytes: Uint8Array;
  readonly #view: DataView;
  readonly #tensorDataStart: number;

  // Memoized dequant cache: tensor name → Float32Array. Q8_0 dequant is ~1 GB
  // of writes for a 1B model — expensive to redo, cheap to hold.
  readonly #dequantCache: Map<string, Float32Array> = new Map();

  constructor(bytes: Uint8Array) {
    this.#bytes = bytes;
    this.#view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    const r = new Reader(this.#view, bytes);
    const magic = r.u32();
    if (magic !== 0x46554747) {
      throw new Error(`para:llm: not a GGUF file (magic ${magic.toString(16)}, expected 46554747)`);
    }
    this.version = r.u32();
    if (this.version !== 3) {
      throw new Error(`para:llm: unsupported GGUF version ${this.version} (only v3 is implemented)`);
    }

    const tensorCount = Number(r.u64());
    const kvCount = Number(r.u64());

    this.metadata = new Map();
    for (let i = 0; i < kvCount; i++) {
      const key = r.string();
      const value = r.typedValue();
      this.metadata.set(key, value);
    }

    // `general.alignment` controls the pad between the tensor_info table and
    // the tensor_data region. Default is 32 (the GGUF spec's default); newer
    // writers sometimes set 64 or 256. Always read it — the model we tested
    // against (Llama-3.2-1B unsloth Q8_0) writes 32.
    const alignRaw = this.metadata.get("general.alignment");
    this.alignment = typeof alignRaw === "number" ? alignRaw : typeof alignRaw === "bigint" ? Number(alignRaw) : 32;

    this.tensors = new Map();
    const infos: GGUFTensorInfo[] = [];
    for (let i = 0; i < tensorCount; i++) {
      const name = r.string();
      const nDims = r.u32();
      const dims: number[] = [];
      for (let d = 0; d < nDims; d++) dims.push(Number(r.u64()));
      const type = r.u32();
      const offset = Number(r.u64());
      const info: GGUFTensorInfo = {
        name,
        dims,
        type,
        offset,
        byteLength: tensorByteLength(type, dims),
      };
      infos.push(info);
      this.tensors.set(name, info);
    }

    // Pad to `alignment` to reach the tensor_data region.
    const pos = r.pos;
    const pad = (this.alignment - (pos % this.alignment)) % this.alignment;
    this.#tensorDataStart = pos + pad;
  }

  // Dequantize a tensor to a fresh Float32Array, or return the cached copy.
  // For F32 tensors this is a view (no copy); for F16/Q8_0 it's a decoded
  // buffer. Callers must NOT mutate the returned array.
  tensorF32(name: string): Float32Array {
    const cached = this.#dequantCache.get(name);
    if (cached) return cached;

    const info = this.tensors.get(name);
    if (!info) throw new Error(`para:llm: GGUF tensor "${name}" not found`);

    const absOffset = this.#tensorDataStart + info.offset;
    const nElems = info.dims.reduce((a, b) => a * b, 1);

    let out: Float32Array;
    switch (info.type) {
      case GGML_TYPE_F32: {
        out = new Float32Array(this.#bytes.buffer, this.#bytes.byteOffset + absOffset, nElems);
        break;
      }
      case GGML_TYPE_F16: {
        const src = new Uint16Array(this.#bytes.buffer, this.#bytes.byteOffset + absOffset, nElems);
        out = new Float32Array(nElems);
        for (let i = 0; i < nElems; i++) out[i] = f16ToF32(src[i]);
        break;
      }
      case GGML_TYPE_Q8_0: {
        if (nElems % QK8_0 !== 0) {
          throw new Error(`para:llm: Q8_0 tensor "${name}" element count ${nElems} not a multiple of ${QK8_0}`);
        }
        const nBlocks = nElems / QK8_0;
        out = new Float32Array(nElems);
        // Block: [u16 scale_f16][i8 q0..q31] — stride 34 bytes.
        const base = this.#bytes.byteOffset + absOffset;
        for (let b = 0; b < nBlocks; b++) {
          const blockAt = base + b * Q8_0_BLOCK_BYTES;
          const scale = f16ToF32(this.#view.getUint16(blockAt, true));
          const qBase = blockAt + 2;
          const outBase = b * QK8_0;
          // Read quants as int8 one at a time. A DataView per-byte loop is
          // fine here — this runs once per model load, not on a hot path.
          // If we ever need faster, swap to a typed Int8Array view + scalar
          // mul, or a para:simd kernel.
          for (let i = 0; i < QK8_0; i++) {
            out[outBase + i] = this.#view.getInt8(qBase + i) * scale;
          }
        }
        break;
      }
      case GGML_TYPE_Q2_K: {
        if (nElems % QK_K !== 0) {
          throw new Error(`para:llm: Q2_K tensor "${name}" element count ${nElems} not a multiple of ${QK_K}`);
        }
        out = dequantQ2K(this.#bytes, this.#bytes.byteOffset + absOffset, nElems);
        break;
      }
      case GGML_TYPE_Q3_K: {
        if (nElems % QK_K !== 0) {
          throw new Error(`para:llm: Q3_K tensor "${name}" element count ${nElems} not a multiple of ${QK_K}`);
        }
        out = dequantQ3K(this.#bytes, this.#bytes.byteOffset + absOffset, nElems);
        break;
      }
      case GGML_TYPE_Q4_K: {
        if (nElems % QK_K !== 0) {
          throw new Error(`para:llm: Q4_K tensor "${name}" element count ${nElems} not a multiple of ${QK_K}`);
        }
        out = dequantQ4K(this.#bytes, this.#bytes.byteOffset + absOffset, nElems);
        break;
      }
      case GGML_TYPE_Q5_K: {
        if (nElems % QK_K !== 0) {
          throw new Error(`para:llm: Q5_K tensor "${name}" element count ${nElems} not a multiple of ${QK_K}`);
        }
        out = dequantQ5K(this.#bytes, this.#bytes.byteOffset + absOffset, nElems);
        break;
      }
      case GGML_TYPE_Q6_K: {
        if (nElems % QK_K !== 0) {
          throw new Error(`para:llm: Q6_K tensor "${name}" element count ${nElems} not a multiple of ${QK_K}`);
        }
        out = dequantQ6K(this.#bytes, this.#bytes.byteOffset + absOffset, nElems);
        break;
      }
      default:
        throw new Error(`para:llm: unsupported GGML type ${info.type} for tensor "${name}"`);
    }

    this.#dequantCache.set(name, out);
    return out;
  }

  // Raw byte view of a tensor's data region — no dequant. Used by para:llm's
  // GPU residency path for quantized tensors: we upload the raw blocks to the
  // device and dequantize on-chip per matVec step, skipping the ~1GB load-time
  // fp32 materialization. The returned Uint8Array is a view over the mmap'd
  // GGUF bytes (same lifetime as the file); do not mutate.
  tensorRaw(name: string): { type: number; bytes: Uint8Array; nElems: number; dims: number[] } {
    const info = this.tensors.get(name);
    if (!info) throw new Error(`para:llm: GGUF tensor "${name}" not found`);
    const absOffset = this.#tensorDataStart + info.offset;
    const nElems = info.dims.reduce((a, b) => a * b, 1);
    const bytes = new Uint8Array(this.#bytes.buffer, this.#bytes.byteOffset + absOffset, info.byteLength);
    return { type: info.type, bytes, nElems, dims: info.dims };
  }

  // Metadata convenience accessors: callers usually know the type they want.
  // These throw on missing keys so model-init bugs surface at load time, not
  // at forward-pass time when the stack trace is useless.
  string(key: string): string {
    const v = this.metadata.get(key);
    if (typeof v !== "string") {
      throw new Error(`para:llm: metadata "${key}" is ${typeof v}, want string`);
    }
    return v;
  }
  number(key: string): number {
    const v = this.metadata.get(key);
    if (typeof v === "number") return v;
    if (typeof v === "bigint") return Number(v);
    throw new Error(`para:llm: metadata "${key}" is ${typeof v}, want number`);
  }
  array(key: string): GGUFValue[] {
    const v = this.metadata.get(key);
    if (!Array.isArray(v)) {
      throw new Error(`para:llm: metadata "${key}" is ${typeof v}, want array`);
    }
    return v;
  }
}

// Reader — pull-style decoder over the GGUF bytes. Keeps a cursor.
class Reader {
  pos = 0;
  readonly #view: DataView;
  readonly #bytes: Uint8Array;
  readonly #decoder = new TextDecoder("utf-8", { fatal: false });

  constructor(view: DataView, bytes: Uint8Array) {
    this.#view = view;
    this.#bytes = bytes;
  }

  u8(): number {
    const v = this.#view.getUint8(this.pos);
    this.pos += 1;
    return v;
  }
  i8(): number {
    const v = this.#view.getInt8(this.pos);
    this.pos += 1;
    return v;
  }
  u16(): number {
    const v = this.#view.getUint16(this.pos, true);
    this.pos += 2;
    return v;
  }
  i16(): number {
    const v = this.#view.getInt16(this.pos, true);
    this.pos += 2;
    return v;
  }
  u32(): number {
    const v = this.#view.getUint32(this.pos, true);
    this.pos += 4;
    return v;
  }
  i32(): number {
    const v = this.#view.getInt32(this.pos, true);
    this.pos += 4;
    return v;
  }
  f32(): number {
    const v = this.#view.getFloat32(this.pos, true);
    this.pos += 4;
    return v;
  }
  f64(): number {
    const v = this.#view.getFloat64(this.pos, true);
    this.pos += 8;
    return v;
  }
  // GGUF v3 uses u64 lengths and counts. JS Number is safe for values < 2^53;
  // a 1T-parameter model would need > 2^53 bytes — not something we aim to
  // support, but we return bigint so callers can opt into the narrowing.
  u64(): bigint {
    const v = this.#view.getBigUint64(this.pos, true);
    this.pos += 8;
    return v;
  }
  i64(): bigint {
    const v = this.#view.getBigInt64(this.pos, true);
    this.pos += 8;
    return v;
  }

  // Length-prefixed UTF-8 string (u64 length).
  string(): string {
    const len = Number(this.u64());
    const slice = this.#bytes.subarray(this.pos, this.pos + len);
    this.pos += len;
    return this.#decoder.decode(slice);
  }

  // Typed value dispatch — reads a u32 tag then the payload.
  typedValue(): GGUFValue {
    const tag = this.u32();
    return this.#readValue(tag);
  }

  #readValue(tag: number): GGUFValue {
    switch (tag) {
      case GGUF_TYPE_UINT8:
        return this.u8();
      case GGUF_TYPE_INT8:
        return this.i8();
      case GGUF_TYPE_UINT16:
        return this.u16();
      case GGUF_TYPE_INT16:
        return this.i16();
      case GGUF_TYPE_UINT32:
        return this.u32();
      case GGUF_TYPE_INT32:
        return this.i32();
      case GGUF_TYPE_FLOAT32:
        return this.f32();
      case GGUF_TYPE_BOOL:
        return this.u8() !== 0;
      case GGUF_TYPE_STRING:
        return this.string();
      case GGUF_TYPE_UINT64: {
        const v = this.u64();
        // < 2^53 fits a JS number. Anything larger returns bigint.
        return v <= 0x1fffffffffffffn ? Number(v) : v;
      }
      case GGUF_TYPE_INT64: {
        const v = this.i64();
        return v >= -0x1fffffffffffffn && v <= 0x1fffffffffffffn ? Number(v) : v;
      }
      case GGUF_TYPE_FLOAT64:
        return this.f64();
      case GGUF_TYPE_ARRAY: {
        const elType = this.u32();
        const len = Number(this.u64());
        const arr: GGUFValue[] = new Array(len);
        for (let i = 0; i < len; i++) arr[i] = this.#readValue(elType);
        return arr;
      }
      default:
        throw new Error(`para:llm: unknown GGUF value tag ${tag} at byte ${this.pos - 4}`);
    }
  }
}

// Byte footprint of a tensor on disk (raw, before dequant).
function tensorByteLength(type: number, dims: number[]): number {
  const n = dims.reduce((a, b) => a * b, 1);
  switch (type) {
    case GGML_TYPE_F32:
      return n * 4;
    case GGML_TYPE_F16:
      return n * 2;
    case GGML_TYPE_Q8_0:
      // 34 bytes per 32 elements.
      return (n / QK8_0) * Q8_0_BLOCK_BYTES;
    case GGML_TYPE_Q2_K:
      // 84 bytes per 256 elements.
      return (n / QK_K) * Q2_K_BLOCK_BYTES;
    case GGML_TYPE_Q3_K:
      // 110 bytes per 256 elements.
      return (n / QK_K) * Q3_K_BLOCK_BYTES;
    case GGML_TYPE_Q4_K:
      // 144 bytes per 256 elements.
      return (n / QK_K) * Q4_K_BLOCK_BYTES;
    case GGML_TYPE_Q5_K:
      // 176 bytes per 256 elements.
      return (n / QK_K) * Q5_K_BLOCK_BYTES;
    case GGML_TYPE_Q6_K:
      // 210 bytes per 256 elements.
      return (n / QK_K) * Q6_K_BLOCK_BYTES;
    default:
      throw new Error(`para:llm: unsupported GGML type ${type} in tensor-info`);
  }
}

// Unpack the j-th (0..7) 6-bit scale and 6-bit min from Q4_K's 12-byte
// scales array. Matches ggml-quants.c's get_scale_min_k4 — the layout
// squeezes 8 × (6+6) = 96 bits into exactly 12 bytes by splitting each
// 6-bit value into a low-4 nibble stored in bytes 8..11 and a high-2 pair
// stored in the top 2 bits of bytes 0..7. Getting this wrong is silent —
// the model loads, it just produces garbage — so keep this in lockstep
// with the upstream formula.
function getQ4KScaleMin(j: number, s: Uint8Array, sBase: number): [number, number] {
  if (j < 4) {
    return [s[sBase + j] & 0x3f, s[sBase + j + 4] & 0x3f];
  }
  const d = (s[sBase + j + 4] & 0x0f) | ((s[sBase + j - 4] >> 6) << 4);
  const m = (s[sBase + j + 4] >> 4) | ((s[sBase + j] >> 6) << 4);
  return [d, m];
}

// Dequantize a Q4_K tensor to fp32. Layout per 256-element super-block:
//   fp16 d | fp16 dmin | 12B scales/mins | 128B 4-bit quants
// The 128 quant bytes cover all 256 elements as nibbles, grouped into
// 4 chunks of 32 bytes. Within each chunk: low nibbles → one 32-element
// sub-block, high nibbles → the next. Super-block d/dmin rescale the
// per-sub-block 6-bit scale/min back to fp32 before the
// y = scale * quant - min reconstruction.
// Dequantize a Q6_K tensor to fp32. Layout per 256-element super-block:
//   128B ql | 64B qh | 16B i8 scales | fp16 d
// Reconstruction: for each element, combine its low 4 bits from ql with
// high 2 bits from qh, subtract the 32-bias, then multiply by
// d * scales[is]. The 256 elements are laid out as two 128-chunks of
// four 32-element quarters each, and the scales are per-16-elements so
// each 128-chunk consumes 8 scales. Matches ggml-quants.c dequantize_row_q6_K.
function dequantQ6K(bytes: Uint8Array, absOffset: number, nElems: number): Float32Array {
  const out = new Float32Array(nElems);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const nBlocks = nElems / QK_K;
  for (let b = 0; b < nBlocks; b++) {
    const blockAt = absOffset + b * Q6_K_BLOCK_BYTES;
    const qlBase = blockAt;
    const qhBase = blockAt + QK_K / 2;
    const scBase = blockAt + QK_K / 2 + QK_K / 4;
    const d = f16ToF32(view.getUint16(scBase + QK_K / 16, true));
    let outPos = b * QK_K;
    // Two 128-chunks per 256-block.
    for (let n = 0; n < 2; n++) {
      const qlOff = qlBase + n * 64;
      const qhOff = qhBase + n * 32;
      const scOff = scBase + n * 8;
      for (let l = 0; l < 32; l++) {
        const is = l >> 4; // 0 for l<16, 1 for l>=16
        const qlA = view.getUint8(qlOff + l);
        const qlB = view.getUint8(qlOff + 32 + l);
        const qh = view.getUint8(qhOff + l);
        const q1 = ((qlA & 0x0f) | (((qh >> 0) & 3) << 4)) - 32;
        const q2 = ((qlB & 0x0f) | (((qh >> 2) & 3) << 4)) - 32;
        const q3 = ((qlA >> 4) | (((qh >> 4) & 3) << 4)) - 32;
        const q4 = ((qlB >> 4) | (((qh >> 6) & 3) << 4)) - 32;
        out[outPos + l] = d * view.getInt8(scOff + is + 0) * q1;
        out[outPos + 32 + l] = d * view.getInt8(scOff + is + 2) * q2;
        out[outPos + 64 + l] = d * view.getInt8(scOff + is + 4) * q3;
        out[outPos + 96 + l] = d * view.getInt8(scOff + is + 6) * q4;
      }
      outPos += 128;
    }
  }
  return out;
}

// Dequantize a Q5_K tensor to fp32. Per 256-element super-block:
//   fp16 d | fp16 dmin | 12B scales/mins | 32B qh | 128B qs
// Same sub-block framing as Q4_K: 8 sub-blocks of 32 elements, each with
// its own 6-bit scale and 6-bit min. The 5th bit of each 5-bit quant is
// packed into qh — one qh byte covers 8 elements (the l-th element of
// every sub-block pair), so the mask advances by 2 bits per pair.
function dequantQ5K(bytes: Uint8Array, absOffset: number, nElems: number): Float32Array {
  const out = new Float32Array(nElems);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const nBlocks = nElems / QK_K;
  for (let b = 0; b < nBlocks; b++) {
    const blockAt = absOffset + b * Q5_K_BLOCK_BYTES;
    const d = f16ToF32(view.getUint16(blockAt, true));
    const dmin = f16ToF32(view.getUint16(blockAt + 2, true));
    const sBase = blockAt - bytes.byteOffset + 4;
    const qhBase = blockAt + 4 + Q4_K_SCALE_SIZE;
    const qsBase = qhBase + QK_K / 8;
    let outBase = b * QK_K;
    let u1 = 1;
    let u2 = 2;
    for (let sb = 0; sb < 8; sb += 2) {
      const [sc1, m1] = getQ4KScaleMin(sb, bytes, sBase);
      const [sc2, m2] = getQ4KScaleMin(sb + 1, bytes, sBase);
      const d1 = d * sc1;
      const min1 = dmin * m1;
      const d2 = d * sc2;
      const min2 = dmin * m2;
      const qsOff = qsBase + (sb / 2) * 32;
      for (let l = 0; l < 32; l++) {
        const qsByte = view.getUint8(qsOff + l);
        const qhByte = view.getUint8(qhBase + l);
        const hi1 = qhByte & u1 ? 16 : 0;
        const hi2 = qhByte & u2 ? 16 : 0;
        out[outBase + l] = d1 * ((qsByte & 0x0f) + hi1) - min1;
        out[outBase + 32 + l] = d2 * ((qsByte >> 4) + hi2) - min2;
      }
      outBase += 64;
      u1 <<= 2;
      u2 <<= 2;
    }
  }
  return out;
}

// Dequantize a Q2_K tensor to fp32. Layout per 256-element super-block:
//   16B scales/mins | 64B 2-bit qs | fp16 d | fp16 dmin
// The 256 elements are laid out as two 128-chunks, each consuming 32 qs
// bytes and 8 scale bytes. Each scale byte packs a 4-bit scale (low nibble)
// and a 4-bit min (high nibble). Within a chunk, shift walks 0/2/4/6 across
// 4 iterations, each handling 32 elements as two 16-wide sub-blocks.
// Matches ggml-quants.c dequantize_row_q2_K.
function dequantQ2K(bytes: Uint8Array, absOffset: number, nElems: number): Float32Array {
  const out = new Float32Array(nElems);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const nBlocks = nElems / QK_K;
  for (let b = 0; b < nBlocks; b++) {
    const blockAt = absOffset + b * Q2_K_BLOCK_BYTES;
    const scOff = blockAt;
    const qsOff = blockAt + QK_K / 16;
    const dOff = qsOff + QK_K / 4;
    const d = f16ToF32(view.getUint16(dOff, true));
    const dmin = f16ToF32(view.getUint16(dOff + 2, true));
    let outPos = b * QK_K;
    let is = 0;
    // Two 128-chunks per 256-block.
    for (let n = 0; n < 2; n++) {
      const qBase = qsOff + n * 32;
      let shift = 0;
      for (let j = 0; j < 4; j++) {
        const sc1 = view.getUint8(scOff + is++);
        const dl1 = d * (sc1 & 0x0f);
        const ml1 = dmin * (sc1 >> 4);
        for (let l = 0; l < 16; l++) {
          const q = (view.getUint8(qBase + l) >> shift) & 3;
          out[outPos + l] = dl1 * q - ml1;
        }
        const sc2 = view.getUint8(scOff + is++);
        const dl2 = d * (sc2 & 0x0f);
        const ml2 = dmin * (sc2 >> 4);
        for (let l = 0; l < 16; l++) {
          const q = (view.getUint8(qBase + 16 + l) >> shift) & 3;
          out[outPos + 16 + l] = dl2 * q - ml2;
        }
        outPos += 32;
        shift += 2;
      }
    }
  }
  return out;
}

// Dequantize a Q3_K tensor to fp32. Layout per 256-element super-block:
//   32B hmask | 64B qs (low 2 bits) | 12B packed 6-bit scales | fp16 d
// The 12 packed scale bytes carry 16 × 6-bit values (scale per 16-element
// sub-block). They're unpacked here following ggml's kmask1=0x03030303 /
// kmask2=0x0f0f0f0f transform — the low 4 bits of each scale live in
// bytes 0..7, the high 2 bits in bytes 8..11. Scales are then bias-encoded
// (−32); each quant reconstructs as `(low2 − (hbit ? 0 : 4))` and `hbit`
// walks through the 8 bits of a shared 32-byte hmask across the 4 shifts
// × 2 chunks of the super-block. Matches ggml-quants.c dequantize_row_q3_K.
function dequantQ3K(bytes: Uint8Array, absOffset: number, nElems: number): Float32Array {
  const out = new Float32Array(nElems);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const nBlocks = nElems / QK_K;
  const scales = new Uint8Array(16);
  for (let b = 0; b < nBlocks; b++) {
    const blockAt = absOffset + b * Q3_K_BLOCK_BYTES;
    const hmaskOff = blockAt;
    const qsOff = blockAt + QK_K / 8;
    const scPacked = blockAt + QK_K / 8 + QK_K / 4;
    const dOff = scPacked + 12;
    const d = f16ToF32(view.getUint16(dOff, true));
    // Unpack 12 packed bytes into 16 6-bit scales (unsigned 0..63; the
    // bias of −32 is applied at use-site so this stays a Uint8Array).
    const sb = scPacked - bytes.byteOffset;
    for (let i = 0; i < 4; i++) {
      const hi = bytes[sb + 8 + i];
      scales[i] = (bytes[sb + i] & 0x0f) | (((hi >> 0) & 0x03) << 4);
      scales[i + 4] = (bytes[sb + 4 + i] & 0x0f) | (((hi >> 2) & 0x03) << 4);
      scales[i + 8] = ((bytes[sb + i] >> 4) & 0x0f) | (((hi >> 4) & 0x03) << 4);
      scales[i + 12] = ((bytes[sb + 4 + i] >> 4) & 0x0f) | (((hi >> 6) & 0x03) << 4);
    }
    let m = 1;
    let is = 0;
    let outPos = b * QK_K;
    // Two 128-chunks per 256-block; hmask is shared across both chunks,
    // m picks which of its 8 bits applies to a given (shift, chunk) slot.
    for (let n = 0; n < 2; n++) {
      const qBase = qsOff + n * 32;
      let shift = 0;
      for (let j = 0; j < 4; j++) {
        const dl1 = d * (scales[is++] - 32);
        for (let l = 0; l < 16; l++) {
          const q = (view.getUint8(qBase + l) >> shift) & 3;
          const h = view.getUint8(hmaskOff + l) & m ? 0 : 4;
          out[outPos + l] = dl1 * (q - h);
        }
        const dl2 = d * (scales[is++] - 32);
        for (let l = 0; l < 16; l++) {
          const q = (view.getUint8(qBase + 16 + l) >> shift) & 3;
          const h = view.getUint8(hmaskOff + 16 + l) & m ? 0 : 4;
          out[outPos + 16 + l] = dl2 * (q - h);
        }
        outPos += 32;
        shift += 2;
        m <<= 1;
      }
    }
  }
  return out;
}

function dequantQ4K(bytes: Uint8Array, absOffset: number, nElems: number): Float32Array {
  const out = new Float32Array(nElems);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const nBlocks = nElems / QK_K;
  for (let b = 0; b < nBlocks; b++) {
    const blockAt = absOffset + b * Q4_K_BLOCK_BYTES;
    const d = f16ToF32(view.getUint16(blockAt, true));
    const dmin = f16ToF32(view.getUint16(blockAt + 2, true));
    const sBase = blockAt - bytes.byteOffset + 4; // index into `bytes` for scales
    const qBase = blockAt + 4 + Q4_K_SCALE_SIZE;
    let outBase = b * QK_K;
    // 8 sub-blocks, processed two at a time (low-nibble + high-nibble pair).
    for (let sb = 0; sb < 8; sb += 2) {
      const [sc1, m1] = getQ4KScaleMin(sb, bytes, sBase);
      const [sc2, m2] = getQ4KScaleMin(sb + 1, bytes, sBase);
      const d1 = d * sc1;
      const min1 = dmin * m1;
      const d2 = d * sc2;
      const min2 = dmin * m2;
      const qOff = qBase + (sb / 2) * 32;
      for (let l = 0; l < 32; l++) {
        const byte = view.getUint8(qOff + l);
        out[outBase + l] = d1 * (byte & 0x0f) - min1;
        out[outBase + 32 + l] = d2 * (byte >> 4) - min2;
      }
      outBase += 64;
    }
  }
  return out;
}

// IEEE-754 half → float conversion. Pure JS so no WASM/C++ dependency for
// model load. The fast path for the common case (normal numbers) is ~4 ns
// per element in V8 — fine for a one-shot model load.
function f16ToF32(h: number): number {
  const sign = (h & 0x8000) >> 15;
  const exp = (h & 0x7c00) >> 10;
  const frac = h & 0x03ff;

  if (exp === 0) {
    // Subnormal (or zero).
    return (sign ? -1 : 1) * Math.pow(2, -14) * (frac / 0x400);
  }
  if (exp === 0x1f) {
    // Inf / NaN.
    return frac ? NaN : sign ? -Infinity : Infinity;
  }
  return (sign ? -1 : 1) * Math.pow(2, exp - 15) * (1 + frac / 0x400);
}

// Top-level entry: load a GGUF file from disk. Uses Bun.mmap() so a 1.3 GB
// Q8_0 Llama-3.2-1B comes in as a Uint8Array view over the page cache —
// parse itself only touches metadata + tensor-info (< 10 MB), and tensor
// weights are paged in on first access. Synchronous under the hood; the
// `async` return keeps the signature stable if we ever move to a real
// async open (e.g. for HTTP-hosted GGUFs).
async function loadGGUF(path: string): Promise<GGUFFile> {
  const bytes = Bun.mmap(path);
  return new GGUFFile(bytes);
}

export default {
  loadGGUF,
  GGUFFile,
  GGML_TYPE_F32,
  GGML_TYPE_F16,
  GGML_TYPE_Q8_0,
  GGML_TYPE_Q2_K,
  GGML_TYPE_Q3_K,
  GGML_TYPE_Q4_K,
  GGML_TYPE_Q5_K,
  GGML_TYPE_Q6_K,
  QK8_0,
  QK_K,
};
