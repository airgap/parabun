// Hardcoded module "bun:camera"
//
// Parabun: zero-dependency camera capture for the embedded edge runtime.
// V4L2 on Linux today; AVFoundation (macOS) and Media Foundation (Windows)
// follow on top of the same JS surface.
//
//   import camera from "bun:camera";
//
//   // Enumerate cameras
//   const devs = await camera.devices();
//   //   [ { path: "/dev/video0", name: "C920 HD Pro Webcam",
//   //       driver: "uvcvideo", caps: ["video_capture", "streaming"] } ]
//
//   // What does this camera support?
//   const fmts = await camera.formats(devs[0].path);
//   //   [ { format: "yuyv", width: 1280, height: 720, fpsNum: 30, fpsDen: 1 }, ... ]
//
//   // Open and capture
//   await using cam = await camera.open(devs[0].path, {
//     format: "mjpg",
//     width: 1280,
//     height: 720,
//   });
//   for await (const frame of cam.frames()) {
//     // frame: { data, width, height, format, timestampMs, sequence }
//     // For "mjpg" you can hand .data straight to image.decode().
//     break;
//   }
//
// Frames are mmap'd from kernel buffers; .data is a plain Uint8Array that
// contains a copy of the most-recent frame. The kernel buffer is re-queued
// before captureNext returns, so the next .frames() step blocks on the
// next genuinely new frame.

const native = $cpp("parabun_camera.cpp", "createParabunCamera");

// ─── Types ─────────────────────────────────────────────────────────────────

/**
 * Pixel format on the wire from the camera. Almost all USB UVC webcams
 * negotiate one of these:
 *   - "yuyv"  — 4:2:2 packed (Y U Y V), 16 bpp. Universal but bandwidth-heavy.
 *   - "mjpg"  — Motion JPEG, every frame is an independent JPEG. Ideal for
 *               1080p+ over USB 2.0 because the camera does the compression.
 *   - "nv12"  — 4:2:0 semi-planar (Y plane + interleaved UV plane), 12 bpp.
 *               What hardware encoders consume on Jetson / Pi.
 *   - "rgb24" — 8-bit RGB, no chroma subsampling. Rare on webcams.
 */
type PixelFormat = "yuyv" | "mjpg" | "nv12" | "rgb24";

type DeviceInfo = {
  path: string;
  name: string;
  driver: string;
  caps: string[];
};

type FormatDescriptor = {
  format: PixelFormat;
  width: number;
  height: number;
  fpsNum: number;
  fpsDen: number;
};

type OpenOptions = {
  width: number;
  height: number;
  /** Pixel format. Default "mjpg". */
  format?: PixelFormat;
  /** Kernel buffer queue depth. Default 4. */
  bufferCount?: number;
};

type Frame = {
  data: Uint8Array;
  width: number;
  height: number;
  format: PixelFormat;
  timestampMs: number;
  sequence: number;
};

interface Camera extends AsyncDisposable {
  readonly width: number;
  readonly height: number;
  readonly format: PixelFormat;
  /** Capture frames until close() is called. */
  frames(): AsyncIterableIterator<Frame>;
  /** Capture exactly one frame and return it. */
  grab(): Promise<Frame>;
  /** Stop streaming and release the device. Idempotent. */
  close(): Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
}

// FinalizationRegistry to back-stop forgotten close() calls. If a Camera
// drops without close(), the registry frees the V4L2 session at GC time
// rather than leaking the fd + mmap'd kernel buffers.
const cameraRegistry = new FinalizationRegistry<bigint>(handle => {
  if (handle !== 0n) native.closeDevice(handle);
});

// ─── Public API ────────────────────────────────────────────────────────────

async function devices(): Promise<DeviceInfo[]> {
  return native.enumerateDevices();
}

async function formats(path: string): Promise<FormatDescriptor[]> {
  if (typeof path !== "string") {
    throw $ERR_INVALID_ARG_TYPE("path", "string", path);
  }
  return native.queryFormats(path);
}

class CameraImpl implements Camera {
  #handle: bigint;
  width: number;
  height: number;
  format: PixelFormat;

  constructor(handle: bigint, width: number, height: number, format: PixelFormat) {
    this.#handle = handle;
    this.width = width;
    this.height = height;
    this.format = format;
    cameraRegistry.register(this, handle, this);
  }

