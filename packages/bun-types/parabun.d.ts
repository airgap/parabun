// Type declarations for Parabun's runtime modules (parabun:*). The
// implementations live in src/js/bun/. tsc has no way to find them
// otherwise — the modules are loaded via Bun's InternalModuleRegistry,
// not from disk, so without these ambient declarations every
// `import "parabun:assistant"` etc. returns `any`.
//
// Covers every `parabun:*` runtime module registered by
// src/codegen/bundle-modules.ts: assistant, audio, camera, csv, gpio,
// gpu, i2c, image, llm, speech, spi, video, vision. Surfaces are mirrored
// from the implementations under src/js/bun/<name>.ts. Re-run the
// per-module agent if a module's public API drifts.

declare module "parabun:assistant" {
  // ─── Reactive primitive (matches @para/signals' Signal<T>) ────────────────
  interface Signal<T> {
    get(): T;
    peek(): T;
    subscribe(cb: (v: T) => void): () => void;
  }

  // ─── Conversational state machine ─────────────────────────────────────────
  type AssistantState = "idle" | "listening" | "thinking" | "speaking";

  interface Message {
    role: "system" | "user" | "assistant";
    content: string;
  }

  interface Turn {
    /** Transcribed user input. `null` for proactive turns (e.g. `bot.say`). */
    user: string | null;
    /** Generated assistant reply. */
    assistant: string;
    /** Tool-call records — populated when `tools` are configured. */
    toolCalls: Array<{ name: string; args: unknown; result: unknown }>;
    startedAtMs: number;
    endedAtMs: number;
    /** True if the turn was cut short by VAD-driven barge-in. */
    interrupted: boolean;
    /** True if fired by `schedule:` rather than a user utterance / `bot.ask`. */
    scheduled: boolean;
  }

  // ─── Tools ────────────────────────────────────────────────────────────────
  interface InlineTool {
    name: string;
    description?: string;
    schema: object;
    run(args: any): unknown | Promise<unknown>;
  }

  /** Structural shape of `@para/mcp`'s `MCPConnection`. */
  interface MCPLike {
    tools: Array<{ name: string; description?: string; inputSchema: object }>;
    call(name: string, args: Record<string, unknown>): Promise<unknown>;
  }

  type AssistantTool = InlineTool | MCPLike;

  // ─── Wake word + scheduling + RAG ─────────────────────────────────────────
  interface WakeWordConfig {
    phrase: string | string[];
    /** `"contains"` (default), `"exact"`, or `"fuzzy"` Levenshtein. */
    match?: "contains" | "exact" | "fuzzy";
    /** Max edit distance for `"fuzzy"`. Default 2. */
    maxEdits?: number;
    /** Feed the wake utterance to the LLM as the first turn. Default `false`. */
    feedThrough?: boolean;
  }

  interface ScheduledPrompt {
    /** 5-field cron expression in local time. */
    cron: string;
    /** Prompt text fed straight into `bot.ask()`. */
    prompt: string;
  }

  interface Encoder {
    embed(text: string, opts?: { pool?: string; normalize?: boolean }): Float32Array;
  }

  interface KnowledgeOptions {
    dir: string;
    /** Sentence-embedding GGUF path or a pre-loaded `parabun:llm.Encoder`. */
    encoder: string | Encoder;
    /** How many chunks to retrieve per query. Default 4. */
    topK?: number;
    /** Approximate target chunk size in characters. Default 800. */
    chunkSize?: number;
    /** Overlap between consecutive long-paragraph chunks. Default 100. */
    chunkOverlap?: number;
    /** File extensions to read. Default `[".md", ".markdown", ".txt", ".mdx"]`. */
    extensions?: string[];
    /** Skip files larger than this (bytes). Default 1 MiB. */
    maxFileBytes?: number;
    /** Watch the dir for changes and re-index automatically. Default `true`. */
    watch?: boolean;
  }

  interface KnowledgeHit {
    file: string;
    text: string;
    /** Cosine similarity in [-1, 1]. */
    score: number;
  }

  interface KnowledgeStore {
    readonly count: number;
    readonly dim: number;
    readonly dir: string;
    reindex(): Promise<void>;
    search(text: string, n?: number): KnowledgeHit[];
    close(): Promise<void>;
  }

  // ─── Options + Assistant class ────────────────────────────────────────────
  interface AssistantOptions {
    /** Path to a GGUF LLM model. Required. */
    llm: string;
    /** Path to a Whisper `ggml-*.bin` for STT. Omit to drop the listening leg. */
    stt?: string;
    /** Path to a Piper voice `.onnx` for TTS. Omit to drop the speaking leg. */
    tts?: string;
    /** Override the piper binary path (defaults to `piper` via `PATH`). */
    ttsBinPath?: string;
    /** Mic capture options. Defaults: `{ sampleRate: 16000, channels: 1 }`. */
    mic?: { device?: string; sampleRate?: number; channels?: number; periodMs?: number };
    /** Speaker playback options. */
    speaker?: { device?: string };
    /** System prompt prepended to every chat call. */
    system?: string;
    /** Forwarded to `LLM.load`. */
    llmOpts?: { maxContext?: number };
    /** Forwarded to `m.chat`. */
    chatOpts?: {
      maxTokens?: number;
      temperature?: number;
      topK?: number;
      topP?: number;
    };
    /**
     * Persist conversation history to a sqlite database. String → default
     * schema at that path, object → explicit options. On create, existing
     * turns are loaded back into history.
     */
    memory?: string | { path: string };
    /** Tools the assistant can invoke during a chat turn. */
    tools?: AssistantTool[];
    /**
     * Wake-word gate. String shorthand: `wakeWord: "hey jetson"`.
     * After a turn finishes the gate re-arms.
     */
    wakeWord?: string | WakeWordConfig;
    /** Scheduled / proactive prompts (cron-style). */
    schedule?: ScheduledPrompt[];
    /** RAG over a local doc directory. */
    knowledge?: KnowledgeOptions;
  }

  class Assistant implements Disposable {
    /** Conversational state. Re-runs effects when transitioning. */
    readonly state: Signal<AssistantState>;
    /** Most recent completed turn, or `null` until the first one ends. */
    readonly lastTurn: Signal<Turn | null>;
    /** Full message history for the running session. */
    readonly history: Signal<Message[]>;
    /**
     * `true` while a barge-in is cutting the current turn short. Resets
     * to `false` when the next turn starts.
     */
    readonly interrupted: Signal<boolean>;
    /** `true` from `create()` until `close()` / `[Symbol.dispose]`. */
    readonly alive: Signal<boolean>;

    /** Underlying `parabun:llm` instance. Useful for `m.busy` / `m.device`. */
    readonly llm: any;
    /** Underlying speech surface — both `transcribe` and `speak` capabilities. */
    readonly speech: any;
    /** Indexed corpus when `knowledge:` was passed; otherwise `null`. */
    readonly knowledge: KnowledgeStore | null;

    /** Append a tool at runtime. Returns the new tool count. */
    addTool(tool: AssistantTool): number;
    /** Remove a tool by name. Returns `true` if found, `false` otherwise. */
    removeTool(name: string): boolean;

    /**
     * Cut the current turn short. No-op when idle. Sets `interrupted` for
     * the duration of the in-flight turn, drains buffered TTS, and stops
     * pulling chat tokens.
     */
    interrupt(): void;

    /** Run an effect bound to the bot's lifetime — auto-disposed on close. */
    use(fn: () => void | (() => void)): () => void;

    /**
     * Start the listen → think → speak loop. Resolves when the bot is
     * closed (typically from another task).
     */
    run(): Promise<void>;

    /** Force a single turn from a text prompt. Returns the recorded `Turn`. */
    ask(text: string): Promise<Turn>;

    /** Speak a proactive line. Records a `Turn` with `user: null`. */
    say(text: string): Promise<void>;

    /** Tear everything down: stop loops, close mic/speaker/LLM, flush memory. */
    close(): Promise<void>;

    [Symbol.dispose](): void;
  }

  /** Create + boot an assistant. Resolves once mic/LLM/TTS are warm. */
  function create(opts: AssistantOptions): Promise<Assistant>;

  /** Cron primitives — exposed for tests and standalone scheduling use. */
  function parseCron(expr: string): unknown;
  function cronMatches(parsed: unknown, when: Date): boolean;

  /** RAG primitives — chunkText is pure; KnowledgeStore is the live indexer. */
  function chunkText(text: string, opts?: { chunkSize?: number; chunkOverlap?: number }): string[];
  const KnowledgeStore: {
    new (dir: string, encoder: string | Encoder, opts?: Omit<KnowledgeOptions, "dir" | "encoder">): KnowledgeStore;
  };

