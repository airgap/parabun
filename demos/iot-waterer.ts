// Multi-plant auto waterer — moisture signals per plant, threshold-driven
// pump pulses with a cooldown to prevent drowning, plus a tank-level
// sensor that pauses all watering when empty and notifies on the
// empty/refilled transitions. (TypeScript form.)
//
//   bun run build:release demos/iot-waterer.ts \
//     [--seconds N] [--simulate] [--demo-empty]
//
// The boilerplate is in the runtime now:
//   - parabun:gpio.openDefaultChip()       — RP1 → gpiochip0 fallback
//   - parabun:i2c.ads1115("/dev/i2c-1")    — config-register dance hidden
//   - signals.cooldown(fn, { key, coolingMs }) — per-plant rate-limit
//
// Hardware:
//   I²C bus 1 → ADS1115 @ 0x48
//     ch 0..2 → capacitive moisture sensors (one per plant)
//     ch 3    → analog tank-level sensor
//   GPIO chip pinctrl-rp1 → BCM 17 / 27 / 22 = pump relays

import gpio from "parabun:gpio";
import i2c from "parabun:i2c";
import signals from "@para/signals";
import lifecycle from "@para/lifecycle";

interface Plant {
  name: string;
  channel: number;
  pumpPin: number;
  dryAt: number;
  pumpMs: number;
  cooldownMs: number;
}

const PLANTS: Plant[] = [
  { name: "basil", channel: 0, pumpPin: 17, dryAt: 0.35, pumpMs: 1500, cooldownMs: 60_000 },
  { name: "fern", channel: 1, pumpPin: 27, dryAt: 0.4, pumpMs: 2000, cooldownMs: 90_000 },
  { name: "succulent", channel: 2, pumpPin: 22, dryAt: 0.18, pumpMs: 800, cooldownMs: 120_000 },
];

const TANK_CHANNEL = 3;
const TANK_EMPTY_AT = 0.05;
const TANK_LOW_AT = 0.2;

const args = process.argv.slice(2);
const num = (k: string, d: number) => {
  const i = args.indexOf(k);
  return i >= 0 ? Number(args[i + 1]) : d;
};
const seconds = num("--seconds", -1);
const forceSim = args.includes("--simulate");
const demoEmpty = args.includes("--demo-empty");

// ─── moisture + tank source ─────────────────────────────────────────

function makeSimulator(): (ch: number) => Promise<number> {
  let t = 0;
  let tank = 1.0;
  return async (ch: number) => {
    if (ch === TANK_CHANNEL) {
      tank -= demoEmpty ? 0.08 : 0.01;
      if (tank < -0.05) tank = 1.0;
      t++;
      return Math.max(0, Math.min(1, tank));
    }
    if (ch === 0) t++;
    const m = 0.4 + 0.35 * Math.sin(t * 0.05 + ch * 1.7) - 0.05 * ch;
    return Math.max(0, Math.min(1, m));
  };
}

let readChannel: (ch: number) => Promise<number>;
let i2cClose: (() => void) | null = null;

if (forceSim) {
  console.log("[mode] --simulate flag set");
  readChannel = makeSimulator();
} else {
  try {
    const ads = i2c.ads1115("/dev/i2c-1");
    i2cClose = () => ads.close();
    readChannel = async (ch: number) => {
      const raw = await ads.read(ch as 0 | 1 | 2 | 3);
      return Math.max(0, Math.min(1, (26000 - raw) / (26000 - 10000)));
    };
    console.log(`[mode] ADS1115 @ 0x48 on /dev/i2c-1`);
  } catch (e) {
    console.log(`[mode] ADS1115 init failed (${(e as Error).message}) → simulator`);
    readChannel = makeSimulator();
  }
}

// ─── pump GPIO lines ────────────────────────────────────────────────

let chip: ReturnType<typeof gpio.open> | null = null;
const pumps = new Map<number, ReturnType<NonNullable<typeof chip>["line"]> | null>();

try {
  chip = gpio.openDefaultChip();
  for (const p of PLANTS) {
    pumps.set(p.pumpPin, chip.line(p.pumpPin, { mode: "out", initial: 0 }));
  }
  console.log(`[gpio] ${chip.path} (${chip.label}) — ${PLANTS.length} pump lines acquired`);
} catch (e) {
  console.log(`[gpio] open failed (${(e as Error).message}) → log-only mode`);
}

function notify(msg: string) {
  console.error(`[notify] ${msg}`);
}

// ─── tank level: signal + derived thresholds + edge-triggered notify

const tankRaw = signals.fromInterval(() => readChannel(TANK_CHANNEL), 1000);
const tankLevel = signals.derived(() => tankRaw.signal.get() ?? 1.0);
const tankEmpty = signals.derived(() => tankLevel.get() < TANK_EMPTY_AT);
const tankLow = signals.derived(() => tankLevel.get() < TANK_LOW_AT);

// `whenever` (initial-truthy + edge) for the dangerous-state alerts —
// catches a boot-already-bad state. `when` (strict edge) for the
// recovery so we don't fake "back above empty" on a healthy boot.
signals.whenever(tankEmpty, () => notify("⚠️  tank EMPTY — pausing all watering"));
signals.when(
  () => !tankEmpty.get(),
  () => notify("✓  tank back above empty — resuming watering"),
);
signals.whenever(
  () => tankLow.get() && !tankEmpty.get(),
  () => notify(`⚠ tank low — ${(tankLevel.get() * 100).toFixed(0)}% remaining`),
);

// ─── per-plant pump driver, rate-limited by signals.cooldown ────────

const water = signals.cooldown(
  async (p: Plant) => {
    console.log(`💧 ${p.name}: pump ON for ${p.pumpMs}ms`);
    pumps.get(p.pumpPin)?.write(1);
    await Bun.sleep(p.pumpMs);
    pumps.get(p.pumpPin)?.write(0);
    console.log(`✓  ${p.name}: pump OFF — cooldown ${(p.cooldownMs / 1000).toFixed(0)}s`);
  },
  { key: p => p.name, coolingMs: p => p.cooldownMs },
);

// ─── reactive tick ──────────────────────────────────────────────────

const tick = signals.fromInterval(async () => {
  const empty = tankEmpty.get();
  const cells: string[] = [];
  for (const p of PLANTS) {
    const m = await readChannel(p.channel);
    let action = "";
    if (m < p.dryAt && !empty) {
      const fired = await water(p);
      action = fired ? " → water" : " → wait";
    } else if (m < p.dryAt && empty) {
      action = " → SKIP (tank empty)";
    }
    const tag = m < p.dryAt ? "dry " : "ok  ";
    cells.push(`${p.name.padEnd(10)} ${(m * 100).toFixed(0).padStart(3)}%  ${tag}${action}`);
  }
  return `[tank ${(tankLevel.get() * 100).toFixed(0).padStart(3)}%] ${cells.join(" │ ")}`;
}, 1000);

signals.effect(() => {
  const row = tick.signal.get();
  if (row !== undefined) console.log(row);
});

console.log(`watering ${PLANTS.length} plants — Ctrl-C to stop\n`);

if (seconds > 0) {
  console.log(`(non-interactive: stopping in ${seconds}s)`);
  await Bun.sleep(seconds * 1000);
} else {
  await lifecycle.keepAlive();
}

tick.dispose();
tankRaw.dispose();
for (const line of pumps.values()) line?.write(0);
chip?.close();
i2cClose?.();
console.log("\ndone.");
