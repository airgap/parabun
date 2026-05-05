// Hardcoded module "parabun:image"
//
// Parabun: image decode / encode / resize / filter — a Sharp-class module
// baked into the runtime so apps don't need to npm-install a binary
// distribution that drifts with Node ABI versions.
//
//   import image from "parabun:image";
//   const img = await image.decode(bytes);
//   // img: { data: Uint8Array, width, height, channels, format }
//
// Codecs (v1):
//   - JPEG: libjpeg-turbo, decoded as 3-channel RGB.
//   - PNG:  libpng, decoded as 4-channel RGBA.
// Both libs are statically linked into the Parabun binary; no external
// install needed. Format is auto-detected from the magic-byte prefix.
//
// Encode + WebP/AVIF + resize (via parabun:gpu conv2D) follow in subsequent
// commits — tracks LYK-723.

const native = $cpp("parabun_image_codecs.cpp", "createParabunImageCodecs");

const NOT_IMPLEMENTED_MSG =
  "parabun:image is scaffolded but not yet implemented — see https://linear.app/lyku/issue/LYK-723";

function todo(): never {
  throw new Error(NOT_IMPLEMENTED_MSG);
}

type ImageFormat = "jpeg" | "png" | "webp" | "avif";
type DecodedImage = {
  data: Uint8Array;
  width: number;
  height: number;
  channels: number;
  format: ImageFormat;
};
type EncodeOptions = {
  format: ImageFormat;
  /** JPEG / WebP quality 1-100. Ignored for PNG. Default 85. */
  quality?: number;
  /** WebP only — opt into lossless mode. PNG is always lossless. Default false. */
  lossless?: boolean;
};
type ResizeOptions = {
  width: number;
  height: number;
  /**
   * Resampling algorithm.
   *   "bilinear" — fast, smooth (default). Good for upscaling, fine for
   *               small-ratio downscaling.
   *   "lanczos"  — sharper, ~3-4× slower. Strongly preferred for
   *               significant downscaling (≥ 2×) or when edge sharpness
   *               matters. Standard Lanczos-3.
   */
  kernel?: "bilinear" | "lanczos";
};
type BlurOptions = {
  /** Blur radius in pixels. 0 = passthrough, 100 = max. */
  radius: number;
  /**
   * Opt-in to GPU dispatch. Routes through parabun:gpu's conv2D primitive,
   * which uses CUDA on Linux/Windows and Metal on macOS when available
   * and falls back to CPU (the same kernel as the default path) when no
   * GPU backend is active. Worth flipping on for ≥ 1 MP images on
   * GPU-equipped hosts; for smaller images the H2D / D2H transfer
   * dominates the kernel time and CPU is faster. Default false.
   */
  gpu?: boolean;
};
type ThresholdOptions = {
  /** Cutoff in [0, 255]. Pixels with luma > value become 255, else 0. Default 128. */
  value?: number;
};
type CompositeOptions = {
  /** X-offset of the overlay's top-left corner in base coordinates. Default 0. Negative values are allowed (overlay clipped on the left). */
  x?: number;
  /** Y-offset of the overlay's top-left corner in base coordinates. Default 0. Negative values are allowed (overlay clipped on the top). */
  y?: number;
};
type AdjustOptions = {
  /** Additive lightness shift, -1 = full black, 0 = unchanged, +1 = full white. */
  brightness?: number;
  /** Multiplicative dynamic-range scale around mid-gray, -1 = flat 50%, 0 = unchanged, +1 = doubled. */
  contrast?: number;
  /** Lerp toward / away from luma, -1 = grayscale, 0 = unchanged, +1 = 2× saturated. */
  saturation?: number;
};
type CropOptions = {
  /** Left edge of the crop rectangle in pixels. >= 0. */
  x: number;
  /** Top edge of the crop rectangle in pixels. >= 0. */
  y: number;
  /** Width of the crop rectangle in pixels. >= 1. */
  width: number;
  /** Height of the crop rectangle in pixels. >= 1. */
  height: number;
};
type RotateOptions = {
  /** 90 (clockwise), 180, or 270. Arbitrary angles need resampling — not supported in v1. */
  degrees: 90 | 180 | 270;
};
type FlipOptions = {
  /** "horizontal" mirrors left-right; "vertical" mirrors top-bottom. */
  axis: "horizontal" | "vertical";
};
type SharpenOptions = {
  /**
   * Strength of the high-frequency boost. Default 1 (one extra copy of the
   * detail). 0 = no change, 0.5 = subtle, 2+ = aggressive (visible halos).
   * Negative values produce a soften effect.
   */
  amount?: number;
  /** Gaussian radius for the unsharp-mask low-pass. Default 1. */
  radius?: number;
};

