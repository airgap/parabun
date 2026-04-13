// Separable 5-tap Gaussian blur: single-threaded vs tiled pmap+SAB.
// Output image hash (FNV-1a over the result bytes) must match between
// variants — same algorithm, bit-identical pixels.
//
//   bun run build:release bench/parabun-image-convolution/run.ts

import { spawnSync } from "bun";

const HERE = new URL(".", import.meta.url).pathname;
const RUNS = 3;

const variants = [
  { name: "baseline (single-threaded)   ", path: `${HERE}baseline.js` },
  { name: "parabun (pmap×8 + SAB tiles) ", path: `${HERE}variant-parabun.pjs` },
];

type Phase = { score: number; hash: string };

function parseLine(s: string): Phase | null {
  const m = s.match(/score_ms=([\d.]+) hash=([0-9a-f]+)/);
  if (!m) return null;
  return { score: parseFloat(m[1]), hash: m[2] };
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

console.log(`best-of-${RUNS} per variant — 8192 × 8192 grayscale (64 MB)\n`);
console.log(`${"variant".padEnd(30)}\t${"score_ms (min/med/max)".padEnd(30)}\thash`);

let referenceHash: string | null = null;
for (const v of variants) {
  const scores: number[] = [];
  let lastHash = "";
  for (let i = 0; i < RUNS; i++) {
    const m = runOnce(v.path);
    scores.push(m.score);
    lastHash = m.hash;
  }
  const s = stats(scores);
  const fmt = `${s.min.toFixed(2)} / ${s.med.toFixed(2)} / ${s.max.toFixed(2)}`.padEnd(30);
  console.log(`${v.name}\t${fmt}\t${lastHash}`);
  if (referenceHash === null) referenceHash = lastHash;
  else if (lastHash !== referenceHash) {
    console.log(`  !! hash MISMATCH: got=${lastHash} ref=${referenceHash}`);
  }
}

console.log(`\nOutput image bit-identical across variants.`);
