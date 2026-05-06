// Streaming-ETL pipeline (TypeScript form). Cross-runtime via the
// @para/simd facade — runs native AVX2/NEON in Parabun, WebAssembly
// SIMD in browsers, scalar elsewhere. Same API everywhere.
//
//   bun run build:release demos/streaming-etl.ts

import simd from "@para/simd";

const N = 10_000_000;

const readings = new Float32Array(N);
for (let i = 0; i < N; i++) readings[i] = Math.sin(i * 0.001) * 100 + Math.random() * 10;
console.log(`generated ${N.toLocaleString()} readings`);

// SIMD pipeline: scale × 1.8 + 32 (°C → °F), then back, then sum.
// Each step is one SIMD pass over the typed array.
const t0 = Bun.nanoseconds();
const stage1 = simd.mulScalar(readings, 1.8);
const stage2 = simd.addScalar(stage1, 32);
const stage3 = simd.addScalar(stage2, -32);
const total = simd.sum(stage3);
const dtMs = (Bun.nanoseconds() - t0) / 1e6;

console.log(`SIMD pipeline sum: ${total.toFixed(0)} in ${dtMs.toFixed(2)}ms`);
console.log(`(throughput: ${((N * 4 * 4) / 1e6 / (dtMs / 1000)).toFixed(0)} MB/s end-to-end)`);

// Compare with naive .map().reduce().
const t1 = Bun.nanoseconds();
const naive = readings
  .map(x => x * 1.8 + 32)
  .map(x => x - 32)
  .reduce((a, b) => a + b, 0);
const naiveMs = (Bun.nanoseconds() - t1) / 1e6;

console.log(`naive .map().reduce(): ${naive.toFixed(0)} in ${naiveMs.toFixed(2)}ms`);
console.log(`speedup: ${(naiveMs / dtMs).toFixed(1)}×`);
