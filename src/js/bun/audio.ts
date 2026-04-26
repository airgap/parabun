// Hardcoded module "bun:audio"
//
// Parabun: offline audio DSP for the niche where you need actual signal
// processing, not just play/record. WebAudio is real-time-only and unusable
// in Node; this module fills that gap.
//
//   import audio from "bun:audio";
//
//   // Read WAV → Float32Array of samples in [-1, 1]
//   const { samples, sampleRate, channels } = audio.readWav(bytes);
//
//   // FFT (returns interleaved complex pairs: [re0, im0, re1, im1, ...])
//   const freqs = audio.fft(samples);
//   const back  = audio.ifft(freqs);  // round-trips to within ~1e-5
//
//   // Lowpass filter (Butterworth biquad, single section)
//   const lp = audio.lowpass(samples, { cutoff: 1000, sampleRate });
//
//   // STFT spectrogram — magnitudes per frame
//   const spec = audio.spectrogram(samples, { window: 1024, hop: 256 });
//
// v1 is pure-JS — no native deps. PFFFT for native FFT and libsndfile for
// extended format support (FLAC + the looser end of the WAV spec) come in
// follow-ups; the plain JS path is correct + adequate up to ~1M samples.

const TWO_PI = 2 * Math.PI;

// ─── FFT (Cooley-Tukey radix-2, in-place) ──────────────────────────────────
// Operates on an interleaved-complex Float32Array: [re0, im0, re1, im1, …].
// Length must be a power of 2. `forward` controls sign of the twiddle factor;
// inverse FFT scales by 1/N at the end. Both directions share the body.
function fftInPlace(io: Float32Array, forward: boolean): void {
  const n = io.length >>> 1;
  if (n < 2 || (n & (n - 1)) !== 0) {
    throw new Error("bun:audio FFT: complex length must be a power of 2 ≥ 2");
  }

  // Bit-reversal permutation. Swap io[i] with io[bitrev(i)] for i < bitrev(i).
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const ri = i << 1,
        rj = j << 1;
      const tr = io[ri],
        ti = io[ri + 1];
      io[ri] = io[rj];
      io[ri + 1] = io[rj + 1];
      io[rj] = tr;
      io[rj + 1] = ti;
    }
  }

  // Butterflies — log2(n) stages, each doubling block size.
  for (let size = 2; size <= n; size <<= 1) {
    const halfSize = size >>> 1;
    const angle = (forward ? -TWO_PI : TWO_PI) / size;
    const wStepR = Math.cos(angle);
    const wStepI = Math.sin(angle);
    for (let block = 0; block < n; block += size) {
      let wR = 1.0,
        wI = 0.0;
      for (let k = 0; k < halfSize; k++) {
        const evenIdx = (block + k) << 1;
        const oddIdx = (block + k + halfSize) << 1;
        const oR = io[oddIdx],
          oI = io[oddIdx + 1];
        const tR = wR * oR - wI * oI;
        const tI = wR * oI + wI * oR;
        const eR = io[evenIdx],
          eI = io[evenIdx + 1];
        io[evenIdx] = eR + tR;
        io[evenIdx + 1] = eI + tI;
        io[oddIdx] = eR - tR;
        io[oddIdx + 1] = eI - tI;
        const nwR = wR * wStepR - wI * wStepI;
        const nwI = wR * wStepI + wI * wStepR;
        wR = nwR;
        wI = nwI;
      }
    }
  }

  if (!forward) {
    const inv = 1.0 / n;
    for (let i = 0; i < io.length; i++) io[i] *= inv;
  }
}

// fft(real | complex) → complex Float32Array.
// Real input is auto-zero-padded for the imaginary part. Complex input
// (interleaved-pair layout) is taken as-is. Output is freshly allocated.
function fft(input: Float32Array): Float32Array {
  // Heuristic: even-length-and-pow2 with imaginary-zero interleaving is
  // ambiguous between real-N=len and complex-N=len/2. Disambiguate via the
  // BunAudioComplex brand on inputs that came through ifft().
  const isComplex = (input as any).__bunAudioComplex === true;
  const realN = isComplex ? input.length >>> 1 : input.length;
  const out = new Float32Array(realN * 2);
  if (isComplex) {
    out.set(input);
  } else {
    for (let i = 0; i < realN; i++) out[i << 1] = input[i];
  }
  fftInPlace(out, true);
  Object.defineProperty(out, "__bunAudioComplex", { value: true });
  return out;
}

// ifft(complex) → real Float32Array (drops imaginary part of the result,
// which is < 1e-5 for well-conditioned inputs).
function ifft(complex: Float32Array): Float32Array {
  if ((complex.length & 1) !== 0) {
    throw new Error("bun:audio ifft: complex length must be even (interleaved pairs)");
  }
  const work = new Float32Array(complex);
  fftInPlace(work, false);
  const n = complex.length >>> 1;
  const real = new Float32Array(n);
  for (let i = 0; i < n; i++) real[i] = work[i << 1];
  return real;
}

