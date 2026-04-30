// Stream a CSV with `para:csv.parseCsv`, summarise the first numeric column.
// (TypeScript form.)
//
//   bun run build:release demos/csv-pipeline.ts data.csv
//
// Same demo as csv-pipeline.pts; `pure function` becomes plain `function`
// (the parse-time purity check is the only thing the .pts variant adds —
// runtime is identical) and `raw |> asNumber` becomes `asNumber(raw)`.

import csv from "para:csv";
import { existsSync } from "node:fs";

const path = process.argv[2];
if (!path || !existsSync(path)) {
  console.error("usage: bun run demos/csv-pipeline.ts <path.csv>");
  process.exit(1);
}

function asNumber(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function nonEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "number") return Number.isFinite(v);
  return String(v).length > 0;
}

function isNumeric(v: unknown): boolean {
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "string") return v.length > 0 && Number.isFinite(Number(v));
  return false;
}

const file = Bun.file(path);
const text = await file.text();

type Row = Record<string, string | number | boolean | null>;

let headerNames: string[] | null = null;
let firstRow: Row | null = null;
let totalRows = 0;
for await (const row of csv.parseCsv(text, { headers: true })) {
  totalRows++;
  if (firstRow === null) {
    firstRow = row as Row;
    headerNames = Object.keys(firstRow);
  }
}
console.log(`parsed ${totalRows} rows, headers: ${headerNames?.join(", ") ?? "(none)"}`);

const numericCol = headerNames?.find(k => isNumeric(firstRow?.[k]));
if (!numericCol) {
  console.log("no numeric column found.");
  process.exit(0);
}
console.log(`summarising column "${numericCol}"\n`);

let count = 0,
  sum = 0,
  min = Infinity,
  max = -Infinity;
for await (const row of csv.parseCsv(text, { headers: true })) {
  const r = row as Row;
  const raw = r[numericCol];
  if (!nonEmpty(raw)) continue;
  const v = asNumber(raw);
  count++;
  sum += v;
  if (v < min) min = v;
  if (v > max) max = v;
}

console.log(`  count : ${count}`);
console.log(`  min   : ${min}`);
console.log(`  max   : ${max}`);
console.log(`  mean  : ${(sum / count).toFixed(4)}`);
