// Hardcoded module "parabun:video"
//
// Parabun: video file decode + encode for the embedded edge runtime.
// Pairs with parabun:camera (live capture) and parabun:image (still frames):
//
//   import camera from "parabun:camera";
//   import video  from "parabun:video";
//   import image  from "parabun:image";
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
//   - decode: H.264, H.265/HEVC, VP9, AV1, MJPEG (the last via parabun:image)
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

const NOT_IMPLEMENTED_MSG = "parabun:video is scaffolded — libavcodec native binding lands with hardware bring-up";

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
  /**
   * Per-frame JPEG decoder. Required for MJPEG-encoded inputs. Pass
   * `image.decode` from `parabun:image` (cross-builtin imports between bun:*
   * modules aren't supported, so the dep is injected here).
   */
  decodeMjpg?: (bytes: Uint8Array) => { data: Uint8Array; width: number; height: number; channels?: number };
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
  /**
   * Per-frame JPEG encoder. Required for the MJPEG codec (the only one
   * unstubbed today). Pass `image.encode` from `parabun:image` (cross-builtin
   * imports between bun:* modules aren't supported, so the dep is injected
   * here). The provided function should encode an `{ data, width, height,
   * channels }` to JPEG bytes.
   */
  encodeJpg?: (
    img: { data: Uint8Array; width: number; height: number; channels: number },
    opts?: { format: "jpeg"; quality?: number },
  ) => Uint8Array;
  /** JPEG quality (0–100). Only used for the MJPEG codec. Default 85. */
  jpegQuality?: number;
};

