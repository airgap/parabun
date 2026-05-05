// Hardcoded module "parabun:image/jxl" (private to parabun:image)
//
// FFI bindings for libjxl (JPEG XL — modern image codec with better
// compression than JPEG / AVIF for many photo / illustration cases).
// Decode-only for v1; encode would need the JxlEncoder API + a
// careful effort tier (libjxl's encoder is large + has many
// quality knobs). Same dlopen pattern as parabun:image/heif.

const SO_NAME =
  process.platform === "darwin" ? "libjxl.0.7.dylib" : process.platform === "win32" ? "jxl.dll" : "libjxl.so.0.7";

// JxlDecoderStatus enum values (stable across the 0.x line).
const JXL_DEC_SUCCESS = 0;
const JXL_DEC_ERROR = 1;
const JXL_DEC_NEED_MORE_INPUT = 2;
const JXL_DEC_BASIC_INFO = 0x40;
const JXL_DEC_FULL_IMAGE = 0x1000;
const JXL_DEC_NEED_IMAGE_OUT_BUFFER = 0x800;

// JxlBasicInfo struct offsets (libjxl 0.7). The struct is wider than
// these but we only need width + height + channel count.
const BI_OFF_XSIZE = 4;
const BI_OFF_YSIZE = 8;
const BI_STRUCT_SIZE = 512; // generous over-allocation

// JxlPixelFormat struct: { num_channels:u32, data_type:u32, endianness:u32, align:size_t (u64) }.
// Total 24 bytes on 64-bit (3 × u32 + u64). Pad to 32 for safety.
const PF_STRUCT_SIZE = 32;
const JXL_TYPE_UINT8 = 2;

type JxlSymbols = {
  JxlDecoderCreate: (memMgr: number) => bigint;
  JxlDecoderDestroy: (dec: bigint) => void;
  JxlDecoderSubscribeEvents: (dec: bigint, events: number) => number;
  JxlDecoderSetInput: (dec: bigint, data: number, size: bigint) => number;
  JxlDecoderProcessInput: (dec: bigint) => number;
  JxlDecoderGetBasicInfo: (dec: bigint, info: number) => number;
  JxlDecoderImageOutBufferSize: (dec: bigint, format: number, sizeOut: number) => number;
  JxlDecoderSetImageOutBuffer: (dec: bigint, format: number, buf: number, size: bigint) => number;
};

let lib: { symbols: JxlSymbols; close: () => void } | null = null;
let probed = false;

function probe(): boolean {
  if (probed) return lib !== null;
  probed = true;
  try {
    const { dlopen, FFIType } = ffi;
    lib = dlopen(SO_NAME, {
      JxlDecoderCreate: { args: [FFIType.ptr], returns: FFIType.u64 },
      JxlDecoderDestroy: { args: [FFIType.u64], returns: FFIType.void },
      JxlDecoderSubscribeEvents: { args: [FFIType.u64, FFIType.i32], returns: FFIType.i32 },
      JxlDecoderSetInput: { args: [FFIType.u64, FFIType.ptr, FFIType.u64], returns: FFIType.i32 },
      JxlDecoderProcessInput: { args: [FFIType.u64], returns: FFIType.i32 },
      JxlDecoderGetBasicInfo: { args: [FFIType.u64, FFIType.ptr], returns: FFIType.i32 },
      JxlDecoderImageOutBufferSize: { args: [FFIType.u64, FFIType.ptr, FFIType.ptr], returns: FFIType.i32 },
      JxlDecoderSetImageOutBuffer: { args: [FFIType.u64, FFIType.ptr, FFIType.ptr, FFIType.u64], returns: FFIType.i32 },
    }) as { symbols: JxlSymbols; close: () => void };
    return true;
  } catch {
    lib = null;
    return false;
  }
}

const ffi = require("../ffi.ts");

// JPEG XL magic bytes:
//   - Naked codestream: 0xFF 0x0A
//   - ISOBMFF container: 0x00 0x00 0x00 0x0C 0x4A 0x58 0x4C 0x20 0x0D 0x0A 0x87 0x0A
function isJxl(bytes: Uint8Array): boolean {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0x0a) return true;
  if (bytes.length >= 12) {
    return (
      bytes[0] === 0x00 &&
      bytes[1] === 0x00 &&
      bytes[2] === 0x00 &&
      bytes[3] === 0x0c &&
      bytes[4] === 0x4a &&
      bytes[5] === 0x58 &&
      bytes[6] === 0x4c &&
      bytes[7] === 0x20 &&
      bytes[8] === 0x0d &&
      bytes[9] === 0x0a &&
      bytes[10] === 0x87 &&
      bytes[11] === 0x0a
    );
  }
  return false;
}

