// Type declarations for Parabun's runtime modules (parabun:*). The
// implementations live in src/js/bun/. tsc has no way to find them
// otherwise — the modules are loaded via Bun's InternalModuleRegistry,
// not from disk, so without these ambient declarations every
// `import "parabun:assistant"` etc. returns `any`.
//
// This file currently covers `parabun:assistant`. Add additional
// `parabun:*` modules (llm, audio, speech, camera, vision, image, gpu,
// gpio, i2c, spi, rtp, mcp, video) as their public surfaces stabilise.

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
