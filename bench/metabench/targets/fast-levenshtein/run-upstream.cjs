// Upstream fast-levenshtein benchmark.
// Runs:
//   (a) single-pair distance, repeated
//   (b) closest-match against M candidates
// Under node / bun / parabun.

const path = require("node:path");
const UPSTREAM = process.env.UPSTREAM_DIR || path.join(__dirname, "..");
const Lev = require(path.join(UPSTREAM, "levenshtein.js"));
const { generate } = require("./gen.cjs");

const WARMUPS = 2;
const RUNS = 7;

function nowMs() {
  return Number(process.hrtime.bigint()) / 1e6;
}

function timeIt(label, fn) {
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
    op: label,
    min: times[0],
    med: times[Math.floor(times.length / 2)],
    max: times[times.length - 1],
    value: last,
  };
}

const { query, candidates } = generate({ M: 20000, pairLen: 512 });

// (a) single-pair repeated: 1 000 calls of distance(query, candidates[0]).
// Batch so a single measurement is stable. At pairLen=256 each call is in
// the myers_x branch (multi-word bit-parallel), which is the interesting
// performance envelope.
const target = candidates[0];
const singleRes = timeIt("single_pair_1k", () => {
  let d = 0;
  for (let i = 0; i < 1000; i++) d += Lev.get(query, target);
  return d;
});

// (b) closest-match against M=5000 candidates.
const closestRes = timeIt("closest_20k", () => {
  let min = Infinity;
  let minIdx = -1;
  for (let i = 0; i < candidates.length; i++) {
    const d = Lev.get(query, candidates[i]);
    if (d < min) {
      min = d;
      minIdx = i;
    }
  }
  return minIdx * 1000 + min;
});

console.log(JSON.stringify(singleRes));
console.log(JSON.stringify(closestRes));