// Lazy-required to avoid loading the FFI module unless an AVIF call
// actually fires. The module itself is opaque (no eager probe).
const avifMod = require("./image/avif.ts");

// Animated formats route through the video/ffmpeg helper since at
// the codec level animated GIF / animated WebP / APNG are
// indistinguishable from a short video. require'd lazily — first
// decodeFrames() call probes ffmpeg.
const ffmpegVideo = require("./video/ffmpeg.ts");

/**
 * Decode an animated image (GIF, animated WebP, APNG) into a
 * sequence of RGBA frames. Static images decode as a single-frame
 * array (so callers can use one path for either kind).
 *
 * Returns { frames: [{data, durationMs}], width, height }. Frame
 * timing is taken from the container (uniform fps for v1; per-
 * frame variable timing is a follow-up that needs ffprobe
 * -show_frames).
 *
 * Routes through ffmpeg — throws "install ffmpeg" if missing.
 */
async function decodeFrames(
  bytes: Uint8Array,
): Promise<{ frames: { data: Uint8Array; durationMs: number }[]; width: number; height: number }> {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("parabun:image.decodeFrames: expected Uint8Array");
  }
  // Pull per-frame timing in parallel with the RGBA stream — the
  // ffprobe call is cheap and surfaces variable per-frame durations
  // for animated WebPs / GIFs that ffmpeg's "average fps" hides.
  // Falls back to uniform-from-fps for rows where ffprobe doesn't
  // report a duration (some demuxers leave it N/A).
  const [stream, perFrameTimings] = await Promise.all([
    ffmpegVideo.decode(bytes),
    ffmpegVideo.frameDurationsMs(bytes).catch(() => [] as number[]),
  ]);
  const fallbackMs = stream.fps > 0 ? Math.round(1000 / stream.fps) : 100;
  const frames: { data: Uint8Array; durationMs: number }[] = [];
  try {
    let idx = 0;
    for await (const f of stream.frames()) {
      const reported = perFrameTimings[idx] ?? 0;
      frames.push({ data: f.data, durationMs: reported > 0 ? reported : fallbackMs });
      idx++;
    }
  } finally {
    await stream.close();
  }
  return { frames, width: stream.width, height: stream.height };
}

function decode(bytes: Uint8Array): DecodedImage {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("parabun:image.decode: expected Uint8Array");
  }
  // AVIF dispatch — magic byte sniff before the native codec, since
  // the C++ side only knows JPEG/PNG/WebP. The avif submodule lazy-
  // dlopens libavif and throws a useful "install libavif" error if
  // the system doesn't have it.
  if (avifMod.isAvif(bytes)) {
    const out = avifMod.decode(bytes);
    return { data: out.data, width: out.width, height: out.height, channels: 4, format: "avif" };
  }
  return native.decode(bytes);
}

function encode(img: DecodedImage, opts: EncodeOptions): Uint8Array {
  if (typeof img !== "object" || img === null) {
    throw new TypeError("parabun:image.encode: img must be the object returned from decode()");
  }
  if (typeof opts !== "object" || opts === null || typeof opts.format !== "string") {
    throw new TypeError('parabun:image.encode: opts must be { format: "jpeg" | "png" | "webp" | "avif", quality? }');
  }
  if (opts.format === "avif") {
    // AVIF expects 4-channel RGBA input. Synth a 4-channel buffer
    // from a 3-channel source by inserting opaque alpha — same
    // convention as the native PNG path uses for 3-channel inputs.
    let rgba: Uint8Array;
    if (img.channels === 4) {
      rgba = img.data;
    } else if (img.channels === 3) {
      const n = img.width * img.height;
      rgba = new Uint8Array(n * 4);
      for (let i = 0; i < n; i++) {
        rgba[i * 4] = img.data[i * 3];
        rgba[i * 4 + 1] = img.data[i * 3 + 1];
        rgba[i * 4 + 2] = img.data[i * 3 + 2];
        rgba[i * 4 + 3] = 255;
      }
    } else {
      throw new RangeError(`parabun:image AVIF encode: unsupported channels=${img.channels} (need 3 or 4)`);
    }
    return avifMod.encode(rgba, img.width, img.height, {
      quality: opts.quality,
      lossless: opts.lossless,
    });
  }
  return native.encode(img, opts);
}