  const _default: {
    create: typeof create;
    Assistant: typeof Assistant;
    parseCron: typeof parseCron;
    cronMatches: typeof cronMatches;
    chunkText: typeof chunkText;
    KnowledgeStore: typeof KnowledgeStore;
  };
  export default _default;
  export {
    create,
    Assistant,
    parseCron,
    cronMatches,
    chunkText,
    KnowledgeStore,
    AssistantOptions,
    AssistantState,
    AssistantTool,
    InlineTool,
    MCPLike,
    Message,
    Turn,
    WakeWordConfig,
    ScheduledPrompt,
    Encoder,
    KnowledgeOptions,
    KnowledgeHit,
    Signal,
  };
}

declare module "parabun:llm" {
  interface Signal<T> {
    get(): T;
    peek(): T;
    subscribe(cb: (v: T) => void): () => void;
  }

  interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
  }

  interface GenerateOptions {
    /** Maximum number of tokens to generate. Default 256. */
    maxTokens?: number;
    /** Stop generation if any of these token ids are produced. Defaults to the model's EOS plus any detected chat-template terminator. Pass `[]` to disable. */
    stopTokens?: number[];
    /** Include the prompt's decoded text in the first yielded chunk. Off by default. */
    includePrompt?: boolean;
    /** `0` (or unset) = greedy/argmax. `> 0` with topK/topP applies nucleus filter. */
    temperature?: number;
    topK?: number;
    topP?: number;
    /** Mulberry32 PRNG seed for reproducible sampling. */
    seed?: number;
    /** GBNF grammar source for constrained decoding. Mutually exclusive with `schema`. */
    grammar?: string;
    /** JSON-schema object for constrained decoding. Mutually exclusive with `grammar`. */
    schema?: object;
    /** Additive bias in logit space, indexed by token id. */
    logitBias?: Record<number, number>;
    /** Reuse a precomputed KV prefix. The prompt must begin with the prefix's tokens. */
    prefix?: PrefixCache;
    /** Draft model for speculative decoding. Must share the target's vocabulary. */
    draft?: LLM;
    /** Tokens to speculate per round. Default 4. */
    speculativeK?: number;
  }

  /** Opaque handle capturing precomputed KV state from prefilling a token sequence. */
  class PrefixCache {
    readonly tokens: number[];
    readonly snapshot: { k: Float32Array[]; v: Float32Array[]; length: number; rowSize: number };
    readonly logits: Float32Array;
  }

  class LLM implements Disposable {
    readonly model: any;
    readonly tokenizer: any;
    /** Detected chat-template family. */
    readonly chatTemplate: "llama3" | "chatml" | "mistral" | null;
    /** True while a generation is in flight. */
    readonly busy: Signal<boolean>;
    /** Active GPU backend. */
    readonly device: Signal<"cuda" | "metal" | "cpu">;
    /** True from construction until dispose(). */
    readonly alive: Signal<boolean>;

    use(fn: () => void | (() => void)): () => void;

    static load(path: string, opts?: { maxContext?: number }): Promise<LLM>;

    /** Yields decoded chunks one token at a time. Stops on stopTokens, maxTokens, or KV overflow. */
    generate(prompt: string, opts?: GenerateOptions): AsyncGenerator<string, void, void>;
    /** Chat-formatted generation from OpenAI-style message list. */
    chat(messages: ChatMessage[], opts?: GenerateOptions): AsyncGenerator<string, void, void>;
    /** Drain `generate` and return the concatenated string. */
    complete(prompt: string, opts?: GenerateOptions): Promise<string>;
    /** Drain `chat` and return the concatenated string. */
    chatComplete(messages: ChatMessage[], opts?: GenerateOptions): Promise<string>;
    /** Schema-constrained chat that parses the result into `T`. */
    chatJSON<T = unknown>(messages: ChatMessage[], opts: GenerateOptions): Promise<T>;
    prefix(text: string): Promise<PrefixCache>;
    prefixChat(messages: ChatMessage[]): Promise<PrefixCache>;
    /** Sentence embedding from the causal LM. */
    embed(text: string, opts?: { pool?: "last" | "mean"; normalize?: boolean }): Promise<Float32Array>;
    encodeChat(messages: ChatMessage[], opts?: { openAssistant?: boolean }): number[];
    dispose(): void;
    [Symbol.dispose](): void;
  }

  /** BERT-family sentence encoder (BGE / E5 / MiniLM). */
  class Encoder {
    static load(path: string): Promise<Encoder>;
    embed(text: string, opts?: { pool?: string; normalize?: boolean }): Float32Array;
  }

  /** Whisper-class encoder-decoder for speech-to-text. */
  class WhisperModel {
    static load(path: string): Promise<WhisperModel>;
    /** Mono 16 kHz Float32 samples in [-1, 1]. */
    transcribe(audio: Float32Array, opts?: { language?: string }): Promise<string>;
  }

  class WhisperTokenizer {}

  interface GGUFFile {
    readonly metadata: Map<string, unknown>;
  }

  function loadGGUF(path: string): Promise<GGUFFile>;

  class LlamaTokenizer {
    readonly vocab: string[];
    readonly vocabId: Map<string, number>;
    readonly eos: number;
    readonly bos: number;
    encode(text: string, opts?: { addBos?: boolean }): number[];
    decode(ids: number[]): string;
  }

  function tokenizerFromGGUF(gguf: GGUFFile): LlamaTokenizer;

  class KVCache {
    maxContext(): number;
    snapshot(len: number): { k: Float32Array[]; v: Float32Array[]; length: number; rowSize: number };
    restore(snap: { k: Float32Array[]; v: Float32Array[]; length: number; rowSize: number }): void;
    dispose(): void;
  }

  class LlamaModel {
    readonly cfg: any;
    newKVCache(): KVCache;
    forward(id: number, pos: number, kv: KVCache): Float32Array;
    forwardHidden(id: number, pos: number, kv: KVCache): Float32Array;
    dispose(): void;
  }

  function llamaFromGGUF(gguf: GGUFFile, opts?: { maxContext?: number }): LlamaModel;
  function argmax(logits: Float32Array): number;

  class Sampler {
    constructor(opts?: { temperature?: number; topK?: number; topP?: number; seed?: number });
    sample(logits: Float32Array): number;
  }

  function sample(logits: Float32Array, temperature?: number): number;
  function parseGBNF(source: string): unknown;
  function compileSchema(schema: object): unknown;

  class Grammar {
    constructor(rules: unknown, opts?: unknown);
    allowedMask(): Uint8Array;
    accept(id: number): void;
  }

  /** OpenAI-compatible HTTP server over an LLM (or compatible chat/embed surface). */
  function serve(model: LLM | { chat?: any; generate?: any; embed?: any }, opts?: { port?: number; host?: string }): unknown;

  const GGML_TYPE_F32: number;
  const GGML_TYPE_F16: number;
  const GGML_TYPE_Q8_0: number;
  const GGML_TYPE_Q2_K: number;
  const GGML_TYPE_Q3_K: number;
  const GGML_TYPE_Q4_K: number;
  const GGML_TYPE_Q5_K: number;
  const GGML_TYPE_Q6_K: number;

  class BertModel {}
  class BertTokenizer {}
  function bertFromGGUF(gguf: GGUFFile): BertModel;
  function bertTokenizerFromGGUF(gguf: GGUFFile): BertTokenizer;

  /** Quantized matVec helpers operating directly on GGML block bytes. */
  function quantMatVec(block: Uint8Array, vec: Float32Array): Float32Array;

  const _default: {
    LLM: typeof LLM;
    loadGGUF: typeof loadGGUF;
    GGML_TYPE_F32: typeof GGML_TYPE_F32;
    GGML_TYPE_F16: typeof GGML_TYPE_F16;
    GGML_TYPE_Q8_0: typeof GGML_TYPE_Q8_0;
    GGML_TYPE_Q2_K: typeof GGML_TYPE_Q2_K;
    GGML_TYPE_Q3_K: typeof GGML_TYPE_Q3_K;
    GGML_TYPE_Q4_K: typeof GGML_TYPE_Q4_K;
    GGML_TYPE_Q5_K: typeof GGML_TYPE_Q5_K;
    GGML_TYPE_Q6_K: typeof GGML_TYPE_Q6_K;
    LlamaModel: typeof LlamaModel;
    KVCache: typeof KVCache;
    llamaFromGGUF: typeof llamaFromGGUF;
    argmax: typeof argmax;
    Sampler: typeof Sampler;
    sample: typeof sample;
    LlamaTokenizer: typeof LlamaTokenizer;
    tokenizerFromGGUF: typeof tokenizerFromGGUF;
    parseGBNF: typeof parseGBNF;
    compileSchema: typeof compileSchema;
    Grammar: typeof Grammar;
    PrefixCache: typeof PrefixCache;
    Encoder: typeof Encoder;
    BertModel: typeof BertModel;
    BertTokenizer: typeof BertTokenizer;
    bertFromGGUF: typeof bertFromGGUF;
    bertTokenizerFromGGUF: typeof bertTokenizerFromGGUF;
    serve: typeof serve;
    WhisperModel: typeof WhisperModel;
    WhisperTokenizer: typeof WhisperTokenizer;
    quantMatVec: typeof quantMatVec;
  };
  export default _default;
  export {
    LLM,
    loadGGUF,
    GGML_TYPE_F32,
    GGML_TYPE_F16,
    GGML_TYPE_Q8_0,
    GGML_TYPE_Q2_K,
    GGML_TYPE_Q3_K,
    GGML_TYPE_Q4_K,
    GGML_TYPE_Q5_K,
    GGML_TYPE_Q6_K,
    LlamaModel,
    KVCache,
    llamaFromGGUF,
    argmax,
    Sampler,
    sample,
    LlamaTokenizer,
    tokenizerFromGGUF,
    parseGBNF,
    compileSchema,
    Grammar,
    PrefixCache,
    Encoder,
    BertModel,
    BertTokenizer,
    bertFromGGUF,
    bertTokenizerFromGGUF,
    serve,
    WhisperModel,
    WhisperTokenizer,
    quantMatVec,
    Signal,
    ChatMessage,
    GenerateOptions,
    GGUFFile,
  };
}

