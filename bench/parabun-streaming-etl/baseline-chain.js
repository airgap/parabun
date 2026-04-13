// Baseline A: idiomatic functional style — chain .map calls then .reduce.
// On a Float32Array this still allocates *three* intermediate Float32Arrays
// before the reduce collapses them. N=10M × 4 bytes × 3 = 120 MB of
// transient allocation per pipeline run.

import { generate, N } from "./gen.js";

const data = generate();

const t0 = Bun.nanoseconds();
const total = data
  .map(x => x * 1000)
  .map(x => x + 2.5)
  .map(x => x * 0.998)
  .reduce((a, b) => a + b, 0);
const ms = (Bun.nanoseconds() - t0) / 1e6;

console.log(`baseline-chain score_ms=${ms.toFixed(2)} total=${total.toFixed(4)} n=${N}`);