interface VideoEncoder extends AsyncDisposable {
  /** Bytes written so far (after .finalize() this is the final size). */
  readonly bytesWritten: number;
  /** Stream duration in ms based on frames pushed and configured fps. */
  readonly duration: number;
  /**
   * Push a frame for encoding. Accepts a parabun:camera Frame ({ data, format }),
   * a parabun:image DecodedImage ({ data, channels, ... }), or a raw object with
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

// ─── MP4 / ISOBMFF probe ──────────────────────────────────────────────────
// ISO/IEC 14496-12 box structure:
//   4 bytes size (BE u32)
//   4 bytes type (FourCC)
//   if size == 1: 8 bytes extended size (BE u64)
//   if size == 0: extends to end of file
//   payload follows.
//
// Boxes we walk for probe:
//   moov                     — top-level movie metadata container
//     mvhd                   — movie header (duration, timescale)
//     trak                   — one per track
//       tkhd                 — track header (track id, dimensions for video)
//       mdia                 — media container
//         mdhd               — media header (per-track timescale + duration)
//         hdlr               — handler (track type: "vide" / "soun")
//         minf > stbl > stsd — sample description: codec FourCC + sub-fields
//         minf > stbl > stts — time-to-sample (for fps)

const MP4_VIDEO_CODEC: Record<string, Codec> = {
  avc1: "h264",
  avc3: "h264",
  hev1: "h265",
  hvc1: "h265",
  vp08: "vp8",
  vp09: "vp9",
  av01: "av1",
  // mp4v is MPEG-4 Visual (Part 2). Real MJPEG-in-MP4 uses the "jpeg"
  // sample entry. Some legacy ffmpeg outputs put MJPEG into "mp4v" with
  // no esds box — we don't try to disambiguate; users with those files
  // can fall back to ffprobe + a re-mux.
  jpeg: "mjpeg",
};

const MP4_AUDIO_CODEC: Record<string, string> = {
  mp4a: "aac",
  Opus: "opus",
  ".mp3": "mp3",
  alac: "alac",
  ac_3: "ac3",
  ec_3: "eac3",
};

function readU32BE(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function readU64BE(bytes: Uint8Array, offset: number): bigint {
  const hi = readU32BE(bytes, offset);
  const lo = readU32BE(bytes, offset + 4);
  return (BigInt(hi) << 32n) | BigInt(lo);
}

function readU16BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function fourcc(bytes: Uint8Array, offset: number): string {
  // Box type FourCCs are typically printable ASCII. Use the raw byte values
  // for the lookup (Opus is mixed case; ".mp3" has a literal period).
  return (
    String.fromCharCode(bytes[offset]) +
    String.fromCharCode(bytes[offset + 1]) +
    String.fromCharCode(bytes[offset + 2]) +
    String.fromCharCode(bytes[offset + 3])
  );
}

interface Mp4Box {
  type: string;
  start: number; // payload start (after the 8 / 16-byte header)
  end: number; // exclusive
}

// Iterator over child boxes within [start, end). Skips the per-box header.
function* iterMp4Boxes(bytes: Uint8Array, start: number, end: number): Iterable<Mp4Box> {
  let pos = start;
  while (pos + 8 <= end) {
    let size = readU32BE(bytes, pos);
    const type = fourcc(bytes, pos + 4);
    let headerLen = 8;
    if (size === 1) {
      // Extended 64-bit size.
      const ext = readU64BE(bytes, pos + 8);
      size = Number(ext);
      headerLen = 16;
    } else if (size === 0) {
      // Extends to end of container.
      size = end - pos;
    }
    if (size < headerLen || pos + size > end) return;
    yield { type, start: pos + headerLen, end: pos + size };
    pos += size;
  }
}

function findMp4Box(bytes: Uint8Array, parentStart: number, parentEnd: number, target: string): Mp4Box | null {
  for (const b of iterMp4Boxes(bytes, parentStart, parentEnd)) {
    if (b.type === target) return b;
  }
  return null;
}

interface Mp4MediaHeader {
  timescale: number;
  duration: bigint;
}

function parseMp4Mdhd(bytes: Uint8Array, b: Mp4Box): Mp4MediaHeader {
  // version(1) flags(3) ...
  const version = bytes[b.start];
  let p = b.start + 4;
  if (version === 1) {
    p += 16; // creation_time(8) + modification_time(8)
    const timescale = readU32BE(bytes, p);
    p += 4;
    const duration = readU64BE(bytes, p);
    return { timescale, duration };
  }
  p += 8; // creation_time(4) + modification_time(4)
  const timescale = readU32BE(bytes, p);
  p += 4;
  const duration = BigInt(readU32BE(bytes, p));
  return { timescale, duration };
}

function parseMp4Hdlr(bytes: Uint8Array, b: Mp4Box): string {
  // version(1) flags(3) pre_defined(4) handler_type(4)
  return fourcc(bytes, b.start + 8);
}

function parseMp4Tkhd(bytes: Uint8Array, b: Mp4Box): { width: number; height: number } {
  const version = bytes[b.start];
  // Skip flags(3), creation/modification, track_id, reserved, duration, reserved×2,
  // layer, alternate_group, volume, reserved, matrix(36), width, height.
  const fixedHeaderLen = version === 1 ? 92 : 80; // up to start of width/height pair
  const wRaw = readU32BE(bytes, b.start + fixedHeaderLen);
  const hRaw = readU32BE(bytes, b.start + fixedHeaderLen + 4);
  return { width: wRaw / 65536, height: hRaw / 65536 };
}

function parseMp4Stsd(bytes: Uint8Array, b: Mp4Box): { codecFourCC: string; width: number; height: number } | null {
  // version(1) flags(3) entry_count(4)
  const entryCount = readU32BE(bytes, b.start + 4);
  if (entryCount === 0) return null;
  // First entry layout: size(4) format(4) reserved(6) data_reference_index(2)
  // For visual entries, after the header: pre_defined(2) reserved(2) pre_defined(12)
  // width(2) height(2) horizresolution(4) vertresolution(4) reserved(4) frame_count(2)
  // compressorname(32) depth(2) pre_defined(2)
  const entryStart = b.start + 8;
  const entrySize = readU32BE(bytes, entryStart);
  void entrySize;
  const codecFourCC = fourcc(bytes, entryStart + 4);
  // Visual entries: width/height at offset 32..36 within the entry body.
  // Audio entries don't carry width/height — we only call this for video tracks.
  const width = readU16BE(bytes, entryStart + 32);
  const height = readU16BE(bytes, entryStart + 34);
  return { codecFourCC, width, height };
}

interface Mp4SttsEntry {
  count: number;
  delta: number;
}
function parseMp4Stts(bytes: Uint8Array, b: Mp4Box): Mp4SttsEntry[] {
  // version(1) flags(3) entry_count(4)
  const entryCount = readU32BE(bytes, b.start + 4);
  const entries: Mp4SttsEntry[] = [];
  for (let i = 0; i < entryCount; i++) {
    const off = b.start + 8 + i * 8;
    entries.push({ count: readU32BE(bytes, off), delta: readU32BE(bytes, off + 4) });
  }
  return entries;
}

function parseMp4AudioStsd(
  bytes: Uint8Array,
  b: Mp4Box,
): { codecFourCC: string; sampleRate: number; channels: number } | null {
  const entryCount = readU32BE(bytes, b.start + 4);
  if (entryCount === 0) return null;
  const entryStart = b.start + 8;
  const codecFourCC = fourcc(bytes, entryStart + 4);
  // Audio entry body: reserved(6) data_reference_index(2) version(2) revision(2)
  // vendor(4) channel_count(2) sample_size(2) compression_id(2) packet_size(2)
  // sample_rate(4 — 16.16 fixed)
  const channels = readU16BE(bytes, entryStart + 24);
  const sampleRateFixed = readU32BE(bytes, entryStart + 32);
  const sampleRate = sampleRateFixed >>> 16; // upper 16 bits = integer Hz
  return { codecFourCC, sampleRate, channels };
}

async function probeMp4(bytes: Uint8Array): Promise<ProbeInfo> {
  // Walk top-level boxes and find moov.
  const moov = findMp4Box(bytes, 0, bytes.length, "moov");
  if (!moov) throw new Error("parabun:video.probe: MP4 has no moov box (truncated or moov-at-end?)");

  // Movie header (mvhd) — fallback timescale when a track's mdhd is missing.
  const mvhd = findMp4Box(bytes, moov.start, moov.end, "mvhd");
  let movieTimescale = 1000;
  let movieDuration = 0n;
  if (mvhd) {
    const m = parseMp4Mdhd(bytes, mvhd); // mvhd has the same prefix layout as mdhd
    movieTimescale = m.timescale;
    movieDuration = m.duration;
  }

  const streams: ProbeInfo["streams"] = [];
  let trackIdx = 0;
  for (const trak of iterMp4Boxes(bytes, moov.start, moov.end)) {
    if (trak.type !== "trak") continue;
    const mdia = findMp4Box(bytes, trak.start, trak.end, "mdia");
    if (!mdia) continue;
    const mdhd = findMp4Box(bytes, mdia.start, mdia.end, "mdhd");
    const hdlr = findMp4Box(bytes, mdia.start, mdia.end, "hdlr");
    const minf = findMp4Box(bytes, mdia.start, mdia.end, "minf");
    if (!mdhd || !hdlr || !minf) continue;
    const stbl = findMp4Box(bytes, minf.start, minf.end, "stbl");
    if (!stbl) continue;
    const stsd = findMp4Box(bytes, stbl.start, stbl.end, "stsd");
    if (!stsd) continue;

    const trackHandler = parseMp4Hdlr(bytes, hdlr);
    const trackTimescale = parseMp4Mdhd(bytes, mdhd).timescale;
    const trackDuration = parseMp4Mdhd(bytes, mdhd).duration;
    const durationMs =
      trackTimescale > 0 ? Number((trackDuration * 1000n) / BigInt(trackTimescale)) : Number(movieDuration);

    if (trackHandler === "vide") {
      const stsdInfo = parseMp4Stsd(bytes, stsd);
      if (!stsdInfo) continue;
      const codec: Codec = MP4_VIDEO_CODEC[stsdInfo.codecFourCC] ?? "auto";

      // Track-header dimensions are 16.16 fixed-point (post display matrix);
      // stsd width/height are u16 raw pixels — prefer those for accuracy.
      let width = stsdInfo.width;
      let height = stsdInfo.height;
      if ((!width || !height) && trak) {
        const tkhd = findMp4Box(bytes, trak.start, trak.end, "tkhd");
        if (tkhd) {
          const dims = parseMp4Tkhd(bytes, tkhd);
          width = Math.round(dims.width);
          height = Math.round(dims.height);
        }
      }

      // FPS from stts: total samples / track duration * timescale.
      let fpsNum = 0;
      let fpsDen = 1;
      const stts = findMp4Box(bytes, stbl.start, stbl.end, "stts");
      if (stts) {
        const entries = parseMp4Stts(bytes, stts);
        let totalSamples = 0;
        let totalDuration = 0;
        for (const e of entries) {
          totalSamples += e.count;
          totalDuration += e.count * e.delta;
        }
        if (totalDuration > 0) {
          // fps = totalSamples / totalDuration * timescale → reduce.
          fpsNum = totalSamples * trackTimescale;
          fpsDen = totalDuration;
          const g = gcd(fpsNum, fpsDen);
          if (g > 0) {
            fpsNum = fpsNum / g;
            fpsDen = fpsDen / g;
          }
        }
      }

      streams.push({
        kind: "video",
        index: trackIdx,
        codec,
        width,
        height,
        fpsNum,
        fpsDen,
        durationMs,
      });
    } else if (trackHandler === "soun") {
      const aud = parseMp4AudioStsd(bytes, stsd);
      if (!aud) continue;
      const codec = MP4_AUDIO_CODEC[aud.codecFourCC] ?? aud.codecFourCC.trim();
      streams.push({
        kind: "audio",
        index: trackIdx,
        codec,
        sampleRate: aud.sampleRate,
        channels: aud.channels,
        durationMs,
      });
    }
    trackIdx++;
  }
  return { container: "mp4", streams };
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b > 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

// ─── Matroska / WebM probe ────────────────────────────────────────────────
// EBML / Matroska is a tree of elements:
//   id  (variable-length integer with a leading marker bit)
//   len (variable-length unsigned integer)
//   payload bytes
//
// IDs we care about, in tree order:
//   0x1A45DFA3 EBML
//   0x18538067 Segment
//     0x1549A966 Info
//       0x2AD7B1   TimecodeScale (ns per timecode tick — default 1_000_000)
//       0x4489     Duration (float, in timecode ticks)
//     0x1654AE6B Tracks
//       0xAE       TrackEntry
//         0x83       TrackType (1=video, 2=audio)
//         0x86       CodecID (string)
//         0xE0       Video
//           0xB0       PixelWidth
//           0xBA       PixelHeight
//         0xE1       Audio
//           0xB5       SamplingFrequency (float)
//           0x9F       Channels
//
// Codec IDs are strings like "V_MPEG4/ISO/AVC" or "A_OPUS".

const MKV_VIDEO_CODEC: Record<string, Codec> = {
  "V_MPEG4/ISO/AVC": "h264",
  "V_MPEGH/ISO/HEVC": "h265",
  V_VP8: "vp8",
  V_VP9: "vp9",
  V_AV1: "av1",
};

const MKV_AUDIO_CODEC: Record<string, string> = {
  A_AAC: "aac",
  A_OPUS: "opus",
  A_VORBIS: "vorbis",
  "A_MPEG/L3": "mp3",
  A_FLAC: "flac",
};

interface EbmlReader {
  bytes: Uint8Array;
  pos: number;
}

function readVarInt(r: EbmlReader, keepMarker: boolean): number {
  // EBML varint: count the leading zero bits in the first byte; count = bytes
  // used (1..8). The marker bit at position (8 - count) is 1; remaining bits
  // of that byte + subsequent bytes give the value.
  const first = r.bytes[r.pos];
  if (first === 0) throw new Error("ebml: invalid leading byte 0");
  let mask = 0x80;
  let length = 1;
  while ((first & mask) === 0) {
    mask >>= 1;
    length++;
    if (length > 8) throw new Error("ebml: varint > 8 bytes");
  }
  let value = keepMarker ? first : first & (mask - 1);
  if (length > 1) {
    for (let i = 1; i < length; i++) {
      value = value * 256 + r.bytes[r.pos + i];
    }
  }
  r.pos += length;
  return value;
}

function readEbmlSize(r: EbmlReader): number {
  return readVarInt(r, false);
}

function readEbmlId(r: EbmlReader): number {
  return readVarInt(r, true);
}

function readEbmlUint(r: EbmlReader, length: number): number {
  let value = 0;
  for (let i = 0; i < length; i++) value = value * 256 + r.bytes[r.pos + i];
  r.pos += length;
  return value;
}

function readEbmlFloat(r: EbmlReader, length: number): number {
  if (length === 4) {
    const v = new DataView(r.bytes.buffer, r.bytes.byteOffset + r.pos, 4).getFloat32(0, false);
    r.pos += 4;
    return v;
  }
  if (length === 8) {
    const v = new DataView(r.bytes.buffer, r.bytes.byteOffset + r.pos, 8).getFloat64(0, false);
    r.pos += 8;
    return v;
  }
  if (length === 0) return 0;
  throw new Error(`ebml: unsupported float length ${length}`);
}

function readEbmlString(r: EbmlReader, length: number): string {
  const bytes = r.bytes.subarray(r.pos, r.pos + length);
  r.pos += length;
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end--;
  return new TextDecoder().decode(bytes.subarray(0, end));
}

// Walk children of an EBML master element in [start, end), invoking `visit`
// with (id, payloadStart, payloadEnd).
function walkEbml(
  bytes: Uint8Array,
  start: number,
  end: number,
  visit: (id: number, pStart: number, pEnd: number) => void,
): void {
  const r: EbmlReader = { bytes, pos: start };
  while (r.pos < end) {
    if (r.pos >= bytes.length) return;
    const id = readEbmlId(r);
    const size = readEbmlSize(r);
    const pStart = r.pos;
    const pEnd = pStart + size;
    if (pEnd > end) {
      // Truncated payload — bail rather than over-read.
      return;
    }
    visit(id, pStart, pEnd);
    r.pos = pEnd;
  }
}

interface MkvTrack {
  trackType: number; // 1 = video, 2 = audio
  codecId: string;
  width: number;
  height: number;
  sampleRate: number;
  channels: number;
}

async function probeMatroska(bytes: Uint8Array): Promise<ProbeInfo> {
  // Walk top-level: EBML header gives us DocType ("matroska" or "webm"),
  // Segment carries the actual content.
  let segStart = -1;
  let segEnd = -1;
  let docType = "matroska";
  walkEbml(bytes, 0, bytes.length, (id, ps, pe) => {
    if (id === 0x1a45dfa3) {
      // EBML header — extract DocType for the container label.
      walkEbml(bytes, ps, pe, (eid, eps, epe) => {
        if (eid === 0x4282) docType = readEbmlString({ bytes, pos: eps }, epe - eps);
      });
    } else if (id === 0x18538067) {
      segStart = ps;
      segEnd = pe;
    }
  });
  if (segStart < 0) throw new Error("parabun:video.probe: no Segment in Matroska");

  // Walk Segment for Info + Tracks.
  let timecodeScale = 1_000_000; // ns per tick — default 1ms tick
  let durationTicks = 0;
  const tracks: MkvTrack[] = [];

  walkEbml(bytes, segStart, segEnd, (id, ps, pe) => {
    if (id === 0x1549a966) {
      // Info
      walkEbml(bytes, ps, pe, (iid, ips, ipe) => {
        if (iid === 0x2ad7b1) {
          timecodeScale = readEbmlUint({ bytes, pos: ips }, ipe - ips);
        } else if (iid === 0x4489) {
          durationTicks = readEbmlFloat({ bytes, pos: ips }, ipe - ips);
        }
      });
    } else if (id === 0x1654ae6b) {
      // Tracks
      walkEbml(bytes, ps, pe, (tid, tps, tpe) => {
        if (tid !== 0xae) return; // only TrackEntry
        const t: MkvTrack = {
          trackType: 0,
          codecId: "",
          width: 0,
          height: 0,
          sampleRate: 0,
          channels: 0,
        };
        walkEbml(bytes, tps, tpe, (eid, eps, epe) => {
          if (eid === 0x83) t.trackType = readEbmlUint({ bytes, pos: eps }, epe - eps);
          else if (eid === 0x86) t.codecId = readEbmlString({ bytes, pos: eps }, epe - eps);
          else if (eid === 0xe0) {
            walkEbml(bytes, eps, epe, (vid, vps, vpe) => {
              if (vid === 0xb0) t.width = readEbmlUint({ bytes, pos: vps }, vpe - vps);
              else if (vid === 0xba) t.height = readEbmlUint({ bytes, pos: vps }, vpe - vps);
            });
          } else if (eid === 0xe1) {
            walkEbml(bytes, eps, epe, (aid, aps, ape) => {
              if (aid === 0xb5) t.sampleRate = readEbmlFloat({ bytes, pos: aps }, ape - aps);
              else if (aid === 0x9f) t.channels = readEbmlUint({ bytes, pos: aps }, ape - aps);
            });
          }
        });
        tracks.push(t);
      });
    }
  });

  const durationMs = durationTicks > 0 ? Math.round((durationTicks * timecodeScale) / 1_000_000) : 0;

  const streams: ProbeInfo["streams"] = [];
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    if (t.trackType === 1) {
      const codec = MKV_VIDEO_CODEC[t.codecId] ?? "auto";
      streams.push({
        kind: "video",
        index: i,
        codec,
        width: t.width,
        height: t.height,
        fpsNum: 0,
        fpsDen: 1,
        durationMs,
      });
    } else if (t.trackType === 2) {
      const codec = MKV_AUDIO_CODEC[t.codecId] ?? t.codecId;
      streams.push({
        kind: "audio",
        index: i,
        codec,
        sampleRate: t.sampleRate,
        channels: t.channels,
        durationMs,
      });
    }
  }
  const container: Container = docType === "webm" ? "webm" : "mkv";
  return { container, streams };
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Probe a container without decoding. Reads MP4 (ISOBMFF) and Matroska
 * (MKV / WebM) headers in pure JS — no libavcodec required. Pixel-decoding
 * still needs the native binding; this is just structured metadata.
 */
async function probe(input: Uint8Array | ArrayBuffer): Promise<ProbeInfo> {
  const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : input;
  if (bytes.length < 8) {
    throw new Error("parabun:video.probe: input too short to identify container");
  }

  // MP4 / ISOBMFF: bytes 4..8 spell "ftyp" (or sometimes "styp", "moov" first).
  // Matroska / WebM: bytes 0..4 are the EBML magic 0x1A 0x45 0xDF 0xA3.
  const isMp4 =
    (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) || // ftyp
    (bytes[4] === 0x73 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) || // styp
    (bytes[4] === 0x6d && bytes[5] === 0x6f && bytes[6] === 0x6f && bytes[7] === 0x76); // moov
  const isMatroska = bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;

  if (isMp4) return probeMp4(bytes);
  if (isMatroska) return probeMatroska(bytes);
  // Fallback: shell out to ffprobe. Handles MOV, AVI, FLV, MPEG-TS,
  // OGG, WMV — anything ffmpeg knows. Throws "install ffmpeg" if
  // the system doesn't have it.
  return probeViaFfprobe(bytes);
}

async function probeViaFfprobe(bytes: Uint8Array): Promise<ProbeInfo> {
  // Direct ffprobe call so we get ALL streams (video + audio) in one
  // shot — the video/ffmpeg.ts probeBytes helper only surfaces v:0
  // since it's tuned for the decoder's needs.
  const tmpPath = await writeTmpForProbe(bytes);
  try {
    const proc = Bun.spawn({
      cmd: ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", tmpPath],
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    if (exitCode !== 0) {
      throw new Error(`parabun:video.probe: ffprobe failed (${exitCode}): ${stderr.trim()}`);
    }
    const data = JSON.parse(stdout);
    const formatName = (data.format?.format_name as string) || "";
    // ffprobe joins alternative names ("matroska,webm"); pick the
    // first that matches a Container we know.
    const formatTokens = formatName.split(",");
    let container: Container = "auto";
    for (const t of formatTokens) {
      if (t === "mp4" || t === "mov" || t === "m4a" || t === "3gp" || t === "3g2" || t === "mj2") {
        container = "mp4";
        break;
      }
      if (t === "matroska") {
        container = "mkv";
        break;
      }
      if (t === "webm") {
        container = "webm";
        break;
      }
      if (t === "mpegts") {
        container = "ts";
        break;
      }
    }
    const streams: ProbeInfo["streams"] = [];
    for (const s of data.streams ?? []) {
      if (s.codec_type === "video") {
        const fpsRational = (s.avg_frame_rate ?? s.r_frame_rate ?? "0/1") as string;
        const [num, den] = fpsRational.split("/").map(Number);
        const dStr = data.format?.duration ?? s.duration ?? "0";
        streams.push({
          kind: "video",
          index: Number(s.index),
          codec: (s.codec_name as Codec) || ("auto" as Codec),
          width: Number(s.width || 0),
          height: Number(s.height || 0),
          fpsNum: num | 0,
          fpsDen: (den || 1) | 0,
          durationMs: Math.round(parseFloat(dStr) * 1000),
        });
      } else if (s.codec_type === "audio") {
        const dStr = data.format?.duration ?? s.duration ?? "0";
        streams.push({
          kind: "audio",
          index: Number(s.index),
          codec: s.codec_name as string,
          sampleRate: Number(s.sample_rate || 0),
          channels: Number(s.channels || 0),
          durationMs: Math.round(parseFloat(dStr) * 1000),
        });
      }
    }
    return { container, streams };
  } finally {
    try {
      const fs = require("node:fs/promises");
      await fs.unlink(tmpPath);
    } catch {}
  }
}

async function writeTmpForProbe(bytes: Uint8Array): Promise<string> {
  const os = require("node:os");
  const path = require("node:path");
  const fs = require("node:fs/promises");
  const p = path.join(os.tmpdir(), `video-probe-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.writeFile(p, bytes);
  return p;
}

/**
 * Open a video for decoding. Pure-JS MJPEG-in-MP4 path ships today —
 * the container's sample table is walked, each MJPEG sample's bytes are
 * sliced, and `opts.decodeMjpg` is called per frame to lift JPEG → RGBA.
 * Other codecs still need the libavcodec native binding.
 */
async function decode(input: Uint8Array | ArrayBuffer | string, opts?: DecodeOptions): Promise<VideoDecoder> {
  if (typeof input === "string") {
    throw new Error("parabun:video.decode: streaming-from-path not yet supported (pass a Uint8Array / ArrayBuffer)");
  }
  const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : input;
  if (bytes.length < 8) throw new Error("parabun:video.decode: input too short to identify container");

  const isMp4 =
    (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) ||
    (bytes[4] === 0x73 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) ||
    (bytes[4] === 0x6d && bytes[5] === 0x6f && bytes[6] === 0x6f && bytes[7] === 0x76);
  if (!isMp4) throw new Error(NOT_IMPLEMENTED_MSG);

  // Find the moov + the first video trak.
  const moov = findMp4Box(bytes, 0, bytes.length, "moov");
  if (!moov) throw new Error("parabun:video.decode: MP4 has no moov box");

  let videoTrak: Mp4Box | null = null;
  let videoCodec: Codec = "auto";
  let mediaTimescale = 1;
  let mediaDuration = 0n;
  let widthOut = 0;
  let heightOut = 0;
  for (const trak of iterMp4Boxes(bytes, moov.start, moov.end)) {
    if (trak.type !== "trak") continue;
    const mdia = findMp4Box(bytes, trak.start, trak.end, "mdia");
    if (!mdia) continue;
    const hdlr = findMp4Box(bytes, mdia.start, mdia.end, "hdlr");
    if (!hdlr || parseMp4Hdlr(bytes, hdlr) !== "vide") continue;
    const minf = findMp4Box(bytes, mdia.start, mdia.end, "minf");
    const stbl = minf && findMp4Box(bytes, minf.start, minf.end, "stbl");
    const stsd = stbl && findMp4Box(bytes, stbl.start, stbl.end, "stsd");
    const mdhd = findMp4Box(bytes, mdia.start, mdia.end, "mdhd");
    if (!stsd || !mdhd) continue;
    const stsdInfo = parseMp4Stsd(bytes, stsd);
    if (!stsdInfo) continue;
    videoTrak = trak;
    videoCodec = MP4_VIDEO_CODEC[stsdInfo.codecFourCC] ?? "auto";
    widthOut = stsdInfo.width;
    heightOut = stsdInfo.height;
    const m = parseMp4Mdhd(bytes, mdhd);
    mediaTimescale = m.timescale;
    mediaDuration = m.duration;
    break;
  }
  if (!videoTrak) throw new Error("parabun:video.decode: no video track in MP4");

  if (videoCodec !== "mjpeg") {
    // Non-MJPEG codecs route through the ffmpeg subprocess decoder.
    // Pure-JS support stops at MJPEG; H.264 / H.265 / VP9 / AV1 all
    // need a real codec, and shelling out to ffmpeg is dramatically
    // less brittle than dlopen'ing libavcodec across distros.
    return ffmpegDecodeFallback(bytes, opts);
  }
  if (!opts?.decodeMjpg) {
    throw new Error(
      "parabun:video.decode: MJPEG inputs require opts.decodeMjpg — pass `image.decode` from parabun:image",
    );
  }
  const decodeMjpg = opts.decodeMjpg;

  // Parse sample tables.
  const mdia = findMp4Box(bytes, videoTrak.start, videoTrak.end, "mdia")!;
  const minf = findMp4Box(bytes, mdia.start, mdia.end, "minf")!;
  const stbl = findMp4Box(bytes, minf.start, minf.end, "stbl")!;
  const stsz = findMp4Box(bytes, stbl.start, stbl.end, "stsz");
  const stco = findMp4Box(bytes, stbl.start, stbl.end, "stco");
  const co64 = findMp4Box(bytes, stbl.start, stbl.end, "co64");
  const stsc = findMp4Box(bytes, stbl.start, stbl.end, "stsc");
  const stts = findMp4Box(bytes, stbl.start, stbl.end, "stts");
  if (!stsz || (!stco && !co64) || !stsc || !stts) {
    throw new Error("parabun:video.decode: required sample tables missing");
  }

  // stsz: { sample_size:u32, sample_count:u32, [size:u32 × sample_count if sample_size==0] }
  const stszSampleSize = readU32BE(bytes, stsz.start + 4);
  const stszSampleCount = readU32BE(bytes, stsz.start + 8);
  const sampleSizes = new Uint32Array(stszSampleCount);
  if (stszSampleSize === 0) {
    for (let i = 0; i < stszSampleCount; i++) sampleSizes[i] = readU32BE(bytes, stsz.start + 12 + i * 4);
  } else {
    sampleSizes.fill(stszSampleSize);
  }

  // stco / co64: { entry_count:u32, [chunk_offset × entry_count] (32 or 64 bits) }
  const useCo64 = co64 != null;
  const coBox = (useCo64 ? co64 : stco)!;
  const chunkCount = readU32BE(bytes, coBox.start + 4);
  const chunkOffsets: number[] = new Array(chunkCount);
  for (let i = 0; i < chunkCount; i++) {
    chunkOffsets[i] = useCo64
      ? Number(readU64BE(bytes, coBox.start + 8 + i * 8))
      : readU32BE(bytes, coBox.start + 8 + i * 4);
  }

  // stsc: { entry_count, [first_chunk:u32, samples_per_chunk:u32, sample_desc_idx:u32] }
  const stscEntryCount = readU32BE(bytes, stsc.start + 4);
  type StscEntry = { firstChunk: number; samplesPerChunk: number; sampleDescIdx: number };
  const stscEntries: StscEntry[] = [];
  for (let i = 0; i < stscEntryCount; i++) {
    const off = stsc.start + 8 + i * 12;
    stscEntries.push({
      firstChunk: readU32BE(bytes, off),
      samplesPerChunk: readU32BE(bytes, off + 4),
      sampleDescIdx: readU32BE(bytes, off + 8),
    });
  }

  // Build per-sample (offset, size) by walking chunks.
  const sampleOffsets = new Float64Array(stszSampleCount); // f64 to safely hold 53-bit offsets
  let stscIdx = 0;
  let nextStscChunk = stscEntries.length > 1 ? stscEntries[1].firstChunk : Infinity;
  let sampleIdx = 0;
  for (let chunkIdx = 1; chunkIdx <= chunkCount && sampleIdx < stszSampleCount; chunkIdx++) {
    if (stscIdx + 1 < stscEntries.length && chunkIdx >= stscEntries[stscIdx + 1].firstChunk) {
      stscIdx++;
      nextStscChunk = stscIdx + 1 < stscEntries.length ? stscEntries[stscIdx + 1].firstChunk : Infinity;
      void nextStscChunk;
    }
    const samplesPerChunk = stscEntries[stscIdx].samplesPerChunk;
    let chunkOffset = chunkOffsets[chunkIdx - 1];
    for (let s = 0; s < samplesPerChunk && sampleIdx < stszSampleCount; s++) {
      sampleOffsets[sampleIdx] = chunkOffset;
      chunkOffset += sampleSizes[sampleIdx];
      sampleIdx++;
    }
  }
  if (sampleIdx !== stszSampleCount) {
    throw new Error(`parabun:video.decode: sample count mismatch (${sampleIdx} mapped vs ${stszSampleCount} expected)`);
  }

  // stts: per-sample decode timing.
  const stsEntryCount = readU32BE(bytes, stts.start + 4);
  const samplePts = new Float64Array(stszSampleCount);
  let cumulativeTicks = 0;
  let sIdx = 0;
  for (let i = 0; i < stsEntryCount; i++) {
    const off = stts.start + 8 + i * 8;
    const count = readU32BE(bytes, off);
    const delta = readU32BE(bytes, off + 4);
    for (let s = 0; s < count && sIdx < stszSampleCount; s++) {
      samplePts[sIdx++] = cumulativeTicks;
      cumulativeTicks += delta;
    }
  }

  const startMs = opts?.startMs ?? 0;
  const endMs = opts?.endMs ?? Infinity;
  const totalDurationMs = mediaTimescale > 0 ? Number((mediaDuration * 1000n) / BigInt(mediaTimescale)) : 0;

  const finalWidth = widthOut;
  const finalHeight = heightOut;
  const captureCodec = videoCodec;

  const dec: VideoDecoder = {
    width: finalWidth,
    height: finalHeight,
    codec: captureCodec,
    durationMs: totalDurationMs,
    async *frames() {
      for (let i = 0; i < stszSampleCount; i++) {
        const ptsMs = (samplePts[i] * 1000) / mediaTimescale;
        if (ptsMs < startMs) continue;
        if (ptsMs > endMs) break;
        const offset = sampleOffsets[i];
        const size = sampleSizes[i];
        const jpegBytes = bytes.subarray(offset, offset + size);
        const decoded = decodeMjpg(jpegBytes);
        // parabun:image returns RGB or RGBA depending on the source. Promote
        // to RGBA so consumers don't have to branch.
        let rgba: Uint8Array;
        const ch = decoded.channels ?? 3;
        if (ch === 4) {
          rgba = decoded.data instanceof Uint8Array ? decoded.data : new Uint8Array(decoded.data);
        } else if (ch === 3) {
          rgba = new Uint8Array(decoded.width * decoded.height * 4);
          for (let p = 0; p < decoded.width * decoded.height; p++) {
            rgba[p * 4] = decoded.data[p * 3];
            rgba[p * 4 + 1] = decoded.data[p * 3 + 1];
            rgba[p * 4 + 2] = decoded.data[p * 3 + 2];
            rgba[p * 4 + 3] = 0xff;
          }
        } else {
          throw new Error(`parabun:video.decode: unexpected channel count ${ch} from JPEG decoder`);
        }
        yield {
          data: rgba,
          width: decoded.width,
          height: decoded.height,
          pixelFormat: "rgba",
          ptsMs,
          index: i,
          keyframe: true, // every MJPEG sample is a complete JPEG = keyframe.
        };
      }
    },
    async seek(_ptsMs: number): Promise<void> {
      // MJPEG is all keyframes, so seek would just skip ahead — but the
      // current frames() iterator doesn't support resuming; documented as a
      // follow-up.
      throw new Error("parabun:video.decode: seek() on the MJPEG path is pending");
    },
    async close(): Promise<void> {
      /* no resources to release for the in-memory MJPEG path */
    },
    async [Symbol.asyncDispose](): Promise<void> {
      await this.close();
    },
  };
  return dec;
}

/**
 * Open an encoder. The MJPEG-in-MP4 path ships today (pure-JS muxer
 * over JPEG-encoded frames). Other codecs / containers wait for the
 * libavcodec native binding.
 */
async function encode(opts: EncodeOptions): Promise<VideoEncoder> {
  // Non-MJPEG codecs route through the ffmpeg subprocess encoder.
  // MJPEG keeps its pure-JS muxer (it's the only path that doesn't
  // need libavcodec). For consistency with the decoder, we ALSO
  // accept MJPEG over ffmpeg when no encodeJpg callback is provided —
  // this lets callers without parabun:image still use the module.
  if (opts.codec !== "mjpeg" || !opts.encodeJpg) {
    return ffmpegEncodeFallback(opts);
  }
  if (opts.container !== "mp4") {
    throw new Error(`parabun:video.encode: container "${opts.container}" not supported on the MJPEG path (only "mp4")`);
  }
  if (!opts.fps || opts.fps <= 0) throw new RangeError("parabun:video.encode: fps must be > 0");
  if (!opts.width || !opts.height) throw new RangeError("parabun:video.encode: width and height required");

  const encodeJpg = opts.encodeJpg;
  const quality = opts.jpegQuality ?? 85;
  const fps = opts.fps;
  const width = opts.width;
  const height = opts.height;

  const samples: Uint8Array[] = [];
  let bytesQueued = 0;
  let closed = false;

  const enc: VideoEncoder = {
    get bytesWritten(): number {
      return bytesQueued;
    },
    get duration(): number {
      return Math.round((samples.length / fps) * 1000);
    },
    async pushFrame(frame): Promise<void> {
      if (closed) throw new Error("parabun:video.encode: pushFrame after close()");
      // Normalize the input to { data, width, height, channels } that
      // image.encode expects.
      let data: Uint8Array;
      let channels: number;
      let frameW = (frame as any).width as number;
      let frameH = (frame as any).height as number;
      if ("channels" in frame) {
        data = frame.data;
        channels = frame.channels;
      } else if ("pixelFormat" in frame) {
        if (frame.pixelFormat === "rgba") {
          data = frame.data;
          channels = 4;
        } else if (frame.pixelFormat === "rgb24") {
          data = frame.data;
          channels = 3;
        } else {
          throw new Error(
            `parabun:video.encode: pixelFormat "${frame.pixelFormat}" needs YUV→RGB conversion (pending)`,
          );
        }
      } else if ("format" in frame) {
        // parabun:camera RawFrame — only rgb24 / rgba pass through directly.
        if (frame.format === "rgba" || frame.format === "rgb") {
          data = frame.data;
          channels = frame.format === "rgba" ? 4 : 3;
        } else {
          throw new Error(`parabun:video.encode: camera format "${frame.format}" needs YUV→RGB conversion (pending)`);
        }
      } else {
        throw new Error("parabun:video.encode: unrecognized frame shape");
      }
      if (frameW !== width || frameH !== height) {
        throw new Error(`parabun:video.encode: frame ${frameW}x${frameH} doesn't match encoder ${width}x${height}`);
      }
      const jpeg = encodeJpg({ data, width: frameW, height: frameH, channels }, { format: "jpeg", quality });
      samples.push(jpeg);
      bytesQueued += jpeg.byteLength;
    },
    async finalize(): Promise<Uint8Array | void> {
      if (closed) throw new Error("parabun:video.encode: finalize after close()");
      closed = true;
      const bytes = muxMjpegMp4(samples, width, height, fps);
      if (opts.path) {
        await Bun.write(opts.path, bytes);
        return;
      }
      return bytes;
    },
    async close(): Promise<void> {
      closed = true;
      samples.length = 0;
    },
    async [Symbol.asyncDispose](): Promise<void> {
      await this.close();
    },
  };
  return enc;
}

// ─── MP4 muxer (MJPEG, single video track) ────────────────────────────────
// Writes a minimal but spec-compliant ISOBMFF container:
//   ftyp + moov(mvhd + trak(tkhd + mdia(mdhd + hdlr + minf(vmhd + dinf +
//   stbl(stsd(mp4v) + stts + stsc + stsz + stco))))) + mdat
// Single video track, 1 chunk per sample, 32-bit chunk offsets (file
// must fit in 4 GiB — for longer recordings the writer would emit co64
// instead). All MJPEG samples are JPEG payloads back-to-back in mdat.

const MP4_TIMESCALE = 90_000; // common video timescale, divides into typical fps cleanly

function box(type: string, payload: Uint8Array): Uint8Array {
  const size = 8 + payload.byteLength;
  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  view.setUint32(0, size, false);
  out[4] = type.charCodeAt(0);
  out[5] = type.charCodeAt(1);
  out[6] = type.charCodeAt(2);
  out[7] = type.charCodeAt(3);
  out.set(payload, 8);
  return out;
}

function fullBox(type: string, version: number, flags: number, payload: Uint8Array): Uint8Array {
  const wrapped = new Uint8Array(4 + payload.byteLength);
  wrapped[0] = version & 0xff;
  wrapped[1] = (flags >> 16) & 0xff;
  wrapped[2] = (flags >> 8) & 0xff;
  wrapped[3] = flags & 0xff;
  wrapped.set(payload, 4);
  return box(type, wrapped);
}

function concat(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.byteLength;
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.byteLength;
  }
  return out;
}

