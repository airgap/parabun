// Variant A: idiomatic bun:sqlite + plain JS analytical post-processing.
// This is the reference that variants B and C are compared against.
// Pure JS, no parabun syntax — runs identically on upstream bun.

import { Database } from "bun:sqlite";

const DB_PATH = new URL("./bench.db", import.meta.url).pathname;
const N_SENSORS = 8;

const db = new Database(DB_PATH, { readonly: true });

function loadSensor(sid) {
  return db.query("SELECT value FROM readings WHERE sensor_id = ? ORDER BY timestamp").values(sid);
}

function analyzeSensor(sid, rows) {
  const n = rows.length;

  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const v = rows[i][0];
    sum += v;
    sumSq += v * v;
  }
  const mean = sum / n;
  const variance = sumSq / n - mean * mean;
  const stddev = Math.sqrt(variance);

  // weighted dot: weight[i] = exp(-i / n)
  let dot = 0;
  const invN = 1 / n;
  for (let i = 0; i < n; i++) {
    dot += rows[i][0] * Math.exp(-i * invN);
  }

  const thresh = 3 * stddev;
  let anomalies = 0;
  for (let i = 0; i < n; i++) {
    if (Math.abs(rows[i][0] - mean) > thresh) anomalies++;
  }

  return { sid, n, mean, stddev, dot, anomalies };
}

// Phase 1: load — SQLite row extraction. Same cost for all variants since
// none of parabun's features touch sqlite row iteration.
const tLoad0 = Bun.nanoseconds();
const sensorRows = [];
for (let sid = 0; sid < N_SENSORS; sid++) {
  sensorRows.push(loadSensor(sid));
}
const loadMs = (Bun.nanoseconds() - tLoad0) / 1e6;

// Phase 2: analyze — the step we're actually comparing. Variants A/B use
// plain JS tight loops over `rows[i][0]`; variant C uses @para/simd over a
// Float64Array.
const tAnalyze0 = Bun.nanoseconds();
const results = [];
for (let sid = 0; sid < N_SENSORS; sid++) {
  results.push(analyzeSensor(sid, sensorRows[sid]));
}
const analyzeMs = (Bun.nanoseconds() - tAnalyze0) / 1e6;

for (const r of results) {
  console.log(
    `sensor ${r.sid}: n=${r.n.toLocaleString()} mean=${r.mean.toFixed(6)} ` +
      `stddev=${r.stddev.toFixed(6)} dot=${r.dot.toFixed(4)} anomalies=${r.anomalies}`,
  );
}
console.log(
  `variant A load_ms=${loadMs.toFixed(2)} analyze_ms=${analyzeMs.toFixed(2)} total_ms=${(loadMs + analyzeMs).toFixed(2)}`,
);

db.close();
