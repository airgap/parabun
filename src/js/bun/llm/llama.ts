// Llama-3 forward pass for bun:llm.
//
// Two paths, picked at model construction time:
//
//   - DEVICE path (bun:gpu.getDevOps() != null): the whole forward pass
//     runs on the GPU. Residual stream, Q/K/V, scores, KV cache, logits
//     are device-resident; only the 4-byte argmax result crosses PCIe per
//     token. Weights are held via gpu.hold (one HtoD at load time, zero
//     per-token). This is the competitive-with-ollama path.
//
//   - HOST path (every other case — CPU backend, Metal, or CUDA without
//     NVRTC): the classical host loop. matVecs still route through
//     bun:gpu so CUDA hosts with weights held get per-call device matVec,
//     but every other op runs in JS and the residual stream ping-pongs
//     across PCIe between ops. Correct but slow; kept for portability.
//
// Selection is automatic per-process: if the CUDA backend can compile its
// NVRTC device-ops module, DEVICE path wins. No flag to flip. The two
// paths produce numerically equivalent outputs (f32 FMA reordering aside)
// — the Q4_K end-to-end "Paris" oracle tests both.
//
// GGUF tensor layout: `dims=[ncols, nrows]`. Element (row, col) lives at
// `row * ncols + col`. Matmul `y = W @ x` (y shape [nrows], x shape [ncols])
// is therefore `y[r] = sum_c W[r*ncols + c] * x[c]`. Same W serves as
// lm_head when the checkpoint tied embeddings (Llama-3.2 1B does — no
// `output.weight` in the tensor list, so we fall back to `token_embd.weight`).
//
// Llama-3 specifics: GQA (head_count_kv=8, head_count=32), RoPE base
// 500000 dim 64 interleaved-pair (NORM), RMSNorm ε=1e-5, SwiGLU FFN.

const gpu = require("../gpu.ts");

interface GGUFLike {
  metadata: Map<string, unknown>;
  tensors: Map<string, { dims: number[]; type: number }>;
  tensorF32(name: string): Float32Array;
  tensorRaw?(name: string): { type: number; bytes: Uint8Array; nElems: number; dims: number[] };
  number(key: string): number;
}

// GGML type constants — used to short-circuit to the direct residency
// path without depending on the gguf module's default export.
const GGML_TYPE_Q4_K_CONST = 12;
const GGML_TYPE_Q6_K_CONST = 14;

type RopeMode = "norm" | "neox";

interface LlamaConfig {
  nLayer: number;
  dModel: number;
  dFfn: number;
  nHead: number;
  nKvHead: number;
  headDim: number;
  vocabSize: number;
  ropeDim: number;
  ropeFreqBase: number;
  ropeMode: RopeMode;
  rmsEps: number;
  maxContext: number;
}

// Matrix weights are wrapped in GpuFloat32Array so CUDA hosts HtoD them
// once at load time and per-token matVec reuses the resident device
// pointer. On non-CUDA backends GpuFloat32Array is a thin view wrapper.
type Resident = InstanceType<typeof gpu.GpuFloat32Array>;

interface LayerWeights {
  attnNorm: Resident; // device-resident on CUDA so devOps.rmsnorm can read it
  wq: Resident;
  wk: Resident;
  wv: Resident;
  wo: Resident;
  bq?: Resident; // Qwen2-only bias
  bk?: Resident;
  bv?: Resident;
  ffnNorm: Resident;
  wGate: Resident;
  wUp: Resident;
  wDown: Resident;
  // Fused Q-quant projections (device path only). When all three of
  // wq/wk/wv are the same quant format we concatenate their raw byte
  // streams along the row dimension so a single matVec produces the
  // concatenated [Q, K, V] output. Same idea for [Gate, Up].
  wQKV?: Resident;
  wGateUp?: Resident;
}

interface ModelWeights {
  tokenEmbd: Resident;
  lmHead?: Resident;
  outputNorm: Resident;
  ropeFreqs: Float32Array; // host-only — used to derive invFreq at init
  layers: LayerWeights[];
}

// Per-pair RoPE angular frequencies, divided by the Llama-3 per-pair
// scaling factor. invFreq[i] = 1 / (base^(2i/ropeDim) * ropeFreqs[i]).
function buildInvFreq(cfg: LlamaConfig, ropeFreqs: Float32Array): Float32Array {
  const half = cfg.ropeDim / 2;
  const out = new Float32Array(half);
  for (let i = 0; i < half; i++) {
    const baseInv = Math.pow(cfg.ropeFreqBase, (2 * i) / cfg.ropeDim);
    const factor = ropeFreqs.length === half ? ropeFreqs[i] : 1.0;
    out[i] = 1.0 / (baseInv * factor);
  }
  return out;
}

