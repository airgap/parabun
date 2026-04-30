import { describe, expect, test } from "bun:test";
import audio from "para:audio";

// audio.devices is a callable signal (LYK-745). Calling it returns a
// Promise<DeviceList> for backwards compat; .get / .peek / .subscribe are
// the reactive surface backed by /dev/snd inotify on Linux.

describe("para:audio.devices callable signal (LYK-745)", () => {
  test("call form returns a Promise<DeviceList>", async () => {
    const result = audio.devices();
    expect(result).toBeInstanceOf(Promise);
    const list = await result;
    expect(typeof list).toBe("object");
    expect(Array.isArray(list.input)).toBe(true);
    expect(Array.isArray(list.output)).toBe(true);
  });

  test("exposes signal methods (.get / .peek / .subscribe)", () => {
    expect(typeof audio.devices).toBe("function");
    expect(typeof audio.devices.get).toBe("function");
    expect(typeof audio.devices.peek).toBe("function");
    expect(typeof audio.devices.subscribe).toBe("function");
  });

  test(".peek and .get return a DeviceList shape", () => {
    const peek = audio.devices.peek();
    expect(Array.isArray(peek.input)).toBe(true);
    expect(Array.isArray(peek.output)).toBe(true);
    const get = audio.devices.get();
    expect(Array.isArray(get.input)).toBe(true);
    expect(Array.isArray(get.output)).toBe(true);
  });

  test(".subscribe fires immediately with current value, returns unsubscribe", async () => {
    const { promise, resolve } = Promise.withResolvers<{
      input: unknown[];
      output: unknown[];
    }>();
    const unsub = audio.devices.subscribe(v => resolve(v as any));
    expect(typeof unsub).toBe("function");
    const v = await promise;
    expect(Array.isArray(v.input)).toBe(true);
    expect(Array.isArray(v.output)).toBe(true);
    unsub();
  });

  test("call form is consistent with .peek (same snapshot)", async () => {
    const promised = await audio.devices();
    const peeked = audio.devices.peek();
    expect(promised.input.length).toBe(peeked.input.length);
    expect(promised.output.length).toBe(peeked.output.length);
  });
});