declare module "parabun:gpu" {
  interface Signal<T> {
    get(): T;
    peek(): T;
    subscribe(cb: (v: T) => void): () => void;
  }

  type BackendName = "metal" | "cuda" | "cpu";
  type BackendChoice = BackendName | "auto";
  type OpKind = "dot" | "matVec" | "matmul" | "simdMap";

  /** Opaque handle returned by `hold()` / `holdQ4K()` / `holdQ6K()`. Resident on the active backend. */
  interface GpuHandle {
    readonly __bunGpuHandle: true;
    readonly backend: BackendName;
    readonly type: "f32" | "f64";
    readonly length: number;
    readonly qFormat?: "q4_K" | "q6_K";
  }

  /** Auto-residency wrapper around a Float32Array. Auto-releases on dispose. */
  class GpuFloat32Array {
    constructor(source: Float32Array | number);
    readonly length: number;
    get view(): Float32Array;
    /** Write `src` into the device buffer at `offsetElems`. */
    writeAt(offsetElems: number, src: Float32Array): void;
    release(): void;
    [Symbol.dispose](): void;
  }

  /** Lightweight wrapper around a pre-built GpuHandle for quantized data. */
  class GpuHandleArray {
    constructor(handle: GpuHandle);
    readonly length: number;
    /** Throws for quantized handles — use `__handle` at dispatch sites instead. */
    get view(): Float32Array;
    release(): void;
    [Symbol.dispose](): void;
  }

  interface CalibrationResult {
    /** Measured simdMap crossover in elements, or `Infinity` if GPU never wins. */
    simdMap: number;
    cacheFile: string;
    deviceName: string;
  }

  interface VarianceOptions {
    /** Delta degrees of freedom. Divisor is `n - ddof`. 0 = population (default), 1 = sample. */
    ddof?: number;
  }

  function dot(
    a: Float32Array | Float64Array | GpuHandle | GpuFloat32Array,
    b: Float32Array | Float64Array | GpuHandle | GpuFloat32Array,
  ): number;

  function matVec(matrix: Float32Array | GpuHandle | GpuFloat32Array, vector: Float32Array, nRows: number, nCols: number): Float32Array;
  function matVec(matrix: Float64Array | GpuHandle, vector: Float64Array, nRows: number, nCols: number): Float64Array;

  function matmul(
    a: Float32Array | GpuHandle | GpuFloat32Array,
    b: Float32Array | GpuHandle | GpuFloat32Array,
    m: number, k: number, n: number, out?: Float32Array,
  ): Float32Array;
  function matmul(
    a: Float64Array | GpuHandle, b: Float64Array | GpuHandle,
    m: number, k: number, n: number, out?: Float64Array,
  ): Float64Array;

  function matmulBatched(
    a: Float32Array | GpuHandle | GpuFloat32Array,
    b: Float32Array | GpuHandle | GpuFloat32Array,
    batchCount: number, m: number, k: number, n: number,
    strideA: number, strideB: number, strideC: number, out?: Float32Array,
  ): Float32Array;

  /** Multi-head SDPA. Q/K/V are [N, nHead*headDim] row-major. */
  function sdpaSelf(
    Q: Float32Array | GpuHandle | GpuFloat32Array,
    K: Float32Array | GpuHandle | GpuFloat32Array,
    V: Float32Array | GpuHandle | GpuFloat32Array,
    N: number, nHead: number, headDim: number, out?: Float32Array,
  ): Float32Array;

  /** Single-query SDPA — one Q row against `kvLen` cached KV rows. */
  function sdpaSingleQuery(
    Q: Float32Array | GpuHandle | GpuFloat32Array,
    K: Float32Array | GpuHandle | GpuFloat32Array,
    V: Float32Array | GpuHandle | GpuFloat32Array,
    kvLen: number, nHead: number, headDim: number, out?: Float32Array,
  ): Float32Array;

  /** Element-wise map. */
  function simdMap(
    fn: (x: number, i: number) => number,
    a: Float32Array | Float64Array | GpuHandle | GpuFloat32Array,
  ): Float32Array | Float64Array;

  /** 2D valid-mode convolution. Output is `(iH-kH+1) × (iW-kW+1)` row-major. */
  function conv2D(
    input: Float32Array | GpuHandle | GpuFloat32Array,
    kernel: Float32Array | GpuHandle | GpuFloat32Array,
    iW: number, iH: number, kW: number, kH: number,
  ): Float32Array;

  /** Inclusive prefix sum. */
  function scan(input: Float32Array): Float32Array;
  function scan(input: Uint32Array): Uint32Array;
  function scan(input: GpuHandle | GpuFloat32Array): Float32Array;

  /** Reduction. Empty: `sum=0`, `min=+Infinity`, `max=-Infinity`. */
  function reduce(
    input: Float32Array | Uint32Array | GpuHandle | GpuFloat32Array,
    op: "sum" | "min" | "max",
  ): number;

  /** Bin-counting histogram. */
  function histogram(
    input: Float32Array | GpuHandle | GpuFloat32Array,
    bins: number,
    opts?: { min?: number; max?: number },
  ): Uint32Array;

  function variance(input: Float32Array | Uint32Array | GpuHandle | GpuFloat32Array, opts?: VarianceOptions): number;
  function stddev(input: Float32Array | Uint32Array | GpuHandle | GpuFloat32Array, opts?: VarianceOptions): number;
  function quantile(input: Float32Array | Uint32Array | GpuHandle | GpuFloat32Array, q: number): number;
  function median(input: Float32Array | Uint32Array | GpuHandle | GpuFloat32Array): number;
  function argMin(input: Float32Array | Uint32Array | GpuHandle | GpuFloat32Array): number;
  function argMax(input: Float32Array | Uint32Array | GpuHandle | GpuFloat32Array): number;

  /** Single-launch fused Gaussian blur on packed RGBA uint8. `null` if no GPU backend. */
  function imageBlurRGBA(input: Uint8Array, w: number, h: number, radius: number): Uint8Array | null;

  function alloc(length: number, type: "f32", opts?: { pinned?: boolean }): Float32Array;
  function alloc(length: number, type: "f64", opts?: { pinned?: boolean }): Float64Array;
  function isAligned(arr: Float32Array | Float64Array): boolean;

  function hold(arr: Float32Array): GpuHandle;
  function hold(arr: Float64Array): GpuHandle;
  /** Hold a Q4_K-quantized tensor on the active backend. `nElems` is the dequantized count. */
  function holdQ4K(blocks: Uint8Array, nElems: number): GpuHandle;
  /** Hold a Q6_K-quantized tensor on the active backend. */
  function holdQ6K(blocks: Uint8Array, nElems: number): GpuHandle;
  function release(handle: GpuHandle): void;
  /** Free pinned memory allocated with `alloc(n, t, { pinned: true })`. */
  function releasePinned(arr: Float32Array | Float64Array): boolean;

  function activeBackend(): BackendName;
  function hasBackend(name: BackendName): boolean;
  /** Pass `"auto"` to re-probe and pick the best available. */
  function setBackend(choice: BackendChoice): BackendName;
  function winsForSize(op: OpKind, n: number, elemBytes: number): boolean;
  /** Calibrate GPU vs SIMD crossovers. Persists to disk. Throws if active backend is CPU. */
  function calibrate(): CalibrationResult;
  function describe(): { active: BackendName; available: BackendName[]; platform: string };
  function dispose(): void;

  /** Active backend signal. Flips on `setBackend()` or first-use settling. */
  const activeBackendSignal: Signal<BackendName>;
  /** Available backends signal. Essentially static at process scope. */
  const availableSignal: Signal<BackendName[]>;

  /** Active backend's device-resident kernel surface (parabun:llm forward path). `null` unless CUDA + NVRTC. */
  function getDevOps(): unknown;

