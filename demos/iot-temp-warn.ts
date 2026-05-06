// Pi CPU temperature → warn / error thresholds → two LEDs + log lines.
//
//   bun run build:release demos/iot-temp-warn.ts [--seconds N] [--warn 65] [--error 75]
//
// Reads /sys/class/thermal/thermal_zone0/temp (millidegrees C — works on
// every Pi with no extra wiring) every second and drives two LEDs:
//   BCM 17 → yellow LED — lit when temp ≥ warn (default 65°C)
//   BCM 27 → red LED    — lit when temp ≥ error (default 75°C)
//
// Logs only on threshold transitions so the console isn't a wall of
// "still hot" lines. Uses @para/signals so the LED + log effects fan out
// from one source signal and stay consistent.

import gpio from "parabun:gpio";
import signals from "@para/signals";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const arg = (k: string, d: number) => {
  const i = args.indexOf(k);
  return i >= 0 ? Number(args[i + 1]) : d;
};
const seconds = arg("--seconds", -1);
const warnAt = arg("--warn", 65);
const errorAt = arg("--error", 75);

if (errorAt <= warnAt) {
  console.error(`--error (${errorAt}) must be greater than --warn (${warnAt})`);
  process.exit(1);
}

const chips = gpio.chips();
const rp1 = chips.find(c => c.label === "pinctrl-rp1");
const chipPath = process.env.GPIO_CHIP ?? rp1?.path ?? chips[0]?.path;
if (!chipPath) {
  console.error("no /dev/gpiochip* found — parabun:gpio is Linux-only.");
  process.exit(1);
}

await using chip = gpio.open(chipPath);
await using warnLed = chip.line(17, { mode: "out", initial: 0 });
await using errLed = chip.line(27, { mode: "out", initial: 0 });

const readTemp = (): number => {
  const raw = readFileSync("/sys/class/thermal/thermal_zone0/temp", "utf8").trim();
  return Number(raw) / 1000;
};

type Level = "ok" | "warn" | "error";
const classify = (t: number): Level => (t >= errorAt ? "error" : t >= warnAt ? "warn" : "ok");

const sensor = signals.fromInterval(readTemp, 1000);
const level = signals.derived<Level>(() => {
  const t = sensor.signal.get();
  return t === undefined ? "ok" : classify(t);
});

let last: Level | null = null;
signals.effect(() => {
  const t = sensor.signal.get();
  const lv = level.get();
  if (t === undefined) return;

  warnLed.write(lv === "warn" || lv === "error" ? 1 : 0);
  errLed.write(lv === "error" ? 1 : 0);

  if (lv !== last) {
    const tag = lv === "error" ? "[ERR ]" : lv === "warn" ? "[WARN]" : "[ok  ]";
    console.log(`${tag} ${t.toFixed(1)}°C  (warn=${warnAt}  error=${errorAt})`);
    last = lv;
  }
});

console.log(`watching CPU temp — warn≥${warnAt}°C  error≥${errorAt}°C`);
console.log(`LEDs: BCM17=warn  BCM27=error`);

if (seconds > 0) {
  console.log(`(non-interactive: stopping in ${seconds}s)`);
  await Bun.sleep(seconds * 1000);
} else {
  console.log("Ctrl-C to stop.");
  await new Promise(() => {});
}

sensor.dispose();
warnLed.write(0);
errLed.write(0);
console.log("done.");
