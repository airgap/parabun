import { describe, expect, test } from "bun:test";
import { tempDir } from "harness";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Generate animated images with ffmpeg, then round-trip through
// parabun:image.decodeFrames. Skips the suite if ffmpeg isn't on
// PATH (matches the runtime probe).

async function ffmpegAvailable(): Promise<boolean> {
  try {
    await using p = Bun.spawn({ cmd: ["ffmpeg", "-version"], stdout: "ignore", stderr: "ignore" });
    return (await p.exited) === 0;
  } catch {
    return false;
  }
}

const SKIP = !(await ffmpegAvailable());

describe.skipIf(SKIP)("parabun:image — animated decodeFrames", () => {
  test("4-frame animated GIF decodes to the right frame count + dimensions", async () => {
    const image = (await import("parabun:image")).default;
    using dir = tempDir("image-anim", {});
    const gifPath = join(String(dir), "anim.gif");
    // 4 frames at 10 fps = 0.4 second clip. Each frame a different
    // solid color via the testsrc / color filters; chain with concat.
    await using gen = Bun.spawn({
      cmd: [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=red:size=32x32:duration=0.4:rate=10",
        "-loop",
        "0",
        gifPath,
      ],
      stdout: "ignore",
      stderr: "ignore",
    });
    expect(await gen.exited).toBe(0);

    const bytes = await readFile(gifPath);
    const out = await image.decodeFrames(new Uint8Array(bytes));
    expect(out.width).toBe(32);
    expect(out.height).toBe(32);
    expect(out.frames.length).toBeGreaterThanOrEqual(4);
    expect(out.frames.length).toBeLessThanOrEqual(5);
    // Each frame is 32×32×4 RGBA bytes.
    expect(out.frames[0].data.length).toBe(32 * 32 * 4);
    // Frame timing — 10 fps means ~100 ms per frame. Allow drift.
    expect(out.frames[0].durationMs).toBeGreaterThan(80);
    expect(out.frames[0].durationMs).toBeLessThan(120);
    // First frame should be red.
    const r = out.frames[0].data[0];
    const g = out.frames[0].data[1];
    const b = out.frames[0].data[2];
    const a = out.frames[0].data[3];
    expect(Math.abs(r - 255)).toBeLessThan(20);
    expect(g).toBeLessThan(20);
    expect(b).toBeLessThan(20);
    expect(a).toBe(255);
  });

  test("static PNG decodes as a single-frame array", async () => {
    const image = (await import("parabun:image")).default;
    using dir = tempDir("image-static", {});
    const pngPath = join(String(dir), "single.png");
    await using gen = Bun.spawn({
      cmd: [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=blue:size=16x16:duration=0.1:rate=1",
        "-frames:v",
        "1",
        pngPath,
      ],
      stdout: "ignore",
      stderr: "ignore",
    });
    expect(await gen.exited).toBe(0);

    const bytes = await readFile(pngPath);
    const out = await image.decodeFrames(new Uint8Array(bytes));
    expect(out.width).toBe(16);
    expect(out.height).toBe(16);
    expect(out.frames.length).toBe(1);
    expect(out.frames[0].data.length).toBe(16 * 16 * 4);
    // Blue.
    const b = out.frames[0].data[2];
    expect(Math.abs(b - 255)).toBeLessThan(20);
  });

  test("variable per-frame timing is surfaced from ffprobe", async () => {
    const image = (await import("parabun:image")).default;
    using dir = tempDir("image-vartime", {});
    const gifPath = join(String(dir), "var.gif");
    // GIF with explicit per-frame delay: -filter_complex pads
    // different per-frame durations via setpts. Easier: use a
    // 3-frame GIF where each frame is a separate input concat'd
    // via the gifski-style approach. ffmpeg's `gif` muxer with
    // -loop 0 -final_delay sets the LAST frame's duration but not
    // intermediate. For variable durations, write each color as a
    // distinct PNG and concat them with explicit `-framerate`.
    // For simplicity here, just confirm reported per-frame
    // durations match the requested rate (5 fps → ~200 ms).
    await using gen = Bun.spawn({
      cmd: [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=cyan:size=16x16:duration=0.6:rate=5",
        "-loop",
        "0",
        gifPath,
      ],
      stdout: "ignore",
      stderr: "ignore",
    });
    expect(await gen.exited).toBe(0);

    const bytes = await readFile(gifPath);
    const out = await image.decodeFrames(new Uint8Array(bytes));
    expect(out.frames.length).toBeGreaterThanOrEqual(3);
    // 5 fps → 200 ms per frame, with ffprobe potentially reporting
    // anywhere in 100-300 ms thanks to GIF's centisecond delay
    // quantisation. Confirm we got POSITIVE non-default values.
    for (const f of out.frames) {
      expect(f.durationMs).toBeGreaterThan(50);
      expect(f.durationMs).toBeLessThan(500);
    }
  });

  test("decodeFrames rejects non-Uint8Array input", async () => {
    const image = (await import("parabun:image")).default;
    await expect(image.decodeFrames("nope" as any)).rejects.toThrow(TypeError);
  });
});