  const _default: {
    dot: typeof dot;
    matVec: typeof matVec;
    matmul: typeof matmul;
    matmulBatched: typeof matmulBatched;
    sdpaSelf: typeof sdpaSelf;
    sdpaSingleQuery: typeof sdpaSingleQuery;
    conv2D: typeof conv2D;
    scan: typeof scan;
    reduce: typeof reduce;
    argMin: typeof argMin;
    argMax: typeof argMax;
    histogram: typeof histogram;
    median: typeof median;
    quantile: typeof quantile;
    variance: typeof variance;
    stddev: typeof stddev;
    imageBlurRGBA: typeof imageBlurRGBA;
    simdMap: typeof simdMap;
    alloc: typeof alloc;
    isAligned: typeof isAligned;
    hold: typeof hold;
    holdQ4K: typeof holdQ4K;
    holdQ6K: typeof holdQ6K;
    release: typeof release;
    releasePinned: typeof releasePinned;
    GpuFloat32Array: typeof GpuFloat32Array;
    GpuHandleArray: typeof GpuHandleArray;
    activeBackend: typeof activeBackend;
    hasBackend: typeof hasBackend;
    setBackend: typeof setBackend;
    winsForSize: typeof winsForSize;
    calibrate: typeof calibrate;
    dispose: typeof dispose;
    describe: typeof describe;
    activeBackendSignal: typeof activeBackendSignal;
    availableSignal: typeof availableSignal;
    getDevOps: typeof getDevOps;
  };
  export default _default;
  export {
    dot, matVec, matmul, matmulBatched, sdpaSelf, sdpaSingleQuery,
    conv2D, scan, reduce, argMin, argMax, histogram, median, quantile,
    variance, stddev, imageBlurRGBA, simdMap, alloc, isAligned, hold,
    holdQ4K, holdQ6K, release, releasePinned, GpuFloat32Array, GpuHandleArray,
    activeBackend, hasBackend, setBackend, winsForSize, calibrate, dispose,
    describe, activeBackendSignal, availableSignal, getDevOps,
    BackendName, BackendChoice, OpKind, GpuHandle, CalibrationResult,
    VarianceOptions, Signal,
  };
}

declare module "parabun:audio" {
  interface Signal<T> {
    get(): T;
    peek(): T;
    subscribe(cb: (v: T) => void): () => void;
  }

  interface WavData {
    /** Interleaved samples in [-1, 1]. Frame N's channel C is at `samples[N*channels + C]`. */
    samples: Float32Array;
    sampleRate: number;
    channels: number;
  }

  interface WriteWavOptions {
    /** 16 = PCM_S16LE, 32 = IEEE float. Default 16. */
    bitsPerSample?: 16 | 32;
  }

  /** Real → interleaved complex pairs. Length must be a power of 2. */
  function fft(input: Float32Array): Float32Array;
  /** Interleaved complex pairs → real. Scaled by 1/N. */
  function ifft(complex: Float32Array): Float32Array;
  function readWav(bytes: Uint8Array): WavData;
  function writeWav(data: WavData, opts?: WriteWavOptions): Uint8Array;

  interface FilterOptions {
    /** -3 dB cutoff in Hz. < `sampleRate / 2`. */
    cutoff: number;
    sampleRate: number;
  }

  interface BandFilterOptions {
    centerHz: number;
    bandwidthHz: number;
    sampleRate: number;
  }

  function lowpass(samples: Float32Array, opts: FilterOptions): Float32Array;
  function highpass(samples: Float32Array, opts: FilterOptions): Float32Array;
  function bandpass(samples: Float32Array, opts: BandFilterOptions): Float32Array;
  function notch(samples: Float32Array, opts: BandFilterOptions): Float32Array;

  interface SpectrogramOptions {
    /** FFT size. Power of 2. */
    window: number;
    hop: number;
  }

  function spectrogram(samples: Float32Array, opts: SpectrogramOptions): Float32Array[];

  interface MelOptions {
    nMels?: number;
    nFft?: number;
    hop?: number;
    sampleRate?: number;
  }

  interface MelSpectrogram {
    frames: Float32Array[];
    nMels: number;
    nFft: number;
    hop: number;
  }

  function melSpectrogram(samples: Float32Array, opts?: MelOptions): MelSpectrogram;
  function hzToMel(hz: number): number;
  function melToHz(mel: number): number;

  interface VadOptions {
    /** Samples per analysis frame. Default 480 (30 ms at 16 kHz). */
    frameSize?: number;
    /** Speech threshold = `noiseFloor × ratio`. Default 3.0 (~10 dB above floor). */
    ratio?: number;
    /** Sliding-window minimum frames for noise-floor estimation. Default 100 (~3 s at 30 ms). */
    noiseWindow?: number;
  }

  interface VadResult {
    energies: Float32Array;
    speech: boolean[];
    noiseFloor: number;
  }

  function detectVoice(samples: Float32Array, opts?: VadOptions): VadResult;

  function probe(bytes: Uint8Array): Promise<{
    format: string;
    codec: string;
    sampleRate: number;
    channels: number;
    durationMs: number;
    bitrate: number | undefined;
  }>;
  function decodeFile(
    bytes: Uint8Array,
    opts?: { sampleRate?: number; channels?: 1 | 2 },
  ): Promise<{ samples: Int16Array; sampleRate: number; channels: number; durationMs: number }>;
  function encodeFile(
    samples: Int16Array,
    opts: {
      format: "mp3" | "flac" | "aac" | "ogg" | "wav";
      sampleRate: number;
      channels: 1 | 2;
      bitrate?: number;
    },
  ): Promise<Uint8Array>;
  function decodeMp3(bytes: Uint8Array): WavData;

  interface OpusEncoderOptions {
    sampleRate: number;
    channels: number;
    bitrate?: number;
  }

  class OpusEncoder {
    readonly sampleRate: number;
    readonly channels: number;
    constructor(opts: OpusEncoderOptions);
    /** Encode one frame. `samples.length === frameSize * channels` (interleaved). */
    encode(samples: Float32Array, frameSize: number): Uint8Array;
    close(): void;
  }

  interface OpusDecoderOptions {
    sampleRate: number;
    channels: number;
  }

  class OpusDecoder {
    readonly sampleRate: number;
    readonly channels: number;
    constructor(opts: OpusDecoderOptions);
    decode(packet: Uint8Array, frameSize: number): Float32Array;
    close(): void;
  }

  /** rnnoise denoiser. Frame-aligned: 480 samples, 48 kHz. */
  class Denoiser {
    static readonly FRAME_SIZE: 480;
    static readonly SAMPLE_RATE: 48000;
    constructor();
    /** Denoise a frame in place. Returns the per-frame voice-likelihood. */
    process(frame: Float32Array): number;
    close(): void;
  }

  interface ResampleOptions {
    /** Output / input sample-rate ratio. */
    ratio: number;
  }

  function linearResample(samples: Float32Array, ratio: number): Float32Array;
  function resample(samples: Float32Array, opts: ResampleOptions): Float32Array;
  function interleave(channels: Float32Array[]): Float32Array;
  function deinterleave(samples: Float32Array, channelCount: number): Float32Array[];

  interface MixOptions {
    /** Per-track linear gain. Default 1.0 each. */
    gains?: number[];
    /** Default `"hard"`. */
    clip?: "hard" | "soft" | "none";
  }

  function mix(tracks: Float32Array[], opts?: MixOptions): Float32Array;

  interface EnvelopeOptions {
    windowSize?: number;
    hopSize?: number;
    mode?: "peak" | "rms";
  }

  function envelope(samples: Float32Array, opts?: EnvelopeOptions): Float32Array;

  interface NormalizeOptions {
    /** Default 0.95 (small headroom). */
    target?: number;
    mode?: "peak" | "rms";
  }

  function normalize(samples: Float32Array, opts?: NormalizeOptions): Float32Array;
  function i16ToF32(input: Int16Array): Float32Array;
  function f32ToI16(input: Float32Array): Int16Array;
  function peak(samples: Float32Array): number;
  function rms(samples: Float32Array): number;

  interface GainOptions {
    /** Default 0.1 (~ -20 dBFS). */
    targetLevel?: number;
    /** Cap on quiet-input boost. Default 32 (~ +30 dB). */
    maxGain?: number;
    attackMs?: number;
    releaseMs?: number;
    sampleRate?: number;
    noiseFloor?: number;
  }

  /** Automatic gain control. Envelope state persists across `process()` calls. */
  class Gain {
    constructor(opts?: GainOptions);
    process(frame: Float32Array): number;
    get envelope(): number;
    get gain(): number;
    reset(): void;
  }

  interface CompressorOptions {
    sampleRate: number;
    /** Default -20 dB. */
    thresholdDb?: number;
    /** Default 4 (4:1). Use `Limiter` for hard limiting. */
    ratio?: number;
    /** Default 5 ms. */
    attackMs?: number;
    /** Default 50 ms. */
    releaseMs?: number;
    /** Default 0. */
    makeupDb?: number;
  }

