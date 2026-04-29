// IoT dashboard — derived signals + effect + reactive bindings. (TypeScript form.)
//
//   bun run build:release demos/iot-dashboard.ts
//
// Same demo as iot-dashboard.pts; the parabun sugar maps to:
//
//   signal X = Y               →  const X = signals.signal(Y)
//   signal X = expr-of-signals →  const X = signals.derived(() => expr)
//   X (bare read in tracked)   →  X.get()
//   X = v (assignment)         →  X.set(v)
//   effect { body }            →  signals.effect(() => { body })
//   A ~> B.prop                →  signals.effect(() => { B.prop = A.get() })
//   A ~> B.prop when C         →  signals.effect(() => { if (C.get()) B.prop = A.get() })

import signals from "bun:signals";

// Inputs — simulated sensor values updated by the loop at the bottom.
const temperature = signals.signal(22); // °C
const humidity = signals.signal(45); // %
const door = signals.signal<"closed" | "open">("closed");

// Derived state — RHS that reads other signals re-evaluates on change.
const isHot = signals.derived(() => temperature.get() > 30);
const isHumid = signals.derived(() => humidity.get() > 80);
const alarm = signals.derived(() => isHot.get() || isHumid.get() || door.get() === "open");

// Pretend display panel — a sink the dashboard writes into.
const display: { line: boolean | string } = { line: "" };

// Reactive log every time any input or derived value changes.
signals.effect(() => {
  const t = temperature.get();
  const h = humidity.get();
  const d = door.get();
  const a = alarm.get();
  console.log(`${a ? "[ALARM]" : "[ ok  ]"}  t=${t.toFixed(1)}C  h=${h.toFixed(0)}%  door=${d}`);
});

// Reactive binding: write `alarm.get()` into `display.line` whenever the
// door is open. Parabun's `alarm ~> display.line when door === "open"`
// desugars to this exact effect.
signals.effect(() => {
  if (door.get() === "open") display.line = alarm.get();
});

const reads: Array<{ temp?: number; hum?: number; door?: "closed" | "open" }> = [
  { temp: 24 },
  { temp: 28 },
  { hum: 70 },
  { temp: 32 }, // crosses isHot threshold
  { door: "open" }, // alarm flips, the bound effect fires display update
  { hum: 85 }, // both hot AND humid
  { temp: 26 }, // cools down — alarm still set (door open)
  { door: "closed" }, // closes door — alarm clears
  { hum: 50 },
];

for (const r of reads) {
  if (r.temp !== undefined) temperature.set(r.temp);
  if (r.hum !== undefined) humidity.set(r.hum);
  if (r.door !== undefined) door.set(r.door);
  await Bun.sleep(150);
}

console.log(`\nfinal display.line: ${display.line}`);