// ─── WAV I/O ───────────────────────────────────────────────────────────────
// Standard PCM WAV: RIFF/WAVE header, fmt chunk, data chunk. We support
// 16-bit signed PCM and 32-bit float PCM, mono or stereo. v1 doesn't handle
// extensible (WAVEFORMATEXTENSIBLE), 24-bit, A-law, μ-law — those land if
// libsndfile gets vendored.

type WavData = {
  /** Interleaved samples in [-1, 1]. For multi-channel, frame N's channel C is at samples[N*channels + C]. */
  samples: Float32Array;
  sampleRate: number;
  channels: number;
};

function readWav(bytes: Uint8Array): WavData {
  if (bytes.length < 44) throw new Error("bun:audio readWav: input too short for a WAV header");
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (off: number) => String.fromCharCode(bytes[off], bytes[off + 1], bytes[off + 2], bytes[off + 3]);
  if (tag(0) !== "RIFF" || tag(8) !== "WAVE") {
    throw new Error("bun:audio readWav: not a RIFF/WAVE file");
  }

  // Walk chunks. `fmt ` carries the format details, `data` carries samples.
  let p = 12;
  let fmtAt = -1;
  let fmtLen = 0;
  let dataAt = -1;
  let dataLen = 0;
  while (p + 8 <= bytes.length) {
    const id = tag(p);
    const len = dv.getUint32(p + 4, true);
    if (id === "fmt ") {
      fmtAt = p + 8;
      fmtLen = len;
    } else if (id === "data") {
      dataAt = p + 8;
      dataLen = len;
      break;
    }
    p += 8 + len + (len & 1); // chunks are padded to even length
  }
  if (fmtAt < 0 || dataAt < 0) throw new Error("bun:audio readWav: missing fmt or data chunk");
  if (fmtLen < 16) throw new Error("bun:audio readWav: fmt chunk truncated");

  const audioFormat = dv.getUint16(fmtAt + 0, true);
  const channels = dv.getUint16(fmtAt + 2, true);
  const sampleRate = dv.getUint32(fmtAt + 4, true);
  const bitsPerSample = dv.getUint16(fmtAt + 14, true);

  const totalSamples = (dataLen / (bitsPerSample >>> 3)) | 0;
  const samples = new Float32Array(totalSamples);

  if (audioFormat === 1 && bitsPerSample === 16) {
    // PCM_S16LE → normalize to [-1, 1]. Divide by 32768 for symmetric
    // negative-range; positive-range max maps to 32767/32768 = 0.99997.
    for (let i = 0; i < totalSamples; i++) {
      samples[i] = dv.getInt16(dataAt + i * 2, true) / 32768;
    }
  } else if (audioFormat === 3 && bitsPerSample === 32) {
    // IEEE 754 float, already normalized.
    for (let i = 0; i < totalSamples; i++) {
      samples[i] = dv.getFloat32(dataAt + i * 4, true);
    }
  } else {
    throw new Error(
      `bun:audio readWav: unsupported PCM ${audioFormat}/${bitsPerSample}-bit ` + `(supported: PCM s16, IEEE float32)`,
    );
  }

  return { samples, sampleRate, channels };
}

type WriteWavOptions = {
  /** Output bit depth. 16 = PCM_S16LE, 32 = IEEE float. Default 16. */
  bitsPerSample?: 16 | 32;
};

function writeWav(data: WavData, opts: WriteWavOptions = {}): Uint8Array {
  const bps = opts.bitsPerSample ?? 16;
  if (bps !== 16 && bps !== 32) throw new Error("bun:audio writeWav: bitsPerSample must be 16 or 32");
  const audioFormat = bps === 32 ? 3 : 1;
  const bytesPerSample = bps >>> 3;
  const dataBytes = data.samples.length * bytesPerSample;
  const buf = new Uint8Array(44 + dataBytes);
  const dv = new DataView(buf.buffer);

  // RIFF header
  buf.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  dv.setUint32(4, 36 + dataBytes, true); // file size - 8
  buf.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"

  // fmt chunk
  buf.set([0x66, 0x6d, 0x74, 0x20], 12); // "fmt "
  dv.setUint32(16, 16, true); // fmt chunk size
  dv.setUint16(20, audioFormat, true); // 1 = PCM, 3 = IEEE float
  dv.setUint16(22, data.channels, true);
  dv.setUint32(24, data.sampleRate, true);
  dv.setUint32(28, data.sampleRate * data.channels * bytesPerSample, true); // byte rate
  dv.setUint16(32, data.channels * bytesPerSample, true); // block align
  dv.setUint16(34, bps, true);

  // data chunk
  buf.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
  dv.setUint32(40, dataBytes, true);

  if (bps === 16) {
    for (let i = 0; i < data.samples.length; i++) {
      const s = Math.max(-1, Math.min(1, data.samples[i]));
      // Round-half-to-even-style symmetric quantization.
      const q = s < 0 ? Math.round(s * 32768) : Math.round(s * 32767);
      dv.setInt16(44 + i * 2, q, true);
    }
  } else {
    for (let i = 0; i < data.samples.length; i++) {
      dv.setFloat32(44 + i * 4, data.samples[i], true);
    }
  }
  return buf;
}

