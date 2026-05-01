// BERT-style sentence encoder for parabun:llm.
//
// Targets BGE / E5 / MiniLM GGUFs (general.architecture="bert"). Bidirectional
// attention, post-LN residuals, GELU FFN, token + position + segment
// embeddings, WordPiece tokenizer. A single `embed(text)` call returns a
// pooled sentence vector — CLS or mean pool, L2-normalized by default so
// cosine similarity collapses to dot product.
//
// Host-only. These models are tiny (BGE-small is 384-dim / 12 layers / ~67 MB
// f16) and callers typically hit them in large batches of short strings; the
// per-call compute is dominated by the matmuls which are fine in plain JS.
// Wiring through parabun:gpu would add HtoD overhead per call that dwarfs the
// forward at these sizes.
//
// GGUF tensor layout convention (shared with llama.ts): dims=[ncols, nrows].
// Element (r, c) lives at `r*ncols + c`; for a matmul Y = X @ W^T, W is
// stored with nrows=outDim and ncols=inDim so W[r*inDim + c] = W[outDim, inDim]
// and Y[i, r] = sum_c W[r*inDim + c] * X[i, c].

interface GGUFLike {
  metadata: Map<string, unknown>;
  tensors: Map<string, { dims: number[]; type: number }>;
  tensorF32(name: string): Float32Array;
  number(key: string): number;
}

interface BertConfig {
  nLayer: number;
  dModel: number;
  dFfn: number;
  nHead: number;
  headDim: number;
  vocabSize: number;
  maxContext: number;
  layerNormEps: number;
  poolingType: "cls" | "mean";
}

interface BertLayer {
  wq: Float32Array;
  bq: Float32Array;
  wk: Float32Array;
  bk: Float32Array;
  wv: Float32Array;
  bv: Float32Array;
  wo: Float32Array;
  bo: Float32Array;
  attnNormW: Float32Array;
  attnNormB: Float32Array;
  wUp: Float32Array;
  bUp: Float32Array;
  wDown: Float32Array;
  bDown: Float32Array;
  ffnNormW: Float32Array;
  ffnNormB: Float32Array;
}

interface BertWeights {
  tokenEmbd: Float32Array; // [vocabSize, dModel]
  posEmbd: Float32Array; // [maxContext, dModel]
  segEmbd: Float32Array; // [nSeg, dModel] — nSeg = 2 for BERT; we always feed seg=0
  embdNormW: Float32Array;
  embdNormB: Float32Array;
  layers: BertLayer[];
}

// GELU using erf (A&S 7.1.26). Matches the "exact" GELU used by HF BERT —
// `tanh` approximations differ in the 4th-5th decimal and are visible in
// cosine similarity when comparing against HF references.
function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1.0 / (1.0 + p * ax);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

function geluInPlace(x: Float32Array): void {
  const invSqrt2 = 1.0 / Math.SQRT2;
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    x[i] = 0.5 * v * (1.0 + erf(v * invSqrt2));
  }
}

