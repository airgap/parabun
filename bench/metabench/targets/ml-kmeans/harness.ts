// Four-way harness for ml-kmeans.

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
  D: number;
  K: number;
  iters: number;
  min: number;
  med: number;
  max: number;
  fingerprint: number;
};

function run(cmd: string[]): Record {
  const r = spawnSync({ cmd, cwd: import.meta.dir, stderr: "pipe", stdout: "pipe", env: process.env });
  if (r.exitCode !== 0) {
    console.error(`command failed: ${cmd.join(" ")}`);
    console.error(new TextDecoder().decode(r.stderr));
    process.exit(1);
  }
  const line = new TextDecoder().decode(r.stdout).trim().split("\n").at(-1)!;
  return JSON.parse(line) as Record;
}

console.log("Running upstream on node…");
const nodeR = run([NODE, UPSTREAM]);
console.log("Running upstream on bun…");
const bunR = run([BUN, "run", UPSTREAM]);
console.log("Running upstream on parabun…");
const parabunR = run([PARABUN, "run", UPSTREAM]);
console.log("Running rewrite on parabun…");
const rewriteR = run([PARABUN, "run", REWRITE]);

const groups = [
  { label: "node (upstream)", r: nodeR },
  { label: "bun (upstream)", r: bunR },
  { label: "parabun drop-in", r: parabunR },
  { label: "parabun rewrite", r: rewriteR },
];

console.log(`\nN=${nodeR.N}  D=${nodeR.D}  K=${nodeR.K}  max_iter=50  tol=1e-6  best-of-5\n`);

console.log("iterations to convergence:");
for (const g of groups) {
  console.log(`  ${g.label.padEnd(22)}  ${g.r.iters}`);
}

console.log("\ncentroid[0][0] fingerprint (numerical agreement across runtimes):");
for (const g of groups) {
  console.log(`  ${g.label.padEnd(22)}  ${g.r.fingerprint.toFixed(6)}`);
}

console.log("\ntimings (ms) — min / med / max:");
for (const g of groups) {
  console.log(`  ${g.label.padEnd(22)}  ${g.r.min.toFixed(2)} / ${g.r.med.toFixed(2)} / ${g.r.max.toFixed(2)}`);
}

console.log(`\nspeedup (parabun rewrite vs node): ${(nodeR.med / rewriteR.med).toFixed(1)}×`);
console.log(`speedup (parabun rewrite vs parabun drop-in): ${(parabunR.med / rewriteR.med).toFixed(1)}×`);
