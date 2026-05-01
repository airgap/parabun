import { describe, expect, test } from "bun:test";

// parabun:gpu reactive diagnostic signals (LYK-741/764).
// activeBackendSignal + availableSignal are lazy-init proxies — the
// underlying signal materializes on first read so a CUDA-less host doesn't
// pay probing cost just for loading parabun:gpu.

describe("parabun:gpu diagnostic signals (LYK-741/764)", () => {
  test("activeBackendSignal + availableSignal are Signal-shaped", async () => {
    const gpu = (await import("parabun:gpu")).default;
    expect(typeof gpu.activeBackendSignal.get).toBe("function");
    expect(typeof gpu.activeBackendSignal.subscribe).toBe("function");
    expect(typeof gpu.activeBackendSignal.peek).toBe("function");
    expect(typeof gpu.availableSignal.get).toBe("function");
  });

  test("activeBackendSignal returns the same value as activeBackend()", async () => {
    const gpu = (await import("parabun:gpu")).default;
    const sig = gpu.activeBackendSignal.get();
    const fn = gpu.activeBackend();
    expect(sig).toBe(fn);
  });

  test("availableSignal lists at least cpu", async () => {
    const gpu = (await import("parabun:gpu")).default;
    const avail = gpu.availableSignal.get();
    expect(Array.isArray(avail)).toBe(true);
    expect(avail).toContain("cpu");
  });

  test("setBackend() flips activeBackendSignal", async () => {
    const gpu = (await import("parabun:gpu")).default;
    const updates: string[] = [];
    const unsub = gpu.activeBackendSignal.subscribe((v: string) => updates.push(v));
    // Always-available: cpu. Always switching to it from anything else
    // produces a transition. Switching back to whatever was active before
    // the test keeps things tidy.
    const before = gpu.activeBackend();
    gpu.setBackend("cpu");
    if (before !== "cpu") {
      try {
        gpu.setBackend(before);
      } catch {
        // before backend is no longer probable — accept current state.
      }
    }
    unsub();

    // Subscribe fires once with the current value, then on transitions.
    expect(updates).toContain("cpu");
  });
});