// Layer norm over the last axis of `x`, which is treated as [N, dim].
// Mutates `x` in place: x[i, :] = ((x[i, :] - mean) / sqrt(var + eps)) * w + b.
function layerNormInPlace(
  x: Float32Array,
  N: number,
  dim: number,
  w: Float32Array,
  b: Float32Array,
  eps: number,
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

// Y[i, r] = sum_c W[r*inDim + c] * X[i, c]. Writes N*outDim floats into `out`.
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

function addInPlace(Y: Float32Array, X: Float32Array): void {
  for (let i = 0; i < Y.length; i++) Y[i] += X[i];
}

// WordPiece tokenizer for BERT-family GGUFs.
//
// Sticks to the bert-base-uncased recipe: lower-case, NFD + strip combining
// marks, whitespace + punctuation split, then greedy longest-match WordPiece
// with `##` prefix on non-initial subwords. Wraps the output in [CLS] / [SEP]
// and returns plain number[]; callers pad/truncate to maxContext themselves.
//
// We do NOT reproduce the full HF BasicTokenizer: Chinese char splitting,
// never_split allowlists, control-char cleanup. Those matter for multilingual
// models; English BGE/E5 don't need them and adding them would drift from
// the user's expected tokens silently.
class BertTokenizer {
  readonly vocab: string[];
  readonly vocabId: Map<string, number>;
  readonly cls: number;
  readonly sep: number;
  readonly pad: number;
  readonly unk: number;
  readonly mask: number;

  constructor(opts: { tokens: string[]; cls: number; sep: number; pad: number; unk: number; mask: number }) {
    this.vocab = opts.tokens;
    this.vocabId = new Map();
    for (let i = 0; i < opts.tokens.length; i++) this.vocabId.set(opts.tokens[i], i);
    this.cls = opts.cls;
    this.sep = opts.sep;
    this.pad = opts.pad;
    this.unk = opts.unk;
    this.mask = opts.mask;
  }

  // BERT punctuation test: ASCII punct OR any codepoint with Unicode general
  // category starting with P (Punctuation). We approximate with \p{P} — close
  // enough for the ASCII-dominant corpora English encoders are trained on.
  static #isPunct(ch: string): boolean {
    const cp = ch.codePointAt(0)!;
    if ((cp >= 33 && cp <= 47) || (cp >= 58 && cp <= 64) || (cp >= 91 && cp <= 96) || (cp >= 123 && cp <= 126)) {
      return true;
    }
    return /\p{P}/u.test(ch);
  }

  // Collapse whitespace + split into words, drop diacritics and lowercase.
  // Output is a flat array of "word-ish" strings — each element is a run of
  // letters/digits or a single punctuation character.
  static #basicTokenize(text: string): string[] {
    const normalized = text
      .normalize("NFD")
      .replace(/\p{Mn}/gu, "")
      .toLowerCase();
    const out: string[] = [];
    let buf = "";
    const flush = (): void => {
      if (buf.length > 0) {
        out.push(buf);
        buf = "";
      }
    };
    for (const ch of normalized) {
      if (/\s/.test(ch)) {
        flush();
      } else if (BertTokenizer.#isPunct(ch)) {
        flush();
        out.push(ch);
      } else {
        buf += ch;
      }
    }
    flush();
    return out;
  }

  // Greedy longest-match WordPiece over a single pre-tokenized word.
  // Returns [unk] on any sub-range miss, following the HF reference.
  //
  // llama.cpp's BERT GGUFs store the HF WordPiece vocab with a translation:
  // initial pieces get a `▁` (U+2581) prefix and continuation `##foo` pieces
  // are stored bare. Punctuation and a handful of one-char tokens stay
  // un-prefixed in both roles — so at start-of-word we try `▁{piece}`
  // first and fall back to the raw piece for the punctuation case.
  #wordPiece(word: string): number[] {
    if (word.length === 0) return [];
    const maxInputChars = 200; // matches HF default; absurdly-long tokens are [UNK]
    if (word.length > maxInputChars) return [this.unk];
    const out: number[] = [];
    let start = 0;
    while (start < word.length) {
      let end = word.length;
      let match = -1;
      while (start < end) {
        const slice = word.slice(start, end);
        if (start === 0) {
          const prefixed = this.vocabId.get("\u2581" + slice);
          if (prefixed !== undefined) {
            match = prefixed;
            break;
          }
        }
        const bare = this.vocabId.get(slice);
        if (bare !== undefined) {
          match = bare;
          break;
        }
        end--;
      }
      if (match === -1) return [this.unk];
      out.push(match);
      start = end;
    }
    return out;
  }

  // Encode a string into token ids, wrapped with [CLS] ... [SEP] and
  // truncated to `maxLen` tokens total (including the specials). Returns
  // the raw id array — pad to a fixed length at the call site if you
  // need a fixed shape; the encoder itself doesn't require padding.
  encode(text: string, opts?: { maxLen?: number }): number[] {
    const maxLen = opts?.maxLen ?? 512;
    const ids: number[] = [this.cls];
    for (const word of BertTokenizer.#basicTokenize(text)) {
      for (const id of this.#wordPiece(word)) {
        if (ids.length + 1 >= maxLen) break;
        ids.push(id);
      }
      if (ids.length + 1 >= maxLen) break;
    }
    ids.push(this.sep);
    return ids;
  }

  decode(ids: number[]): string {
    const pieces: string[] = [];
    for (const id of ids) {
      if (id === this.cls || id === this.sep || id === this.pad) continue;
      const piece = this.vocab[id] ?? "";
      pieces.push(piece);
    }
    // Reassemble. Initial pieces carry `▁` (SentencePiece-style, which is
    // how llama.cpp stores this vocab); non-prefixed pieces are either
    // continuations of the prior word or punctuation that attaches directly.
    let out = "";
    for (const p of pieces) {
      if (p.startsWith("\u2581")) out += (out.length ? " " : "") + p.slice(1);
      else out += p;
    }
    return out;
  }
}

