// Whisper-class STT for bun:llm.
//
// Targets whisper.cpp's `ggml-*.bin` files (NOT GGUF — whisper.cpp's main
// distribution format is its older custom GGML container). Implements:
//
//   1. The .bin parser — magic + hparams + mel filterbank + GPT-2 BPE
//      vocab + per-tensor blob (f32 / f16 only — quantized .bin variants
//      need additional dequantization paths and aren't covered here).
//   2. Whisper's encoder: 2× conv1d (kernel=3, stride=1 then stride=2)
//      with GELU, sinusoidal position embedding, N transformer encoder
//      blocks (LayerNorm + multi-head self-attention + GELU MLP), final
//      LayerNorm.
//   3. Whisper's decoder: token + learned position embedding, N
//      transformer decoder blocks (LN + causal self-attn + LN +
//      cross-attn against encoder output + LN + GELU MLP), final
//      LayerNorm, output projection (tied with token embedding).
//   4. Greedy auto-regressive decoding with the standard prompt:
//      <|startoftranscript|> <|en|>* <|transcribe|> <|notimestamps|> ...
//      until <|endoftext|> or maxNewTokens.
//
// Pure-JS forward pass (no SIMD / GPU yet — Whisper-tiny is small enough
// that CPU is acceptable for one-shot transcription; a CUDA pipe-through
// follows the existing llama.ts pattern when this needs to be fast).

// Includes its own minimal FFT + mel preprocessing because the internal
// builtin bundler can't satisfy cross-builtin file imports (whisper.ts is
// inside `bun:llm` and can't pull in `bun:audio`'s mel implementation
// without code duplication via the `./` resolver). The duplicated
// surface is small (~80 lines for both) and self-contained so it
// doesn't drift from `bun/audio.ts`'s public mel API.

interface BinModel {
  magic: number;
  hparams: WhisperHParams;
  melFilters: Float32Array;
  vocab: string[];
  tensors: Map<string, { dims: number[]; ftype: number; data: Float32Array }>;
}

interface WhisperHParams {
  nVocab: number;
  nAudioCtx: number;
  nAudioState: number;
  nAudioHead: number;
  nAudioLayer: number;
  nTextCtx: number;
  nTextState: number;
  nTextHead: number;
  nTextLayer: number;
  nMels: number;
  ftype: number;
}

// ─── File parser ───────────────────────────────────────────────────────────
// Exact byte layout (from whisper.cpp/src/whisper.cpp):
//   u32 magic = 0x67676d6c
//   hparams { 11 × i32 in declaration order above }
//   filters { i32 nMels; i32 nFft; nMels × nFft f32 floats }
//   vocab   { i32 nVocab_minus_extras; nVocab_minus_extras × { u32 len; bytes } }
//   tensors (until EOF) {
//     i32 nDims; i32 nameLen; i32 ftype;
//     nDims × i32 ne[];   // dimensions, fastest-changing first
//     nameLen × byte name[];
//     prod(ne) × element_size_for(ftype) bytes;
//   }
//
// ftype: 0 = F32, 1 = F16. Quantized variants exist (Q4_0 etc.) but aren't
// implemented in this loader — bin files for those use additional ftypes.

const MAGIC_GGML = 0x67676d6c;

function readBinModel(bytes: Uint8Array): BinModel {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let cursor = 0;

  const u32 = (): number => {
    const v = view.getUint32(cursor, true);
    cursor += 4;
    return v;
  };
  const i32 = (): number => {
    const v = view.getInt32(cursor, true);
    cursor += 4;
    return v;
  };

  const magic = u32();
  if (magic !== MAGIC_GGML) {
    throw new Error(`bun:llm whisper: not a whisper.cpp .bin file (magic 0x${magic.toString(16)} != 0x67676d6c)`);
  }

  const hparams: WhisperHParams = {
    nVocab: i32(),
    nAudioCtx: i32(),
    nAudioState: i32(),
    nAudioHead: i32(),
    nAudioLayer: i32(),
    nTextCtx: i32(),
    nTextState: i32(),
    nTextHead: i32(),
    nTextLayer: i32(),
    nMels: i32(),
    ftype: i32(),
  };

  // Mel filterbank: { i32 nMels; i32 nFft_oneSided_minus_one_oddly; floats }
  // Note: the second field is actually n_mels * n_fft / 2 (the filter row
  // length); whisper.cpp writes it as `filters.n_fft`. The total payload
  // is filters.n_mels × filters.n_fft floats.
  const filtersNMels = i32();
  const filtersNFft = i32();
  const totalFilters = filtersNMels * filtersNFft;
  const melFilters = new Float32Array(filtersNMels * filtersNFft);
  for (let i = 0; i < totalFilters; i++) {
    melFilters[i] = view.getFloat32(cursor, true);
    cursor += 4;
  }

  // Vocab: i32 nVocab_dump; nVocab_dump × { u32 len; bytes }. The dumped
  // count may be smaller than hparams.nVocab — multilingual whispers have
  // 1500 special tokens (languages + tasks + timestamps) appended after.
  const nVocabDump = i32();
  const vocab: string[] = new Array(hparams.nVocab);
  const decoder = new TextDecoder("utf-8", { fatal: false });
  for (let i = 0; i < nVocabDump; i++) {
    const len = u32();
    const piece = decoder.decode(new Uint8Array(bytes.buffer, bytes.byteOffset + cursor, len));
    vocab[i] = piece;
    cursor += len;
  }
  // Synthesize the trailing special tokens. Tokens 50257..50364 are well
  // known (see whisper.cpp's special token map):
  //   50257  <|endoftext|>
  //   50258  <|startoftranscript|>
  //   50259..50356  <|<lang>|>          (98 language tokens)
  //   50357  <|translate|>
  //   50358  <|transcribe|>
  //   50359  <|startoflm|>
  //   50360  <|startofprev|>
  //   50361  <|nospeech|>
  //   50362  <|notimestamps|>
  //   50363+ timestamp tokens (n_text_ctx of them, 0.02 s spacing)
  // We only emit the names symbolically — the inference code references
  // them by id so the exact piece text is informational.
  const sotIdx = nVocabDump; // first synthesized special — apprx 50257 for tiny.en (50256 tokens dumped)
  for (let i = nVocabDump; i < hparams.nVocab; i++) {
    if (i === sotIdx)
      vocab[i] = "[_BEG_]"; // tiny.en uses 50256 = <|endoftext|> as the SOT actually no
    else vocab[i] = `[_TT_${i - sotIdx}_]`;
  }

  // Tensors.
  const tensors = new Map<string, { dims: number[]; ftype: number; data: Float32Array }>();
  const nameDecoder = new TextDecoder("utf-8");
  while (cursor < bytes.byteLength) {
    if (cursor + 12 > bytes.byteLength) break;
    const nDims = i32();
    const nameLen = i32();
    const tFtype = i32();
    if (nDims < 1 || nDims > 4 || nameLen <= 0 || nameLen > 1024) {
      throw new Error(`bun:llm whisper: invalid tensor header at offset ${cursor - 12}`);
    }
    const dims: number[] = [];
    let nElements = 1;
    for (let d = 0; d < nDims; d++) {
      const ne = i32();
      dims.push(ne);
      nElements *= ne;
    }
    const name = nameDecoder.decode(new Uint8Array(bytes.buffer, bytes.byteOffset + cursor, nameLen));
    cursor += nameLen;

    let data: Float32Array;
    if (tFtype === 0) {
      // F32
      data = new Float32Array(nElements);
      // Use a bytes-aligned view if possible to avoid per-element decode.
      if ((bytes.byteOffset + cursor) % 4 === 0) {
        data.set(new Float32Array(bytes.buffer, bytes.byteOffset + cursor, nElements));
      } else {
        for (let i = 0; i < nElements; i++) {
          data[i] = view.getFloat32(cursor + i * 4, true);
        }
      }
      cursor += nElements * 4;
    } else if (tFtype === 1) {
      // F16
      data = new Float32Array(nElements);
      for (let i = 0; i < nElements; i++) {
        data[i] = f16ToF32(view.getUint16(cursor + i * 2, true));
      }
      cursor += nElements * 2;
    } else {
      throw new Error(`bun:llm whisper: unsupported tensor ftype=${tFtype} for "${name}" (only F32 / F16 supported)`);
    }

    tensors.set(name, { dims, ftype: tFtype, data });
  }

  return { magic, hparams, melFilters, vocab, tensors };
}