function resize(img: DecodedImage, opts: ResizeOptions): DecodedImage {
  if (typeof img !== "object" || img === null) {
    throw new TypeError("parabun:image.resize: img must be the object returned from decode()");
  }
  if (typeof opts !== "object" || opts === null) {
    throw new TypeError("parabun:image.resize: opts must be { width, height }");
  }
  return native.resize(img, opts);
}

type BoxBlurOptions = {
  /** Box-blur radius in pixels. 0 = passthrough. */
  radius: number;
};

// Box blur via summed-area tables. Speed is independent of radius —
// the kernel is O(W·H) regardless of how big the radius is, while
// Sharp's `.blur(sigma)` and our own `image.blur` scale linearly with
// radius. For radius ≥ 5 this beats Sharp dominantly; the trade-off
// is uniform-weighted box averaging, not a true Gaussian (visually
// similar for soft-blur effects, not appropriate for unsharp-mask
// or feature-preserving work).
//
// RGBA only in v1. The native kernel uses u32 SATs which can overflow
// on uniform-luminance images larger than ~16384²; realistic photo
// content has 2× more headroom.
function boxBlur(img: DecodedImage, opts: BoxBlurOptions): DecodedImage {
  if (typeof img !== "object" || img === null) {
    throw new TypeError("parabun:image.boxBlur: img must be the object returned from decode()");
  }
  if (typeof opts !== "object" || opts === null) {
    throw new TypeError("parabun:image.boxBlur: opts must be { radius }");
  }
  return native.boxBlur(img, opts);
}

function blur(img: DecodedImage, opts: BlurOptions): DecodedImage {
  if (typeof img !== "object" || img === null) {
    throw new TypeError("parabun:image.blur: img must be the object returned from decode()");
  }
  if (typeof opts !== "object" || opts === null) {
    throw new TypeError("parabun:image.blur: opts must be { radius }");
  }
  if (opts.gpu === true) {
    return blurGpu(img, opts.radius);
  }
  return native.blur(img, opts);
}

// GPU blur dispatch path. Calls parabun:gpu's fused single-launch
// `imageBlurRGBA` kernel that handles uint8 RGBA → uint8 RGBA in one
// CUDA / Metal pass. Per-channel deinterleave is done on-device, so
// the JS layer only ships the packed bytes — no JS-side loop over
// pixels.
//
// Falls through to the native CPU blur in two cases:
//  1) Active backend has no GPU implementation (CPU backend, or CUDA
//     without NVRTC) — `gpu.imageBlurRGBA` returns null.
//  2) Image isn't 4-channel RGBA. Only RGBA is wired through the GPU
//     today; 1- and 3-channel inputs use the optimized CPU SIMD path.
function blurGpu(img: DecodedImage, radius: number): DecodedImage {
  if (!Number.isInteger(radius) || radius < 0 || radius > 100) {
    throw new RangeError(`parabun:image.blur: radius must be in [0, 100]; got ${radius}`);
  }
  if (img.channels !== 4) {
    return native.blur(img, { radius });
  }
  if (radius === 0) {
    return {
      data: new Uint8Array(img.data),
      width: img.width,
      height: img.height,
      channels: img.channels,
      format: img.format,
    };
  }
  const gpu = require("./gpu.ts");
  const out = gpu.imageBlurRGBA(img.data, img.width, img.height, radius);
  if (out === null) {
    return native.blur(img, { radius });
  }
  return { data: out, width: img.width, height: img.height, channels: 4, format: img.format };
}

