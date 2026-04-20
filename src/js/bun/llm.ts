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

  constructor(
    model: InstanceType<typeof llama.LlamaModel>,
    tok: InstanceType<typeof tokenizer.LlamaTokenizer>,
    chatTemplate: ChatTemplate,
  ) {
    this.model = model;
    this.tokenizer = tok;
    this.chatTemplate = chatTemplate;
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
};