function u32be(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value >>> 0, false);
  return out;
}

function u16be(value: number): Uint8Array {
  const out = new Uint8Array(2);
  new DataView(out.buffer).setUint16(0, value & 0xffff, false);
  return out;
}

function asciiPad(s: string, length: number): Uint8Array {
  const out = new Uint8Array(length);
  for (let i = 0; i < Math.min(s.length, length); i++) out[i] = s.charCodeAt(i);
  return out;
}

function muxMjpegMp4(samples: Uint8Array[], width: number, height: number, fps: number): Uint8Array {
  const numSamples = samples.length;
  const sampleDelta = Math.round(MP4_TIMESCALE / fps); // ticks per frame
  const totalDuration = numSamples * sampleDelta;

  // ftyp: brand "isom", minor 0x200, compatible {isom, mp41, mp42}.
  const ftyp = box(
    "ftyp",
    concat([asciiPad("isom", 4), u32be(0x200), asciiPad("isom", 4), asciiPad("mp41", 4), asciiPad("mp42", 4)]),
  );

  // mvhd (full box, version 0).
  const mvhd = fullBox(
    "mvhd",
    0,
    0,
    concat([
      u32be(0), // creation_time
      u32be(0), // modification_time
      u32be(MP4_TIMESCALE), // timescale
      u32be(totalDuration), // duration
      u32be(0x00010000), // rate 1.0
      u16be(0x0100), // volume 1.0
      u16be(0), // reserved
      u32be(0),
      u32be(0), // reserved × 2
      // Identity matrix.
      u32be(0x00010000),
      u32be(0),
      u32be(0),
      u32be(0),
      u32be(0x00010000),
      u32be(0),
      u32be(0),
      u32be(0),
      u32be(0x40000000),
      // pre_defined × 6
      u32be(0),
      u32be(0),
      u32be(0),
      u32be(0),
      u32be(0),
      u32be(0),
      u32be(2), // next_track_id
    ]),
  );

  // tkhd (track header, version 0).
  const tkhd = fullBox(
    "tkhd",
    0,
    0x000007, // track enabled + in movie + in preview
    concat([
      u32be(0), // creation
      u32be(0), // modification
      u32be(1), // track_id
      u32be(0), // reserved
      u32be(totalDuration), // duration
      u32be(0),
      u32be(0), // reserved × 2
      u16be(0), // layer
      u16be(0), // alternate_group
      u16be(0), // volume (0 for video)
      u16be(0), // reserved
      u32be(0x00010000),
      u32be(0),
      u32be(0),
      u32be(0),
      u32be(0x00010000),
      u32be(0),
      u32be(0),
      u32be(0),
      u32be(0x40000000),
      u32be(width << 16), // width 16.16
      u32be(height << 16), // height 16.16
    ]),
  );

  // mdhd (media header).
  const mdhd = fullBox(
    "mdhd",
    0,
    0,
    concat([
      u32be(0), // creation
      u32be(0), // modification
      u32be(MP4_TIMESCALE), // timescale
      u32be(totalDuration), // duration
      u16be(0x55c4), // language "und"
      u16be(0), // pre_defined
    ]),
  );

  // hdlr (handler) — handler_type "vide".
  const hdlr = fullBox(
    "hdlr",
    0,
    0,
    concat([
      u32be(0), // pre_defined
      asciiPad("vide", 4),
      u32be(0),
      u32be(0),
      u32be(0), // reserved × 3
      asciiPad("VideoHandler\0", 13), // name (null-terminated)
    ]),
  );

  // vmhd (video media header).
  const vmhd = fullBox(
    "vmhd",
    0,
    0x000001, // graphicsmode + opcolor
    concat([
      u16be(0), // graphicsmode
      u16be(0),
      u16be(0),
      u16be(0), // opcolor
    ]),
  );

  // dinf > dref with self-reference url.
  const url_ = fullBox("url ", 0, 0x000001, new Uint8Array(0));
  const dref = fullBox("dref", 0, 0, concat([u32be(1), url_]));
  const dinf = box("dinf", dref);

  // stsd: sample description with one "jpeg" entry. The MJPEG-in-MP4
  // FourCC is "jpeg" — the visual sample entry below has no codec-
  // specific descriptor since each sample is a complete JPEG.
  const visualSampleEntry = concat([
    u32be(0),
    u16be(0), // reserved (6 bytes)
    u16be(1), // data_reference_index
    u16be(0),
    u16be(0), // pre_defined + reserved
    u32be(0),
    u32be(0),
    u32be(0), // pre_defined × 3
    u16be(width),
    u16be(height),
    u32be(0x00480000),
    u32be(0x00480000), // h/v resolution 72 dpi
    u32be(0), // reserved
    u16be(1), // frame_count (1 sample = 1 frame)
    asciiPad("\x0CMJPEG Parabun", 32), // compressorname (Pascal string padded to 32)
    u16be(0x0018), // depth (24-bit)
    u16be(0xffff), // pre_defined
  ]);
  const sampleEntry = box("jpeg", visualSampleEntry);
  const stsd = fullBox("stsd", 0, 0, concat([u32be(1), sampleEntry]));

  // stts (time-to-sample): single entry with constant delta.
  const stts = fullBox("stts", 0, 0, concat([u32be(1), u32be(numSamples), u32be(sampleDelta)]));

  // stsc (sample-to-chunk): every chunk has 1 sample, sample_desc_idx = 1.
  const stsc = fullBox("stsc", 0, 0, concat([u32be(1), u32be(1), u32be(1), u32be(1)]));

  // stsz (sample sizes): per-sample table, sample_size = 0 → use array.
  const stszEntries: Uint8Array[] = [u32be(0), u32be(numSamples)];
  for (const s of samples) stszEntries.push(u32be(s.byteLength));
  const stsz = fullBox("stsz", 0, 0, concat(stszEntries));

  // We need stco (chunk offsets) — but the chunk offsets depend on where
  // mdat starts, which depends on the moov size. So we build moov twice
  // with placeholder offsets, then patch when we know mdat's start.
  const buildStco = (mdatPayloadStart: number): Uint8Array => {
    const entries: Uint8Array[] = [u32be(numSamples)];
    let off = mdatPayloadStart;
    for (const s of samples) {
      entries.push(u32be(off));
      off += s.byteLength;
    }
    return fullBox("stco", 0, 0, concat(entries));
  };

  const buildMoov = (stco: Uint8Array): Uint8Array => {
    const stbl = box("stbl", concat([stsd, stts, stsc, stsz, stco]));
    const minf = box("minf", concat([vmhd, dinf, stbl]));
    const mdia = box("mdia", concat([mdhd, hdlr, minf]));
    const trak = box("trak", concat([tkhd, mdia]));
    return box("moov", concat([mvhd, trak]));
  };

  // Determine moov size with placeholder stco. The placeholder must be
  // the same size as the real one (depends only on numSamples), so we
  // can build it with a dummy offset and the size is invariant.
  const placeholderStco = buildStco(0);
  const placeholderMoov = buildMoov(placeholderStco);
  const ftypLen = ftyp.byteLength;
  const moovLen = placeholderMoov.byteLength;
  // mdat: 8-byte header + JPEG bytes.
  const mdatPayloadStart = ftypLen + moovLen + 8;
  const realStco = buildStco(mdatPayloadStart);
  const realMoov = buildMoov(realStco);
  if (realMoov.byteLength !== moovLen) {
    // Sanity check — placeholder size invariance is the whole reason we
    // can do offset-based muxing in a single pass.
    throw new Error("parabun:video.encode: moov-size invariance broke (encoder bug)");
  }

  const mdatHeader = (() => {
    let total = 8;
    for (const s of samples) total += s.byteLength;
    const out = new Uint8Array(8);
    new DataView(out.buffer).setUint32(0, total, false);
    out[4] = "m".charCodeAt(0);
    out[5] = "d".charCodeAt(0);
    out[6] = "a".charCodeAt(0);
    out[7] = "t".charCodeAt(0);
    return out;
  })();

  return concat([ftyp, realMoov, mdatHeader, ...samples]);
}

