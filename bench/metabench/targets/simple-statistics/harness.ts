// Four-way harness for simple-statistics:
//   - node              (upstream ESM)
//   - bun               (upstream ESM)
//   - parabun-drop-in   (upstream ESM, Parabun release)
//   - parabun-rewrite   (.pjs using @para/simd)

import { spawnSync } from "bun";

const NODE = process.env.NODE_BIN || "node";
const BUN = process.env.BUN_BIN || "bun";
const PARABUN = process.env.PARABUN_BIN || process.env.BUN_BIN || "bun";

const UPSTREAM = "./run-upstream.mjs";
const REWRITE = "./run-parabun.pjs";

if (!process.env.UPSTREAM_DIR) {
  console.error("UPSTREAM_DIR env var required (path to cloned upstream repo)");
  process.exit(2);
}

type Record = {
  op: string;
  N: number;
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
  return new TextDecoder()
    .decode(r.stdout)
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

const groups = [
  { label: "node (upstream)", rows: nodeRows },
  { label: "bun (upstream)", rows: bunRows },
  { label: "parabun drop-in", rows: parabunDropInRows },
  { label: "parabun rewrite", rows: parabunRewriteRows },
];

const ops = nodeRows.map(r => r.op);
const lookup = (g: { rows: Record[] }, op: string) => g.rows.find(r => r.op === op);

function fmt(x: number): string {
  if (x < 0.01) return x.toFixed(5);
  if (x < 1) return x.toFixed(4);
  if (x < 10) return x.toFixed(3);
  return x.toFixed(2);
}

console.log("\nnumerical agreement (value):");
for (const op of ops) {
  const vals = groups.map(g => {
    const r = lookup(g, op);
    return r ? r.value.toExponential(6) : "—";
  });
  console.log(`  ${op.padEnd(18)}  ${vals.join("   ")}`);
}

console.log("\nmedian timings (ms) — min / med / max, best-of-9:");
const header = ["op".padEnd(18), ...groups.map(g => g.label.padEnd(22))];
console.log(header.join("  "));
for (const op of ops) {
  const row = [op.padEnd(18)];
  for (const g of groups) {
    const r = lookup(g, op);
    row.push(r ? `${fmt(r.min)} / ${fmt(r.med)} / ${fmt(r.max)}`.padEnd(22) : "—".padEnd(22));
  }
  console.log(row.join("  "));
}

console.log("\nspeedup of parabun rewrite over node (med):");
for (const op of ops) {
  const n = lookup(groups[0], op);
  const p = lookup(groups[3], op);
  if (!n || !p) continue;
  console.log(`  ${op.padEnd(18)}  ${(n.med / p.med).toFixed(1)}×`);
}
