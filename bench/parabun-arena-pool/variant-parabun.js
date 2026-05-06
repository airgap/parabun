// Pooled variant: single Uint8Array recycled across requests via @para/arena.
// Same BUF_SIZE / ITERS / WORK_BYTES / handler as the baseline so the only
// variable is whether we allocate fresh or borrow from a pool.

import arena from "@para/arena";

const BUF_SIZE = 65536;
const ITERS = 200_000;
const WORK_BYTES = 2048;

const pool = new arena.Pool(Uint8Array, BUF_SIZE, { prewarm: 1 });

function handle(buf) {
  let acc = 0;
  for (let i = 0; i < WORK_BYTES; i++) buf[i] = (i * 31 + 7) & 0xff;
  for (let i = 0; i < WORK_BYTES; i++) acc = (acc + buf[i]) | 0;
  return acc;
}

// Warmup
for (let i = 0; i < 1000; i++) {
  const buf = pool.acquire();
  handle(buf);
  pool.release(buf);
}

const t0 = performance.now();
let checksum = 0;
for (let i = 0; i < ITERS; i++) {
  const buf = pool.acquire();
  checksum = (checksum + handle(buf)) | 0;
  pool.release(buf);
}
const ms = performance.now() - t0;

console.log(
  `mode=pool iters=${ITERS} size=${BUF_SIZE} ms=${ms.toFixed(1)} ns/iter=${((ms * 1e6) / ITERS).toFixed(0)} checksum=${checksum}`,
);
