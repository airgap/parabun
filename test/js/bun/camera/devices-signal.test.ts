import { describe, expect, test } from "bun:test";
import camera from "parabun:camera";

// camera.devices is a callable signal (LYK-745). Calling it returns a
// Promise<DeviceInfo[]> for backwards compat; .get / .peek / .subscribe are
// the reactive surface backed by inotify on /dev for video* entries.

describe("parabun:camera.devices callable signal (LYK-745)", () => {
  test("call form returns a Promise<DeviceInfo[]>", async () => {
    const result = camera.devices();
    expect(result).toBeInstanceOf(Promise);
    const list = await result;
    expect(Array.isArray(list)).toBe(true);
  });

  test("exposes signal methods (.get / .peek / .subscribe)", () => {
    expect(typeof camera.devices).toBe("function");
    expect(typeof camera.devices.get).toBe("function");
    expect(typeof camera.devices.peek).toBe("function");
    expect(typeof camera.devices.subscribe).toBe("function");
  });

  test(".peek and .get return arrays", () => {
    const peek = camera.devices.peek();
    expect(Array.isArray(peek)).toBe(true);
    const get = camera.devices.get();
    expect(Array.isArray(get)).toBe(true);
  });

  test(".subscribe fires immediately with current value, returns unsubscribe", async () => {
    const { promise, resolve } = Promise.withResolvers<unknown[]>();
    const unsub = camera.devices.subscribe(v => resolve(v as any));
    expect(typeof unsub).toBe("function");
    const v = await promise;
    expect(Array.isArray(v)).toBe(true);
    unsub();
  });

  test("call form is consistent with .peek (same length)", async () => {
    const promised = await camera.devices();
    const peeked = camera.devices.peek();
    expect(promised.length).toBe(peeked.length);
  });
});