// KV cache. Shape per layer is [maxContext * kvRowSize] where
// kvRowSize = nKvHead * headDim. Two storage modes:
//
//   - host: plain Float32Array per layer.
//   - device: GpuScratch per layer, allocated when newKVCache() runs on
//     a model using the device path.
//
// The mode is fixed at construction; caller never needs to know which
// they got. forward() picks its path based on whether device buffers
// are present.
class KVCache {
  readonly k: Float32Array[] | null;
  readonly v: Float32Array[] | null;
  readonly kDev: any[] | null;
  readonly vDev: any[] | null;
  readonly #rowSize: number;
  readonly #maxContext: number;
  readonly #devOps: any | null;
  #disposed: boolean;

  constructor(cfg: LlamaConfig, devOps: any | null) {
    this.#rowSize = cfg.nKvHead * cfg.headDim;
    this.#maxContext = cfg.maxContext;
    this.#devOps = devOps;
    this.#disposed = false;
    const bytesPerLayer = cfg.maxContext * this.#rowSize;
    if (devOps) {
      this.k = null;
      this.v = null;
      this.kDev = new Array(cfg.nLayer);
      this.vDev = new Array(cfg.nLayer);
      for (let l = 0; l < cfg.nLayer; l++) {
        this.kDev[l] = devOps.allocScratch(bytesPerLayer, "f32");
        this.vDev[l] = devOps.allocScratch(bytesPerLayer, "f32");
      }
    } else {
      this.k = new Array(cfg.nLayer);
      this.v = new Array(cfg.nLayer);
      this.kDev = null;
      this.vDev = null;
      for (let l = 0; l < cfg.nLayer; l++) {
        this.k[l] = new Float32Array(bytesPerLayer);
        this.v[l] = new Float32Array(bytesPerLayer);
      }
    }
  }

  rowSize(): number {
    return this.#rowSize;
  }
  maxContext(): number {
    return this.#maxContext;
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    if (this.#devOps && this.kDev && this.vDev) {
      for (const s of this.kDev) this.#devOps.freeScratch(s);
      for (const s of this.vDev) this.#devOps.freeScratch(s);
    }
  }
  [Symbol.dispose](): void {
    this.dispose();
  }
}

class LlamaModel {
  readonly cfg: LlamaConfig;
  readonly weights: ModelWeights;
  readonly #invFreq: Float32Array;

  // Device ops (null → host path).
  readonly #devOps: any | null;

  // HOST-path scratch buffers. Reused across forward() calls.
  readonly #xBuf: Float32Array;
  readonly #xnBuf: Float32Array;
  readonly #attnOut: Float32Array;
  readonly #scoresBuf: Float32Array;

  // DEVICE-path scratch. All on GPU; allocated once at construction.
  readonly #xDev: any | null;
  readonly #xnDev: any | null;
  readonly #qkvDev: any | null; // backing alloc for #qDev/#kDev/#vDev slices
  readonly #qDev: any | null;
  readonly #kDev: any | null;
  readonly #vDev: any | null;
  readonly #attnOutDev: any | null;
  readonly #gateUpDev: any | null; // backing alloc for #gateDev/#upDev slices
  readonly #gateDev: any | null;
  readonly #upDev: any | null;
  readonly #scoresDev: any | null; // [nHead * maxContext], stride = maxContext
  readonly #logitsDev: any | null; // [vocabSize]
  readonly #outIdxDev: any | null; // [1] i32
  readonly #invFreqDev: any | null; // resident RoPE table
  readonly #outIdxHost: Int32Array | null; // pinned scratch for DtoH

