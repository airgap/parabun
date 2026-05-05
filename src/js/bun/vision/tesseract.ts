// Hardcoded module "parabun:vision/tesseract" (private to parabun:vision)
//
// FFI bindings for libtesseract (Tesseract OCR, ≥5.0). System-installed
// dependency — match parabun:gpu's libcuda dlopen pattern. Tesseract is
// apt-installable on every distro (`apt install libtesseract-dev tesseract-ocr-eng`),
// brew-installable on macOS (`brew install tesseract`), and downloadable as
// a UB Mannheim build on Windows. Probes silently and reports unavailable
// upstream so vision.recognize can throw a useful error message instead of
// crashing.
//
// API surface used:
//   - TessBaseAPICreate / Delete / Init3 — create + load a language model
//   - TessBaseAPISetImage(rgba, w, h, 4, w*4) — feed a packed RGBA frame
//   - TessBaseAPIRecognize — run the OCR pass
//   - TessBaseAPIGetIterator + TessResultIteratorNext / GetUTF8Text /
//     Confidence + TessPageIteratorBoundingBox — walk word-level results
//
// Output shape matches parabun:vision's Detection contract:
//   { label: <text>, score: <0..1 confidence>, bbox: { x, y, width, height } }
// — one Detection per recognized word, bbox in source-frame pixel coords.

const SO_NAME =
  process.platform === "darwin"
    ? "libtesseract.5.dylib"
    : process.platform === "win32"
      ? "libtesseract-5.dll"
      : "libtesseract.so.5";

// Tesseract page-iterator level enum values (from publictypes.h).
// Stable across the 4.x / 5.x line — these underpin the C ABI we link
// against, so they aren't going to drift.
const RIL_BLOCK = 0;
const RIL_PARA = 1;
const RIL_TEXTLINE = 2;
const RIL_WORD = 3;
const RIL_SYMBOL = 4;

type TesseractSymbols = {
  TessBaseAPICreate: () => bigint;
  TessBaseAPIDelete: (api: bigint) => void;
  TessBaseAPIEnd: (api: bigint) => void;
  // datapath / language are null-terminated UTF-8 strings; passing null for
  // datapath lets Tesseract probe TESSDATA_PREFIX or its compiled-in default.
  TessBaseAPIInit3: (api: bigint, datapath: number | null, language: number) => number;
  TessBaseAPISetImage: (
    api: bigint,
    imagedata: number,
    width: number,
    height: number,
    bytesPerPixel: number,
    bytesPerLine: number,
  ) => void;
  TessBaseAPISetSourceResolution: (api: bigint, ppi: number) => void;
  TessBaseAPIRecognize: (api: bigint, monitor: number | null) => number;
  TessBaseAPIGetUTF8Text: (api: bigint) => bigint;
  TessBaseAPIGetIterator: (api: bigint) => bigint;
  TessResultIteratorDelete: (it: bigint) => void;
  TessResultIteratorNext: (it: bigint, level: number) => number;
  TessResultIteratorGetUTF8Text: (it: bigint, level: number) => bigint;
  TessResultIteratorConfidence: (it: bigint, level: number) => number;
  TessPageIteratorBoundingBox: (
    it: bigint,
    level: number,
    pX1: number,
    pY1: number,
    pX2: number,
    pY2: number,
  ) => number;
  TessDeleteText: (text: bigint) => void;
  TessVersion: () => bigint;
};

let lib: { symbols: TesseractSymbols; close: () => void } | null = null;
let probed = false;

