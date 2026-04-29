// Hardcoded module "bun:llm"
//
// Parabun: native LLM inference. v0 targets Llama-3.2 1B Q8_0 GGUF on a CUDA
// host (falls back to bun:simd on CPU). The low-level layers — GGUF file
// loader, byte-level BPE tokenizer, and Llama transformer forward pass —
// are exposed directly so callers can inspect intermediate state; the
// high-level `LLM` class wraps them into the usual load-then-generate shape.
//
//   import { LLM } from "bun:llm";
//   using llm = await LLM.load("/path/to/Llama-3.2-1B-Q8_0.gguf");
//   for await (const piece of llm.generate("Hello,", { maxTokens: 20 })) {
//     process.stdout.write(piece);
//   }
//
// Every component returned by the low-level exports is also importable for
// tests and for users who want to hand-roll the pipeline (e.g. stream the
// tokenizer independently, precompute logits outside of generate()).

const gguf = require("./llm/gguf.ts");
const tokenizer = require("./llm/tokenizer.ts");
const llama = require("./llm/llama.ts");
const grammarModule = require("./llm/grammar.ts");
const schemaModule = require("./llm/schema.ts");
const bertModule = require("./llm/bert.ts");
const serveModule = require("./llm/serve.ts");
const whisperModule = require("./llm/whisper.ts");
const signals = require("./signals.ts");
const gpu = require("./gpu.ts");

// Structural Signal types — keep llm.ts agnostic of bun:signals's class
// hierarchy. See `/raid/parabun-site/PLAN-module-signals.md` for the
// cross-module reactive surface plan.
type Signal<T> = {
  get(): T;
  peek(): T;
  subscribe(cb: (v: T) => void): () => void;
};
type WritableSignal<T> = Signal<T> & { set(v: T): void };

type GenerateOptions = {
  maxTokens?: number;
  // Stop generation if any of these token ids are produced. Defaults to the
  // model's EOS + any detected chat-template terminator (e.g. <|eot_id|>
  // for Llama-3). Pass `[]` to disable and rely solely on maxTokens.
  stopTokens?: number[];
  // Include the prompt's decoded text in the first yielded chunk. Off by
  // default — most callers echo the prompt themselves.
  includePrompt?: boolean;
  // Sampling controls. temperature=0 (or unset) = greedy/argmax.
  // temperature>0 with topK/topP applies the usual nucleus filter.
  // `seed` seeds mulberry32 for reproducible sampling; omit for Math.random.
  temperature?: number;
  topK?: number;
  topP?: number;
  seed?: number;
  // Constrained decoding. Exactly one of `grammar` (GBNF source) or `schema`
  // (JSON-schema object) may be set — tokens that would take the grammar
  // off-accept are masked to -Infinity before sampling, so the generation
  // is guaranteed to conform. EOS and chat-template stop tokens are only
  // allowed once the grammar reaches an accepting state.
  grammar?: string;
  schema?: object;
  // Additive bias in logit space, indexed by token id. Useful to nudge
  // specific tokens without perturbing the full distribution — e.g.
  // { 13: -5 } to discourage newlines, or { 128009: 2 } to make Llama-3's
  // <|eot_id|> slightly more attractive for short-form responses.
  logitBias?: Record<number, number>;
  // Reuse a precomputed KV prefix (see `llm.prefix()` / `llm.prefixChat()`).
  // The prompt passed to this generate/chat call must begin with the
  // tokens captured in the prefix; we restore the prefix's KV state,
  // skip those tokens in prefill, and only run forward() over the
  // trailing tokens. Saves O(prefixLen * layer * d^2) FLOPs per call.
  prefix?: PrefixCache;
  // Speculative decoding (Leviathan et al. 2023). On every round the
  // draft model proposes `speculativeK` tokens; the target model scores
  // them; each is accepted with prob min(1, p(x)/q(x)) and the first
  // rejection resamples from (p - q)+. Committed tokens per round: at
  // least 1 (on reject, the resampled token) up to k+1 (all accepted
  // plus a bonus sample from the target's distribution at position
  // pos+k). The draft must share the target's vocab — we check the
  // vocabulary length; mismatched token ids would silently corrupt the
  // sampling math. Grammar/schema/logitBias/topK/topP are not yet
  // supported with speculative decoding and will throw at call time.
  draft?: LLM;
  speculativeK?: number;
};

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

// Opaque handle returned by `llm.prefix()` / `llm.prefixChat()`. Captures
// the KV state and last-position logits produced by prefilling a token
// sequence, so future generate/chat calls that start with the same
// tokens can skip that prefill. Construction is async (runs the prefill);
// reuse is synchronous. Reference-equality against `#owner` is how we
// detect cross-model misuse — the snapshot's row shape would not match.
class PrefixCache {
  readonly tokens: number[];
  readonly snapshot: { k: Float32Array[]; v: Float32Array[]; length: number; rowSize: number };
  readonly logits: Float32Array;
  readonly #owner: InstanceType<typeof llama.LlamaModel>;

