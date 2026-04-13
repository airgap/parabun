// Baseline: single-threaded Sobel edge detection. 3x3 Gx and Gy
// convolutions applied together per pixel, then magnitude =
// min(255, sqrt(gx² + gy²)). Boundary: edge replication.

import { generate, W, H, fnv1a } from "./gen.js";

function sobel(src, dst, w, h) {
  for (let y = 0; y < h; y++) {
    const ym = (y - 1 < 0 ? 0 : y - 1) * w;
    const yc = y * w;
    const yp = (y + 1 >= h ? h - 1 : y + 1) * w;
    for (let x = 0; x < w; x++) {
      const xm = x - 1 < 0 ? 0 : x - 1;
      const xp = x + 1 >= w ? w - 1 : x + 1;

      const a00 = src[ym + xm],
        a01 = src[ym + x],
        a02 = src[ym + xp];
      const a10 = src[yc + xm],
        /* a11 unused */ a12 = src[yc + xp];
      const a20 = src[yp + xm],
        a21 = src[yp + x],
        a22 = src[yp + xp];

      const gx = -a00 + a02 - 2 * a10 + 2 * a12 - a20 + a22;
      const gy = -a00 - 2 * a01 - a02 + a20 + 2 * a21 + a22;

      const mag = Math.sqrt(gx * gx + gy * gy);
      dst[yc + x] = mag > 255 ? 255 : mag | 0;
    }
  }
}

const img = generate();
const out = new Uint8Array(W * H);

const t0 = Bun.nanoseconds();
sobel(img, out, W, H);
const ms = (Bun.nanoseconds() - t0) / 1e6;

console.log(`baseline score_ms=${ms.toFixed(2)} hash=${fnv1a(out)} size=${W}x${H}`);
