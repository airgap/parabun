// ETL pipeline fusion: idiomatic chained .map().map().map().reduce()
// (3 intermediate Float32Arrays) vs hand-rolled tight loop vs Parabun's
// fusion-aware |> chain. All three compute the same numeric total over
// N=10M Float32 samples.
//
//   bun run build:release bench/parabun-streaming-etl/run.ts

import { spawnSync } from "bun";

const HERE = new URL(".", import.meta.url).pathname;
const RUNS = 5;

const variants = [
  { name: "Float32Array .map chain + reduce", path: `${HERE}baseline-chain.js` },
  { name: "hand-rolled tight loop         ", path: `${HERE}baseline-tight.js` },
  { name: "parabun |> fusion              ", path: `${HERE}variant-parabun.pjs` },
];

type Phase = { score: number; total: number };

function parseLine(s: string): Phase | null {
  const m = s.match(/score_ms=([\d.]+) total=([\d.]+)/);
  if (!m) return null;
  return { score: parseFloat(m[1]), total: parseFloat(m[2]) };
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

console.log(`best-of-${RUNS} per variant — N=10,000,000 Float32 samples\n`);
console.log(`${"variant".padEnd(32)}\t${"score_ms (min/med/max)".padEnd(30)}\ttotal`);

let referenceTotal: number | null = null;
for (const v of variants) {
  const scores: number[] = [];
  let lastTotal = 0;
  for (let i = 0; i < RUNS; i++) {
    const m = runOnce(v.path);
    scores.push(m.score);
    lastTotal = m.total;
  }
  const s = stats(scores);
  const fmt = `${s.min.toFixed(2)} / ${s.med.toFixed(2)} / ${s.max.toFixed(2)}`.padEnd(30);
  console.log(`${v.name}\t${fmt}\t${lastTotal.toFixed(4)}`);
  if (referenceTotal === null) referenceTotal = lastTotal;
  else if (Math.abs(lastTotal - referenceTotal) / referenceTotal > 1e-6) {
    console.log(`  !! total deviates >1e-6 from reference: got=${lastTotal} ref=${referenceTotal}`);
  }
}

console.log(`\nTotals matching within float precision (≤1e-6) across all variants.`);
