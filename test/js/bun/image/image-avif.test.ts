import { describe, expect, test } from "bun:test";

// AVIF round-trip via the libavif FFI binding. libavif is a runtime
// dependency on Linux (`apt install libavif16`) and macOS
// (`brew install libavif`); these tests skip themselves when the
// shared library isn't loadable so the suite stays portable. When
// it IS present we encode a hand-built RGBA gradient, decode it
// back, and verify the round-trip preserves dimensions + roughly
// the original pixel values (AVIF is YUV-quantized, so we allow a
// small per-channel delta rather than insisting on bit-exact).

async function avifAvailable(): Promise<boolean> {
  try {
    const image = (await import("parabun:image")).default;
    image.encode({ data: new Uint8Array(4), width: 1, height: 1, channels: 4, format: "png" }, { format: "avif" });
    return true;
  } catch (e: any) {
    if (String(e?.message ?? e).includes("libavif")) return false;
    return true;
  }
}

const SKIP = !(await avifAvailable());

describe.skipIf(SKIP)("parabun:image — AVIF codec", () => {
  test("encode + decode round-trip preserves dimensions and approximate pixels", async () => {
    const image = (await import("parabun:image")).default;
    const W = 64;
    const H = 48;
    const rgba = new Uint8Array(W * H * 4);
    // Continuous diagonal gradient with all 4 channels exercised.
    // Scale so max sample ≤ 255 — sharp wrap-around boundaries trigger
    // visible AVIF quantization artifacts that aren't a codec bug,
    // just a function of the input.
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        rgba[i] = Math.floor((x * 255) / W);
        rgba[i + 1] = Math.floor((y * 255) / H);
        rgba[i + 2] = Math.floor(((x + y) * 255) / (W + H));
        rgba[i + 3] = 255;
      }
    }
    const src = { data: rgba, width: W, height: H, channels: 4, format: "png" as const };
    const encoded = image.encode(src, { format: "avif" });
    expect(encoded).toBeInstanceOf(Uint8Array);
    expect(encoded.length).toBeGreaterThan(0);
    // Magic: 'ftyp' at byte 4-7 + 'avi[fs]' at 8-11.
    expect(encoded[4]).toBe(0x66);
    expect(encoded[5]).toBe(0x74);
    expect(encoded[6]).toBe(0x79);
    expect(encoded[7]).toBe(0x70);
    expect(encoded[8]).toBe(0x61);
    expect(encoded[9]).toBe(0x76);
    expect(encoded[10]).toBe(0x69);
    expect([0x66, 0x73]).toContain(encoded[11]);

    const decoded = image.decode(encoded);
    expect(decoded.width).toBe(W);
    expect(decoded.height).toBe(H);
    expect(decoded.channels).toBe(4);
    expect(decoded.format).toBe("avif");
    expect(decoded.data).toBeInstanceOf(Uint8Array);
    expect(decoded.data.length).toBe(W * H * 4);

    // YUV4:4:4 + libavif's default quantizer should give per-pixel
    // RGB error well under ~10 on smooth gradients. Be generous on
    // the threshold; this catches wholly-wrong decode paths
    // (channel swap, off-by-row), not codec quality.
    let maxDelta = 0;
    let totalDelta = 0;
    for (let i = 0; i < rgba.length; i++) {
      const d = Math.abs(rgba[i] - decoded.data[i]);
      if (d > maxDelta) maxDelta = d;
      totalDelta += d;
    }
    const avgDelta = totalDelta / rgba.length;
    expect(maxDelta).toBeLessThan(40);
    expect(avgDelta).toBeLessThan(10);
  });

  test("AVIF magic-byte input routes to AVIF decode automatically", async () => {
    const image = (await import("parabun:image")).default;
    const W = 16;
    const H = 16;
    const rgba = new Uint8Array(W * H * 4);
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = 200;
      rgba[i + 1] = 100;
      rgba[i + 2] = 50;
      rgba[i + 3] = 255;
    }
    const encoded = image.encode({ data: rgba, width: W, height: H, channels: 4, format: "png" }, { format: "avif" });
    const decoded = image.decode(encoded);
    expect(decoded.format).toBe("avif");
    expect(decoded.width).toBe(W);
    expect(decoded.height).toBe(H);
    for (const i of [0, 4 * 100, 4 * 200, 4 * 250]) {
      expect(Math.abs(decoded.data[i] - 200)).toBeLessThan(15);
      expect(Math.abs(decoded.data[i + 1] - 100)).toBeLessThan(15);
      expect(Math.abs(decoded.data[i + 2] - 50)).toBeLessThan(15);
      expect(decoded.data[i + 3]).toBe(255);
    }
  });

  test("3-channel RGB input is auto-padded to RGBA before AVIF encode", async () => {
    const image = (await import("parabun:image")).default;
    const W = 8;
    const H = 8;
    const rgb = new Uint8Array(W * H * 3);
    for (let i = 0; i < rgb.length; i += 3) {
      rgb[i] = 30;
      rgb[i + 1] = 60;
      rgb[i + 2] = 90;
    }
    const encoded = image.encode({ data: rgb, width: W, height: H, channels: 3, format: "jpeg" }, { format: "avif" });
    const decoded = image.decode(encoded);
    expect(decoded.width).toBe(W);
    expect(decoded.height).toBe(H);
    expect(decoded.channels).toBe(4);
    // First pixel should be roughly 30/60/90/255.
    expect(Math.abs(decoded.data[0] - 30)).toBeLessThan(15);
    expect(Math.abs(decoded.data[1] - 60)).toBeLessThan(15);
    expect(Math.abs(decoded.data[2] - 90)).toBeLessThan(15);
    expect(decoded.data[3]).toBe(255);
  });
});