  class Compressor {
    constructor(opts: CompressorOptions);
    /** Returns last-sample gain reduction in dB (negative = attenuated). */
    process(frame: Float32Array): number;
    get envelope(): number;
    reset(): void;
  }

  interface LimiterOptions {
    sampleRate: number;
    /** Default -1 dBFS. */
    ceilingDb?: number;
    /** Default 0.5 ms. */
    attackMs?: number;
    /** Default 50 ms. */
    releaseMs?: number;
  }

  /** Brick-wall peak limiter. Use as the last stage of a chain. */
  class Limiter {
    constructor(opts: LimiterOptions);
    /** Returns the max abs output sample seen. */
    process(frame: Float32Array): number;
    get envelope(): number;
    reset(): void;
  }

  interface AudioDevice {
    /** Platform id. ALSA: `"hw:CARD,DEV"` or `"default"`. */
    id: string;
    name: string;
    channels: number;
    /** Negotiable sample rates in Hz. */
    rates: number[];
  }

  interface DeviceList {
    input: AudioDevice[];
    output: AudioDevice[];
  }

  interface CaptureOptions {
    device?: string;
    /** Default 16000 (right for VAD / speech). */
    sampleRate?: number;
    /** Default 1. */
    channels?: number;
    /** ALSA period in milliseconds. Default 20. */
    periodMs?: number;
    bufferPeriods?: number;
  }

  interface PlaybackOptions {
    device?: string;
    sampleRate?: number;
    channels?: number;
    periodMs?: number;
    bufferPeriods?: number;
  }

  interface CaptureFrame {
    /** Interleaved Float32 samples in [-1, 1]. */
    samples: Float32Array;
    /** Monotonic kernel timestamp in milliseconds. */
    timestampMs: number;
    overrun: boolean;
  }

  interface CaptureStream extends AsyncDisposable, Disposable {
    readonly sampleRate: number;
    readonly channels: number;
    readonly device: string;
    /** Per-frame RMS in [0, 1]. */
    readonly peakLevel: Signal<number>;
    /** True once the first frame has been emitted; false again on close. */
    readonly active: Signal<boolean>;
    /** True from construction until close()/dispose(). */
    readonly alive: Signal<boolean>;
    frames(opts?: { frameMs?: number }): AsyncIterableIterator<CaptureFrame>;
    use(fn: () => void | (() => void)): () => void;
    close(): Promise<void>;
    [Symbol.asyncDispose](): Promise<void>;
    [Symbol.dispose](): void;
  }

  interface PlaybackStream extends AsyncDisposable, Disposable {
    readonly sampleRate: number;
    readonly channels: number;
    readonly device: string;
    /** Approximate ALSA queue depth in milliseconds. */
    readonly queuedMs: Signal<number>;
    readonly alive: Signal<boolean>;
    /** Resolves when the bytes have drained into ALSA. */
    write(samples: Float32Array): Promise<void>;
    /** Block until everything written has been played out. */
    drain(): Promise<void>;
    /** Cancel queued playback for barge-in. */
    stop(): Promise<void>;
    use(fn: () => void | (() => void)): () => void;
    close(): Promise<void>;
    [Symbol.asyncDispose](): Promise<void>;
    [Symbol.dispose](): void;
  }

  function devices(): Promise<DeviceList>;
  function capture(opts?: CaptureOptions): Promise<CaptureStream>;
  function play(opts?: PlaybackOptions): Promise<PlaybackStream>;

  const _default: {
    fft: typeof fft;
    ifft: typeof ifft;
    readWav: typeof readWav;
    writeWav: typeof writeWav;
    lowpass: typeof lowpass;
    highpass: typeof highpass;
    bandpass: typeof bandpass;
    notch: typeof notch;
    mix: typeof mix;
    normalize: typeof normalize;
    peak: typeof peak;
    rms: typeof rms;
    envelope: typeof envelope;
    i16ToF32: typeof i16ToF32;
    f32ToI16: typeof f32ToI16;
    interleave: typeof interleave;
    deinterleave: typeof deinterleave;
    resample: typeof resample;
    spectrogram: typeof spectrogram;
    melSpectrogram: typeof melSpectrogram;
    detectVoice: typeof detectVoice;
    decodeMp3: typeof decodeMp3;
    decodeFile: typeof decodeFile;
    encodeFile: typeof encodeFile;
    probe: typeof probe;
    OpusEncoder: typeof OpusEncoder;
    OpusDecoder: typeof OpusDecoder;
    Denoiser: typeof Denoiser;
    Gain: typeof Gain;
    Compressor: typeof Compressor;
    Limiter: typeof Limiter;
    devices: typeof devices;
    capture: typeof capture;
    play: typeof play;
  };
  export default _default;
  export {
    fft, ifft, readWav, writeWav, lowpass, highpass, bandpass, notch,
    mix, normalize, peak, rms, envelope, i16ToF32, f32ToI16, interleave,
    deinterleave, resample, spectrogram, melSpectrogram, detectVoice,
    decodeMp3, decodeFile, encodeFile, probe, OpusEncoder, OpusDecoder,
    Denoiser, Gain, Compressor, Limiter, devices, capture, play,
    Signal, WavData, WriteWavOptions, FilterOptions, BandFilterOptions,
    SpectrogramOptions, MelOptions, MelSpectrogram, VadOptions, VadResult,
    OpusEncoderOptions, OpusDecoderOptions, ResampleOptions, MixOptions,
    EnvelopeOptions, NormalizeOptions, GainOptions, CompressorOptions,
    LimiterOptions, AudioDevice, DeviceList, CaptureOptions, PlaybackOptions,
    CaptureFrame, CaptureStream, PlaybackStream,
  };
}

declare module "parabun:speech" {
  interface Signal<T> {
    get(): T;
    peek(): T;
    subscribe(cb: (v: T) => void): () => void;
  }

  interface AudioChunk {
    samples: Float32Array;
    timestampMs?: number;
  }

  interface ListenOptions {
    sampleRate: number;
    channels?: number;
    frameSize?: number;
    ratio?: number;
    noiseWindow?: number;
    preRollMs?: number;
    hangoverMs?: number;
    minUtteranceMs?: number;
  }

  interface Utterance {
    /** Mono Float32 samples in [-1, 1]. */
    samples: Float32Array;
    durationMs: number;
    startedAtMs: number;
    endedAtMs: number;
    /** Estimated noise floor at close-time. */
    noiseFloor: number;
  }

  interface ListenStream extends AsyncIterableIterator<Utterance>, AsyncDisposable, Disposable {
    /** True while a speech burst is currently being collected. */
    readonly active: Signal<boolean>;
    readonly alive: Signal<boolean>;
    /** Adaptive RMS noise-floor estimate. */
    readonly noiseFloor: Signal<number>;
    readonly lastUtterance: Signal<Utterance | null>;
    /** Drain in the background so signals auto-fill without a manual `for await` loop. */
    run(): () => void;
    use(fn: () => void | (() => void)): () => void;
    dispose(): void;
    [Symbol.dispose](): void;
    [Symbol.asyncDispose](): Promise<void>;
  }

  function listen(stream: AsyncIterable<AudioChunk>, opts: ListenOptions): ListenStream;

  interface TranscribeOptions {
    engine: "whisper";
    /** Path to a `ggml-*.bin` Whisper model. */
    model: string;
    language?: string;
  }

  function transcribe(
    utterance: Utterance | { samples: Float32Array },
    opts: TranscribeOptions,
  ): Promise<string>;

  interface SpeakOptions {
    engine: "piper";
    /** Path to a Piper voice `.onnx`. */
    model: string;
    /** Override the piper binary path. */
    binPath?: string;
    sentenceSilenceMs?: number;
  }

  interface SpokenAudio {
    samples: Float32Array;
    sampleRate: number;
    channels: number;
  }

  function speak(text: string, opts: SpeakOptions): Promise<SpokenAudio>;
  function say(text: string, opts: SpeakOptions): Promise<void>;
  function closePiperSessions(): Promise<void>;

  type WakeMatchStrategy = "contains" | "exact" | "fuzzy";

  interface WakeOptions {
    source: AsyncIterable<AudioChunk>;
    /** Whisper model path or pre-loaded transcriber. */
    whisper: string | { transcribe(audio: Float32Array, o?: { language?: string }): string };
    phrase: string | string[];
    match?: WakeMatchStrategy;
    maxEdits?: number;
    sampleRate?: number;
    listenOpts?: Omit<ListenOptions, "sampleRate">;
    language?: string;
  }

  interface WakeTrigger {
    /** Matched phrase (lowercased). */
    phrase: string;
    transcription: string;
    /** [0, 1]. 1.0 for `"contains"`/`"exact"`; for `"fuzzy"` it's `1 - edits/maxEdits`. */
    confidence: number;
    utterance: Utterance;
  }

