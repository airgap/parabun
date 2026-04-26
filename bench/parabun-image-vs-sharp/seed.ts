// Generate deterministic image fixtures used by run.ts. Encoded with
// Sharp so the JPEG / PNG byte streams match what real workloads
// see (same libjpeg / libpng tuning Sharp exposes by default).
//
//   bun run bench/parabun-image-vs-sharp/seed.ts

import sharp from "sharp";

const HERE = new URL(".", import.meta.url).pathname;

// LCG so the fixture is byte-identical across machines.
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s;
  };
}

function generatePixels(w: number, h: number): Buffer {
  // Smooth gradient + procedural noise. Enough variation to keep JPEG
  // honest (a flat pixel block compresses to a few KB and the codec
  // bench gets meaningless) but still deterministic.
  const rng = lcg(0x1234abcd);
  const buf = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const off = (y * w + x) * 3;
      const noise = (rng() & 0x3f) - 32;
      buf[off + 0] = Math.max(0, Math.min(255, (x * 255) / w + noise));
      buf[off + 1] = Math.max(0, Math.min(255, (y * 255) / h + noise));
      buf[off + 2] = Math.max(0, Math.min(255, ((x + y) * 127) / (w + h) + noise));
    }
  }
  return buf;
}

async function emit(name: string, w: number, h: number) {
  const raw = generatePixels(w, h);
  // JPEG and PNG variants of the same source pixels.
  const jpegPath = `${HERE}fixture-${name}.jpg`;
  const pngPath = `${HERE}fixture-${name}.png`;
  await sharp(raw, { raw: { width: w, height: h, channels: 3 } })
    .jpeg({ quality: 85, mozjpeg: false })
    .toFile(jpegPath);
  await sharp(raw, { raw: { width: w, height: h, channels: 3 } })
    .png({ compressionLevel: 6 })
    .toFile(pngPath);
  const fs = await import("node:fs/promises");
  const jpegSize = (await fs.stat(jpegPath)).size;
  const pngSize = (await fs.stat(pngPath)).size;
  console.log(
    `${name.padEnd(7)} ${w}×${h}  JPEG ${(jpegSize / 1024).toFixed(1)} KB  PNG ${(pngSize / 1024).toFixed(1)} KB`,
  );
}

await emit("small", 512, 512);
await emit("medium", 2048, 2048);
await emit("large", 4096, 4096);
