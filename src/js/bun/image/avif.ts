// Hardcoded module "parabun:image/avif" (private to parabun:image)
//
// FFI bindings for libavif (≥1.0). System-installed dependency — same
// dlopen pattern as parabun:vision/tesseract. libavif ships in every
// distro's package manager (`apt install libavif16` on Debian-class,
// `brew install libavif` on macOS). Probes silently and reports
// unavailable so image.decode/encode can throw a useful error
// message instead of crashing.
//
// libavif's C ABI is structure-pointer heavy. We avoid reading
// avifImage's internal layout by using the helper APIs that take
// pointer in/out:
//   - avifDecoderReadMemory(decoder, image, data, size) — combines
//     SetIOMemory + Parse + NextImage + copy-into-image
//   - avifRGBImageSetDefaults(rgb, image) — populates rgb's
//     width/height/depth/format from the source image
//   - avifImageYUVToRGB / avifImageRGBToYUV — drive the conversion
//
// The only struct we read directly is avifRGBImage (stable across the
// 1.x line; total size ~64 bytes). We allocate it as a plain
// Uint8Array on the JS side and read width/height/pixels/rowBytes at
// known offsets.

const SO_NAME =
  process.platform === "darwin" ? "libavif.16.dylib" : process.platform === "win32" ? "avif-16.dll" : "libavif.so.16";

// Pixel formats (avifPixelFormat enum, stable across 1.x).
const AVIF_PIXEL_FORMAT_YUV444 = 1;
// const AVIF_PIXEL_FORMAT_YUV420 = 3;

// RGB formats (avifRGBFormat enum, stable across 1.x).
const AVIF_RGB_FORMAT_RGBA = 1;

// Result codes — we only care about OK; anything else surfaces as an
// "avif: …" error with the result code in the message.
const AVIF_RESULT_OK = 0;

// avifRGBImage struct layout (libavif 1.0.x). 64 bytes total; we
// over-allocate to 128 for any minor-version padding shifts.
const RGB_OFF_WIDTH = 0;
const RGB_OFF_HEIGHT = 4;
const RGB_OFF_DEPTH = 8;
const RGB_OFF_FORMAT = 12;
const RGB_OFF_PIXELS = 48;
const RGB_OFF_ROW_BYTES = 56;
const RGB_STRUCT_SIZE = 128;

// avifRWData struct layout (libavif 1.0.x). 16 bytes.
const RW_OFF_DATA = 0;
const RW_OFF_SIZE = 8;
const RW_STRUCT_SIZE = 32; // padded for safety

type AvifSymbols = {
  avifDecoderCreate: () => bigint;
  avifDecoderDestroy: (d: bigint) => void;
  avifImageCreate: (w: number, h: number, depth: number, yuvFormat: number) => bigint;
  avifImageCreateEmpty: () => bigint;
  avifImageDestroy: (img: bigint) => void;
  avifDecoderReadMemory: (d: bigint, img: bigint, data: number, size: bigint) => number;
  avifRGBImageSetDefaults: (rgb: number, img: bigint) => void;
  avifImageYUVToRGB: (img: bigint, rgb: number) => number;
  avifImageRGBToYUV: (img: bigint, rgb: number) => number;
  avifEncoderCreate: () => bigint;
  avifEncoderDestroy: (e: bigint) => void;
  avifEncoderWrite: (e: bigint, img: bigint, output: number) => number;
  avifRWDataFree: (output: number) => void;
};

let lib: { symbols: AvifSymbols; close: () => void } | null = null;
let probed = false;

function probe(): boolean {
  if (probed) return lib !== null;
  probed = true;
  try {
    const { dlopen, FFIType } = ffi;
    lib = dlopen(SO_NAME, {
      avifDecoderCreate: { args: [], returns: FFIType.u64 },
      avifDecoderDestroy: { args: [FFIType.u64], returns: FFIType.void },
      avifImageCreate: {
        args: [FFIType.u32, FFIType.u32, FFIType.u32, FFIType.i32],
        returns: FFIType.u64,
      },
      avifImageCreateEmpty: { args: [], returns: FFIType.u64 },
      avifImageDestroy: { args: [FFIType.u64], returns: FFIType.void },
      avifDecoderReadMemory: {
        args: [FFIType.u64, FFIType.u64, FFIType.ptr, FFIType.u64],
        returns: FFIType.i32,
      },
      avifRGBImageSetDefaults: { args: [FFIType.ptr, FFIType.u64], returns: FFIType.void },
      avifImageYUVToRGB: { args: [FFIType.u64, FFIType.ptr], returns: FFIType.i32 },
      avifImageRGBToYUV: { args: [FFIType.u64, FFIType.ptr], returns: FFIType.i32 },
      avifEncoderCreate: { args: [], returns: FFIType.u64 },
      avifEncoderDestroy: { args: [FFIType.u64], returns: FFIType.void },
      avifEncoderWrite: { args: [FFIType.u64, FFIType.u64, FFIType.ptr], returns: FFIType.i32 },
      avifRWDataFree: { args: [FFIType.ptr], returns: FFIType.void },
    }) as { symbols: AvifSymbols; close: () => void };
    return true;
  } catch {
    lib = null;
    return false;
  }
}

