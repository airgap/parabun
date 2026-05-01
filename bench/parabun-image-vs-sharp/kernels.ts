// Kernel-only comparison vs sharp 0.34.5. Bypasses codec on both sides
// (raw pixels in / raw pixels out) so the numbers reflect the actual
// blur / resize / etc. work — not Sharp's lazy decode→transform→encode
// pipelining advantage in the end-to-end bench.
//
// This is the "is our kernel actually faster than libvips's kernel"
// question. The end-to-end run.ts answers a different question: "what
// happens in a typical decode-do-thing-encode call site". For now Sharp
// wins end-to-end because of its pipelined buffer sharing across ops;
// the path to closing that is a chained image.pipeline() API in
// parabun:image, not more kernel tuning.
//
//   bun run build:release --asan=off bench/parabun-image-vs-sharp/kernels.ts

import image from "parabun:image";
import sharp from "./node_modules/sharp/lib/index.js";

const N = 4096;
const data = new Uint8Array(N * N * 4);
for (let i = 0; i < data.length; i++) data[i] = (i * 17) & 0xff;
const decoded = { data, width: N, height: N, channels: 4, format: "png" } as const;

function stats(xs: number[]) {
  const sorted = [...xs].sort((a, b) => a - b);
  return { min: sorted[0], med: sorted[Math.floor(sorted.length / 2)], max: sorted[sorted.length - 1] };
}

async function bench(fn: () => Promise<unknown>) {
  for (let i = 0; i < 2; i++) await fn();
  const t: number[] = [];
  for (let i = 0; i < 7; i++) {
    const t0 = performance.now();
    await fn();
    t.push(performance.now() - t0);
  }
  return stats(t);
}

const fmt = (v: number) => v.toFixed(1).padStart(7);
const printRow = (label: string, sh: ReturnType<typeof stats>, pb: ReturnType<typeof stats>) => {
  const speedup = sh.med / pb.med;
  const verdict = speedup > 1 ? `${speedup.toFixed(2)}× FASTER` : `${(1 / speedup).toFixed(2)}× slower`;
  console.log(`${label.padEnd(36)}  sharp ${fmt(sh.med)} ms   parabun ${fmt(pb.med)} ms   ${verdict}`);
};

console.log(`# Kernel-only comparison (no codec), 4096² RGBA\n`);

console.log("## Gaussian blur");
for (const r of [3, 5, 10, 20]) {
  const sh = await bench(async () => {
    await sharp(data, { raw: { width: N, height: N, channels: 4 } })
      .blur(r / 3)
      .raw()
      .toBuffer();
  });
  const pb = await bench(async () => image.blur(decoded, { radius: r }));
  printRow(`  radius=${r}`, sh, pb);
}

console.log();
console.log("## Resize to 1/2");
const halfW = N >> 1,
  halfH = N >> 1;
for (const k of ["lanczos", "bilinear"] as const) {
  const sharpKernel = k === "lanczos" ? "lanczos3" : "linear";
  const sh = await bench(async () => {
    await sharp(data, { raw: { width: N, height: N, channels: 4 } })
      .resize(halfW, halfH, { kernel: sharpKernel as any, fit: "fill" })
      .raw()
      .toBuffer();
  });
  const pb = await bench(async () => image.resize(decoded, { width: halfW, height: halfH, kernel: k }));
  printRow(`  ${k}`, sh, pb);
}

console.log();
console.log("## Box blur (parabun specialty — sharp has no equivalent)");
for (const r of [3, 5, 10, 20]) {
  const sh = await bench(async () => {
    // Sharp's nearest equivalent is also Gaussian blur at the same sigma.
    await sharp(data, { raw: { width: N, height: N, channels: 4 } })
      .blur(r / 3)
      .raw()
      .toBuffer();
  });
  const pb = await bench(async () => image.boxBlur(decoded, { radius: r }));
  printRow(`  radius=${r} (vs sharp Gaussian)`, sh, pb);
}
