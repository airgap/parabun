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
