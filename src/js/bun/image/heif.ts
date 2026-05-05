// Hardcoded module "parabun:image/heif" (private to parabun:image)
//
// FFI bindings for libheif (HEIC / HEIF — Apple's container around
// HEVC-encoded photos). Decode-only for v1; encode requires an HEVC
// backend (libx265) which adds significant bring-up that's a
// follow-up. Same dlopen pattern as parabun:image/avif.

const SO_NAME =
  process.platform === "darwin" ? "libheif.1.dylib" : process.platform === "win32" ? "heif-1.dll" : "libheif.so.1";

// heif_chroma values we care about for output (libheif 1.x stable).
const HEIF_CHROMA_INTERLEAVED_RGBA = 11;
// heif_colorspace values (1.x stable).
const HEIF_COLORSPACE_RGB = 1;

type HeifSymbols = {
  heif_context_alloc: () => bigint;
  heif_context_free: (ctx: bigint) => void;
  heif_context_read_from_memory_without_copy: (ctx: bigint, mem: number, size: bigint, opts: number) => bigint;
  heif_context_get_primary_image_handle: (ctx: bigint, handlePtrOut: number) => bigint;
  heif_image_handle_release: (handle: bigint) => void;
  heif_image_handle_get_width: (handle: bigint) => number;
  heif_image_handle_get_height: (handle: bigint) => number;
  heif_decode_image: (handle: bigint, imagePtrOut: number, colorspace: number, chroma: number, opts: number) => bigint;
  heif_image_release: (image: bigint) => void;
  heif_image_get_plane_readonly: (image: bigint, channel: number, strideOut: number) => number;
  heif_image_get_width: (image: bigint, channel: number) => number;
  heif_image_get_height: (image: bigint, channel: number) => number;
};

let lib: { symbols: HeifSymbols; close: () => void } | null = null;
let probed = false;

function probe(): boolean {
  if (probed) return lib !== null;
  probed = true;
  try {
    const { dlopen, FFIType } = ffi;
    lib = dlopen(SO_NAME, {
      heif_context_alloc: { args: [], returns: FFIType.u64 },
      heif_context_free: { args: [FFIType.u64], returns: FFIType.void },
      heif_context_read_from_memory_without_copy: {
        args: [FFIType.u64, FFIType.ptr, FFIType.u64, FFIType.i32],
        returns: FFIType.u64,
      },
      heif_context_get_primary_image_handle: { args: [FFIType.u64, FFIType.ptr], returns: FFIType.u64 },
      heif_image_handle_release: { args: [FFIType.u64], returns: FFIType.void },
      heif_image_handle_get_width: { args: [FFIType.u64], returns: FFIType.i32 },
      heif_image_handle_get_height: { args: [FFIType.u64], returns: FFIType.i32 },
      heif_decode_image: {
        args: [FFIType.u64, FFIType.ptr, FFIType.i32, FFIType.i32, FFIType.i32],
        returns: FFIType.u64,
      },
      heif_image_release: { args: [FFIType.u64], returns: FFIType.void },
      heif_image_get_plane_readonly: {
        args: [FFIType.u64, FFIType.i32, FFIType.ptr],
        returns: FFIType.ptr,
      },
      heif_image_get_width: { args: [FFIType.u64, FFIType.i32], returns: FFIType.i32 },
      heif_image_get_height: { args: [FFIType.u64, FFIType.i32], returns: FFIType.i32 },
    }) as { symbols: HeifSymbols; close: () => void };
    return true;
  } catch {
    lib = null;
    return false;
  }
}

const ffi = require("../ffi.ts");

// Magic-byte detection. HEIF/HEIC files are ISOBMFF with `ftyp` at
// byte 4 and a brand starting with "hei" / "heim" / "heis" / "heix"
// or "mif1" at byte 8 (some HEIC exports use the generic mif1
// brand). We also accept "heic" + "heix" + "heim" + "heis" + "mif1".
function isHeif(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  if (bytes[4] !== 0x66 || bytes[5] !== 0x74 || bytes[6] !== 0x79 || bytes[7] !== 0x70) return false;
  // Brand at bytes 8-11. heic / heix / heim / heis / mif1.
  const b0 = bytes[8],
    b1 = bytes[9],
    b2 = bytes[10],
    b3 = bytes[11];
  if (b0 === 0x68 && b1 === 0x65 && b2 === 0x69) {
    // 'h''e''i'X
    return b3 === 0x63 || b3 === 0x78 || b3 === 0x6d || b3 === 0x73; // c / x / m / s
  }
  if (b0 === 0x6d && b1 === 0x69 && b2 === 0x66 && b3 === 0x31) return true; // mif1
  return false;
}