  constructor(cfg: LlamaConfig, weights: ModelWeights) {
    this.cfg = cfg;
    this.weights = weights;
    this.#invFreq = buildInvFreq(cfg, weights.ropeFreqs);

    this.#devOps = (gpu.getDevOps && gpu.getDevOps()) || null;

    if (this.#devOps) {
      // Device path — allocate every scratch on GPU. Weights (including
      // norm weights and biases) are held by the caller in Resident
      // wrappers; we just read their device pointers at dispatch time.
      const d = this.#devOps;
      this.#xDev = d.allocScratch(cfg.dModel);
      this.#xnDev = d.allocScratch(cfg.dModel);
      // Q / K / V scratch: single allocation with slices so a fused
      // wQKV matVec writes straight into [Q|K|V] layout; downstream
      // ops (RoPE, KV store, attention) use the slice views.
      const qLen = cfg.nHead * cfg.headDim;
      const kLen = cfg.nKvHead * cfg.headDim;
      const vLen = cfg.nKvHead * cfg.headDim;
      this.#qkvDev = d.allocScratch(qLen + kLen + vLen);
      this.#qDev = d.scratchSlice(this.#qkvDev, 0, qLen);
      this.#kDev = d.scratchSlice(this.#qkvDev, qLen, kLen);
      this.#vDev = d.scratchSlice(this.#qkvDev, qLen + kLen, vLen);
      this.#attnOutDev = d.allocScratch(cfg.dModel);
      // Gate / Up scratch: single backing allocation, two slice views.
      this.#gateUpDev = d.allocScratch(cfg.dFfn * 2);
      this.#gateDev = d.scratchSlice(this.#gateUpDev, 0, cfg.dFfn);
      this.#upDev = d.scratchSlice(this.#gateUpDev, cfg.dFfn, cfg.dFfn);
      this.#scoresDev = d.allocScratch(cfg.nHead * cfg.maxContext);
      this.#logitsDev = d.allocScratch(cfg.vocabSize);
      this.#outIdxDev = d.allocScratch(1, "i32");
      this.#invFreqDev = d.allocScratch(this.#invFreq.length);
      d.uploadScratch(this.#invFreq, this.#invFreqDev);
      this.#outIdxHost = new Int32Array(1);

      // Host-path scratch stays allocated (small, cheap) so host-mode
      // oracles and introspection still work. forward() ignores them.
      this.#xBuf = new Float32Array(cfg.dModel);
      this.#xnBuf = new Float32Array(cfg.dModel);
      this.#attnOut = new Float32Array(cfg.dModel);
      this.#scoresBuf = new Float32Array(cfg.maxContext);
    } else {
      this.#xDev = null;
      this.#xnDev = null;
      this.#qkvDev = null;
      this.#qDev = null;
      this.#kDev = null;
      this.#vDev = null;
      this.#attnOutDev = null;
      this.#gateUpDev = null;
      this.#gateDev = null;
      this.#upDev = null;
      this.#scoresDev = null;
      this.#logitsDev = null;
      this.#outIdxDev = null;
      this.#invFreqDev = null;
      this.#outIdxHost = null;

      this.#xBuf = new Float32Array(cfg.dModel);
      this.#xnBuf = new Float32Array(cfg.dModel);
      this.#attnOut = new Float32Array(cfg.dModel);
      this.#scoresBuf = new Float32Array(cfg.maxContext);
    }
  }

  dispose(): void {
    this.weights.tokenEmbd.release();
    this.weights.lmHead?.release();
    this.weights.outputNorm.release();
    for (const L of this.weights.layers) {
      L.attnNorm.release();
      L.wq.release();
      L.wk.release();
      L.wv.release();
      L.wo.release();
      L.bq?.release();
      L.bk?.release();
      L.bv?.release();
      L.ffnNorm.release();
      L.wGate.release();
      L.wUp.release();
      L.wDown.release();
      L.wQKV?.release();
      L.wGateUp?.release();
    }
    if (this.#devOps) {
      const d = this.#devOps;
      for (const s of [
        this.#xDev,
        this.#xnDev,
        this.#qDev,
        this.#kDev,
        this.#vDev,
        this.#qkvDev,
        this.#attnOutDev,
        this.#gateDev,
        this.#upDev,
        this.#gateUpDev,
        this.#scoresDev,
        this.#logitsDev,
        this.#outIdxDev,
        this.#invFreqDev,
      ]) {
        if (s) d.freeScratch(s);
      }
    }
  }

  [Symbol.dispose](): void {
    this.dispose();
  }

  newKVCache(): KVCache {
    return new KVCache(this.cfg, this.#devOps);
  }

  // Single-token forward. `pos` is the 0-based position in the sequence
  // (RoPE + KV cache index). Returns a Float32Array of logits on the
  // host path, or a single-element Int32Array holding the argmax token
  // id on the device path (logits stay on device — only the winning
  // index crosses PCIe). Callers that need full logits on device path
  // must use `forwardLogits()` instead.
  forward(tokenId: number, pos: number, kv: KVCache): Float32Array {
    if (this.#devOps) {
      // Device path returns argmax only. For a Float32Array-compatible
      // return we DtoH the logits buffer. Expensive (~350µs on PCIe 4.0
      // for vocab=128k) but preserves the public contract. Callers that
      // just want greedy sampling should call forwardGreedy().
      return this.#forwardDev(tokenId, pos, kv);
    }
    return this.#forwardHost(tokenId, pos, kv);
  }

  // Device-path fast path for greedy sampling: runs forward, argmax on
  // device, DtoH the winning token id (4 bytes). Returns the token id.
  // Falls back to argmax over host logits on the host path.
  forwardGreedy(tokenId: number, pos: number, kv: KVCache): number {
    if (this.#devOps) return this.#forwardDevGreedy(tokenId, pos, kv);
    const logits = this.#forwardHost(tokenId, pos, kv);
    return argmax(logits);
  }

  #forwardHost(tokenId: number, pos: number, kv: KVCache): Float32Array {
    const { cfg, weights } = this;
    const { dModel, nLayer, nHead, nKvHead, headDim, dFfn, rmsEps } = cfg;

    if (tokenId < 0 || tokenId >= cfg.vocabSize) {
      throw new Error(`bun:llm: token id ${tokenId} out of range [0, ${cfg.vocabSize})`);
    }
    if (pos < 0 || pos >= kv.maxContext()) {
      throw new Error(`bun:llm: position ${pos} out of range [0, ${kv.maxContext()})`);
    }
    if (!kv.k || !kv.v) {
      throw new Error("bun:llm: host forward called on device KVCache (backend mismatch)");
    }

    const x = this.#xBuf;
    const embSrc = weights.tokenEmbd.view;
    const embOff = tokenId * dModel;
    for (let i = 0; i < dModel; i++) x[i] = embSrc[embOff + i];

    const xn = this.#xnBuf;
    const attnOut = this.#attnOut;
    const scores = this.#scoresBuf;
    const kvRowSize = kv.rowSize();

    for (let l = 0; l < nLayer; l++) {
      const L = weights.layers[l];

      rmsnormInto(xn, x, L.attnNorm.view, rmsEps);

      const q = gpu.matVec(L.wq, xn, nHead * headDim, dModel);
      const k = gpu.matVec(L.wk, xn, nKvHead * headDim, dModel);
      const v = gpu.matVec(L.wv, xn, nKvHead * headDim, dModel);

      if (L.bq) {
        const b = L.bq.view;
        for (let i = 0; i < q.length; i++) q[i] += b[i];
      }
      if (L.bk) {
        const b = L.bk.view;
        for (let i = 0; i < k.length; i++) k[i] += b[i];
      }
      if (L.bv) {
        const b = L.bv.view;
        for (let i = 0; i < v.length; i++) v[i] += b[i];
      }

      if (cfg.ropeMode === "neox") {
        ropeNeoxInPlace(q, nHead, headDim, pos, this.#invFreq);
        ropeNeoxInPlace(k, nKvHead, headDim, pos, this.#invFreq);
      } else {
        ropeInPlace(q, nHead, headDim, pos, this.#invFreq);
        ropeInPlace(k, nKvHead, headDim, pos, this.#invFreq);
      }

      const kCache = kv.k[l];
      const vCache = kv.v[l];
      const kOff = pos * kvRowSize;
      for (let i = 0; i < kvRowSize; i++) {
        kCache[kOff + i] = k[i];
        vCache[kOff + i] = v[i];
      }

      const scale = 1.0 / Math.sqrt(headDim);
      const groupSize = nHead / nKvHead;

      for (let h = 0; h < nHead; h++) {
        const kvh = (h / groupSize) | 0;
        const qOff = h * headDim;
        const kvHeadOff = kvh * headDim;

        let maxScore = -Infinity;
        for (let p = 0; p <= pos; p++) {
          const kRowBase = p * kvRowSize + kvHeadOff;
          let s = 0;
          for (let i = 0; i < headDim; i++) s += q[qOff + i] * kCache[kRowBase + i];
          s *= scale;
          scores[p] = s;
          if (s > maxScore) maxScore = s;
        }

        let sumExp = 0;
        for (let p = 0; p <= pos; p++) {
          const e = Math.exp(scores[p] - maxScore);
          scores[p] = e;
          sumExp += e;
        }
        const invSum = 1.0 / sumExp;
        for (let p = 0; p <= pos; p++) scores[p] *= invSum;

        for (let i = 0; i < headDim; i++) attnOut[qOff + i] = 0;
        for (let p = 0; p <= pos; p++) {
          const w = scores[p];
          const vRowBase = p * kvRowSize + kvHeadOff;
          for (let i = 0; i < headDim; i++) attnOut[qOff + i] += w * vCache[vRowBase + i];
        }
      }

      const attnOutProj = gpu.matVec(L.wo, attnOut, dModel, dModel);
      for (let i = 0; i < dModel; i++) x[i] += attnOutProj[i];

      rmsnormInto(xn, x, L.ffnNorm.view, rmsEps);
      const gate = gpu.matVec(L.wGate, xn, dFfn, dModel);
      const up = gpu.matVec(L.wUp, xn, dFfn, dModel);
      for (let i = 0; i < dFfn; i++) {
        const g = gate[i];
        const silu = g / (1 + Math.exp(-g));
        gate[i] = silu * up[i];
      }
      const ffnOut = gpu.matVec(L.wDown, gate, dModel, dFfn);
      for (let i = 0; i < dModel; i++) x[i] += ffnOut[i];
    }

    rmsnormInto(xn, x, weights.outputNorm.view, rmsEps);
    const lm = weights.lmHead ?? weights.tokenEmbd;
    return gpu.matVec(lm, xn, cfg.vocabSize, dModel);
  }

  // Device-path forward that returns full host logits (DtoH at the end).
  // Used when the caller needs access to raw logits (non-greedy sampling,
  // introspection). Greedy callers should prefer #forwardDevGreedy which
  // skips the DtoH.
  #forwardDev(tokenId: number, pos: number, kv: KVCache): Float32Array {
    this.#forwardDevCore(tokenId, pos, kv);
    const logits = new Float32Array(this.cfg.vocabSize);
    this.#devOps.sync();
    this.#devOps.downloadScratch(this.#logitsDev, logits);
    return logits;
  }

  #forwardDevGreedy(tokenId: number, pos: number, kv: KVCache): number {
    this.#forwardDevCore(tokenId, pos, kv);
    const d = this.#devOps;
    // Argmax on device: 1 block reduction over vocabSize. Writes 4 bytes
    // to #outIdxDev; we DtoH those 4 bytes, no full-vocab PCIe transfer.
    d.argmax(this.#logitsDev, this.#outIdxDev, this.cfg.vocabSize);
    d.sync();
    d.downloadScratch(this.#outIdxDev, this.#outIdxHost);
    return this.#outIdxHost![0];
  }

  // Shared body: runs the full transformer stack leaving the current
  // token's logits in #logitsDev on GPU. Callers pick argmax (greedy)
  // or a full DtoH readback. No cuCtxSynchronize here — the caller is
  // the last op in the chain and syncs itself.
  #forwardDevCore(tokenId: number, pos: number, kv: KVCache): void {
    const { cfg, weights } = this;
    const { dModel, nLayer, nHead, nKvHead, headDim, dFfn, rmsEps, maxContext } = cfg;
    if (tokenId < 0 || tokenId >= cfg.vocabSize) {
      throw new Error(`bun:llm: token id ${tokenId} out of range [0, ${cfg.vocabSize})`);
    }
    if (pos < 0 || pos >= kv.maxContext()) {
      throw new Error(`bun:llm: position ${pos} out of range [0, ${kv.maxContext()})`);
    }
    if (!kv.kDev || !kv.vDev) {
      throw new Error("bun:llm: device forward called on host KVCache (backend mismatch)");
    }
    const d = this.#devOps;

    const xDev = this.#xDev;
    const xnDev = this.#xnDev;
    const qDev = this.#qDev;
    const kDev = this.#kDev;
    const vDev = this.#vDev;
    const attnOutDev = this.#attnOutDev;
    const gateDev = this.#gateDev;
    const upDev = this.#upDev;
    const scoresDev = this.#scoresDev;
    const logitsDev = this.#logitsDev;
    const invFreqDev = this.#invFreqDev;

    // Embedding lookup — copy row of token_embd (device-resident) into x.
    d.embedLookup(weights.tokenEmbd.__handle, xDev, tokenId, dModel);

    const kvRowSize = nKvHead * headDim;
    const groupSize = nHead / nKvHead;
    const scale = 1.0 / Math.sqrt(headDim);
    const ctxLen = pos + 1;

    for (let l = 0; l < nLayer; l++) {
      const L = weights.layers[l];

      // Attention block.
      d.rmsnorm(xDev, L.attnNorm.__handle, xnDev, dModel, rmsEps);
      if (L.wQKV) {
        // Fused [Q|K|V] projection: single kernel writes directly into
        // the qkv backing alloc; qDev/kDev/vDev are slice views over it.
        d.matVec(L.wQKV.__handle, xnDev, this.#qkvDev, (nHead + 2 * nKvHead) * headDim, dModel);
      } else {
        d.matVec(L.wq.__handle, xnDev, qDev, nHead * headDim, dModel);
        d.matVec(L.wk.__handle, xnDev, kDev, nKvHead * headDim, dModel);
        d.matVec(L.wv.__handle, xnDev, vDev, nKvHead * headDim, dModel);
      }

      if (L.bq) d.biasAdd(qDev, L.bq.__handle, nHead * headDim);
      if (L.bk) d.biasAdd(kDev, L.bk.__handle, nKvHead * headDim);
      if (L.bv) d.biasAdd(vDev, L.bv.__handle, nKvHead * headDim);

      d.rope(qDev, invFreqDev, nHead, headDim, pos, cfg.ropeMode);
      d.rope(kDev, invFreqDev, nKvHead, headDim, pos, cfg.ropeMode);

      // Store K, V rows at index pos in per-layer cache.
      d.kvStore(kDev, kv.kDev[l], pos, kvRowSize);
      d.kvStore(vDev, kv.vDev[l], pos, kvRowSize);

      d.attnScores(qDev, kv.kDev[l], scoresDev, nHead, headDim, kvRowSize, groupSize, maxContext, ctxLen, scale);
      d.softmaxRow(scoresDev, nHead, ctxLen, maxContext);
      d.attnOutput(scoresDev, kv.vDev[l], attnOutDev, nHead, headDim, kvRowSize, groupSize, ctxLen, maxContext);

      // Output projection + residual.
      // Reuse qDev as scratch for attnOutProj — it's free by now.
      d.matVec(L.wo.__handle, attnOutDev, qDev, dModel, dModel);
      d.accum(xDev, qDev, dModel);

      // FFN block.
      d.rmsnorm(xDev, L.ffnNorm.__handle, xnDev, dModel, rmsEps);
      if (L.wGateUp) {
        // Fused [Gate|Up] projection: single kernel over 2*dFfn rows,
        // then siluMul over the two slice views.
        d.matVec(L.wGateUp.__handle, xnDev, this.#gateUpDev, dFfn * 2, dModel);
      } else {
        d.matVec(L.wGate.__handle, xnDev, gateDev, dFfn, dModel);
        d.matVec(L.wUp.__handle, xnDev, upDev, dFfn, dModel);
      }
      d.siluMul(gateDev, upDev, dFfn); // gate[i] = silu(gate[i]) * up[i]
      // Reuse xnDev as scratch for ffnOut (it's re-derived at next layer).
      d.matVec(L.wDown.__handle, gateDev, xnDev, dModel, dFfn);
      d.accum(xDev, xnDev, dModel);
    }

    // Final RMSNorm + lm_head projection.
    d.rmsnorm(xDev, weights.outputNorm.__handle, xnDev, dModel, rmsEps);
    const lm = weights.lmHead ?? weights.tokenEmbd;
    d.matVec(lm.__handle, xnDev, logitsDev, cfg.vocabSize, dModel);
  }
}

function rmsnormInto(y: Float32Array, x: Float32Array, weight: Float32Array, eps: number): void {
  const n = x.length;
  let sumSq = 0;
  for (let i = 0; i < n; i++) sumSq += x[i] * x[i];
  const rms = 1.0 / Math.sqrt(sumSq / n + eps);
  for (let i = 0; i < n; i++) y[i] = x[i] * rms * weight[i];
}

function ropeInPlace(x: Float32Array, nHeads: number, headDim: number, pos: number, invFreq: Float32Array): void {
  const half = headDim >> 1;
  for (let h = 0; h < nHeads; h++) {
    const base = h * headDim;
    for (let i = 0; i < half; i++) {
      const theta = pos * invFreq[i];
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      const a = x[base + 2 * i];
      const b = x[base + 2 * i + 1];
      x[base + 2 * i] = a * c - b * s;
      x[base + 2 * i + 1] = a * s + b * c;
    }
  }
}

function ropeNeoxInPlace(x: Float32Array, nHeads: number, headDim: number, pos: number, invFreq: Float32Array): void {
  const half = headDim >> 1;
  for (let h = 0; h < nHeads; h++) {
    const base = h * headDim;
    for (let i = 0; i < half; i++) {
      const theta = pos * invFreq[i];
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      const a = x[base + i];
      const b = x[base + half + i];
      x[base + i] = a * c - b * s;
      x[base + half + i] = a * s + b * c;
    }
  }
}

// Factory.
function fromGGUF(gguf: GGUFLike, opts?: { maxContext?: number }): LlamaModel {
  const arch = gguf.metadata.get("general.architecture");
  let metaPrefix: string;
  let isQwen2 = false;
  switch (arch) {
    case "llama":
    case "mistral":
      metaPrefix = "llama";
      break;
    case "qwen2":
      metaPrefix = "qwen2";
      isQwen2 = true;
      break;
    default:
      throw new Error(`bun:llm: unsupported architecture "${arch}" (want "llama", "mistral", or "qwen2")`);
  }

  const numOr = (key: string, fallback: number): number => {
    const v = gguf.metadata.get(key);
    if (typeof v === "number") return v;
    if (typeof v === "bigint") return Number(v);
    return fallback;
  };
  const dModel = gguf.number(`${metaPrefix}.embedding_length`);
  const nHead = gguf.number(`${metaPrefix}.attention.head_count`);
  const headDim = numOr(`${metaPrefix}.attention.key_length`, dModel / nHead);
  const tokensArr = gguf.metadata.get("tokenizer.ggml.tokens");
  const tokensLen = Array.isArray(tokensArr) ? tokensArr.length : 0;

  const cfg: LlamaConfig = {
    nLayer: gguf.number(`${metaPrefix}.block_count`),
    dModel,
    dFfn: gguf.number(`${metaPrefix}.feed_forward_length`),
    nHead,
    nKvHead: gguf.number(`${metaPrefix}.attention.head_count_kv`),
    headDim,
    vocabSize: numOr(`${metaPrefix}.vocab_size`, tokensLen),
    ropeDim: numOr(`${metaPrefix}.rope.dimension_count`, headDim),
    ropeFreqBase: numOr(`${metaPrefix}.rope.freq_base`, 10000),
    ropeMode: isQwen2 ? "neox" : "norm",
    rmsEps: Number(gguf.metadata.get(`${metaPrefix}.attention.layer_norm_rms_epsilon`)),
    maxContext: opts?.maxContext ?? 2048,
  };

  if (cfg.headDim * cfg.nHead !== cfg.dModel) {
    throw new Error(`bun:llm: head_dim*n_head (${cfg.headDim}*${cfg.nHead}) != d_model (${cfg.dModel})`);
  }
  if (cfg.nHead % cfg.nKvHead !== 0) {
    throw new Error(`bun:llm: n_head (${cfg.nHead}) not divisible by n_kv_head (${cfg.nKvHead})`);
  }
  if (cfg.ropeDim !== cfg.headDim) {
    throw new Error(`bun:llm: rope_dim (${cfg.ropeDim}) != head_dim (${cfg.headDim}) — partial RoPE not implemented`);
  }
  if (cfg.headDim % 32 !== 0 || cfg.headDim < 32) {
    // Device attention kernels use warp-reduce over headDim threads.
    throw new Error(`bun:llm: head_dim (${cfg.headDim}) must be a multiple of 32 and ≥32`);
  }

  // hold() on CUDA HtoDs each tensor; on non-CUDA backends it's a view
  // wrapper. Norm weights and biases go through the same hold so the
  // device path can read them via __handle.buffer. For non-CUDA, the
  // wrapper just forwards .view to the underlying Float32Array.
  //
  // Q4_K fast path: when the device-ops kernel module is available (CUDA +
  // NVRTC), and the tensor is Q4_K, and its inner dim is a multiple of 256,
  // we upload the raw super-block bytes and let matVec dequantize on-chip.
  // This avoids ~1 GB of fp32 materialization at load time and cuts the
  // per-token weight bandwidth 4× (144 B/256 elem vs 1024 B/256 elem).
  const devOpsProbe = (gpu.getDevOps && gpu.getDevOps()) || null;
  const canQuant = !!devOpsProbe && typeof gguf.tensorRaw === "function";
  const canQ4K = canQuant && typeof (gpu as any).holdQ4K === "function";
  const canQ6K = canQuant && typeof (gpu as any).holdQ6K === "function";
  const holdWeight = (name: string): Resident => {
    const info = gguf.tensors.get(name);
    if (!info) throw new Error(`bun:llm: GGUF tensor "${name}" not found`);
    // GGUF tensor dims are [ncols, nrows]. Inner (k) is dims[0]. K-quant
    // super-blocks span the inner axis, so k must be a multiple of 256.
    const k = info.dims[0];
    if ((k & 255) === 0) {
      if (canQ4K && info.type === GGML_TYPE_Q4_K_CONST) {
        const raw = gguf.tensorRaw!(name);
        const handle = (gpu as any).holdQ4K(raw.bytes, raw.nElems) as any;
        return new (gpu as any).GpuHandleArray(handle);
      }
      if (canQ6K && info.type === GGML_TYPE_Q6_K_CONST) {
        const raw = gguf.tensorRaw!(name);
        const handle = (gpu as any).holdQ6K(raw.bytes, raw.nElems) as any;
        return new (gpu as any).GpuHandleArray(handle);
      }
    }
    return new gpu.GpuFloat32Array(gguf.tensorF32(name));
  };
  const hold = holdWeight;
  const holdArr = (arr: Float32Array): Resident => new gpu.GpuFloat32Array(arr);

  // Fuse several Q-quant tensors (same quant type, same inner-dim k) into
  // one device-resident handle by concatenating their raw byte streams
  // along the row dimension. Returns null if fusion isn't possible on the
  // current path (no devOps, no tensorRaw, mismatched types, or unsupported
  // quant format).
  const fuseQuant = (names: string[]): Resident | null => {
    if (!canQuant) return null;
    const infos = names.map(n => gguf.tensors.get(n));
    if (infos.some(i => !i)) return null;
    const first = infos[0]!;
    // All must share quant type and inner dim (dims[0]).
    if (!infos.every(i => i!.type === first.type && i!.dims[0] === first.dims[0])) return null;
    if ((first.dims[0] & 255) !== 0) return null;
    let handleFn: ((bytes: Uint8Array, nElems: number) => unknown) | null = null;
    if (canQ4K && first.type === GGML_TYPE_Q4_K_CONST) handleFn = (gpu as any).holdQ4K;
    else if (canQ6K && first.type === GGML_TYPE_Q6_K_CONST) handleFn = (gpu as any).holdQ6K;
    if (!handleFn) return null;
    const raws = names.map(n => gguf.tensorRaw!(n));
    const totalBytes = raws.reduce((a, r) => a + r.bytes.length, 0);
    const totalElems = raws.reduce((a, r) => a + r.nElems, 0);
    const concat = new Uint8Array(totalBytes);
    let off = 0;
    for (const r of raws) {
      concat.set(r.bytes, off);
      off += r.bytes.length;
    }
    const handle = handleFn(concat, totalElems);
    return new (gpu as any).GpuHandleArray(handle);
  };

  const tokenEmbd = hold("token_embd.weight");
  const outputNorm = holdArr(gguf.tensorF32("output_norm.weight"));
  const lmHead = gguf.tensors.has("output.weight") ? hold("output.weight") : undefined;

  let ropeFreqs: Float32Array;
  if (gguf.tensors.has("rope_freqs.weight")) {
    ropeFreqs = gguf.tensorF32("rope_freqs.weight");
  } else {
    ropeFreqs = new Float32Array(cfg.ropeDim / 2).fill(1);
  }

  const layers: LayerWeights[] = new Array(cfg.nLayer);
  for (let l = 0; l < cfg.nLayer; l++) {
    const layer: LayerWeights = {
      attnNorm: holdArr(gguf.tensorF32(`blk.${l}.attn_norm.weight`)),
      wq: hold(`blk.${l}.attn_q.weight`),
      wk: hold(`blk.${l}.attn_k.weight`),
      wv: hold(`blk.${l}.attn_v.weight`),
      wo: hold(`blk.${l}.attn_output.weight`),
      ffnNorm: holdArr(gguf.tensorF32(`blk.${l}.ffn_norm.weight`)),
      wGate: hold(`blk.${l}.ffn_gate.weight`),
      wUp: hold(`blk.${l}.ffn_up.weight`),
      wDown: hold(`blk.${l}.ffn_down.weight`),
    };
    if (isQwen2) {
      const bqKey = `blk.${l}.attn_q.bias`;
      const bkKey = `blk.${l}.attn_k.bias`;
      const bvKey = `blk.${l}.attn_v.bias`;
      if (!gguf.tensors.has(bqKey) || !gguf.tensors.has(bkKey) || !gguf.tensors.has(bvKey)) {
        throw new Error(`bun:llm: qwen2 layer ${l} missing attn_{q,k,v}.bias`);
      }
      layer.bq = hold(bqKey);
      layer.bk = hold(bkKey);
      layer.bv = hold(bvKey);
    }
    // Fused QKV (skip for Qwen2 — those have per-projection biases applied
    // separately, and the fused path would need a fused-bias kernel).
    if (!isQwen2) {
      const fused = fuseQuant([`blk.${l}.attn_q.weight`, `blk.${l}.attn_k.weight`, `blk.${l}.attn_v.weight`]);
      if (fused) layer.wQKV = fused;
    }
    const fusedGU = fuseQuant([`blk.${l}.ffn_gate.weight`, `blk.${l}.ffn_up.weight`]);
    if (fusedGU) layer.wGateUp = fusedGU;
    layers[l] = layer;
  }

  const weights: ModelWeights = { tokenEmbd, lmHead, outputNorm, ropeFreqs, layers };
  return new LlamaModel(cfg, weights);
}

function argmax(logits: Float32Array): number {
  let best = 0;
  let bestV = logits[0];
  for (let i = 1; i < logits.length; i++) {
    if (logits[i] > bestV) {
      bestV = logits[i];
      best = i;
    }
  }
  return best;
}

interface SampleOpts {
  temperature?: number;
  topK?: number;
  topP?: number;
  seed?: number;
}

class Sampler {
  readonly temperature: number;
  readonly topK: number;
  readonly topP: number;
  #rngState: number;

  constructor(opts?: SampleOpts) {
    this.temperature = opts?.temperature ?? 0;
    this.topK = opts?.topK ?? 0;
    this.topP = opts?.topP ?? 0;
    this.#rngState = (opts?.seed ?? 0) >>> 0;
  }

  sample(logits: Float32Array): number {
    if (this.temperature <= 0) return argmax(logits);

    const n = logits.length;
    const ids = new Int32Array(n);
    const vals = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      ids[i] = i;
      vals[i] = logits[i] / this.temperature;
    }

    let k = n;
    if (this.topK > 0 && this.topK < n) {
      const paired: [number, number][] = new Array(n);
      for (let i = 0; i < n; i++) paired[i] = [vals[i], ids[i]];
      paired.sort((a, b) => b[0] - a[0]);
      k = this.topK;
      for (let i = 0; i < k; i++) {
        vals[i] = paired[i][0];
        ids[i] = paired[i][1];
      }
    } else {
      const paired: [number, number][] = new Array(n);
      for (let i = 0; i < n; i++) paired[i] = [vals[i], ids[i]];
      paired.sort((a, b) => b[0] - a[0]);
      for (let i = 0; i < n; i++) {
        vals[i] = paired[i][0];
        ids[i] = paired[i][1];
      }
    }

    let maxV = vals[0];
    let sum = 0;
    const probs = new Float32Array(k);
    for (let i = 0; i < k; i++) {
      const p = Math.exp(vals[i] - maxV);
      probs[i] = p;
      sum += p;
    }
    const invSum = 1 / sum;
    for (let i = 0; i < k; i++) probs[i] *= invSum;

    if (this.topP > 0 && this.topP < 1) {
      let cum = 0;
      let cutoff = k;
      for (let i = 0; i < k; i++) {
        cum += probs[i];
        if (cum >= this.topP) {
          cutoff = i + 1;
          break;
        }
      }
      if (cutoff < k) {
        let s = 0;
        for (let i = 0; i < cutoff; i++) s += probs[i];
        const inv = 1 / s;
        for (let i = 0; i < cutoff; i++) probs[i] *= inv;
        k = cutoff;
      }
    }

    const r = this.#rand();
    let acc = 0;
    for (let i = 0; i < k; i++) {
      acc += probs[i];
      if (r < acc) return ids[i];
    }
    return ids[k - 1];
  }

  #rand(): number {
    if (this.#rngState === 0) return Math.random();
    let t = (this.#rngState = (this.#rngState + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

function sample(logits: Float32Array, opts?: SampleOpts): number {
  return new Sampler(opts).sample(logits);
}

export default {
  LlamaModel,
  KVCache,
  fromGGUF,
  argmax,
  Sampler,
  sample,
};
