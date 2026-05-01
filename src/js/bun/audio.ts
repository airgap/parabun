// Hardcoded module "parabun:audio"
//
// Parabun: offline audio DSP for the niche where you need actual signal
// processing, not just play/record. WebAudio is real-time-only and unusable
// in Node; this module fills that gap.
//
//   import audio from "parabun:audio";
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

const native = $cpp("parabun_audio_codecs.cpp", "createParabunAudioCodecs");
const io = $cpp("parabun_audio_io.cpp", "createParabunAudioIO");

// Sibling builtin — used to expose live state on CaptureStream as
// Signals so consumers can subscribe / use in `effect { ... }`.
// See `/raid/parabun-site/PLAN-module-signals.md` for the cross-module
// reactive surface plan.
const signals = require("./signals.ts");
// Structural shape — keeps audio.ts honest about not poking at internals.
type Signal<T> = {
  get(): T;
  peek(): T;
  subscribe(cb: (v: T) => void): () => void;
};
type WritableSignal<T> = Signal<T> & { set(v: T): void };

// FinalizationRegistry to back-stop forgotten close() calls. Holders that
// drop without calling .close() leak their libopus state until GC; the
// registry runs at GC time and frees anything still alive.
const opusEncoderRegistry = new FinalizationRegistry<bigint>(handle => {
  if (handle !== 0n) native.destroyOpusEncoder(handle);
});
const opusDecoderRegistry = new FinalizationRegistry<bigint>(handle => {
  if (handle !== 0n) native.destroyOpusDecoder(handle);
});
const denoiserRegistry = new FinalizationRegistry<bigint>(handle => {
  if (handle !== 0n) native.destroyDenoiser(handle);
});

