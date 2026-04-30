import { describe, expect, test } from "bun:test";
import sigs from "para:signals";

// para:signals.when(src, fn) — fires fn once per false→true transition of
// src. Initial state is treated as already-observed. The falling edge is
// just the rising edge of the negated predicate: when(() => !s.get(), fn).

describe("para:signals.when (rising-edge form)", () => {
  test("fires on false→true transition", async () => {
    const s = sigs.signal(false);
    let n = 0;
    const stop = sigs.when(s, () => n++);
    s.set(true);
    await Promise.resolve();
    expect(n).toBe(1);
    stop();
  });

  test("does NOT fire on the initial run when signal starts truthy", async () => {
    const s = sigs.signal(true);
    let n = 0;
    const stop = sigs.when(s, () => n++);
    await Promise.resolve();
    expect(n).toBe(0);
    s.set(false);
    s.set(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(n).toBe(1);
    stop();
  });

  test("does not fire on falling edges", async () => {
    const s = sigs.signal(true);
    let n = 0;
    const stop = sigs.when(s, () => n++);
    s.set(false);
    await Promise.resolve();
    expect(n).toBe(0);
    stop();
  });

  test("re-fires on every rising edge in a sequence", async () => {
    const s = sigs.signal(false);
    let n = 0;
    const stop = sigs.when(s, () => n++);
    for (const v of [true, false, true, false, true]) {
      s.set(v);
      await Promise.resolve();
    }
    expect(n).toBe(3);
    stop();
  });

  test("coerces non-boolean source values", async () => {
    const s = sigs.signal<number>(0);
    let n = 0;
    const stop = sigs.when(s, () => n++);
    s.set(1); // truthy
    await Promise.resolve();
    s.set(2); // still truthy → no edge
    await Promise.resolve();
    s.set(0); // falsy
    await Promise.resolve();
    s.set(5); // truthy again → edge
    await Promise.resolve();
    expect(n).toBe(2);
    stop();
  });

  test("disposer stops further fires", async () => {
    const s = sigs.signal(false);
    let n = 0;
    const stop = sigs.when(s, () => n++);
    s.set(true);
    await Promise.resolve();
    stop();
    s.set(false);
    s.set(true);
    await Promise.resolve();
    expect(n).toBe(1);
  });

  test("rejects non-signal, non-function source", () => {
    expect(() => sigs.when({} as any, () => {})).toThrow(/signal or a predicate function/);
  });

  test("predicate form: tracks signal reads inside the function", async () => {
    const a = sigs.signal(0);
    const b = sigs.signal(0);
    let n = 0;
    const stop = sigs.when(
      () => a.get() > 0 && b.get() > 0,
      () => n++,
    );
    a.set(1);
    await Promise.resolve();
    expect(n).toBe(0); // both>0 still false because b=0
    b.set(1);
    await Promise.resolve();
    expect(n).toBe(1);
    a.set(0);
    await Promise.resolve();
    a.set(2);
    await Promise.resolve();
    expect(n).toBe(2);
    stop();
  });

  test("predicate form: initial truthy does NOT fire", async () => {
    const a = sigs.signal(1);
    let n = 0;
    const stop = sigs.when(
      () => a.get() > 0,
      () => n++,
    );
    await Promise.resolve();
    expect(n).toBe(0);
    a.set(0);
    a.set(1);
    await Promise.resolve();
    await Promise.resolve();
    expect(n).toBe(1);
    stop();
  });

  test("predicate form: initial peek does not subscribe", async () => {
    const a = sigs.signal(1);
    let predicateCalls = 0;
    const stop = sigs.when(
      () => {
        predicateCalls++;
        return a.get() > 0;
      },
      () => {},
    );
    // One call from peek (untracked) + one from the first effect run.
    expect(predicateCalls).toBe(2);
    stop();
  });

  test("rejects non-function fn", () => {
    const s = sigs.signal(false);
    expect(() => sigs.when(s, 42 as any)).toThrow();
  });

  test("works on a derived signal", async () => {
    const a = sigs.signal(0);
    const b = sigs.signal(0);
    const both = sigs.derived(() => a.get() > 0 && b.get() > 0);
    let n = 0;
    const stop = sigs.when(both, () => n++);
    a.set(1);
    await Promise.resolve();
    expect(n).toBe(0); // both still false (b=0)
    b.set(1);
    await Promise.resolve();
    expect(n).toBe(1); // both flips false→true
    a.set(0);
    await Promise.resolve();
    a.set(2);
    await Promise.resolve();
    expect(n).toBe(2); // false again, then back to true
    stop();
  });
});

describe("para:signals.when (falling-edge via negated predicate)", () => {
  // The falling edge is just the rising edge of the negated predicate. The
  // block syntax `when not X { … }` does this rewrite at parse time; direct
  // callers spell it `when(() => !s.get(), fn)`.

  test("fires on true→false transition", async () => {
    const s = sigs.signal(true);
    let n = 0;
    const stop = sigs.when(
      () => !s.get(),
      () => n++,
    );
    s.set(false);
    await Promise.resolve();
    expect(n).toBe(1);
    stop();
  });

  test("does NOT fire on the initial run when signal starts falsy", async () => {
    const s = sigs.signal(false);
    let n = 0;
    const stop = sigs.when(
      () => !s.get(),
      () => n++,
    );
    await Promise.resolve();
    expect(n).toBe(0);
    s.set(true);
    s.set(false);
    await Promise.resolve();
    await Promise.resolve();
    expect(n).toBe(1);
    stop();
  });

  test("does not fire on rising edges", async () => {
    const s = sigs.signal(false);
    let n = 0;
    const stop = sigs.when(
      () => !s.get(),
      () => n++,
    );
    s.set(true);
    await Promise.resolve();
    expect(n).toBe(0);
    stop();
  });
});
