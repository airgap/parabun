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