  constructor(
    tokens: number[],
    snapshot: { k: Float32Array[]; v: Float32Array[]; length: number; rowSize: number },
    logits: Float32Array,
    owner: InstanceType<typeof llama.LlamaModel>,
  ) {
    this.tokens = tokens;
    this.snapshot = snapshot;
    this.logits = logits;
    this.#owner = owner;
  }

  // Internal: check that `model` is the same LlamaModel that built this
  // prefix. Defends against passing a prefix built on model A to model B
  // of the same architecture — the snapshot shape would coincidentally
  // match but the KV contents are invalid.
  __matches(model: InstanceType<typeof llama.LlamaModel>): boolean {
    return this.#owner === model;
  }
}

type ChatTemplate = "llama3" | "chatml" | "mistral" | null;

// Detect the chat template family from the GGUF's embedded Jinja2 template.
// Exact-match Jinja parsing is way too much surface for the win — three
// hard-coded families cover ~90% of instruction-tuned checkpoints in the
// wild. If we can't identify the template, chat() throws and callers fall
// back to plain generate() with their own string formatting.
// Softmax with temperature. `temperature <= 0` collapses to a one-hot
// at argmax — matches Sampler's greedy convention so speculative
// decoding at temp=0 behaves like deterministic draft/target match
// (accept iff argmax_p == proposal, resample to argmax_p on reject).
// Returned array owns its storage; caller can keep it.
function softmaxWithTemp(logits: Float32Array, temperature: number): Float32Array {
  const n = logits.length;
  const out = new Float32Array(n);
  if (temperature <= 0) {
    let best = -Infinity;
    let bestI = 0;
    for (let i = 0; i < n; i++) {
      if (logits[i] > best) {
        best = logits[i];
        bestI = i;
      }
    }
    out[bestI] = 1;
    return out;
  }
  const invT = 1 / temperature;
  let maxV = -Infinity;
  for (let i = 0; i < n; i++) {
    const v = logits[i] * invT;
    if (v > maxV) maxV = v;
  }
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const e = Math.exp(logits[i] * invT - maxV);
    out[i] = e;
    sum += e;
  }
  const inv = 1 / sum;
  for (let i = 0; i < n; i++) out[i] *= inv;
  return out;
}

// Categorical sample from a distribution over [0, probs.length). Uses
// the supplied rng closure so seeded speculative runs stay reproducible.
function categorical(probs: Float32Array, rng: () => number): number {
  const r = rng();
  const n = probs.length;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += probs[i];
    if (r < acc) return i;
  }
  return n - 1;
}

