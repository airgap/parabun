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
  mp4v: "mjpeg",
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
  if (!moov) throw new Error("bun:video.probe: MP4 has no moov box (truncated or moov-at-end?)");

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
  if (segStart < 0) throw new Error("bun:video.probe: no Segment in Matroska");

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
    throw new Error("bun:video.probe: input too short to identify container");
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
  throw new Error("bun:video.probe: container not recognized (supports MP4 / ISOBMFF and Matroska / WebM)");
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
