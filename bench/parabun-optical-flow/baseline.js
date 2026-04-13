// Baseline: single-threaded Lucas-Kanade optical flow.
//
// Two passes:
//   1. Precompute Ix, Iy (central differences on frame B) and It
//      (B - A) as Float32Array planes.
//   2. Per pixel, 5×5 window sum of (Ix², Ix·Iy, Iy², Ix·It, Iy·It),
//      then solve 2×2 linear system for (u, v).
//
// Output: two Float32Array planes (flowU, flowV), same dimensions as
// input. Hash of the concatenated output bytes is compared against the
// parabun variant.

import { generate, W, H, SIZE, WIN, DET_EPS, SHIFT_X, SHIFT_Y, fnv1a } from "./gen.js";

function computeGradients(frameA, frameB, Ix, Iy, It) {
  for (let y = 0; y < H; y++) {
    const yoff = y * W;
    const ym = (y - 1 < 0 ? 0 : y - 1) * W;
    const yp = (y + 1 >= H ? H - 1 : y + 1) * W;
    for (let x = 0; x < W; x++) {
      const xm = x - 1 < 0 ? 0 : x - 1;
      const xp = x + 1 >= W ? W - 1 : x + 1;
      Ix[yoff + x] = (frameB[yoff + xp] - frameB[yoff + xm]) * 0.5;
      Iy[yoff + x] = (frameB[yp + x] - frameB[ym + x]) * 0.5;
      It[yoff + x] = frameB[yoff + x] - frameA[yoff + x];
    }
  }
}

function lkSolve(Ix, Iy, It, flowU, flowV) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let Axx = 0,
        Axy = 0,
        Ayy = 0,
        bx = 0,
        by = 0;
      for (let wy = -WIN; wy <= WIN; wy++) {
        const yy = y + wy < 0 ? 0 : y + wy >= H ? H - 1 : y + wy;
        const yoff = yy * W;
        for (let wx = -WIN; wx <= WIN; wx++) {
          const xx = x + wx < 0 ? 0 : x + wx >= W ? W - 1 : x + wx;
          const ix = Ix[yoff + xx];
          const iy = Iy[yoff + xx];
          const it = It[yoff + xx];
          Axx += ix * ix;
          Axy += ix * iy;
          Ayy += iy * iy;
          bx += ix * it;
          by += iy * it;
        }
      }
      const det = Axx * Ayy - Axy * Axy;
      let u = 0,
        v = 0;
      if (det > DET_EPS || det < -DET_EPS) {
        u = -(Ayy * bx - Axy * by) / det;
        v = -(-Axy * bx + Axx * by) / det;
      }
      flowU[y * W + x] = u;
      flowV[y * W + x] = v;
    }
  }
}

const { frameA, frameB } = generate();
const Ix = new Float32Array(SIZE);
const Iy = new Float32Array(SIZE);
const It = new Float32Array(SIZE);
const flowU = new Float32Array(SIZE);
const flowV = new Float32Array(SIZE);

const t0 = Bun.nanoseconds();
computeGradients(frameA, frameB, Ix, Iy, It);
lkSolve(Ix, Iy, It, flowU, flowV);
const ms = (Bun.nanoseconds() - t0) / 1e6;

// Ground-truth sanity: mean recovered flow over valid pixels.
let sumU = 0,
  sumV = 0,
  n = 0;
for (let i = 0; i < SIZE; i++) {
  if (flowU[i] !== 0 || flowV[i] !== 0) {
    sumU += flowU[i];
    sumV += flowV[i];
    n++;
  }
}
const meanU = n > 0 ? sumU / n : 0;
const meanV = n > 0 ? sumV / n : 0;

const hashU = fnv1a(new Uint8Array(flowU.buffer));
const hashV = fnv1a(new Uint8Array(flowV.buffer));

console.log(
  `baseline score_ms=${ms.toFixed(2)} hash=${hashU}${hashV} ` +
    `u_mean=${meanU.toFixed(3)} v_mean=${meanV.toFixed(3)} ` +
    `expected=(${SHIFT_X},${SHIFT_Y}) size=${W}x${H}`,
);
