// Hardcoded module "bun:video"
//
// Parabun: video file decode + encode for the embedded edge runtime.
// Pairs with bun:camera (live capture) and bun:image (still frames):
//
//   import camera from "bun:camera";
//   import video  from "bun:video";
//   import image  from "bun:image";
//
//   await using cam = await camera.open("/dev/video0", {
//     format: "mjpg", width: 1280, height: 720,
//   });
//   await using enc = await video.encode({
//     codec: "h264", width: 1280, height: 720, fps: 30,
//     container: "mp4", path: "out.mp4",
//   });
//   for await (const f of cam.frames()) {
//     await enc.pushFrame(f);
//     if (enc.duration > 5000) break;
//   }
//   await enc.finalize();
//
// Codec coverage targets (in priority order):
//   - decode: H.264, H.265/HEVC, VP9, AV1, MJPEG (the last via bun:image)
//   - encode: H.264 (libx264), HEVC, VP9, AV1
//   - container: MP4 (read+write), Matroska/WebM (read+write), MPEG-TS (read)
//
// On Jetson: NVENC / NVDEC paths surface through the same API once the CUDA
// pipeline-residency layer is in place — caller passes `{ accel: "auto" }`
// and gets hardware-decode-to-CUDA-buffer with no host bounce.
//
// On Pi 5: V4L2 hardware decode paths (M2M) likewise surface through the
// same API — Pi 5 has h264_v4l2m2m for H.264 decode at 1080p.
//
// Status: scaffolded — JS surface contracted. Native libavcodec / V4L2 M2M /
// NVDEC backings land alongside the Pi 5 / Jetson bring-up.

const NOT_IMPLEMENTED_MSG = "bun:video is scaffolded — libavcodec native binding lands with hardware bring-up";

function todo(): never {
  throw new Error(NOT_IMPLEMENTED_MSG);
}

// ─── Types ─────────────────────────────────────────────────────────────────

/**
 * Video codec selector. "auto" lets the decoder sniff the container; for
 * encoders a concrete codec must be picked. Software backends are always
 * available; hardware acceleration is opportunistic — see `accel` below.
 */
type Codec = "h264" | "h265" | "hevc" | "vp8" | "vp9" | "av1" | "mjpeg" | "auto";

/**
 * Container format. "auto" sniffs from magic bytes for decode; encoders
 * must be told explicitly. WebM is a Matroska subset.
 */
type Container = "mp4" | "mkv" | "webm" | "ts" | "auto";

/**
 * Hardware acceleration policy.
 *   - "auto": prefer GPU (CUDA/V4L2 M2M/VideoToolbox) when available, fall
 *             back to CPU (libavcodec software). Default.
 *   - "gpu":  require GPU; throw if no backend is available.
 *   - "cpu":  force software path even when GPU is present.
 */
type AccelMode = "auto" | "gpu" | "cpu";

/**
 * Pixel format of a decoded frame's `.data`. Decoders default to "rgba"
 * (zero ambiguity for downstream image / ML use), but the native pipeline
 * can keep frames in YUV when chained with an encoder that wants YUV input.
 */
type DecodedPixelFormat = "rgba" | "rgb24" | "yuv420p" | "nv12";

type ProbeInfo = {
  container: Container;
  /** Streams in container order. Most files have one video + zero or one audio. */
  streams: Array<
    | {
        kind: "video";
        index: number;
        codec: Codec;
        width: number;
        height: number;
        fpsNum: number;
        fpsDen: number;
        durationMs: number;
      }
    | {
        kind: "audio";
        index: number;
        codec: string; // "aac", "opus", "mp3", ...
        sampleRate: number;
        channels: number;
        durationMs: number;
      }
  >;
};

type DecodeOptions = {
  /** Pixel format of decoded frames. Default "rgba". */
  pixelFormat?: DecodedPixelFormat;
  /** Hardware acceleration policy. Default "auto". */
  accel?: AccelMode;
  /** Stream index to decode. Default: first video stream. */
  streamIndex?: number;
  /** Drop frames whose presentation timestamp is below this (ms). Default 0. */
  startMs?: number;
  /** Stop decoding when presentation timestamp exceeds this (ms). Default Infinity. */
  endMs?: number;
};

