// Synthetic embeddings shaped like what `@xenova/transformers`
// `Xenova/all-MiniLM-L6-v2` would produce: D=384, unit L2 norm.
//
// Returns `number[][]` because that's what LangChain's
// `addVectors(vectors: number[][], documents: Document[])` expects, plus a
// matching SAB-packed Float32Array for the Parabun variant — same numeric
// content, two different shapes.

export const N = 100_000;
export const D = 384;
export const K = 10;
export const SEED = 0xc0ffee;

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f7) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randn(rng: () => number): number {
  let u = 0;
  while (u === 0) u = rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function generate(opts: { shared?: boolean } = {}) {
  const rng = mulberry32(SEED);

  // Shared backing buffer — both shapes draw from the same numbers in the
  // same order, so the two stores are bit-identical inputs.
  const packedBuf = opts.shared ? new SharedArrayBuffer(N * D * 4) : new ArrayBuffer(N * D * 4);
  const packed = new Float32Array(packedBuf);

  const vectors: number[][] = new Array(N);
  for (let i = 0; i < N; i++) {
    const off = i * D;
    let s = 0;
    for (let d = 0; d < D; d++) {
      const x = randn(rng);
      packed[off + d] = x;
      s += x * x;
    }
    const inv = 1 / Math.sqrt(s);
    const row = new Array<number>(D);
    for (let d = 0; d < D; d++) {
      packed[off + d] *= inv;
      row[d] = packed[off + d];
    }
    vectors[i] = row;
  }

  const queryBuf = opts.shared ? new SharedArrayBuffer(D * 4) : new ArrayBuffer(D * 4);
  const query = new Float32Array(queryBuf);
  let qs = 0;
  for (let d = 0; d < D; d++) {
    const x = randn(rng);
    query[d] = x;
    qs += x * x;
  }
  const qinv = 1 / Math.sqrt(qs);
  const queryArr = new Array<number>(D);
  for (let d = 0; d < D; d++) {
    query[d] *= qinv;
    queryArr[d] = query[d];
  }

  return { vectors, queryArr, packed, query };
}