// ─── Filter: Butterworth lowpass biquad ────────────────────────────────────
// Single second-order section with the standard direct-form-I biquad
// recurrence. For higher-order or sharper rolloff, cascade multiple sections.
//
// Coefficients from RBJ Audio EQ Cookbook (Butterworth Q = 1/√2):
//   ω = 2π * cutoff / sampleRate
//   α = sin(ω) / (2 * Q)
//   b0 = (1 - cos ω) / 2 ; b1 = 1 - cos ω ; b2 = (1 - cos ω) / 2
//   a0 = 1 + α          ; a1 = -2 cos ω  ; a2 = 1 - α
//   normalize by a0

type FilterOptions = {
  /** -3 dB cutoff in Hz. Must be < sampleRate / 2. */
  cutoff: number;
  /** Sample rate of the input in Hz. */
  sampleRate: number;
};

function lowpass(samples: Float32Array, opts: FilterOptions): Float32Array {
  const { cutoff, sampleRate } = opts;
  if (!(cutoff > 0)) throw new RangeError("bun:audio lowpass: cutoff must be > 0");
  if (!(cutoff < sampleRate / 2)) {
    throw new RangeError(`bun:audio lowpass: cutoff (${cutoff}) must be < sampleRate / 2 (${sampleRate / 2})`);
  }

  const Q = Math.SQRT1_2; // Butterworth
  const w0 = (TWO_PI * cutoff) / sampleRate;
  const cosW = Math.cos(w0);
  const sinW = Math.sin(w0);
  const alpha = sinW / (2 * Q);

  const b0 = (1 - cosW) / 2;
  const b1 = 1 - cosW;
  const b2 = b0;
  const a0 = 1 + alpha;
  const a1 = -2 * cosW;
  const a2 = 1 - alpha;

  const nB0 = b0 / a0,
    nB1 = b1 / a0,
    nB2 = b2 / a0;
  const nA1 = a1 / a0,
    nA2 = a2 / a0;

  const out = new Float32Array(samples.length);
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x0 = samples[i];
    const y0 = nB0 * x0 + nB1 * x1 + nB2 * x2 - nA1 * y1 - nA2 * y2;
    out[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }
  return out;
}

// ─── Spectrogram (STFT) ────────────────────────────────────────────────────
// Short-Time Fourier Transform. Each frame is `window` samples wide,
// stepped by `hop` samples. Returns an array of magnitude arrays — one per
// frame, each `window/2 + 1` long (the one-sided spectrum, since the input
// is real).
//
// Window: Hann by default. Other windows can land later if needed.

type SpectrogramOptions = {
  window: number; // FFT size. Must be a power of 2.
  hop: number; // Step between successive frames in samples.
};

function hannWindow(n: number): Float32Array {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 * (1 - Math.cos((TWO_PI * i) / (n - 1)));
  return w;
}

function spectrogram(samples: Float32Array, opts: SpectrogramOptions): Float32Array[] {
  const { window: winSize, hop } = opts;
  if ((winSize & (winSize - 1)) !== 0) {
    throw new RangeError("bun:audio spectrogram: window must be a power of 2");
  }
  if (hop <= 0) throw new RangeError("bun:audio spectrogram: hop must be > 0");
  const win = hannWindow(winSize);
  const halfPlusOne = (winSize >>> 1) + 1;
  const frames: Float32Array[] = [];
  const fftBuf = new Float32Array(winSize * 2);
  for (let start = 0; start + winSize <= samples.length; start += hop) {
    fftBuf.fill(0);
    for (let i = 0; i < winSize; i++) fftBuf[i << 1] = samples[start + i] * win[i];
    fftInPlace(fftBuf, true);
    const mag = new Float32Array(halfPlusOne);
    for (let i = 0; i < halfPlusOne; i++) {
      const re = fftBuf[i << 1];
      const im = fftBuf[(i << 1) + 1];
      mag[i] = Math.hypot(re, im);
    }
    frames.push(mag);
  }
  return frames;
}

export default {
  fft,
  ifft,
  readWav,
  writeWav,
  lowpass,
  spectrogram,
};