  interface WakeStream extends AsyncIterableIterator<WakeTrigger> {
    readonly active: Signal<boolean>;
    readonly lastTrigger: Signal<WakeTrigger | null>;
    run(): () => void;
  }

  function wakeWord(opts: WakeOptions): WakeStream;
  function matchWakePhrase(
    text: string,
    phrases: string | string[],
    strategy?: WakeMatchStrategy,
    maxEdits?: number,
  ): { phrase: string; confidence: number } | null;

  const _default: {
    listen: typeof listen;
    transcribe: typeof transcribe;
    speak: typeof speak;
    say: typeof say;
    closePiperSessions: typeof closePiperSessions;
    wakeWord: typeof wakeWord;
    matchWakePhrase: typeof matchWakePhrase;
  };
  export default _default;
  export {
    listen, transcribe, speak, say, closePiperSessions, wakeWord, matchWakePhrase,
    AudioChunk, ListenOptions, Utterance, ListenStream, TranscribeOptions,
    SpeakOptions, SpokenAudio, WakeMatchStrategy, WakeOptions, WakeTrigger,
    WakeStream, Signal,
  };
}

declare module "parabun:vision" {
  interface Signal<T> {
    get(): T;
    peek(): T;
    subscribe(cb: (v: T) => void): () => void;
  }

  type RawPixelFormat = "yuyv" | "mjpg" | "nv12" | "rgb24";

  interface RawFrame {
    data: Uint8Array;
    width: number;
    height: number;
    format: RawPixelFormat;
    timestampMs: number;
    sequence: number;
  }

  interface RgbaFrame {
    rgba: Uint8Array;
    width: number;
    height: number;
    timestampMs: number;
    sequence: number;
  }

  interface FramesOptions {
    decodeMjpg?: (bytes: Uint8Array) => {
      data: Uint8Array;
      width: number;
      height: number;
      channels: number;
    };
    maxFps?: number;
  }

  interface MotionRegion {
    x: number;
    y: number;
    width: number;
    height: number;
    pixels: number;
  }

  interface MotionFrame {
    frame: RgbaFrame;
    motionScore: number;
    moving: boolean;
    regions?: MotionRegion[];
  }

  interface RegionsOptions {
    minPixels?: number;
  }

  interface MotionOptions {
    pixelThreshold?: number;
    sensitivity?: number;
    downsample?: number;
    smoothing?: number;
    regions?: boolean | RegionsOptions;
  }

  interface MotionStream extends AsyncIterableIterator<MotionFrame>, AsyncDisposable, Disposable {
    /** True while motion exceeds threshold on the latest frame. */
    readonly detected: Signal<boolean>;
    readonly alive: Signal<boolean>;
    /** Most recent motion score in [0, 1]. */
    readonly score: Signal<number>;
    run(): () => void;
    use(fn: () => void | (() => void)): () => void;
    dispose(): void;
    [Symbol.dispose](): void;
    [Symbol.asyncDispose](): Promise<void>;
  }

  /** Per-detection record from `detect` / `recognize`. */
  interface Detection {
    label: string;
    score: number;
    bbox: { x: number; y: number; width: number; height: number };
  }

  interface DetectOptions {
    engine: "yolo" | "ssd" | "rtdetr";
    model: string;
    scoreThreshold?: number;
    iouThreshold?: number;
    classes?: string[];
    inputSize?: number;
  }

  interface RecognizeOptions {
    engine: "tesseract" | "easyocr";
    language?: string;
    datapath?: string;
    minConfidence?: number;
  }

  interface OnnxSession extends Disposable {
    run(input: Record<string, { data: Uint8Array | Float32Array; shape: number[] }>): Record<string, { data: Uint8Array | Float32Array; shape: number[] }>;
    dispose(): void;
    [Symbol.dispose](): void;
  }

  function frames(stream: AsyncIterable<RawFrame>, opts?: FramesOptions): AsyncIterableIterator<RgbaFrame>;
  function detectMotion(stream: AsyncIterable<RgbaFrame>, opts?: MotionOptions): MotionStream;
  /** Object detection. Currently a stub pending ONNX runtime vendor — surface is stable, `detect()` throws if no engine is wired. */
  function detect(frame: RgbaFrame, opts: DetectOptions): Promise<Detection[]>;
  /** OCR. Currently a stub pending tesseract / easyocr wiring. */
  function recognize(frame: RgbaFrame, opts: RecognizeOptions): Promise<Detection[]>;
  function onnx(modelPath: string): OnnxSession;
  function onnxIsAvailable(): boolean;

  const _default: {
    frames: typeof frames;
    detectMotion: typeof detectMotion;
    detect: typeof detect;
    recognize: typeof recognize;
    onnx: typeof onnx;
    onnxIsAvailable: typeof onnxIsAvailable;
  };
  export default _default;
  export {
    frames, detectMotion, detect, recognize, onnx, onnxIsAvailable,
    Signal, RawFrame, RgbaFrame, RawPixelFormat, FramesOptions, MotionFrame,
    MotionOptions, MotionRegion, RegionsOptions, MotionStream, DetectOptions,
    RecognizeOptions, Detection, OnnxSession,
  };
}

declare module "parabun:image" {
  type ImageFormat = "jpeg" | "png" | "webp" | "avif" | "heic" | "jxl";

  interface DecodedImage {
    data: Uint8Array;
    width: number;
    height: number;
    channels: number;
    format: ImageFormat;
  }

  interface EncodeOptions {
    format: ImageFormat;
    /** JPEG / WebP quality 1–100. Ignored for PNG. Default 85. */
    quality?: number;
    /** WebP only — opt into lossless. PNG is always lossless. */
    lossless?: boolean;
  }

  interface ResizeOptions {
    width: number;
    height: number;
    /** `"bilinear"` (default, fast). `"lanczos"` for sharper downscaling (~3-4× slower). */
    kernel?: "bilinear" | "lanczos";
  }

  interface BlurOptions {
    /** Pixels. 0 = passthrough. */
    radius: number;
    /** Route through parabun:gpu's conv2D. Worth it on ≥ 1 MP images on GPU hosts. Default `false`. */
    gpu?: boolean;
  }

  interface BoxBlurOptions {
    radius: number;
  }

  interface ThresholdOptions {
    /** Cutoff in [0, 255]. Default 128. */
    value?: number;
  }

  interface CompositeOptions {
    /** X-offset of overlay in base coords. Default 0. */
    x?: number;
    /** Y-offset of overlay in base coords. Default 0. */
    y?: number;
  }

  interface AdjustOptions {
    /** Additive lightness shift, [-1, 1]. */
    brightness?: number;
    /** Multiplicative dynamic-range scale around mid-gray, [-1, 1]. */
    contrast?: number;
    /** Lerp toward / away from luma, [-1, 1]. */
    saturation?: number;
  }

  interface CropOptions {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  interface RotateOptions {
    /** 90/180/270. Arbitrary angles need resampling — not in v1. */
    degrees: 90 | 180 | 270;
  }

  interface FlipOptions {
    axis: "horizontal" | "vertical";
  }

  interface SharpenOptions {
    /** Default 1. Negative = soften. */
    amount?: number;
    /** Gaussian radius for unsharp-mask low-pass. Default 1. */
    radius?: number;
  }

  interface DecodedFrames {
    frames: Array<{ data: Uint8Array; durationMs: number }>;
    width: number;
    height: number;
  }

  interface EncodeOutOptions {
    format: ImageFormat;
    quality?: number;
    lossless?: boolean;
  }

  /** Chained pipeline that defers materialization until `toBytes`. Mirrors libvips's lazy API for buffer-share efficiency. */
  class Pipeline {
    constructor(bytes: Uint8Array);
    resize(opts: ResizeOptions): this;
    blur(opts: BlurOptions): this;
    boxBlur(opts: BoxBlurOptions): this;
    sharpen(opts?: SharpenOptions): this;
    rotate(opts: RotateOptions): this;
    flip(opts: FlipOptions): this;
    crop(opts: CropOptions): this;
    adjust(opts?: AdjustOptions): this;
    invert(): this;
    threshold(opts?: ThresholdOptions): this;
    toGrayscale(): this;
    toBytes(opts: EncodeOutOptions): Uint8Array;
  }

