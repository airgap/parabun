import { describe, expect, test } from "bun:test";

// para:signals.resource — explicit-lifecycle reactive primitive.
// Setup runs sync, registers cleanups via ctx.onDispose, and exports
// signals that the handle re-exposes alongside lifecycle members
// (alive, dispose, [Symbol.dispose], [Symbol.asyncDispose], use).

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

describe("para:signals.resource", () => {
  test("setup exports become handle properties; handle adds lifecycle", async () => {
    const sigs = (await import("para:signals")).default;
    const r = sigs.resource(({ signal: sig }) => {
      const a = sig(1);
      const b = sig("x");
      return { a, b };
    });
    expect(r.a.get()).toBe(1);
    expect(r.b.get()).toBe("x");
    expect(r.alive.get()).toBe(true);
    expect(typeof r.dispose).toBe("function");
    expect(typeof r.use).toBe("function");
    expect(typeof r[Symbol.dispose]).toBe("function");
    expect(typeof r[Symbol.asyncDispose]).toBe("function");
  });

  test("dispose runs cleanups in reverse-registration order, flips alive", async () => {
    const sigs = (await import("para:signals")).default;
    const order: string[] = [];
    const r = sigs.resource(({ onDispose }) => {
      onDispose(() => order.push("first-registered"));
      onDispose(() => order.push("second-registered"));
      return {};
    });
    r.dispose();
    expect(order).toEqual(["second-registered", "first-registered"]);
    expect(r.alive.get()).toBe(false);
  });

  test("dispose is idempotent", async () => {
    const sigs = (await import("para:signals")).default;
    let calls = 0;
    const r = sigs.resource(({ onDispose }) => {
      onDispose(() => calls++);
      return {};
    });
    r.dispose();
    r.dispose();
    r.dispose();
    expect(calls).toBe(1);
  });

  test("[Symbol.dispose] calls dispose()", async () => {
    const sigs = (await import("para:signals")).default;
    let cleaned = false;
    const r = sigs.resource(({ onDispose }) => {
      onDispose(() => (cleaned = true));
      return {};
    });
    r[Symbol.dispose]();
    expect(cleaned).toBe(true);
    expect(r.alive.get()).toBe(false);
  });

  test("setup throw rolls back partial cleanups", async () => {
    const sigs = (await import("para:signals")).default;
    let cleaned = false;
    expect(() => {
      sigs.resource(({ onDispose }) => {
        onDispose(() => (cleaned = true));
        throw new Error("setup failed");
      });
    }).toThrow(/setup failed/);
    expect(cleaned).toBe(true);
  });

  test(".use(fn) effect auto-disposes when resource closes", async () => {
    const sigs = (await import("para:signals")).default;
    const r = sigs.resource(({ signal: sig }) => ({ v: sig(1) }));
    let runs = 0;
    r.use(() => {
      runs++;
      r.v.get();
    });
    expect(runs).toBe(1);
    r.v.set(2);
    expect(runs).toBe(2);
    r.dispose();
    r.v.set(3); // bound effect was disposed; no more runs
    expect(runs).toBe(2);
  });

  test("alive flips to false on dispose with one final notification", async () => {
    const sigs = (await import("para:signals")).default;
    const r = sigs.resource(({ signal: sig }) => ({ v: sig(0) }));
    const seen: boolean[] = [];
    sigs.effect(() => seen.push(r.alive.get()));
    expect(seen).toEqual([true]);
    r.dispose();
    expect(seen).toEqual([true, false]);
  });
});

describe("para:signals.fromAsyncIter", () => {
  test("pumps values from an async generator into a resource-shaped signal", async () => {
    const sigs = (await import("para:signals")).default;
    async function* src() {
      yield 1;
      await sleep(5);
      yield 2;
      yield 3;
    }
    const r = sigs.fromAsyncIter(src(), 0);
    await sleep(40);
    expect(r.value.get()).toBe(3);
    expect(r.alive.get()).toBe(true);
    r.dispose();
    expect(r.alive.get()).toBe(false);
  });

  test("dispose calls iterator.return() to release source state", async () => {
    const sigs = (await import("para:signals")).default;
    let returnCalled = false;
    const src = {
      [Symbol.asyncIterator]() {
        return {
          next() {
            return new Promise(resolve => setTimeout(() => resolve({ value: Math.random(), done: false }), 5));
          },
          return() {
            returnCalled = true;
            return Promise.resolve({ done: true });
          },
        };
      },
    };
    const r = sigs.fromAsyncIter(src as any);
    await sleep(20);
    r.dispose();
    await sleep(15);
    expect(returnCalled).toBe(true);
  });
});

describe("para:signals.fromStream", () => {
  test("pumps a ReadableStream into a resource-shaped signal", async () => {
    const sigs = (await import("para:signals")).default;
    const stream = new ReadableStream<string>({
      start(controller) {
        controller.enqueue("a");
        controller.enqueue("b");
        controller.enqueue("c");
        controller.close();
      },
    });
    const r = sigs.fromStream(stream, "");
    await sleep(20);
    expect(r.value.get()).toBe("c");
    r.dispose();
  });
});

describe("para:signals.fromEventTarget", () => {
  test("listens for events; updates signal; removes listener on dispose", async () => {
    const sigs = (await import("para:signals")).default;
    const target = new EventTarget();
    const r = sigs.fromEventTarget<number>(target, "ping", { initial: 0, map: (e: any) => e.detail });
    target.dispatchEvent(new CustomEvent("ping", { detail: 7 }));
    expect(r.value.get()).toBe(7);
    r.dispose();
    target.dispatchEvent(new CustomEvent("ping", { detail: 99 }));
    expect(r.value.get()).toBe(7);
  });
});

describe("para:signals.throttled / debounced", () => {
  test("throttled emits leading immediately then trailing after window", async () => {
    const sigs = (await import("para:signals")).default;
    const s = sigs.signal(0);
    const t = sigs.throttled(s, 50);
    const seen: number[] = [];
    sigs.effect(() => seen.push(t.value.get()));
    expect(seen).toEqual([0]);
    s.set(1);
    s.set(2);
    s.set(3);
    await sleep(80);
    expect(seen).toContain(1);
    expect(seen[seen.length - 1]).toBe(3);
    t.dispose();
  });

  test("debounced only emits after silence", async () => {
    const sigs = (await import("para:signals")).default;
    const s = sigs.signal(0);
    const d = sigs.debounced(s, 30);
    const seen: number[] = [];
    sigs.effect(() => seen.push(d.value.get()));
    expect(seen).toEqual([0]);
    s.set(1);
    await sleep(10);
    s.set(2);
    await sleep(10);
    s.set(3);
    await sleep(60);
    expect(seen[seen.length - 1]).toBe(3);
    expect(seen).not.toContain(1);
    expect(seen).not.toContain(2);
    d.dispose();
  });
});
