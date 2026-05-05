// Hardcoded module "parabun:video/ffmpeg" (private to parabun:video)
//
// libavcodec-class video decode by spawning the system ffmpeg / ffprobe
// binaries. Same dlopen-ish probe pattern as parabun:vision/tesseract:
// runs `ffmpeg -version` once at first use and surfaces a clean
// "install ffmpeg" error if it's missing. No FFI struct access (the
// libav 60→61 ABI break makes direct field reads fragile across
// distros).
//
// Performance trade: subprocess + RGBA-over-pipe costs ~50-100 MB/s
// of throughput for HD content vs the FFI ceiling of >GB/s. For most
// "decode this file's frames" use cases that's well above real-time.
// FFI v2 lives behind the same JS surface and is a follow-up.

const NOT_INSTALLED_MSG =
  "parabun:video: ffmpeg not found on PATH. Install via " +
  "`apt install ffmpeg` (Linux), `brew install ffmpeg` (macOS), " +
  "or grab a build from https://ffmpeg.org/download.html.";

let probed = false;
let available = false;

async function probe(): Promise<boolean> {
  if (probed) return available;
  probed = true;
  try {
    const proc = Bun.spawn({
      cmd: ["ffmpeg", "-version"],
      stdout: "ignore",
      stderr: "ignore",
    });
    const exitCode = await proc.exited;
    available = exitCode === 0;
  } catch {
    available = false;
  }
  return available;
}

type ProbeResult = {
  width: number;
  height: number;
  codec: string;
  durationMs: number;
  /** Average frame rate (frames per second). */
  fps: number;
  /** Total frame count (best-effort — some containers don't expose this). */
  frameCount: number | undefined;
};

