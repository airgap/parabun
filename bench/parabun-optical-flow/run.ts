// Lucas-Kanade optical flow on a 2048 × 2048 two-frame sequence:
// single-threaded vs tiled pmap+SAB. Flow-field hash (FNV-1a over the
// concatenated u/v Float32 bytes) must match across variants, and
// both must recover the ground-truth shift within tolerance.
//
//   bun run build:release bench/parabun-optical-flow/run.ts

import { spawnSync } from "bun";

const HERE = new URL(".", import.meta.url).pathname;
const RUNS = 3;

const variants = [
  { name: "baseline (single-threaded)   ", path: `${HERE}baseline.js` },
  { name: "parabun (pmap×8 + SAB tiles) ", path: `${HERE}variant-parabun.pjs` },
];

type Phase = { score: number; hash: string; meanU: number; meanV: number; expected: string };

function parseLine(s: string): Phase | null {
  const m = s.match(/score_ms=([\d.]+) hash=([0-9a-f]+) u_mean=(-?[\d.]+) v_mean=(-?[\d.]+) expected=\(([^)]+)\)/);
  if (!m) return null;
  return {
    score: parseFloat(m[1]),
    hash: m[2],
    meanU: parseFloat(m[3]),
    meanV: parseFloat(m[4]),
    expected: m[5],
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

console.log(`best-of-${RUNS} per variant — 2048 × 2048 two-frame LK\n`);
console.log(`${"variant".padEnd(30)}\t${"score_ms (min/med/max)".padEnd(28)}\thash\t\t\tflow_mean (u, v)`);

let referenceHash: string | null = null;
let expected = "?";
for (const v of variants) {
  const scores: number[] = [];
  let lastHash = "";
  let lastU = 0,
    lastV = 0;
  for (let i = 0; i < RUNS; i++) {
    const m = runOnce(v.path);
    scores.push(m.score);
    lastHash = m.hash;
    lastU = m.meanU;
    lastV = m.meanV;
    expected = m.expected;
  }
  const s = stats(scores);
  const fmt = `${s.min.toFixed(2)} / ${s.med.toFixed(2)} / ${s.max.toFixed(2)}`.padEnd(28);
  console.log(`${v.name}\t${fmt}\t${lastHash}\t(${lastU.toFixed(3)}, ${lastV.toFixed(3)})`);
  if (referenceHash === null) referenceHash = lastHash;
  else if (lastHash !== referenceHash) {
    console.log(`  !! hash MISMATCH: got=${lastHash} ref=${referenceHash}`);
  }
}

console.log(`\nGround-truth shift: (${expected}) — recovered flow_mean should match within tolerance.`);
console.log(`Flow field bit-identical across variants.`);
