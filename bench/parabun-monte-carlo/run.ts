// Black-Scholes European call MC pricing: single-threaded baseline vs
// pmap across 8 workers. Each sample is independent and CPU-bound on
// Math.log, Math.cos, Math.exp — embarrassingly parallel with zero
// communication overhead. Pure pmap showcase, no SIMD.
//
//   bun run build:release bench/parabun-monte-carlo/run.ts

import { spawnSync } from "bun";

const HERE = new URL(".", import.meta.url).pathname;
const RUNS = 5;

const variants = [
  { name: "baseline (single-threaded)   ", path: `${HERE}baseline.js` },
  { name: "parabun (pmap × 8)           ", path: `${HERE}variant-parabun.pjs` },
];

type Phase = { score: number; price: number };

function parseLine(s: string): Phase | null {
  const m = s.match(/score_ms=([\d.]+) price=([\d.]+)/);
  if (!m) return null;
  return { score: parseFloat(m[1]), price: parseFloat(m[2]) };
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

console.log(`best-of-${RUNS} per variant — N=50,000,000 MC samples\n`);
console.log(`${"variant".padEnd(30)}\t${"score_ms (min/med/max)".padEnd(26)}\tprice (last run)`);

let baselinePrice: number | null = null;
for (const v of variants) {
  const scores: number[] = [];
  let lastPrice = 0;
  for (let i = 0; i < RUNS; i++) {
    const m = runOnce(v.path);
    scores.push(m.score);
    lastPrice = m.price;
  }
  const s = stats(scores);
  const fmt = `${s.min.toFixed(1)} / ${s.med.toFixed(1)} / ${s.max.toFixed(1)}`.padEnd(26);
  console.log(`${v.name}\t${fmt}\t${lastPrice.toFixed(6)}`);
  if (baselinePrice === null) baselinePrice = lastPrice;
  else if (Math.abs(lastPrice - baselinePrice) / baselinePrice > 0.02) {
    console.log(`  !! price deviates >2% from baseline: parabun=${lastPrice} vs baseline=${baselinePrice}`);
  }
}

console.log(`\nBlack-Scholes analytic closed form for these parameters: ~10.4506`);
