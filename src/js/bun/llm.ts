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
};

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

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
    const promptIds = this.tokenizer.encode(prompt);
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
    const promptIds = this.encodeChat(messages);
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

  // Build the token-id sequence for a chat conversation using the model's
  // detected template. Exposed so callers can inspect/tweak (e.g. to add
  // a continuation prefix to the assistant turn). Throws if no template
  // was detected.
  encodeChat(messages: ChatMessage[]): number[] {
    if (this.chatTemplate === null) {
      throw new Error("bun:llm: no chat template detected for this model");
    }
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
      // Open the assistant turn so the model continues straight into its reply.
      pushPiece("<|start_header_id|>");
      pushText("assistant");
      pushPiece("<|end_header_id|>");
      pushText("\n\n");
    } else if (this.chatTemplate === "chatml") {
      for (const msg of messages) {
        pushPiece("<|im_start|>");
        pushText(msg.role + "\n" + msg.content);
        pushPiece("<|im_end|>");
        pushText("\n");
      }
      pushPiece("<|im_start|>");
      pushText("assistant\n");
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

  async *#generateFromIds(promptIds: number[], opts?: GenerateOptions): AsyncGenerator<string, void, void> {
    if (this.#disposed) throw new Error("bun:llm: LLM already disposed");
    const maxTokens = opts?.maxTokens ?? 256;
    const stopTokens = opts?.stopTokens ?? this.#defaultStop;
    const stopSet = new Set(stopTokens);

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

    // Prefill — run the prompt through the model one token at a time. v0
    // doesn't do batched prefill, so this is O(promptLen * layer * d^2);
    // swap to a prefill kernel once we have one.
    let logits: Float32Array | undefined;
    for (let p = 0; p < promptIds.length; p++) {
      logits = this.model.forward(promptIds[p], p, kv);
    }

    let pos = promptIds.length;
    for (let n = 0; n < maxTokens && pos < maxCtx; n++) {
      const next = sampler.sample(logits!);
      if (stopSet.has(next)) return;
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
};
