// Four-way harness for cosine-similarity:
//   - node              (upstream lib as-is)
//   - bun               (upstream lib as-is, Bun runtime)
//   - parabun-drop-in   (upstream lib as-is, Parabun release build)
//   - parabun-rewrite   (Float32Array + para:simd.dot)
//
// Each child emits JSON-per-line timing records. We aggregate into one
// table per workload.
//
// Run: /raid/parabun/build/release/bun run bench/harness.ts
// (Parabun itself drives the harness — it's the one that has .pjs support.)

import { spawnSync } from "bun";

const NODE = process.env.NODE_BIN || "node";
const BUN = process.env.BUN_BIN || "bun";
const PARABUN = process.env.PARABUN_BIN || process.env.BUN_BIN || "bun";

const UPSTREAM = "./run-upstream.js";
const REWRITE = "./run-parabun.pjs";

if (!process.env.UPSTREAM_DIR) {
  console.error("UPSTREAM_DIR env var required (path to cloned upstream repo)");
  process.exit(2);
}

type Record = {
  kind: "pair" | "batch";
  D: number;
  N?: number;
  min: number;
  med: number;
  max: number;
  value: number;
};

function run(cmd: string[]): Record[] {
  const r = spawnSync({ cmd, cwd: import.meta.dir, stderr: "pipe", stdout: "pipe", env: process.env });
  if (r.exitCode !== 0) {
    console.error(`command failed: ${cmd.join(" ")}`);
    console.error(new TextDecoder().decode(r.stderr));
    process.exit(1);
  }
  const out = new TextDecoder().decode(r.stdout);
  return out
    .split("\n")
    .filter(l => l.trim().length > 0)
    .map(l => JSON.parse(l) as Record);
}

console.log("Running upstream on node…");
const nodeRows = run([NODE, UPSTREAM]);
console.log("Running upstream on bun…");
const bunRows = run([BUN, "run", UPSTREAM]);
console.log("Running upstream on parabun…");
const parabunDropInRows = run([PARABUN, "run", UPSTREAM]);
console.log("Running rewrite on parabun…");
const parabunRewriteRows = run([PARABUN, "run", REWRITE]);

type Row = { label: string; rows: Record[] };
const groups: Row[] = [
  { label: "node (upstream)", rows: nodeRows },
  { label: "bun (upstream)", rows: bunRows },
  { label: "parabun drop-in (upstream)", rows: parabunDropInRows },
  { label: "parabun rewrite (para:simd)", rows: parabunRewriteRows },
];

function key(r: Record): string {
  return r.kind === "pair" ? `pair D=${r.D}` : `batch N=${r.N} D=${r.D}`;
}

const allKeys = new Set<string>();
for (const g of groups) for (const r of g.rows) allKeys.add(key(r));

function lookup(g: Row, k: string): Record | undefined {
  return g.rows.find(r => key(r) === k);
}

function fmt(x: number): string {
  if (x < 0.01) return x.toFixed(5);
  if (x < 1) return x.toFixed(4);
  if (x < 10) return x.toFixed(3);
  return x.toFixed(2);
}

// Check numerical agreement across runtimes. Small float drift is expected
// (the rewrite works in f32 throughout while upstream may widen through f64).
console.log("\nnumerical sanity (value returned by each runtime):");
for (const k of allKeys) {
  const vals = groups.map(g => {
    const r = lookup(g, k);
    return r ? r.value.toFixed(6) : "—";
  });
  console.log(`  ${k.padEnd(22)}  ${vals.join("  ")}`);
}

console.log("\ntimings (ms) — min / med / max, best-of-9:");
const header = ["workload", ...groups.map(g => g.label)];
const widths = [28, ...groups.map(g => Math.max(g.label.length, 26))];

function padCell(s: string, w: number): string {
  return s.length >= w ? s : s + " ".repeat(w - s.length);
}

console.log(header.map((h, i) => padCell(h, widths[i])).join("  "));
for (const k of allKeys) {
  const cells = [padCell(k, widths[0])];
  for (let i = 0; i < groups.length; i++) {
    const r = lookup(groups[i], k);
    cells.push(padCell(r ? `${fmt(r.min)} / ${fmt(r.med)} / ${fmt(r.max)}` : "—", widths[i + 1]));
  }
  console.log(cells.join("  "));
}

// Speedups of the rewrite over node baseline — the headline number.
console.log("\nspeedup of parabun rewrite over node (med):");
for (const k of allKeys) {
  const n = lookup(groups[0], k);
  const p = lookup(groups[3], k);
  if (!n || !p) continue;
  const x = n.med / p.med;
  console.log(`  ${k.padEnd(22)}  ${x.toFixed(1)}×`);
}
