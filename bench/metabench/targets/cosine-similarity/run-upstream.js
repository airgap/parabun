// Runs the upstream compute-cosine-similarity library on a deterministic
// workload. Same script runs under node, bun, and parabun — the point is
// that Parabun's compatibility means the untouched npm package just works.
//
// Prints one JSON line per timing group so harness.ts can parse it without
// worrying about terminal escape sequences or banner noise.

const path = require("node:path");
const UPSTREAM = process.env.UPSTREAM_DIR || path.join(__dirname, "..");
const similarity = require(path.join(UPSTREAM, "lib"));
const { generatePair, generateBatch } = require("./gen.js");

const WARMUPS = 3;
const RUNS = 9;

function nowMs() {
  // Node has process.hrtime.bigint; Bun has Bun.nanoseconds. Use hrtime
  // since it's available in both runtimes and gives sub-µs resolution.
  const n = Number(process.hrtime.bigint());
  return n / 1e6;
}

function timePair(D) {
  const { x, y } = generatePair(D, D);
  // Warm
  for (let i = 0; i < WARMUPS; i++) similarity(x, y);
  const times = [];
  let last = 0;
  for (let i = 0; i < RUNS; i++) {
    const t0 = nowMs();
    last = similarity(x, y);
    times.push(nowMs() - t0);
  }
  times.sort((a, b) => a - b);
  return {
    kind: "pair",
    D,
    min: times[0],
    med: times[Math.floor(times.length / 2)],
    max: times[times.length - 1],
    value: last,
  };
}

function timeBatch(N, D) {
  const { pairs } = generateBatch(N, D);
  for (let i = 0; i < WARMUPS; i++) {
    for (let q = 0; q < N; q++) similarity(pairs[q].x, pairs[q].y);
  }
  const times = [];
  let last = 0;
  for (let i = 0; i < RUNS; i++) {
    const t0 = nowMs();
    for (let q = 0; q < N; q++) last = similarity(pairs[q].x, pairs[q].y);
    times.push(nowMs() - t0);
  }
  times.sort((a, b) => a - b);
  return {
    kind: "batch",
    N,
    D,
    min: times[0],
    med: times[Math.floor(times.length / 2)],
    max: times[times.length - 1],
    value: last,
  };
}

const PAIR_DIMS = [128, 768, 4096];
const BATCH = [
  { N: 1000, D: 128 },
  { N: 1000, D: 768 },
];

for (const D of PAIR_DIMS) console.log(JSON.stringify(timePair(D)));
for (const { N, D } of BATCH) console.log(JSON.stringify(timeBatch(N, D)));
