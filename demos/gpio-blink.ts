// Blink an LED + react to a button — parabun:gpio. (TypeScript form.)
//
//   bun run build:release demos/gpio-blink.ts [--seconds N]
//
// Identical to demos/gpio-blink.pts; uses no parabun sugar, so the
// TypeScript file is the same code with the .ts extension. Kept here
// so readers who don't want to use the .pts extension have a working
// starting point for every demo.

import gpio from "parabun:gpio";

const args = process.argv.slice(2);
const secondsIdx = args.indexOf("--seconds");
const seconds = secondsIdx >= 0 ? Number(args[secondsIdx + 1]) : null;

const chips = gpio.chips();
const rp1 = chips.find(c => c.label === "pinctrl-rp1");
const chipPath = process.env.GPIO_CHIP ?? rp1?.path ?? chips[0]?.path;
if (!chipPath) {
  console.error("no /dev/gpiochip* found — parabun:gpio is Linux-only.");
  process.exit(1);
}

await using chip = gpio.open(chipPath);
console.log(`opened ${chip.path} (${chip.label}, ${chip.lines} lines)`);

await using led = chip.line(17, { mode: "out", initial: 0 });

let stop = false;
const blinker = (async () => {
  while (!stop) {
    led.toggle();
    await Bun.sleep(500);
  }
})();

if (seconds !== null && Number.isFinite(seconds)) {
  console.log(`blinking LED on BCM17 for ${seconds}s — non-interactive mode.`);
  await Bun.sleep(seconds * 1000);
} else {
  await using button = chip.line(27, {
    mode: "in",
    pull: "up",
    edge: "falling",
    debounceMs: 5,
  });
  console.log("blinking LED on BCM17 — press button on BCM27 to stop.");
  for await (const e of button.edges()) {
    console.log(`press at ${e.timestampNs}ns (kind=${e.kind}, value=${e.value})`);
    break;
  }
}

stop = true;
await blinker;
led.write(0);
console.log("done.");