  function decode(bytes: Uint8Array): DecodedImage;
  function decodeFrames(bytes: Uint8Array): Promise<DecodedFrames>;
  function encode(img: DecodedImage, opts: EncodeOptions): Uint8Array;
  function resize(img: DecodedImage, opts: ResizeOptions): DecodedImage;
  function blur(img: DecodedImage, opts: BlurOptions): DecodedImage;
  function boxBlur(img: DecodedImage, opts: BoxBlurOptions): DecodedImage;
  function sharpen(img: DecodedImage, opts?: SharpenOptions): DecodedImage;
  function edgeDetect(img: DecodedImage): DecodedImage;
  function rotate(img: DecodedImage, opts: RotateOptions): DecodedImage;
  function flip(img: DecodedImage, opts: FlipOptions): DecodedImage;
  function crop(img: DecodedImage, opts: CropOptions): DecodedImage;
  function toGrayscale(img: DecodedImage): DecodedImage;
  function adjust(img: DecodedImage, opts?: AdjustOptions): DecodedImage;
  function hueShift(img: DecodedImage, degrees: number): DecodedImage;
  function histogram(img: DecodedImage): Uint32Array[];
  function composite(base: DecodedImage, overlay: DecodedImage, opts?: CompositeOptions): DecodedImage;
  function invert(img: DecodedImage): DecodedImage;
  function threshold(img: DecodedImage, opts?: ThresholdOptions): DecodedImage;
  function pipeline(bytes: Uint8Array): Pipeline;

  const _default: {
    decode: typeof decode;
    decodeFrames: typeof decodeFrames;
    encode: typeof encode;
    resize: typeof resize;
    blur: typeof blur;
    boxBlur: typeof boxBlur;
    sharpen: typeof sharpen;
    edgeDetect: typeof edgeDetect;
    rotate: typeof rotate;
    flip: typeof flip;
    crop: typeof crop;
    toGrayscale: typeof toGrayscale;
    adjust: typeof adjust;
    hueShift: typeof hueShift;
    histogram: typeof histogram;
    composite: typeof composite;
    invert: typeof invert;
    threshold: typeof threshold;
    pipeline: typeof pipeline;
    Pipeline: typeof Pipeline;
  };
  export default _default;
  export {
    decode, decodeFrames, encode, resize, blur, boxBlur, sharpen, edgeDetect,
    rotate, flip, crop, toGrayscale, adjust, hueShift, histogram, composite,
    invert, threshold, pipeline, Pipeline,
    DecodedImage, EncodeOptions, ResizeOptions, BlurOptions, BoxBlurOptions,
    ThresholdOptions, CompositeOptions, AdjustOptions, CropOptions,
    RotateOptions, FlipOptions, SharpenOptions, DecodedFrames, EncodeOutOptions,
    ImageFormat,
  };
}

declare module "parabun:csv" {
  type CsvSource = string | Uint8Array | Blob | ReadableStream<Uint8Array> | AsyncIterable<Uint8Array | string>;

  interface ParseOptions {
    /** Field delimiter. Default `,`. Use `\t` for TSV, `|` for pipe-separated. */
    delimiter?: string;
    /** Quote character. Default `"`. */
    quote?: string;
    /**
     * `true` (default) — first non-empty row is headers; rows emitted as objects.
     * `false` — every row emitted as `string[]`.
     * `string[]` — explicit headers; first data row is treated as data.
     */
    headers?: boolean | string[];
    /** Default `true` — numeric → `number`, "true"/"false" → `boolean`, empty → `null`. */
    typeInference?: boolean;
    /** Skip leading rows BEFORE header detection. Default 0. */
    skipLines?: number;
    /**
     * Opt-in parallel chunk parsing via @para/parallel's worker pool. Materializes
     * the input first; falls back to serial if any quote character appears.
     */
    parallel?: boolean;
  }

  function parseCsv(
    source: CsvSource,
    options?: ParseOptions,
  ): AsyncGenerator<string[] | Record<string, string | number | boolean | null>>;

  const _default: { parseCsv: typeof parseCsv };
  export default _default;
  export { parseCsv, ParseOptions, CsvSource };
}

declare module "parabun:camera" {
  interface Signal<T> {
    get(): T;
    peek(): T;
    subscribe(cb: (v: T) => void): () => void;
  }

  type PixelFormat = "yuyv" | "mjpg" | "nv12" | "rgb24";

  interface DeviceInfo {
    path: string;
    name: string;
    driver: string;
    caps: string[];
  }

  interface FormatDescriptor {
    format: PixelFormat;
    width: number;
    height: number;
    fpsNum: number;
    fpsDen: number;
  }

  interface OpenOptions {
    width: number;
    height: number;
    format?: PixelFormat;
    bufferCount?: number;
  }

  interface RawFrame {
    data: Uint8Array;
    width: number;
    height: number;
    format: PixelFormat;
    timestampMs: number;
    sequence: number;
  }

  interface CameraFormat {
    width: number;
    height: number;
    pixelFormat: PixelFormat;
  }

  interface Camera extends AsyncDisposable, Disposable {
    readonly width: number;
    readonly height: number;
    readonly format: PixelFormat;
    readonly active: Signal<boolean>;
    readonly alive: Signal<boolean>;
    readonly fps: Signal<number>;
    readonly cameraFormat: Signal<CameraFormat>;
    frames(): AsyncIterableIterator<RawFrame>;
    grab(): Promise<RawFrame>;
    use(fn: () => void | (() => void)): () => void;
    close(): Promise<void>;
    [Symbol.asyncDispose](): Promise<void>;
    [Symbol.dispose](): void;
  }

  /** `devices` is callable as a function and also exposes the Signal interface for hotplug events. */
  type DevicesSignal = {
    (): Promise<DeviceInfo[]>;
    get(): DeviceInfo[];
    peek(): DeviceInfo[];
    subscribe(cb: (v: DeviceInfo[]) => void): () => void;
  };

  function formats(path: string): Promise<FormatDescriptor[]>;
  function open(path: string, opts: OpenOptions): Promise<Camera>;
  /** Convert a raw frame to packed RGBA. `gpu: true` routes through parabun:gpu when available. */
  function toRgba(frame: RawFrame, opts?: { gpu?: boolean }): Uint8Array;

  const devices: DevicesSignal;

  const _default: {
    devices: DevicesSignal;
    formats: typeof formats;
    open: typeof open;
    toRgba: typeof toRgba;
  };
  export default _default;
  export {
    devices, formats, open, toRgba,
    Camera, RawFrame, CameraFormat, DeviceInfo, DevicesSignal,
    FormatDescriptor, OpenOptions, PixelFormat, Signal,
  };
}

declare module "parabun:gpio" {
  interface Signal<T> {
    get(): T;
    peek(): T;
    subscribe(cb: (v: T) => void): () => void;
  }

  type LineMode = "in" | "out";
  type LinePull = "up" | "down" | "off";
  type LineEdge = "rising" | "falling" | "both" | "none";

  interface LineOptions {
    mode: LineMode;
    pull?: LinePull;
    debounceMs?: number;
    edge?: LineEdge;
    pollHz?: number;
    initial?: 0 | 1;
  }

  interface EdgeEvent {
    kind: "rising" | "falling";
    timestampNs: bigint;
    value: 0 | 1;
  }

  interface ChipInfo {
    path: string;
    label: string;
    lines: number;
  }

  interface Line extends AsyncDisposable, Disposable {
    readonly offset: number;
    readonly value: Signal<0 | 1>;
    readonly alive: Signal<boolean>;
    read(): 0 | 1;
    write(v: 0 | 1): void;
    toggle(): 0 | 1;
    edges(): AsyncIterableIterator<EdgeEvent>;
    use(fn: () => void | (() => void)): () => void;
    close(): void;
    [Symbol.dispose](): void;
  }

  /** Atomic multi-line read/write via uAPI v2 line-bank requests. */
  interface LineBank extends AsyncDisposable, Disposable {
    readonly offsets: readonly number[];
    readonly value: Signal<bigint>;
    readonly alive: Signal<boolean>;
    read(): bigint;
    /** Write `values`. Optional `mask` restricts which lines are touched. */
    write(values: bigint, mask?: bigint): void;
    use(fn: () => void | (() => void)): () => void;
    close(): void;
    [Symbol.dispose](): void;
  }

  interface Chip extends AsyncDisposable, Disposable {
    readonly path: string;
    readonly label: string;
    readonly lines: number;
    readonly alive: Signal<boolean>;
    line(offset: number, opts: LineOptions): Line;
    bank(offsets: number[], opts: Omit<LineOptions, "initial"> & { initial?: bigint | number }): LineBank;
    use(fn: () => void | (() => void)): () => void;
    close(): void;
    [Symbol.dispose](): void;
  }

  function chips(): ChipInfo[];
  function open(path: string): Chip;
  /** Open the first available chip — typically `/dev/gpiochip0`. */
  function openDefaultChip(): Chip;

  const _default: {
    chips: typeof chips;
    open: typeof open;
    openDefaultChip: typeof openDefaultChip;
  };
  export default _default;
  export {
    chips, open, openDefaultChip,
    Signal, LineMode, LinePull, LineEdge, LineOptions, EdgeEvent, ChipInfo,
    Line, LineBank, Chip,
  };
}

declare module "parabun:spi" {
  interface Signal<T> {
    get(): T;
    peek(): T;
    subscribe(cb: (v: T) => void): () => void;
  }

