// CSV → Arrow analytical pipeline demo.
//
// Generates a 100k-row CSV in memory, parses it via para:csv's streaming
// parser, converts to a columnar Arrow RecordBatch via arrow.fromRows,
// then runs a few filters + aggregations. Demonstrates that para:csv and
// para:arrow compose at the call site without either module knowing about
// the other (cross-builtin imports between bun:* aren't supported, so the
// seam is here).
//
// Run:
//   bun bd bench/parabun-csv-arrow/run.ts
//
// Numbers are wall-clock for each stage on this host. Don't read this as
// a pure-perf benchmark — the parse step is mostly synthetic-CSV
// generation cost on the same thread.

import csv from "para:csv";
import arrow from "para:arrow";

const N = 100_000;

// Synthesize a CSV in memory. Row shape:
//   id (int), category (string), score (float), active (bool)
console.log(`generating ${N.toLocaleString()} CSV rows...`);
const t0 = performance.now();
const lines: string[] = ["id,category,score,active"];
const categories = ["alpha", "bravo", "charlie", "delta", "echo"];
for (let i = 0; i < N; i++) {
  const cat = categories[i % categories.length];
  const score = Math.sin(i * 0.001) * 0.5 + 0.5; // [0, 1]
  const active = (i & 3) !== 0; // ~75% active
  lines.push(`${i},${cat},${score.toFixed(4)},${active}`);
}
const csvText = lines.join("\n");
const csvBytes = new TextEncoder().encode(csvText);
const tGen = performance.now() - t0;
console.log(`  csv generated: ${(csvBytes.byteLength / 1024).toFixed(0)} KB in ${tGen.toFixed(0)}ms`);

// Parse it. csv.parseCsv yields one row per record as an object when
// header:true; infer:true coerces "123" → 123, "true" → true, etc.
console.log(`\nparsing CSV (csv.parseCsv, header+infer)...`);
const t1 = performance.now();
const rows: Array<{ id: number; category: string; score: number; active: boolean }> = [];
for await (const row of csv.parseCsv(csvBytes, { header: true, infer: true })) {
  rows.push(row as any);
}
const tParse = performance.now() - t1;
console.log(
  `  ${rows.length.toLocaleString()} rows parsed in ${tParse.toFixed(0)}ms (${(rows.length / tParse).toFixed(0)} rows/ms)`,
);

// Convert to columnar Arrow.
console.log(`\nconverting to Arrow (arrow.fromRows)...`);
const t2 = performance.now();
const batch = arrow.fromRows(rows, {
  schema: { id: "int32", category: "utf8", score: "float64", active: "bool" },
});
const tColumnar = performance.now() - t2;
console.log(
  `  RecordBatch: ${batch.numRows.toLocaleString()} rows × ${batch.numColumns} cols in ${tColumnar.toFixed(0)}ms`,
);
console.log(`  schema: ${batch.schema.fields.map(f => `${f.name}:${f.type.kind}`).join(", ")}`);

// Compute over the columns.
console.log(`\ncolumn computes:`);
{
  const t = performance.now();
  const total = arrow.sum(batch.column("score"));
  const mean = arrow.mean(batch.column("score"));
  const min = arrow.min(batch.column("score"));
  const max = arrow.max(batch.column("score"));
  const dt = performance.now() - t;
  console.log(
    `  score: sum=${(total as number).toFixed(2)} mean=${(mean as number).toFixed(4)} min=${(min as number).toFixed(4)} max=${(max as number).toFixed(4)} (${dt.toFixed(1)}ms)`,
  );
}

// Filter: only category=alpha AND active=true.
console.log(`\nfilter (category=alpha AND active=true):`);
{
  const t = performance.now();
  const sub = arrow.filter(batch, row => row.category === "alpha" && row.active);
  const dt = performance.now() - t;
  console.log(`  ${sub.numRows.toLocaleString()} rows in ${dt.toFixed(0)}ms`);
  const totalScore = arrow.sum(sub.column("score"));
  console.log(`  sum(score) on filtered = ${(totalScore as number).toFixed(2)}`);
}

// Round-trip back to rows for handing to a row-shaped consumer.
console.log(`\nround-trip (arrow.toRows on first 3 of filtered):`);
const sub = arrow.filter(batch, row => row.category === "alpha" && row.active);
const back = arrow.toRows(sub).slice(0, 3);
for (const r of back) console.log(`  ${JSON.stringify(r)}`);

console.log(
  `\ntotal pipeline (parse + fromRows + filter + sum): ${(tParse + tColumnar).toFixed(0)}ms for ${N.toLocaleString()} rows`,
);
