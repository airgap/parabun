// Multi-plant auto waterer — moisture signals per plant, threshold-driven
// pump pulses with a cooldown to prevent drowning. (TypeScript form.)
//
//   bun run build:release demos/iot-waterer.ts [--seconds N] [--simulate] [--i2c BUS]
//
// Reads a moisture value (0..1) per plant, logs the row at 1 Hz, and
// pulses a GPIO line for `pumpMs` whenever a plant goes below its dry
// threshold AND its cooldown has elapsed. Three-state FSM per plant:
// ok → watering → cooldown → ok.
//
// Hardware (real-mode):
//   I²C bus 1 (default) → ADS1115 @ 0x48, channels 0..N-1 = moisture sensors
//   GPIO chip pinctrl-rp1 → pumpPin per plant drives a relay/MOSFET
// `--simulate` (default when no /dev/i2c-* present) replaces the I²C
// reads with a deterministic oscillator so the demo runs anywhere.

import gpio from "parabun:gpio";
import i2c from "parabun:i2c";
import signals from "@para/signals";

interface Plant {
  name: string;
  channel: number; // ADC channel
  pumpPin: number; // BCM number
  dryAt: number; // moisture < this → start watering
  pumpMs: number; // pump duration per watering
  cooldownMs: number; // minimum gap between waterings (anti-drown)
}

const PLANTS: Plant[] = [
  { name: "basil", channel: 0, pumpPin: 17, dryAt: 0.35, pumpMs: 1500, cooldownMs: 60_000 },
  { name: "fern", channel: 1, pumpPin: 27, dryAt: 0.4, pumpMs: 2000, cooldownMs: 90_000 },
  { name: "succulent", channel: 2, pumpPin: 22, dryAt: 0.18, pumpMs: 800, cooldownMs: 120_000 },
];

const args = process.argv.slice(2);
const flagIdx = (k: string) => args.indexOf(k);
const num = (k: string, d: number) => {
  const i = flagIdx(k);
  return i >= 0 ? Number(args[i + 1]) : d;
};
const seconds = num("--seconds", -1);
const i2cBus = num("--i2c", 1);
const forceSim = args.includes("--simulate");

// ─── moisture source ────────────────────────────────────────────────
//
// Default: simulator (works on any host). With --i2c <N>, talks to an
// ADS1115 on that bus and converts the raw 16-bit sample to 0..1 with
// a typical capacitive-sensor calibration (dry≈26000, wet≈10000 raw).

const ADS1115_ADDR = 0x48;
const swapBytes = (v: number) => ((v & 0xff) << 8) | ((v >> 8) & 0xff);

function makeSimulator(): (ch: number) => Promise<number> {
  let t = 0;
  return async (ch: number) => {
    const phase = t * 0.05 + ch * 1.7;
    const m = 0.4 + 0.35 * Math.sin(phase) - 0.05 * ch;
    t++;
    return Math.max(0, Math.min(1, m));
  };
}

async function makeAds1115(busPath: string) {
  const bus = i2c.open(busPath);
  return {
    bus,
    read: async (ch: number): Promise<number> => {
      const mux = 0b100 | (ch & 0b011);
      // OS=1 | MUX | PGA=001 (±4.096V) | MODE=1 | DR=100 (128 SPS) | COMP_QUE=11
      const cfg = 0x8000 | (mux << 12) | (1 << 9) | (1 << 8) | (4 << 5) | 0x0003;
      await bus.smbus.writeWordData(ADS1115_ADDR, 0x01, swapBytes(cfg));
      await Bun.sleep(8);
      const raw = swapBytes(await bus.smbus.readWordData(ADS1115_ADDR, 0x00));
      const signed = (raw << 16) >> 16;
      return Math.max(0, Math.min(1, (26000 - signed) / (26000 - 10000)));
    },
  };
}

let readMoisture: (ch: number) => Promise<number>;
let i2cClose: (() => void) | null = null;

