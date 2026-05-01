import { describe, expect, test } from "bun:test";

// PlaybackStream's reactive surface: queuedMs (LYK-746). Skips when no
// ALSA "default" output device is available (CI without sound hardware).
//
// The signal reports the depth of the kernel ring buffer; we drive it
// by writing a known amount of audio and checking the post-write reading,
// then drain/stop and check that it returns to zero.

async function tryPlay(): Promise<{ spk: any; supported: boolean }> {
  try {
    const audio = (await import("parabun:audio")).default;
    const spk = await audio.play({
      device: "default",
      sampleRate: 22050,
      channels: 1,
      // Modest buffer (~80 ms at 22050 Hz with 4 periods of 20 ms) so a
      // single short write doesn't immediately saturate it.
      periodMs: 20,
      bufferPeriods: 4,
    });
    return { spk, supported: true };
  } catch {
    return { spk: null, supported: false };
  }
}

function silenceFrames(n: number): Float32Array {
  // True zeroes — playback writes are valid f32 samples.
  return new Float32Array(n);
}

describe("parabun:audio playback signals (LYK-746)", () => {
  test("queuedMs is Signal-shaped", async () => {
    const { spk, supported } = await tryPlay();
    if (!supported) return;
    try {
      expect(typeof spk.queuedMs.get).toBe("function");
      expect(typeof spk.queuedMs.subscribe).toBe("function");
      expect(typeof spk.queuedMs.peek).toBe("function");
      expect(spk.queuedMs.get()).toBe(0);
    } finally {
      await spk.close();
    }
  });

  test("queuedMs is non-negative + finite at all times", async () => {
    const { spk, supported } = await tryPlay();
    if (!supported) return;
    try {
      // Write enough samples to land *something* in the queue. 4096
      // samples at 22050 Hz ≈ 186 ms — bigger than the ring buffer
      // (~80 ms), so write() will block until ALSA drains some, but the
      // post-write reading should reflect roughly one buffer's worth.
      await spk.write(silenceFrames(4096));
      const after = spk.queuedMs.get();
      expect(Number.isFinite(after)).toBe(true);
      expect(after).toBeGreaterThanOrEqual(0);
      // Buffer is ~80 ms; allow a generous upper bound for hardware noise.
      expect(after).toBeLessThan(500);
    } finally {
      await spk.close();
    }
  });

  test("stop() resets queuedMs to 0 immediately", async () => {
    const { spk, supported } = await tryPlay();
    if (!supported) return;
    try {
      await spk.write(silenceFrames(2048));
      // Whether the buffer is full or partial, stop should drop everything.
      await spk.stop();
      expect(spk.queuedMs.get()).toBe(0);
    } finally {
      await spk.close();
    }
  });

  test("close() drives queuedMs to 0 and stops emitting", async () => {
    const { spk, supported } = await tryPlay();
    if (!supported) return;
    let notifyCount = 0;
    spk.queuedMs.subscribe(() => notifyCount++);
    try {
      await spk.write(silenceFrames(2048));
    } finally {
      await spk.close();
    }
    expect(spk.queuedMs.get()).toBe(0);
    const before = notifyCount;
    // Closed stream is inert — even after a tick, no further updates.
    await new Promise(r => setTimeout(r, 150));
    expect(notifyCount).toBe(before);
  });
});
