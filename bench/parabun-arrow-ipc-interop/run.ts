// Wire-compat interop test for bun:arrow IPC against apache-arrow's
// reference JS implementation. Two directions:
//
//   1. Parabun encodes → apache-arrow decodes (validates our writer
//      produces spec-compliant bytes).
//   2. apache-arrow encodes → Parabun decodes (validates our reader
//      handles bytes from a known-good external producer).
//
// If both pass, our toIPC/fromIPC are wire-compatible with the
// reference implementation, which is the same wire format pyarrow,
// arrow-rs, nanoarrow, polars, and duckdb consume on the streaming
// path.
//
// Run:  bun bd bench/parabun-arrow-ipc-interop/run.ts

import parabunArrow from "bun:arrow";
import {
  tableFromIPC,
  tableToIPC,
  Table as AATable,
  RecordBatch as AARecordBatch,
  vectorFromArray,
  makeData,
  Type,
  Int8,
  Int16,
  Int32,
  Uint16,
  Uint32,
  Float64,
  Bool,
  Utf8,
  makeVector,
  Field as AAField,
  Schema as AASchema,
} from "apache-arrow";

console.log("=== bun:arrow ↔ apache-arrow IPC interop ===\n");

// ─── Direction 1: Parabun → apache-arrow ──────────────────────────────────

console.log("[1] Parabun encode → apache-arrow decode");

// Build a batch with the four most-common types. (Skipping bool + int64
// here to keep the apache-arrow side consumption simple — those round-trip
// in our own tests; what we want here is wire compat on the basic layout.)
const parabunBatch = parabunArrow.recordBatch({
  age: new Int32Array([25, 30, 35, 40, 45]),
  score: new Float64Array([0.95, 0.82, 0.71, 0.58, 0.45]),
  name: ["alice", "bob", "carol", "dave", "eve"],
});

const parabunBytes = parabunArrow.toIPC(parabunBatch);
console.log(`  encoded ${parabunBytes.byteLength} bytes`);

let aaTable: AATable;
try {
  aaTable = tableFromIPC(parabunBytes);
} catch (e: any) {
  console.log(`  ✗ apache-arrow failed to parse Parabun bytes: ${e.message}`);
  process.exit(1);
}
console.log(`  apache-arrow parsed: ${aaTable.numRows} rows × ${aaTable.numCols} cols`);

// Verify column-by-column.
let pass = true;
const ageVec = aaTable.getChild("age")!;
const scoreVec = aaTable.getChild("score")!;
const nameVec = aaTable.getChild("name")!;

for (let i = 0; i < aaTable.numRows; i++) {
  const a = ageVec.get(i);
  const s = scoreVec.get(i);
  const n = nameVec.get(i);
  const expA = parabunBatch.column("age").get(i);
  const expS = parabunBatch.column("score").get(i);
  const expN = parabunBatch.column("name").get(i);
  if (a !== expA || s !== expS || n !== expN) {
    console.log(`  ✗ row ${i}: got (${a}, ${s}, ${n}), expected (${expA}, ${expS}, ${expN})`);
    pass = false;
  }
}
console.log(`  column-wise equality: ${pass ? "✓" : "✗"}`);

// ─── Direction 2: apache-arrow → Parabun ──────────────────────────────────

console.log("\n[2] apache-arrow encode → Parabun decode");

// Build the same logical batch on the apache-arrow side. We deliberately
// let apache-arrow choose the encoding for the string column — its default
// is Dictionary<Utf8>, which exercises our DictionaryBatch handling.
//
// JS Date objects → apache-arrow's DateMillisecond (Type.Date, DateUnit.MILLISECOND),
// which our reader coerces to int64 (ms since epoch).
const joinedDates = [
  new Date("2024-01-01T00:00:00Z"),
  new Date("2024-02-15T00:00:00Z"),
  new Date("2024-04-01T00:00:00Z"),
  new Date("2024-05-20T00:00:00Z"),
  new Date("2024-06-30T00:00:00Z"),
];
const aaBuilt = new AATable({
  age: vectorFromArray([25, 30, 35, 40, 45], new Int32()),
  score: vectorFromArray([0.95, 0.82, 0.71, 0.58, 0.45], new Float64()),
  name: vectorFromArray(["alice", "bob", "carol", "dave", "eve"]),
  joined: vectorFromArray(joinedDates),
  // Narrow int columns to exercise the widening read path:
  //   int8  → int32 sign-extending
  //   uint16 → int32 zero-extending
  //   uint32 → int64 zero-extending (BigInt)
  status: vectorFromArray([-1, 0, 1, 2, 127], new Int8()),
  port: vectorFromArray([80, 443, 8080, 22, 65000], new Uint16()),
  ip: vectorFromArray([3232235521, 3232235522, 3232235523, 3232235524, 3232235525], new Uint32()),
});

const aaBytes = tableToIPC(aaBuilt, "stream");
console.log(`  apache-arrow encoded ${aaBytes.byteLength} bytes`);

let parabunRestored: any;
try {
  parabunRestored = parabunArrow.fromIPC(aaBytes);
} catch (e: any) {
  console.log(`  ✗ Parabun failed to parse apache-arrow bytes: ${e.message}`);
  process.exit(1);
}
console.log(`  Parabun parsed: ${parabunRestored.numRows} rows × ${parabunRestored.batches[0].numColumns} cols`);

let pass2 = true;
const restoredAge = parabunRestored.column("age");
const restoredScore = parabunRestored.column("score");
const restoredName = parabunRestored.column("name");
const restoredJoined = parabunRestored.column("joined");
const restoredStatus = parabunRestored.column("status");
const restoredPort = parabunRestored.column("port");
const restoredIp = parabunRestored.column("ip");
const expectedJoined = joinedDates.map(d => BigInt(d.getTime()));
const expectedStatus = [-1, 0, 1, 2, 127];
const expectedPort = [80, 443, 8080, 22, 65000];
const expectedIp = [3232235521n, 3232235522n, 3232235523n, 3232235524n, 3232235525n];
for (let i = 0; i < parabunRestored.numRows; i++) {
  const a = restoredAge.get(i);
  const s = restoredScore.get(i);
  const n = restoredName.get(i);
  const j = restoredJoined.get(i);
  const st = restoredStatus.get(i);
  const p = restoredPort.get(i);
  const ip = restoredIp.get(i);
  const expA = ageVec.get(i);
  const expS = scoreVec.get(i);
  const expN = nameVec.get(i);
  const expJ = expectedJoined[i];
  const expSt = expectedStatus[i];
  const expP = expectedPort[i];
  const expIp = expectedIp[i];
  if (a !== expA || s !== expS || n !== expN || j !== expJ || st !== expSt || p !== expP || ip !== expIp) {
    console.log(
      `  ✗ row ${i}: got (${a}, ${s}, ${n}, ${j}, ${st}, ${p}, ${ip}), expected (${expA}, ${expS}, ${expN}, ${expJ}, ${expSt}, ${expP}, ${expIp})`,
    );
    pass2 = false;
  }
}
console.log(`  column-wise equality (Date64 + Int8 + Uint16 + Uint32 widened): ${pass2 ? "✓" : "✗"}`);

// ─── Result ──────────────────────────────────────────────────────────────

console.log(
  `\n${pass && pass2 ? "=== both directions ok — bun:arrow IPC is wire-compatible with apache-arrow ===" : "=== INTEROP FAILURES ==="}`,
);
process.exit(pass && pass2 ? 0 : 1);
