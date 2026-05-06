// Analytical ETL pipeline: synthesize a 50K-row dataset (split into
// 5 RecordBatches → 5 parquet row groups), write with bloom filters,
// then run three queries demonstrating bloom skip + stats pushdown.
// Each batch covers a distinct user_id band so pushdown can actually
// skip 4/5 row groups when querying a single user.
//
//   bun run build:release demos/parquet-etl.ts

import arrow from "@para/arrow";

const ROWS_PER_BATCH = 10_000;
const NUM_BATCHES = 5;
const N = ROWS_PER_BATCH * NUM_BATCHES;

console.log(`generating ${N} synthetic events across ${NUM_BATCHES} batches…`);
const t0 = Bun.nanoseconds();

const schema = {
  fields: [
    { name: "user_id", type: { kind: "int32" }, nullable: false },
    { name: "region", type: { kind: "utf8" }, nullable: false },
    { name: "amount", type: { kind: "float64" }, nullable: false },
  ],
};
const batches: any[] = [];
for (let g = 0; g < NUM_BATCHES; g++) {
  const ids = new Int32Array(ROWS_PER_BATCH);
  const regions: string[] = new Array(ROWS_PER_BATCH);
  const amounts = new Float64Array(ROWS_PER_BATCH);
  const userBase = g * 10_000; // band [g*10K, (g+1)*10K)
  for (let i = 0; i < ROWS_PER_BATCH; i++) {
    ids[i] = userBase + ((i * 16807) % 10_000);
    regions[i] = ["us", "eu", "ap", "sa"][(g + i) % 4];
    amounts[i] = ((g * 1000 + i * 31) % 9999) / 100;
  }
  const cols = [
    new arrow.Column({ kind: "int32" }, ROWS_PER_BATCH, ids),
    new arrow.Column({ kind: "utf8" }, ROWS_PER_BATCH, regions as any),
    new arrow.Column({ kind: "float64" }, ROWS_PER_BATCH, amounts),
  ];
  batches.push(new arrow.RecordBatch(schema, cols, ROWS_PER_BATCH));
}
const table = new arrow.Table(schema, batches);
console.log(`built table in ${((Bun.nanoseconds() - t0) / 1e6).toFixed(0)}ms`);

console.log(`writing parquet (zstd + multiRowGroup + bloom on user_id, region)…`);
const t1 = Bun.nanoseconds();
const bytes = arrow.toParquet(table, {
  compression: "zstd",
  multiRowGroup: true,
  bloomFilters: ["user_id", "region"],
});
console.log(
  `wrote ${(bytes.length / 1024).toFixed(0)} KB in ${((Bun.nanoseconds() - t1) / 1e6).toFixed(0)}ms ` +
    `(${(bytes.length / N).toFixed(1)} bytes/row)`,
);
await Bun.write("./events.parquet", bytes);

// Query 1: full decode — baseline.
const t2 = Bun.nanoseconds();
const full = arrow.fromParquet(bytes);
console.log(`\nfull decode: ${full.numRows} rows in ${((Bun.nanoseconds() - t2) / 1e6).toFixed(0)}ms`);

// Query 2: bloom skip — query a user_id only present in band 2 (20K-30K).
// Bands 0/1/3/4 should bloom-miss and skip those row groups.
const targetUser = 25_000 + ((3 * 16807) % 10_000);
const t3 = Bun.nanoseconds();
const userQuery = arrow.fromParquet(bytes, {
  filter: rg => rg.bloomFilters.get("user_id")?.mightContain(targetUser) ?? true,
});
console.log(
  `bloom-skip user_id=${targetUser}: kept ${userQuery.batches.length} of ${NUM_BATCHES} row groups, ` +
    `${userQuery.numRows} rows in ${((Bun.nanoseconds() - t3) / 1e6).toFixed(0)}ms`,
);

// Query 3: stats pushdown — bands have non-overlapping amount ranges.
// Band 0: amounts ~0-99, band 1: ~10-110, etc. Query for amount=200
// which lives only in higher bands.
const t4 = Bun.nanoseconds();
const amountQuery = arrow.fromParquet(bytes, {
  filter: rg => {
    const s = rg.stats.get("amount");
    if (!s) return true;
    return 0 >= s.min && 0 <= s.max; // amount=0 lives only in band 0 (lowest base)
  },
});
console.log(
  `stats-filter amount≈0: kept ${amountQuery.batches.length} of ${NUM_BATCHES} row groups, ` +
    `${amountQuery.numRows} rows in ${((Bun.nanoseconds() - t4) / 1e6).toFixed(0)}ms`,
);

console.log(`\nfirst row:`, arrow.toRows(full)[0]);