// Lazy probe — first recognize() call attempts dlopen; subsequent calls
// short-circuit. dlopen failures (missing lib, ABI mismatch) collapse to
// `null` so the upstream caller can throw a useful "install tesseract"
// message instead of letting Bun's FFI noise leak through.
function probe(): boolean {
  if (probed) return lib !== null;
  probed = true;
  try {
    const { dlopen, FFIType } = ffi;
    lib = dlopen(SO_NAME, {
      TessBaseAPICreate: { args: [], returns: FFIType.u64 },
      TessBaseAPIDelete: { args: [FFIType.u64], returns: FFIType.void },
      TessBaseAPIEnd: { args: [FFIType.u64], returns: FFIType.void },
      TessBaseAPIInit3: { args: [FFIType.u64, FFIType.ptr, FFIType.ptr], returns: FFIType.i32 },
      TessBaseAPISetImage: {
        args: [FFIType.u64, FFIType.ptr, FFIType.i32, FFIType.i32, FFIType.i32, FFIType.i32],
        returns: FFIType.void,
      },
      TessBaseAPISetSourceResolution: { args: [FFIType.u64, FFIType.i32], returns: FFIType.void },
      TessBaseAPIRecognize: { args: [FFIType.u64, FFIType.ptr], returns: FFIType.i32 },
      TessBaseAPIGetUTF8Text: { args: [FFIType.u64], returns: FFIType.u64 },
      TessBaseAPIGetIterator: { args: [FFIType.u64], returns: FFIType.u64 },
      TessResultIteratorDelete: { args: [FFIType.u64], returns: FFIType.void },
      TessResultIteratorNext: { args: [FFIType.u64, FFIType.i32], returns: FFIType.i32 },
      TessResultIteratorGetUTF8Text: { args: [FFIType.u64, FFIType.i32], returns: FFIType.u64 },
      TessResultIteratorConfidence: { args: [FFIType.u64, FFIType.i32], returns: FFIType.f32 },
      TessPageIteratorBoundingBox: {
        args: [FFIType.u64, FFIType.i32, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr],
        returns: FFIType.i32,
      },
      TessDeleteText: { args: [FFIType.u64], returns: FFIType.void },
      TessVersion: { args: [], returns: FFIType.u64 },
    }) as { symbols: TesseractSymbols; close: () => void };
    return true;
  } catch {
    lib = null;
    return false;
  }
}

const ffi = require("../ffi.ts");

// Read a Tesseract-allocated UTF-8 string from a returned pointer, copy
// it into a JS string, and free the C side. ffi.CString auto-decodes —
// its lifetime is independent of the underlying allocation, so the
// immediate copy + delete is safe.
function readAndFreeText(ptr: bigint): string {
  if (ptr === 0n) return "";
  const cs = new ffi.CString(Number(ptr));
  const s = String(cs);
  lib!.symbols.TessDeleteText(ptr);
  return s;
}

type RgbaFrame = {
  rgba: Uint8Array;
  width: number;
  height: number;
  timestampMs: number;
  sequence: number;
};

type Detection = {
  label: string;
  score: number;
  bbox: { x: number; y: number; width: number; height: number };
};

type RecognizeOpts = {
  /** Tesseract language code(s), e.g. "eng" or "eng+spa". Default "eng". */
  language?: string;
  /**
   * Path to a tessdata directory. Default: let Tesseract probe
   * `$TESSDATA_PREFIX` or its compiled-in default
   * (`/usr/share/tesseract-ocr/5/tessdata` on Debian-class Linux).
   */
  datapath?: string;
  /**
   * Word-level confidence cutoff in [0, 1]. Words below this are dropped.
   * Default 0.5 — kills the noise floor without throwing away legitimate
   * mid-quality reads.
   */
  minConfidence?: number;
};

