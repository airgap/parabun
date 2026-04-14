// Batched baseline: plain JS scalar loop, serial over Q queries.
// Reference point for the batched bench — whatever a developer writes first.
//
// Output: gen_ms=... score_ms=... per_query_ms=... top=[batch-combined top-K]

import { generateBatch, N, D, K } from "./gen.js";

function scoreOne(embeddings, query) {
  const scores = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const off = i * D;
    let s = 0;
    for (let d = 0; d < D; d++) s += embeddings[off + d] * query[d];
    scores[i] = s;
  }
  return scores;
}

function topK(scores) {
  const ranked = new Array(N);
  for (let i = 0; i < N; i++) ranked[i] = { idx: i, score: scores[i] };
  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, K);
}

const tGen0 = Bun.nanoseconds();
const { embeddings, queries, Q } = generateBatch();
const genMs = (Bun.nanoseconds() - tGen0) / 1e6;

const tScore0 = Bun.nanoseconds();
const allTop = [];
for (let q = 0; q < Q; q++) {
  const queryView = queries.subarray(q * D, (q + 1) * D);
  const scores = scoreOne(embeddings, queryView);
  allTop.push(topK(scores));
}
const scoreMs = (Bun.nanoseconds() - tScore0) / 1e6;

// Sentinel top-K: concatenate all per-query indices for cross-variant matching.
const topStr = allTop.map(t => t.map(r => r.idx).join(":")).join(",");
console.log(
  `batched-baseline gen_ms=${genMs.toFixed(2)} score_ms=${scoreMs.toFixed(2)} per_query_ms=${(scoreMs / Q).toFixed(3)} Q=${Q} top=[${topStr}]`,
);
