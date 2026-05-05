import { describe, expect, test } from "bun:test";
import { tempDir } from "harness";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// HEIC / HEIF dispatch in image.decode. Skip-friendly when libheif
// isn't loadable. No round-trip: libheif's encoder needs libx265
// (separate vendored backend) which we don't ship — decode-only
// for v1.

async function libheifAvailable(): Promise<boolean> {
  try {
    const image = (await import("parabun:image")).default;
    // Probe via a magic-OK / body-bad HEIC buffer. If libheif IS
    // loadable, decode throws a libheif error (something other
    // than "libheif at runtime"); if libheif is missing, it throws
    // the explicit "libheif at runtime" install message.
    const fake = new Uint8Array(20);
    fake.set([0, 0, 0, 0x14, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63], 0);
    try {
      image.decode(fake);
      return true;
    } catch (e: any) {
      return !String(e?.message ?? e).includes("libheif at runtime");
    }
  } catch {
    return false;
  }
}

const SKIP = !(await libheifAvailable());

describe.skipIf(SKIP)("parabun:image — HEIF magic detection + dispatch", () => {
  test("decode routes HEIC magic-byte input through libheif (not the C++ codec)", async () => {
    const image = (await import("parabun:image")).default;
    for (const brand of ["heic", "heix", "heim", "heis", "mif1"]) {
      const fake = new Uint8Array(20);
      fake[3] = 0x14;
      fake[4] = 0x66;
      fake[5] = 0x74;
      fake[6] = 0x79;
      fake[7] = 0x70;
      fake[8] = brand.charCodeAt(0);
      fake[9] = brand.charCodeAt(1);
      fake[10] = brand.charCodeAt(2);
      fake[11] = brand.charCodeAt(3);
      let routedToHeif = false;
      try {
        image.decode(fake);
      } catch (e: any) {
        const msg = String(e?.message ?? e);
        // libheif's error path or its install hint both prove the
        // dispatch took the heif branch (the C++ JPEG/PNG decoder
        // would say "decode error" or fail at the magic-byte
        // check first).
        if (/heif|primary image/i.test(msg)) routedToHeif = true;
      }
      expect(routedToHeif).toBe(true);
    }
  });

  test("real PNG bypasses HEIF dispatch and decodes through the native codec", async () => {
    const image = (await import("parabun:image")).default;
    using dir = tempDir("heif-png", {});
    const pngPath = join(String(dir), "test.png");
    // Generate a real PNG with ffmpeg so the bytes are valid.
    await using gen = Bun.spawn({
      cmd: [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=blue:size=8x8:duration=0.04:rate=25",
        "-frames:v",
        "1",
        pngPath,
      ],
      stdout: "ignore",
      stderr: "ignore",
    });
    expect(await gen.exited).toBe(0);

    const bytes = await readFile(pngPath);
    const out = image.decode(new Uint8Array(bytes));
    expect(out.format).toBe("png");
    expect(out.width).toBe(8);
    expect(out.height).toBe(8);
    expect(out.channels).toBeGreaterThanOrEqual(3);
  });
});
