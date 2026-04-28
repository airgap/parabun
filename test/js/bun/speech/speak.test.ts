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
});
