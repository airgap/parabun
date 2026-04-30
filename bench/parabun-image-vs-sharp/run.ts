// Compare para:image (this fork) against sharp on representative ops.
// All four ops are bytes-in / bytes-out so the codec time is included
// — that's the realistic call site (read file, do thing, write back),
// not raw kernel time on already-decoded pixels.
//
//   bun run bench/parabun-image-vs-sharp/seed.ts            # once
//   bun run build:release bench/parabun-image-vs-sharp/run.ts
//
// Pass --sizes=small,medium to override the default sweep.

import image from "para:image";
import sharp from "sharp";
import { readFileSync, existsSync } from "node:fs";

const HERE = new URL(".", import.meta.url).pathname;
const RUNS = 7;
const WARMUP = 2;

function parseSizes(): string[] {
  const arg = process.argv.find(a => a.startsWith("--sizes="));
  if (!arg) return ["small", "medium", "large"];
  return arg
    .slice("--sizes=".length)
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

const sizes = parseSizes();

type Op = {
  name: string;
  parabun: (bytes: Uint8Array) => Promise<Uint8Array>;
  sharp: (bytes: Buffer) => Promise<Buffer>;
};

// All parabun paths use the chained image.pipeline() API so decode →
// transforms → encode happens in one C++ call with shared scratch
// buffers — matches Sharp's lazy libvips graph instead of paying the
// full codec round-trip between every operation.
const ops: Op[] = [
  {
    name: "decode → encode (JPEG q85)",
    parabun: async bytes => image.pipeline(bytes).toBytes({ format: "jpeg", quality: 85 }),
    sharp: async bytes => sharp(bytes).jpeg({ quality: 85, mozjpeg: false }).toBuffer(),
  },
  {
    name: "resize to 1/2 (Lanczos, JPEG out)",
    parabun: async bytes => {
      const meta = await sharp(bytes).metadata();
      const w = (meta.width ?? 0) >> 1;
      const h = (meta.height ?? 0) >> 1;
      return image
        .pipeline(bytes)
        .resize({ width: w, height: h, kernel: "lanczos" })
        .toBytes({ format: "jpeg", quality: 85 });
    },
    sharp: async bytes => {
      const meta = await sharp(bytes).metadata();
      const w = (meta.width ?? 0) >> 1;
      const h = (meta.height ?? 0) >> 1;
      return sharp(bytes)
        .resize(w, h, { kernel: "lanczos3", fit: "fill" })
        .jpeg({ quality: 85, mozjpeg: false })
        .toBuffer();
    },
  },
  {
    name: "Gaussian blur (radius 5, JPEG out)",
    parabun: async bytes => image.pipeline(bytes).blur({ radius: 5 }).toBytes({ format: "jpeg", quality: 85 }),
    sharp: async bytes =>
      sharp(bytes)
        .blur(5 / 3)
        .jpeg({ quality: 85, mozjpeg: false })
        .toBuffer(),
  },
  {
    name: "PNG → resize → PNG out",
    parabun: async bytes => {
      const meta = await sharp(bytes).metadata();
      const w = (meta.width ?? 0) >> 1;
      const h = (meta.height ?? 0) >> 1;
      return image.pipeline(bytes).resize({ width: w, height: h, kernel: "lanczos" }).toBytes({ format: "png" });
    },
    sharp: async bytes => {
      const meta = await sharp(bytes).metadata();
      const w = (meta.width ?? 0) >> 1;
      const h = (meta.height ?? 0) >> 1;
      return sharp(bytes).resize(w, h, { kernel: "lanczos3", fit: "fill" }).png({ compressionLevel: 6 }).toBuffer();
    },
  },
];

function fixturePath(name: string, ext: "jpg" | "png"): string {
  return `${HERE}fixture-${name}.${ext}`;
}

function stats(xs: number[]) {
  const sorted = [...xs].sort((a, b) => a - b);
  return { min: sorted[0], med: sorted[Math.floor(sorted.length / 2)], max: sorted[sorted.length - 1] };
}

async function timeOne(fn: () => Promise<unknown>): Promise<number> {
  const t0 = performance.now();
  await fn();
  return performance.now() - t0;
}

async function bench(label: string, fn: () => Promise<unknown>) {
  for (let i = 0; i < WARMUP; i++) await fn();
  const times: number[] = [];
  for (let i = 0; i < RUNS; i++) times.push(await timeOne(fn));
  return { label, ...stats(times) };
}

console.log(`para:image vs sharp — best-of-${RUNS} per cell (after ${WARMUP} warmup runs)\n`);

for (const op of ops) {
  console.log(`# ${op.name}`);
  console.log(
    ["fixture".padEnd(12), "parabun (med ms)".padEnd(18), "sharp   (med ms)".padEnd(18), "speedup"].join("\t"),
  );
  for (const size of sizes) {
    const useJpeg = !op.name.startsWith("PNG");
    const path = fixturePath(size, useJpeg ? "jpg" : "png");
    if (!existsSync(path)) {
      process.stderr.write(`missing fixture ${path} — run seed.ts first\n`);
      process.exit(1);
    }
    const buf = readFileSync(path);
    const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    const p = await bench("parabun", () => op.parabun(u8));
    const s = await bench("sharp", () => op.sharp(buf));
    const speedup = s.med / p.med;
    const fmt = (v: number) => v.toFixed(1).padStart(7);
    const perfRel = speedup >= 1 ? `${speedup.toFixed(2)}× faster` : `${(1 / speedup).toFixed(2)}× slower`;
    console.log(
      [
        size.padEnd(12),
        `${fmt(p.med)} (${fmt(p.min)}/${fmt(p.max)})`.padEnd(18),
        `${fmt(s.med)} (${fmt(s.min)}/${fmt(s.max)})`.padEnd(18),
        perfRel,
      ].join("\t"),
    );
  }
  console.log();
}