function sharpen(img: DecodedImage, opts?: SharpenOptions): DecodedImage {
  if (typeof img !== "object" || img === null) {
    throw new TypeError("parabun:image.sharpen: img must be the object returned from decode()");
  }
  return native.sharpen(img, opts ?? {});
}

function edgeDetect(img: DecodedImage): DecodedImage {
  if (typeof img !== "object" || img === null) {
    throw new TypeError("parabun:image.edgeDetect: img must be the object returned from decode()");
  }
  return native.edgeDetect(img);
}

function rotate(img: DecodedImage, opts: RotateOptions): DecodedImage {
  if (typeof img !== "object" || img === null) {
    throw new TypeError("parabun:image.rotate: img must be the object returned from decode()");
  }
  if (typeof opts !== "object" || opts === null) {
    throw new TypeError("parabun:image.rotate: opts must be { degrees }");
  }
  return native.rotate(img, opts);
}

function flip(img: DecodedImage, opts: FlipOptions): DecodedImage {
  if (typeof img !== "object" || img === null) {
    throw new TypeError("parabun:image.flip: img must be the object returned from decode()");
  }
  if (typeof opts !== "object" || opts === null) {
    throw new TypeError("parabun:image.flip: opts must be { axis }");
  }
  return native.flip(img, opts);
}

function crop(img: DecodedImage, opts: CropOptions): DecodedImage {
  if (typeof img !== "object" || img === null) {
    throw new TypeError("parabun:image.crop: img must be the object returned from decode()");
  }
  if (typeof opts !== "object" || opts === null) {
    throw new TypeError("parabun:image.crop: opts must be { x, y, width, height }");
  }
  return native.crop(img, opts);
}

function toGrayscale(img: DecodedImage): DecodedImage {
  if (typeof img !== "object" || img === null) {
    throw new TypeError("parabun:image.toGrayscale: img must be the object returned from decode()");
  }
  return native.toGrayscale(img);
}

function adjust(img: DecodedImage, opts?: AdjustOptions): DecodedImage {
  if (typeof img !== "object" || img === null) {
    throw new TypeError("parabun:image.adjust: img must be the object returned from decode()");
  }
  return native.adjust(img, opts ?? {});
}

/**
 * Pure hue rotation in degrees. Implemented via a YIQ-derived 3×3 RGB
 * rotation matrix (precomputed once per call) — preserves luma and
 * saturation, just rotates the chrominance angle. 360° is a no-op.
 *
 *   const out = image.hueShift(img, 180); // colors → complements
 */
function hueShift(img: DecodedImage, degrees: number): DecodedImage {
  if (typeof img !== "object" || img === null) {
    throw new TypeError("parabun:image.hueShift: img must be the object returned from decode()");
  }
  if (typeof degrees !== "number" || !Number.isFinite(degrees)) {
    throw new TypeError("parabun:image.hueShift: degrees must be a finite number");
  }
  return native.hueShift(img, degrees);
}

function histogram(img: DecodedImage): Uint32Array[] {
  if (typeof img !== "object" || img === null) {
    throw new TypeError("parabun:image.histogram: img must be the object returned from decode()");
  }
  return native.histogram(img);
}

function composite(base: DecodedImage, overlay: DecodedImage, opts?: CompositeOptions): DecodedImage {
  if (typeof base !== "object" || base === null) {
    throw new TypeError("parabun:image.composite: base must be the object returned from decode()");
  }
  if (typeof overlay !== "object" || overlay === null) {
    throw new TypeError("parabun:image.composite: overlay must be the object returned from decode()");
  }
  return native.composite(base, overlay, opts ?? {});
}

function invert(img: DecodedImage): DecodedImage {
  if (typeof img !== "object" || img === null) {
    throw new TypeError("parabun:image.invert: img must be the object returned from decode()");
  }
  return native.invert(img);
}

function threshold(img: DecodedImage, opts?: ThresholdOptions): DecodedImage {
  if (typeof img !== "object" || img === null) {
    throw new TypeError("parabun:image.threshold: img must be the object returned from decode()");
  }
  return native.threshold(img, opts ?? {});
}