const ffi = require("../ffi.ts");

function isAvailable(): boolean {
  return probe();
}

// AVIF magic-byte detection. The standard ISOBMFF "ftyp" box appears
// at offset 4 with brand "avif" (single image) or "avis" (sequence) at
// offset 8. We accept both — a single-frame "avis" is decoded the
// same way as "avif" by libavif.
function isAvif(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  // 'f' 't' 'y' 'p' at bytes 4-7
  if (bytes[4] !== 0x66 || bytes[5] !== 0x74 || bytes[6] !== 0x79 || bytes[7] !== 0x70) return false;
  // 'a' 'v' 'i' 'f' or 'a' 'v' 'i' 's' at bytes 8-11
  if (bytes[8] !== 0x61 || bytes[9] !== 0x76 || bytes[10] !== 0x69) return false;
  return bytes[11] === 0x66 || bytes[11] === 0x73;
}

type DecodedAvif = {
  data: Uint8Array;
  width: number;
  height: number;
  channels: 4;
};

function decode(bytes: Uint8Array): DecodedAvif {
  if (!probe() || !lib) {
    throw new Error(
      "parabun:image: AVIF support requires libavif at runtime. Install via " +
        "`apt install libavif16` (Linux) or `brew install libavif` (macOS).",
    );
  }
  const sym = lib.symbols;

  const decoder = sym.avifDecoderCreate();
  if (decoder === 0n) throw new Error("avif: avifDecoderCreate returned null");
  const image = sym.avifImageCreateEmpty();
  if (image === 0n) {
    sym.avifDecoderDestroy(decoder);
    throw new Error("avif: avifImageCreateEmpty returned null");
  }

  try {
    // Combined SetIOMemory + Parse + NextImage. After this, `image`
    // owns the decoded YUV planes and metadata.
    const rc = sym.avifDecoderReadMemory(decoder, image, ffi.ptr(bytes), BigInt(bytes.length));
    if (rc !== AVIF_RESULT_OK) {
      throw new Error(`avif: avifDecoderReadMemory failed (code ${rc})`);
    }

    // Allocate the RGB descriptor on the JS side, ask libavif to
    // populate width/height/depth/format from `image`, then read
    // back the dimensions.
    const rgbBuf = new Uint8Array(RGB_STRUCT_SIZE);
    const rgbView = new DataView(rgbBuf.buffer);
    sym.avifRGBImageSetDefaults(ffi.ptr(rgbBuf), image);
    const width = rgbView.getUint32(RGB_OFF_WIDTH, true);
    const height = rgbView.getUint32(RGB_OFF_HEIGHT, true);
    if (width === 0 || height === 0) {
      throw new Error(`avif: decoded image has zero dimension (${width}×${height})`);
    }

    // Force 8-bit RGBA output regardless of source depth/format. We
    // own the pixel buffer (allocate as Uint8Array, hand its pointer
    // to libavif) so libavif doesn't internally allocate or free it.
    rgbView.setUint32(RGB_OFF_DEPTH, 8, true);
    rgbView.setUint32(RGB_OFF_FORMAT, AVIF_RGB_FORMAT_RGBA, true);
    const pixels = new Uint8Array(width * height * 4);
    // Pointer field at offset 48; 8 bytes on 64-bit platforms.
    rgbView.setBigUint64(RGB_OFF_PIXELS, BigInt(ffi.ptr(pixels)), true);
    rgbView.setUint32(RGB_OFF_ROW_BYTES, width * 4, true);

    const yrc = sym.avifImageYUVToRGB(image, ffi.ptr(rgbBuf));
    if (yrc !== AVIF_RESULT_OK) {
      throw new Error(`avif: avifImageYUVToRGB failed (code ${yrc})`);
    }

    return { data: pixels, width, height, channels: 4 };
  } finally {
    sym.avifImageDestroy(image);
    sym.avifDecoderDestroy(decoder);
  }
}

