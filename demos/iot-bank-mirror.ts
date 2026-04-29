// Bank of 4 buttons mirrored to bank of 4 LEDs. (TypeScript form.)
//
//   bun run build:release demos/iot-bank-mirror.ts [--seconds N]
//
// Same demo as iot-bank-mirror.pts; `effect { ... }` becomes
// `signals.effect(() => { ... })`. Identical behavior.
//
// Wire BCM 22, 23, 24, 25 → buttons-to-ground (pull-up). Wire
// BCM 5, 6, 12, 13 → LEDs. Each press lights the matching LED.

import gpio from "bun:gpio";
import signals from "bun:signals";

const args = process.argv.slice(2);
const sIdx = args.indexOf("--seconds");
const seconds = sIdx >= 0 ? Number(args[sIdx + 1]) : null;

const chips = gpio.chips();
const rp1 = chips.find(c => c.label === "pinctrl-rp1");
const chipPath = process.env.GPIO_CHIP ?? rp1?.path ?? chips[0]?.path;
if (!chipPath) {
  console.error("no /dev/gpiochip* found — bun:gpio is Linux-only.");
  process.exit(1);
}

await using chip = gpio.open(chipPath);
await using buttons = chip.bank([22, 23, 24, 25], { mode: "in", pull: "up", debounceMs: 5, pollHz: 50 });
await using leds = chip.bank([5, 6, 12, 13], { mode: "out", initial: 0n });

signals.effect(() => {
  const pressed = ~buttons.value.get() & 0xfn;
  leds.write(pressed);
});

console.log("4-button bank → 4-LED bank. Press any combo; LEDs follow.");
if (seconds !== null && Number.isFinite(seconds)) {
  console.log(`(non-interactive: stopping in ${seconds}s)`);
  await Bun.sleep(seconds * 1000);
} else {
  console.log("Ctrl-C to stop.");
  await new Promise(() => {});
}

leds.write(0n);
console.log("done.");