type DecodedFrame = {
  data: Uint8Array;
  width: number;
  height: number;
  pixelFormat: DecodedPixelFormat;
  /** Presentation timestamp from the container, in milliseconds. */
  ptsMs: number;
  /** Decode-order frame index — distinct from PTS for B-frames. */
  index: number;
  /** True if this frame is a keyframe (I-frame). */
  keyframe: boolean;
};

interface VideoDecoder extends AsyncDisposable {
  readonly width: number;
  readonly height: number;
  readonly codec: Codec;
  readonly durationMs: number;
  /** Decode every frame as an async iterator. */
  frames(): AsyncIterableIterator<DecodedFrame>;
  /** Seek to a presentation timestamp (ms). Lands on the nearest keyframe. */
  seek(ptsMs: number): Promise<void>;
  close(): Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
}

type EncodeOptions = {
  codec: Codec;
  container: Container;
  width: number;
  height: number;
  fps: number;
  /** Average bitrate in bps. Default: 0.1 bpp × width × height × fps (a sane web target). */
  bitrate?: number;
  /** Encoder preset: "fast" / "medium" / "slow". Default "medium". */
  preset?: "fast" | "medium" | "slow";
  /** Hardware acceleration policy. Default "auto". */
  accel?: AccelMode;
  /** Output file path. If omitted, encode() returns the bytes once finalized. */
  path?: string;
};

interface VideoEncoder extends AsyncDisposable {
  /** Bytes written so far (after .finalize() this is the final size). */
  readonly bytesWritten: number;
  /** Stream duration in ms based on frames pushed and configured fps. */
  readonly duration: number;
  /**
   * Push a frame for encoding. Accepts a bun:camera Frame ({ data, format }),
   * a bun:image DecodedImage ({ data, channels, ... }), or a raw object with
   * { data: Uint8Array, width, height, pixelFormat }.
   */
  pushFrame(
    frame:
      | { data: Uint8Array; width: number; height: number; format: string }
      | { data: Uint8Array; width: number; height: number; channels: number }
      | { data: Uint8Array; width: number; height: number; pixelFormat: DecodedPixelFormat },
  ): Promise<void>;
  /**
   * Finalize the stream. With `{ path }`: writes trailer to disk and resolves.
   * Without `{ path }`: returns the encoded byte stream.
   */
  finalize(): Promise<Uint8Array | void>;
  close(): Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Probe a container without decoding. Reads only enough bytes to enumerate
 * streams + read headers — typically the first ~64 KB.
 */
function probe(_bytes: Uint8Array | ArrayBuffer): Promise<ProbeInfo> {
  todo();
}

/**
 * Open a video for decoding. `bytes` may be the entire file (small clips)
 * or a path string for streaming reads. Returns a Decoder whose `.frames()`
 * yields decoded frames as an async iterator.
 */
function decode(_bytes: Uint8Array | ArrayBuffer | string, _opts?: DecodeOptions): Promise<VideoDecoder> {
  todo();
}

/**
 * Open an encoder. With `{ path }` set, frames are streamed to disk as
 * they're pushed. Without, frames are buffered and the byte stream is
 * returned by `finalize()`.
 */
function encode(_opts: EncodeOptions): Promise<VideoEncoder> {
  todo();
}

/**
 * Convenience: decode + collect every frame into an array. Use only for
 * short clips where holding every frame in memory is acceptable.
 */
async function decodeAll(bytes: Uint8Array | ArrayBuffer | string, opts?: DecodeOptions): Promise<DecodedFrame[]> {
  const dec = await decode(bytes, opts);
  const out: DecodedFrame[] = [];
  try {
    for await (const f of dec.frames()) out.push(f);
  } finally {
    await dec.close();
  }
  return out;
}

export default {
  probe,
  decode,
  encode,
  decodeAll,
};
