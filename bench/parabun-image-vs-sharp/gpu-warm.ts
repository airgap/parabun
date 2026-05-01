// Cold-vs-warm-vs-sustained GPU bench for image.blur.
//
// Purpose: separate the per-dispatch perf into three regimes so the
// "GPU is slower than CPU" finding has a clear cause attached.
//
//   1. cold      — first dispatch after the GPU has been idle. Pays
//                  the full P-state ramp tax + JIT-compile.
//   2. warm      — single dispatch after JIT-compile but with the GPU
//                  back in P8 (a `setTimeout` between calls is enough
//                  to let it idle on most desktop GPUs).
//   3. sustained — back-to-back dispatches in a tight loop. Steady
//                  state after ~30 iterations once GPU clocks ramp.
//
// On a desktop RTX 4070 Ti (CUDA 12.8, driver 570.211): even sustained
// dispatch is bottlenecked at ~2 GB/s PCIe Gen 1 x8 because the driver
// keeps the link in low-power mode. CPU SIMD at 39 ms wins vs GPU
// sustained at 111 ms for a 4096² blur. Server-class hosts where the
// GPU sees constant traffic will see PCIe ramp to Gen 4 x16, at which
// point GPU is expected to win — that's what to test on production
// hardware before pitching the GPU path as a feature.
//
//   bun run build:release --asan=off bench/parabun-image-vs-sharp/gpu-warm.ts

import image from "parabun:image";

const N = 4096;
const data = new Uint8Array(N * N * 4);
for (let i = 0; i < data.length; i++) data[i] = i & 0xff;
const img = { data, width: N, height: N, channels: 4, format: "png" };

// JIT compile + warm CPU.
image.blur(img, { radius: 5, gpu: true });
for (let i = 0; i < 3; i++) image.blur(img, { radius: 5 });

// CPU steady-state.
const cpu: number[] = [];
for (let i = 0; i < 10; i++) {
  const t = performance.now();
  image.blur(img, { radius: 5 });
  cpu.push(performance.now() - t);
}
cpu.sort((a, b) => a - b);

// GPU cold — let the GPU idle, then time one call.
await new Promise(r => setTimeout(r, 1500));
const t0 = performance.now();
image.blur(img, { radius: 5, gpu: true });
const cold = performance.now() - t0;

// GPU sustained — 200 back-to-back, take the steady-state median of
// the last 100 runs (gives the GPU clocks time to ramp).
const sustained: number[] = [];
for (let i = 0; i < 200; i++) {
  const t = performance.now();
  image.blur(img, { radius: 5, gpu: true });
  if (i >= 100) sustained.push(performance.now() - t);
}
sustained.sort((a, b) => a - b);

const fmt = (v: number) => v.toFixed(1).padStart(7);
console.log(`# ${N}² RGBA Gaussian blur (radius 5)`);
console.log();
console.log(`CPU SIMD (steady):       ${fmt(cpu[5])} ms med (min ${fmt(cpu[0])})`);
console.log(`GPU cold (idle GPU):     ${fmt(cold)} ms`);
console.log(`GPU sustained (warm):    ${fmt(sustained[50])} ms med (min ${fmt(sustained[0])})`);
console.log();
console.log(`vs CPU baseline:`);
console.log(`  cold       ${(cpu[5] / cold).toFixed(2)}× ${cpu[5] / cold > 1 ? "GPU faster" : "GPU slower"}`);
console.log(
  `  sustained  ${(cpu[5] / sustained[50]).toFixed(2)}× ${cpu[5] / sustained[50] > 1 ? "GPU faster" : "GPU slower"}`,
);
console.log();
console.log("# Check PCIe link state (Gen 4 x16 = 32 GB/s, Gen 1 x8 = 2 GB/s):");
console.log("#   nvidia-smi --query-gpu=pcie.link.gen.current,pcie.link.width.current --format=csv");
