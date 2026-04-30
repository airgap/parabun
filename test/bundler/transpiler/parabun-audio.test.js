import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

async function runFixture(prefix, source) {
  using dir = tempDir(prefix, { "index.ts": source.trimStart() });
  await using proc = Bun.spawn({
    cmd: [bunExe(), "index.ts"],
    env: bunEnv,
    cwd: String(dir),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

describe("para:audio — FFT", () => {
  it("FFT of a pure sine wave has a single dominant bin", async () => {
    // 64-sample real signal: a 4-cycle sine over the window. After FFT,
    // bin 4 (and its mirror at 60 = N-4) should be the only large
    // magnitudes. We assert bin 4 dominates everything else by 50×.
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-fft-sine",
      `
        import audio from "para:audio";
        const N = 64, k = 4;
        const samples = new Float32Array(N);
        for (let n = 0; n < N; n++) samples[n] = Math.sin(2 * Math.PI * k * n / N);
        const freqs = audio.fft(samples);
        const mags = new Float32Array(N);
        for (let i = 0; i < N; i++) mags[i] = Math.hypot(freqs[i*2], freqs[i*2+1]);
        // Find the dominant bin.
        let maxBin = 0, maxMag = 0;
        for (let i = 0; i < N; i++) if (mags[i] > maxMag) { maxMag = mags[i]; maxBin = i; }
        console.log("dominantBin", maxBin);
        // Other bins (excluding the mirror at N-k) should all be << maxMag.
        let secondLargest = 0;
        for (let i = 0; i < N; i++) {
          if (i === k || i === N - k) continue;
          if (mags[i] > secondLargest) secondLargest = mags[i];
        }
        console.log("dominanceRatio", maxMag / Math.max(1e-12, secondLargest) > 50);
      `,
    );
    expect(stdout).toBe(["dominantBin 4", "dominanceRatio true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("FFT → IFFT round-trip preserves the input within fp32 tolerance", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-fft-roundtrip",
      `
        import audio from "para:audio";
        const N = 256;
        const samples = new Float32Array(N);
        for (let i = 0; i < N; i++) samples[i] = Math.sin(i * 0.1) + 0.5 * Math.cos(i * 0.37);
        const back = audio.ifft(audio.fft(samples));
        let maxDiff = 0;
        for (let i = 0; i < N; i++) maxDiff = Math.max(maxDiff, Math.abs(samples[i] - back[i]));
        console.log("maxDiff<1e-4", maxDiff < 1e-4);
      `,
    );
    expect(stdout).toBe("maxDiff<1e-4 true");
    expect(exitCode).toBe(0);
  });

  it("rejects non-power-of-2 lengths", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-fft-bad-len",
      `
        import audio from "para:audio";
        try {
          audio.fft(new Float32Array(7));
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.message.includes("power of 2"));
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });
});

describe("para:audio — WAV I/O", () => {
  it("writeWav → readWav roundtrip preserves samples (s16)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-wav-s16",
      `
        import audio from "para:audio";
        const N = 1024;
        const orig = new Float32Array(N);
        for (let i = 0; i < N; i++) orig[i] = 0.5 * Math.sin(i * 0.05);
        const bytes = audio.writeWav({ samples: orig, sampleRate: 44100, channels: 1 });
        // RIFF + WAVE magic at the right offsets
        console.log("riff", String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]));
        console.log("wave", String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]));
        const { samples, sampleRate, channels } = audio.readWav(bytes);
        console.log("rate", sampleRate, "ch", channels, "len", samples.length);
        // s16 quantization is ~3e-5; use a generous bound.
        let maxDiff = 0;
        for (let i = 0; i < N; i++) maxDiff = Math.max(maxDiff, Math.abs(orig[i] - samples[i]));
        console.log("withinS16Tolerance", maxDiff < 1e-3);
      `,
    );
    expect(stdout).toBe(["riff RIFF", "wave WAVE", "rate 44100 ch 1 len 1024", "withinS16Tolerance true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("writeWav → readWav roundtrip preserves samples exactly (float32)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-wav-f32",
      `
        import audio from "para:audio";
        const N = 512;
        const orig = new Float32Array(N);
        for (let i = 0; i < N; i++) orig[i] = (i / N) * 2 - 1;  // -1 → ~1
        const bytes = audio.writeWav(
          { samples: orig, sampleRate: 22050, channels: 1 },
          { bitsPerSample: 32 },
        );
        const { samples, sampleRate } = audio.readWav(bytes);
        console.log("rate", sampleRate);
        // Float32 path is bit-exact (modulo Int24 rounding which we don't do)
        let mismatches = 0;
        for (let i = 0; i < N; i++) if (samples[i] !== orig[i]) mismatches++;
        console.log("mismatches", mismatches);
      `,
    );
    expect(stdout).toBe(["rate 22050", "mismatches 0"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("rejects non-RIFF input", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-wav-bad-input",
      `
        import audio from "para:audio";
        try {
          audio.readWav(new Uint8Array(64));  // all zeros
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.message.includes("not a RIFF/WAVE"));
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });

  it("preserves stereo channels (interleaved)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-wav-stereo",
      `
        import audio from "para:audio";
        // 4 frames × 2 channels → 8 interleaved samples.
        const samples = new Float32Array([0.1, -0.1, 0.2, -0.2, 0.3, -0.3, 0.4, -0.4]);
        const bytes = audio.writeWav(
          { samples, sampleRate: 8000, channels: 2 },
          { bitsPerSample: 32 },
        );
        const back = audio.readWav(bytes);
        console.log("channels", back.channels);
        console.log("samples", back.samples.length);
        console.log("equal", back.samples.every((v, i) => v === samples[i]));
      `,
    );
    expect(stdout).toBe(["channels 2", "samples 8", "equal true"].join("\n"));
    expect(exitCode).toBe(0);
  });
});

