// Hardcoded module "parabun:vision"
//
// Tier 2 orchestration module — composes a camera frame iterator (parabun:camera
// or any AsyncIterable<RawFrame>) into a decoded-RGBA frame stream with
// optional motion detection, plus pluggable detector / OCR engine surfaces.
//
//   import camera from "parabun:camera";
//   import image  from "parabun:image";
//   import vision from "parabun:vision";
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
//      from parabun:camera.toRgba (wired here so vision doesn't cross-builtin
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
   * camera emits MJPEG. Hand `image.decode` from parabun:image:
   *   import image from "parabun:image";
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

/**
 * One contiguous moving region in source-frame coordinates. Output of
 * connected-components labeling on the per-frame motion mask, scaled
 * back up from downsampled space. A frame with two unrelated movers
 * (someone walking left, fan spinning right) yields two regions.
 */
type MotionRegion = {
  /** Top-left x in source-frame pixels. */
  x: number;
  /** Top-left y in source-frame pixels. */
  y: number;
  /** Bounding-box width in source-frame pixels. */
  width: number;
  /** Bounding-box height in source-frame pixels. */
  height: number;
  /**
   * Component pixel count in the *downsampled* space (the units the CC
   * pass actually counted). Multiply by `downsample²` for an estimate
   * of source-frame pixel coverage.
   */
  pixels: number;
};

type MotionFrame = {
  frame: RgbaFrame;
  /** Fraction of luma-changed pixels in [0, 1]. */
  motionScore: number;
  /** True when motionScore > sensitivity. */
  moving: boolean;
  /**
   * Bounding boxes for each contiguous changed-pixel cluster, in
   * source-frame coordinates. Populated only when `opts.regions` is
   * enabled (otherwise undefined to keep the no-regions fast path
   * allocation-free).
   */
  regions?: MotionRegion[];
};

