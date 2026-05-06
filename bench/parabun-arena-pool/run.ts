// Allocation-in-a-hot-loop microbench: baseline `new Uint8Array(N)` per
// iteration vs @para/arena Pool reuse. This is the narrowest possible
// scenario where pooling should win — everything else is held constant.
//
//   bun run build:release bench/parabun-arena-pool/run.ts

import { spawnSync } from "bun";

const HERE = new URL(".", import.meta.url).pathname;
const RUNS = 5;

const variants = [
  { name: "baseline (new Uint8Array)   ", path: `${HERE}baseline.js` },
  { name: "parabun (@para/arena Pool)    ", path: `${HERE}variant-parabun.js` },
];

function parseLine(s: string): { ms: number; ns: number } | null {
  const m = s.match(/ms=([\d.]+) ns\/iter=(\d+)/);
  if (!m) return null;
  return { ms: parseFloat(m[1]), ns: parseInt(m[2], 10) };
}

function stats(xs: number[]) {
  const sorted = [...xs].sort((a, b) => a - b);
  return { min: sorted[0], med: sorted[Math.floor(sorted.length / 2)], max: sorted[sorted.length - 1] };
}

function runOnce(path: string) {
  const r = spawnSync([process.execPath, path], { stdout: "pipe", stderr: "pipe" });
  const out = new TextDecoder().decode(r.stdout);
  for (const line of out.trim().split("\n").reverse()) {
    const m = parseLine(line);
    if (m) return m;
  }
  throw new Error(`no timing line in ${path}:\n${out}\nstderr:\n${new TextDecoder().decode(r.stderr)}`);
}

console.log(`best-of-${RUNS} — 200k 64 KiB Uint8Array allocations + 2 KiB touch each\n`);
console.log(`${"variant".padEnd(30)}\tms (min/med/max)`);

const meds: number[] = [];
for (const v of variants) {
  const ms: number[] = [];
  for (let i = 0; i < RUNS; i++) ms.push(runOnce(v.path).ms);
  const s = stats(ms);
  meds.push(s.med);
  console.log(`${v.name}\t${s.min.toFixed(1)} / ${s.med.toFixed(1)} / ${s.max.toFixed(1)}`);
}
if (meds.length === 2 && meds[1] > 0) {
  console.log(`\nspeedup (baseline med / pool med): ${(meds[0] / meds[1]).toFixed(2)}×`);
}