type DecodedHeif = {
  data: Uint8Array;
  width: number;
  height: number;
  channels: 4;
};

function decode(bytes: Uint8Array): DecodedHeif {
  if (!probe() || !lib) {
    throw new Error(
      "parabun:image: HEIC support requires libheif at runtime. Install via " +
        "`apt install libheif1` (Linux) or `brew install libheif` (macOS).",
    );
  }
  const sym = lib.symbols;
  const ctx = sym.heif_context_alloc();
  if (ctx === 0n) throw new Error("heif: heif_context_alloc returned null");
  try {
    // read_from_memory_without_copy returns a heif_error STRUCT by
    // value (a tiny struct with code + subcode + message). Bun FFI
    // can't model struct-return easily; libheif's u64 return here
    // is actually a packed (code << 32 | subcode) on most ABIs but
    // the safer reading is "non-zero high bits = error". Treat any
    // nonzero return as an error for v1.
    const readErr = sym.heif_context_read_from_memory_without_copy(ctx, ffi.ptr(bytes), BigInt(bytes.length), 0);
    if (readErr !== 0n) throw new Error(`heif: heif_context_read_from_memory_without_copy failed (err=${readErr})`);

    // Get primary image handle. Output is via a pointer arg.
    const handleOut = new BigUint64Array(1);
    const handleErr = sym.heif_context_get_primary_image_handle(ctx, ffi.ptr(handleOut));
    if (handleErr !== 0n) throw new Error(`heif: heif_context_get_primary_image_handle failed (err=${handleErr})`);
    const handle = handleOut[0];
    if (handle === 0n) throw new Error("heif: primary image handle is null");

    try {
      const width = sym.heif_image_handle_get_width(handle);
      const height = sym.heif_image_handle_get_height(handle);
      if (width <= 0 || height <= 0) throw new Error(`heif: invalid dimensions ${width}×${height}`);

      // Decode to 8-bit RGBA. heif_decode_image allocates the image;
      // we read its plane and copy into a JS-owned Uint8Array.
      const imageOut = new BigUint64Array(1);
      const decodeErr = sym.heif_decode_image(
        handle,
        ffi.ptr(imageOut),
        HEIF_COLORSPACE_RGB,
        HEIF_CHROMA_INTERLEAVED_RGBA,
        0,
      );
      if (decodeErr !== 0n) throw new Error(`heif: heif_decode_image failed (err=${decodeErr})`);
      const image = imageOut[0];
      if (image === 0n) throw new Error("heif: decoded image is null");

      try {
        // Plane channel "interleaved" = 10 (heif_channel_interleaved
        // per libheif 1.x). For RGBA, plane is one buffer with the
        // interleaved bytes; stride in bytes per row.
        const HEIF_CHANNEL_INTERLEAVED = 10;
        const strideOut = new Int32Array(1);
        const planePtr = sym.heif_image_get_plane_readonly(image, HEIF_CHANNEL_INTERLEAVED, ffi.ptr(strideOut));
        if (planePtr === 0) throw new Error("heif: heif_image_get_plane_readonly returned null");
        const stride = strideOut[0];
        if (stride < width * 4) throw new Error(`heif: plane stride ${stride} < expected ${width * 4}`);

        // Copy out — the plane is owned by the heif_image which
        // we'll free below. ffi.toArrayBuffer aliases the native
        // memory; we materialise into a fresh Uint8Array.
        const planeBuf = new Uint8Array(ffi.toArrayBuffer(planePtr, 0, stride * height));
        const out = new Uint8Array(width * height * 4);
        for (let y = 0; y < height; y++) {
          out.set(planeBuf.subarray(y * stride, y * stride + width * 4), y * width * 4);
        }
        return { data: out, width, height, channels: 4 };
      } finally {
        sym.heif_image_release(image);
      }
    } finally {
      sym.heif_image_handle_release(handle);
    }
  } finally {
    sym.heif_context_free(ctx);
  }
}

function isAvailable(): boolean {
  return probe();
}

export default { decode, isHeif, isAvailable };
