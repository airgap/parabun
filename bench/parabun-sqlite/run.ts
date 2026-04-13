// Runs each variant K times, parses `load_ms=... analyze_ms=... total_ms=...`
// from stdout, reports min/median/max per phase.
//
//   bun run build:release bench/parabun-sqlite/run.ts
//
// Assumes seed.ts has already been run.

import { spawnSync } from "bun";

const HERE = new URL(".", import.meta.url).pathname;
const RUNS = 5;

const variants = [
  { name: "A  (.js, idiomatic bun)   ", path: `${HERE}variant-a.js` },
  { name: "B  (.pjs, same code)      ", path: `${HERE}variant-b.pjs` },
  { name: "C  (.pjs, parabun-optim'd)", path: `${HERE}variant-c.pjs` },
];

type PhaseMs = { load: number; analyze: number; total: number };

function parseLine(s: string): PhaseMs | null {
  const m = s.match(/load_ms=([\d.]+) analyze_ms=([\d.]+) total_ms=([\d.]+)/);
  if (!m) return null;
  return { load: parseFloat(m[1]), analyze: parseFloat(m[2]), total: parseFloat(m[3]) };
}

function stats(xs: number[]) {
  const sorted = [...xs].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const med = sorted[Math.floor(sorted.length / 2)];
  return { min, med, max };
}

function runOnce(path: string): PhaseMs {
  const result = spawnSync([process.execPath, path], { stdout: "pipe", stderr: "pipe" });
  const out = new TextDecoder().decode(result.stdout);
  const lines = out.trim().split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = parseLine(lines[i]);
    if (m) return m;
  }
  throw new Error(`no timing line in output of ${path}:\n${out}`);
}

console.log(`best-of-${RUNS} per variant\n`);
console.log(
  `${"variant".padEnd(28)}\t${"load_ms (min/med/max)".padEnd(28)}\t${"analyze_ms (min/med/max)".padEnd(28)}\t${"total_ms (min/med/max)"}`,
);

for (const v of variants) {
  const loads: number[] = [];
  const analyzes: number[] = [];
  const totals: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    const m = runOnce(v.path);
    loads.push(m.load);
    analyzes.push(m.analyze);
    totals.push(m.total);
  }
  const l = stats(loads);
  const a = stats(analyzes);
  const t = stats(totals);
  const fmt = (s: { min: number; med: number; max: number }) =>
    `${s.min.toFixed(1)} / ${s.med.toFixed(1)} / ${s.max.toFixed(1)}`.padEnd(28);
  console.log(`${v.name}\t${fmt(l)}\t${fmt(a)}\t${fmt(t)}`);
}
