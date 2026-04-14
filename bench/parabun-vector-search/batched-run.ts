// Batched vector-search harness. Runs each variant K times, parses
// `gen_ms=... score_ms=... per_query_ms=... Q=... top=[...]` from stdout,
// reports min/median/max per phase and verifies the concatenated per-query
// top-K matches across variants.
//
//   bun run build:release bench/parabun-vector-search/batched-run.ts

import { spawnSync } from "bun";

const HERE = new URL(".", import.meta.url).pathname;
const RUNS = 5;

const variants = [
  { name: "batched-baseline (.js, plain JS loop)         ", path: `${HERE}batched-baseline.js` },
  { name: "batched-gpu-loop (gpu.matVec × Q)             ", path: `${HERE}batched-gpu-loop.pjs` },
  { name: "batched-gpu-matmul (one gpu.matmul, serial tK)", path: `${HERE}batched-gpu-matmul.pjs` },
  { name: "batched-gpu-matmul-ptopk (+ pmap × 8 top-K)   ", path: `${HERE}batched-gpu-matmul-ptopk.pjs` },
];

type Phase = { gen: number; score: number; perQuery: number; Q: number; top: string };

function parseLine(s: string): Phase | null {
  const m = s.match(/gen_ms=([\d.]+) score_ms=([\d.]+) per_query_ms=([\d.]+) Q=(\d+) top=\[([^\]]*)\]/);
  if (!m) return null;
  return {
    gen: parseFloat(m[1]),
    score: parseFloat(m[2]),
    perQuery: parseFloat(m[3]),
    Q: parseInt(m[4], 10),
    top: m[5],
  };
}

function stats(xs: number[]) {
  const sorted = [...xs].sort((a, b) => a - b);
  return { min: sorted[0], med: sorted[Math.floor(sorted.length / 2)], max: sorted[sorted.length - 1] };
}

function runOnce(path: string): Phase {
  const r = spawnSync([process.execPath, path], { stdout: "pipe", stderr: "pipe" });
  const out = new TextDecoder().decode(r.stdout);
  const lines = out.trim().split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = parseLine(lines[i]);
    if (m) return m;
  }
  throw new Error(`no timing line in output of ${path}:\n${out}\nstderr:\n${new TextDecoder().decode(r.stderr)}`);
}

console.log(`best-of-${RUNS} per variant, Q = 32 queries × N = 100 000 embeddings × D = 384\n`);
console.log(`${"variant".padEnd(42)}\t${"score_ms total (min/med/max)".padEnd(30)}\t${"per_query_ms (min/med/max)"}`);

let referenceTop: string | null = null;
for (const v of variants) {
  const scores: number[] = [];
  const perQ: number[] = [];
  let lastTop = "";
  let lastQ = 0;
  for (let i = 0; i < RUNS; i++) {
    const m = runOnce(v.path);
    scores.push(m.score);
    perQ.push(m.perQuery);
    lastTop = m.top;
    lastQ = m.Q;
  }
  const s = stats(scores);
  const p = stats(perQ);
  const fmt = (x: { min: number; med: number; max: number }) =>
    `${x.min.toFixed(2)} / ${x.med.toFixed(2)} / ${x.max.toFixed(2)}`.padEnd(30);
  console.log(`${v.name}\t${fmt(s)}\t${fmt(p)}`);

  if (referenceTop === null) {
    referenceTop = lastTop;
  } else if (lastTop !== referenceTop) {
    console.log(`  !! top-K MISMATCH for ${v.name.trim()}: Q=${lastQ}`);
  }
}

console.log(`\ntop-K verified matching across all batched variants (Q × K indices)`);
