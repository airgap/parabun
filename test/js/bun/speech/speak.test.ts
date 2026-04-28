import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";

// Speech synthesis regression coverage. Catches:
//   - The speak() interface contract — must return { samples, sampleRate, channels }
//   - WAV header parsing in audio.readWav — speak's output is the round-trip
//     of piper → tmpfile WAV → readWav → Float32Array
//
// Skips when piper binary or voice model aren't on disk locally. Vendoring
// the piper binary (26 MB) and a voice (10 MB) into the repo isn't worth
// it for a single test; CI can opt in via PARABUN_PIPER_BIN +
// PARABUN_PIPER_VOICE env vars.

const piperBin = process.env.PARABUN_PIPER_BIN ?? "/raid/parabun/.cache/piper/piper/piper";
const voiceModel = process.env.PARABUN_PIPER_VOICE ?? "/raid/parabun/.cache/piper/voices/lessac.onnx";
const have = existsSync(piperBin) && existsSync(voiceModel) && existsSync(`${voiceModel}.json`);

describe("bun:speech.speak (Piper subprocess)", () => {
  test.skipIf(!have)("synthesizes text → mono PCM at voice native rate", async () => {
    const speech = (await import("bun:speech")).default;
    const result = await speech.speak("Hello from Parabun.", {
      engine: "piper",
      model: voiceModel,
      binPath: piperBin,
    });

    expect(result).toBeDefined();
    expect(result.samples).toBeInstanceOf(Float32Array);
    expect(result.samples.length).toBeGreaterThan(0);
    expect(result.channels).toBe(1);
    expect(result.sampleRate).toBeGreaterThanOrEqual(8000);
    expect(result.sampleRate).toBeLessThanOrEqual(48000);

    // Synthesis of "Hello from Parabun." is realistically 1-3 sec of
    // audio. Anything outside [0.3s, 10s] suggests a parsing bug
    // (truncated or runaway WAV).
    const durationSec = result.samples.length / result.sampleRate;
    expect(durationSec).toBeGreaterThan(0.3);
    expect(durationSec).toBeLessThan(10);

    // PCM range sanity — Piper outputs samples in [-1, 1].
    let max = 0;
    for (let i = 0; i < result.samples.length; i++) {
      const a = Math.abs(result.samples[i]);
      if (a > max) max = a;
    }
    expect(max).toBeGreaterThan(0.01); // not silent
    expect(max).toBeLessThanOrEqual(1.0);
  });

  test("rejects unknown engine", async () => {
    const speech = (await import("bun:speech")).default;
    await expect(speech.speak("hi", { engine: "festival" as "piper", model: "/x" })).rejects.toThrow(/unknown engine/);
  });

  test("rejects empty text", async () => {
    const speech = (await import("bun:speech")).default;
    await expect(speech.speak("", { engine: "piper", model: "/x" })).rejects.toThrow(/non-empty string/);
  });

  test("rejects missing model path", async () => {
    const speech = (await import("bun:speech")).default;
    await expect(speech.speak("hi", { engine: "piper", model: "/definitely/not/here.onnx" })).rejects.toThrow(
      /voice model not found/,
    );
  });

  // Persistent-session coverage (LYK-758 v1.5). The cached subprocess
  // means N sequential calls share one piper instance — no fork +
  // ORT init per call. We exercise the path; the perf benefit is
  // bench-validated separately (timing assertions are too flaky on
  // debug builds + asan to land in CI).
  test.skipIf(!have)("sequential calls succeed against a cached session", async () => {
    const speech = (await import("bun:speech")).default;
    await speech.closePiperSessions();

    const r1 = await speech.speak("First sentence.", { engine: "piper", model: voiceModel, binPath: piperBin });
    const r2 = await speech.speak("Second sentence.", { engine: "piper", model: voiceModel, binPath: piperBin });
    const r3 = await speech.speak("Third sentence.", { engine: "piper", model: voiceModel, binPath: piperBin });

    expect(r1.samples.length).toBeGreaterThan(0);
    expect(r2.samples.length).toBeGreaterThan(0);
    expect(r3.samples.length).toBeGreaterThan(0);
    // Sanity: the cached metadata is consistent across calls.
    expect(r1.sampleRate).toBe(r2.sampleRate);
    expect(r2.sampleRate).toBe(r3.sampleRate);
    expect(r1.channels).toBe(1);

    await speech.closePiperSessions();
  });

  test.skipIf(!have)("closePiperSessions kills the subprocess; subsequent speak respawns cleanly", async () => {
    const speech = (await import("bun:speech")).default;
    const r1 = await speech.speak("First.", { engine: "piper", model: voiceModel, binPath: piperBin });
    expect(r1.samples.length).toBeGreaterThan(0);

    await speech.closePiperSessions();

    // After close, the cache is empty — a fresh call should spawn a new
    // session without errors and return audio.
    const r2 = await speech.speak("Second.", { engine: "piper", model: voiceModel, binPath: piperBin });
    expect(r2.samples.length).toBeGreaterThan(0);

    await speech.closePiperSessions();
  });
});
