// Bench: @para/csv with the parabun:csv routing shim.
//
//   bun run build:release bench/parabun-csv/run.ts
//
// Today (LYK-800 not landed): both paths run the bundled JS impl, so
// the ratio prints ~1.00×. Once the native parser lands, the @para/csv
// path quietly starts using parabun:csv and the ratio shifts.
//
// What we measure: end-to-end parseCsv over a synthetic CSV at three
// sizes (5 MB, 50 MB, 200 MB), reading a quoted-CSV input — the same
// regime LYK-800 targets.
//
// Acceptance criterion in LYK-800: ≥3× at 50 MB, ≥5× at 200 MB.

import csv from "../../packages/para-csv/src/index.ts";

const SIZES_MB = [5, 50, 200];
const WARMUP = 1;
const ITERS = 3;

function makeCsv(sizeMb: number): string {
  // Synthetic order events: 4 columns, ~95 bytes per row including
  // quoted strings (the realistic bottleneck for the SIMD parser).
  // Aim for sizeMb * 1024^2 bytes total.
  const target = sizeMb * 1024 * 1024;
  const header = "order_id,country,product,revenue\n";
  const rowTemplate = (i: number) =>
    `o-${i.toString(16).padStart(8, "0")},"United States","Pro, Plan",${(i * 0.37).toFixed(2)}\n`;
  let s = header;
  let i = 0;
  while (s.length < target) {
    s += rowTemplate(i++);
  }
  return s;
}

async function timeParseCsv(input: string, iters: number): Promise<number> {
  // Drain the iterator; we only care about parse time, not what we do
  // with each row. Median of `iters` samples.
  const samples: number[] = [];
  for (let i = 0; i < iters; i++) {
    const t0 = Bun.nanoseconds();
    let n = 0;
    for await (const _ of csv.parseCsv(input, { headers: true })) {
      n++;
    }
    samples.push((Bun.nanoseconds() - t0) / 1e6);
    if (n === 0) throw new Error("zero rows parsed — bad fixture");
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

console.log(`@para/csv routing-shim bench`);
console.log(`(Today: routing falls through to JS impl; ratio ~= 1.00. Native lands w/ LYK-800.)`);
console.log();
console.log("size(MB)  rows       median(ms)   throughput");
console.log("--------  ---------  -----------  ----------");

for (const mb of SIZES_MB) {
  const fixture = makeCsv(mb);
  const rowCount = (fixture.match(/\n/g)?.length ?? 0) - 1;

  // Warmup
  for (let i = 0; i < WARMUP; i++) {
    for await (const _ of csv.parseCsv(fixture, { headers: true })) {
    }
  }

  const ms = await timeParseCsv(fixture, ITERS);
  const mbps = (fixture.length / 1024 / 1024 / (ms / 1000)).toFixed(1);
  console.log(
    `${String(mb).padStart(8)}  ${String(rowCount).padStart(9)}  ${ms.toFixed(1).padStart(11)}  ${mbps} MB/s`,
  );
}

console.log();
console.log("LYK-800 acceptance: ≥3× at 50 MB, ≥5× at 200 MB once parabun:csv ships.");