describe("para:audio — lowpass", () => {
  it("attenuates a high-frequency tone, preserves a low-frequency one", async () => {
    // Mix a 200 Hz sine and a 4000 Hz sine at 16000 Hz sample rate.
    // Lowpass at 1000 Hz should crush the 4 kHz component but pass the
    // 200 Hz one. (Important: 4000 Hz at 8 kHz would be Nyquist —
    // sin(πi) = 0 — so we sample at 16 kHz to avoid aliasing.)
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-lowpass",
      `
        import audio from "para:audio";
        const sr = 16000, N = 4096;
        const sig = new Float32Array(N);
        for (let i = 0; i < N; i++) {
          sig[i] = 0.5 * Math.sin(2 * Math.PI * 200 * i / sr)
                 + 0.5 * Math.sin(2 * Math.PI * 4000 * i / sr);
        }
        const lp = audio.lowpass(sig, { cutoff: 1000, sampleRate: sr });

        // Check spectral content via FFT.
        function magAt(samples, freq) {
          const f = audio.fft(samples);
          const bin = Math.round(freq * samples.length / sr);
          return Math.hypot(f[bin*2], f[bin*2+1]);
        }
        const mLow_in = magAt(sig, 200);
        const mHi_in  = magAt(sig, 4000);
        const mLow_out = magAt(lp, 200);
        const mHi_out  = magAt(lp, 4000);

        // Low-frequency component preserved (within 30%) — biquad has some
        // passband ripple even for Butterworth.
        console.log("lowPreserved", mLow_out / mLow_in > 0.7);
        // High-frequency component crushed (>10× attenuation).
        console.log("highKilled", mHi_out / mHi_in < 0.1);
      `,
    );
    expect(stdout).toBe(["lowPreserved true", "highKilled true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("rejects out-of-range cutoff", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-lowpass-bad-cutoff",
      `
        import audio from "para:audio";
        try {
          audio.lowpass(new Float32Array(64), { cutoff: 10000, sampleRate: 8000 });
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.message.includes("sampleRate / 2"));
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });
});

describe("para:audio — highpass", () => {
  it("kills a low tone, passes a high one", async () => {
    // 200 Hz + 4 kHz mix at 16 kHz, highpass at 1 kHz: 200 should be
    // crushed, 4 kHz should survive.
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-highpass",
      `
        import audio from "para:audio";
        const sr = 16000, N = 4096;
        const sig = new Float32Array(N);
        for (let i = 0; i < N; i++) {
          sig[i] = 0.5 * Math.sin(2 * Math.PI * 200 * i / sr)
                 + 0.5 * Math.sin(2 * Math.PI * 4000 * i / sr);
        }
        const hp = audio.highpass(sig, { cutoff: 1000, sampleRate: sr });
        function magAt(samples, freq) {
          const f = audio.fft(samples);
          const bin = Math.round(freq * samples.length / sr);
          return Math.hypot(f[bin*2], f[bin*2+1]);
        }
        const mLow_in  = magAt(sig, 200);
        const mLow_out = magAt(hp, 200);
        const mHi_in   = magAt(sig, 4000);
        const mHi_out  = magAt(hp, 4000);
        console.log("lowKilled",     mLow_out / mLow_in < 0.1);
        console.log("highPreserved", mHi_out / mHi_in > 0.7);
      `,
    );
    expect(stdout).toBe(["lowKilled true", "highPreserved true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("removes DC offset", async () => {
    // Constant DC offset = 0 Hz content. A highpass should reduce it
    // toward zero. (Steady-state DC gain of a properly normalized HP
    // biquad is exactly 0.)
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-highpass-dc",
      `
        import audio from "para:audio";
        const sr = 16000, N = 4096;
        const sig = new Float32Array(N);
        for (let i = 0; i < N; i++) sig[i] = 0.5;          // pure DC
        const hp = audio.highpass(sig, { cutoff: 80, sampleRate: sr });
        // Average of the steady-state tail should be near zero (the
        // initial transient takes some samples to die out).
        let sum = 0;
        for (let i = N / 2; i < N; i++) sum += hp[i];
        const mean = sum / (N / 2);
        console.log("dcGone", Math.abs(mean) < 0.01);
      `,
    );
    expect(stdout).toBe("dcGone true");
    expect(exitCode).toBe(0);
  });
});

describe("para:audio — bandpass", () => {
  it("isolates the center band — kills tones above and below", async () => {
    // 100 Hz + 1000 Hz + 8 kHz triple-tone mix at 32 kHz. Bandpass
    // centered at 1 kHz with Q=2 should keep the middle, kill both ends.
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-bandpass",
      `
        import audio from "para:audio";
        const sr = 32000, N = 4096;
        const sig = new Float32Array(N);
        for (let i = 0; i < N; i++) {
          sig[i] = (1/3) * (
            Math.sin(2 * Math.PI * 100  * i / sr) +
            Math.sin(2 * Math.PI * 1000 * i / sr) +
            Math.sin(2 * Math.PI * 8000 * i / sr)
          );
        }
        const bp = audio.bandpass(sig, { center: 1000, Q: 2, sampleRate: sr });
        function magAt(samples, freq) {
          const f = audio.fft(samples);
          const bin = Math.round(freq * samples.length / sr);
          return Math.hypot(f[bin*2], f[bin*2+1]);
        }
        const mLow  = magAt(bp, 100);
        const mMid  = magAt(bp, 1000);
        const mHi   = magAt(bp, 8000);
        // Center bin should dominate by at least 3×; flanking bands suppressed.
        console.log("midDominates", mMid > mLow * 3 && mMid > mHi * 3);
      `,
    );
    expect(stdout).toBe("midDominates true");
    expect(exitCode).toBe(0);
  });
});

describe("para:audio — notch", () => {
  it("kills a single offending frequency, leaves others intact", async () => {
    // FFT bins don't fall exactly on 60 Hz at sr=16k/N=4096, so use the
    // time domain instead: feed a pure 60 Hz tone, measure RMS in the
    // settled tail. A notch at 60 Hz should reduce its RMS to near zero.
    // Then verify a 1 kHz tone survives the same filter unscathed.
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-notch",
      `
        import audio from "para:audio";
        const sr = 16000, N = 4096;
        function pureTone(freq) {
          const a = new Float32Array(N);
          for (let i = 0; i < N; i++) a[i] = 0.5 * Math.sin(2 * Math.PI * freq * i / sr);
          return a;
        }
        function tailRms(buf) {
          // Skip the initial transient; measure the steady state.
          let sum = 0;
          for (let i = N / 2; i < N; i++) sum += buf[i] * buf[i];
          return Math.sqrt(sum / (N / 2));
        }
        const hum  = pureTone(60);
        const tone = pureTone(1000);
        // Q=10 is wide enough that the IIR transient settles inside 4096
        // samples; Q=30 is a tighter notch but takes ~0.5s to fully settle.
        const humOut  = audio.notch(hum,  { center: 60, Q: 10, sampleRate: sr });
        const toneOut = audio.notch(tone, { center: 60, Q: 10, sampleRate: sr });
        console.log("humKilled",      tailRms(humOut)  / tailRms(hum)  < 0.1);
        console.log("speechSurvives", tailRms(toneOut) / tailRms(tone) > 0.95);
      `,
    );
    expect(stdout).toBe(["humKilled true", "speechSurvives true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("rejects bad Q", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-notch-bad-q",
      `
        import audio from "para:audio";
        try {
          audio.notch(new Float32Array(64), { center: 60, Q: 0, sampleRate: 16000 });
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.message.includes("Q"));
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });
});

describe("para:audio — resample", () => {
  it("identity (from === to) returns a copy of the input", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-resample-identity",
      `
        import audio from "para:audio";
        const samples = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
        const out = audio.resample(samples, { from: 48000, to: 48000 });
        console.log("len", out.length);
        console.log("equal", samples.every((v, i) => v === out[i]));
        // Must be a copy, not the same buffer (caller might mutate).
        console.log("sameBuffer", samples.buffer === out.buffer);
      `,
    );
    expect(stdout).toBe(["len 5", "equal true", "sameBuffer false"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("upsample 2× produces 2× the samples", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-resample-up",
      `
        import audio from "para:audio";
        const samples = new Float32Array(1000);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.sin(i * 0.1);
        const out = audio.resample(samples, { from: 8000, to: 16000 });
        console.log("len", out.length);
      `,
    );
    expect(stdout).toBe("len 2000");
    expect(exitCode).toBe(0);
  });

  it("downsample 48 kHz → 16 kHz produces 1/3 the samples", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-resample-down",
      `
        import audio from "para:audio";
        const samples = new Float32Array(48000);  // 1 second at 48 kHz
        for (let i = 0; i < samples.length; i++) samples[i] = Math.sin(2 * Math.PI * 200 * i / 48000);
        const out = audio.resample(samples, { from: 48000, to: 16000 });
        console.log("len", out.length);
      `,
    );
    expect(stdout).toBe("len 16000");
    expect(exitCode).toBe(0);
  });

  it("downsample preserves a sub-Nyquist tone (within passband)", async () => {
    // 200 Hz is well under both sample rates' Nyquist; should survive
    // 48 kHz → 16 kHz with most of its energy intact.
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-resample-preserves-tone",
      `
        import audio from "para:audio";
        const sr1 = 48000, sr2 = 16000, N = 48000;
        const samples = new Float32Array(N);
        for (let i = 0; i < N; i++) samples[i] = Math.sin(2 * Math.PI * 200 * i / sr1);
        const down = audio.resample(samples, { from: sr1, to: sr2 });

        function magAt(samples, freq, sr) {
          // Snap N to a power of 2 the FFT can handle.
          const fftN = 1 << (31 - Math.clz32(samples.length));
          const buf = samples.subarray(0, fftN);
          const f = audio.fft(buf);
          const bin = Math.round(freq * fftN / sr);
          return Math.hypot(f[bin*2], f[bin*2+1]);
        }
        const mIn = magAt(samples, 200, sr1);
        const mOut = magAt(down, 200, sr2);
        // Ratio should account for length difference (3× shorter output)
        const ratio = mOut / (mIn / 3);
        // Linear interpolation has some passband ripple; allow 30%.
        console.log("preserved", ratio > 0.7);
      `,
    );
    expect(stdout).toBe("preserved true");
    expect(exitCode).toBe(0);
  });

  it("downsample anti-aliases content above the new Nyquist", async () => {
    // A 6 kHz tone in a 48 kHz signal should be heavily attenuated when
    // we downsample to 16 kHz (Nyquist 8 kHz — the tone is in-band, but
    // a 12 kHz tone at 48 kHz wouldn't survive a 16 kHz target). Test
    // the latter case to verify the anti-alias filter actually runs.
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-resample-antialias",
      `
        import audio from "para:audio";
        const sr1 = 48000, sr2 = 16000, N = 48000;
        const samples = new Float32Array(N);
        // 12 kHz tone — above the 16 kHz target's 8 kHz Nyquist.
        for (let i = 0; i < N; i++) samples[i] = Math.sin(2 * Math.PI * 12000 * i / sr1);
        const down = audio.resample(samples, { from: sr1, to: sr2 });

        // The energy of "down" should be dramatically smaller than the
        // input — the 12 kHz tone gets killed by the anti-alias filter.
        let inEnergy = 0, outEnergy = 0;
        for (let i = 0; i < samples.length; i++) inEnergy += samples[i] ** 2;
        for (let i = 0; i < down.length; i++) outEnergy += down[i] ** 2;
        // Account for length difference (3× shorter output is naturally smaller).
        const ratio = outEnergy / (inEnergy / 3);
        console.log("attenuated", ratio < 0.05);
      `,
    );
    expect(stdout).toBe("attenuated true");
    expect(exitCode).toBe(0);
  });

  it("rejects non-positive sample rates", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-resample-bad-rate",
      `
        import audio from "para:audio";
        try {
          audio.resample(new Float32Array(64), { from: 0, to: 16000 });
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.message.includes("from must be > 0"));
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });
});

describe("para:audio — Denoiser (rnnoise)", () => {
  it("processes a 480-sample frame and returns a probability in [0, 1]", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-denoise-basic",
      `
        import audio from "para:audio";
        const den = new audio.Denoiser();
        const frame = new Float32Array(audio.Denoiser.FRAME_SIZE);
        // White-ish noise — should produce a low voice probability
        for (let i = 0; i < frame.length; i++) frame[i] = (Math.random() - 0.5) * 0.1;
        const prob = den.process(frame);
        den.close();
        console.log("FRAME_SIZE", audio.Denoiser.FRAME_SIZE);
        console.log("SAMPLE_RATE", audio.Denoiser.SAMPLE_RATE);
        console.log("inRange", prob >= 0 && prob <= 1);
      `,
    );
    expect(stdout).toBe(["FRAME_SIZE 480", "SAMPLE_RATE 48000", "inRange true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("attenuates noise — output RMS smaller than input RMS for a noise-only frame", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-denoise-attenuate",
      `
        import audio from "para:audio";
        const den = new audio.Denoiser();

        // White noise at moderate amplitude. The RNN warm-up takes a few
        // frames to stabilize, so feed several silent-noise frames first
        // and only measure the last one.
        const frameSize = audio.Denoiser.FRAME_SIZE;
        let inEnergy = 0, outEnergy = 0;
        for (let f = 0; f < 20; f++) {
          const frame = new Float32Array(frameSize);
          for (let i = 0; i < frameSize; i++) frame[i] = (Math.random() - 0.5) * 0.1;
          const inSqr = frame.reduce((s, x) => s + x * x, 0);
          den.process(frame);
          const outSqr = frame.reduce((s, x) => s + x * x, 0);
          if (f >= 15) {  // post-warmup
            inEnergy += inSqr;
            outEnergy += outSqr;
          }
        }
        den.close();
        // RNN should reduce noise energy by at least 30%
        const ratio = outEnergy / inEnergy;
        console.log("attenuated", ratio < 0.7);
      `,
    );
    expect(stdout).toBe("attenuated true");
    expect(exitCode).toBe(0);
  });

  it("rejects wrong frame size with a clear error", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-denoise-bad-frame",
      `
        import audio from "para:audio";
        const den = new audio.Denoiser();
        try {
          den.process(new Float32Array(320));  // 10 ms at 16 kHz, not 480
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.message.includes("must be exactly 480"));
        }
        den.close();
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });

  it("close() is idempotent and process throws after close", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-denoise-close",
      `
        import audio from "para:audio";
        const den = new audio.Denoiser();
        den.close();
        try {
          den.process(new Float32Array(480));
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.message.includes("closed"));
        }
        den.close();  // idempotent
        console.log("idempotent ok");
      `,
    );
    expect(stdout).toBe(["THREW true", "idempotent ok"].join("\n"));
    expect(exitCode).toBe(0);
  });
});

