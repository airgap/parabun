// Deterministic xorshift-based workload generator. Returns both:
//   - plain Array<number> views (for the upstream lib path — it takes
//     generic arrays, not typed arrays)
//   - Float32Array views (for the Parabun rewrite — @para/simd.dot wants a
//     contiguous typed array)
// Same numeric values either way, so cosine-similarity results match.

const SEED = 0xc0ffee;

function xorshift32(state) {
  let s = state >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
}

function generatePair(D, offset) {
  const rng = xorshift32(SEED ^ offset);
  const xF = new Float32Array(D);
  const yF = new Float32Array(D);
  for (let i = 0; i < D; i++) {
    xF[i] = rng() * 2 - 1;
    yF[i] = rng() * 2 - 1;
  }
  // Plain arrays for the upstream library (which iterates with callback-style).
  const x = Array.from(xF);
  const y = Array.from(yF);
  return { x, y, xF, yF };
}

function generateBatch(N, D) {
  // N pairs. Returns packed Float32Array matrices (N × D) and a list of
  // plain-array pairs for the upstream lib.
  const rng = xorshift32(SEED);
  const xMat = new Float32Array(N * D);
  const yMat = new Float32Array(N * D);
  for (let i = 0; i < N * D; i++) {
    xMat[i] = rng() * 2 - 1;
    yMat[i] = rng() * 2 - 1;
  }
  const pairs = new Array(N);
  for (let q = 0; q < N; q++) {
    const x = new Array(D);
    const y = new Array(D);
    for (let d = 0; d < D; d++) {
      x[d] = xMat[q * D + d];
      y[d] = yMat[q * D + d];
    }
    pairs[q] = { x, y };
  }
  return { pairs, xMat, yMat };
}

module.exports = { generatePair, generateBatch };
