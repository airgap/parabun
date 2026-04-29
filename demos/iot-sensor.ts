// Periodic sensor → derived state → reactive log. (TypeScript form.)
//
//   bun run build:release demos/iot-sensor.ts
//
// Same demo as iot-sensor.pts; `effect { ... }` becomes
// `signals.effect(() => { ... })`. Same `signals.fromInterval` + `derived`
// shape works in both forms.

import signals from "bun:signals";

let pulse = 0;
const sensor = signals.fromInterval(() => {
  pulse = (pulse + 1) % 16;
  return 22 + pulse * 1.2; // °C, sweep 22–40
}, 200);

const isHot = signals.derived(() => (sensor.signal.get() ?? 0) > 30);

signals.effect(() => {
  const t = sensor.signal.get();
  const hot = isHot.get();
  if (t !== undefined) {
    console.log(`${hot ? "[HOT] " : "[ok ] "} ${t.toFixed(1)}C`);
  }
});

console.log("simulated sensor — 16 readings over ~3.2s\n");
await Bun.sleep(3300);
sensor.dispose();
console.log("\ndone.");
