// Sweep para:csv parse times across a few input sizes, comparing serial
// against parallel mode. Reports min/med/max ms and the median speedup
// per size, so the per-size break-even point (if any) is visible.
//
//   bun run build:release bench/parabun-csv-parallel/run.ts
//
// Override sizes via CLI:  --sizes=5,50,200

import csv from "para:csv";
import { existsSync, statSync, readFileSync } from "node:fs";
import { generate, fixturePath } from "./seed.ts";

const RUNS = 5;
const DEFAULT_SIZES_MB = [5, 50, 200];

function parseSizes(): number[] {
  const arg = process.argv.find(a => a.startsWith("--sizes="));
  if (!arg) return DEFAULT_SIZES_MB;
  const parsed = arg
    .slice("--sizes=".length)
    .split(",")
    .map(s => parseInt(s, 10))
    .filter(n => Number.isFinite(n) && n > 0);
  if (parsed.length === 0) {
    console.error(`bad --sizes value; expected comma-separated MB numbers`);
    process.exit(1);
  }
  return parsed;
}

async function timeOne(text: string, parallel: boolean): Promise<{ ms: number; rows: number }> {
  const t0 = performance.now();
  let rows = 0;
  for await (const _ of csv.parseCsv(text, { parallel })) rows++;
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

async function bench(text: string, parallel: boolean) {
  const times: number[] = [];
  let rows = 0;
  for (let i = 0; i < RUNS; i++) {
    const r = await timeOne(text, parallel);
    times.push(r.ms);
    rows = r.rows;
  }
  return { rows, ...stats(times) };
}

const sizes = parseSizes();

console.log(`para:csv parse — sweep across ${sizes.join(", ")} MB, best-of-${RUNS} per cell\n`);
console.log(
  [
    "size".padEnd(7),
    "rows".padEnd(11),
    "serial (min/med/max ms)".padEnd(28),
    "parallel (min/med/max ms)".padEnd(30),
    "speedup",
  ].join("\t"),
);

for (const sizeMB of sizes) {
  const path = fixturePath(sizeMB);
  if (!existsSync(path)) {
    process.stderr.write(`generating ${path}…\n`);
    generate(sizeMB);
  }
  const text = readFileSync(path, "utf8");
  const fileBytes = statSync(path).size;
  const serial = await bench(text, false);
  const par = await bench(text, true);
  const speedup = serial.med / par.med;
  const fmt = (s: { min: number; med: number; max: number }) =>
    `${s.min.toFixed(0).padStart(5)} / ${s.med.toFixed(0).padStart(5)} / ${s.max.toFixed(0).padStart(5)}`;
  console.log(
    [
      `${(fileBytes / (1024 * 1024)).toFixed(0)} MB`.padEnd(7),
      serial.rows.toLocaleString().padEnd(11),
      fmt(serial).padEnd(28),
      fmt(par).padEnd(30),
      `${speedup.toFixed(2)}×`,
    ].join("\t"),
  );
  if (par.rows !== serial.rows) {
    console.log(`  !! row count mismatch at ${sizeMB} MB: serial=${serial.rows} parallel=${par.rows}`);
  }
}
