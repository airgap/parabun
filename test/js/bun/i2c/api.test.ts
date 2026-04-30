import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import i2c from "para:i2c";

// API-surface tests for para:i2c (LYK-771). Real-bus interactions are
// validated on Pi 5 in the embedded smoke suite (scan() vs i2cdetect,
// transact / SMBus); here we exercise the JS wrapper logic + capability
// decoding + error paths.

const haveBus = existsSync("/dev/i2c-1") || existsSync("/dev/i2c-11");

describe("para:i2c API surface", () => {
  test("exports default object with buses + open", () => {
    expect(typeof i2c).toBe("object");
    expect(typeof i2c.buses).toBe("function");
    expect(typeof i2c.open).toBe("function");
  });

  test("buses() returns an array of {path, name, capabilities}", () => {
    const list = i2c.buses();
    expect(Array.isArray(list)).toBe(true);
    for (const b of list) {
      expect(typeof b.path).toBe("string");
      expect(typeof b.name).toBe("string");
      expect(Array.isArray(b.capabilities)).toBe(true);
      for (const cap of b.capabilities) expect(typeof cap).toBe("string");
    }
  });

  test("open() rejects non-string paths", () => {
    expect(() => i2c.open(undefined as any)).toThrow(TypeError);
    expect(() => i2c.open(null as any)).toThrow(TypeError);
    expect(() => i2c.open("" as any)).toThrow(TypeError);
  });

  test("open() of a non-existent bus throws", () => {
    expect(() => i2c.open("/dev/i2c-does-not-exist")).toThrow(/busInfo/);
  });

  test.skipIf(!haveBus)("device(addr) validates the 7-bit range", async () => {
    const path = existsSync("/dev/i2c-11") ? "/dev/i2c-11" : "/dev/i2c-1";
    let bus: any;
    try {
      bus = i2c.open(path);
    } catch {
      return; // permission-denied — skip
    }
    try {
      expect(() => bus.device(-1)).toThrow(RangeError);
      expect(() => bus.device(0x80)).toThrow(RangeError);
      expect(() => bus.device(0.5)).toThrow(RangeError);
      // 0x76 is a common BME280 address; we don't expect it to ack here,
      // but creating the device handle must succeed.
      const dev = bus.device(0x76);
      expect(dev.addr).toBe(0x76);
      expect(typeof dev.write).toBe("function");
      expect(typeof dev.read).toBe("function");
      expect(typeof dev.transact).toBe("function");
      expect(typeof dev.smbus).toBe("object");
      expect(typeof dev.smbus.readByte).toBe("function");
      expect(typeof dev.smbus.readWord).toBe("function");
      expect(typeof dev.smbus.writeByte).toBe("function");
      expect(typeof dev.smbus.writeWord).toBe("function");
      expect(typeof dev.smbus.readBlock).toBe("function");
      expect(typeof dev.smbus.writeBlock).toBe("function");
      expect(typeof dev.smbus.quick).toBe("function");
    } finally {
      bus.close();
    }
  });
});