// IEEE 754 half-precision → single-precision. Standard bit twiddle.
function f16ToF32(h: number): number {
  const sign = (h >>> 15) & 0x1;
  const exp = (h >>> 10) & 0x1f;
  const frac = h & 0x3ff;
  if (exp === 0) {
    if (frac === 0) return sign ? -0.0 : 0.0;
    // Subnormal
    return (sign ? -1 : 1) * Math.pow(2, -14) * (frac / 1024);
  }
  if (exp === 31) {
    return frac === 0 ? (sign ? -Infinity : Infinity) : NaN;
  }
  return (sign ? -1 : 1) * Math.pow(2, exp - 15) * (1 + frac / 1024);
}

// ─── FFT + mel preprocessing (inlined from bun:audio) ─────────────────────
// Standard Cooley-Tukey radix-2 in-place complex FFT. Operates on
// interleaved real/imag pairs in `io[2k]=re, io[2k+1]=im`.
function fftInPlace(io: Float32Array, forward: boolean): void {
  const N = io.length >>> 1;
  if (N === 0 || (N & (N - 1)) !== 0) {
    throw new Error("bun:llm whisper FFT: complex length must be a power of 2 ≥ 2");
  }
  // Bit-reverse permutation.
  let j = 0;
  for (let i = 0; i < N; i++) {
    if (i < j) {
      const ri = i << 1,
        rj = j << 1;
      const t0 = io[ri],
        t1 = io[ri + 1];
      io[ri] = io[rj];
      io[ri + 1] = io[rj + 1];
      io[rj] = t0;
      io[rj + 1] = t1;
    }
    let m = N >> 1;
    while (m >= 1 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }
  // Butterflies.
  for (let size = 2; size <= N; size <<= 1) {
    const half = size >> 1;
    const ang = ((forward ? -2 : 2) * Math.PI) / size;
    const wpr = Math.cos(ang),
      wpi = Math.sin(ang);
    for (let k = 0; k < N; k += size) {
      let wr = 1,
        wi = 0;
      for (let m = 0; m < half; m++) {
        const a = (k + m) << 1;
        const b = (k + m + half) << 1;
        const tr = wr * io[b] - wi * io[b + 1];
        const ti = wr * io[b + 1] + wi * io[b];
        io[b] = io[a] - tr;
        io[b + 1] = io[a + 1] - ti;
        io[a] = io[a] + tr;
        io[a + 1] = io[a + 1] + ti;
        const wrNext = wr * wpr - wi * wpi;
        wi = wr * wpi + wi * wpr;
        wr = wrNext;
      }
    }
  }
  if (!forward) {
    const inv = 1 / N;
    for (let i = 0; i < io.length; i++) io[i] *= inv;
  }
}

const MEL_BREAK_HZ = 1000;
const MEL_BREAK_MEL = 15;
const MEL_LOG_STEP = 27.0 / Math.log(6.4);

function hzToMel(hz: number): number {
  if (hz < MEL_BREAK_HZ) return (3 * hz) / 200;
  return MEL_BREAK_MEL + Math.log(hz / MEL_BREAK_HZ) * MEL_LOG_STEP;
}

function melToHz(mel: number): number {
  if (mel < MEL_BREAK_MEL) return (200 * mel) / 3;
  return MEL_BREAK_HZ * Math.exp((mel - MEL_BREAK_MEL) / MEL_LOG_STEP);
}

function buildMelFilters(nMels: number, nFft: number, sampleRate: number): Float32Array {
  const nBins = (nFft >>> 1) + 1;
  const filters = new Float32Array(nMels * nBins);
  const melMin = hzToMel(0);
  const melMax = hzToMel(sampleRate / 2);
  const hzPoints = new Float32Array(nMels + 2);
  for (let i = 0; i < nMels + 2; i++) {
    hzPoints[i] = melToHz(melMin + ((melMax - melMin) * i) / (nMels + 1));
  }
  for (let m = 0; m < nMels; m++) {
    const fL = hzPoints[m],
      fC = hzPoints[m + 1],
      fR = hzPoints[m + 2];
    const scale = 2 / (fR - fL);
    for (let k = 0; k < nBins; k++) {
      const f = (k * sampleRate) / nFft;
      let w = 0;
      if (f >= fL && f <= fC) w = (f - fL) / (fC - fL);
      else if (f > fC && f <= fR) w = (fR - f) / (fR - fC);
      filters[m * nBins + k] = w * scale;
    }
  }
  return filters;
}

function hannWindow(n: number): Float32Array {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  return w;
}

function reflectPad(x: Float32Array, padLeft: number, padRight: number): Float32Array {
  const out = new Float32Array(x.length + padLeft + padRight);
  for (let i = 0; i < padLeft; i++) out[i] = x[Math.min(padLeft - i, x.length - 1)];
  out.set(x, padLeft);
  for (let i = 0; i < padRight; i++) {
    const idx = x.length - 2 - i;
    out[padLeft + x.length + i] = x[Math.max(idx, 0)];
  }
  return out;
}

// Whisper-spec mel: 80 bins, n_fft=512 (window=400 padded), hop=160, 16 kHz.
// Output: { mel: [nMels, T] flat row-major, T frame count }.
function whisperMel(samples: Float32Array): { mel: Float32Array; T: number } {
  const sampleRate = 16000;
  const nMels = 80;
  const windowSize = 400;
  const hop = 160;
  const nFft = 512;
  const nBins = (nFft >>> 1) + 1;
  const window = hannWindow(windowSize);
  const filters = buildMelFilters(nMels, nFft, sampleRate);

  const padded = reflectPad(samples, nFft >>> 1, nFft >>> 1);
  const fftBuf = new Float32Array(nFft * 2);
  const power = new Float32Array(nBins);
  const frames: Float32Array[] = [];
  for (let start = 0; start + windowSize <= padded.length; start += hop) {
    fftBuf.fill(0);
    for (let i = 0; i < windowSize; i++) fftBuf[i << 1] = padded[start + i] * window[i];
    fftInPlace(fftBuf, true);
    for (let k = 0; k < nBins; k++) {
      const re = fftBuf[k << 1],
        im = fftBuf[(k << 1) + 1];
      power[k] = re * re + im * im;
    }
    const m = new Float32Array(nMels);
    for (let mi = 0; mi < nMels; mi++) {
      let acc = 0;
      const base = mi * nBins;
      for (let k = 0; k < nBins; k++) acc += filters[base + k] * power[k];
      m[mi] = acc;
    }
    frames.push(m);
  }

  // Whisper normalization: log10(max(p, 1e-10)), clip to 8 dB dynamic
  // range, rescale to ~[-1, 1].
  let globalMax = -Infinity;
  for (const f of frames) {
    for (let i = 0; i < f.length; i++) {
      const v = Math.log10(Math.max(f[i], 1e-10));
      f[i] = v;
      if (v > globalMax) globalMax = v;
    }
  }
  const floor = globalMax - 8;
  for (const f of frames) {
    for (let i = 0; i < f.length; i++) {
      if (f[i] < floor) f[i] = floor;
      f[i] = (f[i] - globalMax) / 4 + 1;
    }
  }

  // Pack [nMels, T] row-major.
  const T = frames.length;
  const out = new Float32Array(nMels * T);
  for (let t = 0; t < T; t++) {
    for (let mi = 0; mi < nMels; mi++) out[mi * T + t] = frames[t][mi];
  }
  return { mel: out, T };
}

// ─── Math helpers ──────────────────────────────────────────────────────────

// Erf approximation matching bert.ts (A&S 7.1.26). Whisper uses "exact" GELU.
function erf(x: number): number {
  const a1 = 0.254829592,
    a2 = -0.284496736,
    a3 = 1.421413741,
    a4 = -1.453152027,
    a5 = 1.061405429,
    p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1.0 / (1.0 + p * ax);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

function gelu(x: number): number {
  return 0.5 * x * (1.0 + erf(x / Math.SQRT2));
}

function geluInPlace(arr: Float32Array): void {
  for (let i = 0; i < arr.length; i++) arr[i] = gelu(arr[i]);
}

function layerNormInPlace(
  x: Float32Array,
  N: number,
  dim: number,
  w: Float32Array,
  b: Float32Array,
  eps: number = 1e-5,
): void {
  for (let i = 0; i < N; i++) {
    const base = i * dim;
    let mean = 0;
    for (let j = 0; j < dim; j++) mean += x[base + j];
    mean /= dim;
    let variance = 0;
    for (let j = 0; j < dim; j++) {
      const d = x[base + j] - mean;
      variance += d * d;
    }
    variance /= dim;
    const invStd = 1.0 / Math.sqrt(variance + eps);
    for (let j = 0; j < dim; j++) {
      x[base + j] = (x[base + j] - mean) * invStd * w[j] + b[j];
    }
  }
}

// Y[i, r] = sum_c W[r*inDim + c] * X[i, c]. Matches bert.ts convention:
// W stored as [outDim, inDim], row-major.
function matMul(X: Float32Array, W: Float32Array, N: number, inDim: number, outDim: number, out: Float32Array): void {
  for (let i = 0; i < N; i++) {
    const xBase = i * inDim;
    const yBase = i * outDim;
    for (let r = 0; r < outDim; r++) {
      const wBase = r * inDim;
      let s = 0;
      for (let c = 0; c < inDim; c++) s += W[wBase + c] * X[xBase + c];
      out[yBase + r] = s;
    }
  }
}

function addBias(Y: Float32Array, N: number, dim: number, b: Float32Array): void {
  for (let i = 0; i < N; i++) {
    const base = i * dim;
    for (let j = 0; j < dim; j++) Y[base + j] += b[j];
  }
}

// 1D convolution over a [T, Cin] sequence with weights W[Cout, Cin, K] and
// bias B[Cout]. Output shape: [floor((T + 2*padding - K) / stride) + 1, Cout].
// Whisper uses padding=1 for both conv1 (stride=1) and conv2 (stride=2).
// Convention in whisper.cpp: the conv weights are stored with dims=[K, Cin, Cout]
// (fastest-changing first), so W[ko + ki * K + co * (K * Cin)] addresses the
// element at output channel co, input channel ki, kernel index ko.
function conv1d(
  X: Float32Array,
  W: Float32Array,
  B: Float32Array,
  T: number,
  Cin: number,
  Cout: number,
  K: number,
  stride: number,
  padding: number,
): { out: Float32Array; Tout: number } {
  const Tout = Math.floor((T + 2 * padding - K) / stride) + 1;
  const out = new Float32Array(Tout * Cout);
  for (let t = 0; t < Tout; t++) {
    for (let co = 0; co < Cout; co++) {
      let acc = B[co];
      for (let ki = 0; ki < Cin; ki++) {
        for (let ko = 0; ko < K; ko++) {
          const tin = t * stride - padding + ko;
          if (tin < 0 || tin >= T) continue;
          const xv = X[tin * Cin + ki];
          const wv = W[co * (K * Cin) + ki * K + ko];
          acc += xv * wv;
        }
      }
      out[t * Cout + co] = acc;
    }
  }
  return { out, Tout };
}

function softmaxInPlace(logits: Float32Array): void {
  let max = -Infinity;
  for (let i = 0; i < logits.length; i++) if (logits[i] > max) max = logits[i];
  let sum = 0;
  for (let i = 0; i < logits.length; i++) {
    logits[i] = Math.exp(logits[i] - max);
    sum += logits[i];
  }
  const inv = 1 / sum;
  for (let i = 0; i < logits.length; i++) logits[i] *= inv;
}

// Sinusoidal positional embedding — Whisper uses these for the encoder.
// Formula: PE[t, 2i]   = sin(t / 10000^(2i / d))
//          PE[t, 2i+1] = cos(t / 10000^(2i / d))
// whisper.cpp pre-bakes these into a tensor `encoder.positional_embedding`
// which we just consume verbatim.

// ─── Tokenizer ─────────────────────────────────────────────────────────────
// Whisper's tokenizer is GPT-2 byte-level BPE with extra special tokens
// (start-of-transcript, language tags, transcribe/translate, timestamps).
// The .bin file dumps the byte-level "vocab" (each entry is the UTF-8 of a
// merged BPE piece). We don't reproduce GPT-2 BPE merges from the file —
// the public Whisper transcription path always uses canonical specials
// for its prefix and the model emits ids directly that we look up via the
// vocab table. So this tokenizer has just two responsibilities:
//   - Compose the prompt prefix tokens (per task / language).
//   - Decode model output ids back to text.

class WhisperTokenizer {
  vocab: string[];
  /** Index of the <|endoftext|> token. Whisper marks the end of generated text with this. */
  eot: number;
  /** Index of the <|startoftranscript|> sentinel. */
  sot: number;
  /** Index of <|notimestamps|>. We use this to turn off timestamp emission. */
  noTimestamps: number;
  /** Index of <|transcribe|>. */
  transcribe: number;
  /** Index of <|translate|>. */
  translate: number;
  /** Map ISO-639-1 language code → token id. Only populated for multilingual. */
  langToken: Map<string, number>;
  /** True if this is an English-only model (n_vocab=51864). */
  englishOnly: boolean;

  constructor(vocab: string[], nVocab: number) {
    this.vocab = vocab;
    // tiny.en / base.en / small.en / medium.en have n_vocab == 51864.
    // multilingual models have n_vocab == 51865.
    this.englishOnly = nVocab === 51864;

    if (this.englishOnly) {
      // English-only Whisper vocab layout (whisper.cpp/whisper.h):
      //   50256 : <|endoftext|>
      //   50257 : <|startoftranscript|>
      //   50258 : <|notimestamps|>
      //   50259..51862 : <|t-NN|> timestamp tokens
      //   51863 : <|transcribe|> (alias)
      // We only need eot, sot, notimestamps for greedy transcribe.
      this.eot = 50256;
      this.sot = 50257;
      this.noTimestamps = 50258;
      this.transcribe = 50257; // not used for .en; sot is enough as the only-task hint
      this.translate = 50257;
      this.langToken = new Map();
    } else {
      // Multilingual layout:
      //   50257 : <|endoftext|>
      //   50258 : <|startoftranscript|>
      //   50259..50356 : language tokens (en=50259, zh=50260, de=50261, ...)
      //   50357 : <|translate|>
      //   50358 : <|transcribe|>
      //   ...
      //   50362 : <|notimestamps|>
      //   50363+ : timestamps
      this.eot = 50257;
      this.sot = 50258;
      this.transcribe = 50358;
      this.translate = 50357;
      this.noTimestamps = 50362;
      this.langToken = new Map();
      // Populate the most common languages — full table is in whisper.cpp's lang map.
      const langs = [
        "en",
        "zh",
        "de",
        "es",
        "ru",
        "ko",
        "fr",
        "ja",
        "pt",
        "tr",
        "pl",
        "ca",
        "nl",
        "ar",
        "sv",
        "it",
        "id",
        "hi",
        "fi",
        "vi",
        "he",
        "uk",
        "el",
        "ms",
        "cs",
        "ro",
        "da",
        "hu",
        "ta",
        "no",
      ];
      for (let i = 0; i < langs.length; i++) this.langToken.set(langs[i], 50259 + i);
    }
  }

  /**
   * Build the prompt prefix tokens for greedy transcription.
   * For English-only models: [SOT, NoTimestamps].
   * For multilingual: [SOT, lang, transcribe, NoTimestamps].
   */
  prefix(language: string = "en"): number[] {
    if (this.englishOnly) return [this.sot, this.noTimestamps];
    const lang = this.langToken.get(language);
    if (lang === undefined) {
      throw new Error(`bun:llm whisper: unknown language code "${language}"`);
    }
    return [this.sot, lang, this.transcribe, this.noTimestamps];
  }

  /**
   * Decode model output ids back to text. Whisper's vocab is byte-level
   * GPT-2 BPE — each piece is the UTF-8 bytes mapped through the byte
   * encoder (printable ASCII passes through, others go to U+0100+offset).
   * The .bin file stores already-utf8 reconstructed pieces, so for ASCII
   * text concatenation works; for non-ASCII we'd need the inverse byte
   * encoder, but tiny.en is English-only so it's not required.
   */
  decode(ids: number[]): string {
    const pieces: string[] = [];
    for (const id of ids) {
      if (id === this.eot || id === this.sot || id === this.noTimestamps) continue;
      // Skip timestamp tokens (50259..51862 for .en, 50363+ for multilingual).
      if (this.englishOnly) {
        if (id >= 50259 && id <= 51862) continue;
      } else {
        if (id >= 50363) continue;
      }
      pieces.push(this.vocab[id] ?? "");
    }
    return pieces.join("");
  }
}

// ─── Model ─────────────────────────────────────────────────────────────────

interface EncoderBlock {
  attnLnW: Float32Array;
  attnLnB: Float32Array;
  attnQW: Float32Array;
  attnQB: Float32Array;
  attnKW: Float32Array; // no bias on K in Whisper
  attnVW: Float32Array;
  attnVB: Float32Array;
  attnOW: Float32Array;
  attnOB: Float32Array;
  mlpLnW: Float32Array;
  mlpLnB: Float32Array;
  mlp0W: Float32Array;
  mlp0B: Float32Array;
  mlp2W: Float32Array;
  mlp2B: Float32Array;
}

interface DecoderBlock {
  attnLnW: Float32Array;
  attnLnB: Float32Array;
  attnQW: Float32Array;
  attnQB: Float32Array;
  attnKW: Float32Array;
  attnVW: Float32Array;
  attnVB: Float32Array;
  attnOW: Float32Array;
  attnOB: Float32Array;
  crossLnW: Float32Array;
  crossLnB: Float32Array;
  crossQW: Float32Array;
  crossQB: Float32Array;
  crossKW: Float32Array;
  crossVW: Float32Array;
  crossVB: Float32Array;
  crossOW: Float32Array;
  crossOB: Float32Array;
  mlpLnW: Float32Array;
  mlpLnB: Float32Array;
  mlp0W: Float32Array;
  mlp0B: Float32Array;
  mlp2W: Float32Array;
  mlp2B: Float32Array;
}

interface WhisperWeights {
  conv1W: Float32Array;
  conv1B: Float32Array;
  conv2W: Float32Array;
  conv2B: Float32Array;
  encPosEmbed: Float32Array;
  encBlocks: EncoderBlock[];
  encLnW: Float32Array;
  encLnB: Float32Array;

  decTokenEmbed: Float32Array;
  decPosEmbed: Float32Array;
  decBlocks: DecoderBlock[];
  decLnW: Float32Array;
  decLnB: Float32Array;
}

class WhisperModel {
  hparams: WhisperHParams;
  weights: WhisperWeights;
  tokenizer: WhisperTokenizer;

  constructor(hparams: WhisperHParams, weights: WhisperWeights, tokenizer: WhisperTokenizer) {
    this.hparams = hparams;
    this.weights = weights;
    this.tokenizer = tokenizer;
  }

  static async load(path: string): Promise<WhisperModel> {
    const file = Bun.file(path);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const bin = readBinModel(bytes);
    const weights = mapWeights(bin);
    const tokenizer = new WhisperTokenizer(bin.vocab, bin.hparams.nVocab);
    return new WhisperModel(bin.hparams, weights, tokenizer);
  }

  /**
   * Run the audio encoder over a single 30-second window of mel features.
   * `mel` is a flat [nMels, T] row-major array (T = 3000 frames for the full
   * 30s window). Returns a [nAudioCtx, nAudioState] flat encoder output —
   * the audio embeddings the decoder cross-attends to.
   */
  encode(mel: Float32Array, T: number): Float32Array {
    const h = this.hparams;
    const w = this.weights;
    const dim = h.nAudioState;
    const nHead = h.nAudioHead;
    const headDim = dim / nHead;

    // Whisper's mel input shape is [nMels, T]. The conv1d expects [T, Cin],
    // so we transpose first. Whisper's reference also rescales mel features
    // via (mel + 1) / 2 ... actually no, mel is fed directly. The mel
    // already is in [-1, 1] from our preprocessor.
    // Conv1d with stride=1, kernel=3, padding=1: out length stays T.
    // Whisper's convs expect input shape [Cin, T] in PyTorch, which when
    // flattened to a row-major contiguous [T, Cin] looks like the transpose.
    // whisper.cpp's convolution operator does the right shape automatically;
    // we mirror by feeding [T, Cin] with weight indexing as documented.
    const melTC = new Float32Array(T * h.nMels);
    for (let t = 0; t < T; t++) {
      for (let m = 0; m < h.nMels; m++) {
        melTC[t * h.nMels + m] = mel[m * T + t];
      }
    }

    // conv1: 80 → dim, kernel=3, stride=1, padding=1 → length T
    const c1 = conv1d(melTC, w.conv1W, w.conv1B, T, h.nMels, dim, 3, 1, 1);
    geluInPlace(c1.out);
    // conv2: dim → dim, kernel=3, stride=2, padding=1 → length T/2 (=1500)
    const c2 = conv1d(c1.out, w.conv2W, w.conv2B, c1.Tout, dim, dim, 3, 2, 1);
    geluInPlace(c2.out);

    const Tenc = c2.Tout;
    if (Tenc > h.nAudioCtx) {
      throw new Error(`bun:llm whisper: encoded ${Tenc} frames > audio ctx ${h.nAudioCtx}`);
    }
    // Add positional embedding (truncate to actual length).
    const x = c2.out;
    for (let t = 0; t < Tenc; t++) {
      const base = t * dim;
      const peBase = t * dim;
      for (let i = 0; i < dim; i++) x[base + i] += w.encPosEmbed[peBase + i];
    }

    // N transformer encoder blocks.
    for (const block of w.encBlocks) {
      runEncoderBlock(x, Tenc, dim, nHead, headDim, block);
    }

    // Final LayerNorm.
    layerNormInPlace(x, Tenc, dim, w.encLnW, w.encLnB);
    return x;
  }

  /**
   * Run the decoder one step: given the current token sequence and the
   * encoder output, return the logits over the vocab for the next token.
   * Naive O(N²) per call — no KV cache yet. Acceptable for tiny.en and
   * short outputs; KV-cached path is a follow-up.
   */
  step(tokens: number[], encoderOut: Float32Array, encoderT: number): Float32Array {
    const h = this.hparams;
    const w = this.weights;
    const dim = h.nTextState;
    const nHead = h.nTextHead;
    const headDim = dim / nHead;
    const N = tokens.length;
    if (N > h.nTextCtx) {
      throw new Error(`bun:llm whisper: token sequence ${N} exceeds nTextCtx ${h.nTextCtx}`);
    }

    // Token + positional embeddings.
    const x = new Float32Array(N * dim);
    for (let i = 0; i < N; i++) {
      const tok = tokens[i];
      const tokBase = tok * dim;
      const xBase = i * dim;
      for (let j = 0; j < dim; j++) {
        x[xBase + j] = w.decTokenEmbed[tokBase + j] + w.decPosEmbed[i * dim + j];
      }
    }

    // N transformer decoder blocks.
    for (const block of w.decBlocks) {
      runDecoderBlock(x, N, dim, nHead, headDim, block, encoderOut, encoderT);
    }

    // Final LayerNorm.
    layerNormInPlace(x, N, dim, w.decLnW, w.decLnB);

    // LM head: logits = x @ token_embed^T (tied weights). Only need the last position.
    const logits = new Float32Array(h.nVocab);
    const lastBase = (N - 1) * dim;
    for (let v = 0; v < h.nVocab; v++) {
      let acc = 0;
      const eBase = v * dim;
      for (let j = 0; j < dim; j++) acc += x[lastBase + j] * w.decTokenEmbed[eBase + j];
      logits[v] = acc;
    }
    return logits;
  }

  /**
   * Greedy auto-regressive transcription, given pre-computed mel features.
   *
   * `mel` is a flat [nMels, T] row-major array. `T` is the actual frame
   * count (typically 3000 for a 30-second window at hop=160). Whisper's
   * encoder expects `nAudioCtx * 2 = 3000` frames; if T is smaller, pad
   * with zeros up to that length. If T is larger, the leading 3000
   * frames are processed and the rest is ignored.
   *
   * Use `audio.melSpectrogram(audio, { mode: "whisper" })` from `bun:audio`
   * to produce `mel` from raw 16 kHz mono PCM.
   */
  transcribeMel(mel: Float32Array, T: number, opts?: { maxTokens?: number; language?: string }): string {
    const h = this.hparams;
    const maxTokens = opts?.maxTokens ?? 224;
    const language = opts?.language ?? "en";

    // Pad / trim to exactly nAudioCtx*2 = 3000 frames.
    const Tdesired = h.nAudioCtx * 2;
    let melPacked: Float32Array;
    if (T === Tdesired) {
      melPacked = mel;
    } else {
      melPacked = new Float32Array(h.nMels * Tdesired);
      const Tcopy = Math.min(T, Tdesired);
      for (let m = 0; m < h.nMels; m++) {
        for (let t = 0; t < Tcopy; t++) {
          melPacked[m * Tdesired + t] = mel[m * T + t];
        }
      }
    }

    const encoded = this.encode(melPacked, Tdesired);
    const encoderT = h.nAudioCtx;

    const tokens = this.tokenizer.prefix(language);
    const tokenizer = this.tokenizer;
    for (let step = 0; step < maxTokens; step++) {
      const logits = this.step(tokens, encoded, encoderT);
      // Greedy argmax with timestamp tokens masked out (we only run with
      // <|notimestamps|> active, so a timestamp emission would be a bug).
      let best = 0;
      let bestVal = -Infinity;
      for (let v = 0; v < logits.length; v++) {
        if (tokenizer.englishOnly) {
          if (v >= 50259 && v <= 51862) continue;
        } else {
          if (v >= 50363) continue;
        }
        if (logits[v] > bestVal) {
          bestVal = logits[v];
          best = v;
        }
      }
      tokens.push(best);
      if (best === tokenizer.eot) break;
    }
    return tokenizer.decode(tokens);
  }

  /**
   * High-level greedy transcription. `audio` is mono 16 kHz Float32 PCM in
   * [-1, 1]. The audio is padded/truncated to 30 s, mel-preprocessed, run
   * through the encoder once, and then the decoder is auto-regressed
   * greedily until <|endoftext|> or `maxTokens` is reached.
   */
  transcribe(audio: Float32Array, opts?: { maxTokens?: number; language?: string }): string {
    // Pad/trim to 30 s @ 16 kHz = 480000 samples.
    const N_SAMPLES = 480000;
    const pcm = new Float32Array(N_SAMPLES);
    pcm.set(audio.length > N_SAMPLES ? audio.subarray(0, N_SAMPLES) : audio);
    const { mel, T } = whisperMel(pcm);
    return this.transcribeMel(mel, T, opts);
  }
}

// Map raw bin tensors → typed Whisper weight bundle.
function mapWeights(bin: BinModel): WhisperWeights {
  const get = (name: string): Float32Array => {
    const t = bin.tensors.get(name);
    if (!t) throw new Error(`bun:llm whisper: missing tensor "${name}"`);
    return t.data;
  };

  const encBlocks: EncoderBlock[] = [];
  for (let i = 0; i < bin.hparams.nAudioLayer; i++) {
    encBlocks.push({
      attnLnW: get(`encoder.blocks.${i}.attn_ln.weight`),
      attnLnB: get(`encoder.blocks.${i}.attn_ln.bias`),
      attnQW: get(`encoder.blocks.${i}.attn.query.weight`),
      attnQB: get(`encoder.blocks.${i}.attn.query.bias`),
      attnKW: get(`encoder.blocks.${i}.attn.key.weight`),
      attnVW: get(`encoder.blocks.${i}.attn.value.weight`),
      attnVB: get(`encoder.blocks.${i}.attn.value.bias`),
      attnOW: get(`encoder.blocks.${i}.attn.out.weight`),
      attnOB: get(`encoder.blocks.${i}.attn.out.bias`),
      mlpLnW: get(`encoder.blocks.${i}.mlp_ln.weight`),
      mlpLnB: get(`encoder.blocks.${i}.mlp_ln.bias`),
      mlp0W: get(`encoder.blocks.${i}.mlp.0.weight`),
      mlp0B: get(`encoder.blocks.${i}.mlp.0.bias`),
      mlp2W: get(`encoder.blocks.${i}.mlp.2.weight`),
      mlp2B: get(`encoder.blocks.${i}.mlp.2.bias`),
    });
  }

  const decBlocks: DecoderBlock[] = [];
  for (let i = 0; i < bin.hparams.nTextLayer; i++) {
    decBlocks.push({
      attnLnW: get(`decoder.blocks.${i}.attn_ln.weight`),
      attnLnB: get(`decoder.blocks.${i}.attn_ln.bias`),
      attnQW: get(`decoder.blocks.${i}.attn.query.weight`),
      attnQB: get(`decoder.blocks.${i}.attn.query.bias`),
      attnKW: get(`decoder.blocks.${i}.attn.key.weight`),
      attnVW: get(`decoder.blocks.${i}.attn.value.weight`),
      attnVB: get(`decoder.blocks.${i}.attn.value.bias`),
      attnOW: get(`decoder.blocks.${i}.attn.out.weight`),
      attnOB: get(`decoder.blocks.${i}.attn.out.bias`),
      crossLnW: get(`decoder.blocks.${i}.cross_attn_ln.weight`),
      crossLnB: get(`decoder.blocks.${i}.cross_attn_ln.bias`),
      crossQW: get(`decoder.blocks.${i}.cross_attn.query.weight`),
      crossQB: get(`decoder.blocks.${i}.cross_attn.query.bias`),
      crossKW: get(`decoder.blocks.${i}.cross_attn.key.weight`),
      crossVW: get(`decoder.blocks.${i}.cross_attn.value.weight`),
      crossVB: get(`decoder.blocks.${i}.cross_attn.value.bias`),
      crossOW: get(`decoder.blocks.${i}.cross_attn.out.weight`),
      crossOB: get(`decoder.blocks.${i}.cross_attn.out.bias`),
      mlpLnW: get(`decoder.blocks.${i}.mlp_ln.weight`),
      mlpLnB: get(`decoder.blocks.${i}.mlp_ln.bias`),
      mlp0W: get(`decoder.blocks.${i}.mlp.0.weight`),
      mlp0B: get(`decoder.blocks.${i}.mlp.0.bias`),
      mlp2W: get(`decoder.blocks.${i}.mlp.2.weight`),
      mlp2B: get(`decoder.blocks.${i}.mlp.2.bias`),
    });
  }

  return {
    conv1W: get("encoder.conv1.weight"),
    conv1B: get("encoder.conv1.bias"),
    conv2W: get("encoder.conv2.weight"),
    conv2B: get("encoder.conv2.bias"),
    encPosEmbed: get("encoder.positional_embedding"),
    encBlocks,
    encLnW: get("encoder.ln_post.weight"),
    encLnB: get("encoder.ln_post.bias"),
    decTokenEmbed: get("decoder.token_embedding.weight"),
    decPosEmbed: get("decoder.positional_embedding"),
    decBlocks,
    decLnW: get("decoder.ln.weight"),
    decLnB: get("decoder.ln.bias"),
  };
}

// ─── Transformer block runners ────────────────────────────────────────────

function runEncoderBlock(
  x: Float32Array,
  N: number,
  dim: number,
  nHead: number,
  headDim: number,
  b: EncoderBlock,
): void {
  // Self-attention with pre-LN.
  const xn = new Float32Array(x.length);
  xn.set(x);
  layerNormInPlace(xn, N, dim, b.attnLnW, b.attnLnB);

  const attnOut = selfAttention(xn, N, dim, nHead, headDim, b.attnQW, b.attnQB, b.attnKW, null, b.attnVW, b.attnVB);
  // Output projection.
  const projOut = new Float32Array(N * dim);
  matMul(attnOut, b.attnOW, N, dim, dim, projOut);
  addBias(projOut, N, dim, b.attnOB);
  // Residual: x += projOut
  for (let i = 0; i < x.length; i++) x[i] += projOut[i];

  // MLP with pre-LN.
  xn.set(x);
  layerNormInPlace(xn, N, dim, b.mlpLnW, b.mlpLnB);
  const dFfn = b.mlp0W.length / dim; // weights stored [dFfn, dim]
  const ffn1 = new Float32Array(N * dFfn);
  matMul(xn, b.mlp0W, N, dim, dFfn, ffn1);
  addBias(ffn1, N, dFfn, b.mlp0B);
  geluInPlace(ffn1);
  const ffn2 = new Float32Array(N * dim);
  matMul(ffn1, b.mlp2W, N, dFfn, dim, ffn2);
  addBias(ffn2, N, dim, b.mlp2B);
  for (let i = 0; i < x.length; i++) x[i] += ffn2[i];
}

function runDecoderBlock(
  x: Float32Array,
  N: number,
  dim: number,
  nHead: number,
  headDim: number,
  b: DecoderBlock,
  encOut: Float32Array,
  encT: number,
): void {
  // Causal self-attention with pre-LN.
  const xn = new Float32Array(x.length);
  xn.set(x);
  layerNormInPlace(xn, N, dim, b.attnLnW, b.attnLnB);
  const selfAttnOut = causalSelfAttention(
    xn,
    N,
    dim,
    nHead,
    headDim,
    b.attnQW,
    b.attnQB,
    b.attnKW,
    null,
    b.attnVW,
    b.attnVB,
  );
  const proj1 = new Float32Array(N * dim);
  matMul(selfAttnOut, b.attnOW, N, dim, dim, proj1);
  addBias(proj1, N, dim, b.attnOB);
  for (let i = 0; i < x.length; i++) x[i] += proj1[i];

  // Cross-attention with pre-LN. Q from decoder, K/V from encoder output.
  xn.set(x);
  layerNormInPlace(xn, N, dim, b.crossLnW, b.crossLnB);
  const crossAttnOut = crossAttention(
    xn,
    N,
    dim,
    nHead,
    headDim,
    encOut,
    encT,
    b.crossQW,
    b.crossQB,
    b.crossKW,
    null,
    b.crossVW,
    b.crossVB,
  );
  const proj2 = new Float32Array(N * dim);
  matMul(crossAttnOut, b.crossOW, N, dim, dim, proj2);
  addBias(proj2, N, dim, b.crossOB);
  for (let i = 0; i < x.length; i++) x[i] += proj2[i];

  // MLP with pre-LN.
  xn.set(x);
  layerNormInPlace(xn, N, dim, b.mlpLnW, b.mlpLnB);
  const dFfn = b.mlp0W.length / dim;
  const ffn1 = new Float32Array(N * dFfn);
  matMul(xn, b.mlp0W, N, dim, dFfn, ffn1);
  addBias(ffn1, N, dFfn, b.mlp0B);
  geluInPlace(ffn1);
  const ffn2 = new Float32Array(N * dim);
  matMul(ffn1, b.mlp2W, N, dFfn, dim, ffn2);
  addBias(ffn2, N, dim, b.mlp2B);
  for (let i = 0; i < x.length; i++) x[i] += ffn2[i];
}

// ─── Attention kernels ────────────────────────────────────────────────────
// All three (encoder self-attn, decoder self-attn, cross-attn) share the
// same Q/K/V projection + scaled-dot-product + output structure. The
// differences are: (a) source of K/V (same as Q for self-attn, encoder
// for cross-attn), (b) presence of causal mask (decoder self-attn only).

function selfAttention(
  x: Float32Array,
  N: number,
  dim: number,
  nHead: number,
  headDim: number,
  WQ: Float32Array,
  BQ: Float32Array,
  WK: Float32Array,
  BK: Float32Array | null,
  WV: Float32Array,
  BV: Float32Array,
): Float32Array {
  const Q = new Float32Array(N * dim);
  const K = new Float32Array(N * dim);
  const V = new Float32Array(N * dim);
  matMul(x, WQ, N, dim, dim, Q);
  addBias(Q, N, dim, BQ);
  matMul(x, WK, N, dim, dim, K);
  if (BK) addBias(K, N, dim, BK);
  matMul(x, WV, N, dim, dim, V);
  addBias(V, N, dim, BV);

  return scaledDotProductAttention(Q, K, V, N, N, nHead, headDim, false);
}

function causalSelfAttention(
  x: Float32Array,
  N: number,
  dim: number,
  nHead: number,
  headDim: number,
  WQ: Float32Array,
  BQ: Float32Array,
  WK: Float32Array,
  BK: Float32Array | null,
  WV: Float32Array,
  BV: Float32Array,
): Float32Array {
  const Q = new Float32Array(N * dim);
  const K = new Float32Array(N * dim);
  const V = new Float32Array(N * dim);
  matMul(x, WQ, N, dim, dim, Q);
  addBias(Q, N, dim, BQ);
  matMul(x, WK, N, dim, dim, K);
  if (BK) addBias(K, N, dim, BK);
  matMul(x, WV, N, dim, dim, V);
  addBias(V, N, dim, BV);

  return scaledDotProductAttention(Q, K, V, N, N, nHead, headDim, true);
}

function crossAttention(
  x: Float32Array,
  N: number,
  dim: number,
  nHead: number,
  headDim: number,
  encOut: Float32Array,
  encT: number,
  WQ: Float32Array,
  BQ: Float32Array,
  WK: Float32Array,
  BK: Float32Array | null,
  WV: Float32Array,
  BV: Float32Array,
): Float32Array {
  const Q = new Float32Array(N * dim);
  const K = new Float32Array(encT * dim);
  const V = new Float32Array(encT * dim);
  matMul(x, WQ, N, dim, dim, Q);
  addBias(Q, N, dim, BQ);
  matMul(encOut, WK, encT, dim, dim, K);
  if (BK) addBias(K, encT, dim, BK);
  matMul(encOut, WV, encT, dim, dim, V);
  addBias(V, encT, dim, BV);

  return scaledDotProductAttention(Q, K, V, N, encT, nHead, headDim, false);
}

// Scaled dot-product attention with multiple heads.
// Q: [N_q, nHead*headDim], K/V: [N_kv, nHead*headDim]. Returns [N_q, dim].
function scaledDotProductAttention(
  Q: Float32Array,
  K: Float32Array,
  V: Float32Array,
  Nq: number,
  Nkv: number,
  nHead: number,
  headDim: number,
  causal: boolean,
): Float32Array {
  const dim = nHead * headDim;
  const out = new Float32Array(Nq * dim);
  const invSqrtHead = 1.0 / Math.sqrt(headDim);

  for (let h = 0; h < nHead; h++) {
    for (let i = 0; i < Nq; i++) {
      // Compute attention scores against all key positions.
      const scores = new Float32Array(Nkv);
      const qBase = i * dim + h * headDim;
      let max = -Infinity;
      for (let j = 0; j < Nkv; j++) {
        if (causal && j > i) {
          scores[j] = -Infinity;
          continue;
        }
        const kBase = j * dim + h * headDim;
        let s = 0;
        for (let d = 0; d < headDim; d++) s += Q[qBase + d] * K[kBase + d];
        s *= invSqrtHead;
        scores[j] = s;
        if (s > max) max = s;
      }
      // Softmax.
      let sum = 0;
      for (let j = 0; j < Nkv; j++) {
        const e = isFinite(scores[j]) ? Math.exp(scores[j] - max) : 0;
        scores[j] = e;
        sum += e;
      }
      const inv = sum > 0 ? 1.0 / sum : 0;
      for (let j = 0; j < Nkv; j++) scores[j] *= inv;

      // Weighted sum of values.
      const outBase = i * dim + h * headDim;
      for (let d = 0; d < headDim; d++) out[outBase + d] = 0;
      for (let j = 0; j < Nkv; j++) {
        const wj = scores[j];
        if (wj === 0) continue;
        const vBase = j * dim + h * headDim;
        for (let d = 0; d < headDim; d++) out[outBase + d] += wj * V[vBase + d];
      }
    }
  }
  return out;
}

export { WhisperModel, WhisperTokenizer, readBinModel };
