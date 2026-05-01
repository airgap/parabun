import { describe, expect, test } from "bun:test";

// Vision motion-detector signals (LYK-742/762). detectMotion() is a pure
// function over an RGBA frame iterator — we can drive it with synthetic
// frames and exercise the reactive surface end-to-end without any camera
// hardware.

// Build a flat RGBA frame at the given grayscale level.
function flatFrame(level: number, width = 64, height = 48, ts = 0, seq = 0) {
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = level;
    rgba[i + 1] = level;
    rgba[i + 2] = level;
    rgba[i + 3] = 255;
  }
  return { rgba, width, height, timestampMs: ts, sequence: seq };
}

async function* synthFrames(levels: number[], spacingMs = 110) {
  let t = 0;
  let seq = 0;
  for (const l of levels) {
    yield flatFrame(l, 64, 48, t, seq);
    t += 200;
    seq++;
    // Real spacing (matches what a 9-fps camera would emit). The score
    // signal throttle is wall-clock based — any non-zero spacing keeps the
    // throttle from collapsing all frames into one emit. 110 ms clears the
    // 100 ms window with a small margin so every frame emits.
    if (spacingMs > 0) await new Promise(r => setTimeout(r, spacingMs));
  }
}

describe("parabun:vision motion signals (LYK-742/762)", () => {
  test("detected + score are Signal-shaped, initial values clean", async () => {
    const vision = (await import("parabun:vision")).default;
    const m = vision.detectMotion(synthFrames([]));

    expect(typeof m.detected.get).toBe("function");
    expect(typeof m.detected.subscribe).toBe("function");
    expect(typeof m.detected.peek).toBe("function");
    expect(typeof m.score.get).toBe("function");

    expect(m.detected.get()).toBe(false);
    expect(m.score.get()).toBe(0);

    // Drain — empty stream — to actually run the generator's finally block.
    for await (const _ of m) void _;
  });

  test("detected stays false on a still scene", async () => {
    const vision = (await import("parabun:vision")).default;
    const m = vision.detectMotion(synthFrames([100, 100, 100, 100]), { sensitivity: 0.05 });

    for await (const _ of m) void _;

    // No motion at all — final signal state is inert.
    expect(m.detected.get()).toBe(false);
    expect(m.score.get()).toBe(0);
  });

  test("detected flips true when frames change abruptly", async () => {
    const vision = (await import("parabun:vision")).default;
    // First-frame baseline at 50 (dark grey), then a hard cut to 200 (bright).
    // The downsampled luma diff at the default threshold (16) flags every
    // pixel as changed → score = 1.0 raw. Smoothing(0.3) means the first
    // moving frame's smoothed score is 0.7 — well above sensitivity.
    const m = vision.detectMotion(synthFrames([50, 50, 200, 200]), { sensitivity: 0.05 });

    const trace: { score: number; detected: boolean }[] = [];
    const frames: any[] = [];
    for await (const f of m) {
      frames.push(f);
      trace.push({ score: m.score.peek(), detected: m.detected.peek() });
    }

    // Yielded one MotionFrame per input frame.
    expect(frames.length).toBe(4);

    // Frame 0 has no prior — motionScore stays at 0.
    expect(frames[0].motionScore).toBe(0);
    expect(frames[0].moving).toBe(false);

    // Frame 1 is the same level as frame 0 — still 0 (rawScore = 0).
    expect(frames[1].moving).toBe(false);

    // Frame 2 jumps to 200 — every pixel exceeds threshold; smoothed
    // score becomes (1 - smoothing) × 1.0 = 0.7 (default smoothing 0.3).
    expect(frames[2].moving).toBe(true);
    expect(frames[2].motionScore).toBeGreaterThan(0.5);

    // Generator finished, so per the finally block detected resets to false.
    expect(m.detected.get()).toBe(false);
  });

  test("score signal fires for subscribers as motion ramps", async () => {
    const vision = (await import("parabun:vision")).default;
    const m = vision.detectMotion(synthFrames([0, 0, 255, 0, 255, 0]), { sensitivity: 0.05 });

    const seenScores: number[] = [];
    const unsub = m.score.subscribe((v: number) => seenScores.push(v));

    for await (const _ of m) void _;
    unsub();

    // Subscribe fires once with the current value (0), then on every
    // throttle-window emit. With 200 ms frame spacing and a 100 ms
    // throttle, every frame after the first contributes an emit.
    expect(seenScores.length).toBeGreaterThanOrEqual(2);

    // Last emit is the inert reset from the finally block.
    expect(seenScores[seenScores.length - 1]).toBe(0);
  });

  test("detected subscribers see the rising and falling edges", async () => {
    const vision = (await import("parabun:vision")).default;
    // Levels: still, still, hard cut, sustain bright, back to still, still.
    // Expect rising edge near frame 2, falling edge as smoothing decays.
    const m = vision.detectMotion(synthFrames([20, 20, 200, 200, 20, 20, 20, 20, 20]), {
      sensitivity: 0.05,
      smoothing: 0.5,
    });

    const transitions: boolean[] = [];
    const unsub = m.detected.subscribe((v: boolean) => transitions.push(v));

    for await (const _ of m) void _;
    unsub();

    // First emit is the initial false; we want at least one true→false
    // round trip after that.
    expect(transitions[0]).toBe(false);
    expect(transitions).toContain(true);
    expect(transitions[transitions.length - 1]).toBe(false);
  });

  test(".run() drains in the background; signals update without iterating", async () => {
    const vision = (await import("parabun:vision")).default;
    const m = vision.detectMotion(synthFrames([20, 20, 200, 200, 20, 20]), {
      sensitivity: 0.05,
      smoothing: 0.5,
    });
    const transitions: boolean[] = [];
    const unsub = m.detected.subscribe((v: boolean) => transitions.push(v));

    // No for-await — the .run() is supposed to drive the loop for us.
    const stop = m.run();
    // Wait for the synthetic stream to finish (6 frames × 110 ms + slack).
    await new Promise(r => setTimeout(r, 800));
    stop();
    unsub();

    // We saw the rising edge on motion, then back to false from the
    // finally block when the stream ended.
    expect(transitions).toContain(true);
    expect(transitions[transitions.length - 1]).toBe(false);
  });

  test(".run() is idempotent — second call returns the same disposer", async () => {
    const vision = (await import("parabun:vision")).default;
    const m = vision.detectMotion(synthFrames([10, 10]));
    const stopA = m.run();
    const stopB = m.run();
    expect(stopA).toBe(stopB);
    stopA();
  });

  test(".run() disposer fires the generator's finally — signals reset", async () => {
    const vision = (await import("parabun:vision")).default;
    // Long-ish stream so the dispose has work to interrupt.
    const m = vision.detectMotion(synthFrames([20, 200, 20, 200, 20, 200, 20]));

    const stop = m.run();
    // Let a couple of frames land so the signals have non-inert values.
    await new Promise(r => setTimeout(r, 250));
    stop();

    // gen.return() requests termination at the next yield, so already-
    // in-flight frames may still complete. The contract is that the
    // finally block eventually runs and resets the signals to inert.
    // 500 ms is generous against a 110 ms frame spacing.
    await new Promise(r => setTimeout(r, 500));
    expect(m.detected.get()).toBe(false);
    expect(m.score.get()).toBe(0);
  });
});