// ─── FFT (Cooley-Tukey radix-2, in-place) ──────────────────────────────────
// Operates on an interleaved-complex Float32Array: [re0, im0, re1, im1, …].
// Length must be a power of 2. `forward` controls sign of the twiddle factor;
// inverse FFT scales by 1/N at the end. Both directions share the body.
function fftInPlace(io: Float32Array, forward: boolean): void {
  const n = io.length >>> 1;
  if (n < 2 || (n & (n - 1)) !== 0) {
    throw new Error("parabun:audio FFT: complex length must be a power of 2 ≥ 2");
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
    throw new Error("parabun:audio ifft: complex length must be even (interleaved pairs)");
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
  if (bytes.length < 44) throw new Error("parabun:audio readWav: input too short for a WAV header");
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (off: number) => String.fromCharCode(bytes[off], bytes[off + 1], bytes[off + 2], bytes[off + 3]);
  if (tag(0) !== "RIFF" || tag(8) !== "WAVE") {
    throw new Error("parabun:audio readWav: not a RIFF/WAVE file");
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
  if (fmtAt < 0 || dataAt < 0) throw new Error("parabun:audio readWav: missing fmt or data chunk");
  if (fmtLen < 16) throw new Error("parabun:audio readWav: fmt chunk truncated");

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
      `parabun:audio readWav: unsupported PCM ${audioFormat}/${bitsPerSample}-bit ` + `(supported: PCM s16, IEEE float32)`,
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
  if (bps !== 16 && bps !== 32) throw new Error("parabun:audio writeWav: bitsPerSample must be 16 or 32");
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

// Direct-form-I biquad runner. Coefficients are normalized by a0 once up
// front so the inner loop is just five multiplies and four adds. State is
// fresh per call — for streaming use cases we'd hold (x1, x2, y1, y2)
// between calls; today every filter does whole-buffer.
function runBiquad(
  samples: Float32Array,
  b0: number,
  b1: number,
  b2: number,
  a0: number,
  a1: number,
  a2: number,
): Float32Array {
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

function lowpass(samples: Float32Array, opts: FilterOptions): Float32Array {
  const { cutoff, sampleRate } = opts;
  if (!(cutoff > 0)) throw new RangeError("parabun:audio lowpass: cutoff must be > 0");
  if (!(cutoff < sampleRate / 2)) {
    throw new RangeError(`parabun:audio lowpass: cutoff (${cutoff}) must be < sampleRate / 2 (${sampleRate / 2})`);
  }

  const Q = Math.SQRT1_2; // Butterworth
  const w0 = (TWO_PI * cutoff) / sampleRate;
  const cosW = Math.cos(w0);
  const sinW = Math.sin(w0);
  const alpha = sinW / (2 * Q);

  // RBJ Audio EQ Cookbook — lowpass.
  const b0 = (1 - cosW) / 2;
  const b1 = 1 - cosW;
  const b2 = b0;
  const a0 = 1 + alpha;
  const a1 = -2 * cosW;
  const a2 = 1 - alpha;
  return runBiquad(samples, b0, b1, b2, a0, a1, a2);
}

// Highpass — strips DC and low-frequency rumble. For voice work this is
// usually applied at ~80 Hz to remove HVAC hum, mic-stand thumps, and
// microphone proximity-effect bass.
function highpass(samples: Float32Array, opts: FilterOptions): Float32Array {
  const { cutoff, sampleRate } = opts;
  if (!(cutoff > 0)) throw new RangeError("parabun:audio highpass: cutoff must be > 0");
  if (!(cutoff < sampleRate / 2)) {
    throw new RangeError(`parabun:audio highpass: cutoff (${cutoff}) must be < sampleRate / 2 (${sampleRate / 2})`);
  }
  const Q = Math.SQRT1_2;
  const w0 = (TWO_PI * cutoff) / sampleRate;
  const cosW = Math.cos(w0);
  const sinW = Math.sin(w0);
  const alpha = sinW / (2 * Q);
  // RBJ — highpass.
  const b0 = (1 + cosW) / 2;
  const b1 = -(1 + cosW);
  const b2 = b0;
  const a0 = 1 + alpha;
  const a1 = -2 * cosW;
  const a2 = 1 - alpha;
  return runBiquad(samples, b0, b1, b2, a0, a1, a2);
}

type BandFilterOptions = {
  /** Center frequency in Hz. Must be < sampleRate / 2. */
  center: number;
  /**
   * Resonance — narrower band as Q grows. Default 1 (moderate). Q=0.707
   * gives an octave-wide band; Q=10 is a tight resonant peak.
   */
  Q?: number;
  /** Sample rate of the input in Hz. */
  sampleRate: number;
};

// Bandpass — keeps a band of frequencies around `center`, attenuates
// everything else. Constant-0-dB-peak-gain variant (RBJ): the response
// hits 1.0 at the center frequency regardless of Q, so callers can
// reason about loudness independently of bandwidth.
function bandpass(samples: Float32Array, opts: BandFilterOptions): Float32Array {
  const { center, sampleRate } = opts;
  const Q = opts.Q ?? 1;
  if (!(center > 0)) throw new RangeError("parabun:audio bandpass: center must be > 0");
  if (!(center < sampleRate / 2)) {
    throw new RangeError(`parabun:audio bandpass: center (${center}) must be < sampleRate / 2 (${sampleRate / 2})`);
  }
  if (!(Q > 0)) throw new RangeError("parabun:audio bandpass: Q must be > 0");
  const w0 = (TWO_PI * center) / sampleRate;
  const cosW = Math.cos(w0);
  const sinW = Math.sin(w0);
  const alpha = sinW / (2 * Q);
  // RBJ — bandpass (constant 0 dB peak gain).
  const b0 = alpha;
  const b1 = 0;
  const b2 = -alpha;
  const a0 = 1 + alpha;
  const a1 = -2 * cosW;
  const a2 = 1 - alpha;
  return runBiquad(samples, b0, b1, b2, a0, a1, a2);
}

// Notch — kills a single frequency and a narrow band around it; passes
// everything else. Use for mains hum (50 Hz / 60 Hz), specific resonant
// rings, or any single-frequency contamination. Q controls how narrow
// the kill band is — Q=30+ for surgical hum removal, Q=1 for a wide
// midrange dip.
function notch(samples: Float32Array, opts: BandFilterOptions): Float32Array {
  const { center, sampleRate } = opts;
  const Q = opts.Q ?? 30;
  if (!(center > 0)) throw new RangeError("parabun:audio notch: center must be > 0");
  if (!(center < sampleRate / 2)) {
    throw new RangeError(`parabun:audio notch: center (${center}) must be < sampleRate / 2 (${sampleRate / 2})`);
  }
  if (!(Q > 0)) throw new RangeError("parabun:audio notch: Q must be > 0");
  const w0 = (TWO_PI * center) / sampleRate;
  const cosW = Math.cos(w0);
  const sinW = Math.sin(w0);
  const alpha = sinW / (2 * Q);
  // RBJ — notch.
  const b0 = 1;
  const b1 = -2 * cosW;
  const b2 = 1;
  const a0 = 1 + alpha;
  const a1 = -2 * cosW;
  const a2 = 1 - alpha;
  return runBiquad(samples, b0, b1, b2, a0, a1, a2);
}

// ─── Resampling ────────────────────────────────────────────────────────────
// Sample-rate conversion for the common case of feeding voice / audio
// pipelines: 48 kHz mic → 16 kHz Opus encoder, 44.1 kHz CD → 16 kHz Whisper
// preprocessing, etc. Implementation:
//   - Downsample (target < source): lowpass at target Nyquist (anti-alias
//     to prevent fold-back), then linear-interpolate at output rate.
//   - Upsample (target > source): linear-interpolate at output rate. No
//     pre-filter needed since there's no above-Nyquist content to alias.
// Linear is the practical sweet spot — sinc / polyphase deliver less than
// 0.5 dB extra quality for typical voice work and add ~10× the code.

type ResampleOptions = {
  /** Source sample rate in Hz. */
  from: number;
  /** Target sample rate in Hz. */
  to: number;
};

function linearResample(samples: Float32Array, ratio: number): Float32Array {
  // ratio = sourceRate / targetRate. Output length = round(input / ratio).
  const outLen = Math.round(samples.length / ratio);
  const out = new Float32Array(outLen);
  if (outLen === 0 || samples.length === 0) return out;
  const lastIdx = samples.length - 1;
  for (let i = 0; i < outLen; i++) {
    const t = i * ratio;
    const i0 = Math.floor(t);
    const frac = t - i0;
    if (i0 >= lastIdx) {
      out[i] = samples[lastIdx];
    } else {
      out[i] = samples[i0] + (samples[i0 + 1] - samples[i0]) * frac;
    }
  }
  return out;
}

function resample(samples: Float32Array, opts: ResampleOptions): Float32Array {
  const { from, to } = opts;
  if (!(from > 0)) throw new RangeError("parabun:audio resample: from must be > 0");
  if (!(to > 0)) throw new RangeError("parabun:audio resample: to must be > 0");
  if (from === to) return new Float32Array(samples);

  const ratio = from / to;
  if (to < from) {
    // Downsampling — anti-alias filter at the new Nyquist (slightly under,
    // since the filter has finite rolloff). A single biquad gives only
    // -12 dB/octave rolloff which isn't sharp enough for typical 2-3×
    // downsampling targets. Cascading four biquad sections gives roughly
    // -48 dB/octave — sufficient to push above-Nyquist content below the
    // noise floor before decimation.
    const cutoff = (to / 2) * 0.95;
    let filtered = samples;
    for (let i = 0; i < 4; i++) {
      filtered = lowpass(filtered, { cutoff, sampleRate: from });
    }
    return linearResample(filtered, ratio);
  }
  // Upsampling — no pre-filter needed.
  return linearResample(samples, ratio);
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
    throw new RangeError("parabun:audio spectrogram: window must be a power of 2");
  }
  if (hop <= 0) throw new RangeError("parabun:audio spectrogram: hop must be > 0");
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

// ─── Mel spectrogram ───────────────────────────────────────────────────────
// log-Mel filterbank features. The standard input shape Whisper / Wav2Vec /
// modern speech models all consume:
//
//   1. STFT with a power-of-two FFT window (default 400 zero-padded to
//      512, since 400 isn't a power of 2 and we want a real FFT).
//   2. Square the magnitudes (power spectrum).
//   3. Project through a triangular mel filterbank (default 80 bins, edges
//      at fmin=0 Hz and fmax=sampleRate/2 in mel-spaced steps).
//   4. log10(max(power, 1e-10)) and clip to a fixed dynamic range.
//   5. Whisper specifically: clip max-min to 8 dB (re-scaled by *0.5 + 1).
//
// Slaney-style mel filterbank (matches librosa.filters.mel(htk=False)):
//   mel(f)   = 1127 * ln(1 + f/700)        for f >= 1000 Hz (log region)
//   mel(f)   = (3 * f) / 200               for f <  1000 Hz (linear region)
// The two regions meet at 1000 Hz where both = 15. Whisper uses this form.

const MEL_BREAK_FREQ_HZ = 1000;
const MEL_BREAK_MEL = 15;
const MEL_LOG_STEP = 27.0 / Math.log(6.4); // == 1127.01 / log(...) approximately

function hzToMel(hz: number): number {
  if (hz < MEL_BREAK_FREQ_HZ) return (3 * hz) / 200;
  return MEL_BREAK_MEL + Math.log(hz / MEL_BREAK_FREQ_HZ) * MEL_LOG_STEP;
}

function melToHz(mel: number): number {
  if (mel < MEL_BREAK_MEL) return (200 * mel) / 3;
  return MEL_BREAK_FREQ_HZ * Math.exp((mel - MEL_BREAK_MEL) / MEL_LOG_STEP);
}

// Build a Slaney-normalized triangular filterbank: [nMels × (nFft/2 + 1)].
function buildMelFilters(nMels: number, nFft: number, sampleRate: number): Float32Array {
  const nBins = (nFft >>> 1) + 1;
  const filters = new Float32Array(nMels * nBins);
  const fmin = 0;
  const fmax = sampleRate / 2;
  const melMin = hzToMel(fmin);
  const melMax = hzToMel(fmax);
  // nMels + 2 anchor points → nMels triangles.
  const melPoints = new Float32Array(nMels + 2);
  for (let i = 0; i < nMels + 2; i++) melPoints[i] = melMin + ((melMax - melMin) * i) / (nMels + 1);
  const hzPoints = new Float32Array(nMels + 2);
  for (let i = 0; i < nMels + 2; i++) hzPoints[i] = melToHz(melPoints[i]);

  // FFT bin frequencies: bin k corresponds to k * sampleRate / nFft.
  for (let m = 0; m < nMels; m++) {
    const fLeft = hzPoints[m];
    const fCenter = hzPoints[m + 1];
    const fRight = hzPoints[m + 2];
    // Slaney normalization: filter peaks at 2/(fRight - fLeft) so that the
    // total filter energy stays constant as the bandwidth widens at higher
    // frequencies.
    const scale = 2 / (fRight - fLeft);
    for (let k = 0; k < nBins; k++) {
      const f = (k * sampleRate) / nFft;
      let weight = 0;
      if (f >= fLeft && f <= fCenter) weight = (f - fLeft) / (fCenter - fLeft);
      else if (f > fCenter && f <= fRight) weight = (fRight - f) / (fRight - fCenter);
      filters[m * nBins + k] = weight * scale;
    }
  }
  return filters;
}

type MelOptions = {
  /** Sample rate of the input audio in Hz. Default 16000 (Whisper's rate). */
  sampleRate?: number;
  /**
   * Number of mel filterbank bins. Default 80 (Whisper's count; some models
   * — Wav2Vec2 — use 128).
   */
  nMels?: number;
  /**
   * STFT window size in samples. Default 400 (Whisper's 25ms at 16 kHz).
   * Internally zero-padded up to the next power of two for the FFT.
   */
  windowSize?: number;
  /** Hop between successive frames in samples. Default 160 (Whisper's 10ms at 16 kHz). */
  hop?: number;
  /** FFT size — must be a power of two ≥ windowSize. Default the next power of two ≥ windowSize. */
  nFft?: number;
  /**
   * Output mode. "log10" returns dB-style log10(power) (general purpose).
   * "whisper" returns Whisper's specific normalization: log10(max(power, 1e-10))
   * clipped to 8 dB dynamic range and rescaled to ~[-1, 1].
   * Default "whisper".
   */
  mode?: "log10" | "whisper";
};

type MelSpectrogram = {
  /** Per-frame mel feature vectors, each of length `nMels`. */
  frames: Float32Array[];
  /** Number of mel bins (rows). */
  nMels: number;
  /** FFT size used internally. */
  nFft: number;
  /** Hop size in samples. */
  hop: number;
};

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

// Pad a real signal so that the centered STFT covers the very first and
// last samples — librosa-style "reflect" padding by half a window. Whisper
// does this implicitly by padding the input audio to 30 s; for general use
// we emit symmetric reflect padding.
function reflectPad(x: Float32Array, padLeft: number, padRight: number): Float32Array {
  const out = new Float32Array(x.length + padLeft + padRight);
  // left = x[1..padLeft] reversed
  for (let i = 0; i < padLeft; i++) out[i] = x[Math.min(padLeft - i, x.length - 1)];
  // body
  out.set(x, padLeft);
  // right = x[n-2..n-1-padRight] reversed
  for (let i = 0; i < padRight; i++) {
    const idx = x.length - 2 - i;
    out[padLeft + x.length + i] = x[Math.max(idx, 0)];
  }
  return out;
}

function melSpectrogram(samples: Float32Array, opts: MelOptions = {}): MelSpectrogram {
  const sampleRate = opts.sampleRate ?? 16000;
  const nMels = opts.nMels ?? 80;
  const windowSize = opts.windowSize ?? 400;
  const hop = opts.hop ?? 160;
  const nFft = opts.nFft ?? nextPowerOfTwo(windowSize);
  const mode = opts.mode ?? "whisper";
  if ((nFft & (nFft - 1)) !== 0) {
    throw new RangeError("parabun:audio melSpectrogram: nFft must be a power of two");
  }
  if (nFft < windowSize) {
    throw new RangeError("parabun:audio melSpectrogram: nFft must be >= windowSize");
  }

  // Reflect-pad so the centered STFT starts from t=0 (matches librosa /
  // Whisper's reference preprocessor).
  const padded = reflectPad(samples, nFft >>> 1, nFft >>> 1);

  const filters = buildMelFilters(nMels, nFft, sampleRate);
  const nBins = (nFft >>> 1) + 1;
  const window = hannWindow(windowSize);

  const frames: Float32Array[] = [];
  const fftBuf = new Float32Array(nFft * 2);
  const power = new Float32Array(nBins);
  for (let start = 0; start + windowSize <= padded.length; start += hop) {
    fftBuf.fill(0);
    for (let i = 0; i < windowSize; i++) fftBuf[i << 1] = padded[start + i] * window[i];
    fftInPlace(fftBuf, true);
    for (let k = 0; k < nBins; k++) {
      const re = fftBuf[k << 1];
      const im = fftBuf[(k << 1) + 1];
      power[k] = re * re + im * im;
    }
    // Project through the mel filterbank: out[m] = sum_k filters[m,k] * power[k].
    const mel = new Float32Array(nMels);
    for (let m = 0; m < nMels; m++) {
      let acc = 0;
      const base = m * nBins;
      for (let k = 0; k < nBins; k++) acc += filters[base + k] * power[k];
      mel[m] = acc;
    }
    frames.push(mel);
  }

  // Compress to log scale.
  if (mode === "log10") {
    for (const frame of frames) {
      for (let m = 0; m < frame.length; m++) frame[m] = Math.log10(Math.max(frame[m], 1e-10));
    }
  } else {
    // Whisper's specific normalization. clamp(log10(max(p, 1e-10)) - max + 8, ...) / 4 then -1.
    let globalMax = -Infinity;
    for (const frame of frames) {
      for (let m = 0; m < frame.length; m++) {
        const v = Math.log10(Math.max(frame[m], 1e-10));
        frame[m] = v;
        if (v > globalMax) globalMax = v;
      }
    }
    const floor = globalMax - 8;
    for (const frame of frames) {
      for (let m = 0; m < frame.length; m++) {
        if (frame[m] < floor) frame[m] = floor;
        // Rescale from [floor, globalMax] = [globalMax-8, globalMax] to [-1, 1]
        // via (x - floor) / 4 - 1 = (x + 8 - globalMax) / 4 - 1 = (x - globalMax) / 4 + 1.
        frame[m] = (frame[m] - globalMax) / 4 + 1;
      }
    }
  }

  return { frames, nMels, nFft, hop };
}

// ─── Voice activity detection ──────────────────────────────────────────────
// RMS energy per frame, classified against an adaptive noise floor. Useful
// for push-to-talk (only encode when speaking), bandwidth saving in
// transmit pipelines, and voice-note auto-trim.
//
// Algorithm (intentionally simple — speexdsp's noise-aware VAD lands later):
//   1. Compute RMS per frame.
//   2. Estimate noise floor as a slow moving min of frame energies.
//   3. A frame is "speech" if its RMS exceeds the noise floor by `ratio`.
//
// Adaptive threshold beats a fixed one because mic gain / room noise
// varies — a recording at 0.001 RMS background needs a far lower
// absolute threshold than one at 0.01.

type VadOptions = {
  /** Samples per analysis frame. Default 480 (30 ms at 16 kHz). */
  frameSize?: number;
  /**
   * Speech is detected when frame RMS > noiseFloor × ratio. Higher = more
   * conservative (more silence false-negatives, fewer noise false-positives).
   * Default 3.0 (~10 dB above noise floor).
   */
  ratio?: number;
  /**
   * Number of frames in the sliding-window minimum used as the noise-
   * floor estimator. Bigger = more memory of past silence (robust against
   * sustained loud regions); smaller = faster adaptation to drift.
   * Default 100 frames (~3s at 30ms frames).
   */
  noiseWindow?: number;
};

type VadResult = {
  /** Per-frame RMS energy. Length = ceil(samples.length / frameSize). */
  energies: Float32Array;
  /** Per-frame speech / non-speech classification. */
  speech: boolean[];
  /** Final noise-floor estimate at end of input. Useful for live pipelines
   *  that want to seed the next batch. */
  noiseFloor: number;
};

function detectVoice(samples: Float32Array, opts: VadOptions = {}): VadResult {
  const frameSize = opts.frameSize ?? 480;
  const ratio = opts.ratio ?? 3.0;
  const noiseWindow = opts.noiseWindow ?? 100;
  if (frameSize < 1) throw new RangeError("parabun:audio detectVoice: frameSize must be >= 1");
  if (ratio < 1) throw new RangeError("parabun:audio detectVoice: ratio must be >= 1");
  if (noiseWindow < 1) throw new RangeError("parabun:audio detectVoice: noiseWindow must be >= 1");

  const numFrames = Math.ceil(samples.length / frameSize);
  const energies = new Float32Array(numFrames);
  const speech: boolean[] = new Array(numFrames);

  // Pass 1: per-frame RMS.
  for (let f = 0; f < numFrames; f++) {
    const start = f * frameSize;
    const end = Math.min(start + frameSize, samples.length);
    let sumSq = 0;
    for (let i = start; i < end; i++) sumSq += samples[i] * samples[i];
    energies[f] = Math.sqrt(sumSq / (end - start));
  }

  // Pass 2: sliding-window minimum noise-floor + speech classification.
  // For each frame i, noise floor = min(energies[max(0, i-W+1)..i]). Naive
  // O(N*W); fast enough for typical inputs (1s of audio at 30ms frames =
  // 33 frames). For long batches, swap in a monotonic-deque O(N) version.
  let lastFloor = 0;
  for (let f = 0; f < numFrames; f++) {
    const wStart = Math.max(0, f - noiseWindow + 1);
    let m = energies[wStart];
    for (let j = wStart + 1; j <= f; j++) if (energies[j] < m) m = energies[j];
    lastFloor = m;
    // Floor at a tiny positive value so a perfectly-silent intro doesn't
    // produce a 0-floor that everything trivially exceeds.
    const effective = Math.max(m, 1e-6);
    speech[f] = energies[f] > effective * ratio;
  }

  return { energies, speech, noiseFloor: lastFloor };
}

// ─── MP3 decode (minimp3) ──────────────────────────────────────────────────
// One-shot in-memory decode. Returns the same shape as readWav. MP3 is
// decode-only — encode would pull in LAME with patent + license complexity
// that's not v1.

function decodeMp3(bytes: Uint8Array): WavData {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("parabun:audio decodeMp3: expected Uint8Array");
  }
  return native.decodeMp3(bytes);
}

// ─── Opus codec ────────────────────────────────────────────────────────────
// libopus encoder + decoder, what every WebRTC client uses for voice. Class
// wrappers hide the bigint-handle plumbing and back-stop forgotten close()
// calls via FinalizationRegistry.
//
// Frame sizes (samples per encode/decode call) must match Opus's allowed
// values FOR THE SAMPLE RATE. At 16 kHz: 40 / 80 / 160 / 320 / 640 / 960
// (= 2.5 / 5 / 10 / 20 / 40 / 60 ms). At 48 kHz: 120 / 240 / 480 / 960 /
// 1920 / 2880. 20 ms is the standard voice setting (320 @ 16 kHz, 960 @
// 48 kHz). Voice / video calls typically pin frame size at the sender +
// receiver and exchange Opus packets across the wire.

type OpusEncoderOptions = {
  /** 8000, 12000, 16000, 24000, or 48000 Hz. */
  sampleRate: number;
  /** 1 (mono) or 2 (stereo). */
  channels: number;
  /** Target bitrate in bits per second. Default ≈ 64000 (libopus picks). */
  bitrate?: number;
};

class OpusEncoder {
  #handle: bigint;
  readonly sampleRate: number;
  readonly channels: number;

  constructor(opts: OpusEncoderOptions) {
    this.sampleRate = opts.sampleRate;
    this.channels = opts.channels;
    this.#handle = native.createOpusEncoder(opts);
    opusEncoderRegistry.register(this, this.#handle, this);
  }

  /**
   * Encode one frame of samples into one Opus packet. `samples` must be
   * `frameSize * channels` floats long; for stereo input, samples are
   * interleaved (L, R, L, R, ...). Returns the encoded packet bytes.
   */
  encode(samples: Float32Array, frameSize: number): Uint8Array {
    if (this.#handle === 0n) throw new Error("parabun:audio OpusEncoder: closed");
    return native.opusEncode(this.#handle, samples, frameSize);
  }

  /** Free the libopus state. Safe to call multiple times. */
  close(): void {
    if (this.#handle !== 0n) {
      native.destroyOpusEncoder(this.#handle);
      opusEncoderRegistry.unregister(this);
      this.#handle = 0n;
    }
  }
}

type OpusDecoderOptions = {
  sampleRate: number;
  channels: number;
};

class OpusDecoder {
  #handle: bigint;
  readonly sampleRate: number;
  readonly channels: number;

  constructor(opts: OpusDecoderOptions) {
    this.sampleRate = opts.sampleRate;
    this.channels = opts.channels;
    this.#handle = native.createOpusDecoder(opts);
    opusDecoderRegistry.register(this, this.#handle, this);
  }

  /**
   * Decode one Opus packet into one frame of samples. `frameSize` must
   * match what the encoder used (Opus is frame-aligned). Returns
   * `frameSize * channels` floats; stereo is interleaved.
   */
  decode(packet: Uint8Array, frameSize: number): Float32Array {
    if (this.#handle === 0n) throw new Error("parabun:audio OpusDecoder: closed");
    return native.opusDecode(this.#handle, packet, frameSize, this.channels);
  }

  close(): void {
    if (this.#handle !== 0n) {
      native.destroyOpusDecoder(this.#handle);
      opusDecoderRegistry.unregister(this);
      this.#handle = 0n;
    }
  }
}

// ─── Denoiser (rnnoise) ────────────────────────────────────────────────────
// RNN-based noise suppression. Operates on 480-sample mono frames at
// 48 kHz, in-place. Resample first if the source rate is different.
//
//   const den = new audio.Denoiser();
//   for each 10ms frame at 48 kHz mono:
//     const voiceProb = den.process(frame);  // mutates `frame` in place
//   den.close();
//
// `voiceProb` is rnnoise's per-frame voice-likelihood estimate (0..1).
// Useful as a complement to detectVoice() for higher-quality VAD.

class Denoiser {
  #handle: bigint;
  /** Required frame size: 480 samples (10 ms at 48 kHz). */
  static readonly FRAME_SIZE = 480;
  /** Required sample rate: 48 kHz. */
  static readonly SAMPLE_RATE = 48000;

  constructor() {
    this.#handle = native.createDenoiser();
    denoiserRegistry.register(this, this.#handle, this);
  }

  /**
   * Denoise a frame in place. Frame must be exactly 480 mono samples in
   * [-1, 1] at 48 kHz. Returns the per-frame voice-likelihood estimate
   * from the RNN (0 = noise/silence, 1 = clear voice).
   */
  process(frame: Float32Array): number {
    if (this.#handle === 0n) throw new Error("parabun:audio Denoiser: closed");
    return native.denoise(this.#handle, frame);
  }

  close(): void {
    if (this.#handle !== 0n) {
      native.destroyDenoiser(this.#handle);
      denoiserRegistry.unregister(this);
      this.#handle = 0n;
    }
  }
}

// ─── Interleave / Deinterleave ────────────────────────────────────────────
// Convert between planar layout (one Float32Array per channel) and
// interleaved layout (frame-major: L₀ R₀ L₁ R₁ … for stereo).
//
// Interleaved is what file containers and most low-level audio I/O expect
// (WAV's PCM payload, OS audio APIs, RTP payloads). Planar is what most
// DSP wants — process the L and R channels independently with the same
// pipeline, then re-interleave for output. Web Audio's `getChannelData(n)`
// also returns planar buffers.
//
// Both functions are zero-state (no IIR memory) so they're safe to call
// per frame in a streaming pipeline; cost is one O(N · channels) copy.

function interleave(channels: Float32Array[]): Float32Array {
  if (!Array.isArray(channels)) {
    throw new TypeError("parabun:audio.interleave: channels must be an array of Float32Arrays");
  }
  const C = channels.length;
  if (C === 0) return new Float32Array(0);

  const N = channels[0].length;
  for (let c = 0; c < C; c++) {
    if (!(channels[c] instanceof Float32Array)) {
      throw new TypeError(`parabun:audio.interleave: channels[${c}] must be a Float32Array`);
    }
    if (channels[c].length !== N) {
      throw new RangeError(
        `parabun:audio.interleave: all channels must have the same length; channels[0] is ${N}, channels[${c}] is ${channels[c].length}`,
      );
    }
  }

  // Mono fast path — just copy through, callers can use this without a
  // type-dispatch branch on their side.
  if (C === 1) {
    const out = new Float32Array(N);
    out.set(channels[0]);
    return out;
  }

  const out = new Float32Array(N * C);
  for (let i = 0; i < N; i++) {
    const base = i * C;
    for (let c = 0; c < C; c++) out[base + c] = channels[c][i];
  }
  return out;
}

function deinterleave(samples: Float32Array, channelCount: number): Float32Array[] {
  if (!(samples instanceof Float32Array)) {
    throw new TypeError("parabun:audio.deinterleave: samples must be a Float32Array");
  }
  if (!Number.isInteger(channelCount) || channelCount < 1) {
    throw new RangeError(`parabun:audio.deinterleave: channelCount must be a positive integer; got ${channelCount}`);
  }
  if (samples.length % channelCount !== 0) {
    throw new RangeError(
      `parabun:audio.deinterleave: samples.length (${samples.length}) is not a multiple of channelCount (${channelCount})`,
    );
  }
  const N = samples.length / channelCount;
  if (channelCount === 1) {
    // Mono fast path: a copy keeps the planar return type honest (caller
    // shouldn't have to worry about whether they got back the same buffer).
    const ch = new Float32Array(N);
    ch.set(samples);
    return [ch];
  }
  const out: Float32Array[] = [];
  for (let c = 0; c < channelCount; c++) out.push(new Float32Array(N));
  for (let i = 0; i < N; i++) {
    const base = i * channelCount;
    for (let c = 0; c < channelCount; c++) out[c][i] = samples[base + c];
  }
  return out;
}

// ─── Mix ───────────────────────────────────────────────────────────────────
// Combine N parallel audio streams into one. Each output sample is the
// (optionally weighted) sum of the input samples at that position.
// Standard use cases: conference-call mixing (each participant is a
// track), music + voice ducking, sample triggering.
//
// All tracks must be the same length — there's no implicit zero-padding;
// callers who need different-length tracks should resample / pad first.
//
// Clipping behavior:
//   "hard" (default) — clamp to [-1, 1]. Fast, but bright distortion if
//                      the mix is hot.
//   "soft"           — tanh saturation. y = tanh(x). Smoother distortion,
//                      preferred for music; tanh(2)≈0.96 so the output
//                      asymptotes to ±1 without ever quite reaching it.
//   "none"           — pass through unclamped. Caller takes responsibility
//                      for keeping the levels in range (or post-processing
//                      with audio.Gain).

type MixOptions = {
  /**
   * Per-track linear gain. Length must match `tracks`. Default: 1.0 for
   * every track (raw sum). Negative values invert phase — useful for
   * out-of-phase cancellation but uncommon in normal mixing.
   */
  gains?: number[];
  /** Clipping mode for the output. Default "hard". */
  clip?: "hard" | "soft" | "none";
};

function mix(tracks: Float32Array[], opts: MixOptions = {}): Float32Array {
  if (!Array.isArray(tracks)) {
    throw new TypeError("parabun:audio.mix: tracks must be an array of Float32Arrays");
  }
  if (typeof opts !== "object" || opts === null) {
    throw new TypeError("parabun:audio.mix: opts must be an object");
  }
  if (tracks.length === 0) return new Float32Array(0);

  const N = tracks[0].length;
  for (let i = 0; i < tracks.length; i++) {
    if (!(tracks[i] instanceof Float32Array)) {
      throw new TypeError(`parabun:audio.mix: tracks[${i}] must be a Float32Array`);
    }
    if (tracks[i].length !== N) {
      throw new RangeError(
        `parabun:audio.mix: all tracks must have the same length; tracks[0] is ${N}, tracks[${i}] is ${tracks[i].length}`,
      );
    }
  }

  const gains = opts.gains;
  if (gains !== undefined) {
    if (!Array.isArray(gains)) {
      throw new TypeError("parabun:audio.mix: opts.gains must be an array of numbers");
    }
    if (gains.length !== tracks.length) {
      throw new RangeError(
        `parabun:audio.mix: opts.gains length ${gains.length} must match tracks length ${tracks.length}`,
      );
    }
    for (let t = 0; t < gains.length; t++) {
      if (typeof gains[t] !== "number" || !Number.isFinite(gains[t])) {
        throw new TypeError(`parabun:audio.mix: opts.gains[${t}] must be a finite number`);
      }
    }
  }

  const clip = opts.clip ?? "hard";
  if (clip !== "hard" && clip !== "soft" && clip !== "none") {
    throw new TypeError(`parabun:audio.mix: opts.clip must be "hard", "soft", or "none"; got ${JSON.stringify(clip)}`);
  }

  const out = new Float32Array(N);
  // Two paths so the inner loop stays as tight as possible. The unweighted
  // path also lets us skip the multiply per track.
  if (gains === undefined) {
    for (let i = 0; i < N; i++) {
      let s = 0;
      for (let t = 0; t < tracks.length; t++) s += tracks[t][i];
      out[i] = s;
    }
  } else {
    for (let i = 0; i < N; i++) {
      let s = 0;
      for (let t = 0; t < tracks.length; t++) s += tracks[t][i] * gains[t];
      out[i] = s;
    }
  }

  if (clip === "hard") {
    for (let i = 0; i < N; i++) {
      const v = out[i];
      if (v > 1) out[i] = 1;
      else if (v < -1) out[i] = -1;
    }
  } else if (clip === "soft") {
    // tanh saturation — smooth knee, asymptotes to ±1.
    for (let i = 0; i < N; i++) out[i] = Math.tanh(out[i]);
  }
  // "none" — leave samples as-is.
  return out;
}

// ─── PCM type conversion (i16 ⇄ f32) ──────────────────────────────────────
// OS audio APIs (ALSA, CoreAudio, WASAPI) and most file containers
// (PCM-16 WAV, telephony formats) deliver Int16Array PCM in [-32768,
// 32767]. The DSP code in this module — and most modern audio APIs
// (Web Audio, Opus, our codec stack) — wants Float32Array in [-1, 1].
//
// Conventions match readWav / writeWav exactly so callers can use the
// helpers at OS boundaries and the file paths at file boundaries
// without subtle drift between the two:
//   i16 → f32: divide by 32768 (symmetric negative; +1 lands at 0.99997)
//   f32 → i16: asymmetric — multiply by 32768 on negatives, 32767 on
//              positives, clamp out-of-range. -1.0 → -32768, +1.0 →
//              +32767, both at the i16 representable limits.

function i16ToF32(input: Int16Array): Float32Array {
  if (!(input instanceof Int16Array)) {
    throw new TypeError("parabun:audio.i16ToF32: input must be an Int16Array");
  }
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) out[i] = input[i] / 32768;
  return out;
}

function f32ToI16(input: Float32Array): Int16Array {
  if (!(input instanceof Float32Array)) {
    throw new TypeError("parabun:audio.f32ToI16: input must be a Float32Array");
  }
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = input[i];
    let q: number;
    if (s < 0) {
      q = Math.round(s * 32768);
      if (q < -32768) q = -32768;
    } else {
      q = Math.round(s * 32767);
      if (q > 32767) q = 32767;
    }
    out[i] = q;
  }
  return out;
}

// ─── Level measurement (peak / RMS) ───────────────────────────────────────
// Two scalar summaries of a buffer's loudness:
//   peak — max(|x|), the largest instantaneous excursion. Single-sample
//          spikes dominate the answer, so peak is the right metric for
//          "is this signal about to clip?" questions.
//   rms  — sqrt(mean(x²)), the root-mean-square. Tracks perceived
//          loudness over the whole buffer; not biased by individual
//          spikes.
//
// Both treat empty input as 0 (no signal). NaN samples propagate through
// max-comparison as no-ops on `peak` (since `NaN > m` is always false)
// and into the sum on `rms` (so any NaN poisons the result with NaN);
// callers who care should filter NaNs upstream.

function peak(samples: Float32Array): number {
  if (!(samples instanceof Float32Array)) {
    throw new TypeError("parabun:audio.peak: samples must be a Float32Array");
  }
  let m = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    const a = v < 0 ? -v : v;
    if (a > m) m = a;
  }
  return m;
}

function rms(samples: Float32Array): number {
  if (!(samples instanceof Float32Array)) {
    throw new TypeError("parabun:audio.rms: samples must be a Float32Array");
  }
  const n = samples.length;
  if (n === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const v = samples[i];
    sumSq += v * v;
  }
  return Math.sqrt(sumSq / n);
}

// ─── Windowed envelope extraction ─────────────────────────────────────────
// Produces an amplitude envelope by sliding a window across the input and
// summarizing each window with either its peak (max |x|) or its RMS.
// Returned as a Float32Array, one sample per window position.
//
// Two parameters control the trade-off:
//   windowSize  — how many input samples each envelope sample averages
//                 over. Bigger = smoother envelope, less time resolution.
//   hopSize     — how many samples to advance between windows. hopSize ==
//                 windowSize is non-overlapping (the cheap default);
//                 hopSize < windowSize gives an oversampled envelope
//                 with smoother visual transitions but more output
//                 samples.
//
// Standard uses: drawing a waveform overview (use peak mode + a coarse
// hop), tagging voice activity (RMS over ~25 ms windows), gating noise,
// or feeding a downstream level meter without forcing it to look at
// every sample.

type EnvelopeOptions = {
  /** Samples per window. Default 1024 (≈ 21 ms at 48 kHz). */
  windowSize?: number;
  /** Samples between window starts. Default = windowSize (non-overlapping). */
  hopSize?: number;
  /** "peak" (default) tracks transients; "rms" tracks loudness. */
  mode?: "peak" | "rms";
};

function envelope(samples: Float32Array, opts: EnvelopeOptions = {}): Float32Array {
  if (!(samples instanceof Float32Array)) {
    throw new TypeError("parabun:audio.envelope: samples must be a Float32Array");
  }
  if (typeof opts !== "object" || opts === null) {
    throw new TypeError("parabun:audio.envelope: opts must be an object");
  }
  const windowSize = opts.windowSize ?? 1024;
  const hopSize = opts.hopSize ?? windowSize;
  const mode = opts.mode ?? "peak";
  if (!Number.isInteger(windowSize) || windowSize < 1) {
    throw new RangeError(`parabun:audio.envelope: windowSize must be a positive integer; got ${windowSize}`);
  }
  if (!Number.isInteger(hopSize) || hopSize < 1) {
    throw new RangeError(`parabun:audio.envelope: hopSize must be a positive integer; got ${hopSize}`);
  }
  if (mode !== "peak" && mode !== "rms") {
    throw new TypeError(`parabun:audio.envelope: mode must be "peak" or "rms"; got ${JSON.stringify(mode)}`);
  }

  const N = samples.length;
  if (N < windowSize) return new Float32Array(0);
  // Number of full windows that fit. Last window starts at index
  // (numWindows - 1) * hopSize and extends windowSize samples; that
  // must not exceed N.
  const numWindows = Math.floor((N - windowSize) / hopSize) + 1;
  const out = new Float32Array(numWindows);
  if (mode === "peak") {
    for (let w = 0; w < numWindows; w++) {
      const start = w * hopSize;
      let m = 0;
      for (let i = 0; i < windowSize; i++) {
        const v = samples[start + i];
        const a = v < 0 ? -v : v;
        if (a > m) m = a;
      }
      out[w] = m;
    }
  } else {
    // RMS — sum of squares / window then sqrt.
    for (let w = 0; w < numWindows; w++) {
      const start = w * hopSize;
      let sumSq = 0;
      for (let i = 0; i < windowSize; i++) {
        const v = samples[start + i];
        sumSq += v * v;
      }
      out[w] = Math.sqrt(sumSq / windowSize);
    }
  }
  return out;
}

// ─── Normalize ─────────────────────────────────────────────────────────────
// Whole-buffer one-shot leveling. Different intent from `Gain` (streaming
// AGC): normalize is what you reach for when you have a complete recording
// and want to bring its peak (or RMS) to a target level with a single
// uniform scaling factor — music files, voice memos, sample triggers,
// anywhere "level the whole thing now" beats "track the envelope".
//
// Modes:
//   "peak" (default) — gain = target / max(|x|). Output's peak is
//                      exactly `target`; quiet sections stay
//                      proportionally quiet. Distortion-free unless
//                      the caller picks target > 1 (which gets clipped).
//   "rms"            — gain = target / rms(x). Output's RMS is `target`,
//                      but peaks may exceed 1.0 — those get hard-clipped.
//                      Trade peak distortion for matched perceived
//                      loudness across files.

type NormalizeOptions = {
  /**
   * Target peak (or RMS) level in linear, in (0, 1]. Default 0.95 —
   * leaves a small headroom under unity so a downstream encoder doesn't
   * have to deal with samples right at the edge.
   */
  target?: number;
  /** "peak" (default) leaves dynamics intact; "rms" matches loudness. */
  mode?: "peak" | "rms";
};

function normalize(samples: Float32Array, opts: NormalizeOptions = {}): Float32Array {
  if (!(samples instanceof Float32Array)) {
    throw new TypeError("parabun:audio.normalize: samples must be a Float32Array");
  }
  if (typeof opts !== "object" || opts === null) {
    throw new TypeError("parabun:audio.normalize: opts must be an object");
  }
  const target = opts.target ?? 0.95;
  const mode = opts.mode ?? "peak";
  if (!(target > 0 && target <= 1) || !Number.isFinite(target)) {
    throw new RangeError(`parabun:audio.normalize: target must be in (0, 1]; got ${target}`);
  }
  if (mode !== "peak" && mode !== "rms") {
    throw new TypeError(`parabun:audio.normalize: mode must be "peak" or "rms"; got ${JSON.stringify(mode)}`);
  }
  const N = samples.length;
  const out = new Float32Array(N);
  if (N === 0) return out;

  const metric = mode === "peak" ? peak(samples) : rms(samples);

  if (metric === 0) {
    // All-silent input — nothing to normalize. Return a fresh-buffer copy
    // so caller mutations don't leak back into the input.
    out.set(samples);
    return out;
  }

  const gain = target / metric;
  for (let i = 0; i < N; i++) {
    let y = samples[i] * gain;
    if (y > 1) y = 1;
    else if (y < -1) y = -1;
    out[i] = y;
  }
  return out;
}

// ─── Auto Gain Control ─────────────────────────────────────────────────────
// Voice-call mics deliver wildly varying levels — distance from the mic,
// room loudness, headset vs laptop builtin, you name it. AGC tracks the
// signal envelope and applies a smoothly-varying gain to bring the output
// to a target loudness. This is the textbook companion to Denoiser in a
// voice-call capture pipeline:
//
//   const den  = new audio.Denoiser();
//   const agc  = new audio.Gain({ targetLevel: 0.1 });
//   for each 10ms frame at 48 kHz mono:
//     den.process(frame);         // suppress noise
//     agc.process(frame);         // normalize loudness
//
// Algorithm: per-sample one-pole envelope detector (asymmetric attack /
// release time constants), then `gain = targetLevel / envelope` clamped
// to [0, maxGain], smoothed by another one-pole, then applied with hard
// clipping at ±1 to prevent overshoot.
//
// "Peak follower" not "RMS follower" because for speech the instantaneous
// peaks are what clip, and the perceptual difference between RMS and peak
// AGC at conversational levels is small.
//
// Stateful — keep one Gain instance per audio stream so attack/release
// state persists across frame boundaries.

type GainOptions = {
  /**
   * Target output envelope (linear, 0..1). Default 0.1 — about -20 dBFS,
   * the level voice-call apps typically aim for. Higher values = louder
   * output but more risk of clipping.
   */
  targetLevel?: number;
  /**
   * Maximum amplification factor. Caps how much quiet input gets boosted —
   * without it, near-silence would be amplified to full noise floor.
   * Default 32 (≈ +30 dB).
   */
  maxGain?: number;
  /**
   * How fast (ms) the envelope follower reacts to level *increases*.
   * Short attack catches transients before they clip the output.
   * Default 5 ms.
   */
  attackMs?: number;
  /**
   * How fast (ms) the envelope follower decays after a level *decrease*.
   * Longer release avoids "breathing" artifacts where soft passages get
   * pumped up between words. Default 100 ms.
   */
  releaseMs?: number;
  /**
   * Sample rate, used to convert attack/release times to per-sample
   * smoothing coefficients. Default 48000 (matches Denoiser).
   */
  sampleRate?: number;
  /**
   * Floor on the envelope detector to avoid amplifying pure noise into
   * audible hiss. If the envelope drops below this, gain holds steady
   * rather than chasing the noise floor up. Default 1e-4.
   */
  noiseFloor?: number;
};

function timeConstantToCoeff(timeMs: number, sampleRate: number): number {
  // Standard one-pole IIR coefficient: e^(-1 / (sr * t_seconds))
  // gives an envelope that reaches 1 - 1/e (~63%) of the target after
  // t_seconds — the canonical "time constant" definition.
  if (timeMs <= 0) return 0;
  return Math.exp(-1 / (sampleRate * (timeMs / 1000)));
}

class Gain {
  #targetLevel: number;
  #maxGain: number;
  #noiseFloor: number;
  #attackCoeff: number;
  #releaseCoeff: number;
  // Persistent state — must survive across .process() calls so attack /
  // release behavior is correct across frame boundaries.
  #envelope: number;
  #gain: number;

  constructor(opts: GainOptions = {}) {
    if (typeof opts !== "object" || opts === null) {
      throw new TypeError("parabun:audio.Gain: opts must be an object");
    }
    this.#targetLevel = opts.targetLevel ?? 0.1;
    this.#maxGain = opts.maxGain ?? 32;
    this.#noiseFloor = opts.noiseFloor ?? 1e-4;
    const sr = opts.sampleRate ?? 48000;
    if (this.#targetLevel <= 0 || this.#targetLevel > 1) {
      throw new RangeError(`parabun:audio.Gain: targetLevel must be in (0, 1]; got ${this.#targetLevel}`);
    }
    if (this.#maxGain <= 0) {
      throw new RangeError(`parabun:audio.Gain: maxGain must be > 0; got ${this.#maxGain}`);
    }
    if (sr <= 0) {
      throw new RangeError(`parabun:audio.Gain: sampleRate must be > 0; got ${sr}`);
    }
    this.#attackCoeff = timeConstantToCoeff(opts.attackMs ?? 5, sr);
    this.#releaseCoeff = timeConstantToCoeff(opts.releaseMs ?? 100, sr);
    this.#envelope = 0;
    this.#gain = 1;
  }

  /**
   * Apply AGC to a frame in place. Frame can be any length; the envelope
   * and gain state persist across calls, so feeding 10ms or 1s frames
   * gives the same long-term behavior. Returns the gain applied to the
   * last sample (useful for telemetry / tests).
   */
  process(frame: Float32Array): number {
    if (!(frame instanceof Float32Array)) {
      throw new TypeError("parabun:audio.Gain.process: frame must be a Float32Array");
    }
    let env = this.#envelope;
    let gainState = this.#gain;
    const target = this.#targetLevel;
    const maxG = this.#maxGain;
    const floor = this.#noiseFloor;
    const aA = this.#attackCoeff;
    const aR = this.#releaseCoeff;
    // Gain smoothing: use the same release coefficient so gain glides
    // back up smoothly after a loud passage instead of jumping the
    // moment the envelope drops. Snappier-than-envelope gain smoothing
    // would re-introduce the "pumping" we're explicitly avoiding.
    const aG = aR;
    for (let i = 0; i < frame.length; i++) {
      const x = frame[i];
      const ax = x < 0 ? -x : x;
      // Asymmetric envelope: attack on rise (catch transients fast),
      // release on fall (slow decay so soft tails don't get pumped).
      const coeff = ax > env ? aA : aR;
      env = coeff * env + (1 - coeff) * ax;
      // Compute target gain. Below the noise floor we hold steady
      // rather than chasing the floor up to maxGain.
      let targetGain = env > floor ? target / env : gainState;
      if (targetGain > maxG) targetGain = maxG;
      if (targetGain < 0) targetGain = 0;
      gainState = aG * gainState + (1 - aG) * targetGain;
      let y = x * gainState;
      if (y > 1) y = 1;
      else if (y < -1) y = -1;
      frame[i] = y;
    }
    this.#envelope = env;
    this.#gain = gainState;
    return gainState;
  }

  /** Current envelope reading (for telemetry / debug). */
  get envelope(): number {
    return this.#envelope;
  }

  /** Current applied gain (for telemetry / debug). */
  get gain(): number {
    return this.#gain;
  }

  /** Reset envelope + gain state. Useful when a new stream starts. */
  reset(): void {
    this.#envelope = 0;
    this.#gain = 1;
  }
}

// ─── Compressor ───────────────────────────────────────────────────────────
// Feed-forward dynamic range compressor. Above the threshold the signal is
// scaled by a ratio in dB-space — input N dB above threshold ends up at
// N/ratio dB above threshold. Hard knee for v1; soft knee with curvature
// near the threshold can land later.
//
// Useful for evening out a loud-soft signal (voice, mic capture) before it
// hits a downstream encoder or transmission. Different from Gain (AGC):
//   - Gain  — chases a target level by amplifying everything; quiet signal
//             gets boosted to the target.
//   - Compressor — only attenuates LOUD parts; quiet signal passes through
//                  unchanged. Use Compressor before Gain in a vocal chain
//                  if you want both: tame peaks first, then ride level.

type CompressorOptions = {
  /** Sample rate (Hz). Required — used to convert attack/release ms → coefficients. */
  sampleRate: number;
  /** Threshold in dBFS. Default -20 dB. Levels above this get reduced. */
  thresholdDb?: number;
  /** Compression ratio above threshold. 4 = 4:1 (4 dB in → 1 dB out above thresh).
   *  Use Infinity for limiting, but the dedicated Limiter class is more honest. */
  ratio?: number;
  /** Attack time in milliseconds — how fast gain reduction engages. Default 5 ms. */
  attackMs?: number;
  /** Release time in milliseconds — how fast gain returns. Default 50 ms. */
  releaseMs?: number;
  /** Makeup gain applied AFTER reduction (dB). Default 0. Use to compensate
   *  for the level lost to compression. */
  makeupDb?: number;
};

class Compressor {
  #threshold: number; // linear
  #invRatio: number;
  #attackCoeff: number;
  #releaseCoeff: number;
  #makeup: number; // linear
  #envelope: number = 0;

  constructor(opts: CompressorOptions) {
    if (typeof opts !== "object" || opts === null) {
      throw new TypeError("parabun:audio.Compressor: opts must be an object");
    }
    const sr = opts.sampleRate;
    if (typeof sr !== "number" || sr <= 0) {
      throw new RangeError(`parabun:audio.Compressor: sampleRate must be > 0; got ${sr}`);
    }
    const threshDb = opts.thresholdDb ?? -20;
    const ratio = opts.ratio ?? 4;
    if (ratio < 1 || !Number.isFinite(ratio)) {
      throw new RangeError(
        `parabun:audio.Compressor: ratio must be a finite number >= 1; got ${ratio}. Use the Limiter class for hard limiting.`,
      );
    }
    this.#threshold = Math.pow(10, threshDb / 20);
    this.#invRatio = 1 / ratio;
    this.#attackCoeff = timeConstantToCoeff(opts.attackMs ?? 5, sr);
    this.#releaseCoeff = timeConstantToCoeff(opts.releaseMs ?? 50, sr);
    this.#makeup = Math.pow(10, (opts.makeupDb ?? 0) / 20);
  }

  /**
   * Apply compression to a frame in place. Envelope state persists across
   * calls so attack / release behavior is correct at frame boundaries.
   * Returns the gain reduction (in dB) applied to the last sample —
   * negative values mean the signal was attenuated.
   */
  process(frame: Float32Array): number {
    if (!(frame instanceof Float32Array)) {
      throw new TypeError("parabun:audio.Compressor.process: frame must be a Float32Array");
    }
    let env = this.#envelope;
    const t = this.#threshold;
    const invR = this.#invRatio;
    const aA = this.#attackCoeff;
    const aR = this.#releaseCoeff;
    const m = this.#makeup;
    let lastGr = 1;
    for (let i = 0; i < frame.length; i++) {
      const x = frame[i];
      const ax = x < 0 ? -x : x;
      // Peak envelope follower with asymmetric attack / release.
      const coeff = ax > env ? aA : aR;
      env = coeff * env + (1 - coeff) * ax;
      // Gain reduction: above threshold, linear ratio of (env/t)^(1/r - 1).
      // Below threshold, gr = 1 (no reduction).
      let gr = 1;
      if (env > t) {
        gr = Math.pow(env / t, invR - 1);
      }
      lastGr = gr;
      frame[i] = x * gr * m;
    }
    this.#envelope = env;
    return 20 * Math.log10(Math.max(lastGr, 1e-9));
  }

  get envelope(): number {
    return this.#envelope;
  }

  reset(): void {
    this.#envelope = 0;
  }
}

// ─── Limiter ──────────────────────────────────────────────────────────────
// Brick-wall peak limiter. Same envelope follower as Compressor, but with
// a very fast attack and a hard ceiling — anything above the ceiling gets
// pulled back to it. Use as the last stage of a chain to guarantee the
// output won't clip a downstream encoder / DAC.
//
// No lookahead in v1 — a brief overshoot can occur on instantaneous
// transients (~ attackMs / 2 worth of samples). Lookahead would mean
// delaying the audio by N samples and computing the envelope on the
// FUTURE samples; landing later if there's demand for true brick-wall.

type LimiterOptions = {
  sampleRate: number;
  /** Output ceiling in dBFS. Default -1 dB (slight headroom from full scale). */
  ceilingDb?: number;
  /** Attack time in ms. Default 0.5 ms (≈24 samples at 48 kHz — fast). */
  attackMs?: number;
  /** Release time in ms. Default 50 ms. */
  releaseMs?: number;
};

class Limiter {
  #ceiling: number;
  #attackCoeff: number;
  #releaseCoeff: number;
  #envelope: number = 0;

  constructor(opts: LimiterOptions) {
    if (typeof opts !== "object" || opts === null) {
      throw new TypeError("parabun:audio.Limiter: opts must be an object");
    }
    const sr = opts.sampleRate;
    if (typeof sr !== "number" || sr <= 0) {
      throw new RangeError(`parabun:audio.Limiter: sampleRate must be > 0; got ${sr}`);
    }
    const ceilDb = opts.ceilingDb ?? -1;
    if (ceilDb > 0) {
      throw new RangeError(`parabun:audio.Limiter: ceilingDb must be <= 0 (sub-fullscale); got ${ceilDb}`);
    }
    this.#ceiling = Math.pow(10, ceilDb / 20);
    this.#attackCoeff = timeConstantToCoeff(opts.attackMs ?? 0.5, sr);
    this.#releaseCoeff = timeConstantToCoeff(opts.releaseMs ?? 50, sr);
  }

  /**
   * Apply limiting in place. Returns the maximum absolute output sample
   * seen across the frame — useful for verifying the ceiling held.
   *
   * Uses an instant-attack envelope (no smoothing on rises) so a sudden
   * peak is always caught and the ceiling is guaranteed even without a
   * lookahead buffer. The release is smoothed via the configured time
   * constant so gain doesn't snap back to unity audibly. The `attackMs`
   * option is preserved for API compatibility but has no audible effect
   * in v1 — true attack-shaped limiting needs lookahead, which is
   * follow-up work.
   */
  process(frame: Float32Array): number {
    if (!(frame instanceof Float32Array)) {
      throw new TypeError("parabun:audio.Limiter.process: frame must be a Float32Array");
    }
    let env = this.#envelope;
    const c = this.#ceiling;
    const aR = this.#releaseCoeff;
    let peak = 0;
    for (let i = 0; i < frame.length; i++) {
      const x = frame[i];
      const ax = x < 0 ? -x : x;
      // Instant-rise envelope so the very first peak above the ceiling
      // is caught and reduced.
      if (ax > env) env = ax;
      else env = aR * env + (1 - aR) * ax;
      const gain = env > c ? c / env : 1;
      const y = x * gain;
      const ay = y < 0 ? -y : y;
      if (ay > peak) peak = ay;
      frame[i] = y;
    }
    this.#envelope = env;
    return peak;
  }

  get envelope(): number {
    return this.#envelope;
  }

  reset(): void {
    this.#envelope = 0;
  }
}

// ─── I/O: capture + playback (ALSA on Linux, CoreAudio on macOS) ──────────
// Real-time capture and playback for the embedded edge runtime. These are
// scaffolded against ALSA on Linux first because the bring-up target is a
// USB headset on a Pi 5 / Jetson; CoreAudio + WASAPI follow once the Linux
// path is solid.
//
//   const devs = await audio.devices();
//   //   { input:  [ { id: "hw:1,0", name: "Logitech H390", channels: 1, rates: [8000, 16000, 44100, 48000] } ],
//   //     output: [ { id: "hw:1,0", name: "Logitech H390", channels: 2, rates: [44100, 48000] } ] }
//
//   await using mic = await audio.capture({ device: "hw:1,0", sampleRate: 16000, channels: 1 });
//   for await (const chunk of mic.frames({ frameMs: 20 })) {
//     // chunk: Float32Array, length = sampleRate * frameMs / 1000 * channels
//   }
//
//   await using spk = await audio.play({ sampleRate: 48000, channels: 2 });
//   await spk.write(samples);   // returns when buffer drains
//
// Frames are pulled from ALSA's snd_pcm_readi ring buffer. Default period
// is 20 ms — short enough for VAD / wake-word, long enough that overruns
// are rare under normal Pi load.

type AudioDevice = {
  /** Platform-specific identifier. ALSA: "hw:CARD,DEV" or "default". */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Channel count the device exposes. */
  channels: number;
  /** Sample rates the device can negotiate (Hz). */
  rates: number[];
};

type DeviceList = {
  input: AudioDevice[];
  output: AudioDevice[];
};

type CaptureOptions = {
  /** Device id from devices().input. Defaults to system default. */
  device?: string;
  /** Capture sample rate in Hz. Default 16000 (right for VAD / speech). */
  sampleRate?: number;
  /** Channel count. Default 1 (mono — what headset mics produce). */
  channels?: number;
  /**
   * ALSA period in milliseconds — chunk size for the kernel ring buffer.
   * Smaller = lower latency but more wakeups; larger = more headroom.
   * Default 20.
   */
  periodMs?: number;
  /** Number of periods kept in the ring buffer. Default 4. */
  bufferPeriods?: number;
};

type PlaybackOptions = {
  device?: string;
  sampleRate?: number;
  channels?: number;
  periodMs?: number;
  bufferPeriods?: number;
};

type CaptureFrame = {
  /** Interleaved Float32 samples in [-1, 1]. */
  samples: Float32Array;
  /** Monotonic timestamp from the kernel, in milliseconds. */
  timestampMs: number;
  /** True if the kernel reported an overrun before this frame. */
  overrun: boolean;
};

interface CaptureStream extends AsyncDisposable {
  readonly sampleRate: number;
  readonly channels: number;
  readonly device: string;
  /**
   * Per-frame RMS level, normalized to [0, 1]. Updates on every emitted
   * frame; subscribe via `peakLevel.subscribe(cb)` for a VU meter, or
   * read inside an `effect { ... }` for barge-in heuristics. Inert
   * (no further updates) once the stream is closed.
   */
  readonly peakLevel: Signal<number>;
  /**
   * True once the first frame has been emitted, false again on close().
   * Useful for "mic is live" status indicators that don't want to wait
   * for the first sample to confirm the device opened.
   */
  readonly active: Signal<boolean>;
  /** Stream interleaved Float32 frames as an async iterator. */
  frames(opts?: { frameMs?: number }): AsyncIterableIterator<CaptureFrame>;
  /** Stop capturing and release the device. Idempotent. */
  close(): Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
}

interface PlaybackStream extends AsyncDisposable {
  readonly sampleRate: number;
  readonly channels: number;
  readonly device: string;
  /**
   * Current depth of the ALSA playback buffer in milliseconds. Updates when
   * the underlying buffer changes — after `write()`, `drain()`, `stop()` —
   * and on a low-frequency poll while audio is queued. Subscribe via
   * `queuedMs.subscribe(cb)` for backpressure UIs (progress bar of how full
   * the audio queue is) or read inside an `effect { ... }` for queue-aware
   * scheduling decisions.
   *
   * Approximate, not exact — represents the *measurement* taken at the
   * most recent ALSA-touching operation, plus the polled samples. The
   * actual queue drains continuously regardless of when we sampled.
   */
  readonly queuedMs: Signal<number>;
  /** Write interleaved Float32 samples; resolves when bytes have drained into ALSA. */
  write(samples: Float32Array): Promise<void>;
  /** Block until everything written has been played out. */
  drain(): Promise<void>;
  /**
   * Discard whatever is queued in the kernel buffer immediately and re-prepare
   * the stream so subsequent `write()` calls work. Use for barge-in: the
   * caller has detected the user starting to speak and wants to cut the
   * current TTS short. In contrast to `drain()` (waits for the buffer to play
   * out) and `close()` (releases the device), `stop()` is the cancel verb.
   */
  stop(): Promise<void>;
  /** Stop playback and release the device. Idempotent. */
  close(): Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
}

// FinalizationRegistry backstop: if a stream drops without close(), the
// kernel PCM handle is freed at GC time rather than leaking.
const pcmRegistry = new FinalizationRegistry<bigint>(handle => {
  if (handle !== 0n) io.closePcm(handle);
});

function periodFromMs(periodMs: number, sampleRate: number): number {
  // ALSA likes powers of two for periods on most hardware; round to the
  // nearest power of two of the frame target. 20ms @ 48kHz = 960 → 1024.
  const target = Math.max(64, Math.round((sampleRate * periodMs) / 1000));
  let p = 1;
  while (p < target) p <<= 1;
  return p;
}

// Callable signal: `audio.devices()` returns a Promise<DeviceList> for the
// existing one-shot pattern; `audio.devices.subscribe(cb)` / `.get()` /
// `.peek()` give a hotplug-aware reactive view. The watcher is lazy — a
// pure call (`audio.devices()`) never starts an inotify watch; the first
// signal-API call does. PLAN-module-signals item 6.
type DevicesSignal = {
  (): Promise<DeviceList>;
  get(): DeviceList;
  peek(): DeviceList;
  subscribe(cb: (v: DeviceList) => void): () => void;
};

const listDevices: DevicesSignal = (() => {
  let sig: WritableSignal<DeviceList> | null = null;
  let pendingFlush = false;
  function ensureWatch(): WritableSignal<DeviceList> {
    if (sig) return sig;
    sig = signals.signal(io.listDevices() as DeviceList);
    // Linux: /dev/snd/ lists cards (cardN/, controlCN, pcmCNDp/c). Any
    // add/remove fires here, so we re-enumerate. node:fs.watch is inotify
    // under the hood on Linux. macOS / Windows native paths land alongside
    // CoreAudio / WASAPI in a follow-up.
    try {
      const fs = require("node:fs");
      const watcher = fs.watch("/dev/snd", () => {
        if (pendingFlush) return;
        pendingFlush = true;
        // Coalesce burst — one udev plug fires several fs events.
        queueMicrotask(() => {
          pendingFlush = false;
          try {
            sig!.set(io.listDevices() as DeviceList);
          } catch {}
        });
      });
      // Permission-denied or transient inotify errors are non-fatal —
      // swallow them rather than letting them crash the process.
      watcher.on?.("error", () => {});
      // Don't pin the event loop on a module-level watcher — same shape
      // as Node timers' .unref(). A subscriber alone shouldn't hold the
      // process open; explicit `await using` on a stream / `bot.run()`
      // already keeps it alive when needed.
      watcher.unref?.();
    } catch {
      // /dev/snd may not exist (Darwin/Windows, or container without ALSA).
      // Signal stays at the initial snapshot — `audio.devices()` keeps
      // working, just no hotplug events.
    }
    return sig;
  }
  const fn = function devices(): Promise<DeviceList> {
    return Promise.resolve(sig ? sig.peek() : (io.listDevices() as DeviceList));
  } as DevicesSignal;
  fn.get = () => ensureWatch().get();
  fn.peek = () => ensureWatch().peek();
  fn.subscribe = (cb: (v: DeviceList) => void) => ensureWatch().subscribe(cb);
  return fn;
})();

class CaptureStreamImpl implements CaptureStream {
  #handle: bigint;
  sampleRate: number;
  channels: number;
  device: string;
  #periodFrames: number;
  #peakLevel: WritableSignal<number>;
  #active: WritableSignal<boolean>;

  // Read-only signal accessors. The internal #-prefixed fields are
  // WritableSignal to allow `.set()` from frames()/close(); the public
  // surface exposes them as `Signal<T>` so consumers can `.get()` and
  // `.subscribe()` without being able to spoof a value.
  get peakLevel(): Signal<number> {
    return this.#peakLevel;
  }

  get active(): Signal<boolean> {
    return this.#active;
  }

  constructor(handle: bigint, device: string, sampleRate: number, channels: number, periodFrames: number) {
    this.#handle = handle;
    this.device = device;
    this.sampleRate = sampleRate;
    this.channels = channels;
    this.#periodFrames = periodFrames;
    this.#peakLevel = signals.signal(0);
    this.#active = signals.signal(false);
    pcmRegistry.register(this, handle, this);
  }

  async *frames(opts?: { frameMs?: number }): AsyncIterableIterator<CaptureFrame> {
    const frames =
      opts?.frameMs != null ? Math.max(64, Math.round((this.sampleRate * opts.frameMs) / 1000)) : this.#periodFrames;
    let firstFrame = true;
    // Rate-limit peak updates to ~10 Hz so a 60 fps consumer effect
    // doesn't run on every 20 ms frame at 16 kHz. See PLAN-module-signals
    // §"Open decisions: fps / peakLevel update rate".
    let lastEmitMs = 0;
    while (this.#handle !== 0n) {
      const r = io.captureRead(this.#handle, frames);
      if (firstFrame) {
        this.#active.set(true);
        firstFrame = false;
      }
      const now = r.timestampMs;
      if (now - lastEmitMs >= 100 || lastEmitMs === 0) {
        // RMS, normalized: samples are already in [-1, 1].
        let sumSq = 0;
        const s = r.samples;
        for (let i = 0; i < s.length; i++) sumSq += s[i] * s[i];
        const rms = s.length > 0 ? Math.sqrt(sumSq / s.length) : 0;
        this.#peakLevel.set(rms);
        lastEmitMs = now;
      }
      yield { samples: r.samples, timestampMs: r.timestampMs, overrun: r.overrun };
    }
  }

  async close(): Promise<void> {
    const h = this.#handle;
    this.#handle = 0n;
    if (h !== 0n) {
      pcmRegistry.unregister(this);
      io.closePcm(h);
      this.#active.set(false);
    }
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.close();
  }
}

class PlaybackStreamImpl implements PlaybackStream {
  #handle: bigint;
  sampleRate: number;
  channels: number;
  device: string;
  #queuedMs: WritableSignal<number>;
  #lastEmitMs: number = 0;
  #pollTimer: ReturnType<typeof setInterval> | null = null;

  get queuedMs(): Signal<number> {
    return this.#queuedMs;
  }

  constructor(handle: bigint, device: string, sampleRate: number, channels: number) {
    this.#handle = handle;
    this.device = device;
    this.sampleRate = sampleRate;
    this.channels = channels;
    this.#queuedMs = signals.signal(0);
    // Low-frequency poll so the signal naturally trends to zero as the
    // buffer drains between writes — without a 16 kHz mic-level update
    // rate. 100 ms matches the convention used by mic.peakLevel /
    // listen().noiseFloor (PLAN-module-signals "Open decisions").
    this.#pollTimer = setInterval(() => this.#sampleQueued(), 100);
    pcmRegistry.register(this, handle, this);
  }

  #sampleQueued(): void {
    if (this.#handle === 0n) return;
    const frames = io.playbackQueuedFrames(this.#handle) as number;
    const ms = (frames / this.sampleRate) * 1000;
    // Skip the .set if the value hasn't changed appreciably (sub-ms) —
    // saves subscribers a wakeup when the queue is steady.
    const prev = this.#queuedMs.peek();
    if (Math.abs(ms - prev) >= 1 || (ms === 0 && prev !== 0)) {
      this.#queuedMs.set(ms);
    }
  }

  async write(samples: Float32Array): Promise<void> {
    if (this.#handle === 0n) throw new Error("playback stream is closed");
    io.playbackWrite(this.#handle, samples);
    // Resample queue depth right after a write — the backpressure-aware
    // caller wants the post-write value, not the previous poll's stale
    // reading.
    this.#sampleQueued();
  }

  async drain(): Promise<void> {
    if (this.#handle !== 0n) {
      io.playbackDrain(this.#handle);
      // Buffer is empty after drain — cement the signal at 0 so any
      // subscriber waiting on "queuedMs reached zero" doesn't have to wait
      // up to 100 ms for the next poll tick.
      this.#queuedMs.set(0);
    }
  }

  async stop(): Promise<void> {
    if (this.#handle !== 0n) {
      io.playbackDrop(this.#handle);
      this.#queuedMs.set(0);
    }
  }

  async close(): Promise<void> {
    const h = this.#handle;
    this.#handle = 0n;
    if (this.#pollTimer) {
      clearInterval(this.#pollTimer);
      this.#pollTimer = null;
    }
    this.#queuedMs.set(0);
    if (h !== 0n) {
      pcmRegistry.unregister(this);
      io.closePcm(h);
    }
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.close();
  }
}

async function capture(opts: CaptureOptions = {}): Promise<CaptureStream> {
  const device = opts.device ?? "default";
  const sampleRate = opts.sampleRate ?? 16000;
  const channels = opts.channels ?? 1;
  const periodMs = opts.periodMs ?? 20;
  const bufferPeriods = opts.bufferPeriods ?? 4;
  const periodFrames = periodFromMs(periodMs, sampleRate);
  const handle: bigint = io.openCapture(device, sampleRate, channels, periodFrames, bufferPeriods);
  return new CaptureStreamImpl(handle, device, sampleRate, channels, periodFrames);
}

async function play(opts: PlaybackOptions = {}): Promise<PlaybackStream> {
  const device = opts.device ?? "default";
  const sampleRate = opts.sampleRate ?? 48000;
  const channels = opts.channels ?? 2;
  const periodMs = opts.periodMs ?? 20;
  const bufferPeriods = opts.bufferPeriods ?? 4;
  const periodFrames = periodFromMs(periodMs, sampleRate);
  const handle: bigint = io.openPlayback(device, sampleRate, channels, periodFrames, bufferPeriods);
  return new PlaybackStreamImpl(handle, device, sampleRate, channels);
}

export default {
  fft,
  ifft,
  readWav,
  writeWav,
  lowpass,
  highpass,
  bandpass,
  notch,
  mix,
  normalize,
  peak,
  rms,
  envelope,
  i16ToF32,
  f32ToI16,
  interleave,
  deinterleave,
  resample,
  spectrogram,
  melSpectrogram,
  detectVoice,
  decodeMp3,
  OpusEncoder,
  OpusDecoder,
  Denoiser,
  Gain,
  Compressor,
  Limiter,
  // I/O
  devices: listDevices,
  capture,
  play,
};
