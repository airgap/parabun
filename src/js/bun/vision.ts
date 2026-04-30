// Hardcoded module "para:vision"
//
// Tier 2 orchestration module — composes a camera frame iterator (para:camera
// or any AsyncIterable<RawFrame>) into a decoded-RGBA frame stream with
// optional motion detection, plus pluggable detector / OCR engine surfaces.
//
//   import camera from "para:camera";
//   import image  from "para:image";
//   import vision from "para:vision";
//
//   await using cam = await camera.open("/dev/video0", {
//     format: "mjpg", width: 1280, height: 720,
//   });
//
//   // Decoded RGBA frame stream
//   for await (const frame of vision.frames(cam.frames(), {
//     decodeMjpg: image.decode,
//   })) {
//     // frame: { rgba, width, height, timestampMs, sequence }
//   }
//
//   // Motion-flagged stream — yields every input frame with a motionScore
//   for await (const m of vision.detectMotion(vision.frames(...), { sensitivity: 0.02 })) {
//     if (m.moving) console.log(`motion: ${(m.motionScore * 100).toFixed(1)}% at ${m.frame.timestampMs}`);
//   }
//
// What ships today:
//   - `frames()` — decode any RawFrame stream to packed RGBA8 (one frame per
//      input frame), independent of camera format. Caller injects the JPEG
//      decoder for "mjpg"; YUYV / NV12 / RGB24 use the BT.601 / pad path
//      from para:camera.toRgba (wired here so vision doesn't cross-builtin
//      import).
//   - `detectMotion()` — frame-diff motion estimator with a downsampled
//      luma comparison + temporal smoothing. Pure JS, no detector model.
//
// What doesn't ship yet:
//   - `detect()` — object detection (YOLO / SSD / RT-DETR class). Requires
//      ONNX runtime as a vendored dep.
//   - `recognize()` — OCR. Requires Tesseract / EasyOCR-class engine.
//   - `track()` — multi-object tracker (DeepSORT / ByteTrack). Builds on
//      detect().

const signalsMod = require("./signals.ts");

// Structural Signal types — keep this module agnostic of para:signals's
// class hierarchy. Same shape as audio.ts / camera.ts / speech.ts / llm.ts.
type Signal<T> = {
  get(): T;
  peek(): T;
  subscribe(cb: (v: T) => void): () => void;
};
type WritableSignal<T> = Signal<T> & { set(v: T): void };

// ─── Types ─────────────────────────────────────────────────────────────────

type RawPixelFormat = "yuyv" | "mjpg" | "nv12" | "rgb24";

type RawFrame = {
  data: Uint8Array;
  width: number;
  height: number;
  format: RawPixelFormat;
  timestampMs: number;
  sequence: number;
};

type RgbaFrame = {
  /** Packed RGBA8, length = width × height × 4. */
  rgba: Uint8Array;
  width: number;
  height: number;
  /** Source timestamp from the input frame. */
  timestampMs: number;
  /** Source sequence number. */
  sequence: number;
};

type FramesOptions = {
  /**
   * Caller-injected JPEG decoder used for "mjpg" frames. Required if your
   * camera emits MJPEG. Hand `image.decode` from para:image:
   *   import image from "para:image";
   *   vision.frames(cam.frames(), { decodeMjpg: image.decode })
   * Cross-builtin imports between bun:* modules aren't supported, so
   * dependency injection lives at the user's call site.
   */
  decodeMjpg?: (bytes: Uint8Array) => {
    data: Uint8Array;
    width: number;
    height: number;
    channels: number;
  };
  /** Drop frames so the output rate doesn't exceed this. Default: no limit. */
  maxFps?: number;
};

type MotionFrame = {
  frame: RgbaFrame;
  /** Fraction of luma-changed pixels in [0, 1]. */
  motionScore: number;
  /** True when motionScore > sensitivity. */
  moving: boolean;
};

