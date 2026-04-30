import { describe, expect, test } from "bun:test";

// para:signals.fromAsync + pump — drive a signal from an async iterable.

async function* range(n: number, spacingMs = 5) {
  for (let i = 0; i < n; i++) {
    yield i;
    if (spacingMs > 0) await new Promise(r => setTimeout(r, spacingMs));
  }
}

describe("para:signals.fromAsync", () => {
  test("creates a signal driven by the async iterable", async () => {
    const sigs = (await import("para:signals")).default;
    const { signal: sig, dispose } = sigs.fromAsync(range(5));
    // Pre-emit: signal still at default (undefined).
    expect(sig.get()).toBeUndefined();

    // Wait long enough for all 5 values to land (5 × 5ms + slack).
    await new Promise(r => setTimeout(r, 80));
    expect(sig.get()).toBe(4);
    dispose();
  });

  test("init parameter sets the pre-emit value", async () => {
    const sigs = (await import("para:signals")).default;
    const { signal: sig, dispose } = sigs.fromAsync(range(3), x => x, -1);
    expect(sig.get()).toBe(-1);

    await new Promise(r => setTimeout(r, 80));
    expect(sig.get()).toBe(2);
    dispose();
  });

  test("mapFn transforms each yielded value", async () => {
    const sigs = (await import("para:signals")).default;
    const { signal: sig, dispose } = sigs.fromAsync(range(4), x => x * 10, 0);
    await new Promise(r => setTimeout(r, 80));
    expect(sig.get()).toBe(30);
    dispose();
  });

  test("subscribe sees initial + every emit", async () => {
    const sigs = (await import("para:signals")).default;
    const { signal: sig, dispose } = sigs.fromAsync(range(3, 5), x => x, -1);
    const trace: number[] = [];
    const unsub = sig.subscribe((v: number | undefined) => trace.push(v ?? -99));

    await new Promise(r => setTimeout(r, 80));
    unsub();
    dispose();

    // Initial -1 from subscribe + 0, 1, 2 from the iterator.
    expect(trace).toEqual([-1, 0, 1, 2]);
  });

  test("dispose stops the loop; signal stays at last value", async () => {
    const sigs = (await import("para:signals")).default;
    // Long stream so dispose has work to interrupt.
    const { signal: sig, dispose } = sigs.fromAsync(range(50, 20), x => x, -1);
    await new Promise(r => setTimeout(r, 60));
    const before = sig.get();
    dispose();

    // After dispose, signal value freezes — no further updates.
    await new Promise(r => setTimeout(r, 200));
    const after = sig.get();
    // before may be 0/1/2; after must be the same as the last in-flight
    // value (gen.return fires the finally; values from already-awaited
    // calls may still set, so we accept "no further increase past the
    // dispose window").
    expect(typeof before).toBe("number");
    expect(typeof after).toBe("number");
    // After dispose, signal won't go past where it was on the next tick.
    expect(after as number).toBeLessThanOrEqual((before as number) + 5);
  });

  test("rejects non-iterables", async () => {
    const sigs = (await import("para:signals")).default;
    // @ts-expect-error — runtime guard
    expect(() => sigs.fromAsync({ not: "iterable" })).toThrow(/async iterable/);
    // @ts-expect-error
    expect(() => sigs.fromAsync(null)).toThrow(/async iterable/);
  });

  test("rejects non-function mapFn", async () => {
    const sigs = (await import("para:signals")).default;
    // @ts-expect-error
    expect(() => sigs.fromAsync(range(1), 42)).toThrow();
  });
});

describe("para:signals.pump", () => {
  test("drives an existing signal", async () => {
    const sigs = (await import("para:signals")).default;
    const sig = sigs.signal(-1);
    const stop = sigs.pump(range(4), sig);
    await new Promise(r => setTimeout(r, 80));
    expect(sig.get()).toBe(3);
    stop();
  });

  test("mapFn transforms before set", async () => {
    const sigs = (await import("para:signals")).default;
    const sig = sigs.signal(0);
    const stop = sigs.pump(range(3), sig, x => x * 100);
    await new Promise(r => setTimeout(r, 80));
    expect(sig.get()).toBe(200);
    stop();
  });

  test("rejects non-signal target", async () => {
    const sigs = (await import("para:signals")).default;
    // @ts-expect-error
    expect(() => sigs.pump(range(1), { not: "a signal" })).toThrow(/writable signal/);
  });

  test("disposer breaks the loop", async () => {
    const sigs = (await import("para:signals")).default;
    const sig = sigs.signal(0);
    const stop = sigs.pump(range(50, 20), sig);
    await new Promise(r => setTimeout(r, 60));
    const before = sig.get();
    stop();
    await new Promise(r => setTimeout(r, 200));
    const after = sig.get();
    expect(after).toBeLessThanOrEqual(before + 5);
  });
});

describe("integration: derived over fromAsync", () => {
  test("derived re-runs when the pump sets the source signal", async () => {
    const sigs = (await import("para:signals")).default;
    const { signal: src, dispose } = sigs.fromAsync(range(5), x => x, 0);
    const doubled = sigs.derived(() => (src.get() ?? 0) * 2);

    const trace: number[] = [];
    const unsub = doubled.subscribe((v: number) => trace.push(v));

    await new Promise(r => setTimeout(r, 80));
    unsub();
    dispose();

    // Initial 0 + 0,2,4,6,8 from the upstream emits.
    expect(trace).toContain(8);
    // Strictly monotonic since map is x*2 over a counting source.
    let last = -Infinity;
    for (const v of trace) {
      expect(v).toBeGreaterThanOrEqual(last);
      last = v;
    }
  });
});