if (forceSim) {
  console.log("[mode] --simulate flag set");
  readMoisture = makeSimulator();
} else {
  const buses = i2c.buses();
  const path = `/dev/i2c-${i2cBus}`;
  if (!buses.some(b => b.path === path)) {
    console.log(`[mode] ${path} not found → simulator`);
    readMoisture = makeSimulator();
  } else {
    try {
      const ads = await makeAds1115(path);
      readMoisture = ads.read;
      i2cClose = () => ads.bus.close();
      console.log(`[mode] ADS1115 @ 0x48 on ${path}`);
    } catch (e) {
      console.log(`[mode] ADS1115 init failed (${(e as Error).message}) → simulator`);
      readMoisture = makeSimulator();
    }
  }
}

// ─── pump GPIO lines ────────────────────────────────────────────────

const chips = gpio.chips();
const rp1 = chips.find(c => c.label === "pinctrl-rp1");
const chipPath = process.env.GPIO_CHIP ?? rp1?.path ?? chips[0]?.path;
let chip: ReturnType<typeof gpio.open> | null = null;
const pumps = new Map<number, ReturnType<NonNullable<typeof chip>["line"]> | null>();

if (chipPath) {
  try {
    chip = gpio.open(chipPath);
    for (const p of PLANTS) {
      pumps.set(p.pumpPin, chip.line(p.pumpPin, { mode: "out", initial: 0 }));
    }
    console.log(`[gpio] ${chipPath} (${chip.label}) — ${PLANTS.length} pump lines acquired`);
  } catch (e) {
    console.log(`[gpio] open failed (${(e as Error).message}) → log-only mode`);
    chip = null;
  }
} else {
  console.log("[gpio] no chip → log-only mode");
}

// ─── per-plant FSM ──────────────────────────────────────────────────

type FsmState = "ok" | "watering" | "cooldown";
interface PlantState {
  fsm: FsmState;
  lastWateredAt: number;
  lastReading: number;
}
const state = new Map<string, PlantState>(PLANTS.map(p => [p.name, { fsm: "ok", lastWateredAt: 0, lastReading: NaN }]));

async function runPump(p: Plant) {
  const s = state.get(p.name)!;
  s.fsm = "watering";
  console.log(`💧 ${p.name}: pump ON for ${p.pumpMs}ms`);
  pumps.get(p.pumpPin)?.write(1);
  await Bun.sleep(p.pumpMs);
  pumps.get(p.pumpPin)?.write(0);
  s.lastWateredAt = Date.now();
  s.fsm = "cooldown";
  console.log(`✓  ${p.name}: pump OFF — cooldown ${(p.cooldownMs / 1000).toFixed(0)}s`);
}

// ─── reactive tick ──────────────────────────────────────────────────

const tick = signals.fromInterval(async () => {
  const now = Date.now();
  const cells: string[] = [];
  for (const p of PLANTS) {
    const m = await readMoisture(p.channel);
    const s = state.get(p.name)!;
    s.lastReading = m;

    if (s.fsm === "cooldown" && now - s.lastWateredAt >= p.cooldownMs) s.fsm = "ok";

    let action = "";
    if (s.fsm === "ok" && m < p.dryAt) {
      action = " → water";
      runPump(p); // fire-and-forget; FSM tracks state
    }

    const tag = s.fsm === "watering" ? "PUMP" : s.fsm === "cooldown" ? "rest" : m < p.dryAt ? "dry " : "ok  ";
    cells.push(`${p.name.padEnd(10)} ${(m * 100).toFixed(0).padStart(3)}%  ${tag}${action}`);
  }
  return cells.join(" │ ");
}, 1000);

signals.effect(() => {
  const row = tick.signal.get();
  if (row !== undefined) console.log(row);
});

console.log(`watering ${PLANTS.length} plants — Ctrl-C to stop\n`);

// ─── lifetime ───────────────────────────────────────────────────────

if (seconds > 0) {
  console.log(`(non-interactive: stopping in ${seconds}s)`);
  await Bun.sleep(seconds * 1000);
} else {
  await new Promise(() => {});
}

tick.dispose();
for (const line of pumps.values()) line?.write(0);
chip?.close();
i2cClose?.();
console.log("\ndone.");
