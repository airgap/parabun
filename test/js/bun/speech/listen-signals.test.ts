import { describe, expect, test } from "bun:test";

// Reactive surface on speech.listen() — `active`, `noiseFloor`,
// `lastUtterance` signals attached to the iterable. Drives the iterator
// with synthetic frames of silence + tone so we don't need a real mic.

const SR = 16000;
const FRAME = 480;

function silentFrame(n: number): Float32Array {
  return new Float32Array(n); // zero-filled
}

function toneFrame(n: number, amp: number): Float32Array {
  const out = new Float32Array(n);
  // 440 Hz sine — well above noise floor at amp=0.3.
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * 440 * i) / SR);
  return out;
}

async function* synthStream() {
  // 200 ms of silence (noise floor warm-up)
  for (let i = 0; i < 6; i++) yield { samples: silentFrame(FRAME), timestampMs: i * 30 };
  // 600 ms of tone (utterance)
  for (let i = 0; i < 20; i++) yield { samples: toneFrame(FRAME, 0.3), timestampMs: 200 + i * 30 };
  // 800 ms of silence (hangover seals utterance)
  for (let i = 0; i < 27; i++) yield { samples: silentFrame(FRAME), timestampMs: 800 + i * 30 };
}

describe("parabun:speech listen() signals", () => {
  test("active flips during utterance; lastUtterance lands on seal; noiseFloor adapts", async () => {
    const speech = (await import("parabun:speech")).default;
    const it = speech.listen(synthStream(), {
      sampleRate: SR,
      frameSize: FRAME,
      preRollMs: 60,
      hangoverMs: 200,
      minUtteranceMs: 100,
    });

    expect(typeof it.active.get).toBe("function");
    expect(typeof it.noiseFloor.get).toBe("function");
    expect(typeof it.lastUtterance.get).toBe("function");

    expect(it.active.get()).toBe(false);
    expect(it.lastUtterance.get()).toBeNull();

    const activeTrace: boolean[] = [];
    const unsubActive = it.active.subscribe((v: boolean) => activeTrace.push(v));

    const utts = [];
    for await (const u of it) utts.push(u);
    unsubActive();

    expect(utts.length).toBe(1);
    expect(utts[0].samples.length).toBeGreaterThan(0);
    expect(activeTrace).toContain(true);
    expect(it.active.get()).toBe(false);
    expect(it.lastUtterance.get()).not.toBeNull();
    expect(it.lastUtterance.get()).toBe(utts[0]);
    expect(it.noiseFloor.get()).toBeGreaterThan(0);
  });
});
