// Smart-camera demo: live V4L2 capture → motion detector → save a JPEG
// snapshot whenever motion fires. ~30 lines for a real surveillance
// feature. Press Ctrl-C to stop.
//
//   bun run build:release demos/camera-motion.ts /dev/video0 ./snaps
//
// Defaults: MJPEG at 1280×720, threshold ratio 0.02 (2% of frame
// pixels changed). Tune via env: MOTION_THRESHOLD=0.01 / FORMAT=yuyv /
// W=640 / H=480.

import camera from "parabun:camera";
import vision from "parabun:vision";
import image from "parabun:image";
import { mkdirSync } from "node:fs";

const devicePath = process.argv[2] ?? "/dev/video0";
const outDir = process.argv[3] ?? "./motion-snaps";
const format = (process.env.FORMAT ?? "mjpg") as "mjpg" | "yuyv" | "nv12" | "rgb24";
const W = Number(process.env.W ?? 1280);
const H = Number(process.env.H ?? 720);
const thresholdRatio = Number(process.env.MOTION_THRESHOLD ?? 0.02);

mkdirSync(outDir, { recursive: true });

await using cam = await camera.open(devicePath, { format, width: W, height: H, fps: 30 });
console.log(`opened ${devicePath} (${format} ${W}×${H})`);

const rgba = vision.frames(cam.frames(), { decodeMjpg: image.decode });
const motion = vision.detectMotion(rgba, { thresholdRatio });

let snapCount = 0;
for await (const event of motion) {
  if (!event.detected) continue;
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${outDir}/motion-${ts}.jpg`;
  const jpg = image.encode(event.frame, { format: "jpeg", quality: 85 });
  await Bun.write(filename, jpg);
  snapCount++;
  console.log(`[motion ${snapCount}] score=${event.score.toFixed(3)} → ${filename}`);
}
