// Shared embedding + query generator. Deterministic so all variants see the
// same data and must produce the same top-K.
//
// N embeddings × D dims, each normalized to unit L2 norm (so cosine similarity
// == dot product). One query vector, also normalized.
//
// Box-Muller on a mulberry32 RNG. Not cryptographically anything — just a
// reproducible source of vaguely-gaussian floats.

export const N = 100_000;
export const D = 384;
export const K = 10;
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

function randn(rng) {
  let u = 0;
  while (u === 0) u = rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function normalizeInPlace(buf, offset, dim) {
  let s = 0;
  for (let d = 0; d < dim; d++) {
    const v = buf[offset + d];
    s += v * v;
  }
  const inv = 1 / Math.sqrt(s);
  for (let d = 0; d < dim; d++) buf[offset + d] *= inv;
}

export function generate({ shared = false } = {}) {
  const rng = mulberry32(SEED);
  const embBuf = shared ? new SharedArrayBuffer(N * D * 4) : new ArrayBuffer(N * D * 4);
  const embeddings = new Float32Array(embBuf);
  for (let i = 0; i < N; i++) {
    const off = i * D;
    for (let d = 0; d < D; d++) embeddings[off + d] = randn(rng);
    normalizeInPlace(embeddings, off, D);
  }
  const queryBuf = shared ? new SharedArrayBuffer(D * 4) : new ArrayBuffer(D * 4);
  const query = new Float32Array(queryBuf);
  for (let d = 0; d < D; d++) query[d] = randn(rng);
  normalizeInPlace(query, 0, D);
  return { embeddings, query };
}

// Batched-query variant: same embeddings (seeded identically to the single-query
// path so downstream variants can reuse the index), plus Q normalized queries
// generated from a secondary seed so they don't alias the single-query vector.
// Returned shape: queries is a (Q × D) row-major Float32Array.
export const Q_BATCH = 32;

export function generateBatch({ Q = Q_BATCH, shared = false } = {}) {
  const { embeddings } = generate({ shared });
  const queryRng = mulberry32(SEED ^ 0x51eed);
  const queryBuf = shared ? new SharedArrayBuffer(Q * D * 4) : new ArrayBuffer(Q * D * 4);
  const queries = new Float32Array(queryBuf);
  for (let q = 0; q < Q; q++) {
    const off = q * D;
    for (let d = 0; d < D; d++) queries[off + d] = randn(queryRng);
    normalizeInPlace(queries, off, D);
  }
  return { embeddings, queries, Q };
}
