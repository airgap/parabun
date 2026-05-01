// parabun:gpio toggle-rate bench
//
// Measures sustained pin-toggle throughput for single-line writes and
// bulk-bank writes against /dev/gpiochip0 (or whatever's at index 0).
// Probes a free output pin — defaults to BCM 17 on the Pi 5 RP1
// (chip 4 line 17).
//
// Run with:
//   bun bd bench/parabun-gpio-toggle/run.ts
//
// CLI:
//   --chip /dev/gpiochipN   — default: pinctrl-rp1 if present, else gpiochip0
//   --line N                — output line offset (default 17)
//   --duration ms           — bench duration per phase (default 1000)

import gpio from "parabun:gpio";

const args = process.argv.slice(2);
function arg(name: string, fallback?: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}

// Find a sensible default chip. RP1 lives on pinctrl-rp1 on Pi 5;
// otherwise take chip 0.
const chips = gpio.chips();
if (chips.length === 0) {
  console.error("no /dev/gpiochip* devices");
  process.exit(1);
}
const rp1 = chips.find(c => c.label === "pinctrl-rp1");
const defaultChip = rp1?.path ?? chips[0].path;

const chipPath = arg("--chip", defaultChip)!;
const line = Number(arg("--line", "17"));
const durationMs = Number(arg("--duration", "1000"));

console.log(`chip: ${chipPath}`);
console.log(`line: ${line}`);
console.log(`per-phase budget: ${durationMs}ms\n`);

await using chip = gpio.open(chipPath);
console.log(`label=${chip.label}  ${chip.lines} lines\n`);

// ─── Single-line toggle ────────────────────────────────────────────────────

{
  await using out = chip.line(line, { mode: "out", initial: 0 });
  // Warm up.
  for (let i = 0; i < 1000; i++) out.write(i & 1);
  // Measure.
  let n = 0;
  const t0 = Bun.nanoseconds();
  const deadline = t0 + durationMs * 1_000_000;
  while (Bun.nanoseconds() < deadline) {
    out.write(0);
    out.write(1);
    n += 2;
  }
  const dtNs = Bun.nanoseconds() - t0;
  const dtSec = dtNs / 1e9;
  console.log(`── single-line write ──`);
  console.log(`  ${n.toLocaleString()} writes in ${dtSec.toFixed(2)}s`);
  console.log(`  ${(n / dtSec).toFixed(0).padStart(10)} writes/s`);
  console.log(`  ${((dtNs / n) | 0).toString().padStart(10)} ns/write\n`);
}

// ─── Single-line toggle() helper ───────────────────────────────────────────

{
  await using out = chip.line(line, { mode: "out", initial: 0 });
  for (let i = 0; i < 1000; i++) out.toggle();
  let n = 0;
  const t0 = Bun.nanoseconds();
  const deadline = t0 + durationMs * 1_000_000;
  while (Bun.nanoseconds() < deadline) {
    out.toggle();
    n++;
  }
  const dtNs = Bun.nanoseconds() - t0;
  const dtSec = dtNs / 1e9;
  console.log(`── single-line toggle() ──`);
  console.log(`  ${n.toLocaleString()} toggles in ${dtSec.toFixed(2)}s`);
  console.log(`  ${(n / dtSec).toFixed(0).padStart(10)} toggles/s`);
  console.log(`  ${((dtNs / n) | 0).toString().padStart(10)} ns/toggle\n`);
}

// ─── Bank write (4 lines, atomic ioctl) ───────────────────────────────────

if (line + 3 < chip.lines) {
  await using bank = chip.bank([line, line + 1, line + 2, line + 3], { mode: "out", initial: 0n });
  for (let i = 0; i < 1000; i++) bank.write(BigInt(i & 0xf));
  let n = 0;
  const t0 = Bun.nanoseconds();
  const deadline = t0 + durationMs * 1_000_000;
  let v = 0n;
  while (Bun.nanoseconds() < deadline) {
    bank.write(v);
    v = v === 0n ? 0xfn : 0n;
    n++;
  }
  const dtNs = Bun.nanoseconds() - t0;
  const dtSec = dtNs / 1e9;
  console.log(`── 4-line bank write ──`);
  console.log(`  ${n.toLocaleString()} writes in ${dtSec.toFixed(2)}s`);
  console.log(
    `  ${(n / dtSec).toFixed(0).padStart(10)} writes/s    (× 4 lines = ${((n * 4) / dtSec).toFixed(0)} pin-writes/s)`,
  );
  console.log(`  ${((dtNs / n) | 0).toString().padStart(10)} ns/write`);
}