// ffprobe a file (via temp-file written from bytes). Returns container
// + first-video-stream metadata. Throws on parse failure or unrecognised
// container.
async function probeBytes(bytes: Uint8Array): Promise<ProbeResult> {
  if (!(await probe())) throw new Error(NOT_INSTALLED_MSG);
  // Write to temp file so ffprobe can seek; reading from stdin works for
  // streamable formats but breaks on MP4 (moov-at-end) without -movflags.
  const tmpPath = await writeTmp(bytes, "video-probe");
  try {
    const proc = Bun.spawn({
      cmd: [
        "ffprobe",
        "-v",
        "error",
        "-print_format",
        "json",
        "-show_streams",
        "-show_format",
        "-select_streams",
        "v:0",
        tmpPath,
      ],
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    if (exitCode !== 0) {
      throw new Error(`parabun:video.probe: ffprobe failed (${exitCode}): ${stderr.trim()}`);
    }
    const meta = JSON.parse(stdout);
    const stream = meta.streams?.[0];
    if (!stream) throw new Error("parabun:video.probe: no video stream in input");
    const width = stream.width as number;
    const height = stream.height as number;
    const codec = stream.codec_name as string;
    const durationS = parseFloat(meta.format?.duration ?? stream.duration ?? "0");
    const fpsRational = (stream.avg_frame_rate ?? stream.r_frame_rate ?? "0/1") as string;
    const [num, den] = fpsRational.split("/").map(Number);
    const fps = den > 0 ? num / den : 0;
    const frameCountStr = stream.nb_frames as string | undefined;
    const frameCount = frameCountStr && frameCountStr !== "N/A" ? Number(frameCountStr) : undefined;
    return {
      width,
      height,
      codec,
      durationMs: Math.round(durationS * 1000),
      fps,
      frameCount,
    };
  } finally {
    try {
      await nodeFs.unlink(tmpPath);
    } catch {
      /* already gone */
    }
  }
}

// Spawn ffmpeg to stream raw RGBA frames to stdout. Returns an async
// iterator that yields one Uint8Array per frame (length = w*h*4) plus
// an explicit close() so the caller can stop early without leaking the
// child process.
type StreamOptions = {
  /** Drop frames whose presentation timestamp is below this (ms). */
  startMs?: number;
  /** Stop decoding past this presentation timestamp (ms). */
  endMs?: number;
};

type FrameIterator = {
  width: number;
  height: number;
  codec: string;
  durationMs: number;
  fps: number;
  frameCount: number | undefined;
  frames(): AsyncIterableIterator<{ data: Uint8Array; index: number; ptsMs: number }>;
  close(): Promise<void>;
};

async function decode(bytes: Uint8Array, opts?: StreamOptions): Promise<FrameIterator> {
  if (!(await probe())) throw new Error(NOT_INSTALLED_MSG);
  const meta = await probeBytes(bytes);
  const tmpPath = await writeTmp(bytes, "video-decode");
  const ffArgs: string[] = ["-v", "error"];
  if (opts?.startMs !== undefined && opts.startMs > 0) {
    // -ss before -i is fast (seeks at the container level).
    ffArgs.push("-ss", (opts.startMs / 1000).toString());
  }
  ffArgs.push("-i", tmpPath);
  if (opts?.endMs !== undefined && opts.endMs < Infinity) {
    const startMs = opts.startMs ?? 0;
    ffArgs.push("-t", ((opts.endMs - startMs) / 1000).toString());
  }
  ffArgs.push("-f", "rawvideo", "-pix_fmt", "rgba", "pipe:1");
  const proc = Bun.spawn({
    cmd: ["ffmpeg", ...ffArgs],
    stdout: "pipe",
    stderr: "pipe",
  });

  const frameSize = meta.width * meta.height * 4;
  let stderrAccum = "";
  let stderrDone = false;
  // Drain stderr in the background so a slow consumer doesn't block
  // ffmpeg writing diagnostics.
  void (async () => {
    try {
      const reader = proc.stderr.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        stderrAccum += decoder.decode(value, { stream: true });
        // Cap accumulator so a misbehaving ffmpeg can't blow memory.
        if (stderrAccum.length > 32 * 1024) {
          stderrAccum = "…" + stderrAccum.slice(-32 * 1024);
        }
      }
    } finally {
      stderrDone = true;
    }
  })();

  let closed = false;
  async function close(): Promise<void> {
    if (closed) return;
    closed = true;
    try {
      proc.kill();
    } catch {}
    try {
      await proc.exited;
    } catch {}
    try {
      await nodeFs.unlink(tmpPath);
    } catch {}
  }

  async function* frames(): AsyncIterableIterator<{ data: Uint8Array; index: number; ptsMs: number }> {
    let index = 0;
    let buf = new Uint8Array(0);
    const reader = proc.stdout.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        // Append chunk; emit whole frames as they're complete.
        if (buf.length === 0) buf = value;
        else {
          const merged = new Uint8Array(buf.length + value.length);
          merged.set(buf);
          merged.set(value, buf.length);
          buf = merged;
        }
        while (buf.length >= frameSize) {
          const frame = buf.subarray(0, frameSize).slice(); // copy out
          buf = buf.subarray(frameSize);
          // Approximate PTS from frame index + fps. ffmpeg's rawvideo
          // sink doesn't carry per-frame timestamps; for accurate
          // PTS the FFI v2 path is the right hook.
          const ptsMs = meta.fps > 0 ? Math.round(((index + 1) * 1000) / meta.fps) : 0;
          yield { data: frame, index, ptsMs };
          index++;
        }
      }
      const exitCode = await proc.exited;
      if (exitCode !== 0) {
        // Wait briefly for stderr drain to give a useful message.
        for (let i = 0; i < 10 && !stderrDone; i++) await new Promise(r => setTimeout(r, 10));
        throw new Error(`parabun:video.decode: ffmpeg exited ${exitCode}: ${stderrAccum.trim()}`);
      }
    } finally {
      await close();
    }
  }

  return {
    width: meta.width,
    height: meta.height,
    codec: meta.codec,
    durationMs: meta.durationMs,
    fps: meta.fps,
    frameCount: meta.frameCount,
    frames,
    close,
  };
}

