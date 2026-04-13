// Baseline: single-threaded separable 5-tap Gaussian blur. Boundary
// handling is edge replication. This is what you'd write without a
// library — tight loops, clamp at the borders.

import { generate, KERNEL, W, H, fnv1a } from "./gen.js";

function blurH(src, dst, w, h, k) {
  const r = 2;
  const k0 = k[0],
    k1 = k[1],
    k2 = k[2],
    k3 = k[3],
    k4 = k[4];
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const x0 = x - r < 0 ? 0 : x - r;
      const x1 = x - 1 < 0 ? 0 : x - 1;
      const x3 = x + 1 >= w ? w - 1 : x + 1;
      const x4 = x + r >= w ? w - 1 : x + r;
      const v = src[row + x0] * k0 + src[row + x1] * k1 + src[row + x] * k2 + src[row + x3] * k3 + src[row + x4] * k4;
      dst[row + x] = v < 0 ? 0 : v > 255 ? 255 : v | 0;
    }
  }
}

function blurV(src, dst, w, h, k) {
  const r = 2;
  const k0 = k[0],
    k1 = k[1],
    k2 = k[2],
    k3 = k[3],
    k4 = k[4];
  for (let y = 0; y < h; y++) {
    const y0 = (y - r < 0 ? 0 : y - r) * w;
    const y1 = (y - 1 < 0 ? 0 : y - 1) * w;
    const y2 = y * w;
    const y3 = (y + 1 >= h ? h - 1 : y + 1) * w;
    const y4 = (y + r >= h ? h - 1 : y + r) * w;
    for (let x = 0; x < w; x++) {
      const v = src[y0 + x] * k0 + src[y1 + x] * k1 + src[y2 + x] * k2 + src[y3 + x] * k3 + src[y4 + x] * k4;
      dst[y2 + x] = v < 0 ? 0 : v > 255 ? 255 : v | 0;
    }
  }
}

const img = generate();
const intermediate = new Uint8Array(W * H);
const out = new Uint8Array(W * H);

const t0 = Bun.nanoseconds();
blurH(img, intermediate, W, H, KERNEL);
blurV(intermediate, out, W, H, KERNEL);
const ms = (Bun.nanoseconds() - t0) / 1e6;

console.log(`baseline score_ms=${ms.toFixed(2)} hash=${fnv1a(out)} size=${W}x${H}`);