class BertModel {
  readonly cfg: BertConfig;
  readonly weights: BertWeights;

  constructor(cfg: BertConfig, weights: BertWeights) {
    this.cfg = cfg;
    this.weights = weights;
  }

  // Run the encoder over `tokenIds` and pool into a single dModel-vector.
  // `pool` defaults to the model's own default (from GGUF metadata) but the
  // caller can override for BGE-style models that expect CLS pooling during
  // training but work well with mean pooling for similarity retrieval.
  embed(tokenIds: number[], opts?: { pool?: "cls" | "mean"; normalize?: boolean }): Float32Array {
    const cfg = this.cfg;
    const N = tokenIds.length;
    if (N === 0) throw new Error("parabun:llm: cannot embed empty token list");
    if (N > cfg.maxContext) {
      throw new Error(`parabun:llm: input has ${N} tokens, exceeds maxContext=${cfg.maxContext}`);
    }
    const pool = opts?.pool ?? cfg.poolingType;
    const normalize = opts?.normalize ?? true;

    const d = cfg.dModel;
    const w = this.weights;

    // Initial residual: token + position + segment-0 embeddings, then LN.
    // All three embedding tables are [index, dModel] row-major.
    const X = new Float32Array(N * d);
    for (let i = 0; i < N; i++) {
      const tokBase = tokenIds[i] * d;
      const posBase = i * d;
      const outBase = i * d;
      for (let j = 0; j < d; j++) {
        X[outBase + j] = w.tokenEmbd[tokBase + j] + w.posEmbd[posBase + j] + w.segEmbd[j];
      }
    }
    layerNormInPlace(X, N, d, w.embdNormW, w.embdNormB, cfg.layerNormEps);

    // Scratch reused across layers. We keep a single Q/K/V buffer and
    // separate projection/attention outputs; keeps allocation to ~O(nLayer)
    // calls under the hood via Float32Array growth elision.
    const Q = new Float32Array(N * d);
    const K = new Float32Array(N * d);
    const V = new Float32Array(N * d);
    const attnHeads = new Float32Array(N * d);
    const attnOut = new Float32Array(N * d);
    const ffnHidden = new Float32Array(N * cfg.dFfn);
    const ffnOut = new Float32Array(N * d);
    const invSqrtDh = 1.0 / Math.sqrt(cfg.headDim);

    for (let l = 0; l < cfg.nLayer; l++) {
      const L = w.layers[l];

      matMul(X, L.wq, N, d, d, Q);
      addBias(Q, N, d, L.bq);
      matMul(X, L.wk, N, d, d, K);
      addBias(K, N, d, L.bk);
      matMul(X, L.wv, N, d, d, V);
      addBias(V, N, d, L.bv);

      // Bidirectional multi-head self-attention. For each head h and
      // query position i: scores[j] = (Q[i,h,:] · K[j,h,:]) / sqrt(headDim),
      // softmax over j, then sum_j softmax[j] * V[j,h,:]. No causal mask.
      attnHeads.fill(0);
      const scores = new Float32Array(N);
      for (let h = 0; h < cfg.nHead; h++) {
        const headOff = h * cfg.headDim;
        for (let i = 0; i < N; i++) {
          const qBase = i * d + headOff;
          let maxScore = -Infinity;
          for (let j = 0; j < N; j++) {
            const kBase = j * d + headOff;
            let s = 0;
            for (let dh = 0; dh < cfg.headDim; dh++) s += Q[qBase + dh] * K[kBase + dh];
            s *= invSqrtDh;
            scores[j] = s;
            if (s > maxScore) maxScore = s;
          }
          let sum = 0;
          for (let j = 0; j < N; j++) {
            const e = Math.exp(scores[j] - maxScore);
            scores[j] = e;
            sum += e;
          }
          const invSum = 1.0 / sum;
          const outBase = i * d + headOff;
          for (let j = 0; j < N; j++) {
            const vBase = j * d + headOff;
            const p = scores[j] * invSum;
            for (let dh = 0; dh < cfg.headDim; dh++) attnHeads[outBase + dh] += p * V[vBase + dh];
          }
        }
      }

      // Output projection + residual + post-attention layer norm.
      matMul(attnHeads, L.wo, N, d, d, attnOut);
      addBias(attnOut, N, d, L.bo);
      addInPlace(attnOut, X);
      layerNormInPlace(attnOut, N, d, L.attnNormW, L.attnNormB, cfg.layerNormEps);

      // FFN: up-project → GELU → down-project.
      matMul(attnOut, L.wUp, N, d, cfg.dFfn, ffnHidden);
      addBias(ffnHidden, N, cfg.dFfn, L.bUp);
      geluInPlace(ffnHidden);
      matMul(ffnHidden, L.wDown, N, cfg.dFfn, d, ffnOut);
      addBias(ffnOut, N, d, L.bDown);
      addInPlace(ffnOut, attnOut);
      layerNormInPlace(ffnOut, N, d, L.ffnNormW, L.ffnNormB, cfg.layerNormEps);

      // Roll residual into X for the next layer.
      X.set(ffnOut);
    }

    // Pool into a single dModel vector.
    const out = new Float32Array(d);
    if (pool === "cls") {
      for (let j = 0; j < d; j++) out[j] = X[j];
    } else {
      for (let i = 0; i < N; i++) {
        const base = i * d;
        for (let j = 0; j < d; j++) out[j] += X[base + j];
      }
      const invN = 1.0 / N;
      for (let j = 0; j < d; j++) out[j] *= invN;
    }

    if (normalize) {
      let sum2 = 0;
      for (let j = 0; j < d; j++) sum2 += out[j] * out[j];
      const inv = 1.0 / Math.sqrt(sum2 + 1e-30);
      for (let j = 0; j < d; j++) out[j] *= inv;
    }
    return out;
  }