// Spawn ffmpeg in encoder mode: receives raw RGBA over stdin,
// writes the encoded container to disk (or to a temp file we read
// back when no path is supplied). Returns a writer with pushFrame
// + finalize.
type EncodeOptions = {
  codec: string; // ffmpeg codec name, e.g. "libx264", "libvpx-vp9"
  containerExt: string; // file extension, e.g. "mp4", "webm"
  width: number;
  height: number;
  fps: number;
  bitrate?: number; // bps; default leaves ffmpeg's CRF default
  preset?: string; // x264 preset; default "medium"
  pixFmt?: string; // output pixel format; default "yuv420p"
  /** Output file path. If omitted, encode buffers to a temp file. */
  path?: string;
};

type EncoderHandle = {
  pushFrame(rgba: Uint8Array): Promise<void>;
  finalize(): Promise<Uint8Array | undefined>;
  close(): Promise<void>;
  framesPushed: number;
};

async function encode(opts: EncodeOptions): Promise<EncoderHandle> {
  if (!(await probe())) throw new Error(NOT_INSTALLED_MSG);
  const expectedFrameSize = opts.width * opts.height * 4;
  // Final destination: caller-provided path or a temp file we'll
  // read + delete on finalize.
  const ownsPath = opts.path === undefined;
  const outPath =
    opts.path ??
    nodePath.join(
      nodeOs.tmpdir(),
      `video-encode-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.${opts.containerExt}`,
    );

  const args: string[] = [
    "-v",
    "error",
    "-y",
    // Input: raw RGBA over stdin.
    "-f",
    "rawvideo",
    "-pix_fmt",
    "rgba",
    "-s",
    `${opts.width}x${opts.height}`,
    "-r",
    String(opts.fps),
    "-i",
    "pipe:0",
    // Output: caller's chosen codec + container, derived pix_fmt.
    "-c:v",
    opts.codec,
    "-pix_fmt",
    opts.pixFmt ?? "yuv420p",
  ];
  if (opts.bitrate !== undefined && opts.bitrate > 0) {
    args.push("-b:v", String(opts.bitrate));
  }
  if (opts.preset && opts.codec === "libx264") {
    args.push("-preset", opts.preset);
  }
  args.push(outPath);

  const proc = Bun.spawn({
    cmd: ["ffmpeg", ...args],
    stdin: "pipe",
    stdout: "ignore",
    stderr: "pipe",
  });

  let stderrAccum = "";
  void (async () => {
    try {
      const reader = proc.stderr.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        stderrAccum += decoder.decode(value, { stream: true });
        if (stderrAccum.length > 32 * 1024) stderrAccum = "…" + stderrAccum.slice(-32 * 1024);
      }
    } catch {}
  })();

  let framesPushed = 0;
  let closed = false;
  // Bun.spawn's `stdin` is a FileSink (write + flush + end) when set
  // to "pipe" — not a WritableStream. No getWriter().
  const stdin = proc.stdin as any;

  async function pushFrame(rgba: Uint8Array): Promise<void> {
    if (closed) throw new Error("parabun:video.encode: pushFrame after finalize/close");
    if (rgba.length !== expectedFrameSize) {
      throw new RangeError(`parabun:video.encode: frame length ${rgba.length} ≠ width*height*4 (${expectedFrameSize})`);
    }
    stdin.write(rgba);
    if (typeof stdin.flush === "function") await stdin.flush();
    framesPushed++;
  }

  async function finalize(): Promise<Uint8Array | undefined> {
    if (closed) return undefined;
    closed = true;
    try {
      if (typeof stdin.end === "function") await stdin.end();
      else if (typeof stdin.close === "function") await stdin.close();
    } catch {}
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      throw new Error(`parabun:video.encode: ffmpeg exited ${exitCode}: ${stderrAccum.trim()}`);
    }
    if (ownsPath) {
      const bytes = await nodeFs.readFile(outPath);
      try {
        await nodeFs.unlink(outPath);
      } catch {}
      return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    }
    return undefined;
  }

  async function close(): Promise<void> {
    if (closed) return;
    closed = true;
    try {
      if (typeof stdin.end === "function") await stdin.end();
      else if (typeof stdin.close === "function") await stdin.close();
    } catch {}
    try {
      proc.kill();
    } catch {}
    try {
      await proc.exited;
    } catch {}
    if (ownsPath) {
      try {
        await nodeFs.unlink(outPath);
      } catch {}
    }
  }

  return {
    pushFrame,
    finalize,
    close,
    get framesPushed() {
      return framesPushed;
    },
  };
}

