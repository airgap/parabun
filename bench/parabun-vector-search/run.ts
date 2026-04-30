// Runs each variant K times, parses `gen_ms=... score_ms=... total_ms=... top=[...]`
// from stdout, reports min/median/max per phase and verifies the top-K set
// matches across variants.
//
//   bun run build:release bench/parabun-vector-search/run.ts

import { spawnSync } from "bun";

const HERE = new URL(".", import.meta.url).pathname;
const RUNS = 5;

const variants = [
  { name: "baseline (.js, plain JS)       ", path: `${HERE}baseline.js` },
  { name: "simd-dot (per-row, para:simd.dot)", path: `${HERE}variant-simd.pjs` },
  { name: "matvec (para:simd.matVec, bulk) ", path: `${HERE}variant-matvec.pjs` },
  { name: "pmap-cold (fresh pool per call)", path: `${HERE}variant-pmap.pjs` },
  { name: "pmap-warm (persistent pool)    ", path: `${HERE}variant-pmap-warm.pjs` },
  { name: "pmap-shared (SAB embeddings)   ", path: `${HERE}variant-pmap-shared.pjs` },
  { name: "gpu (para:gpu.matVec, held)     ", path: `${HERE}variant-gpu.pjs` },
];

type Phase = { gen: number; score: number; total: number; top: string };

function parseLine(s: string): Phase | null {
  const m = s.match(/gen_ms=([\d.]+) score_ms=([\d.]+) total_ms=([\d.]+) top=\[([^\]]*)\]/);
  if (!m) return null;
  return { gen: parseFloat(m[1]), score: parseFloat(m[2]), total: parseFloat(m[3]), top: m[4] };
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

function topSet(top: string): Set<string> {
  return new Set(top.split(",").map(s => s.split(":")[0]));
}

console.log(`best-of-${RUNS} per variant\n`);
console.log(
  `${"variant".padEnd(32)}\t${"gen_ms (min/med/max)".padEnd(26)}\t${"score_ms (min/med/max)".padEnd(26)}\t${"total_ms (min/med/max)"}`,
);

let referenceTop: Set<string> | null = null;
for (const v of variants) {
  const gens: number[] = [];
  const scores: number[] = [];
  const totals: number[] = [];
  let lastTop = "";
  for (let i = 0; i < RUNS; i++) {
    const m = runOnce(v.path);
    gens.push(m.gen);
    scores.push(m.score);
    totals.push(m.total);
    lastTop = m.top;
  }
  const g = stats(gens);
  const s = stats(scores);
  const t = stats(totals);
  const fmt = (x: { min: number; med: number; max: number }) =>
    `${x.min.toFixed(1)} / ${x.med.toFixed(1)} / ${x.max.toFixed(1)}`.padEnd(26);
  console.log(`${v.name}\t${fmt(g)}\t${fmt(s)}\t${fmt(t)}`);

  const thisSet = topSet(lastTop);
  if (referenceTop === null) {
    referenceTop = thisSet;
  } else {
    let ok = thisSet.size === referenceTop.size;
    if (ok)
      for (const x of thisSet)
        if (!referenceTop.has(x)) {
          ok = false;
          break;
        }
    if (!ok) {
      console.log(`  !! top-K MISMATCH: ${lastTop}`);
      console.log(`     reference:     ${[...referenceTop].join(",")}`);
    }
  }
}

console.log(`\ntop-K verified matching across variants: ${referenceTop ? [...referenceTop].join(",") : "(none)"}`);
