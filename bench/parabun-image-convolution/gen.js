// Synthetic grayscale image for blur benchmarking. 2048 × 2048, one byte
// per pixel. Content: noisy gradient + a few sharp edges so a
// well-implemented blur is visibly doing its job (edges stay positioned,
// high-frequency noise smooths out). The hash of the output is what we
// compare between variants — bit-identical means same algorithm.

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
      const gradient = (x + y) / (W + H); // 0..1
      const noise = rng() * 0.15 - 0.075;
      let v = gradient + noise;
      // two sharp bands so blur is visibly smoothing something
      if ((y > 500 && y < 510) || (x > 1200 && x < 1210)) v = 1;
      img[y * W + x] = Math.max(0, Math.min(255, (v * 255) | 0));
    }
  }
  return img;
}

// 5-tap Gaussian kernel (sigma ≈ 1.0). Must sum to 1.0 exactly (in F32)
// so boundary-replicated passes stay DC-preserving.
export const KERNEL = new Float32Array([0.06136, 0.24477, 0.38774, 0.24477, 0.06136]);

// FNV-1a 32-bit hash of the output image — used to verify baseline and
// parabun variants compute bit-identical output.
export function fnv1a(bytes) {
  let h = 0x811c9dc5 | 0;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
