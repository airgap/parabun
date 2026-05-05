import { describe, expect, test } from "bun:test";
import { tempDir } from "harness";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Generate a tiny synthetic mp4 with ffmpeg, then round-trip it
// through parabun:video to confirm the libavcodec subprocess path
// produces correct RGBA frames. Skips the suite if ffmpeg isn't on
// PATH (matching the runtime probe — same dlopen-style "install
// ffmpeg" UX).

async function ffmpegAvailable(): Promise<boolean> {
  try {
    await using p = Bun.spawn({ cmd: ["ffmpeg", "-version"], stdout: "ignore", stderr: "ignore" });
    return (await p.exited) === 0;
  } catch {
    return false;
  }
}

const SKIP = !(await ffmpegAvailable());

describe.skipIf(SKIP)("parabun:video — ffmpeg decode", () => {
  test("decodes a 64x64 H.264 mp4 into RGBA frames", async () => {
    const video = (await import("parabun:video")).default;
    using dir = tempDir("video-decode", {});
    const mp4Path = join(String(dir), "red.mp4");
    // 1 second of solid red at 10 fps, 64x64. yuv420p is what
    // libx264 writes by default; rgba comes back through swscale.
    await using gen = Bun.spawn({
      cmd: [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=red:size=64x64:duration=1:rate=10",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        mp4Path,
      ],
      stdout: "ignore",
      stderr: "ignore",
    });
    const genExit = await gen.exited;
    expect(genExit).toBe(0);

    const bytes = await readFile(mp4Path);
    const dec = await video.decode(new Uint8Array(bytes));
    expect(dec.width).toBe(64);
    expect(dec.height).toBe(64);
    expect(dec.codec).toBe("h264");
    let count = 0;
    let first: { data: Uint8Array; width: number; height: number } | null = null;
    for await (const f of dec.frames()) {
      if (count === 0) first = f as any;
      count++;
    }
    await dec.close();
    expect(count).toBe(10);
    expect(first).toBeDefined();
    expect(first!.width).toBe(64);
    expect(first!.height).toBe(64);
    expect(first!.data.length).toBe(64 * 64 * 4);
    // First pixel should be approximately red. libx264 + yuv420p
    // round-trip puts a small chroma-quantization error in; allow up
    // to ~6 codepoint drift and confirm R dominates G + B.
    const r = first!.data[0];
    const g = first!.data[1];
    const b = first!.data[2];
    const a = first!.data[3];
    expect(Math.abs(r - 255)).toBeLessThan(15);
    expect(g).toBeLessThan(20);
    expect(b).toBeLessThan(20);
    expect(a).toBe(255);
  });

  test("startMs / endMs trim the decoded frame range", async () => {
    const video = (await import("parabun:video")).default;
    using dir = tempDir("video-trim", {});
    const mp4Path = join(String(dir), "blue.mp4");
    // 2 seconds at 10 fps = 20 frames. We'll ask for [500ms, 1500ms]
    // and expect roughly 10 frames.
    await using gen = Bun.spawn({
      cmd: [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=blue:size=32x32:duration=2:rate=10",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        mp4Path,
      ],
      stdout: "ignore",
      stderr: "ignore",
    });
    expect(await gen.exited).toBe(0);

    const bytes = await readFile(mp4Path);
    const dec = await video.decode(new Uint8Array(bytes), { startMs: 500, endMs: 1500 });
    let count = 0;
    for await (const _ of dec.frames()) count++;
    await dec.close();
    // ffmpeg's seek-then-trim is approximate at the keyframe level;
    // accept a window around the expected 10 frames.
    expect(count).toBeGreaterThanOrEqual(7);
    expect(count).toBeLessThanOrEqual(13);
  });

  test("encode + decode round-trip preserves dimensions and approximate frame content", async () => {
    const video = (await import("parabun:video")).default;
    const W = 64;
    const H = 64;
    const FPS = 10;
    const FRAMES = 8;
    // Build FRAMES synthetic frames: a horizontal red→green gradient
    // that cycles vertically with the frame index. Color values
    // bounded so libx264 + yuv420p chroma quantisation doesn't blow
    // the post-decode tolerance.
    const enc = await video.encode({
      codec: "h264",
      container: "mp4",
      width: W,
      height: H,
      fps: FPS,
    });
    for (let f = 0; f < FRAMES; f++) {
      const rgba = new Uint8Array(W * H * 4);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          rgba[i] = Math.floor((x * 255) / (W - 1));
          rgba[i + 1] = Math.floor((y * 255) / (H - 1));
          rgba[i + 2] = (f * 30) & 0xff;
          rgba[i + 3] = 255;
        }
      }
      await enc.pushFrame({ data: rgba, width: W, height: H, pixelFormat: "rgba" });
    }
    expect(enc.bytesWritten).toBe(W * H * 4 * FRAMES);
    const mp4 = (await enc.finalize()) as Uint8Array;
    expect(mp4).toBeInstanceOf(Uint8Array);
    expect(mp4.length).toBeGreaterThan(100);
    // Magic: 'ftyp' at byte 4.
    expect(mp4[4]).toBe(0x66);
    expect(mp4[5]).toBe(0x74);
    expect(mp4[6]).toBe(0x79);
    expect(mp4[7]).toBe(0x70);

    // Decode and check basic invariants.
    const dec = await video.decode(mp4);
    expect(dec.width).toBe(W);
    expect(dec.height).toBe(H);
    expect(dec.codec).toBe("h264");
    let count = 0;
    let lastFrame: { data: Uint8Array } | null = null;
    for await (const fr of dec.frames()) {
      lastFrame = fr as any;
      count++;
    }
    await dec.close();
    expect(count).toBe(FRAMES);
    expect(lastFrame).toBeDefined();
    // Spot-check the gradient survived: top-left pixel ~(0, 0, _, 255).
    expect(lastFrame!.data[0]).toBeLessThan(20);
    expect(lastFrame!.data[1]).toBeLessThan(20);
    expect(lastFrame!.data[3]).toBe(255);
  });

  test("encode rejects mismatched frame size", async () => {
    const video = (await import("parabun:video")).default;
    const enc = await video.encode({ codec: "h264", container: "mp4", width: 16, height: 16, fps: 5 });
    await expect(
      enc.pushFrame({ data: new Uint8Array(100), width: 16, height: 16, pixelFormat: "rgba" }),
    ).rejects.toThrow(/frame length/);
    await enc.close();
  });

  test("extractAudio pulls 16 kHz mono PCM from a video with a sine soundtrack", async () => {
    const video = (await import("parabun:video")).default;
    using dir = tempDir("video-audio", {});
    const mp4Path = join(String(dir), "tone.mp4");
    // 1 second of 440 Hz sine at 44.1 kHz mono, paired with a 32×32
    // green video so we have a real container with both streams.
    await using gen = Bun.spawn({
      cmd: [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=green:size=32x32:duration=1:rate=10",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:duration=1:sample_rate=44100",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        mp4Path,
      ],
      stdout: "ignore",
      stderr: "ignore",
    });
    expect(await gen.exited).toBe(0);

    const bytes = await readFile(mp4Path);
    const out = await video.extractAudio(new Uint8Array(bytes));
    expect(out.sampleRate).toBe(16000);
    expect(out.channels).toBe(1);
    // 1-second clip resampled to 16 kHz mono → ~16000 samples; ffmpeg
    // can drop a few at the edges so allow a 5% margin.
    expect(out.samples.length).toBeGreaterThan(15000);
    expect(out.samples.length).toBeLessThan(17000);
    expect(out.durationMs).toBeGreaterThan(900);
    expect(out.durationMs).toBeLessThan(1100);
    // Confirm we got non-silent audio: peak should exceed a few
    // thousand. (sine at 440 Hz at unit amplitude → samples in the
    // tens of thousands range.)
    let peak = 0;
    for (let i = 0; i < out.samples.length; i++) {
      const v = Math.abs(out.samples[i]);
      if (v > peak) peak = v;
    }
    expect(peak).toBeGreaterThan(2000);
  });

  test("extractAudio respects custom sampleRate + stereo channels", async () => {
    const video = (await import("parabun:video")).default;
    using dir = tempDir("video-audio-stereo", {});
    const mp4Path = join(String(dir), "stereo.mp4");
    await using gen = Bun.spawn({
      cmd: [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=blue:size=16x16:duration=1:rate=5",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=220:duration=1:sample_rate=44100,pan=stereo|c0=c0|c1=c0",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        mp4Path,
      ],
      stdout: "ignore",
      stderr: "ignore",
    });
    expect(await gen.exited).toBe(0);

    const bytes = await readFile(mp4Path);
    const out = await video.extractAudio(new Uint8Array(bytes), { sampleRate: 22050, channels: 2 });
    expect(out.sampleRate).toBe(22050);
    expect(out.channels).toBe(2);
    // 22050 Hz × 2 channels × 1 second ≈ 44100 samples. Allow ±5%
    // for resampler tail / encoder padding.
    expect(out.samples.length).toBeGreaterThan(42000);
    expect(out.samples.length).toBeLessThan(46500);
  });

  test("extractAudio rejects video-only input with a clean error", async () => {
    const video = (await import("parabun:video")).default;
    using dir = tempDir("video-audio-none", {});
    const mp4Path = join(String(dir), "silent.mp4");
    await using gen = Bun.spawn({
      cmd: [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=red:size=16x16:duration=1:rate=5",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-an",
        mp4Path,
      ],
      stdout: "ignore",
      stderr: "ignore",
    });
    expect(await gen.exited).toBe(0);

    const bytes = await readFile(mp4Path);
    await expect(video.extractAudio(new Uint8Array(bytes))).rejects.toThrow(
      /no audio track|Output file does not contain any stream/i,
    );
  });

  test("thumbnail extracts a single RGBA frame at default midpoint", async () => {
    const video = (await import("parabun:video")).default;
    using dir = tempDir("video-thumb-mid", {});
    const mp4Path = join(String(dir), "magenta.mp4");
    // 2-second magenta clip at 32×32, 5 fps. Midpoint = 1000 ms.
    await using gen = Bun.spawn({
      cmd: [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=magenta:size=32x32:duration=2:rate=5",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        mp4Path,
      ],
      stdout: "ignore",
      stderr: "ignore",
    });
    expect(await gen.exited).toBe(0);

    const bytes = await readFile(mp4Path);
    const thumb = await video.thumbnail(new Uint8Array(bytes));
    expect(thumb.width).toBe(32);
    expect(thumb.height).toBe(32);
    expect(thumb.data.length).toBe(32 * 32 * 4);
    // Default seek = 1000 ms (midpoint of 2s clip).
    expect(thumb.ptsMs).toBe(1000);
    // Magenta = (255, 0, 255). Allow chroma drift.
    const r = thumb.data[0],
      g = thumb.data[1],
      b = thumb.data[2],
      a = thumb.data[3];
    expect(Math.abs(r - 255)).toBeLessThan(20);
    expect(g).toBeLessThan(20);
    expect(Math.abs(b - 255)).toBeLessThan(20);
    expect(a).toBe(255);
  });

  test("thumbnail respects an explicit ptsMs", async () => {
    const video = (await import("parabun:video")).default;
    using dir = tempDir("video-thumb-pts", {});
    const mp4Path = join(String(dir), "yellow.mp4");
    await using gen = Bun.spawn({
      cmd: [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=yellow:size=16x16:duration=3:rate=10",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-g",
        "5",
        mp4Path,
      ],
      stdout: "ignore",
      stderr: "ignore",
    });
    expect(await gen.exited).toBe(0);

    const bytes = await readFile(mp4Path);
    const thumb = await video.thumbnail(new Uint8Array(bytes), 2200);
    expect(thumb.width).toBe(16);
    expect(thumb.height).toBe(16);
    expect(thumb.ptsMs).toBe(2200);
    // Yellow ≈ (255, 255, 0).
    const r = thumb.data[0],
      g = thumb.data[1],
      b = thumb.data[2];
    expect(Math.abs(r - 255)).toBeLessThan(25);
    expect(Math.abs(g - 255)).toBeLessThan(25);
    expect(b).toBeLessThan(25);
  });

  test("probe falls back to ffprobe for non-MP4/Matroska containers (FLV)", async () => {
    const video = (await import("parabun:video")).default;
    using dir = tempDir("video-probe-flv", {});
    const flvPath = join(String(dir), "test.flv");
    await using gen = Bun.spawn({
      cmd: [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=red:size=32x32:duration=1:rate=10",
        "-f",
        "lavfi",
        "-i",
        "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-c:v",
        "flv1",
        "-c:a",
        "mp3",
        "-shortest",
        flvPath,
      ],
      stdout: "ignore",
      stderr: "ignore",
    });
    expect(await gen.exited).toBe(0);

    const bytes = await readFile(flvPath);
    const info = await video.probe(new Uint8Array(bytes));
    // FLV maps to "auto" since none of our Container constants
    // match it; what matters is we got past the
    // "container not recognized" rejection and parsed the streams.
    const videoStream = info.streams.find(s => s.kind === "video") as any;
    expect(videoStream).toBeDefined();
    expect(videoStream.width).toBe(32);
    expect(videoStream.height).toBe(32);
    const audioStream = info.streams.find(s => s.kind === "audio") as any;
    expect(audioStream).toBeDefined();
    expect(audioStream.sampleRate).toBe(44100);
    expect(audioStream.channels).toBe(2);
  });

  test("accel: 'none' forces software decode regardless of HW availability", async () => {
    const video = (await import("parabun:video")).default;
    using dir = tempDir("video-accel-none", {});
    const mp4Path = join(String(dir), "sw.mp4");
    // 128×128 is above the 64px HW-auto threshold, so this would
    // pick HW under "auto" on this box. Force software.
    await using gen = Bun.spawn({
      cmd: [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=red:size=128x128:duration=0.4:rate=10",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        mp4Path,
      ],
      stdout: "ignore",
      stderr: "ignore",
    });
    expect(await gen.exited).toBe(0);

    const bytes = await readFile(mp4Path);
    const dec = await video.decode(new Uint8Array(bytes), { accel: "none" });
    expect(dec.width).toBe(128);
    let count = 0;
    for await (const _ of dec.frames()) count++;
    await dec.close();
    expect(count).toBe(4);
  });

  test("accel: 'cuda' throws cleanly if cuvid isn't available", async () => {
    const video = (await import("parabun:video")).default;
    using dir = tempDir("video-accel-cuda", {});
    const mp4Path = join(String(dir), "test.mp4");
    await using gen = Bun.spawn({
      cmd: [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=red:size=128x128:duration=0.1:rate=10",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        mp4Path,
      ],
      stdout: "ignore",
      stderr: "ignore",
    });
    expect(await gen.exited).toBe(0);
    const bytes = await readFile(mp4Path);
    // If cuvid IS available on this box, the call succeeds — our
    // assertion is the throw IF it's not. Probe ffmpeg for h264_cuvid
    // first so we only assert the error path when applicable.
    await using dec = Bun.spawn({ cmd: ["ffmpeg", "-hide_banner", "-decoders"], stdout: "pipe", stderr: "ignore" });
    const decList = await dec.stdout.text();
    const hasCuvid = decList.includes("h264_cuvid");
    if (!hasCuvid) {
      await expect(video.decode(new Uint8Array(bytes), { accel: "cuda" })).rejects.toThrow(
        /cuda HW decode for "h264" not available/,
      );
    } else {
      // Box has cuvid — accept either success OR a known cuvid
      // error (e.g. dimension constraint with a slightly-too-small
      // frame). We just want NO unhandled crash.
      try {
        const d = await video.decode(new Uint8Array(bytes), { accel: "cuda" });
        await d.close();
      } catch (e: any) {
        expect(String(e?.message ?? e)).toMatch(/h264|cuvid|cuda/);
      }
    }
  });

  test("close() before iterating doesn't leak the subprocess", async () => {
    const video = (await import("parabun:video")).default;
    using dir = tempDir("video-close", {});
    const mp4Path = join(String(dir), "g.mp4");
    await using gen = Bun.spawn({
      cmd: [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=green:size=16x16:duration=1:rate=5",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        mp4Path,
      ],
      stdout: "ignore",
      stderr: "ignore",
    });
    expect(await gen.exited).toBe(0);

    const bytes = await readFile(mp4Path);
    const dec = await video.decode(new Uint8Array(bytes));
    // Drop iterator immediately and close — should resolve cleanly.
    await dec.close();
  });
});
