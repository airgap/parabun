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

export default { decode, probeBytes, isAvailable: probe };
