import { describe, expect, test } from "bun:test";
import { tempDir } from "harness";
import { join } from "node:path";

// parallel.pool reactive diagnostic signals (LYK-741/764). Real Worker
// pool — needs a worker module file. Uses tempDir to stage one inline.

const WORKER_SRC = [
  "export function echo(x) { return x; }",
  "export function slowEcho(x) {",
  // Synchronous spin so the run actually shows up in inflight before
  // resolving. Main thread sees the duration in ms.
  "  const end = Date.now() + 30;",
  "  while (Date.now() < end) { /* spin */ }",
  "  return x;",
  "}",
].join("\n");

describe("parallel.pool diagnostic signals (LYK-741/764)", () => {
  test("signals are Signal-shaped + initial state", async () => {
    using dir = tempDir("pool-sig", { "worker.js": WORKER_SRC });
    const parallel = (await import("bun:parallel")).default;
    const p = parallel.pool({ module: join(String(dir), "worker.js"), size: 2 });
    try {
      expect(typeof p.signals.workersCount.get).toBe("function");
      expect(typeof p.signals.queued.get).toBe("function");
      expect(typeof p.signals.inflight.get).toBe("function");
      expect(typeof p.signals.workersCount.subscribe).toBe("function");

      // Workers start with initOk=null, so workersCount is 0 immediately
      // after pool() returns. After the first `await p.run`, init has
      // succeeded for at least one worker.
      expect(p.signals.workersCount.get()).toBe(0);
      expect(p.signals.queued.get()).toBe(0);
      expect(p.signals.inflight.get()).toBe(0);

      const r = await p.run("echo", "hello");
      expect(r).toBe("hello");
      // After completion: workers ready, queue empty, no inflight.
      expect(p.signals.workersCount.get()).toBeGreaterThan(0);
      expect(p.signals.queued.get()).toBe(0);
      expect(p.signals.inflight.get()).toBe(0);
    } finally {
      p.dispose();
    }
  }, 30000);

  test("inflight tracks concurrent runs; queued tracks overflow", async () => {
    using dir = tempDir("pool-sig-q", { "worker.js": WORKER_SRC });
    const parallel = (await import("bun:parallel")).default;
    const p = parallel.pool({ module: join(String(dir), "worker.js"), size: 2 });
    try {
      // Both workers need to reach initOk=true before we can rely on
      // the dispatch-time signal counts. The dispatcher always picks
      // the first idle worker, so a couple of `await p.run` calls
      // typically hit worker 0 only — worker 1's init can complete
      // later. Subscribe to workersCount and wait for it to reach 2.
      const ready = Promise.withResolvers<void>();
      const unsubReady = p.signals.workersCount.subscribe((n: number) => {
        if (n >= 2) ready.resolve();
      });
      // Trigger a couple of dispatches so workers actually warm up.
      await p.run("echo", "warm0");
      // 1 second is generous — worker init is usually <50 ms.
      const timeout = new Promise<void>((_, rej) => setTimeout(() => rej(new Error("workers never reached 2")), 1000));
      await Promise.race([ready.promise, timeout]);
      unsubReady();
      expect(p.signals.workersCount.get()).toBe(2);

      // Fire 4 slow runs concurrently against a pool of size=2.
      // 2 should be inflight, 2 should be queued.
      const promises = [
        p.run<string>("slowEcho", "a"),
        p.run<string>("slowEcho", "b"),
        p.run<string>("slowEcho", "c"),
        p.run<string>("slowEcho", "d"),
      ];

      // Sample signals immediately after the synchronous dispatch.
      const inflightAtDispatch = p.signals.inflight.get();
      const queuedAtDispatch = p.signals.queued.get();

      // Dispatch is synchronous in run() — we expect 2 inflight, 2 queued.
      // (The signal updates inside run() before run returns the promise.)
      expect(inflightAtDispatch).toBe(2);
      expect(queuedAtDispatch).toBe(2);

      const results = await Promise.all(promises);
      expect(results).toEqual(["a", "b", "c", "d"]);

      // After all runs settle, both counters return to 0.
      expect(p.signals.inflight.get()).toBe(0);
      expect(p.signals.queued.get()).toBe(0);
    } finally {
      p.dispose();
    }
  }, 30000);

  test("dispose() drops all signals to 0", async () => {
    using dir = tempDir("pool-sig-d", { "worker.js": WORKER_SRC });
    const parallel = (await import("bun:parallel")).default;
    const p = parallel.pool({ module: join(String(dir), "worker.js"), size: 2 });
    await p.run("echo", "x");
    expect(p.signals.workersCount.get()).toBeGreaterThan(0);
    p.dispose();
    expect(p.signals.workersCount.get()).toBe(0);
    expect(p.signals.queued.get()).toBe(0);
    expect(p.signals.inflight.get()).toBe(0);
  }, 30000);
});