type RegionsOptions = {
  /**
   * Minimum component size (in *downsampled* pixels) to be reported as
   * a region. Smaller blobs are dropped as sensor noise. Default 4 —
   * at the default downsample of 4× this corresponds to a single
   * source-frame 8×8 area.
   */
  minPixels?: number;
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
  /**
   * Per-frame connected-components labeling on the motion mask. When
   * enabled, each yielded `MotionFrame` carries a `regions` array of
   * bounding boxes for distinct moving clusters (4-connected, two-pass
   * union-find on the downsampled mask, scaled back to source coords).
   *
   * `true` enables with default options; an object overrides the
   * defaults. Off by default — the CC pass adds a per-frame Map
   * allocation and one extra mask scan.
   */
  regions?: boolean | RegionsOptions;
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
          'parabun:vision.frames: "mjpg" frames need an MJPEG decoder. Pass `decodeMjpg: image.decode` from parabun:image.',
        );
      }
      const decoded = decode(f.data);
      if (decoded.channels === 4) {
        rgba = decoded.data;
      } else {
        rgba = rgb24ToRgba(decoded.data);
      }
    } else {
      throw new Error(`parabun:vision.frames: unsupported format "${(f as RawFrame).format}"`);
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
interface MotionStream extends AsyncIterableIterator<MotionFrame>, AsyncDisposable, Disposable {
  /** True while smoothed motion score is above the configured sensitivity. */
  readonly detected: Signal<boolean>;
  /**
   * True from detectMotion() return until `dispose()` /
   * `[Symbol.dispose]` / the source stream completing. Distinct from
   * `detected` (which is "motion right now"); pair with `use(fn)`
   * for effects that should auto-tear-down when motion tracking
   * stops.
   */
  readonly alive: Signal<boolean>;
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
  /**
   * Run an effect bound to this motion stream's lifetime. Behaves like
   * `signals.effect(fn)` but is automatically disposed when the
   * stream is disposed or completes.
   */
  use(fn: () => void | (() => void)): () => void;
  /** Stop the iterator + signals. Idempotent. */
  dispose(): void;
  [Symbol.dispose](): void;
  [Symbol.asyncDispose](): Promise<void>;
}

function detectMotion(stream: AsyncIterable<RgbaFrame>, opts: MotionOptions = {}): MotionStream {
  const sigDetected = signalsMod.signal(false) as WritableSignal<boolean>;
  const sigAlive = signalsMod.signal(true) as WritableSignal<boolean>;
  const sigScore = signalsMod.signal(0) as WritableSignal<number>;
  const gen = detectMotionGenerator(stream, opts, sigDetected, sigScore);
  const boundEffects: Array<() => void> = [];
  let runDisposer: (() => void) | null = null;
  let disposed = false;
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
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    try {
      gen.return?.(undefined);
    } catch {}
    if (sigAlive.peek()) {
      sigAlive.set(false);
      while (boundEffects.length > 0) {
        const stop = boundEffects.pop()!;
        try {
          stop();
        } catch {}
      }
    }
  };
  return Object.assign(gen, {
    detected: sigDetected as Signal<boolean>,
    alive: sigAlive as Signal<boolean>,
    score: sigScore as Signal<number>,
    run,
    use(fn: () => void | (() => void)): () => void {
      const stop = signalsMod.effect(fn);
      boundEffects.push(stop);
      return stop;
    },
    dispose,
    [Symbol.dispose]: dispose,
    [Symbol.asyncDispose]: () => {
      dispose();
      return Promise.resolve();
    },
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
  const regionsEnabled = opts.regions != null && opts.regions !== false;
  const regionsOpts: RegionsOptions =
    typeof opts.regions === "object" && opts.regions !== null ? (opts.regions as RegionsOptions) : {};
  const regionsMinPixels = Math.max(1, regionsOpts.minPixels ?? 4);

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
      // If regions are enabled we need the per-pixel mask, not just a
      // running count, so the CC pass has something to label. Build it
      // lazily — most frames have no prevLuma yet (first frame) or no
      // motion (skip the alloc entirely below).
      let mask: Uint8Array | null = null;
      if (prevLuma && prevW === lumaW && prevH === lumaH) {
        let changed = 0;
        if (regionsEnabled) {
          mask = new Uint8Array(luma.length);
          for (let i = 0; i < luma.length; i++) {
            const d = luma[i] - prevLuma[i];
            if (d > pixelThresh || d < -pixelThresh) {
              mask[i] = 1;
              changed++;
            }
          }
        } else {
          for (let i = 0; i < luma.length; i++) {
            const d = luma[i] - prevLuma[i];
            if (d > pixelThresh || d < -pixelThresh) changed++;
          }
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

      // CC labeling on the mask. Skip when no motion was seen this
      // frame (no mask, or zero changed pixels) — there's nothing to
      // label, save the allocation. `regions` stays an empty array so
      // consumers can `if (m.regions?.length) ...` without nullish dance.
      let regions: MotionRegion[] | undefined;
      if (regionsEnabled) {
        regions = mask ? labelMotionRegions(mask, lumaW, lumaH, downsample, regionsMinPixels) : [];
      }

      yield {
        frame,
        motionScore: smoothed,
        moving,
        regions,
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
  /**
   * Detection engine. Today: `"yolo"` is wired (YOLOv8/YOLOv11 ONNX
   * models, COCO 80-class default). `"ssd"` and `"rtdetr"` are reserved.
   */
  engine: "yolo" | "ssd" | "rtdetr";
  /** Path to the ONNX model (e.g. yolov8n.onnx). */
  model: string;
  /** Per-detection score threshold in [0, 1]. Default 0.25 (YOLO default). */
  scoreThreshold?: number;
  /** IoU threshold for NMS in [0, 1]. Default 0.45. */
  iouThreshold?: number;
  /**
   * Override the class label list. Default: 80-class COCO. Length must
   * match the model's classifier output dimension (override for custom-
   * trained models).
   */
  classes?: string[];
  /**
   * Square input edge for the letterbox preprocess. Default 640 (the
   * standard YOLOv8 export). Set to 320 / 416 / 1280 for the smaller /
   * larger model variants.
   */
  inputSize?: number;
};

type RecognizeOptions = {
  /**
   * OCR engine. Today: `"tesseract"` is wired (libtesseract.so.5 via
   * FFI; system-installed). `"easyocr"` is reserved — pending an ONNX
   * runtime vendor add.
   */
  engine: "tesseract" | "easyocr";
  /**
   * Tesseract language code(s), e.g. `"eng"` or `"eng+spa"`. Default
   * `"eng"`. Each language needs its corresponding `*.traineddata` file
   * present in the tessdata directory (`apt install tesseract-ocr-spa`,
   * etc.).
   */
  language?: string;
  /**
   * Override the tessdata directory. Default: lets Tesseract probe
   * `$TESSDATA_PREFIX` or its compiled-in default
   * (`/usr/share/tesseract-ocr/5/tessdata` on Debian-class Linux).
   */
  datapath?: string;
  /**
   * Drop words/regions below this confidence in [0, 1]. Default 0.5 —
   * filters Tesseract's noise floor without throwing away mid-quality
   * reads.
   */
  minConfidence?: number;
};

type Detection = {
  label: string;
  score: number;
  /** Bounding box in source-frame pixel coordinates. */
  bbox: { x: number; y: number; width: number; height: number };
};

const tesseractMod = require("./vision/tesseract.ts");
const onnxMod = require("./vision/onnx.ts");
const yoloMod = require("./vision/yolo.ts");
const trackMod = require("./vision/track.ts");

// Run object detection on one frame. Engine dispatch — `"yolo"` is
// shipped today (YOLOv8/YOLOv11 ONNX models via vision/yolo.ts on top
// of vision/onnx.ts). `"ssd"` and `"rtdetr"` are reserved — they fit
// the same Session pipeline with model-specific decode + NMS, follow-
// ups when a real model is wired.
async function detect(frame: RgbaFrame, opts: DetectOptions): Promise<Detection[]> {
  if (opts.engine === "yolo") {
    return yoloMod.detect(frame, {
      model: opts.model,
      scoreThreshold: opts.scoreThreshold,
      iouThreshold: opts.iouThreshold,
      classes: opts.classes,
      inputSize: opts.inputSize,
    });
  }
  if (opts.engine === "ssd" || opts.engine === "rtdetr") {
    throw new Error(
      `parabun:vision.detect: ${opts.engine} engine is not wired yet. ` +
        `Use { engine: "yolo" } today; ssd / rtdetr decode + NMS land as follow-ups.`,
    );
  }
  throw new Error(`parabun:vision.detect: unsupported engine "${(opts as DetectOptions).engine}"`);
}

// Run OCR on one frame. Engine dispatch — tesseract is shipped today
// (libtesseract.so.5 via FFI, system-installed). easyocr is reserved for
// a future ONNX-runtime path. Returns one Detection per recognized word
// with its confidence and bounding box, in source-frame pixel coords.
//
// Sync work runs on the JS thread (Tesseract has no async API). Wrapped
// in an async function to keep the public contract stable when an
// off-thread variant lands.
async function recognize(frame: RgbaFrame, opts: RecognizeOptions): Promise<Detection[]> {
  if (opts.engine === "tesseract") {
    return tesseractMod.recognize(frame, {
      language: opts.language,
      datapath: opts.datapath,
      minConfidence: opts.minConfidence,
    });
  }
  if (opts.engine === "easyocr") {
    throw new Error(
      "parabun:vision.recognize: easyocr engine is not wired yet (needs ONNX runtime as a system " +
        'FFI binding). Use { engine: "tesseract" } today.',
    );
  }
  throw new Error(`parabun:vision.recognize: unsupported engine "${(opts as RecognizeOptions).engine}"`);
}

// ─── Pixel helpers (mirrored from parabun:camera.toRgba) ───────────────────────

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

// Two-pass connected-components labeling on the binary motion mask
// (4-connected). First pass assigns provisional labels and unions
// equivalent ones via union-find; second pass collapses to roots and
// accumulates per-component bounding boxes + pixel counts. Returns
// regions that meet `minPixels`, scaled from the downsampled mask
// space back to source-frame coordinates.
//
// O(n) for n = mask.length given path-compressed UF (effectively
// linear in practice). Allocates one Int32Array(n), one parent[]
// growing to ~max-label, and a per-root Map.
function labelMotionRegions(
  mask: Uint8Array,
  w: number,
  h: number,
  downsample: number,
  minPixels: number,
): MotionRegion[] {
  // labels[0] = sentinel for unlabeled. parent[0] same — never read.
  const labels = new Int32Array(mask.length);
  const parent: number[] = [0];
  let nextLabel = 1;

  // Pass 1: forward sweep. Look at the up + left already-labeled
  // neighbors. New label only when both neighbors are 0; otherwise
  // adopt one and (if both differ) union them.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;
      const upL = y > 0 ? labels[i - w] : 0;
      const lfL = x > 0 ? labels[i - 1] : 0;
      let lab: number;
      if (upL && lfL) {
        lab = upL < lfL ? upL : lfL;
        unionLabels(parent, upL, lfL);
      } else if (upL) {
        lab = upL;
      } else if (lfL) {
        lab = lfL;
      } else {
        lab = nextLabel++;
        parent.push(lab);
      }
      labels[i] = lab;
    }
  }

  // Pass 2: per-pixel root lookup → bbox accumulation.
  const bboxes = new Map<number, { minX: number; minY: number; maxX: number; maxY: number; count: number }>();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const lab = labels[i];
      if (!lab) continue;
      const root = findRoot(parent, lab);
      let b = bboxes.get(root);
      if (!b) {
        bboxes.set(root, { minX: x, minY: y, maxX: x, maxY: y, count: 1 });
      } else {
        if (x < b.minX) b.minX = x;
        if (y < b.minY) b.minY = y;
        if (x > b.maxX) b.maxX = x;
        if (y > b.maxY) b.maxY = y;
        b.count++;
      }
    }
  }

  const regions: MotionRegion[] = [];
  for (const b of bboxes.values()) {
    if (b.count < minPixels) continue;
    regions.push({
      x: b.minX * downsample,
      y: b.minY * downsample,
      width: (b.maxX - b.minX + 1) * downsample,
      height: (b.maxY - b.minY + 1) * downsample,
      pixels: b.count,
    });
  }
  return regions;
}

function findRoot(parent: number[], x: number): number {
  while (parent[x] !== x) {
    parent[x] = parent[parent[x]]; // path compression — half-path-compaction is enough for this scale
    x = parent[x];
  }
  return x;
}

function unionLabels(parent: number[], a: number, b: number): void {
  const ra = findRoot(parent, a);
  const rb = findRoot(parent, b);
  if (ra === rb) return;
  // Union-by-min-label: the smaller label becomes the root, so labels
  // monotonically point downward and `findRoot` is fast.
  if (ra < rb) parent[rb] = ra;
  else parent[ra] = rb;
}

// Lower-level escape hatch for users with custom ONNX models that don't
// fit the YOLO/SSD/RT-DETR pre/post-processing in vision.detect. Returns
// an onnx Session bound to the given model — `.run({ name: { data,
// shape } })` performs inference, `.dispose()` (or `using`) releases it.
// Same Tesseract-style FFI: requires a system-installed libonnxruntime
// (see /runtime docs for the install paths).
function onnx(modelPath: string) {
  return new onnxMod.Session(modelPath);
}
function onnxIsAvailable(): boolean {
  return onnxMod.isAvailable();
}

export default {
  frames,
  detectMotion,
  detect,
  recognize,
  onnx,
  onnxIsAvailable,
  // YOLO-side primitives exposed for users with custom heads or
  // non-YOLO models. `vision.detect` covers the standard YOLOv8 path;
  // these are the building blocks if you need to mix and match.
  yolo: yoloMod,
  // Multi-frame object tracker. Stateful — instantiate one per stream:
  //   const tk = vision.track();
  //   for await (const frame of cam) {
  //     const dets = await vision.detect(frame, …);
  //     for (const t of tk.step(dets)) console.log(t.id, t.label, t.bbox);
  //   }
  track: trackMod.track,
  Tracker: trackMod.Tracker,
};