type MotionOptions = {
  /** Per-pixel luma delta threshold (0-255 scale). Default 16. */
  pixelThreshold?: number;
  /** Frame-level fraction-of-changed-pixels above which moving=true. Default 0.02 (2%). */
  sensitivity?: number;
  /**
   * Downsample factor before luma diff. 1 = full-res, 4 = quarter-res-each-axis
   * (1/16th the work). Smooths out sensor noise; default 4.
   */
  downsample?: number;
  /**
   * Exponential smoothing on motionScore over time. 0 = no smoothing, 1 =
   * frozen. Default 0.3 (mild smoothing — kills single-frame noise spikes).
   */
  smoothing?: number;
};

// ─── frames() — decode any camera stream to RGBA ───────────────────────────

async function* frames(stream: AsyncIterable<RawFrame>, opts: FramesOptions = {}): AsyncIterableIterator<RgbaFrame> {
  const maxFps = opts.maxFps;
  const minFrameMs = maxFps != null ? 1000 / maxFps : 0;
  let lastEmittedMs = -Infinity;

  for await (const f of stream) {
    if (minFrameMs > 0 && f.timestampMs - lastEmittedMs < minFrameMs) continue;

    let rgba: Uint8Array;
    if (f.format === "rgb24") {
      rgba = rgb24ToRgba(f.data);
    } else if (f.format === "yuyv") {
      rgba = yuyvToRgba(f.data, f.width, f.height);
    } else if (f.format === "nv12") {
      rgba = nv12ToRgba(f.data, f.width, f.height);
    } else if (f.format === "mjpg") {
      const decode = opts.decodeMjpg;
      if (!decode) {
        throw new Error(
          'para:vision.frames: "mjpg" frames need an MJPEG decoder. Pass `decodeMjpg: image.decode` from para:image.',
        );
      }
      const decoded = decode(f.data);
      if (decoded.channels === 4) {
        rgba = decoded.data;
      } else {
        rgba = rgb24ToRgba(decoded.data);
      }
    } else {
      throw new Error(`para:vision.frames: unsupported format "${(f as RawFrame).format}"`);
    }

    yield {
      rgba,
      width: f.width,
      height: f.height,
      timestampMs: f.timestampMs,
      sequence: f.sequence,
    };
    lastEmittedMs = f.timestampMs;
  }
}

// ─── detectMotion() — frame-diff motion estimator ─────────────────────────
//
// Reactive surface (LYK-742/762): the returned iterator carries `detected`
// and `score` signals so consumers can wire `effect(() => ...)` blocks
// against motion state without iterating the full stream. Same pattern
// as `speech.listen()` — the generator object is decorated via
// Object.assign with the read-only signal accessors, the for-await-of
// usage is unchanged.
interface MotionStream extends AsyncIterableIterator<MotionFrame> {
  /** True while smoothed motion score is above the configured sensitivity. */
  readonly detected: Signal<boolean>;
  /** Most recent smoothed motion score (fraction of changed luma pixels, [0, 1]). */
  readonly score: Signal<number>;
  /**
   * Drain the iterator in the background so the `detected` / `score`
   * signals auto-fill without a hand-rolled `for await` IIFE. Returns a
   * disposer that breaks the loop. Idempotent — calling `.run()` twice
   * returns the same disposer.
   *
   * Use when you only want the reactive view; if you also want each
   * `MotionFrame` value, iterate explicitly instead.
   */
  run(): () => void;
}

function detectMotion(stream: AsyncIterable<RgbaFrame>, opts: MotionOptions = {}): MotionStream {
  const sigDetected = signalsMod.signal(false) as WritableSignal<boolean>;
  const sigScore = signalsMod.signal(0) as WritableSignal<number>;
  const gen = detectMotionGenerator(stream, opts, sigDetected, sigScore);
  let runDisposer: (() => void) | null = null;
  const run = () => {
    if (runDisposer) return runDisposer;
    let stopped = false;
    (async () => {
      try {
        for await (const _ of gen) {
          if (stopped) break;
          void _;
        }
      } catch {
        // Iterator threw / cancelled — signals' finally block already ran.
      }
    })();
    runDisposer = () => {
      if (stopped) return;
      stopped = true;
      // Calling .return() on the generator triggers its finally block,
      // which resets the signals to inert state.
      try {
        gen.return?.(undefined);
      } catch {}
    };
    return runDisposer;
  };
  return Object.assign(gen, {
    detected: sigDetected as Signal<boolean>,
    score: sigScore as Signal<number>,
    run,
  });
}

