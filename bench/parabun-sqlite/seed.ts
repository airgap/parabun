// Creates bench.db with N_ROWS rows of synthetic sensor-reading data.
// Run once; all three variants read the same database.

import { Database } from "bun:sqlite";
import { unlinkSync, existsSync } from "node:fs";

const DB_PATH = new URL("./bench.db", import.meta.url).pathname;
const N_SENSORS = 8;
const N_ROWS = 1_000_000;

if (existsSync(DB_PATH)) unlinkSync(DB_PATH);

const db = new Database(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA synchronous = NORMAL");

db.exec(`
  CREATE TABLE readings (
    id INTEGER PRIMARY KEY,
    sensor_id INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    value REAL NOT NULL
  )
`);
db.exec("CREATE INDEX idx_readings_sensor ON readings(sensor_id, timestamp)");

const insert = db.prepare("INSERT INTO readings (sensor_id, timestamp, value) VALUES (?, ?, ?)");
const tx = db.transaction(() => {
  for (let i = 0; i < N_ROWS; i++) {
    const sensorId = i % N_SENSORS;
    const ts = i;
    // Signal + noise: different frequency per sensor, plus uniform noise.
    const base = Math.sin(i * 0.0015 * (1 + sensorId * 0.2));
    const noise = (Math.random() - 0.5) * 0.2;
    const value = base + noise;
    insert.run(sensorId, ts, value);
  }
});

const t0 = Bun.nanoseconds();
tx();
const elapsedMs = (Bun.nanoseconds() - t0) / 1e6;

const { total } = db.query("SELECT COUNT(*) AS total FROM readings").get() as {
  total: number;
};

console.log(`seeded ${total.toLocaleString()} rows across ${N_SENSORS} sensors`);
console.log(`insert elapsed: ${elapsedMs.toFixed(1)} ms`);
console.log(`db path: ${DB_PATH}`);

db.close();
