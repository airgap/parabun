// Upstream simple-statistics bench — ESM (the upstream source is .js ESM).
// Runs the same functions under node, bun, and parabun.
//
// Focus subset:
//   - sum, mean   — reductions where SIMD helps
//   - variance, standardDeviation   — need mean then squared-deviation sum
//   - sampleCovariance, sampleCorrelation   — two-array reductions (dot-like)
//
// We bench one "large" length (N=100_000 float samples) to amortize call
// overhead; the per-op numbers are meaningful for real pipelines, not
// micro-allocations.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPSTREAM = process.env.UPSTREAM_DIR || path.join(__dirname, "..");
const { sum, mean, variance, standardDeviation, sampleCovariance, sampleCorrelation } = await import(
  path.join(UPSTREAM, "dist/simple-statistics.mjs")
);
const require = createRequire(import.meta.url);
const { generateSingle, generatePair } = require("./gen.js");

const WARMUPS = 3;
const RUNS = 9;
const N = 100_000;

function nowMs() {
  return Number(process.hrtime.bigint()) / 1e6;
}

function time(name, fn) {
  for (let i = 0; i < WARMUPS; i++) fn();
  const times = [];
  let last = 0;
  for (let i = 0; i < RUNS; i++) {
    const t0 = nowMs();
    last = fn();
    times.push(nowMs() - t0);
  }
  times.sort((a, b) => a - b);
  return {
    op: name,
    N,
    min: times[0],
    med: times[Math.floor(times.length / 2)],
    max: times[times.length - 1],
    value: last,
  };
}

const { x } = generateSingle(N, 1);
const pair = generatePair(N, 2);

console.log(JSON.stringify(time("sum", () => sum(x))));
console.log(JSON.stringify(time("mean", () => mean(x))));
console.log(JSON.stringify(time("variance", () => variance(x))));
console.log(JSON.stringify(time("standardDeviation", () => standardDeviation(x))));
console.log(JSON.stringify(time("sampleCovariance", () => sampleCovariance(pair.x, pair.y))));
console.log(JSON.stringify(time("sampleCorrelation", () => sampleCorrelation(pair.x, pair.y))));
