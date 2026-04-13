// Baseline: idiomatic plain JS, single-threaded. No Parabun features.
// The reference variants --simd and --pmap are compared against.
//
// Output: score_ms=... gen_ms=... total_ms=... top=[idx1,idx2,...]

import { generate, N, D, K } from "./gen.js";

function scoreAll(embeddings, query) {
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
  // Heap would be faster; this is the "idiomatic" JS version a developer
  // likely writes first — map to objects, sort, slice.
  const ranked = new Array(N);
  for (let i = 0; i < N; i++) ranked[i] = { idx: i, score: scores[i] };
  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, K);
}

const tGen0 = Bun.nanoseconds();
const { embeddings, query } = generate();
const genMs = (Bun.nanoseconds() - tGen0) / 1e6;

const tScore0 = Bun.nanoseconds();
const scores = scoreAll(embeddings, query);
const top = topK(scores);
const scoreMs = (Bun.nanoseconds() - tScore0) / 1e6;

const topStr = top.map(t => `${t.idx}:${t.score.toFixed(4)}`).join(",");
console.log(
  `baseline gen_ms=${genMs.toFixed(2)} score_ms=${scoreMs.toFixed(2)} total_ms=${(genMs + scoreMs).toFixed(2)} top=[${topStr}]`,
);
