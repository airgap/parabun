// Baseline: Black-Scholes European call option priced by Monte Carlo,
// single-threaded. N = 5M sample paths. Deterministic (mulberry32 +
// Box-Muller), so the baseline and parabun variants converge to the same
// price modulo chunking.
//
// This is the "naive but honest" pricer — one tight loop, no workers.

const N = 50_000_000;
const S0 = 100,
  K = 100,
  T = 1,
  r = 0.05,
  sigma = 0.2;
const SEED = 0xc0ffee;

function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f7) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const t0 = Bun.nanoseconds();
const rng = mulberry32(SEED);
const sqrtT = Math.sqrt(T);
const drift = (r - 0.5 * sigma * sigma) * T;
let sum = 0;
for (let i = 0; i < N; i++) {
  let u = rng();
  while (u === 0) u = rng();
  const v = rng();
  const Z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  const ST = S0 * Math.exp(drift + sigma * sqrtT * Z);
  if (ST > K) sum += ST - K;
}
const price = (Math.exp(-r * T) * sum) / N;
const ms = (Bun.nanoseconds() - t0) / 1e6;

console.log(`baseline score_ms=${ms.toFixed(2)} price=${price.toFixed(6)} samples=${N}`);