// Lazy require so the ffmpeg probe doesn't fire unless an MJPEG-free
// codec actually shows up. The submodule itself spawns nothing on
// import — first decode() call probes ffmpeg.
const ffmpegMod = require("./video/ffmpeg.ts");

/**
 * libavcodec-class decode by spawning ffmpeg. Used by `decode()` when
 * the input is anything other than MJPEG-in-MP4 (the pure-JS path).
 * Throws "install ffmpeg" when the binary isn't on PATH.
 */
async function ffmpegDecodeFallback(bytes: Uint8Array, opts: DecodeOptions | undefined): Promise<VideoDecoder> {
  const stream = await ffmpegMod.decode(bytes, {
    startMs: opts?.startMs,
    endMs: opts?.endMs,
  });
  // Map ffmpeg's codec_name to our Codec union; fall back to the raw
  // string for anything we don't have a tag for (still reaches users
  // who can compare the exact name).
  const codecMap: Record<string, Codec> = {
    h264: "h264",
    hevc: "h265",
    h265: "h265",
    vp8: "vp8",
    vp9: "vp9",
    av1: "av1",
    mjpeg: "mjpeg",
  };
  const mappedCodec = (codecMap[stream.codec] ?? stream.codec) as Codec;
  return {
    width: stream.width,
    height: stream.height,
    codec: mappedCodec,
    durationMs: stream.durationMs,
    frames(): AsyncIterableIterator<DecodedFrame> {
      const inner = stream.frames();
      const iterator: AsyncIterableIterator<DecodedFrame> = {
        async next(): Promise<IteratorResult<DecodedFrame>> {
          const r = await inner.next();
          if (r.done) return { done: true, value: undefined as any };
          return {
            done: false,
            value: {
              data: r.value.data,
              width: stream.width,
              height: stream.height,
              pixelFormat: "rgba",
              ptsMs: r.value.ptsMs,
              index: r.value.index,
              // ffmpeg's rawvideo output doesn't expose per-frame
              // keyframe info; mark only the first frame as keyframe
              // (it always is) and let the FFI v2 path surface real
              // I/P/B classification.
              keyframe: r.value.index === 0,
            },
          };
        },
        [Symbol.asyncIterator]() {
          return iterator;
        },
      };
      return iterator;
    },
    async seek(_ptsMs: number): Promise<void> {
      throw new Error("parabun:video.decode: seek() on the ffmpeg path requires re-opening the decoder with startMs");
    },
    async close(): Promise<void> {
      await stream.close();
    },
    async [Symbol.asyncDispose](): Promise<void> {
      await stream.close();
    },
  };
}