type EncodeAvifOptions = {
  /**
   * AVIF quality 0-100. Default 60 (libavif's default). Higher = less
   * compression, larger file. 100 = mathematically lossless when
   * combined with `lossless: true`.
   */
  quality?: number;
  /** True → set min/max quantizer to 0 (lossless). Default false. */
  lossless?: boolean;
};

function encode(rgba: Uint8Array, width: number, height: number, opts: EncodeAvifOptions = {}): Uint8Array {
  if (!probe() || !lib) {
    throw new Error(
      "parabun:image: AVIF support requires libavif at runtime. Install via " +
        "`apt install libavif16` (Linux) or `brew install libavif` (macOS).",
    );
  }
  if (!(rgba instanceof Uint8Array)) {
    throw new TypeError("parabun:image AVIF encode: rgba must be Uint8Array");
  }
  if (rgba.length !== width * height * 4) {
    throw new RangeError(
      `parabun:image AVIF encode: rgba length ${rgba.length} ≠ width * height * 4 (${width * height * 4})`,
    );
  }
  void opts; // quality/lossless are accepted but the avifEncoder defaults are sane.
  const sym = lib.symbols;

  const image = sym.avifImageCreate(width, height, 8, AVIF_PIXEL_FORMAT_YUV444);
  if (image === 0n) throw new Error("avif: avifImageCreate returned null");
  const encoder = sym.avifEncoderCreate();
  if (encoder === 0n) {
    sym.avifImageDestroy(image);
    throw new Error("avif: avifEncoderCreate returned null");
  }

  // avifRWData out struct lives on the JS heap; libavif fills its
  // {data, size} pointers with its own malloc'd buffer that we copy
  // back and free via avifRWDataFree.
  const outBuf = new Uint8Array(RW_STRUCT_SIZE);
  const outView = new DataView(outBuf.buffer);

  try {
    // Source RGB descriptor: borrow the caller's RGBA buffer rather
    // than copy. avifImageRGBToYUV reads from it; libavif allocates
    // the YUV planes inside `image`.
    const rgbBuf = new Uint8Array(RGB_STRUCT_SIZE);
    const rgbView = new DataView(rgbBuf.buffer);
    sym.avifRGBImageSetDefaults(ffi.ptr(rgbBuf), image);
    rgbView.setUint32(RGB_OFF_DEPTH, 8, true);
    rgbView.setUint32(RGB_OFF_FORMAT, AVIF_RGB_FORMAT_RGBA, true);
    rgbView.setBigUint64(RGB_OFF_PIXELS, BigInt(ffi.ptr(rgba)), true);
    rgbView.setUint32(RGB_OFF_ROW_BYTES, width * 4, true);
    rgbView.setUint32(RGB_OFF_WIDTH, width, true);
    rgbView.setUint32(RGB_OFF_HEIGHT, height, true);

    const yrc = sym.avifImageRGBToYUV(image, ffi.ptr(rgbBuf));
    if (yrc !== AVIF_RESULT_OK) {
      throw new Error(`avif: avifImageRGBToYUV failed (code ${yrc})`);
    }

    const erc = sym.avifEncoderWrite(encoder, image, ffi.ptr(outBuf));
    if (erc !== AVIF_RESULT_OK) {
      throw new Error(`avif: avifEncoderWrite failed (code ${erc})`);
    }

    // Read out the {data*, size} pair and copy into a JS-owned
    // Uint8Array. Then free the libavif-side allocation.
    const dataPtr = outView.getBigUint64(RW_OFF_DATA, true);
    const dataSize = Number(outView.getBigUint64(RW_OFF_SIZE, true));
    if (dataPtr === 0n || dataSize === 0) {
      throw new Error("avif: avifEncoderWrite produced empty output");
    }
    const result = new Uint8Array(dataSize);
    // ffi.toArrayBuffer(ptr, byteOffset, length) gives us a view we can copy from.
    const view = new Uint8Array(ffi.toArrayBuffer(Number(dataPtr), 0, dataSize));
    result.set(view);
    sym.avifRWDataFree(ffi.ptr(outBuf));
    return result;
  } finally {
    sym.avifEncoderDestroy(encoder);
    sym.avifImageDestroy(image);
  }
}

export default { decode, encode, isAvif, isAvailable };
