// Gaussian-blob workload for k-means: K clusters of N/K points each,
// centered at random locations in [-3, 3]^D with unit-Gaussian noise.
// Returns both Array-of-Array (upstream) and Float32Array matrix (rewrite).
// Also yields `initCenters` — the same initial centroids for all runtimes,
// so the only difference between runs is the update/assignment kernel, not
// kmeans++ selection variance.

const SEED = 0xc0ffee;
const N = 20_000;
const D = 128;
const K = 16;

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

function randn(rng) {
  let u = 0;
  while (u === 0) u = rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function generate() {
  const rng = xorshift32(SEED);
  // Ground-truth blob centers
  const blobs = new Array(K);
  for (let k = 0; k < K; k++) {
    const c = new Array(D);
    // Moderate blob spacing → 4 iterations to converge.
    for (let d = 0; d < D; d++) c[d] = (rng() - 0.5) * 2;
    blobs[k] = c;
  }
  const data = new Array(N);
  const dataMat = new Float32Array(N * D);
  for (let i = 0; i < N; i++) {
    const k = i % K;
    const row = new Array(D);
    for (let d = 0; d < D; d++) {
      const v = blobs[k][d] + randn(rng);
      row[d] = v;
      dataMat[i * D + d] = v;
    }
    data[i] = row;
  }
  // Initial centers — first K data points, deterministic.
  const initCenters = new Array(K);
  const initCentersMat = new Float32Array(K * D);
  for (let k = 0; k < K; k++) {
    const row = new Array(D);
    for (let d = 0; d < D; d++) {
      const v = data[k][d];
      row[d] = v;
      initCentersMat[k * D + d] = v;
    }
    initCenters[k] = row;
  }
  return { data, dataMat, initCenters, initCentersMat, N, D, K };
}

export { generate, N, D, K };