type DecodedJxl = {
  data: Uint8Array;
  width: number;
  height: number;
  channels: 4;
};

function decode(bytes: Uint8Array): DecodedJxl {
  if (!probe() || !lib) {
    throw new Error(
      "parabun:image: JPEG XL support requires libjxl at runtime. Install via " +
        "`apt install libjxl0.7` (Linux) or `brew install jpeg-xl` (macOS).",
    );
  }
  const sym = lib.symbols;

  // 0 → NULL allocator (default).
  const dec = sym.JxlDecoderCreate(0);
  if (dec === 0n) throw new Error("jxl: JxlDecoderCreate returned null");

  try {
    if (sym.JxlDecoderSubscribeEvents(dec, JXL_DEC_BASIC_INFO | JXL_DEC_FULL_IMAGE) !== JXL_DEC_SUCCESS) {
      throw new Error("jxl: JxlDecoderSubscribeEvents failed");
    }
    if (sym.JxlDecoderSetInput(dec, ffi.ptr(bytes), BigInt(bytes.length)) !== JXL_DEC_SUCCESS) {
      throw new Error("jxl: JxlDecoderSetInput failed");
    }

    // Pixel format: 4-channel uint8 RGBA, native endian, no align.
    const pf = new Uint8Array(PF_STRUCT_SIZE);
    const pfView = new DataView(pf.buffer);
    pfView.setUint32(0, 4, true); // num_channels
    pfView.setUint32(4, JXL_TYPE_UINT8, true); // data_type
    pfView.setUint32(8, 0, true); // endianness = native
    pfView.setBigUint64(16, 0n, true); // align (0 = packed)

    const bi = new Uint8Array(BI_STRUCT_SIZE);
    let width = 0;
    let height = 0;
    let pixels: Uint8Array | undefined;

    // Decoder state machine. ProcessInput drives the loop;
    // we react to each event the decoder emits.
    while (true) {
      const status = sym.JxlDecoderProcessInput(dec);
      if (status === JXL_DEC_BASIC_INFO) {
        if (sym.JxlDecoderGetBasicInfo(dec, ffi.ptr(bi)) !== JXL_DEC_SUCCESS) {
          throw new Error("jxl: JxlDecoderGetBasicInfo failed");
        }
        const view = new DataView(bi.buffer);
        width = view.getUint32(BI_OFF_XSIZE, true);
        height = view.getUint32(BI_OFF_YSIZE, true);
        if (width <= 0 || height <= 0) throw new Error(`jxl: invalid dimensions ${width}×${height}`);
      } else if (status === JXL_DEC_NEED_IMAGE_OUT_BUFFER) {
        // Confirm the size matches our expectation, then point
        // libjxl at our pre-allocated buffer.
        const sizeOut = new BigUint64Array(1);
        if (sym.JxlDecoderImageOutBufferSize(dec, ffi.ptr(pf), ffi.ptr(sizeOut)) !== JXL_DEC_SUCCESS) {
          throw new Error("jxl: JxlDecoderImageOutBufferSize failed");
        }
        const need = Number(sizeOut[0]);
        const expected = width * height * 4;
        if (need !== expected) {
          throw new Error(`jxl: out-buffer size mismatch (need ${need}, computed ${expected})`);
        }
        pixels = new Uint8Array(need);
        if (sym.JxlDecoderSetImageOutBuffer(dec, ffi.ptr(pf), ffi.ptr(pixels), BigInt(need)) !== JXL_DEC_SUCCESS) {
          throw new Error("jxl: JxlDecoderSetImageOutBuffer failed");
        }
      } else if (status === JXL_DEC_FULL_IMAGE) {
        // Frame fully decoded into our buffer.
        break;
      } else if (status === JXL_DEC_SUCCESS) {
        // Some single-frame bitstreams jump straight to SUCCESS
        // after FULL_IMAGE — fine, just break.
        break;
      } else if (status === JXL_DEC_ERROR) {
        throw new Error("jxl: JxlDecoderProcessInput returned ERROR");
      } else if (status === JXL_DEC_NEED_MORE_INPUT) {
        throw new Error("jxl: input truncated (decoder wants more bytes)");
      } else {
        throw new Error(`jxl: unexpected decoder status ${status}`);
      }
    }
    if (!pixels) throw new Error("jxl: decoder finished without producing an image buffer");
    return { data: pixels, width, height, channels: 4 };
  } finally {
    sym.JxlDecoderDestroy(dec);
  }
}

function isAvailable(): boolean {
  return probe();
}

export default { decode, isJxl, isAvailable };