/**
 * libavcodec-class encode by spawning ffmpeg. Used by `encode()` for
 * any non-MJPEG codec or any caller that doesn't supply
 * `opts.encodeJpg`. Throws "install ffmpeg" when the binary isn't on
 * PATH.
 */
async function ffmpegEncodeFallback(opts: EncodeOptions): Promise<VideoEncoder> {
  if (!opts.fps || opts.fps <= 0) throw new RangeError("parabun:video.encode: fps must be > 0");
  if (!opts.width || !opts.height) throw new RangeError("parabun:video.encode: width and height required");
  // Map our Codec union → ffmpeg encoder name.
  const codecMap: Record<string, string> = {
    h264: "libx264",
    h265: "libx265",
    hevc: "libx265",
    vp8: "libvpx",
    vp9: "libvpx-vp9",
    av1: "libsvtav1",
    mjpeg: "mjpeg",
  };
  const ffCodec = codecMap[opts.codec];
  if (!ffCodec) {
    throw new Error(`parabun:video.encode: codec "${opts.codec}" not mapped to an ffmpeg encoder`);
  }
  // Container → file extension. Default ".mp4" if "auto".
  const containerExtMap: Record<string, string> = { mp4: "mp4", mkv: "mkv", webm: "webm", ts: "ts", auto: "mp4" };
  const containerExt = containerExtMap[opts.container] ?? "mp4";

  const handle = await ffmpegMod.encode({
    codec: ffCodec,
    containerExt,
    width: opts.width,
    height: opts.height,
    fps: opts.fps,
    bitrate: opts.bitrate,
    preset: opts.preset,
    path: opts.path,
  });

  let bytesWritten = 0;

  return {
    get bytesWritten() {
      return bytesWritten;
    },
    get duration() {
      return Math.round((handle.framesPushed * 1000) / opts.fps);
    },
    async pushFrame(frame: any): Promise<void> {
      // Accept the same three shapes as the MJPEG path. For RGB
      // (3-channel) inputs, pad to RGBA.
      let rgba: Uint8Array;
      if (frame.pixelFormat === "rgba" || frame.format === "rgba" || frame.channels === 4) {
        rgba = frame.data;
      } else if (frame.channels === 3 || frame.format === "rgb24") {
        const n = opts.width * opts.height;
        rgba = new Uint8Array(n * 4);
        const src = frame.data as Uint8Array;
        for (let i = 0; i < n; i++) {
          rgba[i * 4] = src[i * 3];
          rgba[i * 4 + 1] = src[i * 3 + 1];
          rgba[i * 4 + 2] = src[i * 3 + 2];
          rgba[i * 4 + 3] = 255;
        }
      } else {
        throw new RangeError(
          `parabun:video.encode: unsupported frame format (need rgba or rgb24/3-channel; got ${frame.pixelFormat ?? frame.format ?? frame.channels})`,
        );
      }
      bytesWritten += rgba.length;
      await handle.pushFrame(rgba);
    },
    async finalize(): Promise<Uint8Array | void> {
      const out = await handle.finalize();
      return out as Uint8Array | undefined;
    },
    async close(): Promise<void> {
      await handle.close();
    },
    async [Symbol.asyncDispose](): Promise<void> {
      await handle.close();
    },
  };
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

/**
 * Single-frame RGBA thumbnail at a given presentation timestamp.
 * Default ptsMs picks the clip midpoint — close enough to a
 * "representative frame" for previews / scrubbing UIs without
 * paying the full-decode cost. Routes through ffmpeg with
 * container-level seek (lands on the nearest preceding keyframe).
 */
async function thumbnail(
  bytes: Uint8Array | ArrayBuffer,
  ptsMs?: number,
): Promise<{ data: Uint8Array; width: number; height: number; ptsMs: number }> {
  const u8 = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  return ffmpegMod.thumbnail(u8, ptsMs);
}

/**
 * Pull the audio track of a video file as raw signed-16-bit PCM
 * (interleaved per channel). Default 16 kHz mono — the canonical
 * input shape for Whisper / parabun:speech.transcribe. Routes
 * through the ffmpeg subprocess; throws "install ffmpeg" when the
 * binary isn't on PATH or "input has no audio track" when the
 * source is video-only.
 */
async function extractAudio(
  bytes: Uint8Array | ArrayBuffer,
  opts?: { sampleRate?: number; channels?: 1 | 2 },
): Promise<{ samples: Int16Array; sampleRate: number; channels: number; durationMs: number }> {
  const u8 = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  return ffmpegMod.extractAudio(u8, opts);
}

export default {
  probe,
  decode,
  encode,
  decodeAll,
  extractAudio,
  thumbnail,
};
