// Upstream ml-kmeans benchmark. Uses the published package as-is with the
// deterministic initial centers from gen.mjs so the rewrite can be compared
// on identical inputs and identical iteration counts.

import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPSTREAM = process.env.UPSTREAM_DIR || path.join(__dirname, "..");
const { kmeans } = await import(path.join(UPSTREAM, "lib/index.js"));
import { generate, N, D, K } from "./gen.mjs";

const WARMUPS = 1;
const RUNS = 5;

function nowMs() {
  return Number(process.hrtime.bigint()) / 1e6;
}

const { data, initCenters } = generate();

for (let i = 0; i < WARMUPS; i++) {
  kmeans(data, K, { initialization: initCenters, maxIterations: 50, tolerance: 1e-6 });
}

const times = [];
let finalIters = 0;
let finalCentroids = null;
for (let i = 0; i < RUNS; i++) {
  const t0 = nowMs();
  const r = kmeans(data, K, { initialization: initCenters, maxIterations: 50, tolerance: 1e-6 });
  times.push(nowMs() - t0);
  finalIters = r.iterations;
  finalCentroids = r.centroids;
}
times.sort((a, b) => a - b);

console.log(
  JSON.stringify({
    op: "kmeans",
    N,
    D,
    K,
    iters: finalIters,
    min: times[0],
    med: times[Math.floor(times.length / 2)],
    max: times[times.length - 1],
    // Return centroid[0][0] as a stability fingerprint across runtimes.
    fingerprint: finalCentroids[0][0],
  }),
);