describe("para:audio — VAD (voice activity detection)", () => {
  it("classifies pure silence as non-speech", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-vad-silence",
      `
        import audio from "para:audio";
        const samples = new Float32Array(48000);  // 1 s at 48 kHz, all zeros
        const { energies, speech } = audio.detectVoice(samples, { frameSize: 480 });
        console.log("frames", energies.length);
        console.log("anySpeech", speech.some(s => s));
      `,
    );
    expect(stdout).toBe(["frames 100", "anySpeech false"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("classifies a loud burst after silence as speech", async () => {
    // A pure tone after a silent intro: the silence establishes the noise
    // floor, then the loud region is classified as speech. (A *sustained*
    // tone with no silence anywhere can't be classified — VAD needs a
    // baseline to compare against; that's a documented limit of the
    // sliding-window-minimum design.)
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-vad-burst",
      `
        import audio from "para:audio";
        const N = 48000, silentTo = N / 4;  // 250 ms silence + 750 ms loud
        const samples = new Float32Array(N);
        // Tiny background noise so noise floor settles non-zero
        for (let i = 0; i < silentTo; i++) samples[i] = (Math.random() - 0.5) * 0.001;
        for (let i = silentTo; i < N; i++) samples[i] = 0.5 * Math.sin(2 * Math.PI * 440 * i / 48000);

        const { speech } = audio.detectVoice(samples, { frameSize: 480 });
        const burstStartFrame = Math.ceil(silentTo / 480);
        const burstFrames = speech.slice(burstStartFrame);
        const fraction = burstFrames.filter(s => s).length / burstFrames.length;
        console.log("burstFraction.gt.0.95", fraction > 0.95);
      `,
    );
    expect(stdout).toBe("burstFraction.gt.0.95 true");
    expect(exitCode).toBe(0);
  });

  it("distinguishes silent vs loud regions in a mixed signal", async () => {
    // First half silent (with tiny noise floor), second half loud tone.
    // Speech labels should track the boundary roughly.
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-vad-mixed",
      `
        import audio from "para:audio";
        const N = 48000, half = N / 2;
        const samples = new Float32Array(N);
        // Tiny background noise so the noise floor is non-zero
        for (let i = 0; i < N; i++) samples[i] = (Math.random() - 0.5) * 0.001;
        // Loud tone in second half
        for (let i = half; i < N; i++) samples[i] = 0.5 * Math.sin(2 * Math.PI * 440 * i / 48000);

        const { speech, energies } = audio.detectVoice(samples, { frameSize: 480 });
        const nFrames = speech.length;
        const halfFrames = nFrames / 2;
        // Count speech frames in each half
        let silentHalfSpeech = 0, loudHalfSpeech = 0;
        for (let i = 0; i < halfFrames; i++) if (speech[i]) silentHalfSpeech++;
        for (let i = halfFrames; i < nFrames; i++) if (speech[i]) loudHalfSpeech++;
        console.log("silentHalf.lt.5", silentHalfSpeech < 5);
        console.log("loudHalf.gt.40", loudHalfSpeech > 40);
      `,
    );
    expect(stdout).toBe(["silentHalf.lt.5 true", "loudHalf.gt.40 true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("noiseFloor field exposes the final estimate", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-vad-noisefloor",
      `
        import audio from "para:audio";
        const samples = new Float32Array(4800);  // pure silence
        const { noiseFloor } = audio.detectVoice(samples, { frameSize: 480 });
        // Pure silence → noise floor should be 0 (or very close).
        console.log("nearZero", noiseFloor < 1e-6);
      `,
    );
    expect(stdout).toBe("nearZero true");
    expect(exitCode).toBe(0);
  });

  it("rejects invalid options", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-vad-bad-opts",
      `
        import audio from "para:audio";
        let n = 0;
        function check(fn, msg) {
          try { fn(); } catch (e) { if (e.message.includes(msg)) n++; }
        }
        check(() => audio.detectVoice(new Float32Array(48), { frameSize: 0 }), "frameSize");
        check(() => audio.detectVoice(new Float32Array(48), { ratio: 0.5 }), "ratio");
        check(() => audio.detectVoice(new Float32Array(48), { noiseWindow: 0 }), "noiseWindow");
        console.log("rejected", n);
      `,
    );
    expect(stdout).toBe("rejected 3");
    expect(exitCode).toBe(0);
  });
});

