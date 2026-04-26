// Hardcoded module "bun:camera"
//
// Parabun: zero-dependency camera capture for the embedded edge runtime.
// Targets V4L2 on Linux (Pi 5 / Jetson / generic Linux), AVFoundation on
// macOS, and Media Foundation on Windows. The headline use case is a
// camera → bun:image → bun:llm → bun:audio pipeline running on a single
// board with no daemon, no Python, no FFmpeg subprocess.
//
//   import camera from "bun:camera";
//
//   // Enumerate cameras
//   const devs = await camera.devices();
//   //   [ { path: "/dev/video0", name: "C920 HD Pro Webcam", driver: "uvcvideo",
//   //       caps: ["video_capture", "streaming"] }, ... ]
//
//   // Open and capture
//   await using cam = await camera.open(devs[0].path, {
//     width: 1280,
//     height: 720,
//     fps: 30,
//     format: "yuyv",   // or "mjpg" | "nv12" | "rgb24"
//   });
//
//   // Pull frames as an async iterator
//   for await (const frame of cam.frames()) {
//     // frame: { data: Uint8Array, width, height, format, timestampMs, sequence }
//     // For "mjpg" you can hand .data straight to image.decode() — it's a JPEG.
//     // For "yuyv" / "nv12" call camera.toRgba(frame) to get a planar RGBA buffer
//     // ready for bun:image / bun:gpu.
//     const rgba = camera.toRgba(frame);
//     break;
//   }
//
// Frames are mmap'd from kernel buffers on Linux — no copy on capture, only
// when toRgba() is called. The default queue depth is 4 buffers; bump
// `bufferCount` if you're doing heavy per-frame work and dropping frames.
//
// Status: scaffolded. Native V4L2 binding lands together with the Pi 5
// hardware bring-up.

const NOT_IMPLEMENTED_MSG = "bun:camera is scaffolded — V4L2 capture lands with Pi 5 / Jetson hardware bring-up";

function todo(): never {
  throw new Error(NOT_IMPLEMENTED_MSG);
}

// ─── Types ─────────────────────────────────────────────────────────────────

/**
 * Pixel format on the wire from the camera. Almost all USB UVC webcams
 * negotiate one of these:
 *   - "yuyv"  — 4:2:2 packed (Y U Y V), 16 bpp. Universal but bandwidth-heavy.
 *   - "mjpg"  — Motion JPEG, every frame is an independent JPEG. Ideal for
 *               1080p+ over USB 2.0 because the camera does the compression.
 *   - "nv12"  — 4:2:0 semi-planar (Y plane + interleaved UV plane), 12 bpp.
 *               What hardware encoders consume on Jetson / Pi.
 *   - "rgb24" — 8-bit RGB, no chroma subsampling. Rare on webcams but
 *               common on industrial cameras.
 */
type PixelFormat = "yuyv" | "mjpg" | "nv12" | "rgb24";

type DeviceInfo = {
  /** Filesystem path (Linux) or stable identifier (macOS/Windows). */
  path: string;
  /** Human-readable device name. */
  name: string;
  /** Driver name on Linux (e.g. "uvcvideo"). Empty string on other platforms. */
  driver: string;
  /** Capability flags reported by the OS. */
  caps: string[];
};

type FormatDescriptor = {
  format: PixelFormat;
  width: number;
  height: number;
  /** Frame rate as numerator / denominator (e.g. 30 fps == { num: 30, den: 1 }). */
  fps: { num: number; den: number };
};

type OpenOptions = {
  /** Capture width in pixels. Camera picks the closest supported size. */
  width: number;
  /** Capture height in pixels. Camera picks the closest supported size. */
  height: number;
  /** Frame rate. Camera picks the closest supported rate. Default 30. */
  fps?: number;
  /** Pixel format. Default "mjpg" if supported, else "yuyv". */
  format?: PixelFormat;
  /**
   * Number of kernel-mapped buffers in the capture queue. More buffers means
   * the app can lag without dropping frames at the cost of memory. Default 4.
   */
  bufferCount?: number;
};

type Frame = {
  /**
   * Pixel data. For "mjpg" this is a complete JPEG bitstream. For "yuyv",
   * "nv12", "rgb24" this is the raw packed/planar pixel data. The buffer
   * is owned by the camera — once the next frame is requested it may be
   * recycled. Copy out (`new Uint8Array(frame.data)`) if you need to hold
   * onto it past the iterator step.
   */
  data: Uint8Array;
  width: number;
  height: number;
  format: PixelFormat;
  /** Monotonic timestamp from the kernel, in milliseconds. */
  timestampMs: number;
  /** Frame sequence number; gaps indicate dropped frames upstream. */
  sequence: number;
};

interface Camera extends AsyncDisposable {
  /** Currently negotiated format. */
  readonly format: FormatDescriptor;
  /** Capture an async iterator of frames. Stops when the iterator is closed or close() is called. */
  frames(): AsyncIterableIterator<Frame>;
  /** One-shot: capture the next frame, returning a copy (not a borrowed view). */
  grab(): Promise<Frame>;
  /** Stop streaming and release the device. Idempotent. */
  close(): Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
}

// ─── Public API stubs ──────────────────────────────────────────────────────

function devices(): Promise<DeviceInfo[]> {
  todo();
}

function formats(_path: string): Promise<FormatDescriptor[]> {
  todo();
}

function open(_path: string, _opts: OpenOptions): Promise<Camera> {
  todo();
}

/**
 * Convert a captured frame into RGBA8 planar bytes (length = width × height × 4).
 * This is where the YUV → RGB matrix lives; "mjpg" frames are decoded via
 * the bun:image JPEG path. CPU implementation by default; pass `{ gpu: true }`
 * to dispatch through bun:gpu when the buffer is large enough to be worth it.
 */
function toRgba(_frame: Frame, _opts?: { gpu?: boolean }): Uint8Array {
  todo();
}

export default {
  devices,
  formats,
  open,
  toRgba,
};
