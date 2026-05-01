// parabun:camera + parabun:audio compose demo
//
// Captures 2 seconds of video frames + microphone audio from the first
// available device on each side, saves:
//   - frame_<N>.jpg — first / middle / last frame as JPEG via parabun:image
//   - audio.wav     — full capture as WAV via parabun:audio.writeWav
//
// Run with:
//   bun bd bench/parabun-embedded-capture/run.ts
//
// Output goes to bench/parabun-embedded-capture/out/. Cleans the dir
// before each run.

import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import audio from "parabun:audio";
import camera from "parabun:camera";
import image from "parabun:image";

const OUT_DIR = new URL("./out", import.meta.url).pathname;
const DURATION_MS = 2000;

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

console.log("=== parabun:camera + parabun:audio compose demo ===");
console.log(`output dir: ${OUT_DIR}\n`);

// 1. Pick a camera + mic
const cams = await camera.devices();
if (cams.length === 0) throw new Error("no cameras");
const camDev = cams[0];

const audioDevs = await audio.devices();
if (audioDevs.input.length === 0) throw new Error("no audio inputs");
const micDev = audioDevs.input[0];

console.log(`camera: ${camDev.path}  ${camDev.name}`);
console.log(`mic:    ${micDev.id}  ${micDev.name}\n`);

// 2. Pick a small mjpg format from the camera (lowest size that supports >=15fps)
const fmts = await camera.formats(camDev.path);
const mjpgPicks = fmts.filter(f => f.format === "mjpg" && f.fpsNum / f.fpsDen >= 15);
mjpgPicks.sort((a, b) => a.width * a.height - b.width * b.height);
const camPick = mjpgPicks[0];
if (!camPick) throw new Error("camera doesn't support mjpg");
console.log(
  `camera format: ${camPick.format} ${camPick.width}×${camPick.height} @ ${(camPick.fpsNum / camPick.fpsDen).toFixed(0)}fps`,
);

// 3. Audio: use device's advertised channel count + first rate
const sampleRate = micDev.rates.includes(48000) ? 48000 : micDev.rates[0];
const channels = micDev.channels;
console.log(`audio format: ${sampleRate}Hz ch=${channels}\n`);

// 4. Open both
const tOpen = performance.now();
await using cam = await camera.open(camDev.path, {
  format: "mjpg",
  width: camPick.width,
  height: camPick.height,
});
await using mic = await audio.capture({
  device: micDev.id,
  sampleRate,
  channels,
  periodMs: 20,
});
console.log(`opened (${(performance.now() - tOpen).toFixed(1)}ms)`);

// 5. Capture loop — drive both async iterators in parallel until DURATION_MS elapsed
const frames: { data: Uint8Array; ts: number; seq: number }[] = [];
const audioChunks: Float32Array[] = [];

const t0 = performance.now();
const deadline = t0 + DURATION_MS;

const camTask = (async () => {
  for await (const f of cam.frames()) {
    frames.push({ data: new Uint8Array(f.data), ts: f.timestampMs, seq: f.sequence });
    if (performance.now() >= deadline) break;
  }
})();

const micTask = (async () => {
  for await (const a of mic.frames({ frameMs: 20 })) {
    audioChunks.push(a.samples);
    if (performance.now() >= deadline) break;
  }
})();

await Promise.all([camTask, micTask]);
const elapsed = performance.now() - t0;
console.log(`captured: ${frames.length} frames + ${audioChunks.length} audio chunks in ${elapsed.toFixed(0)}ms`);

// 6. Save audio as WAV (concatenate chunks first)
const totalSamples = audioChunks.reduce((n, c) => n + c.length, 0);
const merged = new Float32Array(totalSamples);
{
  let off = 0;
  for (const c of audioChunks) {
    merged.set(c, off);
    off += c.length;
  }
}
// audio.writeWav expects { samples, sampleRate, channels }
const wavBytes = audio.writeWav({ samples: merged, sampleRate, channels });
writeFileSync(join(OUT_DIR, "audio.wav"), wavBytes);
console.log(`  wrote audio.wav: ${wavBytes.byteLength} bytes (${(totalSamples / channels / sampleRate).toFixed(2)}s)`);

// 7. Save first / middle / last frame as JPEG. MJPG frames are already
//    JPEG bitstreams — so just write them straight to disk. Demonstrate
//    the parabun:image round-trip path on the middle frame: decode → re-encode
//    at q=85 (slightly different size than the camera's q).
if (frames.length === 0) {
  console.log("  WARN: no frames captured");
} else {
  const sample = [frames[0], frames[Math.floor(frames.length / 2)], frames[frames.length - 1]];
  for (const [i, f] of sample.entries()) {
    const path = join(OUT_DIR, `frame_${i}.jpg`);
    writeFileSync(path, f.data);
  }
  console.log(`  wrote frame_0/1/2.jpg straight from the camera (MJPG bitstreams)`);

  // Round-trip the middle frame through parabun:image to prove the codec stack composes.
  const mid = frames[Math.floor(frames.length / 2)];
  const decoded = image.decode(mid.data);
  console.log(`  decoded middle frame: ${decoded.width}×${decoded.height} ch=${decoded.channels}`);
  const reEncoded = image.encode(decoded, { format: "jpeg", quality: 85 });
  writeFileSync(join(OUT_DIR, "frame_mid_q85.jpg"), reEncoded);
  console.log(`  wrote frame_mid_q85.jpg: ${reEncoded.byteLength} bytes (re-encoded via parabun:image)`);
}

// 8. Compute audio stats for sanity
let peak = 0;
let sumSq = 0;
for (const v of merged) {
  if (Math.abs(v) > peak) peak = Math.abs(v);
  sumSq += v * v;
}
const rms = Math.sqrt(sumSq / merged.length);
console.log(`\naudio stats: peak=${peak.toFixed(4)} rms=${rms.toFixed(4)}`);
console.log(`frame stats: ${frames.length} captured (avg ${(elapsed / frames.length).toFixed(1)}ms apart)`);

console.log("\n=== ok ===");