describe("para:audio — MP3 decode (minimp3)", () => {
  // Tiny 0.05s MP3 of a 440 Hz sine at 22050 Hz / 32 kbps mono. Generated
  // via `ffmpeg -f lavfi -i sine=frequency=440:duration=0.05:sample_rate=22050
  // -ac 1 -ab 32k`. ID3 + LAME encoder header overhead means even short
  // clips weigh ~600 B.
  // prettier-ignore
  const MP3_HEX =
    "49443304000000000023545353450000000f0000034c61766636302e31362e3130300000000000000000000000fff370c0000000000000000000496e666f0000000f0000000400000258007a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7aa6a6a6a6a6a6a6a6a6a6a6a6a6a6a6a6a6a6a6a6a6a6a6a6a6d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3ffffffffffffffffffffffffffffffffffffffffffffffffff000000004c61766336302e333100000000000000000000000024027100000000000002583864b62a00000000000000000000000000fff340c400133062843f4f18000bd6dbb60879a6699a669a1ee6c08610710b01dc02300ec15638ceb6778f1e3c78f01004c1f07c1fe7383fe1894f7f29e7f94f3fca7bfa38200f83ef07c1c04030a0c03e0fcb81010e0fbf47bd200920830c0000bcc0203693f726fff342c40e17f1727cd59c6800e2631181829f6d60ca02e280a18aa6c69d06182c18256a540649083920e90574159fc4982f4176fc768c28c293bfc6186189a3d47affe645e248c4ba5d4bfff2f178c4ba5d48bc5e3bfe54240d094240d0955c0002c14028180c0502fff340c40a16e9ae95bf9aa00000001f046daa18a145dd68201d94e6546838b992be19321f1f0b0b07688476c0d20c06f280513ed8a544a66dfe2772385c045bff16422380b241ffff2e917513e709c32ffffcd268b371397fff902082694a16e000449952271728fff342c40916b8aa6417d83001bc4c9960400734252b96040813104b42b55b117080204c1903b4e5394ff4bbb54e24492e68280402939a448cb82417c2828d0a0ae833fc1415e0a2bedfe1415e14779bfe0a0be0a6f0eff0a0af0a7f4dff8b4c414d45332e31303055";

  const mp3Setup = `const MP3 = Uint8Array.from("${MP3_HEX}".match(/../g).map(h => parseInt(h, 16)));`;

  it("decodes an MP3 to Float32Array samples + matching metadata", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-mp3-shape",
      `
        import audio from "para:audio";
        ${mp3Setup}
        const { samples, sampleRate, channels } = audio.decodeMp3(MP3);
        console.log("isFloat32", samples instanceof Float32Array);
        console.log("rate", sampleRate);
        console.log("channels", channels);
        // 0.05s × 22050 Hz = 1102 samples (rounded). MP3 frame boundaries
        // can over-deliver slightly; assert >= expected.
        console.log("samples.gte", samples.length >= 1024);
      `,
    );
    expect(stdout).toBe(["isFloat32 true", "rate 22050", "channels 1", "samples.gte true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("decoded samples preserve the dominant 440 Hz tone", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-mp3-tone",
      `
        import audio from "para:audio";
        ${mp3Setup}
        const { samples, sampleRate } = audio.decodeMp3(MP3);

        // Take a power-of-2 window and find the dominant FFT bin. The
        // 440 Hz tone should land in bin round(440 * 1024 / 22050) ≈ 20.
        const fftN = 1024;
        const buf = samples.subarray(0, fftN);
        const f = audio.fft(buf);
        let best = 0, idx = 0;
        for (let i = 0; i < fftN / 2; i++) {
          const m = Math.hypot(f[i*2], f[i*2+1]);
          if (m > best) { best = m; idx = i; }
        }
        const expectedBin = Math.round(440 * fftN / sampleRate);
        // ±2 bin tolerance for FFT quantization + MP3 lossy compression
        console.log("withinTwoBins", Math.abs(idx - expectedBin) <= 2);
      `,
    );
    expect(stdout).toBe("withinTwoBins true");
    expect(exitCode).toBe(0);
  });

  it("rejects non-MP3 input", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-mp3-bad",
      `
        import audio from "para:audio";
        try {
          audio.decodeMp3(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
          console.log("NO_THROW");
        } catch (e) {
          console.log(
            "THREW",
            e.message.includes("not a valid MP3") || e.message.includes("zero samples"),
          );
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });

  it("rejects non-Uint8Array input", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-mp3-bad-type",
      `
        import audio from "para:audio";
        try {
          audio.decodeMp3("not bytes");
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.message.includes("expected Uint8Array"));
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });
});

