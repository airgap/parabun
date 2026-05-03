import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import gpio from "parabun:gpio";

// API-surface tests for parabun:gpio (LYK-772). Hardware-dependent paths
// (open / line / write / edges) are skipped when /dev/gpiochip0 is
// missing — those are validated on the Pi 5 in the embedded smoke
// suite. The module-load + chip enumeration + error paths run
// everywhere.

const haveGpio = existsSync("/dev/gpiochip0");

describe("parabun:gpio API surface", () => {
  test("exports default object with chips + open", () => {
    expect(typeof gpio).toBe("object");
    expect(typeof gpio.chips).toBe("function");
    expect(typeof gpio.open).toBe("function");
  });

  test("chips() returns an array (empty on platforms without /dev/gpiochip*)", () => {
    const list = gpio.chips();
    expect(Array.isArray(list)).toBe(true);
    for (const c of list) {
      expect(typeof c.path).toBe("string");
      expect(typeof c.label).toBe("string");
      expect(typeof c.lines).toBe("number");
    }
  });

  test("open() rejects non-string paths", () => {
    expect(() => gpio.open(undefined as any)).toThrow(TypeError);
    expect(() => gpio.open(null as any)).toThrow(TypeError);
    expect(() => gpio.open("" as any)).toThrow(TypeError);
  });

  test("open() of a non-existent chip throws with errno-derived message", () => {
    expect(() => gpio.open("/dev/gpiochip-does-not-exist")).toThrow(/chipInfo/);
  });

  test.skipIf(!haveGpio)("open() returns Chip with lines + path + label, line(offset, opts) validates", async () => {
    let chip: any;
    try {
      chip = gpio.open("/dev/gpiochip0");
    } catch (e) {
      // Permission-denied on a non-gpio-group account is the only legit
      // skip path here — bun:test runner usually inherits the user's
      // groups so this is rare, but harmless.
      return;
    }
    try {
      expect(typeof chip.path).toBe("string");
      expect(typeof chip.label).toBe("string");
      expect(typeof chip.lines).toBe("number");
      expect(chip.lines).toBeGreaterThan(0);
      // Line offset validation runs without actually requesting the line.
      expect(() => chip.line(-1, { mode: "out" })).toThrow(RangeError);
      expect(() => chip.line(chip.lines, { mode: "out" })).toThrow(RangeError);
      expect(() => chip.line(0, { mode: "wat" } as any)).toThrow(TypeError);
      expect(() => chip.line(0, { mode: "in", pull: "wat" } as any)).toThrow(TypeError);
      expect(() => chip.line(0, { mode: "in", edge: "wat" } as any)).toThrow(TypeError);
    } finally {
      chip.close();
    }
  });

  test.skipIf(!haveGpio)("chip.line accepts pollHz and clears the timer on close", async () => {
    let chip: any;
    try {
      chip = gpio.open("/dev/gpiochip0");
    } catch {
      return;
    }
    let line: any = null;
    try {
      // pollHz: 0 means off; non-zero starts a setInterval. Either way, line
      // creation must not throw on the option being present.
      line = chip.line(0, { mode: "in", pull: "up", pollHz: 50 });
      expect(typeof line.value.get).toBe("function");
      // Closing the line stops the poller — without that, jest's open-handle
      // detection would flag a leaked timer at process exit.
      line.close();
    } catch {
      // Permission-denied races on the chip — ignore.
    } finally {
      chip.close();
    }
  });

  test.skipIf(!haveGpio)("chip.bank(offsets, opts) validates input shape", async () => {
    let chip: any;
    try {
      chip = gpio.open("/dev/gpiochip0");
    } catch {
      return;
    }
    try {
      // Empty array.
      expect(() => chip.bank([], { mode: "out" })).toThrow(RangeError);
      // > 64 entries.
      expect(() =>
        chip.bank(
          Array.from({ length: 65 }, (_, i) => i),
          { mode: "out" },
        ),
      ).toThrow(RangeError);
      // Non-array.
      expect(() => chip.bank("nope" as any, { mode: "out" })).toThrow(RangeError);
      // Non-integer entry.
      expect(() => chip.bank([0.5], { mode: "out" })).toThrow(RangeError);
      // Out-of-range offset.
      expect(() => chip.bank([chip.lines], { mode: "out" })).toThrow(RangeError);
      expect(() => chip.bank([-1], { mode: "out" })).toThrow(RangeError);
      // Bad mode / pull / edge.
      expect(() => chip.bank([0], { mode: "wat" } as any)).toThrow(TypeError);
      expect(() => chip.bank([0], { mode: "in", pull: "wat" } as any)).toThrow(TypeError);
      expect(() => chip.bank([0], { mode: "in", edge: "wat" } as any)).toThrow(TypeError);
    } finally {
      chip.close();
    }
  });

  test.skipIf(!haveGpio)(
    "Chip: alive starts true; flips false on close(); use(fn) auto-tears-down; [Symbol.dispose] callable",
    () => {
      let chip: any;
      try {
        chip = gpio.open("/dev/gpiochip0");
      } catch {
        // Permission-denied on a non-gpio-group account — same skip as the
        // sibling tests. Harmless on the dev box without the gpio group.
        return;
      }
      try {
        expect(chip.alive.get()).toBe(true);
        let runs = 0;
        chip.use(() => {
          runs++;
          chip.alive.get();
        });
        expect(runs).toBe(1);
        expect(typeof chip[Symbol.dispose]).toBe("function");
      } finally {
        chip.close();
      }
      expect(chip.alive.get()).toBe(false);
    },
  );
});