// Per-call session — we don't cache TessBaseAPI handles globally because
// language switching needs Init3 to re-probe traineddata, and the cost of
// Create + Init is modest compared to inference. Future optimization:
// cache one handle per (datapath, language) and protect with a mutex.
function recognize(frame: RgbaFrame, opts: RecognizeOpts = {}): Detection[] {
  if (!probe()) {
    throw new Error(
      `parabun:vision.recognize (tesseract): libtesseract not loadable. ` +
        `Install via:\n` +
        `  apt install libtesseract-dev tesseract-ocr-eng    # Debian/Ubuntu\n` +
        `  brew install tesseract                            # macOS\n` +
        `Searched for: ${SO_NAME}`,
    );
  }
  const { ptr } = ffi;
  const s = lib!.symbols;

  const lang = opts.language ?? "eng";
  const langBuf = new TextEncoder().encode(lang + "\0");
  const dataBuf = opts.datapath ? new TextEncoder().encode(opts.datapath + "\0") : null;
  const minConf = opts.minConfidence ?? 0.5;

  const api = s.TessBaseAPICreate();
  if (api === 0n) throw new Error("parabun:vision.recognize (tesseract): TessBaseAPICreate failed");

  try {
    const initRc = s.TessBaseAPIInit3(api, dataBuf ? ptr(dataBuf) : null, ptr(langBuf));
    if (initRc !== 0) {
      throw new Error(
        `parabun:vision.recognize (tesseract): Init3 failed (rc=${initRc}). ` +
          `Likely missing traineddata for "${lang}". Install:\n` +
          `  apt install tesseract-ocr-${lang}\n` +
          `or download ${lang}.traineddata into ${opts.datapath ?? "$TESSDATA_PREFIX"}.`,
      );
    }

    s.TessBaseAPISetImage(api, ptr(frame.rgba), frame.width, frame.height, 4, frame.width * 4);
    // Default 70 dpi — drop assumed reading distance to avoid Tesseract
    // re-scaling our pixel buffer into something gigantic. Most synthetic
    // OCR targets (UI text, screenshots) sit fine at 96-150 dpi.
    s.TessBaseAPISetSourceResolution(api, 96);

    const recRc = s.TessBaseAPIRecognize(api, null);
    if (recRc !== 0) {
      throw new Error(`parabun:vision.recognize (tesseract): Recognize failed (rc=${recRc})`);
    }

    const it = s.TessBaseAPIGetIterator(api);
    if (it === 0n) return []; // no text found — empty frame is valid

    try {
      const results: Detection[] = [];
      // BoundingBox writes through four separate i32* out-params. Reusing
      // one Int32Array(1) per arg keeps the FFI call's ABI obvious — Bun
      // pins each on call and returns a pointer to its first element.
      const x1Buf = new Int32Array(1);
      const y1Buf = new Int32Array(1);
      const x2Buf = new Int32Array(1);
      const y2Buf = new Int32Array(1);

      do {
        const textPtr = s.TessResultIteratorGetUTF8Text(it, RIL_WORD);
        if (textPtr === 0n) continue;
        const text = readAndFreeText(textPtr);
        if (text.trim().length === 0) continue;

        const conf = s.TessResultIteratorConfidence(it, RIL_WORD) / 100;
        if (conf < minConf) continue;

        const ok = s.TessPageIteratorBoundingBox(it, RIL_WORD, ptr(x1Buf), ptr(y1Buf), ptr(x2Buf), ptr(y2Buf));
        if (ok === 0) continue;

        results.push({
          label: text,
          score: conf,
          bbox: {
            x: x1Buf[0],
            y: y1Buf[0],
            width: x2Buf[0] - x1Buf[0],
            height: y2Buf[0] - y1Buf[0],
          },
        });
      } while (s.TessResultIteratorNext(it, RIL_WORD) !== 0);

      return results;
    } finally {
      s.TessResultIteratorDelete(it);
    }
  } finally {
    s.TessBaseAPIEnd(api);
    s.TessBaseAPIDelete(api);
  }
}

function isAvailable(): boolean {
  return probe();
}

function version(): string | null {
  if (!probe()) return null;
  const v = lib!.symbols.TessVersion();
  if (v === 0n) return null;
  return String(new ffi.CString(Number(v))); // not allocated by Tesseract — don't free
}

export default {
  recognize,
  isAvailable,
  version,
};
