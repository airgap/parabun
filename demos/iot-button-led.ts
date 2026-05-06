// Reactive button → LED — the simplest IoT shape in TypeScript.
//
//   bun run build:release demos/iot-button-led.ts [--seconds N]
//
// Same demo as iot-button-led.pts; the parabun `A -> fn` reactive
// call-binding becomes `signals.effect(() => fn(A))` here. Identical
// behavior.
//
// Wire BCM 27 → button to ground (pull-up), BCM 17 → LED. The whole
// control loop is one `effect()` callback: when `button.value`
// changes, the effect re-runs and writes the LED. `pollHz: 50` tells
// `parabun:gpio` to drive the value signal at 50 Hz in the background.

import gpio from "parabun:gpio";
import signals from "@para/signals";

const args = process.argv.slice(2);
const sIdx = args.indexOf("--seconds");
const seconds = sIdx >= 0 ? Number(args[sIdx + 1]) : null;

const chips = gpio.chips();
const rp1 = chips.find(c => c.label === "pinctrl-rp1");
const chipPath = process.env.GPIO_CHIP ?? rp1?.path ?? chips[0]?.path;
if (!chipPath) {
  console.error("no /dev/gpiochip* found — parabun:gpio is Linux-only.");
  process.exit(1);
}

await using chip = gpio.open(chipPath);
await using button = chip.line(27, { mode: "in", pull: "up", debounceMs: 5, pollHz: 50 });
await using led = chip.line(17, { mode: "out", initial: 0 });

signals.effect(() => led.write(button.value.get() === 0 ? 1 : 0));

console.log("button BCM27 → LED BCM17. Press the button to light the LED.");
if (seconds !== null && Number.isFinite(seconds)) {
  console.log(`(non-interactive: stopping in ${seconds}s)`);
  await Bun.sleep(seconds * 1000);
} else {
  console.log("Ctrl-C to stop.");
  await new Promise(() => {});
}

led.write(0);
console.log("done.");