  interface DeviceInfo {
    path: string;
    bus: number;
    cs: number;
  }

  interface DeviceOptions {
    mode?: 0 | 1 | 2 | 3;
    bitsPerWord?: number;
    speedHz?: number;
  }

  type TransactSegment =
    | { tx: Uint8Array; rx?: number; speedHz?: number; delayUs?: number; bitsPerWord?: number; csChange?: boolean }
    | { rx: number; speedHz?: number; delayUs?: number; bitsPerWord?: number; csChange?: boolean };

  interface Device extends AsyncDisposable, Disposable {
    readonly path: string;
    readonly bus: number;
    readonly cs: number;
    readonly mode: 0 | 1 | 2 | 3;
    readonly bitsPerWord: number;
    readonly speedHz: number;
    readonly alive: Signal<boolean>;
    /** Full-duplex transfer. Returns received bytes (same length as `tx`). */
    transfer(tx: Uint8Array, opts?: { speedHz?: number; delayUs?: number }): Promise<Uint8Array>;
    write(tx: Uint8Array, opts?: { speedHz?: number; delayUs?: number }): Promise<void>;
    read(length: number, opts?: { speedHz?: number; delayUs?: number }): Promise<Uint8Array>;
    /** Multi-segment transactions for SPI devices that need atomic CS-asserted runs. */
    transactSegments(segments: TransactSegment[]): Promise<Array<Uint8Array | undefined>>;
    use(fn: () => void | (() => void)): () => void;
    close(): void;
    [Symbol.dispose](): void;
    [Symbol.asyncDispose](): Promise<void>;
  }

  function devices(): DeviceInfo[];
  function open(path: string, opts?: DeviceOptions): Device;

  const _default: { devices: typeof devices; open: typeof open };
  export default _default;
  export { devices, open, Device, DeviceInfo, DeviceOptions, TransactSegment, Signal };
}

declare module "parabun:i2c" {
  interface Signal<T> {
    get(): T;
    peek(): T;
    subscribe(cb: (v: T) => void): () => void;
  }

  type TransactSegment = { write: Uint8Array } | { read: number };

  interface Device {
    readonly addr: number;
    write(bytes: Uint8Array): Promise<void>;
    read(length: number): Promise<Uint8Array>;
    /** Multi-segment transaction (write/read pairs at the same slave address). */
    transact(segments: TransactSegment[]): Promise<Array<Uint8Array | undefined>>;
    /** SMBus protocol helpers. */
    readonly smbus: {
      quick(write?: boolean): Promise<boolean>;
      readByte(cmd: number): Promise<number>;
      readWord(cmd: number): Promise<number>;
      writeByte(cmd: number, value: number): Promise<void>;
      writeWord(cmd: number, value: number): Promise<void>;
      readBlock(cmd: number): Promise<Uint8Array>;
      writeBlock(cmd: number, bytes: Uint8Array): Promise<void>;
    };
  }

  interface Bus extends AsyncDisposable, Disposable {
    readonly path: string;
    readonly name: string;
    readonly capabilities: string[];
    readonly alive: Signal<boolean>;
    /** Probe every 7-bit address; returns the addresses that ACKed. */
    scan(): Promise<number[]>;
    device(addr: number): Device;
    use(fn: () => void | (() => void)): () => void;
    close(): void;
    [Symbol.dispose](): void;
  }

  interface BusInfo {
    path: string;
    name: string;
    capabilities: string[];
  }

  interface Ads1115Options {
    address?: number;
    pga?: "6.144V" | "4.096V" | "2.048V" | "1.024V" | "0.512V" | "0.256V";
  }

  /** Convenience helper for the ADS1115 16-bit ADC. */
  interface Ads1115 extends AsyncDisposable, Disposable {
    readonly bus: Bus;
    /** Raw signed-16 reading. */
    read(channel: 0 | 1 | 2 | 3): Promise<number>;
    /** Reading converted to volts using the configured PGA range. */
    readVolts(channel: 0 | 1 | 2 | 3): Promise<number>;
    close(): void;
  }

  function buses(): BusInfo[];
  function open(path: string): Bus;
  function ads1115(busPath: string, options?: Ads1115Options): Ads1115;

  const _default: {
    buses: typeof buses;
    open: typeof open;
    ads1115: typeof ads1115;
  };
  export default _default;
  export { buses, open, ads1115, Bus, Device, BusInfo, Ads1115, Ads1115Options, TransactSegment, Signal };
}

declare module "parabun:video" {
  type Codec = "h264" | "h265" | "hevc" | "vp8" | "vp9" | "av1" | "mjpeg" | "auto";
  type Container = "mp4" | "mkv" | "webm" | "ts" | "auto";
  type AccelMode = "auto" | "gpu" | "cpu";
  type DecodedPixelFormat = "rgba" | "rgb24" | "yuv420p" | "nv12";

  interface ProbeStreamVideo {
    kind: "video";
    index: number;
    codec: Codec;
    width: number;
    height: number;
    fpsNum: number;
    fpsDen: number;
    durationMs: number;
  }

  interface ProbeStreamAudio {
    kind: "audio";
    index: number;
    codec: string;
    sampleRate: number;
    channels: number;
    durationMs: number;
  }

  interface ProbeInfo {
    container: Container;
    streams: Array<ProbeStreamVideo | ProbeStreamAudio>;
  }

  interface DecodeOptions {
    pixelFormat?: DecodedPixelFormat;
    accel?: AccelMode;
    streamIndex?: number;
    startMs?: number;
    endMs?: number;
    decodeMjpg?: (bytes: Uint8Array) => { data: Uint8Array; width: number; height: number; channels?: number };
  }

  interface DecodedFrame {
    data: Uint8Array;
    width: number;
    height: number;
    pixelFormat: DecodedPixelFormat;
    ptsMs: number;
    index: number;
    keyframe: boolean;
  }

  interface VideoDecoder extends AsyncDisposable {
    readonly width: number;
    readonly height: number;
    readonly codec: Codec;
    readonly durationMs: number;
    frames(): AsyncIterableIterator<DecodedFrame>;
    seek(ptsMs: number): Promise<void>;
    close(): Promise<void>;
    [Symbol.asyncDispose](): Promise<void>;
  }

  interface EncodeOptions {
    codec: Codec;
    container: Container;
    width: number;
    height: number;
    fps: number;
    bitrate?: number;
    preset?: "fast" | "medium" | "slow";
    accel?: AccelMode;
    /** Output file path. If omitted, encoded bytes are returned by `finalize()`. */
    path?: string;
    /** Pluggable JPEG encoder (used for MJPEG). */
    encodeJpg?: (
      img: { data: Uint8Array; width: number; height: number; channels: number },
      opts?: { format: "jpeg"; quality?: number },
    ) => Uint8Array;
    jpegQuality?: number;
  }

  interface VideoEncoder extends AsyncDisposable {
    readonly bytesWritten: number;
    readonly duration: number;
    pushFrame(
      frame:
        | { data: Uint8Array; width: number; height: number; format: string }
        | { data: Uint8Array; width: number; height: number; channels: number }
        | { data: Uint8Array; width: number; height: number; pixelFormat: DecodedPixelFormat },
    ): Promise<void>;
    /** Returns the encoded bytes when `EncodeOptions.path` was omitted; otherwise `void`. */
    finalize(): Promise<Uint8Array | void>;
    close(): Promise<void>;
    [Symbol.asyncDispose](): Promise<void>;
  }

  function probe(input: Uint8Array | ArrayBuffer): Promise<ProbeInfo>;
  function decode(input: Uint8Array | ArrayBuffer | string, opts?: DecodeOptions): Promise<VideoDecoder>;
  function encode(opts: EncodeOptions): Promise<VideoEncoder>;
  function decodeAll(bytes: Uint8Array | ArrayBuffer | string, opts?: DecodeOptions): Promise<DecodedFrame[]>;
  function thumbnail(
    bytes: Uint8Array | ArrayBuffer,
    ptsMs?: number,
  ): Promise<{ data: Uint8Array; width: number; height: number; ptsMs: number }>;
  function extractAudio(
    bytes: Uint8Array | ArrayBuffer,
    opts?: { sampleRate?: number; channels?: 1 | 2 },
  ): Promise<{ samples: Int16Array; sampleRate: number; channels: number; durationMs: number }>;

  const _default: {
    probe: typeof probe;
    decode: typeof decode;
    encode: typeof encode;
    decodeAll: typeof decodeAll;
    thumbnail: typeof thumbnail;
    extractAudio: typeof extractAudio;
  };
  export default _default;
  export {
    probe, decode, encode, decodeAll, thumbnail, extractAudio,
    Codec, Container, AccelMode, DecodedPixelFormat,
    ProbeInfo, ProbeStreamVideo, ProbeStreamAudio,
    DecodeOptions, DecodedFrame, VideoDecoder,
    EncodeOptions, VideoEncoder,
  };
}