// Per-frame timing via ffprobe -show_frames. Returns an array of
// pkt_duration_time values (seconds) for the video stream. Used by
// image.decodeFrames to surface variable per-frame timing for
// animated GIFs / WebPs that don't have a fixed frame rate. Falls
// back to an empty array if ffprobe doesn't surface durations.
async function frameDurationsMs(bytes: Uint8Array): Promise<number[]> {
  if (!(await probe())) throw new Error(NOT_INSTALLED_MSG);
  const tmpPath = await writeTmp(bytes, "anim-frames");
  try {
    const proc = Bun.spawn({
      cmd: ["ffprobe", "-v", "error", "-print_format", "json", "-show_frames", "-select_streams", "v:0", tmpPath],
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    if (exitCode !== 0) throw new Error(`ffmpeg.frameDurationsMs: ffprobe failed (${exitCode}): ${stderr.trim()}`);
    const data = JSON.parse(stdout);
    const out: number[] = [];
    for (const f of data.frames ?? []) {
      // Newer ffprobe uses `duration_time`; older uses
      // `pkt_duration_time`. Accept both. Missing → 0 (caller treats
      // 0 as "use the average fps").
      const t = f.duration_time ?? f.pkt_duration_time;
      const sec = t && t !== "N/A" ? parseFloat(t) : 0;
      out.push(Math.round(sec * 1000));
    }
    return out;
  } finally {
    try {
      await nodeFs.unlink(tmpPath);
    } catch {}
  }
}

// Extract a single RGBA frame at a given presentation timestamp.
// Useful for thumbnails, scrubbing UIs, "first frame" previews.
// `ptsMs` defaults to the midpoint of the clip — close enough to
// "representative frame" for a thumbnail without needing the full
// decode.
async function thumbnail(
  bytes: Uint8Array,
  ptsMs?: number,
): Promise<{ data: Uint8Array; width: number; height: number; ptsMs: number }> {
  if (!(await probe())) throw new Error(NOT_INSTALLED_MSG);
  const meta = await probeBytes(bytes);
  // Default seek = clip midpoint. Clamp into [0, durationMs).
  let seekMs = ptsMs ?? Math.floor(meta.durationMs / 2);
  if (seekMs < 0) seekMs = 0;
  if (meta.durationMs > 0 && seekMs >= meta.durationMs) seekMs = meta.durationMs - 1;
  const tmpPath = await writeTmp(bytes, "video-thumb");
  try {
    // -ss BEFORE -i seeks at the container level (fast — lands on
    // the nearest preceding keyframe). -frames:v 1 emits exactly one
    // frame; -f rawvideo -pix_fmt rgba pipes uncompressed RGBA.
    const proc = Bun.spawn({
      cmd: [
        "ffmpeg",
        "-v",
        "error",
        "-ss",
        (seekMs / 1000).toString(),
        "-i",
        tmpPath,
        "-frames:v",
        "1",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgba",
        "pipe:1",
      ],
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdoutChunks: Uint8Array[] = [];
    let stdoutTotal = 0;
    const stdoutPromise = (async () => {
      const reader = proc.stdout.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        stdoutChunks.push(value);
        stdoutTotal += value.length;
      }
    })();
    const [, stderr, exitCode] = await Promise.all([stdoutPromise, proc.stderr.text(), proc.exited]);
    if (exitCode !== 0) {
      throw new Error(`video.thumbnail: ffmpeg exited ${exitCode}: ${stderr.trim()}`);
    }
    const expected = meta.width * meta.height * 4;
    if (stdoutTotal < expected) {
      throw new Error(
        `video.thumbnail: short read (${stdoutTotal} < ${expected} bytes) — seek may have landed past EOF`,
      );
    }
    const out = new Uint8Array(expected);
    let off = 0;
    for (const c of stdoutChunks) {
      const take = Math.min(c.length, expected - off);
      out.set(c.subarray(0, take), off);
      off += take;
      if (off >= expected) break;
    }
    return { data: out, width: meta.width, height: meta.height, ptsMs: seekMs };
  } finally {
    try {
      await nodeFs.unlink(tmpPath);
    } catch {}
  }
}

// Extract the audio track of a video file as raw PCM. Returns
// signed 16-bit interleaved samples — call .samples for an
// Int16Array. The caller picks sample rate (default 16000, the
// canonical Whisper input) and channel count (default 1).
type ExtractAudioOptions = {
  /** Target sample rate. Default 16000 (Whisper). */
  sampleRate?: number;
  /** Target channel count (1 = mono, 2 = stereo). Default 1. */
  channels?: number;
};

async function extractAudio(
  bytes: Uint8Array,
  opts?: ExtractAudioOptions,
): Promise<{ samples: Int16Array; sampleRate: number; channels: number; durationMs: number }> {
  if (!(await probe())) throw new Error(NOT_INSTALLED_MSG);
  const sampleRate = opts?.sampleRate ?? 16000;
  const channels = opts?.channels ?? 1;
  if (sampleRate <= 0) throw new RangeError("video.extractAudio: sampleRate must be > 0");
  if (channels !== 1 && channels !== 2) throw new RangeError("video.extractAudio: channels must be 1 or 2");

  const tmpPath = await writeTmp(bytes, "video-audio");
  try {
    // -vn drops the video stream; -f s16le -acodec pcm_s16le emits
    // headerless little-endian 16-bit PCM. -ac and -ar resample +
    // remix to the target shape so the caller doesn't have to.
    const proc = Bun.spawn({
      cmd: [
        "ffmpeg",
        "-v",
        "error",
        "-i",
        tmpPath,
        "-vn",
        "-f",
        "s16le",
        "-acodec",
        "pcm_s16le",
        "-ac",
        String(channels),
        "-ar",
        String(sampleRate),
        "pipe:1",
      ],
      stdout: "pipe",
      stderr: "pipe",
    });
    // Drain stdout chunks and stderr / exitCode in parallel. Using
    // the reader API directly because proc.stdout's higher-level
    // helpers (.bytes / .arrayBuffer) aren't available on the
    // Bun.spawn ReadableStream shape that builtin modules see.
    const stdoutChunks: Uint8Array[] = [];
    let stdoutTotal = 0;
    const stdoutPromise = (async () => {
      const reader = proc.stdout.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        stdoutChunks.push(value);
        stdoutTotal += value.length;
      }
    })();
    const [, stderr, exitCode] = await Promise.all([stdoutPromise, proc.stderr.text(), proc.exited]);
    if (exitCode !== 0) {
      throw new Error(`video.extractAudio: ffmpeg exited ${exitCode}: ${stderr.trim()}`);
    }
    if (stdoutTotal === 0) {
      throw new Error("video.extractAudio: input has no audio track");
    }
    // Concat into a fresh aligned ArrayBuffer so DataView attaches
    // safely (chunk byteOffsets aren't guaranteed 2-byte aligned).
    const aligned = new Uint8Array(stdoutTotal);
    let off = 0;
    for (const c of stdoutChunks) {
      aligned.set(c, off);
      off += c.length;
    }
    const view = new DataView(aligned.buffer);
    const samples = new Int16Array(stdoutTotal / 2);
    for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true);
    const durationMs = Math.round((samples.length / channels / sampleRate) * 1000);
    return { samples, sampleRate, channels, durationMs };
  } finally {
    try {
      await nodeFs.unlink(tmpPath);
    } catch {}
  }
}

// Helper: write bytes to a fresh temp file and return its path.
async function writeTmp(bytes: Uint8Array, prefix: string): Promise<string> {
  const path = nodePath.join(
    nodeOs.tmpdir(),
    `${prefix}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await nodeFs.writeFile(path, bytes);
  return path;
}

const nodeOs = require("node:os");
const nodePath = require("node:path");
const nodeFs = require("node:fs/promises");

export default { decode, encode, extractAudio, thumbnail, frameDurationsMs, probeBytes, isAvailable: probe };