  dispose(): void {
    // Nothing device-resident — the Float32Arrays are owned by this object
    // and become eligible for GC on drop. Kept for API symmetry with
    // LlamaModel.
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

function fromGGUF(gguf: GGUFLike, opts?: { maxContext?: number }): BertModel {
  const arch = gguf.metadata.get("general.architecture");
  if (arch !== "bert") {
    throw new Error(`parabun:llm: bert encoder requires architecture="bert", got "${arch}"`);
  }

  const numOr = (key: string, fallback: number): number => {
    const v = gguf.metadata.get(key);
    if (typeof v === "number") return v;
    if (typeof v === "bigint") return Number(v);
    return fallback;
  };

  const dModel = gguf.number("bert.embedding_length");
  const nHead = gguf.number("bert.attention.head_count");
  const maxContextMeta = gguf.number("bert.context_length");
  const maxContext = Math.min(opts?.maxContext ?? maxContextMeta, maxContextMeta);
  const poolingCode = numOr("bert.pooling_type", 2);
  const pooling: "cls" | "mean" = poolingCode === 1 ? "mean" : "cls";

  const cfg: BertConfig = {
    nLayer: gguf.number("bert.block_count"),
    dModel,
    dFfn: gguf.number("bert.feed_forward_length"),
    nHead,
    headDim: dModel / nHead,
    vocabSize: (gguf.metadata.get("tokenizer.ggml.tokens") as unknown[] | undefined)?.length ?? 0,
    maxContext,
    layerNormEps: Number(gguf.metadata.get("bert.attention.layer_norm_epsilon") ?? 1e-12),
    poolingType: pooling,
  };
  if (cfg.headDim * cfg.nHead !== cfg.dModel) {
    throw new Error(`parabun:llm: head_dim*n_head != d_model (${cfg.headDim}*${cfg.nHead} != ${cfg.dModel})`);
  }

  const layers: BertLayer[] = new Array(cfg.nLayer);
  for (let l = 0; l < cfg.nLayer; l++) {
    layers[l] = {
      wq: gguf.tensorF32(`blk.${l}.attn_q.weight`),
      bq: gguf.tensorF32(`blk.${l}.attn_q.bias`),
      wk: gguf.tensorF32(`blk.${l}.attn_k.weight`),
      bk: gguf.tensorF32(`blk.${l}.attn_k.bias`),
      wv: gguf.tensorF32(`blk.${l}.attn_v.weight`),
      bv: gguf.tensorF32(`blk.${l}.attn_v.bias`),
      wo: gguf.tensorF32(`blk.${l}.attn_output.weight`),
      bo: gguf.tensorF32(`blk.${l}.attn_output.bias`),
      attnNormW: gguf.tensorF32(`blk.${l}.attn_output_norm.weight`),
      attnNormB: gguf.tensorF32(`blk.${l}.attn_output_norm.bias`),
      wUp: gguf.tensorF32(`blk.${l}.ffn_up.weight`),
      bUp: gguf.tensorF32(`blk.${l}.ffn_up.bias`),
      wDown: gguf.tensorF32(`blk.${l}.ffn_down.weight`),
      bDown: gguf.tensorF32(`blk.${l}.ffn_down.bias`),
      ffnNormW: gguf.tensorF32(`blk.${l}.layer_output_norm.weight`),
      ffnNormB: gguf.tensorF32(`blk.${l}.layer_output_norm.bias`),
    };
  }

  // Segment-embeddings table is [nSeg, dModel]. We always feed segment 0,
  // so slice out the first row to avoid indexing in the hot loop.
  const segFull = gguf.tensorF32("token_types.weight");
  const segEmbd = segFull.slice(0, dModel);

  const weights: BertWeights = {
    tokenEmbd: gguf.tensorF32("token_embd.weight"),
    posEmbd: gguf.tensorF32("position_embd.weight"),
    segEmbd,
    embdNormW: gguf.tensorF32("token_embd_norm.weight"),
    embdNormB: gguf.tensorF32("token_embd_norm.bias"),
    layers,
  };
  return new BertModel(cfg, weights);
}

function tokenizerFromGGUF(gguf: GGUFLike): BertTokenizer {
  const model = gguf.metadata.get("tokenizer.ggml.model");
  if (model !== "bert") {
    throw new Error(`parabun:llm: bert tokenizer requires tokenizer.ggml.model="bert", got "${model}"`);
  }
  const tokens = gguf.metadata.get("tokenizer.ggml.tokens");
  if (!Array.isArray(tokens)) throw new Error("parabun:llm: missing tokenizer.ggml.tokens");

  const numOr = (key: string, fallback: number): number => {
    const v = gguf.metadata.get(key);
    if (typeof v === "number") return v;
    if (typeof v === "bigint") return Number(v);
    return fallback;
  };

  // GGUF mis-spells `separator` as `seperator` — preserved from an early
  // writer and now baked into every BERT GGUF in the wild. Don't "fix" this.
  const sep = numOr("tokenizer.ggml.seperator_token_id", numOr("tokenizer.ggml.eos_token_id", 102));
  const cls = numOr("tokenizer.ggml.cls_token_id", numOr("tokenizer.ggml.bos_token_id", 101));
  const pad = numOr("tokenizer.ggml.padding_token_id", 0);
  const unk = numOr("tokenizer.ggml.unknown_token_id", 100);
  const mask = numOr("tokenizer.ggml.mask_token_id", 103);

  return new BertTokenizer({ tokens: tokens as string[], cls, sep, pad, unk, mask });
}

// High-level wrapper: load + tokenize + embed in one call. Mirrors `LLM.load`
// so callers can swap between `llm.LLM` (decoder) and `llm.Encoder` (bert)
// without thinking about the lower-level primitives.
class Encoder {
  readonly model: BertModel;
  readonly tokenizer: BertTokenizer;
  #disposed = false;

  constructor(model: BertModel, tokenizer: BertTokenizer) {
    this.model = model;
    this.tokenizer = tokenizer;
  }

  static async load(path: string, opts?: { maxContext?: number }): Promise<Encoder> {
    const gguf = require("./gguf.ts");
    const file = await gguf.loadGGUF(path);
    const model = fromGGUF(file, opts);
    const tok = tokenizerFromGGUF(file);
    return new Encoder(model, tok);
  }

  embed(text: string, opts?: { pool?: "cls" | "mean"; normalize?: boolean }): Float32Array {
    if (this.#disposed) throw new Error("parabun:llm: Encoder already disposed");
    const ids = this.tokenizer.encode(text, { maxLen: this.model.cfg.maxContext });
    return this.model.embed(ids, opts);
  }

  embedMany(texts: string[], opts?: { pool?: "cls" | "mean"; normalize?: boolean }): Float32Array[] {
    if (this.#disposed) throw new Error("parabun:llm: Encoder already disposed");
    const out: Float32Array[] = new Array(texts.length);
    for (let i = 0; i < texts.length; i++) out[i] = this.embed(texts[i], opts);
    return out;
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.model.dispose();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

export default {
  Encoder,
  BertModel,
  BertTokenizer,
  fromGGUF,
  tokenizerFromGGUF,
};
