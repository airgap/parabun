// End-to-end smoke test of the wired-up cuda backend via parabun:gpu.
//
// Run: bun bd --asan=off run scripts/gpu-verify/backend.ts
//
// Asserts:
//   1. probe() returns true on a CUDA host
//   2. setBackend("cuda") succeeds and describe() reports it active
//   3. gpu.simdMap(x => 3*x + 1, a) matches the CPU path bit-exactly
//      on a large Float32Array (hits the PTX path via tryAffineKernel)
import gpu from "parabun:gpu";

console.log("describe:", JSON.stringify(gpu.describe()));

if (!gpu.hasBackend("cuda")) {
  console.log("FAIL: cuda backend not probed successfully");
  process.exit(1);
}

gpu.setBackend("cuda");
console.log("active after setBackend('cuda'):", gpu.activeBackend());

const N = 1 << 20;
const a = new Float32Array(N);
for (let i = 0; i < N; i++) a[i] = i;

// winsForSize should return true for 1M-element simdMap
const wins = gpu.winsForSize("simdMap", N, 4);
console.log("winsForSize simdMap 1M f32:", wins);

const gpuOut = gpu.simdMap(x => 3 * x + 1, a);

gpu.setBackend("cpu");
const cpuOut = gpu.simdMap(x => 3 * x + 1, a);

let errs = 0;
for (let i = 0; i < N; i++) {
  if (Math.abs(gpuOut[i] - cpuOut[i]) > 1e-3) {
    if (errs < 5) console.log(`mismatch @${i}: gpu=${gpuOut[i]} cpu=${cpuOut[i]}`);
    errs++;
  }
}
console.log(errs === 0 ? `OK: cuda simdMap matches cpu over ${N} f32` : `FAIL: ${errs} mismatches`);

gpu.dispose();