// mulberry32 PRNG. Identical algorithm to the one inside llama.Sampler
// so a single `seed` can drive both the draft's direct sampling and the
// speculative accept/reject coin flips when needed. When seed==0 we
// fall back to Math.random for the "unseeded" convention.
function mulberry32(seed: number): () => number {
  if (seed === 0) return () => Math.random();
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function detectChatTemplate(gguf: { metadata: Map<string, unknown> }): ChatTemplate {
  const tpl = gguf.metadata.get("tokenizer.chat_template");
  if (typeof tpl !== "string") return null;
  if (tpl.includes("<|eot_id|>")) return "llama3";
  if (tpl.includes("<|im_start|>")) return "chatml";
  if (tpl.includes("[INST]")) return "mistral";
  return null;
}

class LLM {
  readonly model: InstanceType<typeof llama.LlamaModel>;
  readonly tokenizer: InstanceType<typeof tokenizer.LlamaTokenizer>;
  readonly chatTemplate: ChatTemplate;
  readonly #defaultStop: number[];
  #disposed = false;
  #tokenBytes: Uint8Array[] | null = null;
  #specialIds: Set<number> | null = null;
  // Reactive surface (PLAN-module-signals item 2). Tracks active
  // generations + the active gpu backend. `bun:assistant` reads
  // `m.busy` to dim its UI during generation.
  #busyCount = 0;
  #busy: WritableSignal<boolean>;
  #device: WritableSignal<"cuda" | "metal" | "cpu">;

  get busy(): Signal<boolean> {
    return this.#busy;
  }

  get device(): Signal<"cuda" | "metal" | "cpu"> {
    return this.#device;
  }

  /**
   * Increment the busy refcount and flip `busy` to true. Decrement
   * counterpart in `#endBusy`. The refcount lets concurrent ops (rare
   * but legal — multiple parallel chat streams against the same model)
   * stay "busy" until the last one finishes.
   */
  #beginBusy(): void {
    this.#busyCount++;
    if (this.#busyCount === 1) this.#busy.set(true);
  }

  #endBusy(): void {
    this.#busyCount = Math.max(0, this.#busyCount - 1);
    if (this.#busyCount === 0) this.#busy.set(false);
  }

  constructor(
    model: InstanceType<typeof llama.LlamaModel>,
    tok: InstanceType<typeof tokenizer.LlamaTokenizer>,
    chatTemplate: ChatTemplate,
  ) {
    this.model = model;
    this.tokenizer = tok;
    this.chatTemplate = chatTemplate;
    this.#busy = signals.signal(false);
    this.#device = signals.signal((gpu.describe().active as "cuda" | "metal" | "cpu") ?? "cpu");
    // Default stop set: the model's EOS, plus any extra terminators implied
    // by the chat template that aren't the EOS itself. Without this, Llama-3
    // generations that hit <|end_of_text|> (128001, distinct from <|eot_id|>)
    // run to maxTokens with garbage at the tail.
    const stop = new Set<number>([tok.eos]);
    if (chatTemplate === "llama3") {
      const eot = tok.vocabId.get("<|eot_id|>");
      const eom = tok.vocabId.get("<|end_of_text|>");
      if (eot !== undefined) stop.add(eot);
      if (eom !== undefined) stop.add(eom);
    } else if (chatTemplate === "chatml") {
      const imEnd = tok.vocabId.get("<|im_end|>");
      if (imEnd !== undefined) stop.add(imEnd);
    } else if (chatTemplate === "mistral") {
      const eosPiece = tok.vocabId.get("</s>");
      if (eosPiece !== undefined) stop.add(eosPiece);
    }
    this.#defaultStop = [...stop];
  }

  static async load(path: string, opts?: { maxContext?: number }): Promise<LLM> {
    const file = await gguf.loadGGUF(path);
    const model = llama.fromGGUF(file, opts);
    const tok = tokenizer.fromGGUF(file);
    const chatTemplate = detectChatTemplate(file);
    return new LLM(model, tok, chatTemplate);
  }

  // Generation. Defaults to greedy (temperature=0); pass `temperature>0`
  // along with optional topK/topP for nucleus sampling. Yields decoded
  // text chunks one token at a time so callers can stream. Stops on any
  // stopTokens hit, on reaching maxTokens, or when the position would
  // overflow the KV cache.
  async *generate(prompt: string, opts?: GenerateOptions): AsyncGenerator<string, void, void> {
    let promptIds: number[];
    if (opts?.prefix) {
      // Prefix IS the prelude — `prompt` is the continuation, encoded
      // without BOS and appended to the prefix's token ids. We do NOT
      // re-tokenize (prefix_text + prompt) because BPE merges across
      // the seam would silently shift tokens and break the KV match.
      const contIds = this.tokenizer.encode(prompt, { addBos: false });
      promptIds = opts.prefix.tokens.concat(contIds);
    } else {
      promptIds = this.tokenizer.encode(prompt);
    }
    const includePrompt = opts?.includePrompt ?? false;
    if (includePrompt) yield prompt;
    yield* this.#generateFromIds(promptIds, opts);
  }

  // Chat-formatted generation. Takes an OpenAI-style message list and
  // frames it with the model's detected chat template (Llama-3 /
  // ChatML / Mistral — detected at load time from tokenizer.chat_template).
  // Throws if no template was detected; drop down to generate() with your
  // own framing in that case. Same sampling/stop options as generate().
  async *chat(messages: ChatMessage[], opts?: GenerateOptions): AsyncGenerator<string, void, void> {
    if (this.chatTemplate === null) {
      throw new Error("bun:llm: no chat template detected for this model; use generate() with explicit framing");
    }
    let promptIds = this.encodeChat(messages);
    if (opts?.prefix) {
      // Chat prefixes are built from a prefix message list; the full
      // message list must start with those same messages so its encoded
      // token stream begins with the prefix tokens. We verify here and
      // bypass re-prefilling the shared part — #generateFromIds does
      // the actual match check.
      const pre = opts.prefix.tokens;
      if (promptIds.length < pre.length) {
        throw new Error(
          `bun:llm: chat prompt (${promptIds.length} tokens) is shorter than prefix (${pre.length}) — was the prefix built from a superset of these messages?`,
        );
      }
    }
    yield* this.#generateFromIds(promptIds, opts);
  }

  // Single-shot convenience: run generate() and concatenate the chunks.
  async complete(prompt: string, opts?: GenerateOptions): Promise<string> {
    let out = "";
    for await (const chunk of this.generate(prompt, opts)) out += chunk;
    return out;
  }

  // Single-shot chat convenience: run chat() and concatenate the chunks.
  async chatComplete(messages: ChatMessage[], opts?: GenerateOptions): Promise<string> {
    let out = "";
    for await (const chunk of this.chat(messages, opts)) out += chunk;
    return out;
  }

  // Build a reusable KV prefix from a plaintext prompt. Tokenizes (with
  // BOS), runs prefill once, snapshots the KV and the last-position
  // logits, and returns a handle. Pass the handle as `opts.prefix` on a
  // future generate() call whose prompt begins with the same text to
  // skip the prefill. Saves the full prefill FLOPs; on the device path
  // the snapshot round-trips KV through host memory once here, but
  // subsequent restores are amortized across many reuses.
  async prefix(text: string): Promise<PrefixCache> {
    const ids = this.tokenizer.encode(text);
    return this.#buildPrefix(ids);
  }

  // Build a reusable KV prefix from a chat conversation. Same idea as
  // `prefix()` but frames the messages with the model's detected chat
  // template first — useful for caching a long system prompt across
  // many user turns.
  async prefixChat(messages: ChatMessage[]): Promise<PrefixCache> {
    if (this.chatTemplate === null) {
      throw new Error("bun:llm: no chat template detected for this model; use prefix() with explicit framing");
    }
    // Don't emit the assistant-turn opener — follow-up chat() calls will
    // add more user/assistant turns before that opener, so including it
    // here would make the encoded stream diverge from the full chat.
    const ids = this.encodeChat(messages, { openAssistant: false });
    return this.#buildPrefix(ids);
  }

  async #buildPrefix(ids: number[]): Promise<PrefixCache> {
    if (this.#disposed) throw new Error("bun:llm: LLM already disposed");
    if (ids.length === 0) throw new Error("bun:llm: cannot build prefix from empty token sequence");
    this.#beginBusy();
    const kv = this.model.newKVCache();
    try {
      if (ids.length >= kv.maxContext()) {
        throw new Error(`bun:llm: prefix of ${ids.length} tokens exceeds maxContext=${kv.maxContext()}`);
      }
      let logits: Float32Array | undefined;
      for (let p = 0; p < ids.length; p++) {
        logits = this.model.forward(ids[p], p, kv);
      }
      const snap = kv.snapshot(ids.length);
      return new PrefixCache(ids.slice(), snap, logits!, this.model);
    } finally {
      kv.dispose();
      this.#endBusy();
    }
  }

  // Sentence embedding from a causal LM. Runs the transformer forward across
  // all tokens and pools the post-output-norm hidden states. The last-token
  // pooling is the natural choice for a decoder (it's the only position that
  // saw the whole prompt) — `mean` is provided for symmetry with BERT-style
  // embedders but is numerically less useful for causal models because
  // earlier positions couldn't see later ones. Returns a Float32Array of
  // length dModel; L2-normalized by default so cosine similarity = dot
  // product.
  async embed(text: string, opts?: { pool?: "last" | "mean"; normalize?: boolean }): Promise<Float32Array> {
    if (this.#disposed) throw new Error("bun:llm: LLM already disposed");
    const pool = opts?.pool ?? "last";
    const normalize = opts?.normalize ?? true;
    const ids = this.tokenizer.encode(text);
    if (ids.length === 0) throw new Error("bun:llm: cannot embed empty text");

    const dModel = this.model.cfg.dModel;
    this.#beginBusy();
    const kv = this.model.newKVCache();
    try {
      if (ids.length > kv.maxContext()) {
        throw new Error(`bun:llm: text has ${ids.length} tokens, exceeds maxContext=${kv.maxContext()}`);
      }

      const out = new Float32Array(dModel);
      if (pool === "last") {
        for (let p = 0; p < ids.length - 1; p++) this.model.forwardHidden(ids[p], p, kv);
        const last = this.model.forwardHidden(ids[ids.length - 1], ids.length - 1, kv);
        out.set(last);
      } else {
        for (let p = 0; p < ids.length; p++) {
          const h = this.model.forwardHidden(ids[p], p, kv);
          for (let i = 0; i < dModel; i++) out[i] += h[i];
        }
        const invN = 1.0 / ids.length;
        for (let i = 0; i < dModel; i++) out[i] *= invN;
      }
      if (normalize) {
        let n2 = 0;
        for (let i = 0; i < dModel; i++) n2 += out[i] * out[i];
        const inv = 1.0 / Math.sqrt(n2 + 1e-30);
        for (let i = 0; i < dModel; i++) out[i] *= inv;
      }
      return out;
    } finally {
      kv.dispose();
      this.#endBusy();
    }
  }

  // Build the token-id sequence for a chat conversation using the model's
  // detected template. Exposed so callers can inspect/tweak (e.g. to add
  // a continuation prefix to the assistant turn). Throws if no template
  // was detected.
  //
  // `openAssistant` (default true) appends the assistant turn opener so
  // sampling continues straight into the reply. Set to false when
  // building a prefix KV over shared history — the follow-up encoded
  // conversation (which includes user turns after this point) must
  // remain byte-identical up to the same boundary, and the opener
  // doesn't belong there.
  encodeChat(messages: ChatMessage[], opts?: { openAssistant?: boolean }): number[] {
    if (this.chatTemplate === null) {
      throw new Error("bun:llm: no chat template detected for this model");
    }
    const openAssistant = opts?.openAssistant ?? true;
    const tok = this.tokenizer;
    const ids: number[] = [];
    const pushPiece = (piece: string): void => {
      const id = tok.vocabId.get(piece);
      if (id === undefined) throw new Error(`bun:llm: template piece "${piece}" not in tokenizer vocab`);
      ids.push(id);
    };
    const pushText = (text: string): void => {
      for (const id of tok.encode(text, { addBos: false })) ids.push(id);
    };

    if (this.chatTemplate === "llama3") {
      ids.push(tok.bos);
      for (const msg of messages) {
        pushPiece("<|start_header_id|>");
        pushText(msg.role);
        pushPiece("<|end_header_id|>");
        pushText("\n\n" + msg.content);
        pushPiece("<|eot_id|>");
      }
      if (openAssistant) {
        pushPiece("<|start_header_id|>");
        pushText("assistant");
        pushPiece("<|end_header_id|>");
        pushText("\n\n");
      }
    } else if (this.chatTemplate === "chatml") {
      for (const msg of messages) {
        pushPiece("<|im_start|>");
        pushText(msg.role + "\n" + msg.content);
        pushPiece("<|im_end|>");
        pushText("\n");
      }
      if (openAssistant) {
        pushPiece("<|im_start|>");
        pushText("assistant\n");
      }
    } else if (this.chatTemplate === "mistral") {
      // Mistral Instruct framing: <s>[INST] user [/INST] assistant </s>[INST] ...
      // System messages are folded into the first user turn, per Mistral's
      // official template (there's no native system role in the base format).
      ids.push(tok.bos);
      let pendingSystem = "";
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (msg.role === "system") {
          pendingSystem += (pendingSystem ? "\n\n" : "") + msg.content;
          continue;
        }
        if (msg.role === "user") {
          pushText("[INST] ");
          if (pendingSystem) {
            pushText(pendingSystem + "\n\n");
            pendingSystem = "";
          }
          pushText(msg.content + " [/INST]");
        } else if (msg.role === "assistant") {
          pushText(msg.content);
          const eosPiece = tok.vocabId.get("</s>");
          if (eosPiece !== undefined) ids.push(eosPiece);
        }
      }
    }
    return ids;
  }

  // Lazily build the (vocab-size) table of UTF-8 bytes each token contributes
  // when decoded, plus the set of control/special token ids to mask out
  // during constrained decoding. Built once on first use and cached — the
  // full scan of 128k entries costs ~50ms, not worth paying at load time
  // when most callers never need it.
  #getTokenBytes(): { tokenBytes: Uint8Array[]; specialIds: Set<number> } {
    if (this.#tokenBytes !== null && this.#specialIds !== null) {
      return { tokenBytes: this.#tokenBytes, specialIds: this.#specialIds };
    }
    const tok = this.tokenizer;
    const n = tok.vocab.length;
    const bytes: Uint8Array[] = new Array(n);
    const special = new Set<number>();
    const enc = new TextEncoder();
    for (let i = 0; i < n; i++) {
      if (tok.tokenType[i] === 3) {
        special.add(i);
        bytes[i] = new Uint8Array(0);
        continue;
      }
      try {
        bytes[i] = enc.encode(tok.decode([i]));
      } catch {
        bytes[i] = new Uint8Array(0);
      }
    }
    this.#tokenBytes = bytes;
    this.#specialIds = special;
    return { tokenBytes: bytes, specialIds: special };
  }

  async *#generateFromIds(promptIds: number[], opts?: GenerateOptions): AsyncGenerator<string, void, void> {
    if (this.#disposed) throw new Error("bun:llm: LLM already disposed");

    // busy refcount for the reactive `m.busy` signal — covers every
    // path through generate() / chat() / their *Complete shims since
    // they all funnel through here. Speculative decoding (handled
    // below) inherits the same boundary.
    this.#beginBusy();
    try {
      // Route speculative decoding to its own loop — the structure
      // (round-based propose/verify, target+draft KV bookkeeping) doesn't
      // fit into the normal per-token loop cleanly.
      if (opts?.draft) {
        yield* this.#speculativeFromIds(promptIds, opts.draft, opts);
        return;
      }
      yield* this.#generateFromIdsInner(promptIds, opts);
    } finally {
      this.#endBusy();
    }
  }

  async *#generateFromIdsInner(promptIds: number[], opts?: GenerateOptions): AsyncGenerator<string, void, void> {
    const maxTokens = opts?.maxTokens ?? 256;
    const stopTokens = opts?.stopTokens ?? this.#defaultStop;
    const stopSet = new Set(stopTokens);
    const logitBias = opts?.logitBias;

    if (opts?.grammar !== undefined && opts?.schema !== undefined) {
      throw new Error("bun:llm: pass either `grammar` or `schema`, not both");
    }
    let grammar: InstanceType<typeof grammarModule.Grammar> | null = null;
    if (opts?.grammar !== undefined || opts?.schema !== undefined) {
      const rules =
        opts!.grammar !== undefined
          ? grammarModule.parseGBNF(opts!.grammar)
          : schemaModule.compileSchema(opts!.schema as Record<string, unknown>);
      const { tokenBytes, specialIds } = this.#getTokenBytes();
      grammar = new grammarModule.Grammar(rules, {
        tokenBytes,
        specialIds,
        eos: this.tokenizer.eos,
        stopIds: [...stopSet].filter(id => id !== this.tokenizer.eos),
      });
    }

    const sampler = new llama.Sampler({
      temperature: opts?.temperature,
      topK: opts?.topK,
      topP: opts?.topP,
      seed: opts?.seed,
    });

    const kv = this.model.newKVCache();
    const maxCtx = kv.maxContext();

    if (promptIds.length >= maxCtx) {
      throw new Error(`bun:llm: prompt of ${promptIds.length} tokens exceeds maxContext=${maxCtx}`);
    }

    // Restore prefix KV if one was supplied. The prompt must begin with
    // the prefix's exact token sequence — we verify here rather than
    // trust the caller because a silent mismatch would produce garbage
    // conditioned on the wrong context.
    let prefillStart = 0;
    let logits: Float32Array | undefined;
    if (opts?.prefix) {
      const p = opts.prefix;
      if (!p.__matches(this.model)) {
        throw new Error("bun:llm: prefix was built for a different model instance");
      }
      if (p.tokens.length > promptIds.length) {
        throw new Error(`bun:llm: prompt of ${promptIds.length} tokens is shorter than prefix of ${p.tokens.length}`);
      }
      for (let i = 0; i < p.tokens.length; i++) {
        if (promptIds[i] !== p.tokens[i]) {
          throw new Error(`bun:llm: prompt does not start with prefix tokens (diverges at index ${i})`);
        }
      }
      kv.restore(p.snapshot);
      prefillStart = p.tokens.length;
      // If the prompt IS the prefix (nothing new to prefill), seed logits
      // from the snapshot so the first sampled token uses the correct
      // distribution. We clone because the sampling loop mutates logits
      // in place (logit bias, grammar mask).
      if (prefillStart === promptIds.length) {
        logits = new Float32Array(p.logits);
      }
    }

    // Prefill — run the prompt through the model one token at a time. v0
    // doesn't do batched prefill, so this is O(promptLen * layer * d^2);
    // swap to a prefill kernel once we have one.
    for (let p = prefillStart; p < promptIds.length; p++) {
      logits = this.model.forward(promptIds[p], p, kv);
    }

    let pos = promptIds.length;
    for (let n = 0; n < maxTokens && pos < maxCtx; n++) {
      if (logitBias) {
        for (const key in logitBias) {
          const id = +key;
          if (id >= 0 && id < logits!.length) logits![id] += logitBias[key];
        }
      }
      if (grammar) {
        const mask = grammar.allowedMask();
        for (let i = 0; i < logits!.length; i++) {
          if (!mask[i]) logits![i] = -Infinity;
        }
      }
      const next = sampler.sample(logits!);
      if (stopSet.has(next)) return;
      if (grammar) grammar.accept(next);
      yield this.tokenizer.decode([next]);
      logits = this.model.forward(next, pos, kv);
      pos++;
    }
  }

  // Speculative decoding loop (Leviathan et al.). Each round:
  //   1. Draft proposes k tokens x_0..x_{k-1}, recording its distribution
  //      q_i at each step and advancing its own KV.
  //   2. Target scores the same k tokens, producing distributions
  //      p_0..p_k (p_k is the target's next-token distribution after
  //      all k proposals) and advancing its KV.
  //   3. For i in 0..k-1: accept x_i with prob min(1, p_i(x_i)/q_i(x_i)).
  //      On reject: resample from (p_i - q_i)+ and abort the round.
  //      If all accepted: bonus-sample from p_k and continue.
  //
  // Constraints we enforce here and not in the public docs:
  //   - topK/topP/grammar/schema/logitBias would each have to be applied
  //     to BOTH distributions to keep the sampling math sound. v0 doesn't
  //     yet — we throw rather than silently produce biased outputs.
  //   - The draft must share the target's vocabulary. We check vocab
  //     length as a practical proxy; callers running wildly different
  //     models will get nonsense long before the check matters.
  //   - opts.prefix doesn't compose with speculative v0 (would need the
  //     draft to hold its own matching prefix too).
  async *#speculativeFromIds(
    promptIds: number[],
    draft: LLM,
    opts: GenerateOptions,
  ): AsyncGenerator<string, void, void> {
    if (draft.#disposed) throw new Error("bun:llm: draft model already disposed");
    if (draft.tokenizer.vocab.length !== this.tokenizer.vocab.length) {
      throw new Error(
        `bun:llm: draft vocab size ${draft.tokenizer.vocab.length} doesn't match target ${this.tokenizer.vocab.length}`,
      );
    }
    if (opts.grammar !== undefined || opts.schema !== undefined || opts.logitBias !== undefined) {
      throw new Error("bun:llm: grammar/schema/logitBias not yet supported with speculative decoding");
    }
    if ((opts.topK ?? 0) > 0 || (opts.topP ?? 0) > 0) {
      throw new Error("bun:llm: topK/topP not yet supported with speculative decoding");
    }
    if (opts.prefix !== undefined) {
      throw new Error("bun:llm: prefix caching not yet supported with speculative decoding");
    }

    const k = opts.speculativeK ?? 4;
    if (!Number.isInteger(k) || k < 1) {
      throw new Error(`bun:llm: speculativeK must be a positive integer, got ${k}`);
    }
    const maxTokens = opts.maxTokens ?? 256;
    const temperature = opts.temperature ?? 0;
    const stopTokens = opts.stopTokens ?? this.#defaultStop;
    const stopSet = new Set(stopTokens);
    const vocabSize = this.tokenizer.vocab.length;

    // Shared RNG for both the draft's sampling and the target's
    // accept/reject coin flips — lets a single `seed` option fully
    // determine the output for reproducibility in tests.
    const rng = mulberry32((opts.seed ?? 0) >>> 0);

    const targetKV = this.model.newKVCache();
    const draftKV = draft.model.newKVCache();
    const maxCtx = Math.min(targetKV.maxContext(), draftKV.maxContext());

    try {
      if (promptIds.length >= maxCtx) {
        throw new Error(`bun:llm: prompt of ${promptIds.length} tokens exceeds maxContext=${maxCtx}`);
      }

      // Prefill both models in lockstep. We need the last-position logits
      // from each to kick off the first round.
      let targetLogits: Float32Array | undefined;
      let draftLogits: Float32Array | undefined;
      for (let p = 0; p < promptIds.length; p++) {
        targetLogits = this.model.forward(promptIds[p], p, targetKV);
        draftLogits = draft.model.forward(promptIds[p], p, draftKV);
      }

      let pos = promptIds.length;
      let emitted = 0;
      while (emitted < maxTokens && pos < maxCtx) {
        const roundK = Math.min(k, maxCtx - pos - 1);
        if (roundK <= 0) break;

        // 1. Draft proposes roundK tokens and advances its own KV.
        const proposals: number[] = new Array(roundK);
        const qDists: Float32Array[] = new Array(roundK);
        for (let i = 0; i < roundK; i++) {
          const q = softmaxWithTemp(draftLogits!, temperature);
          const x = categorical(q, rng);
          proposals[i] = x;
          qDists[i] = q;
          draftLogits = draft.model.forward(x, pos + i, draftKV);
        }

        // 2. Target scores the proposals sequentially. pDists[i] is the
        //    target's distribution at position pos+i conditioned on the
        //    accepted prefix + proposals[0..i-1]. pDists[roundK] is what
        //    we bonus-sample if every proposal gets accepted.
        const pDists: Float32Array[] = new Array(roundK + 1);
        pDists[0] = softmaxWithTemp(targetLogits!, temperature);
        for (let i = 0; i < roundK; i++) {
          const next = this.model.forward(proposals[i], pos + i, targetKV);
          pDists[i + 1] = softmaxWithTemp(next, temperature);
          if (i === roundK - 1) targetLogits = next;
        }

        // 3. Accept/reject.
        let acceptedInRound = 0;
        let rejected = false;
        for (let i = 0; i < roundK; i++) {
          const x = proposals[i];
          const p_x = pDists[i][x];
          const q_x = qDists[i][x];
          const ratio = q_x > 0 ? p_x / q_x : 1;
          const accept = rng() < Math.min(1, ratio);
          if (accept) {
            yield this.tokenizer.decode([x]);
            emitted++;
            acceptedInRound++;
            if (stopSet.has(x)) return;
            if (emitted >= maxTokens) return;
          } else {
            // Resample from the residual (p - q)+. With prob 1, this is
            // a valid distribution (mass p - q >= 0, normalized). The
            // edge case where p <= q everywhere — impossible if p and q
            // are both valid distributions over the same vocab and
            // p(x) < q(x) for the x we just rejected — but guard anyway
            // by falling back to p.
            const adj = new Float32Array(vocabSize);
            let sumAdj = 0;
            const pi = pDists[i];
            const qi = qDists[i];
            for (let j = 0; j < vocabSize; j++) {
              const diff = pi[j] - qi[j];
              if (diff > 0) {
                adj[j] = diff;
                sumAdj += diff;
              }
            }
            if (sumAdj > 0) {
              const inv = 1 / sumAdj;
              for (let j = 0; j < vocabSize; j++) adj[j] *= inv;
            } else {
              adj.set(pi);
            }
            const resampled = categorical(adj, rng);
            // Commit the resampled token at position pos+acceptedInRound
            // in both caches. This overwrites the stale KV slots the
            // forwards above wrote for the rejected proposal and any
            // proposals after it — we just re-run forward at the right
            // position. Positions beyond pos+acceptedInRound stay stale
            // but will be overwritten next round.
            targetLogits = this.model.forward(resampled, pos + acceptedInRound, targetKV);
            draftLogits = draft.model.forward(resampled, pos + acceptedInRound, draftKV);
            yield this.tokenizer.decode([resampled]);
            emitted++;
            acceptedInRound++;
            if (stopSet.has(resampled)) return;
            if (emitted >= maxTokens) return;
            rejected = true;
            break;
          }
        }

        if (!rejected) {
          // All k accepted — bonus sample from p at position pos+roundK.
          const bonus = categorical(pDists[roundK], rng);
          // Commit: advance both caches to consume the bonus token and
          // leave fresh logits for the next round.
          targetLogits = this.model.forward(bonus, pos + roundK, targetKV);
          draftLogits = draft.model.forward(bonus, pos + roundK, draftKV);
          yield this.tokenizer.decode([bonus]);
          emitted++;
          acceptedInRound++;
          if (stopSet.has(bonus)) return;
        }

        pos += acceptedInRound;
      }
    } finally {
      targetKV.dispose();
      draftKV.dispose();
    }
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
  LLM,
  // Low-level constructors — useful for tests and advanced callers.
  loadGGUF: gguf.loadGGUF,
  GGUFFile: gguf.GGUFFile,
  GGML_TYPE_F32: gguf.GGML_TYPE_F32,
  GGML_TYPE_F16: gguf.GGML_TYPE_F16,
  GGML_TYPE_Q8_0: gguf.GGML_TYPE_Q8_0,
  GGML_TYPE_Q2_K: gguf.GGML_TYPE_Q2_K,
  GGML_TYPE_Q3_K: gguf.GGML_TYPE_Q3_K,
  GGML_TYPE_Q4_K: gguf.GGML_TYPE_Q4_K,
  GGML_TYPE_Q5_K: gguf.GGML_TYPE_Q5_K,
  GGML_TYPE_Q6_K: gguf.GGML_TYPE_Q6_K,
  LlamaModel: llama.LlamaModel,
  KVCache: llama.KVCache,
  llamaFromGGUF: llama.fromGGUF,
  argmax: llama.argmax,
  Sampler: llama.Sampler,
  sample: llama.sample,
  LlamaTokenizer: tokenizer.LlamaTokenizer,
  tokenizerFromGGUF: tokenizer.fromGGUF,
  // Constrained decoding primitives — precompile once, reuse across calls.
  parseGBNF: grammarModule.parseGBNF,
  compileSchema: schemaModule.compileSchema,
  Grammar: grammarModule.Grammar,
  // KV prefix cache — callers normally acquire one via `llm.prefix()`
  // or `llm.prefixChat()` and pass it as `opts.prefix`; the class is
  // exported so tests can type-check references and advanced callers
  // can hold their own (e.g. serialize, compose).
  PrefixCache,
  // BERT-family sentence encoders (BGE / E5 / MiniLM). Use `Encoder.load`
  // for the high-level path; `BertModel` / `BertTokenizer` / `bertFromGGUF`
  // are exposed for callers that want to drive the forward pass themselves.
  Encoder: bertModule.Encoder,
  BertModel: bertModule.BertModel,
  BertTokenizer: bertModule.BertTokenizer,
  bertFromGGUF: bertModule.fromGGUF,
  bertTokenizerFromGGUF: bertModule.tokenizerFromGGUF,
  // OpenAI-compatible HTTP server. Wraps any object with .chat() /
  // .generate() / .embed() — typically an LLM instance from above.
  serve: serveModule.serve,
  // Whisper-class encoder-decoder STT. Loads whisper.cpp .bin files and
  // runs greedy auto-regressive decoding. Pure-JS forward pass for now —
  // a CUDA path follows once this matures past tiny.en.
  WhisperModel: whisperModule.WhisperModel,
  WhisperTokenizer: whisperModule.WhisperTokenizer,
  // Quantized matVec helpers (LYK-755). Operate directly on GGML v1
  // block bytes — Q4_0 / Q5_0 / Q5_1 / Q8_0 — so callers can compute
  // weighted dot-products without first materializing a fp32 weight
  // matrix. Useful for embedded targets where RAM is the binding
  // constraint. The whisper module uses these internally; exposed here
  // so users with their own quant-aware paths can reuse them.
  quantMatVec: whisperModule.quantMatVec,
};