async function* detectMotionGenerator(
  stream: AsyncIterable<RgbaFrame>,
  opts: MotionOptions,
  sigDetected: WritableSignal<boolean>,
  sigScore: WritableSignal<number>,
): AsyncIterableIterator<MotionFrame> {
  const pixelThreshold = opts.pixelThreshold ?? 16;
  const sensitivity = opts.sensitivity ?? 0.02;
  const downsample = Math.max(1, opts.downsample ?? 4);
  const smoothing = Math.min(1, Math.max(0, opts.smoothing ?? 0.3));

  let prevLuma: Uint8Array | null = null;
  let prevW = 0;
  let prevH = 0;
  let smoothed = 0;
  const pixelThresh = pixelThreshold;
  // Rate-limit `score` signal updates to ~10 Hz so a 30 fps camera doesn't
  // re-fire effects on every frame. `detected` updates only on transitions
  // — those are rare enough to skip the throttle.
  let lastScoreEmitMs = 0;

  try {
    for await (const frame of stream) {
      const lumaW = Math.max(1, Math.floor(frame.width / downsample));
      const lumaH = Math.max(1, Math.floor(frame.height / downsample));
      const luma = downsampledLuma(frame.rgba, frame.width, frame.height, lumaW, lumaH);

      let rawScore = 0;
      if (prevLuma && prevW === lumaW && prevH === lumaH) {
        let changed = 0;
        for (let i = 0; i < luma.length; i++) {
          const d = luma[i] - prevLuma[i];
          if (d > pixelThresh || d < -pixelThresh) changed++;
        }
        rawScore = changed / luma.length;
      }
      smoothed = smoothing * smoothed + (1 - smoothing) * rawScore;
      prevLuma = luma;
      prevW = lumaW;
      prevH = lumaH;

      const moving = smoothed > sensitivity;

      // Boolean transition — fire immediately. `detected` cares about edges,
      // not every-frame flutter.
      if (moving !== sigDetected.peek()) sigDetected.set(moving);

      // Score is continuous — throttle to 10 Hz, but always emit the very
      // first measurement so subscribers don't sit on the constructor's 0
      // for an extra tick. Using performance.now() (not frame.timestampMs)
      // keeps the throttle on a single wall-clock reference; frame
      // timestamps can come from synthetic streams or kernel V4L2 epochs
      // that don't share a clock.
      const now = performance.now();
      if (lastScoreEmitMs === 0 || now - lastScoreEmitMs >= 100) {
        sigScore.set(smoothed);
        lastScoreEmitMs = now;
      }

      yield {
        frame,
        motionScore: smoothed,
        moving,
      };
    }
  } finally {
    // Stream ended (or consumer broke). Pin the signals to a clean
    // inert state so an effect block doesn't keep showing stale motion.
    if (sigDetected.peek()) sigDetected.set(false);
    if (sigScore.peek() !== 0) sigScore.set(0);
  }
}

// ─── Detector / OCR engine surface (stubs) ─────────────────────────────────

type DetectOptions = {
  /** Engine identifier. "yolo" / "ssd" / "rtdetr" planned. */
  engine: "yolo" | "ssd" | "rtdetr";
  /** Path to an ONNX (or future GGUF) detector model. */
  model: string;
  /** Score threshold for accepting a detection. Default 0.5. */
  scoreThreshold?: number;
};

type RecognizeOptions = {
  /** Engine identifier. */
  engine: "tesseract" | "easyocr";
  /** Path to model files. */
  model: string;
};

type Detection = {
  label: string;
  score: number;
  /** Bounding box in source-frame pixel coordinates. */
  bbox: { x: number; y: number; width: number; height: number };
};

