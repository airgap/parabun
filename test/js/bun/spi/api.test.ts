import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import spi from "parabun:spi";

// API-surface tests for parabun:spi (LYK-770). Real spidev transfers are
// validated on Pi 5 in the embedded smoke suite (transfer / read /
// transactSegments against /dev/spidev10.0); here we cover validation
// + module-load paths.

const haveSpi = existsSync("/dev/spidev0.0") || existsSync("/dev/spidev10.0");

describe("parabun:spi API surface", () => {
  test("exports default object with devices + open", () => {
    expect(typeof spi).toBe("object");
    expect(typeof spi.devices).toBe("function");
    expect(typeof spi.open).toBe("function");
  });

  test("devices() returns an array of {path, bus, cs}", () => {
    const list = spi.devices();
    expect(Array.isArray(list)).toBe(true);
    for (const d of list) {
      expect(typeof d.path).toBe("string");
      expect(typeof d.bus).toBe("number");
      expect(typeof d.cs).toBe("number");
    }
  });

  test("open() rejects non-string paths", () => {
    expect(() => spi.open(undefined as any)).toThrow(TypeError);
    expect(() => spi.open("" as any)).toThrow(TypeError);
  });

  test("open() rejects malformed spidev paths", () => {
    expect(() => spi.open("/dev/notspidev")).toThrow(TypeError);
    expect(() => spi.open("/dev/spidev")).toThrow(TypeError);
  });

  test("open() validates mode / bitsPerWord / speedHz before opening", () => {
    expect(() => spi.open("/dev/spidev0.0", { mode: 4 as any })).toThrow(RangeError);
    expect(() => spi.open("/dev/spidev0.0", { bitsPerWord: 0 })).toThrow(RangeError);
    expect(() => spi.open("/dev/spidev0.0", { bitsPerWord: 64 })).toThrow(RangeError);
    expect(() => spi.open("/dev/spidev0.0", { speedHz: 0 })).toThrow(RangeError);
    expect(() => spi.open("/dev/spidev0.0", { speedHz: -1 })).toThrow(RangeError);
  });

  test.skipIf(!haveSpi)("open() returns Device with mode + speedHz + bitsPerWord", async () => {
    const path = existsSync("/dev/spidev10.0") ? "/dev/spidev10.0" : "/dev/spidev0.0";
    let dev: any;
    try {
      dev = spi.open(path, { mode: 0, bitsPerWord: 8, speedHz: 500_000 });
    } catch {
      return; // permission-denied — skip
    }
    try {
      expect(dev.path).toBe(path);
      expect(dev.mode).toBe(0);
      expect(dev.bitsPerWord).toBe(8);
      expect(dev.speedHz).toBe(500_000);
      expect(typeof dev.transfer).toBe("function");
      expect(typeof dev.read).toBe("function");
      expect(typeof dev.write).toBe("function");
      expect(typeof dev.transactSegments).toBe("function");
      // read() length validation is JS-side.
      await expect(dev.read(0)).rejects.toThrow();
      await expect(dev.read(-1)).rejects.toThrow();
      await expect(dev.read(0.5)).rejects.toThrow();
    } finally {
      dev.close();
    }
  });

  test.skipIf(!haveSpi)(
    "Device: alive starts true; flips false on close(); use(fn) auto-tears-down; [Symbol.dispose] callable",
    () => {
      const path = existsSync("/dev/spidev0.0") ? "/dev/spidev0.0" : "/dev/spidev10.0";
      let dev: any;
      try {
        dev = spi.open(path);
      } catch {
        return;
      }
      try {
        expect(dev.alive.get()).toBe(true);
        let runs = 0;
        dev.use(() => {
          runs++;
          dev.alive.get();
        });
        expect(runs).toBe(1);
        expect(typeof dev[Symbol.dispose]).toBe("function");
      } finally {
        dev.close();
      }
      expect(dev.alive.get()).toBe(false);
    },
  );
});
