// Synthetic two-frame sequence for Lucas-Kanade optical flow benchmark.
// 2048 × 2048, one byte per pixel (4 MB per frame, 8 MB total). Frame B
// is frame A's content shifted by a known (SHIFT_X, SHIFT_Y), so the
// recovered flow field should be approximately (SHIFT_X, SHIFT_Y) at
// every textured pixel.
//
// Ground truth is used only for correctness sanity checking —
// comparison between variants is bit-identical hash of the two flow
// planes.

export const W = 2048;
export const H = 2048;
export const SIZE = W * H;
export const SEED = 0xc0ffee;

// Ground-truth shift: frame B is frame A shifted right by SHIFT_X and
// down by SHIFT_Y (subpixel), so B(x, y) ≈ A(x - SHIFT_X, y - SHIFT_Y)
// via bilinear sampling → recovered flow should approximate
// (SHIFT_X, SHIFT_Y). Kept subpixel because single-scale (non-pyramidal)
// Lucas-Kanade only holds within Taylor's linearization — roughly the
// range where |shift| < 1 pixel.
export const SHIFT_X = 0.4;
export const SHIFT_Y = -0.3;

// Lucas-Kanade window: 5 × 5 (radius 2).
export const WIN = 2;

// Determinant threshold below which a pixel is aperture-ambiguous and
// flow is set to (0, 0). Keep the constant in gen.js so all variants
// use the same cutoff.
export const DET_EPS = 1e-3;

const MARGIN = 8;
const SCENE_W = W + 2 * MARGIN;
const SCENE_H = H + 2 * MARGIN;

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

// A scene with broad low-frequency structure and a small amount of
// mid-band detail, so gradients are locally linear across a 5-pixel
// window and LK's Taylor-expansion assumption holds at 1-pixel shifts.
// Pure white noise would decorrelate between frames and collapse the
// cross term Σ Ix·It to ~0, yielding degenerate flow.
function buildScene() {
  const scene = new Uint8Array(SCENE_W * SCENE_H);
  const rng = mulberry32(SEED);
  for (let y = 0; y < SCENE_H; y++) {
    for (let x = 0; x < SCENE_W; x++) {
      const wave1 = Math.sin(x * 0.03 + y * 0.02);
      const wave2 = Math.cos(x * 0.06 - y * 0.07);
      const wave3 = Math.sin(x * 0.12 + y * 0.09);
      const smallNoise = rng() * 0.1 - 0.05;
      const v = 0.5 + 0.25 * wave1 + 0.15 * wave2 + 0.07 * wave3 + smallNoise;
      scene[y * SCENE_W + x] = Math.max(0, Math.min(255, (v * 255) | 0));
    }
  }
  return scene;
}

// Bilinear sample of scene at fractional (x, y). Caller ensures the
// 2×2 neighborhood is in-bounds (we only call this with MARGIN padding).
function sampleBilinear(scene, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const i00 = y0 * SCENE_W + x0;
  const i01 = i00 + 1;
  const i10 = i00 + SCENE_W;
  const i11 = i10 + 1;
  const v =
    (1 - fx) * (1 - fy) * scene[i00] + fx * (1 - fy) * scene[i01] + (1 - fx) * fy * scene[i10] + fx * fy * scene[i11];
  // Use Math.round (not `| 0`) so the per-pixel quantization error has
  // zero mean. `| 0` rounds toward zero, which leaves a -0.5 mean bias
  // in B that propagates into It = B - A and systematically overstates
  // recovered flow.
  return Math.max(0, Math.min(255, Math.round(v)));
}

export function generate({ shared = false } = {}) {
  const scene = buildScene();
  const makeBuf = () => (shared ? new SharedArrayBuffer(SIZE) : new ArrayBuffer(SIZE));

  const frameA = new Uint8Array(makeBuf());
  const frameB = new Uint8Array(makeBuf());

  // Both frames go through identical bilinear sampling so they have
  // matched smoothing characteristics. Sampling A directly (integer
  // scene lookup) and B through bilinear would leave B with a lower
  // effective gradient magnitude than A, which inflates recovered flow.
  // Shift each frame by ±half the ground-truth shift so the relative
  // shift between them is exactly (SHIFT_X, SHIFT_Y).
  const halfSX = SHIFT_X / 2;
  const halfSY = SHIFT_Y / 2;
  for (let y = 0; y < H; y++) {
    const ayF = y + MARGIN + halfSY;
    const byF = y + MARGIN - halfSY;
    for (let x = 0; x < W; x++) {
      const axF = x + MARGIN + halfSX;
      const bxF = x + MARGIN - halfSX;
      frameA[y * W + x] = sampleBilinear(scene, axF, ayF);
      frameB[y * W + x] = sampleBilinear(scene, bxF, byF);
    }
  }
  return { frameA, frameB };
}

// FNV-1a over a raw buffer (used for flow fields, Float32 or otherwise,
// read via Uint8Array view).
export function fnv1a(bytes) {
  let h = 0x811c9dc5 | 0;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
