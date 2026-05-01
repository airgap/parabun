// Live mic peak meter — parabun:audio capture + signals.effect. (TypeScript form.)
//
//   bun run build:release demos/audio-meter.ts
//
// Same demo as audio-meter.pts; `effect { ... }` becomes
// `signals.effect(() => { ... })`. Identical behavior.

import audio from "parabun:audio";
import signals from "para:signals";

await using mic = await audio.capture({
  device: "default",
  sampleRate: 16000,
  channels: 1,
});

console.log(`mic open: ${mic.device} @ ${mic.sampleRate} Hz`);
console.log("peak meter — Ctrl-C to stop\n");

signals.effect(() => {
  const peak = mic.peakLevel.get();
  const bars = Math.min(30, Math.round(peak * 30));
  const line = "#".repeat(bars).padEnd(30, ".");
  process.stdout.write(`\r[${line}] ${peak.toFixed(3)}`);
});

for await (const _frame of mic.frames()) {
  // Drain frames so peakLevel keeps updating. The effect handles redraw.
}
