import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Whisper regression coverage. Catches:
//   - The base.en `[static]` failure mode (LYK-748) — silently shipped for
//     several commits because nothing exercised the transcribe path.
//   - bun:gpu CPU SDPA fallback returning all-NaN with GpuFloat32Array K/V
//     (LYK-757) — symptom is `!!!!` repeating instead of real text.
//   - Any future encoder/decoder regression that breaks the JFK clip
//     transcription on a known-good model.
//
// Skips when fixtures aren't present locally. Vendoring the 78 MB
// ggml-tiny.en.bin into the repo isn't worth it; the test runs locally
// against `~/.cache/whisper/` and skips in CI. CI can opt in by setting
// PARABUN_WHISPER_FIXTURES=/path/to/dir.

// Fixtures live outside the repo (78 MB binary, not worth vendoring).
// Search PARABUN_WHISPER_FIXTURES first, then ~/.cache/whisper, then the
// dev box's /raid/parabun/.cache/whisper. Skip cleanly if none has them.
const cacheCandidates = [
  process.env.PARABUN_WHISPER_FIXTURES,
  join(homedir(), ".cache/whisper"),
  "/raid/parabun/.cache/whisper",
].filter((p): p is string => Boolean(p));
const cacheDir = cacheCandidates.find(d => existsSync(join(d, "jfk.wav"))) ?? cacheCandidates[0];
const tinyEn = join(cacheDir, "ggml-tiny.en.bin");
const baseEn = join(cacheDir, "ggml-base.en.bin");
const jfkWav = join(cacheDir, "jfk.wav");
const haveTiny = existsSync(tinyEn) && existsSync(jfkWav);
const haveBase = existsSync(baseEn) && existsSync(jfkWav);

async function loadJfkMel() {
  const audio = (await import("bun:audio")).default;
  const wavBytes = new Uint8Array(await Bun.file(jfkWav).arrayBuffer());
  const wav = audio.readWav(wavBytes);
  const m = audio.melSpectrogram(wav.samples, { mode: "whisper" });
  const T = m.frames.length;
  const flat = new Float32Array(m.nMels * T);
  for (let mi = 0; mi < m.nMels; mi++) {
    for (let t = 0; t < T; t++) flat[mi * T + t] = m.frames[t][mi];
  }
  return { mel: flat, T };
}

describe("bun:llm WhisperModel", () => {
  test.skipIf(!haveTiny)("tiny.en transcribes JFK clip — substring match", async () => {
    const llm = (await import("bun:llm")).default;
    const model = await llm.WhisperModel.load(tinyEn);
    const { mel, T } = await loadJfkMel();
    const text = model.transcribeMel(mel, T);

    // The reference Whisper transcript of jfk.wav contains the phrase
    // "fellow Americans". Substring match keeps the assertion robust to
    // BPE leading-space variation, punctuation drift, and minor model
    // sampling differences.
    expect(text.toLowerCase()).toContain("fellow americans");

    // Sanity: not the LYK-757 NaN-cascade failure mode where every token
    // resolves to id 0 (`!`) — the output should not be mostly `!`.
    const exclamRatio = (text.match(/!/g)?.length ?? 0) / Math.max(text.length, 1);
    expect(exclamRatio).toBeLessThan(0.1);

    // LYK-766: busy is false post-call.
    expect(model.busy.get()).toBe(false);
  });

  test.skipIf(!haveTiny)("WhisperModel.busy signal — initial false, transitions during transcribe", async () => {
    const llm = (await import("bun:llm")).default;
    const model = await llm.WhisperModel.load(tinyEn);
    const { mel, T } = await loadJfkMel();

    expect(typeof model.busy.get).toBe("function");
    expect(typeof model.busy.subscribe).toBe("function");
    expect(model.busy.get()).toBe(false);

    const trace: boolean[] = [];
    const unsub = model.busy.subscribe((v: boolean) => trace.push(v));
    model.transcribeMel(mel, T);
    unsub();

    // Subscribe delivers current value first, then the actual transitions.
    expect(trace).toContain(true);
    expect(trace[trace.length - 1]).toBe(false);
    expect(model.busy.get()).toBe(false);
  });

  // base.en used to transcribe to "[static] [static]..." (LYK-748). The bug
  // was rooted in the device-resident KV cache + fused multi-head SDPA
  // landing path — at nHead=8/headDim=64 the decoder logits came back
  // degenerate (best non-masked logit ~-0.6 vs tiny.en's ~17). Subsequent
  // SDPA + KV refactors fixed it; this test is the net that keeps it
  // fixed. The failure mode also catches the older LYK-757 NaN cascade
  // ("!!!!" repeating) on the same path.
  test.skipIf(!haveBase)("base.en transcribes JFK clip — substring match (LYK-748)", async () => {
    const llm = (await import("bun:llm")).default;
    const model = await llm.WhisperModel.load(baseEn);
    const { mel, T } = await loadJfkMel();
    const text = model.transcribeMel(mel, T);

    // Real transcription contains "fellow Americans".
    expect(text.toLowerCase()).toContain("fellow americans");

    // Specific [static] regression — refuse a string that's mostly the
    // [static] special token. The original failure dumped that token
    // hundreds of times in a row.
    const staticHits = text.match(/\[static\]/gi)?.length ?? 0;
    expect(staticHits).toBeLessThan(3);

    // LYK-757 NaN-cascade failure mode (every token resolves to id 0).
    const exclamRatio = (text.match(/!/g)?.length ?? 0) / Math.max(text.length, 1);
    expect(exclamRatio).toBeLessThan(0.1);

    // Busy signal cleared post-call (LYK-766).
    expect(model.busy.get()).toBe(false);
  });
});
