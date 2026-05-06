// Batch-size sweep for the GPU matmul path. One process, one hold(), one
// transposed index; inner loop just varies Q and re-measures. Answers the
// natural next question after batched-run.ts: "how does per-query latency
// scale with batch size?"
//
//   bun run build:release bench/parabun-vector-search/sweep-run.ts
//
// At Q=1 we pay the full per-call overhead (kernel + DtoH(400 KB) + sync).
// As Q grows, the kernel compute portion scales linearly while the fixed
// overhead stays ~constant, so per-query latency drops until compute or
// PCIe bandwidth dominates.

import { GpuFloat32Array, matmul } from "parabun:gpu";
import { topK as simdTopK } from "@para/simd";
import { generate, N, D, K } from "./gen.js";

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f7) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randn(rng: () => number) {
  let u = 0;
  while (u === 0) u = rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function normalizeInPlace(buf: Float32Array, offset: number, dim: number) {
  let s = 0;
  for (let d = 0; d < dim; d++) {
    const v = buf[offset + d];
    s += v * v;
  }
  const inv = 1 / Math.sqrt(s);
  for (let d = 0; d < dim; d++) buf[offset + d] *= inv;
}

function generateQueries(Q: number): Float32Array {
  const rng = mulberry32(0xc0ffee ^ 0x51eed);
  const queries = new Float32Array(Q * D);
  for (let q = 0; q < Q; q++) {
    const off = q * D;
    for (let d = 0; d < D; d++) queries[off + d] = randn(rng);
    normalizeInPlace(queries, off, D);
  }
  return queries;
}

function transposeToDN(src: Float32Array, nRows: number, nCols: number): Float32Array {
  const out = new Float32Array(nRows * nCols);
  for (let r = 0; r < nRows; r++) {
    const srcOff = r * nCols;
    for (let c = 0; c < nCols; c++) {
      out[c * nRows + r] = src[srcOff + c];
    }
  }
  return out;
}

function stats(xs: number[]) {
  const sorted = [...xs].sort((a, b) => a - b);
  return { min: sorted[0], med: sorted[Math.floor(sorted.length / 2)], max: sorted[sorted.length - 1] };
}

const Q_VALUES = [1, 4, 16, 64, 256];
const RUNS = 7;

console.log(`Preparing index (N = ${N} × D = ${D} = ${((N * D * 4) / 1e6).toFixed(1)} MB)...`);
const { embeddings } = generate();
const embeddingsT = transposeToDN(embeddings, N, D);
using indexT = new GpuFloat32Array(embeddingsT);

// Warm one dispatch so first-call context-sync doesn't land on Q=1.
matmul(generateQueries(1), indexT, 1, D, N);

console.log(`\nbatch-size sweep on gpu.matmul (best-of-${RUNS})\n`);
console.log(
  `${"Q".padStart(4)}  ${"score_ms total (min/med/max)".padEnd(28)}  ${"per_query_ms (min/med/max)".padEnd(28)}  ${"matmul_ms (min/med)".padEnd(20)}  ${"topK_ms (min/med)"}`,
);

for (const Q of Q_VALUES) {
  const queries = generateQueries(Q);
  const totals: number[] = [];
  const perQuery: number[] = [];
  const matmulMs: number[] = [];
  const topKMs: number[] = [];
  for (let r = 0; r < RUNS; r++) {
    const t0 = Bun.nanoseconds();
    const scores = matmul(queries, indexT, Q, D, N);
    const t1 = Bun.nanoseconds();
    for (let q = 0; q < Q; q++) {
      const row = scores.subarray(q * N, (q + 1) * N);
      simdTopK(row, K);
    }
    const t2 = Bun.nanoseconds();
    const totalMs = (t2 - t0) / 1e6;
    totals.push(totalMs);
    perQuery.push(totalMs / Q);
    matmulMs.push((t1 - t0) / 1e6);
    topKMs.push((t2 - t1) / 1e6);
  }
  const tStats = stats(totals);
  const pStats = stats(perQuery);
  const mStats = stats(matmulMs);
  const kStats = stats(topKMs);
  const fmt3 = (x: { min: number; med: number; max: number }) =>
    `${x.min.toFixed(2)} / ${x.med.toFixed(2)} / ${x.max.toFixed(2)}`;
  const fmt2 = (x: { min: number; med: number }) => `${x.min.toFixed(2)} / ${x.med.toFixed(2)}`;
  console.log(
    `${String(Q).padStart(4)}  ${fmt3(tStats).padEnd(28)}  ${fmt3(pStats).padEnd(28)}  ${fmt2(mStats).padEnd(20)}  ${fmt2(kStats)}`,
  );
}
