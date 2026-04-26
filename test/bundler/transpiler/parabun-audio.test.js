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

describe("bun:audio — FFT", () => {
  it("FFT of a pure sine wave has a single dominant bin", async () => {
    // 64-sample real signal: a 4-cycle sine over the window. After FFT,
    // bin 4 (and its mirror at 60 = N-4) should be the only large
    // magnitudes. We assert bin 4 dominates everything else by 50×.
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-fft-sine",
      `
        import audio from "bun:audio";
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
        import audio from "bun:audio";
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
        import audio from "bun:audio";
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

describe("bun:audio — WAV I/O", () => {
  it("writeWav → readWav roundtrip preserves samples (s16)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-wav-s16",
      `
        import audio from "bun:audio";
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
        import audio from "bun:audio";
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
        import audio from "bun:audio";
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
        import audio from "bun:audio";
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

describe("bun:audio — lowpass", () => {
  it("attenuates a high-frequency tone, preserves a low-frequency one", async () => {
    // Mix a 200 Hz sine and a 4000 Hz sine at 16000 Hz sample rate.
    // Lowpass at 1000 Hz should crush the 4 kHz component but pass the
    // 200 Hz one. (Important: 4000 Hz at 8 kHz would be Nyquist —
    // sin(πi) = 0 — so we sample at 16 kHz to avoid aliasing.)
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-lowpass",
      `
        import audio from "bun:audio";
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
        import audio from "bun:audio";
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

describe("bun:audio — spectrogram", () => {
  it("produces frame count consistent with hop / window settings", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-audio-spectrogram-shape",
      `
        import audio from "bun:audio";
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
        import audio from "bun:audio";
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
