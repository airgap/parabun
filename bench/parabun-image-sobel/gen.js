// Synthetic grayscale image for Sobel edge-detection benchmarking.
// 8192 × 8192, one byte per pixel (64 MB). Content: noisy gradient
// with sharp horizontal and vertical bands so Sobel has rich edges to
// detect. Hash of the output is what we compare between variants —
// bit-identical means same algorithm.

export const W = 8192;
export const H = 8192;
export const SIZE = W * H;
export const SEED = 0xc0ffee;

function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f7) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generate({ shared = false } = {}) {
  const rng = mulberry32(SEED);
  const buf = shared ? new SharedArrayBuffer(SIZE) : new ArrayBuffer(SIZE);
  const img = new Uint8Array(buf);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const gradient = (x + y) / (W + H);
      const noise = rng() * 0.15 - 0.075;
      let v = gradient + noise;
      if ((y > 500 && y < 510) || (x > 1200 && x < 1210)) v = 1;
      if ((y > 3000 && y < 3004) || (x > 5000 && x < 5004)) v = 0;
      img[y * W + x] = Math.max(0, Math.min(255, (v * 255) | 0));
    }
  }
  return img;
}

// Sobel kernels.
// Gx = [[-1, 0, +1], [-2, 0, +2], [-1, 0, +1]]
// Gy = [[-1, -2, -1], [ 0,  0,  0], [+1, +2, +1]]
// Output: magnitude = min(255, sqrt(gx² + gy²)).

export function fnv1a(bytes) {
  let h = 0x811c9dc5 | 0;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