describe("para:audio — Opus codec", () => {
  it("encode → decode round-trip preserves the dominant frequency", async () => {
    // 16 kHz, 20 ms frame = 320 samples. Encode a 200 Hz sine, decode
    // it, verify the dominant FFT bin survived. Opus is lossy, so we
    // don't byte-compare; we check that the dominant tone's bin stays
    // the same through the codec.
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-opus-roundtrip",
      `
        import audio from "para:audio";
        const sr = 16000, frameSize = 320, freq = 200;
        const samples = new Float32Array(frameSize);
        for (let i = 0; i < frameSize; i++) samples[i] = 0.5 * Math.sin(2 * Math.PI * freq * i / sr);

        const enc = new audio.OpusEncoder({ sampleRate: sr, channels: 1, bitrate: 32000 });
        const packet = enc.encode(samples, frameSize);
        enc.close();
        console.log("packetIsUint8", packet instanceof Uint8Array);
        console.log("packetLen.gt.0", packet.length > 0);

        const dec = new audio.OpusDecoder({ sampleRate: sr, channels: 1 });
        const decoded = dec.decode(packet, frameSize);
        dec.close();
        console.log("decodedLen", decoded.length);

        // Find the dominant bin in both. They should match (Opus
        // preserves dominant frequency, just with some compression loss).
        function dominantBin(buf) {
          // Pad to power of 2 for FFT.
          const fftN = 256;
          const padded = new Float32Array(fftN);
          padded.set(buf.subarray(0, fftN));
          const f = audio.fft(padded);
          let best = 0, idx = 0;
          for (let i = 0; i < fftN / 2; i++) {
            const m = Math.hypot(f[i*2], f[i*2+1]);
            if (m > best) { best = m; idx = i; }
          }
          return idx;
        }
        const inBin = dominantBin(samples);
        const outBin = dominantBin(decoded);
        console.log("inBin", inBin, "outBin", outBin);
        // ±1 tolerance for FFT bin quantization
        console.log("withinOneBin", Math.abs(inBin - outBin) <= 1);
      `,
    );
    expect(stdout).toBe(
      ["packetIsUint8 true", "packetLen.gt.0 true", "decodedLen 320", "inBin 3 outBin 3", "withinOneBin true"].join(
        "\n",
      ),
    );
    expect(exitCode).toBe(0);
  });

  it("encode produces a smaller packet than the raw samples", async () => {
    // 320 samples × 4 bytes = 1280 bytes raw. Opus at 32 kbps for 20 ms
    // = ~80 bytes per packet. Verify compression actually happened.
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-opus-compresses",
      `
        import audio from "para:audio";
        const sr = 16000, frameSize = 320;
        const samples = new Float32Array(frameSize);
        for (let i = 0; i < frameSize; i++) samples[i] = 0.5 * Math.sin(i * 0.1);
        const enc = new audio.OpusEncoder({ sampleRate: sr, channels: 1, bitrate: 32000 });
        const packet = enc.encode(samples, frameSize);
        enc.close();
        const rawBytes = frameSize * 4;
        console.log("raw", rawBytes);
        console.log("compressedSmaller", packet.length < rawBytes / 4);
      `,
    );
    expect(stdout).toBe(["raw 1280", "compressedSmaller true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("stereo encode + decode preserves channel count", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-opus-stereo",
      `
        import audio from "para:audio";
        const sr = 48000, frameSize = 960;  // 20 ms at 48 kHz
        const samples = new Float32Array(frameSize * 2);  // stereo interleaved
        for (let i = 0; i < frameSize; i++) {
          samples[i * 2]     = 0.4 * Math.sin(2 * Math.PI * 440 * i / sr);  // L
          samples[i * 2 + 1] = 0.4 * Math.sin(2 * Math.PI * 660 * i / sr);  // R
        }
        const enc = new audio.OpusEncoder({ sampleRate: sr, channels: 2 });
        const packet = enc.encode(samples, frameSize);
        enc.close();
        const dec = new audio.OpusDecoder({ sampleRate: sr, channels: 2 });
        const decoded = dec.decode(packet, frameSize);
        dec.close();
        console.log("decodedLen", decoded.length);
        // Stereo output is 2× frameSize floats.
        console.log("expectedLen", frameSize * 2);
      `,
    );
    expect(stdout).toBe(["decodedLen 1920", "expectedLen 1920"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("rejects invalid sample rate", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-opus-bad-rate",
      `
        import audio from "para:audio";
        try {
          new audio.OpusEncoder({ sampleRate: 44100, channels: 1 });
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.message.includes("8000, 12000, 16000, 24000, or 48000"));
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });

  it("close() makes subsequent calls throw a clear error", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-opus-after-close",
      `
        import audio from "para:audio";
        const enc = new audio.OpusEncoder({ sampleRate: 16000, channels: 1 });
        enc.close();
        try {
          enc.encode(new Float32Array(320), 320);
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.message.includes("closed"));
        }
        // close() is idempotent — second call must not throw.
        enc.close();
        console.log("idempotent ok");
      `,
    );
    expect(stdout).toBe(["THREW true", "idempotent ok"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("voice-call pipeline: 48 kHz mic → resample → Opus → decode → resample back", async () => {
    // The end-to-end pipeline lyku-class apps need: capture at 48 kHz,
    // downsample to 16 kHz for Opus, encode, transmit, decode on the
    // other end, optionally upsample back. Verify the dominant tone
    // survives the whole chain.
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-opus-pipeline",
      `
        import audio from "para:audio";
        const sr1 = 48000, sr2 = 16000;
        const N = 4800;  // 100 ms at 48 kHz
        const mic = new Float32Array(N);
        for (let i = 0; i < N; i++) mic[i] = 0.5 * Math.sin(2 * Math.PI * 440 * i / sr1);

        // Sender: downsample 48 → 16 kHz, encode 5 frames of 320 samples each
        const downsampled = audio.resample(mic, { from: sr1, to: sr2 });
        console.log("downsampledLen", downsampled.length);

        const enc = new audio.OpusEncoder({ sampleRate: sr2, channels: 1, bitrate: 32000 });
        const packets = [];
        for (let off = 0; off + 320 <= downsampled.length; off += 320) {
          packets.push(enc.encode(downsampled.subarray(off, off + 320), 320));
        }
        enc.close();
        console.log("packets", packets.length);

        // Receiver: decode each packet, upsample back to 48 kHz
        const dec = new audio.OpusDecoder({ sampleRate: sr2, channels: 1 });
        const decoded16k = new Float32Array(packets.length * 320);
        for (let i = 0; i < packets.length; i++) {
          const frame = dec.decode(packets[i], 320);
          decoded16k.set(frame, i * 320);
        }
        dec.close();
        const decoded48k = audio.resample(decoded16k, { from: sr2, to: sr1 });
        console.log("decoded48kLen", decoded48k.length);
      `,
    );
    expect(stdout).toBe(["downsampledLen 1600", "packets 5", "decoded48kLen 4800"].join("\n"));
    expect(exitCode).toBe(0);
  });
});

describe("para:audio — spectrogram", () => {
  it("produces frame count consistent with hop / window settings", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-spectrogram-shape",
      `
        import audio from "para:audio";
        const N = 4096, win = 512, hop = 256;
        const samples = new Float32Array(N);
        for (let i = 0; i < N; i++) samples[i] = Math.sin(i * 0.1);
        const spec = audio.spectrogram(samples, { window: win, hop });
        // Frames where (start + window) <= N. start = 0, hop, 2*hop, ...
        // Last valid start = N - win. Count = floor((N - win) / hop) + 1.
        const expected = Math.floor((N - win) / hop) + 1;
        console.log("frames", spec.length, "expected", expected);
        console.log("binsPerFrame", spec[0].length, "expectedBins", win/2 + 1);
      `,
    );
    expect(stdout).toBe(["frames 15 expected 15", "binsPerFrame 257 expectedBins 257"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("dominant bin in spectrogram tracks a frequency-swept signal", async () => {
    // Low-frequency tone at the start, high-frequency at the end. The
    // peak FFT bin per frame should grow over time.
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-spectrogram-sweep",
      `
        import audio from "para:audio";
        const sr = 8000, win = 512, hop = 128;
        const N = 4096;
        const sig = new Float32Array(N);
        for (let i = 0; i < N; i++) {
          const fHz = 200 + (i / N) * 1800;  // 200 → 2000 Hz over the buffer
          sig[i] = Math.sin(2 * Math.PI * fHz * i / sr);
        }
        const spec = audio.spectrogram(sig, { window: win, hop });
        function peakBin(mags) {
          let best = 0, idx = 0;
          for (let i = 0; i < mags.length; i++) if (mags[i] > best) { best = mags[i]; idx = i; }
          return idx;
        }
        const firstPeak = peakBin(spec[0]);
        const lastPeak  = peakBin(spec[spec.length - 1]);
        console.log("firstPeak<lastPeak", firstPeak < lastPeak);
      `,
    );
    expect(stdout).toBe("firstPeak<lastPeak true");
    expect(exitCode).toBe(0);
  });
});

describe("para:audio — interleave / deinterleave", () => {
  it("stereo round-trip: deinterleave then interleave reproduces input bit-exactly", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-interleave-roundtrip",
      `
        import audio from "para:audio";
        // 4 stereo frames: L=[1,2,3,4], R=[10,20,30,40] interleaved.
        const stereo = new Float32Array([1, 10, 2, 20, 3, 30, 4, 40]);
        const planes = audio.deinterleave(stereo, 2);
        console.log("nChannels", planes.length);
        console.log("L", Array.from(planes[0]).join(","));
        console.log("R", Array.from(planes[1]).join(","));
        const back = audio.interleave(planes);
        const equal = back.length === stereo.length && back.every((v, i) => v === stereo[i]);
        console.log("roundTripExact", equal);
      `,
    );
    expect(stdout).toBe(["nChannels 2", "L 1,2,3,4", "R 10,20,30,40", "roundTripExact true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("6-channel (5.1-style) layout works the same way", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-interleave-6ch",
      `
        import audio from "para:audio";
        // 2 frames × 6 channels. Frame 0: 0,1,2,3,4,5. Frame 1: 10,11,12,13,14,15.
        const interleaved = new Float32Array([0,1,2,3,4,5, 10,11,12,13,14,15]);
        const planes = audio.deinterleave(interleaved, 6);
        const sums = planes.map(p => p.reduce((a, b) => a + b, 0));
        // Channel c sums to c + (10+c) = 10 + 2c, so [10, 12, 14, 16, 18, 20].
        console.log("sums", sums.join(","));
        const back = audio.interleave(planes);
        const equal = back.length === interleaved.length && back.every((v, i) => v === interleaved[i]);
        console.log("roundTripExact", equal);
      `,
    );
    expect(stdout).toBe(["sums 10,12,14,16,18,20", "roundTripExact true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("mono is a passthrough copy on both functions", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-interleave-mono",
      `
        import audio from "para:audio";
        const m = new Float32Array([1, 2, 3, 4]);
        const planes = audio.deinterleave(m, 1);
        // Returns a *copy* — not the same buffer (so caller mutations don't leak).
        const sameRef = planes[0] === m;
        console.log("nChannels", planes.length);
        console.log("vals", Array.from(planes[0]).join(","));
        console.log("sameRef", sameRef);
        const back = audio.interleave(planes);
        const sameRefBack = back === planes[0];
        console.log("backVals", Array.from(back).join(","));
        console.log("backSameRef", sameRefBack);
      `,
    );
    expect(stdout).toBe(
      ["nChannels 1", "vals 1,2,3,4", "sameRef false", "backVals 1,2,3,4", "backSameRef false"].join("\n"),
    );
    expect(exitCode).toBe(0);
  });

  it("empty inputs return empty outputs", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-interleave-empty",
      `
        import audio from "para:audio";
        const a = audio.interleave([]);
        const b = audio.deinterleave(new Float32Array(0), 2);
        console.log("a.len", a.length, "ctor", a.constructor.name);
        console.log("b.len", b.length, "innerLens", b.map(x => x.length).join(","));
      `,
    );
    expect(stdout).toBe(["a.len 0 ctor Float32Array", "b.len 2 innerLens 0,0"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("interleave rejects mismatched channel lengths", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-interleave-mismatch",
      `
        import audio from "para:audio";
        try {
          audio.interleave([new Float32Array(4), new Float32Array(7)]);
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e instanceof RangeError);
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });

  it("deinterleave rejects samples.length not divisible by channelCount", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-deinterleave-bad-len",
      `
        import audio from "para:audio";
        try {
          // 7 samples can't divide cleanly into 2 channels.
          audio.deinterleave(new Float32Array(7), 2);
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e instanceof RangeError);
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });

  it("deinterleave rejects non-positive or non-integer channelCount", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-deinterleave-bad-count",
      `
        import audio from "para:audio";
        let threw = 0;
        try { audio.deinterleave(new Float32Array(8), 0); } catch { threw++; }
        try { audio.deinterleave(new Float32Array(8), -1); } catch { threw++; }
        try { audio.deinterleave(new Float32Array(8), 2.5); } catch { threw++; }
        console.log("threw", threw);
      `,
    );
    expect(stdout).toBe("threw 3");
    expect(exitCode).toBe(0);
  });

  it("composes naturally with mix to fold stereo down to mono", async () => {
    // A common use case: take an interleaved stereo stream, deinterleave to
    // L/R, then mix-with-equal-gain back down to mono. End result is the
    // average of L and R per frame.
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-interleave-fold",
      `
        import audio from "para:audio";
        const stereo = new Float32Array([0.4, 0.6, -0.5, 0.5, 0.9, 0.1]);
        const planes = audio.deinterleave(stereo, 2);
        const mono = audio.mix(planes, { gains: [0.5, 0.5], clip: "none" });
        // Expected: (0.4+0.6)/2=0.5,  (-0.5+0.5)/2=0,  (0.9+0.1)/2=0.5
        console.log(Array.from(mono).map(x => x.toFixed(2)).join(","));
      `,
    );
    expect(stdout).toBe("0.50,0.00,0.50");
    expect(exitCode).toBe(0);
  });
});

describe("para:audio — mix", () => {
  it("two tracks sum sample-wise", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-mix-basic",
      `
        import audio from "para:audio";
        const a = new Float32Array([0.1, 0.2, 0.3, 0.4]);
        const b = new Float32Array([0.5, 0.4, 0.3, 0.2]);
        const out = audio.mix([a, b]);
        // a + b clipped: 0.6, 0.6, 0.6, 0.6 — none exceed 1 so no clipping.
        console.log(Array.from(out).map(x => x.toFixed(4)).join(","));
      `,
    );
    expect(stdout).toBe("0.6000,0.6000,0.6000,0.6000");
    expect(exitCode).toBe(0);
  });

  it("hard-clips samples that exceed ±1", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-mix-hard",
      `
        import audio from "para:audio";
        const a = new Float32Array([0.8, -0.9, 0.0, 1.5]);
        const b = new Float32Array([0.6, -0.5,  0.3, 0.5]);
        // Sums: 1.4 (clip→1), -1.4 (clip→-1), 0.3 (passthrough), 2.0 (clip→1)
        const out = audio.mix([a, b]);
        console.log(Array.from(out).map(x => x.toFixed(4)).join(","));
      `,
    );
    expect(stdout).toBe("1.0000,-1.0000,0.3000,1.0000");
    expect(exitCode).toBe(0);
  });

  it("soft clip uses tanh saturation (smooth knee, never quite ±1)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-mix-soft",
      `
        import audio from "para:audio";
        // Mix two tracks each at 0.6 — sum is 1.2, well past hard-clip.
        const a = new Float32Array([0.6, 0.6, 0.6, 0.6]);
        const b = new Float32Array([0.6, 0.6, 0.6, 0.6]);
        const out = audio.mix([a, b], { clip: "soft" });
        // tanh(1.2) ≈ 0.8337
        const expected = Math.tanh(1.2);
        // tanh asymptotes to 1 but never reaches it — verify smoothness.
        const allBelowOne = out.every(v => v < 1);
        const matches = out.every(v => Math.abs(v - expected) < 1e-5);
        console.log("matches.tanh", matches);
        console.log("allBelowOne", allBelowOne);
      `,
    );
    expect(stdout).toBe(["matches.tanh true", "allBelowOne true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it('clip: "none" leaves the unclamped sum intact', async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-mix-none",
      `
        import audio from "para:audio";
        const a = new Float32Array([0.7, -0.7]);
        const b = new Float32Array([0.7, -0.7]);
        const out = audio.mix([a, b], { clip: "none" });
        // Should produce 1.4 / -1.4, unclamped.
        console.log(Array.from(out).map(x => x.toFixed(4)).join(","));
      `,
    );
    expect(stdout).toBe("1.4000,-1.4000");
    expect(exitCode).toBe(0);
  });

  it("per-track gains scale each input independently", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-mix-gains",
      `
        import audio from "para:audio";
        const a = new Float32Array([0.1, 0.2, 0.3]);
        const b = new Float32Array([0.5, 0.5, 0.5]);
        // a contributes ×2 = [0.2, 0.4, 0.6]; b contributes ×0.5 = [0.25, 0.25, 0.25].
        // Sum: 0.45, 0.65, 0.85.
        const out = audio.mix([a, b], { gains: [2, 0.5], clip: "none" });
        console.log(Array.from(out).map(x => x.toFixed(4)).join(","));
      `,
    );
    expect(stdout).toBe("0.4500,0.6500,0.8500");
    expect(exitCode).toBe(0);
  });

  it("a single track is just gain-scaled (or passthrough when gain=1)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-mix-single",
      `
        import audio from "para:audio";
        const a = new Float32Array([0.1, 0.2, 0.3]);
        const passthrough = audio.mix([a], { clip: "none" });
        const halved = audio.mix([a], { gains: [0.5], clip: "none" });
        console.log("pt", Array.from(passthrough).map(x => x.toFixed(4)).join(","));
        console.log("h",  Array.from(halved     ).map(x => x.toFixed(4)).join(","));
      `,
    );
    expect(stdout).toBe(["pt 0.1000,0.2000,0.3000", "h 0.0500,0.1000,0.1500"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("empty track list returns an empty Float32Array", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-mix-empty",
      `
        import audio from "para:audio";
        const out = audio.mix([]);
        console.log("len", out.length, "ctor", out.constructor.name);
      `,
    );
    expect(stdout).toBe("len 0 ctor Float32Array");
    expect(exitCode).toBe(0);
  });

  it("rejects mismatched track lengths", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-mix-len-mismatch",
      `
        import audio from "para:audio";
        try {
          audio.mix([new Float32Array(4), new Float32Array(8)]);
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e instanceof RangeError, e.message.includes("same length"));
        }
      `,
    );
    expect(stdout).toBe("THREW true true");
    expect(exitCode).toBe(0);
  });

  it("rejects gains length mismatch", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-mix-gains-mismatch",
      `
        import audio from "para:audio";
        try {
          audio.mix([new Float32Array(4), new Float32Array(4)], { gains: [1, 1, 1] });
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e instanceof RangeError);
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });

  it("rejects unknown clip mode", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-mix-bad-clip",
      `
        import audio from "para:audio";
        try {
          audio.mix([new Float32Array(4), new Float32Array(4)], { clip: "tape" });
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e instanceof TypeError);
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });
});

describe("para:audio — i16 ⇄ f32 PCM", () => {
  it("i16ToF32 maps the i16 limits to ±1 (mostly)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-i16-to-f32",
      `
        import audio from "para:audio";
        const input = new Int16Array([0, -32768, 32767, 16384, -16384]);
        const out = audio.i16ToF32(input);
        // -32768/32768 = -1 exactly; 32767/32768 ≈ 0.99997.
        console.log("ctor", out.constructor.name);
        console.log("zero", out[0]);
        console.log("min", out[1]);
        console.log("nearMax", Math.abs(out[2] - 0.99997) < 1e-4);
        console.log("half", out[3].toFixed(4));    // 16384/32768 = 0.5
        console.log("nhalf", out[4].toFixed(4));   // -16384/32768 = -0.5
      `,
    );
    expect(stdout).toBe(
      ["ctor Float32Array", "zero 0", "min -1", "nearMax true", "half 0.5000", "nhalf -0.5000"].join("\n"),
    );
    expect(exitCode).toBe(0);
  });

  it("f32ToI16 hits the i16 limits at ±1", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-f32-to-i16",
      `
        import audio from "para:audio";
        const input = new Float32Array([0, 1, -1, 0.5, -0.5]);
        const out = audio.f32ToI16(input);
        console.log("ctor", out.constructor.name);
        console.log(Array.from(out).join(","));
      `,
    );
    // 0 → 0. 1 * 32767 = 32767. -1 * 32768 = -32768.
    // 0.5 * 32767 = 16383.5 → round → 16384.
    // -0.5 * 32768 = -16384.
    expect(stdout).toBe(["ctor Int16Array", "0,32767,-32768,16384,-16384"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("f32ToI16 clamps out-of-range inputs to the i16 limits", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-f32-to-i16-clip",
      `
        import audio from "para:audio";
        const input = new Float32Array([2.0, -2.0, 1.5, -1.5]);
        const out = audio.f32ToI16(input);
        console.log(Array.from(out).join(","));
      `,
    );
    expect(stdout).toBe("32767,-32768,32767,-32768");
    expect(exitCode).toBe(0);
  });

  it("round-trip f32 → i16 → f32 stays within 1/32768 (one-LSB) of input", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-pcm-roundtrip",
      `
        import audio from "para:audio";
        // 1024 random-ish samples in [-1, 1] via a simple LCG.
        const N = 1024;
        const orig = new Float32Array(N);
        let s = 1;
        for (let i = 0; i < N; i++) {
          s = (Math.imul(s, 1103515245) + 12345) >>> 0;
          orig[i] = ((s >>> 0) / 0x100000000) * 2 - 1;  // [-1, 1)
        }
        const back = audio.i16ToF32(audio.f32ToI16(orig));
        let maxErr = 0;
        for (let i = 0; i < N; i++) {
          const e = Math.abs(back[i] - orig[i]);
          if (e > maxErr) maxErr = e;
        }
        // 1 LSB = 1/32768 ≈ 3.05e-5. Allow a touch more for the
        // asymmetric quantizer to round trip cleanly.
        console.log("withinLsb", maxErr < 1.5 / 32768);
      `,
    );
    expect(stdout).toBe("withinLsb true");
    expect(exitCode).toBe(0);
  });

  it("rejects mismatched typed-array kinds", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-pcm-bad",
      `
        import audio from "para:audio";
        let threw = 0;
        try { audio.i16ToF32(new Float32Array(4)); } catch { threw++; }
        try { audio.i16ToF32([1, 2, 3]); } catch { threw++; }
        try { audio.f32ToI16(new Int16Array(4)); } catch { threw++; }
        try { audio.f32ToI16([0.1, 0.2]); } catch { threw++; }
        console.log("threw", threw);
      `,
    );
    expect(stdout).toBe("threw 4");
    expect(exitCode).toBe(0);
  });
});

describe("para:audio — envelope", () => {
  it("constant input → constant envelope (peak mode)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-env-constant",
      `
        import audio from "para:audio";
        const input = new Float32Array(4096).fill(0.5);
        const env = audio.envelope(input, { windowSize: 1024 });
        // Expect 4 windows of all 0.5.
        console.log("len", env.length);
        console.log("allHalf", env.every(v => v === 0.5));
      `,
    );
    expect(stdout).toBe(["len 4", "allHalf true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("RMS envelope of a sine wave equals amplitude / sqrt(2)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-env-rms-sine",
      `
        import audio from "para:audio";
        const SR = 16000, N = 4096;
        const input = new Float32Array(N);
        for (let i = 0; i < N; i++) input[i] = 0.5 * Math.sin(2 * Math.PI * 1000 * i / SR);
        const env = audio.envelope(input, { windowSize: 512, mode: "rms" });
        const expected = 0.5 / Math.sqrt(2);
        // Average across windows — drift from non-integer cycles per window.
        let sum = 0;
        for (const v of env) sum += v;
        const avg = sum / env.length;
        console.log("close", Math.abs(avg - expected) / expected < 0.02);
      `,
    );
    expect(stdout).toBe("close true");
    expect(exitCode).toBe(0);
  });

  it("envelope traces an attack-release curve", async () => {
    // Build a buffer that ramps up to 0.9 then decays back to 0.
    // The envelope should follow that shape — first windows quiet,
    // middle windows loud, end windows quiet again.
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-env-shape",
      `
        import audio from "para:audio";
        const N = 8192;
        const input = new Float32Array(N);
        for (let i = 0; i < N; i++) {
          const t = i / N;
          // Triangular envelope peaking at t=0.5 with amp=0.9.
          const a = 0.9 * (1 - Math.abs(2 * t - 1));
          input[i] = a * Math.sin(2 * Math.PI * 1000 * i / 16000);
        }
        const env = audio.envelope(input, { windowSize: 512 });
        // First and last quarter of windows should be much quieter than
        // the middle quarter.
        const firstQ = env.slice(0, env.length >> 2);
        const lastQ = env.slice(-(env.length >> 2));
        const midQ = env.slice(env.length >> 2, 3 * (env.length >> 2));
        const max = arr => arr.reduce((m, v) => v > m ? v : m, 0);
        console.log("midLouderThanFirst", max(midQ) > max(firstQ) * 1.5);
        console.log("midLouderThanLast",  max(midQ) > max(lastQ)  * 1.5);
      `,
    );
    expect(stdout).toBe(["midLouderThanFirst true", "midLouderThanLast true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("hopSize < windowSize gives an oversampled envelope", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-env-hop",
      `
        import audio from "para:audio";
        const input = new Float32Array(4096).fill(0.5);
        const noOverlap = audio.envelope(input, { windowSize: 1024, hopSize: 1024 });
        const halfOverlap = audio.envelope(input, { windowSize: 1024, hopSize: 512 });
        // With windowSize=1024 over 4096 samples:
        //   non-overlapping: 4 windows
        //   half-overlapping: floor((4096 - 1024) / 512) + 1 = 7 windows
        console.log("non", noOverlap.length, "half", halfOverlap.length);
      `,
    );
    expect(stdout).toBe("non 4 half 7");
    expect(exitCode).toBe(0);
  });

  it("input shorter than windowSize → empty envelope", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-env-too-short",
      `
        import audio from "para:audio";
        const env = audio.envelope(new Float32Array(100), { windowSize: 1024 });
        console.log("len", env.length, "ctor", env.constructor.name);
      `,
    );
    expect(stdout).toBe("len 0 ctor Float32Array");
    expect(exitCode).toBe(0);
  });

  it("rejects bad windowSize / hopSize / mode", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-env-bad-args",
      `
        import audio from "para:audio";
        const input = new Float32Array(2048);
        let threw = 0;
        for (const o of [
          { windowSize: 0 },
          { windowSize: -1 },
          { windowSize: 1.5 },
          { windowSize: 1024, hopSize: 0 },
          { windowSize: 1024, mode: "linear" },
        ]) {
          try { audio.envelope(input, o); } catch { threw++; }
        }
        console.log("threw", threw);
      `,
    );
    expect(stdout).toBe("threw 5");
    expect(exitCode).toBe(0);
  });
});

describe("para:audio — peak / rms", () => {
  it("peak returns the largest absolute sample", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-peak-basic",
      `
        import audio from "para:audio";
        const input = new Float32Array([0.1, -0.2, 0.4, -0.05, 0.3, -0.7, 0.6]);
        console.log("peak", audio.peak(input).toFixed(4));
      `,
    );
    expect(stdout).toBe("peak 0.7000");
    expect(exitCode).toBe(0);
  });

  it("rms of a sine wave equals amplitude / sqrt(2)", async () => {
    // Standard result for a pure sine: rms = amp / √2. With amp=0.5 → ~0.3535.
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-rms-sine",
      `
        import audio from "para:audio";
        const SR = 16000, N = 4096;
        const input = new Float32Array(N);
        for (let i = 0; i < N; i++) input[i] = 0.5 * Math.sin(2 * Math.PI * 1000 * i / SR);
        const got = audio.rms(input);
        const expected = 0.5 / Math.sqrt(2);
        // Within 0.5% — small drift is from the buffer not being exactly
        // an integer number of cycles.
        console.log("rmsClose", Math.abs(got - expected) / expected < 0.005);
      `,
    );
    expect(stdout).toBe("rmsClose true");
    expect(exitCode).toBe(0);
  });

  it("empty buffer: peak = 0, rms = 0", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-empty",
      `
        import audio from "para:audio";
        const empty = new Float32Array(0);
        console.log("peak", audio.peak(empty));
        console.log("rms",  audio.rms(empty));
      `,
    );
    expect(stdout).toBe(["peak 0", "rms 0"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("silent buffer: both are exactly 0", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-silent",
      `
        import audio from "para:audio";
        const silent = new Float32Array(1024);
        console.log("peak", audio.peak(silent));
        console.log("rms",  audio.rms(silent));
      `,
    );
    expect(stdout).toBe(["peak 0", "rms 0"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("rejects non-Float32Array input", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-peak-rms-bad",
      `
        import audio from "para:audio";
        let threw = 0;
        try { audio.peak([1, 2, 3]); } catch { threw++; }
        try { audio.rms([1, 2, 3]); } catch { threw++; }
        try { audio.peak(new Float64Array([1, 2, 3])); } catch { threw++; }
        try { audio.rms(new Float64Array([1, 2, 3])); } catch { threw++; }
        console.log("threw", threw);
      `,
    );
    expect(stdout).toBe("threw 4");
    expect(exitCode).toBe(0);
  });

  it("composes naturally with normalize: peak after normalize matches target", async () => {
    // The whole point of normalize is to drive peak to a known value.
    // Verify the round-trip: normalize to 0.7, then audio.peak() should
    // come back as ~0.7.
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-peak-after-normalize",
      `
        import audio from "para:audio";
        const input = new Float32Array([0.1, -0.2, 0.4, -0.05, 0.3]);
        const normed = audio.normalize(input, { target: 0.7, mode: "peak" });
        const got = audio.peak(normed);
        console.log("peakClose", Math.abs(got - 0.7) < 1e-5);
      `,
    );
    expect(stdout).toBe("peakClose true");
    expect(exitCode).toBe(0);
  });
});

describe("para:audio — normalize", () => {
  it("peak mode brings max(|x|) exactly to the target", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-norm-peak",
      `
        import audio from "para:audio";
        const input = new Float32Array([0.1, -0.2, 0.4, -0.05, 0.3]);
        const out = audio.normalize(input, { target: 0.9, mode: "peak" });
        let maxAbs = 0;
        for (const v of out) if (Math.abs(v) > maxAbs) maxAbs = Math.abs(v);
        // Within float-rounding of 0.9.
        console.log("peakClose", Math.abs(maxAbs - 0.9) < 1e-5);
        // Quiet sections still proportionally quiet — original 0.05 was
        // 1/8 of the peak, output should be 1/8 of 0.9 = 0.1125.
        const ratio = Math.abs(out[3]) / maxAbs;
        console.log("ratioPreserved", Math.abs(ratio - 0.05 / 0.4) < 1e-5);
      `,
    );
    expect(stdout).toBe(["peakClose true", "ratioPreserved true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("rms mode brings rms(x) exactly to the target", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-norm-rms",
      `
        import audio from "para:audio";
        // 1 kHz sine at amplitude 0.05 — RMS = amp / sqrt(2) ≈ 0.0354.
        const SR = 16000, N = 4096;
        const input = new Float32Array(N);
        for (let i = 0; i < N; i++) input[i] = 0.05 * Math.sin(2 * Math.PI * 1000 * i / SR);
        const out = audio.normalize(input, { target: 0.5, mode: "rms" });
        let sumSq = 0;
        for (const v of out) sumSq += v * v;
        const rms = Math.sqrt(sumSq / N);
        // Within 0.5% of target — peaks may have clipped if target * gain > 1,
        // but for 0.05 → 0.5 the peak gain is 10× → output peak ≈ 0.5, no clip.
        console.log("rmsClose", Math.abs(rms - 0.5) / 0.5 < 0.005);
      `,
    );
    expect(stdout).toBe("rmsClose true");
    expect(exitCode).toBe(0);
  });

  it("output is hard-clipped to [-1, 1] regardless of mode", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-norm-clip",
      `
        import audio from "para:audio";
        // Mostly quiet with one big spike — RMS-normalize aggressively, the
        // spike will clip. Verify the hard-clip envelope is honored.
        const input = new Float32Array(1000).fill(0.01);
        input[500] = 0.95; // big spike
        const out = audio.normalize(input, { target: 0.9, mode: "rms" });
        let inRange = true;
        for (const v of out) if (v > 1 || v < -1 || Number.isNaN(v)) { inRange = false; break; }
        console.log("inRange", inRange);
      `,
    );
    expect(stdout).toBe("inRange true");
    expect(exitCode).toBe(0);
  });

  it("all-silent input passes through unchanged (no divide-by-zero)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-norm-silent",
      `
        import audio from "para:audio";
        const input = new Float32Array(64); // all zeros
        const out = audio.normalize(input, { target: 0.9 });
        const allZero = out.every(v => v === 0);
        const sameLen = out.length === input.length;
        const sameRef = out === input;
        console.log("allZero", allZero, "sameLen", sameLen, "sameRef", sameRef);
      `,
    );
    expect(stdout).toBe("allZero true sameLen true sameRef false");
    expect(exitCode).toBe(0);
  });

  it("empty input returns an empty Float32Array", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-norm-empty",
      `
        import audio from "para:audio";
        const out = audio.normalize(new Float32Array(0));
        console.log("len", out.length, "ctor", out.constructor.name);
      `,
    );
    expect(stdout).toBe("len 0 ctor Float32Array");
    expect(exitCode).toBe(0);
  });

  it("rejects out-of-range target and unknown mode", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-norm-bad-args",
      `
        import audio from "para:audio";
        const input = new Float32Array([0.1, 0.2, 0.3]);
        let threw = 0;
        for (const o of [
          { target: 0 },
          { target: 1.5 },
          { target: -0.5 },
          { target: NaN },
          { mode: "lufs" },
        ]) {
          try { audio.normalize(input, o); } catch { threw++; }
        }
        console.log("threw", threw);
      `,
    );
    expect(stdout).toBe("threw 5");
    expect(exitCode).toBe(0);
  });
});

describe("para:audio — Gain (AGC)", () => {
  it("brings a quiet sine wave up toward the target level", async () => {
    // Quiet 440 Hz sine at amplitude 0.01 → AGC should boost it toward
    // targetLevel=0.1 over the first ~release-window seconds. Compare
    // peak amplitude of the second half of the buffer (after settling)
    // against the input.
    const { stdout, exitCode } = await runFixture(
      "parabun-gain-quiet",
      `
        import audio from "para:audio";
        const SR = 48000;
        const N = SR; // 1 second
        const input = new Float32Array(N);
        for (let i = 0; i < N; i++) input[i] = 0.01 * Math.sin(2 * Math.PI * 440 * i / SR);
        const inPeak = Math.max(...input);
        const agc = new audio.Gain({ targetLevel: 0.1, sampleRate: SR });
        agc.process(input);
        // Sample the settled second half.
        let outPeak = 0;
        for (let i = N / 2; i < N; i++) if (input[i] > outPeak) outPeak = input[i];
        console.log("inPeak.lt.0.02", inPeak < 0.02);
        // Should land near targetLevel — give generous tolerance for the
        // peak (sine peak ≈ envelope, both should be ~0.1 once settled).
        console.log("outPeak.in.0.05.0.2", outPeak > 0.05 && outPeak < 0.2);
        console.log("amplified", outPeak > inPeak * 3);
      `,
    );
    expect(stdout).toBe(["inPeak.lt.0.02 true", "outPeak.in.0.05.0.2 true", "amplified true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("attenuates a hot signal back toward target", async () => {
    // Loud 440 Hz sine at amplitude 0.9 → AGC should reduce it toward 0.1.
    const { stdout, exitCode } = await runFixture(
      "parabun-gain-loud",
      `
        import audio from "para:audio";
        const SR = 48000;
        const N = SR;
        const input = new Float32Array(N);
        for (let i = 0; i < N; i++) input[i] = 0.9 * Math.sin(2 * Math.PI * 440 * i / SR);
        const agc = new audio.Gain({ targetLevel: 0.1, sampleRate: SR });
        agc.process(input);
        let outPeak = 0;
        for (let i = N / 2; i < N; i++) if (input[i] > outPeak) outPeak = input[i];
        console.log("outPeak.in.0.05.0.2", outPeak > 0.05 && outPeak < 0.2);
        console.log("attenuated", outPeak < 0.5);
      `,
    );
    expect(stdout).toBe(["outPeak.in.0.05.0.2 true", "attenuated true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("output never clips outside [-1, 1]", async () => {
    // Pathological input — already-clipping square wave → AGC must not
    // produce out-of-range samples regardless of the gain applied.
    const { stdout, exitCode } = await runFixture(
      "parabun-gain-noclip",
      `
        import audio from "para:audio";
        const SR = 48000;
        const N = SR / 10; // 100 ms
        const input = new Float32Array(N);
        for (let i = 0; i < N; i++) input[i] = (i % 100) < 50 ? 0.99 : -0.99;
        const agc = new audio.Gain({ targetLevel: 0.5, sampleRate: SR });
        agc.process(input);
        let inRange = true;
        for (let i = 0; i < N; i++) {
          if (input[i] > 1 || input[i] < -1 || Number.isNaN(input[i])) { inRange = false; break; }
        }
        console.log("inRange", inRange);
      `,
    );
    expect(stdout).toBe("inRange true");
    expect(exitCode).toBe(0);
  });

  it("respects maxGain — pure silence does not get amplified to noise floor", async () => {
    // All-zero input → envelope stays at 0 → gain holds at the initial
    // value (1.0) rather than racing to maxGain. Output stays silent.
    const { stdout, exitCode } = await runFixture(
      "parabun-gain-silence",
      `
        import audio from "para:audio";
        const N = 4800;
        const input = new Float32Array(N); // all zeros
        const agc = new audio.Gain({ targetLevel: 0.1, sampleRate: 48000, maxGain: 100 });
        agc.process(input);
        let max = 0;
        for (let i = 0; i < N; i++) if (Math.abs(input[i]) > max) max = Math.abs(input[i]);
        console.log("output.silent", max === 0);
        console.log("gain.lt.maxGain", agc.gain < 100);
      `,
    );
    expect(stdout).toBe(["output.silent true", "gain.lt.maxGain true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("state persists across .process() calls", async () => {
    // Feed the same loud sine in two halves; after the second half the
    // envelope/gain should match what we get from one-shot processing.
    const { stdout, exitCode } = await runFixture(
      "parabun-gain-state",
      `
        import audio from "para:audio";
        const SR = 48000;
        const N = SR;
        const mkSine = () => {
          const a = new Float32Array(N);
          for (let i = 0; i < N; i++) a[i] = 0.5 * Math.sin(2 * Math.PI * 440 * i / SR);
          return a;
        };
        const oneShot = new audio.Gain({ sampleRate: SR });
        const oneShotInput = mkSine();
        oneShot.process(oneShotInput);
        const split = new audio.Gain({ sampleRate: SR });
        const splitInput = mkSine();
        split.process(splitInput.subarray(0, N / 2));
        split.process(splitInput.subarray(N / 2));
        const equalLen = oneShotInput.length === splitInput.length;
        let sumAbs = 0;
        for (let i = 0; i < N; i++) sumAbs += Math.abs(oneShotInput[i] - splitInput[i]);
        console.log("equalLen", equalLen);
        console.log("identical.output", sumAbs === 0);
      `,
    );
    expect(stdout).toBe(["equalLen true", "identical.output true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("rejects bad opts at construction time", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gain-bad-opts",
      `
        import audio from "para:audio";
        let threw = 0;
        try { new audio.Gain({ targetLevel: 0 }); } catch { threw++; }
        try { new audio.Gain({ targetLevel: 2 }); } catch { threw++; }
        try { new audio.Gain({ maxGain: 0 }); } catch { threw++; }
        try { new audio.Gain({ sampleRate: -1 }); } catch { threw++; }
        try { new audio.Gain(null); } catch { threw++; }
        console.log("threw", threw);
      `,
    );
    expect(stdout).toBe("threw 5");
    expect(exitCode).toBe(0);
  });

  it("reset() returns the AGC to its initial state", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-gain-reset",
      `
        import audio from "para:audio";
        const SR = 48000;
        const N = SR;
        const noisy = new Float32Array(N);
        for (let i = 0; i < N; i++) noisy[i] = 0.5 * Math.sin(2 * Math.PI * 440 * i / SR);
        const agc = new audio.Gain({ sampleRate: SR });
        agc.process(noisy);
        const gainBeforeReset = agc.gain;
        agc.reset();
        console.log("postReset.envelope", agc.envelope);
        console.log("postReset.gain", agc.gain);
        console.log("changed", gainBeforeReset !== agc.gain);
      `,
    );
    expect(stdout).toBe(["postReset.envelope 0", "postReset.gain 1", "changed true"].join("\n"));
    expect(exitCode).toBe(0);
  });
});
