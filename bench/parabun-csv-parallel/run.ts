// Time bun:csv serial vs parallel mode on a real 50 MB fixture. Reports
// min/med/max per variant across N runs, plus the speedup ratio. Requires
// the fixture to have been generated first via seed.ts.
//
//   bun run bench/parabun-csv-parallel/seed.ts
//   bun run build:release bench/parabun-csv-parallel/run.ts

import csv from "bun:csv";
import { readFileSync, existsSync, statSync } from "node:fs";

const RUNS = 5;
const HERE = new URL(".", import.meta.url).pathname;
const FIXTURE = `${HERE}fixture.csv`;

if (!existsSync(FIXTURE)) {
  console.error(`fixture not found at ${FIXTURE}`);
  console.error(`run \`bun run ${HERE}seed.ts\` first.`);
  process.exit(1);
}

const fileBytes = statSync(FIXTURE).size;
const fixtureText = readFileSync(FIXTURE, "utf8");

async function timeOne(parallel: boolean): Promise<{ ms: number; rows: number }> {
  const t0 = performance.now();
  let rows = 0;
  for await (const _ of csv.parseCsv(fixtureText, { parallel })) rows++;
  return { ms: performance.now() - t0, rows };
}

function stats(xs: number[]) {
  const sorted = [...xs].sort((a, b) => a - b);
  return {
    min: sorted[0],
    med: sorted[Math.floor(sorted.length / 2)],
    max: sorted[sorted.length - 1],
  };
}

async function bench(name: string, parallel: boolean) {
  const times: number[] = [];
  let rows = 0;
  for (let i = 0; i < RUNS; i++) {
    const r = await timeOne(parallel);
    times.push(r.ms);
    rows = r.rows;
  }
  const s = stats(times);
  return { name, rows, ...s };
}

console.log(`bun:csv parse — ${(fileBytes / (1024 * 1024)).toFixed(1)} MB fixture, best-of-${RUNS} per variant\n`);
const serial = await bench("serial   ", /* parallel */ false);
const par = await bench("parallel ", /* parallel */ true);

const fmt = (s: { min: number; med: number; max: number }) =>
  `${s.min.toFixed(0).padStart(5)} / ${s.med.toFixed(0).padStart(5)} / ${s.max.toFixed(0).padStart(5)} ms`;
const mbPerSec = (ms: number) => `${(fileBytes / (1024 * 1024) / (ms / 1000)).toFixed(1)} MB/s`;

console.log(`${"variant".padEnd(12)}\trows\t${"min / med / max".padEnd(24)}\tthroughput (median)`);
console.log(`${serial.name}\t${serial.rows.toLocaleString()}\t${fmt(serial)}\t${mbPerSec(serial.med)}`);
console.log(`${par.name}\t${par.rows.toLocaleString()}\t${fmt(par)}\t${mbPerSec(par.med)}`);

const speedup = serial.med / par.med;
console.log(`\nspeedup (median): ${speedup.toFixed(2)}×`);
if (par.rows !== serial.rows) {
  console.log(`  !! row count mismatch: serial=${serial.rows} parallel=${par.rows}`);
}