  async grab(): Promise<Frame> {
    if (this.#handle === 0n) {
      throw new Error("camera is closed");
    }
    // captureNext is synchronous + blocking on a select(); wrap in a
    // Promise so the JS event loop sees an await point. A worker-thread
    // backing follows once we have real pipeline workloads.
    return native.captureNext(this.#handle, 5);
  }

  async *frames(): AsyncIterableIterator<Frame> {
    while (this.#handle !== 0n) {
      yield native.captureNext(this.#handle, 5);
    }
  }

  async close(): Promise<void> {
    const h = this.#handle;
    this.#handle = 0n;
    if (h !== 0n) {
      cameraRegistry.unregister(this);
      native.closeDevice(h);
    }
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.close();
  }
}

async function open(path: string, opts: OpenOptions): Promise<Camera> {
  if (typeof path !== "string") {
    throw $ERR_INVALID_ARG_TYPE("path", "string", path);
  }
  if (!opts || typeof opts !== "object") {
    throw $ERR_INVALID_ARG_TYPE("opts", "object", opts);
  }
  const format: PixelFormat = opts.format ?? "mjpg";
  const width = opts.width | 0;
  const height = opts.height | 0;
  const bufferCount = (opts.bufferCount ?? 4) | 0;
  if (width <= 0 || height <= 0) {
    throw new RangeError("camera.open: width and height must be > 0");
  }

  const handle: bigint = native.openDevice(path, format, width, height, bufferCount);
  return new CameraImpl(handle, width, height, format);
}

/**
 * Convert a captured frame into RGBA8 (length = width × height × 4). Routed
 * through bun:image for "mjpg" (JPEG decode) and a scalar YUV→RGB matrix
 * for "yuyv" / "nv12". A native fast path lands once the kernel-residency
 * tail of the pipeline is shaped.
 */
function toRgba(frame: Frame, _opts?: { gpu?: boolean }): Uint8Array {
  if (frame.format === "rgb24") {
    // RGB24 → RGBA: insert a 0xFF alpha byte every 3 bytes. Scalar for
    // now; SIMD path lives in parabun_image_codecs and can be reused.
    const w = frame.width,
      h = frame.height;
    const out = new Uint8Array(w * h * 4);
    const src = frame.data;
    for (let i = 0, j = 0; i < src.length; i += 3, j += 4) {
      out[j] = src[i];
      out[j + 1] = src[i + 1];
      out[j + 2] = src[i + 2];
      out[j + 3] = 255;
    }
    return out;
  }
  if (frame.format === "yuyv") {
    // YUYV → RGBA. Two source pixels per 4-byte block (Y0 U Y1 V) → two
    // RGBA pixels. Scalar reference; bun:image's SIMD shuffle path can
    // be plugged in once it's externally callable.
    const w = frame.width,
      h = frame.height;
    const out = new Uint8Array(w * h * 4);
    const src = frame.data;
    let s = 0,
      d = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x += 2) {
        const y0 = src[s] - 16;
        const u = src[s + 1] - 128;
        const y1 = src[s + 2] - 16;
        const v = src[s + 3] - 128;
        s += 4;
        // BT.601 limited-range matrix.
        const r0 = (298 * y0 + 409 * v + 128) >> 8;
        const g0 = (298 * y0 - 100 * u - 208 * v + 128) >> 8;
        const b0 = (298 * y0 + 516 * u + 128) >> 8;
        const r1 = (298 * y1 + 409 * v + 128) >> 8;
        const g1 = (298 * y1 - 100 * u - 208 * v + 128) >> 8;
        const b1 = (298 * y1 + 516 * u + 128) >> 8;
        out[d] = r0 < 0 ? 0 : r0 > 255 ? 255 : r0;
        out[d + 1] = g0 < 0 ? 0 : g0 > 255 ? 255 : g0;
        out[d + 2] = b0 < 0 ? 0 : b0 > 255 ? 255 : b0;
        out[d + 3] = 255;
        out[d + 4] = r1 < 0 ? 0 : r1 > 255 ? 255 : r1;
        out[d + 5] = g1 < 0 ? 0 : g1 > 255 ? 255 : g1;
        out[d + 6] = b1 < 0 ? 0 : b1 > 255 ? 255 : b1;
        out[d + 7] = 255;
        d += 8;
      }
    }
    return out;
  }
  if (frame.format === "mjpg") {
    // MJPEG frames are complete JPEG bitstreams — decode via bun:image:
    //   import image from "bun:image";
    //   const decoded = await image.decode(frame.data);
    // We don't import bun:image here because cross-module imports between
    // bun:* builtins aren't supported by the internal bundler.
    throw new Error(
      'bun:camera.toRgba: for "mjpg" frames, decode the JPEG with bun:image: `await image.decode(frame.data)`',
    );
  }
  if (frame.format === "nv12") {
    // NV12: width*height Y plane followed by (width/2 * height/2) interleaved UV.
    const w = frame.width,
      h = frame.height;
    const out = new Uint8Array(w * h * 4);
    const src = frame.data;
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
        out[d] = r < 0 ? 0 : r > 255 ? 255 : r;
        out[d + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
        out[d + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
        out[d + 3] = 255;
      }
    }
    return out;
  }
  throw new Error(`bun:camera: toRgba does not yet support format "${frame.format}"`);
}

export default {
  devices,
  formats,
  open,
  toRgba,
};