const DETECT_NOT_IMPL =
  "para:vision.detect: object-detection engines (YOLO / SSD / RT-DETR) require ONNX runtime as a " +
  "vendored dep — not yet wired. Tracked in the roadmap as para:vision (Tier 2).";

const RECOGNIZE_NOT_IMPL =
  "para:vision.recognize: OCR engines (Tesseract / EasyOCR-class) need a vendored OCR runtime — " +
  "not yet wired. Tracked in the roadmap as para:vision (Tier 2).";

async function detect(_frame: RgbaFrame, _opts: DetectOptions): Promise<Detection[]> {
  throw new Error(DETECT_NOT_IMPL);
}

async function recognize(_frame: RgbaFrame, _opts: RecognizeOptions): Promise<string> {
  throw new Error(RECOGNIZE_NOT_IMPL);
}

// ─── Pixel helpers (mirrored from para:camera.toRgba) ───────────────────────

function rgb24ToRgba(src: Uint8Array): Uint8Array {
  const n = src.length / 3;
  const out = new Uint8Array(n * 4);
  for (let i = 0, j = 0; i < src.length; i += 3, j += 4) {
    out[j] = src[i];
    out[j + 1] = src[i + 1];
    out[j + 2] = src[i + 2];
    out[j + 3] = 255;
  }
  return out;
}

function yuyvToRgba(src: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h * 4);
  let s = 0,
    d = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x += 2) {
      const y0 = src[s] - 16;
      const u = src[s + 1] - 128;
      const y1 = src[s + 2] - 16;
      const v = src[s + 3] - 128;
      s += 4;
      const r0 = (298 * y0 + 409 * v + 128) >> 8;
      const g0 = (298 * y0 - 100 * u - 208 * v + 128) >> 8;
      const b0 = (298 * y0 + 516 * u + 128) >> 8;
      const r1 = (298 * y1 + 409 * v + 128) >> 8;
      const g1 = (298 * y1 - 100 * u - 208 * v + 128) >> 8;
      const b1 = (298 * y1 + 516 * u + 128) >> 8;
      out[d] = clip255(r0);
      out[d + 1] = clip255(g0);
      out[d + 2] = clip255(b0);
      out[d + 3] = 255;
      out[d + 4] = clip255(r1);
      out[d + 5] = clip255(g1);
      out[d + 6] = clip255(b1);
      out[d + 7] = 255;
      d += 8;
    }
  }
  return out;
}

function nv12ToRgba(src: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h * 4);
  const ySize = w * h;
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const yIdx = row * w + col;
      const uvRow = row >> 1;
      const uvCol = col & ~1;
      const uvIdx = ySize + uvRow * w + uvCol;
      const yv = src[yIdx] - 16;
      const u = src[uvIdx] - 128;
      const v = src[uvIdx + 1] - 128;
      const r = (298 * yv + 409 * v + 128) >> 8;
      const g = (298 * yv - 100 * u - 208 * v + 128) >> 8;
      const b = (298 * yv + 516 * u + 128) >> 8;
      const d = yIdx << 2;
      out[d] = clip255(r);
      out[d + 1] = clip255(g);
      out[d + 2] = clip255(b);
      out[d + 3] = 255;
    }
  }
  return out;
}

function clip255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function downsampledLuma(rgba: Uint8Array, w: number, h: number, dw: number, dh: number): Uint8Array {
  const out = new Uint8Array(dw * dh);
  const sx = w / dw;
  const sy = h / dh;
  for (let y = 0; y < dh; y++) {
    const srcY = Math.min(h - 1, Math.floor(y * sy));
    for (let x = 0; x < dw; x++) {
      const srcX = Math.min(w - 1, Math.floor(x * sx));
      const i = (srcY * w + srcX) * 4;
      // BT.601 luma — same coefficients used elsewhere in the stack.
      out[y * dw + x] = (76 * rgba[i] + 150 * rgba[i + 1] + 30 * rgba[i + 2]) >> 8;
    }
  }
  return out;
}

export default {
  frames,
  detectMotion,
  detect,
  recognize,
};