// ─── Pipeline (chained, fused decode → transforms → encode) ──────────────
// The big end-to-end perf win. Each chained method just records an op
// descriptor; no actual work happens until `.toBytes()` is called. At
// that point the C++ side runs the entire flow in a single call —
// decode once, ping-pong intermediate pixel buffers across all
// transforms, encode once. No JS round-trips, no redundant
// materialization between ops.
//
//   const out = image.pipeline(bytes)
//     .resize({ width: 800, height: 600 })
//     .blur({ radius: 5 })
//     .toBytes({ format: "jpeg", quality: 85 });
//
// On the bench cases the chained pipeline closes the end-to-end
// gap with Sharp / libvips: their lazy graph shares buffers across
// decode → transform → encode, ours now does the same in C++.

type PipelineOp =
  | { kind: "resize"; width: number; height: number; kernel?: "bilinear" | "lanczos" }
  | { kind: "blur"; radius: number }
  | { kind: "boxBlur"; radius: number }
  | { kind: "sharpen"; radius?: number; amount?: number }
  | { kind: "rotate"; degrees: 90 | 180 | 270 }
  | { kind: "flip"; axis: "horizontal" | "vertical" }
  | { kind: "crop"; x: number; y: number; width: number; height: number }
  | { kind: "adjust"; brightness?: number; contrast?: number; saturation?: number }
  | { kind: "invert" }
  | { kind: "threshold"; value?: number }
  | { kind: "toGrayscale" };

type EncodeOutOptions = {
  format: ImageFormat;
  quality?: number;
  lossless?: boolean;
};

class Pipeline {
  #bytes: Uint8Array;
  #ops: PipelineOp[];

  constructor(bytes: Uint8Array) {
    if (!(bytes instanceof Uint8Array)) {
      throw new TypeError("parabun:image.pipeline: input must be a Uint8Array");
    }
    this.#bytes = bytes;
    this.#ops = [];
  }

  resize(opts: ResizeOptions): this {
    this.#ops.push({ kind: "resize", width: opts.width, height: opts.height, kernel: opts.kernel });
    return this;
  }
  blur(opts: BlurOptions): this {
    this.#ops.push({ kind: "blur", radius: opts.radius });
    return this;
  }
  boxBlur(opts: BoxBlurOptions): this {
    this.#ops.push({ kind: "boxBlur", radius: opts.radius });
    return this;
  }
  sharpen(opts?: SharpenOptions): this {
    this.#ops.push({ kind: "sharpen", radius: opts?.radius, amount: opts?.amount });
    return this;
  }
  rotate(opts: RotateOptions): this {
    this.#ops.push({ kind: "rotate", degrees: opts.degrees });
    return this;
  }
  flip(opts: FlipOptions): this {
    this.#ops.push({ kind: "flip", axis: opts.axis });
    return this;
  }
  crop(opts: CropOptions): this {
    this.#ops.push({ kind: "crop", x: opts.x, y: opts.y, width: opts.width, height: opts.height });
    return this;
  }
  adjust(opts: AdjustOptions): this {
    this.#ops.push({
      kind: "adjust",
      brightness: opts.brightness,
      contrast: opts.contrast,
      saturation: opts.saturation,
    });
    return this;
  }
  invert(): this {
    this.#ops.push({ kind: "invert" });
    return this;
  }
  threshold(opts?: ThresholdOptions): this {
    this.#ops.push({ kind: "threshold", value: opts?.value });
    return this;
  }
  toGrayscale(): this {
    this.#ops.push({ kind: "toGrayscale" });
    return this;
  }

  /** Materialize the pipeline. Returns the encoded bytes. */
  toBytes(opts: EncodeOutOptions): Uint8Array {
    if (typeof opts !== "object" || opts === null || typeof opts.format !== "string") {
      throw new TypeError("parabun:image.pipeline.toBytes: opts must be { format, quality?, lossless? }");
    }
    return native.runPipeline(this.#bytes, this.#ops, opts);
  }
}

function pipeline(bytes: Uint8Array): Pipeline {
  return new Pipeline(bytes);
}

export default {
  decode,
  decodeFrames,
  encode,
  resize,
  blur,
  boxBlur,
  sharpen,
  edgeDetect,
  rotate,
  flip,
  crop,
  toGrayscale,
  adjust,
  hueShift,
  histogram,
  composite,
  invert,
  threshold,
  pipeline,
  Pipeline,
};
