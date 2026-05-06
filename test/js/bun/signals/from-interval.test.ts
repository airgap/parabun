import { describe, expect, test } from "bun:test";
import sigs from "@para/signals";

// @para/signals.fromInterval — drive a signal from a periodic fn call.

describe("@para/signals.fromInterval", () => {
  test("first value lands without waiting periodMs", async () => {
    const { signal: sig, dispose } = sigs.fromInterval(() => 42, 1000);
    // Initial value is undefined…
    expect(sig.get()).toBeUndefined();
    // …but the immediate first call has already been scheduled. A
    // microtask flush is enough to see the result for sync `fn`.
    await Promise.resolve();
    await Promise.resolve();
    expect(sig.get()).toBe(42);
    dispose();
  });

  test("re-runs every periodMs and updates the signal", async () => {
    let i = 0;
    const { signal: sig, dispose } = sigs.fromInterval(() => ++i, 5);
    await new Promise(r => setTimeout(r, 30));
    const observed = sig.get()!;
    expect(observed).toBeGreaterThan(2);
    dispose();
    const after = sig.get();
    await new Promise(r => setTimeout(r, 20));
    expect(sig.get()).toBe(after); // dispose() stops further updates
  });

  test("async fn — awaits and uses resolved value", async () => {
    let n = 0;
    const { signal: sig, dispose } = sigs.fromInterval(async () => {
      await Promise.resolve();
      return ++n;
    }, 5);
    await new Promise(r => setTimeout(r, 30));
    expect(sig.get()!).toBeGreaterThan(2);
    dispose();
  });

  test("thrown errors are swallowed; signal keeps last value", async () => {
    let i = 0;
    const { signal: sig, dispose } = sigs.fromInterval(() => {
      i++;
      if (i === 2) throw new Error("boom");
      return i;
    }, 5);
    await new Promise(r => setTimeout(r, 30));
    // We saw i=1 first, then i=2 threw, then i=3,4,…
    expect(sig.get()!).toBeGreaterThanOrEqual(3);
    dispose();
  });

  test("input validation", () => {
    expect(() => sigs.fromInterval(null as any, 100)).toThrow();
    expect(() => sigs.fromInterval(() => 1, 0)).toThrow(/periodMs/);
    expect(() => sigs.fromInterval(() => 1, -10)).toThrow(/periodMs/);
    expect(() => sigs.fromInterval(() => 1, NaN)).toThrow(/periodMs/);
  });
});
