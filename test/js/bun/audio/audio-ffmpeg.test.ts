import { describe, expect, test } from "bun:test";

// Audio file decode + encode via ffmpeg subprocess. Skips when
// ffmpeg isn't on PATH so the suite stays portable.

async function ffmpegAvailable(): Promise<boolean> {
  try {
    await using p = Bun.spawn({ cmd: ["ffmpeg", "-version"], stdout: "ignore", stderr: "ignore" });
    return (await p.exited) === 0;
  } catch {
    return false;
  }
}

const SKIP = !(await ffmpegAvailable());

// Build a 1-second 440 Hz sine at the given rate / channel count.
// Returns Int16Array (interleaved if stereo) of length sampleRate*channels.
function sineTone(sampleRate: number, channels: number, freq = 440, durationS = 1): Int16Array {
  const N = sampleRate * durationS * channels;
  const out = new Int16Array(N);
  for (let i = 0; i < sampleRate * durationS; i++) {
    const v = Math.sin((2 * Math.PI * freq * i) / sampleRate) * 30000;
    for (let ch = 0; ch < channels; ch++) out[i * channels + ch] = v | 0;
  }
  return out;
}

describe.skipIf(SKIP)("parabun:audio — ffmpeg file codec", () => {
  test("MP3 round-trip preserves dimensions and approximate signal", async () => {
    const audio = (await import("parabun:audio")).default;
    const SR = 44100;
    const tone = sineTone(SR, 1);
    const mp3 = await audio.encodeFile(tone, { format: "mp3", sampleRate: SR, channels: 1, bitrate: 128_000 });
    expect(mp3).toBeInstanceOf(Uint8Array);
    expect(mp3.length).toBeGreaterThan(1000);
    // ffmpeg's libmp3lame prepends an ID3v2 header by default ("ID3"
    // at byte 0); the actual MP3 frame sync (0xFF F* / 0xFF E*)
    // follows. Accept either form.
    const isID3 = mp3[0] === 0x49 && mp3[1] === 0x44 && mp3[2] === 0x33;
    const isFrameSync = mp3[0] === 0xff && (mp3[1] & 0xe0) === 0xe0;
    expect(isID3 || isFrameSync).toBe(true);

    const decoded = await audio.decodeFile(mp3);
    expect(decoded.sampleRate).toBe(SR);
    expect(decoded.channels).toBe(1);
    // Lossy codec adds tail samples (decoder priming + padding); be
    // generous on length.
    expect(decoded.samples.length).toBeGreaterThan(SR * 0.95);
    expect(decoded.samples.length).toBeLessThan(SR * 1.1);
    // Confirm the tone is non-silent and roughly the right amplitude.
    let peak = 0;
    for (let i = 0; i < decoded.samples.length; i++) {
      const v = Math.abs(decoded.samples[i]);
      if (v > peak) peak = v;
    }
    expect(peak).toBeGreaterThan(20000);
  });

  test("FLAC round-trip is bit-exact (lossless)", async () => {
    const audio = (await import("parabun:audio")).default;
    const SR = 16000;
    const tone = sineTone(SR, 1);
    const flac = await audio.encodeFile(tone, { format: "flac", sampleRate: SR, channels: 1 });
    expect(flac).toBeInstanceOf(Uint8Array);
    // FLAC stream marker: "fLaC" at byte 0.
    expect(flac[0]).toBe(0x66);
    expect(flac[1]).toBe(0x4c);
    expect(flac[2]).toBe(0x61);
    expect(flac[3]).toBe(0x43);

    const decoded = await audio.decodeFile(flac);
    expect(decoded.sampleRate).toBe(SR);
    expect(decoded.channels).toBe(1);
    expect(decoded.samples.length).toBe(tone.length);
    // FLAC is lossless → bytes match exactly.
    for (let i = 0; i < tone.length; i++) {
      expect(decoded.samples[i]).toBe(tone[i]);
    }
  });

  test("OGG (vorbis) round-trip preserves dimensions", async () => {
    const audio = (await import("parabun:audio")).default;
    const SR = 22050;
    const tone = sineTone(SR, 2);
    const ogg = await audio.encodeFile(tone, { format: "ogg", sampleRate: SR, channels: 2, bitrate: 96_000 });
    expect(ogg).toBeInstanceOf(Uint8Array);
    // OGG magic: "OggS" at byte 0.
    expect(ogg[0]).toBe(0x4f);
    expect(ogg[1]).toBe(0x67);
    expect(ogg[2]).toBe(0x67);
    expect(ogg[3]).toBe(0x53);

    const decoded = await audio.decodeFile(ogg);
    expect(decoded.sampleRate).toBe(SR);
    expect(decoded.channels).toBe(2);
    // Vorbis adds a chunk of priming + padding samples.
    expect(decoded.samples.length).toBeGreaterThan(SR * 2 * 0.95);
    expect(decoded.samples.length).toBeLessThan(SR * 2 * 1.2);
  });

  test("AAC round-trip preserves dimensions", async () => {
    const audio = (await import("parabun:audio")).default;
    const SR = 44100;
    const tone = sineTone(SR, 1);
    const aac = await audio.encodeFile(tone, { format: "aac", sampleRate: SR, channels: 1, bitrate: 128_000 });
    expect(aac).toBeInstanceOf(Uint8Array);
    // ADTS sync word: 0xFF 0xF1/0xF9.
    expect(aac[0]).toBe(0xff);
    expect(aac[1] & 0xf0).toBe(0xf0);

    const decoded = await audio.decodeFile(aac);
    expect(decoded.sampleRate).toBe(SR);
    expect(decoded.channels).toBe(1);
    expect(decoded.samples.length).toBeGreaterThan(SR * 0.9);
    expect(decoded.samples.length).toBeLessThan(SR * 1.2);
  });

  test("decode resamples + remixes to caller-specified shape", async () => {
    const audio = (await import("parabun:audio")).default;
    const SR = 44100;
    const tone = sineTone(SR, 2);
    const flac = await audio.encodeFile(tone, { format: "flac", sampleRate: SR, channels: 2 });
    const decoded = await audio.decodeFile(flac, { sampleRate: 16000, channels: 1 });
    expect(decoded.sampleRate).toBe(16000);
    expect(decoded.channels).toBe(1);
    expect(decoded.samples.length).toBeGreaterThan(15000);
    expect(decoded.samples.length).toBeLessThan(17000);
  });

  test("decodeFile rejects non-Uint8Array input", async () => {
    const audio = (await import("parabun:audio")).default;
    await expect(audio.decodeFile("not bytes" as any)).rejects.toThrow(TypeError);
  });

  test("probe returns format/codec/sampleRate/channels/duration without decoding PCM", async () => {
    const audio = (await import("parabun:audio")).default;
    const SR = 22050;
    const tone = sineTone(SR, 1);
    const flac = await audio.encodeFile(tone, { format: "flac", sampleRate: SR, channels: 1 });
    const meta = await audio.probe(flac);
    expect(meta.format).toBe("flac");
    expect(meta.codec).toBe("flac");
    expect(meta.sampleRate).toBe(SR);
    expect(meta.channels).toBe(1);
    expect(meta.durationMs).toBeGreaterThan(900);
    expect(meta.durationMs).toBeLessThan(1100);
  });

  test("probe surfaces lossy bitrate when the container records it", async () => {
    const audio = (await import("parabun:audio")).default;
    const SR = 44100;
    const tone = sineTone(SR, 2);
    const mp3 = await audio.encodeFile(tone, { format: "mp3", sampleRate: SR, channels: 2, bitrate: 192_000 });
    const meta = await audio.probe(mp3);
    expect(meta.codec).toBe("mp3");
    expect(meta.channels).toBe(2);
    // ffmpeg records actual bitrate near the requested target.
    expect(meta.bitrate).toBeGreaterThan(150_000);
    expect(meta.bitrate).toBeLessThan(250_000);
  });

  test("probe rejects non-audio input with a useful error", async () => {
    const audio = (await import("parabun:audio")).default;
    const garbage = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]);
    await expect(audio.probe(garbage)).rejects.toThrow();
  });

  test("encodeFile rejects non-Int16Array input", async () => {
    const audio = (await import("parabun:audio")).default;
    await expect(
      audio.encodeFile(new Float32Array(100) as any, { format: "mp3", sampleRate: 44100, channels: 1 }),
    ).rejects.toThrow(TypeError);
  });
});
