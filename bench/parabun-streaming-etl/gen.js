// Synthetic sensor stream: N Float32 readings (voltage) that need a
// three-stage transform before aggregation:
//   1. scale to millivolts (* 1000)
//   2. drift-correct (+ 2.5)
//   3. calibrate (* 0.998)
//
// Then compute total integrated signal (sum).
//
// All three transforms are affine, so Parabun's pipeline fusion should
// collapse the chain to one SIMD pass.

export const N = 10_000_000;
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

export function generate() {
  const rng = mulberry32(SEED);
  const data = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    // rough voltage in [0, 5) V
    data[i] = rng() * 5;
  }
  return data;
}
