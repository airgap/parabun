// Baseline: allocates a fresh Uint8Array per "request" in a tight loop.
// Simulates a realistic server path that decodes a binary protocol frame
// into a temp buffer, does work, then drops it.
//
// The work-per-request is deliberately small so the allocation cost is
// visible in the aggregate. If your server spends 10 ms of real CPU per
// request and 20 µs on allocation, pooling won't help you. This bench
// is where pooling would move the needle if it's going to anywhere.

const BUF_SIZE = 65536; // 64 KiB — typical HTTP header/body decode scratch
const ITERS = 200_000; // 200k "requests"
const WORK_BYTES = 2048; // how much of the buffer the "handler" touches

function handle(buf) {
  // Fill then sum a slice — cheap, but forces the JIT to not DCE the alloc.
  let acc = 0;
  for (let i = 0; i < WORK_BYTES; i++) buf[i] = (i * 31 + 7) & 0xff;
  for (let i = 0; i < WORK_BYTES; i++) acc = (acc + buf[i]) | 0;
  return acc;
}

// Warmup
for (let i = 0; i < 1000; i++) {
  const buf = new Uint8Array(BUF_SIZE);
  handle(buf);
}

const t0 = performance.now();
let checksum = 0;
for (let i = 0; i < ITERS; i++) {
  const buf = new Uint8Array(BUF_SIZE);
  checksum = (checksum + handle(buf)) | 0;
}
const ms = performance.now() - t0;

console.log(
  `mode=baseline iters=${ITERS} size=${BUF_SIZE} ms=${ms.toFixed(1)} ns/iter=${((ms * 1e6) / ITERS).toFixed(0)} checksum=${checksum}`,
);
