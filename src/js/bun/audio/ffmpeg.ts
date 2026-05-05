// Hardcoded module "parabun:audio/ffmpeg" (private to parabun:audio)
//
// libavcodec-class audio file decode + encode by spawning the system
// ffmpeg binary. Same dlopen-style probe pattern as
// parabun:vision/tesseract: runs `ffmpeg -version` once at first use,
// surfaces "install ffmpeg" if missing.
//
// Covers the formats parabun:audio doesn't have first-class native
// paths for: FLAC / AAC / OGG / M4A / WMA decode, MP3 / FLAC / AAC /
// OGG / WAV encode. WAV + MP3 + Opus already have native paths in
// parabun:audio (no subprocess overhead); ffmpeg is the catch-all.

const NOT_INSTALLED_MSG =
  "parabun:audio: ffmpeg not found on PATH. Install via " +
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
    available = (await proc.exited) === 0;
  } catch {
    available = false;
  }
  return available;
}

const nodeOs = require("node:os");
const nodePath = require("node:path");
const nodeFs = require("node:fs/promises");

async function writeTmp(bytes: Uint8Array, prefix: string, ext: string): Promise<string> {
  const path = nodePath.join(
    nodeOs.tmpdir(),
    `${prefix}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`,
  );
  await nodeFs.writeFile(path, bytes);
  return path;
}

type DecodeOptions = {
  /** Resample to this rate. Default: keep the source rate. */
  sampleRate?: number;
  /** Remix to this many channels (1 mono, 2 stereo). Default: keep source. */
  channels?: number;
};

async function decode(
  bytes: Uint8Array,
  opts?: DecodeOptions,
): Promise<{ samples: Int16Array; sampleRate: number; channels: number; durationMs: number }> {
  if (!(await probe())) throw new Error(NOT_INSTALLED_MSG);
  const tmpPath = await writeTmp(bytes, "audio-decode", "bin");
  try {
    // First, ffprobe for source rate + channels so we can preserve
    // them when the caller doesn't override.
    const probeProc = Bun.spawn({
      cmd: ["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-select_streams", "a:0", tmpPath],
      stdout: "pipe",
      stderr: "pipe",
    });
    const [pStdout, pStderr, pExit] = await Promise.all([
      probeProc.stdout.text(),
      probeProc.stderr.text(),
      probeProc.exited,
    ]);
    if (pExit !== 0) throw new Error(`audio.decode: ffprobe failed (${pExit}): ${pStderr.trim()}`);
    const meta = JSON.parse(pStdout);
    const stream = meta.streams?.[0];
    if (!stream) throw new Error("audio.decode: input has no audio stream");
    const sourceRate = Number(stream.sample_rate);
    const sourceChannels = Number(stream.channels);
    const targetRate = opts?.sampleRate ?? sourceRate;
    const targetChannels = opts?.channels ?? sourceChannels;
    if (targetChannels !== 1 && targetChannels !== 2) {
      throw new RangeError("audio.decode: channels must be 1 or 2");
    }

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
        String(targetChannels),
        "-ar",
        String(targetRate),
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
      throw new Error(`audio.decode: ffmpeg exited ${exitCode}: ${stderr.trim()}`);
    }
    if (stdoutTotal === 0) {
      throw new Error("audio.decode: ffmpeg produced no PCM output");
    }
    const aligned = new Uint8Array(stdoutTotal);
    let off = 0;
    for (const c of stdoutChunks) {
      aligned.set(c, off);
      off += c.length;
    }
    const view = new DataView(aligned.buffer);
    const samples = new Int16Array(stdoutTotal / 2);
    for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true);
    const durationMs = Math.round((samples.length / targetChannels / targetRate) * 1000);
    return { samples, sampleRate: targetRate, channels: targetChannels, durationMs };
  } finally {
    try {
      await nodeFs.unlink(tmpPath);
    } catch {}
  }
}

type EncodeOptions = {
  /** Output format: "mp3", "flac", "aac", "ogg", "wav". */
  format: "mp3" | "flac" | "aac" | "ogg" | "wav";
  /** Sample rate of the input PCM. */
  sampleRate: number;
  /** Channel count of the input PCM (1 mono, 2 stereo). */
  channels: number;
  /** Average bitrate in bps. Used for lossy encoders (mp3 / aac / ogg). */
  bitrate?: number;
};

async function encode(samples: Int16Array, opts: EncodeOptions): Promise<Uint8Array> {
  if (!(await probe())) throw new Error(NOT_INSTALLED_MSG);
  if (opts.channels !== 1 && opts.channels !== 2) {
    throw new RangeError("audio.encode: channels must be 1 or 2");
  }
  if (opts.sampleRate <= 0) throw new RangeError("audio.encode: sampleRate must be > 0");
  // Map our format → ffmpeg muxer name + encoder name.
  const formatMap: Record<string, { fmt: string; codec: string; ext: string }> = {
    mp3: { fmt: "mp3", codec: "libmp3lame", ext: "mp3" },
    flac: { fmt: "flac", codec: "flac", ext: "flac" },
    aac: { fmt: "adts", codec: "aac", ext: "aac" },
    ogg: { fmt: "ogg", codec: "libvorbis", ext: "ogg" },
    wav: { fmt: "wav", codec: "pcm_s16le", ext: "wav" },
  };
  const m = formatMap[opts.format];
  if (!m) throw new RangeError(`audio.encode: unknown format "${opts.format}"`);

  // Write the encoded output to a temp file (ffmpeg's seekable output
  // is required for some muxers like mp4/aac). Read + unlink on
  // success.
  const outPath = nodePath.join(
    nodeOs.tmpdir(),
    `audio-encode-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.${m.ext}`,
  );
  const args: string[] = [
    "-v",
    "error",
    "-y",
    "-f",
    "s16le",
    "-ar",
    String(opts.sampleRate),
    "-ac",
    String(opts.channels),
    "-i",
    "pipe:0",
    "-c:a",
    m.codec,
  ];
  if (opts.bitrate !== undefined && opts.bitrate > 0) {
    args.push("-b:a", String(opts.bitrate));
  }
  args.push("-f", m.fmt, outPath);

  const proc = Bun.spawn({
    cmd: ["ffmpeg", ...args],
    stdin: "pipe",
    stdout: "ignore",
    stderr: "pipe",
  });

  // Pipe the PCM in. Need byte-LEVEL view of the Int16Array.
  const pcmBytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
  const stdin = proc.stdin as any;
  try {
    stdin.write(pcmBytes);
    if (typeof stdin.flush === "function") await stdin.flush();
    if (typeof stdin.end === "function") await stdin.end();
    else if (typeof stdin.close === "function") await stdin.close();
  } catch (e) {
    try {
      proc.kill();
    } catch {}
    throw e;
  }
  const [stderr, exitCode] = await Promise.all([proc.stderr.text(), proc.exited]);
  if (exitCode !== 0) {
    try {
      await nodeFs.unlink(outPath);
    } catch {}
    throw new Error(`audio.encode: ffmpeg exited ${exitCode}: ${stderr.trim()}`);
  }
  const bytes = await nodeFs.readFile(outPath);
  try {
    await nodeFs.unlink(outPath);
  } catch {}
  return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

export default { decode, encode, isAvailable: probe };
