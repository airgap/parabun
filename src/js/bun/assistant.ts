// Hardcoded module "bun:assistant"
//
// Tier 2 facade that composes bun:audio + bun:speech + bun:llm into a
// complete edge AI assistant. Three-line case:
//
//   import assistant from "bun:assistant";
//
//   await using bot = await assistant.create({
//     llm: "/models/Llama-3.2-1B-Instruct-Q4_K_M.gguf",
//     stt: "/models/ggml-tiny.en.bin",
//     tts: "/models/en_US-lessac-medium.onnx",
//     system: "You are a concise voice assistant.",
//   });
//   await bot.run();
//
// Design rules (PLAN-bun-assistant.md "Design rules"):
//   1. Pure facade. No novel inference / I/O / codecs — every capability
//      composes existing bun:* modules.
//   2. Opt-in, not opt-out. The 3-line case stays 3 lines; new fields
//      unlock new capabilities, never remove defaults.
//   3. Iterators all the way down. bot.turns() is the primary control
//      surface; bot.run() is `for await (const _ of bot.turns()) {}`.
//   4. No hidden state outside `bot`. Disposal is deterministic via
//      `await using` / explicit close().
//   5. Power users keep their seat. Anything bot does is reachable
//      directly via bun:llm / bun:speech / bun:audio.
//
// What v1 ships (per PLAN-bun-assistant.md "Build order" §208):
//   - assistant.create + bot.run + bot.turns + bot.ask/say
//   - Reactive surface: state, lastTurn, history, interrupted signals
//   - In-memory chat history (full transcript across turns this process)
//
// What v1 explicitly does NOT ship (deferred per build order):
//   - Wake word, barge-in (steps 5)
//   - Tools / MCP (step 3)
//   - Persistent memory (step 4)
//   - RAG (step 6)
//   - Scheduled prompts (step 7)
//   - Vision / VLM (step 8)

const audio = require("./audio.ts");
const speech = require("./speech.ts");
const llmMod = require("./llm.ts");
const signalsMod = require("./signals.ts");

// Structural Signal types — keep this module agnostic of bun:signals's
// class hierarchy. Same shape as audio.ts / llm.ts / speech.ts.
type Signal<T> = {
  get(): T;
  peek(): T;
  subscribe(cb: (v: T) => void): () => void;
};
type WritableSignal<T> = Signal<T> & { set(v: T): void };

// ─── Types ─────────────────────────────────────────────────────────────────

type AssistantState = "idle" | "listening" | "thinking" | "speaking";

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

type Turn = {
  /** Transcribed user input. null for proactive turns (bot.say). */
  user: string | null;
  /** Generated assistant reply. */
  assistant: string;
  /** Tool-call records — empty in v1 (no tool dispatch yet). */
  toolCalls: { name: string; args: unknown; result: unknown }[];
  startedAtMs: number;
  endedAtMs: number;
  /** True if barge-in cut the reply short. v1: always false. */
  interrupted: boolean;
};

type AssistantOptions = {
  /** Path to a GGUF LLM model. Required. */
  llm: string;
  /** Path to a Whisper ggml-*.bin model for STT. Omit to drop the listening leg. */
  stt?: string;
  /** Path to a Piper voice .onnx for TTS. Omit to drop the speaking leg. */
  tts?: string;
  /**
   * Optional override for the piper binary path. Defaults to "piper" via
   * PATH. Forwarded to `speech.speak` with the same semantics.
   */
  ttsBinPath?: string;
  /** Mic capture options. Defaults: { sampleRate: 16000, channels: 1 }. */
  mic?: { device?: string; sampleRate?: number; channels?: number; periodMs?: number };
  /** Speaker playback options. Defaults: TTS-rate, mono. */
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
   * Persist conversation history to a sqlite database. Pass a path
   * string for default schema, or an options object to override.
   * On create, existing turns are loaded back into history.
   *
   * v1 stores raw turns only — auto-summarization (when context
   * approaches kvCacheSize) is tracked under LYK-760 step 4 follow-up.
   */
  memory?: string | { path: string };
};

// ─── Memory store ──────────────────────────────────────────────────────────

interface MemoryStore {
  /** Read all persisted turns, oldest first. */
  load(): Message[];
  /** Append a single turn. Synchronous — sqlite is fast enough. */
  append(msg: Message): void;
  /** Total turn count (excluding the system prompt, which isn't persisted). */
  count(): number;
  /** Reset the store. Useful in tests. */
  clear(): void;
  /** Release the underlying handle. Idempotent. */
  close(): void;
}

class SqliteMemoryStore implements MemoryStore {
  #db: any;
  #disposed = false;

  constructor(path: string) {
    // Builtins can't use the "bun:sqlite" literal — bun:sqlite isn't in
    // the internal module list. Require the source file directly; it
    // exports the same shape the public module does.
    const { Database } = require("./sqlite.ts");
    this.#db = new Database(path);
    // Schema is the simplest stable shape; auto-summarization layer
    // adds a `summaries` table on top in a follow-up.
    this.#db.exec(
      `CREATE TABLE IF NOT EXISTS turns (` +
        `id INTEGER PRIMARY KEY AUTOINCREMENT, ` +
        `role TEXT NOT NULL, ` +
        `content TEXT NOT NULL, ` +
        `ts INTEGER NOT NULL` +
        `)`,
    );
  }

  load(): Message[] {
    if (this.#disposed) throw new Error("bun:assistant: memory store disposed");
    const rows = this.#db.query("SELECT role, content FROM turns ORDER BY id ASC").all() as Array<{
      role: "user" | "assistant" | "system";
      content: string;
    }>;
    return rows.map(r => ({ role: r.role, content: r.content }));
  }

  append(msg: Message): void {
    if (this.#disposed) throw new Error("bun:assistant: memory store disposed");
    this.#db.run("INSERT INTO turns (role, content, ts) VALUES (?, ?, ?)", [msg.role, msg.content, Date.now()]);
  }

  count(): number {
    if (this.#disposed) return 0;
    const row = this.#db.query("SELECT COUNT(*) AS n FROM turns").get() as { n: number };
    return row.n;
  }

  clear(): void {
    if (this.#disposed) return;
    this.#db.exec("DELETE FROM turns");
  }

  close(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    try {
      this.#db.close();
    } catch {}
  }
}

// ─── Assistant ─────────────────────────────────────────────────────────────

class Assistant {
  // ─── Reactive surface (PLAN-bun-assistant.md "Signals exposed on Assistant") ───
  #state: WritableSignal<AssistantState>;
  #lastTurn: WritableSignal<Turn | null>;
  #history: WritableSignal<Message[]>;
  #interrupted: WritableSignal<boolean>;

  // ─── Composed resources ───
  #llm: any | null = null; // bun:llm LLM instance
  #whisper: any | null = null; // bun:llm WhisperModel
  #mic: any | null = null; // bun:audio CaptureStream
  #spk: any | null = null; // bun:audio PlaybackStream
  #ttsModel: string | null = null;
  #ttsBinPath: string | undefined;
  #micOpts: AssistantOptions["mic"];
  #speakerOpts: AssistantOptions["speaker"];
  #chatOpts: AssistantOptions["chatOpts"];

  // ─── Mutable history (mirrors #history.value) ───
  #messages: Message[] = [];

  // ─── Persistent memory (sqlite) ───
  #memory: MemoryStore | null = null;

  #disposed = false;

  // Public read-only signal accessors.
  get state(): Signal<AssistantState> {
    return this.#state;
  }
  get lastTurn(): Signal<Turn | null> {
    return this.#lastTurn;
  }
  get history(): Signal<Message[]> {
    return this.#history;
  }
  get interrupted(): Signal<boolean> {
    return this.#interrupted;
  }

  /** Underlying LLM instance — for advanced use, e.g. reading m.busy or m.device. */
  get llm(): any {
    return this.#llm;
  }

  /**
   * Persistent memory store. Null when no `memory` option was passed.
   * Exposed so callers can query/clear/inspect outside the bot loop.
   */
  get memory(): MemoryStore | null {
    return this.#memory;
  }

  constructor(opts: AssistantOptions) {
    this.#state = signalsMod.signal("idle");
    this.#lastTurn = signalsMod.signal<Turn | null>(null);
    this.#history = signalsMod.signal<Message[]>([]);
    this.#interrupted = signalsMod.signal(false);
    this.#micOpts = opts.mic;
    this.#speakerOpts = opts.speaker;
    this.#chatOpts = opts.chatOpts;
    this.#ttsModel = opts.tts ?? null;
    this.#ttsBinPath = opts.ttsBinPath;

    if (opts.system) {
      this.#messages.push({ role: "system", content: opts.system });
      this.#history.set(this.#messages.slice());
    }

    if (opts.memory !== undefined) {
      const memPath = typeof opts.memory === "string" ? opts.memory : opts.memory.path;
      this.#memory = new SqliteMemoryStore(memPath);
      // Replay persisted turns into the in-process history. System
      // prompt stays in slot 0 from the constructor; persisted user/
      // assistant turns get appended in chronological order.
      for (const m of this.#memory.load()) {
        this.#messages.push(m);
      }
      this.#history.set(this.#messages.slice());
    }
  }

  /** Load all models + open audio devices. Returns when ready to converse. */
  static async create(opts: AssistantOptions): Promise<Assistant> {
    if (!opts.llm) throw new TypeError("bun:assistant.create: opts.llm (path to GGUF) is required");
    const bot = new Assistant(opts);

    // Load LLM (always required).
    bot.#llm = await llmMod.LLM.load(opts.llm, opts.llmOpts);

    // Optional: STT
    if (opts.stt) {
      bot.#whisper = await llmMod.WhisperModel.load(opts.stt);
    }

    // Optional: mic — only opened if STT is also configured. Without
    // STT there's nothing to do with audio frames.
    if (opts.stt) {
      const m = opts.mic ?? {};
      bot.#mic = await audio.capture({
        device: m.device ?? "default",
        sampleRate: m.sampleRate ?? 16000,
        channels: m.channels ?? 1,
        periodMs: m.periodMs ?? 20,
      });
    }

    // Optional: speaker — opened lazily on first speak() call so we know
    // the TTS-emitted sample rate to negotiate with ALSA.
    return bot;
  }

  /**
   * Run the duplex loop forever (or until disposed). Equivalent to
   * `for await (const _ of bot.turns()) {}`.
   */
  async run(): Promise<void> {
    for await (const _ of this.turns()) {
      // Body intentionally empty — turns() yields, run() drains.
      void _;
    }
  }

  /**
   * Async iterator yielding one Turn per user utterance + assistant
   * reply round-trip.
   */
  async *turns(): AsyncIterableIterator<Turn> {
    if (this.#disposed) throw new Error("bun:assistant: already disposed");
    if (!this.#mic || !this.#whisper) {
      throw new Error(
        "bun:assistant.turns: voice loop requires both `stt` and `mic`. Use bot.ask(text) for text-only turns.",
      );
    }
    const sampleRate = this.#mic.sampleRate;
    const ls = speech.listen(this.#mic.frames(), { sampleRate });
    this.#state.set("listening");
    try {
      for await (const utt of ls) {
        // STT
        this.#state.set("thinking");
        const text = this.#transcribe(utt);
        if (!text || text.trim().length === 0) {
          this.#state.set("listening");
          continue;
        }
        const turn = await this.#runTurn(text);
        yield turn;
        this.#state.set("listening");
      }
    } finally {
      // listen() ended (mic closed) — go idle.
      this.#state.set("idle");
    }
  }

  /**
   * Run a full LLM turn from text input. Skips STT; runs LLM + TTS if
   * configured. Useful for tests, CLI tools, scheduled prompts.
   */
  async ask(text: string): Promise<Turn> {
    if (this.#disposed) throw new Error("bun:assistant: already disposed");
    if (!text || typeof text !== "string") {
      throw new TypeError("bun:assistant.ask: text must be a non-empty string");
    }
    this.#state.set("thinking");
    try {
      const turn = await this.#runTurn(text);
      return turn;
    } finally {
      this.#state.set("idle");
    }
  }

  /** Speak text without recording a user turn (for scheduled announcements). */
  async say(text: string): Promise<void> {
    if (this.#disposed) throw new Error("bun:assistant: already disposed");
    if (!this.#ttsModel) {
      throw new Error("bun:assistant.say: TTS not configured (opts.tts is unset)");
    }
    this.#state.set("speaking");
    try {
      await this.#speak(text);
    } finally {
      this.#state.set("idle");
    }
  }

  // ─── Internal helpers ───

  #transcribe(utt: { samples: Float32Array }): string {
    return this.#whisper!.transcribe(utt.samples);
  }

  async #runTurn(userText: string): Promise<Turn> {
    const startedAtMs = Date.now();

    const userMsg: Message = { role: "user", content: userText };
    this.#messages.push(userMsg);
    this.#history.set(this.#messages.slice());
    this.#memory?.append(userMsg);

    // LLM
    const reply = await this.#llm.chatComplete(this.#messages, this.#chatOpts);
    const assistantMsg: Message = { role: "assistant", content: reply };
    this.#messages.push(assistantMsg);
    this.#history.set(this.#messages.slice());
    this.#memory?.append(assistantMsg);

    // TTS (if configured)
    if (this.#ttsModel) {
      this.#state.set("speaking");
      await this.#speak(reply);
    }

    const endedAtMs = Date.now();
    const turn: Turn = {
      user: userText,
      assistant: reply,
      toolCalls: [],
      startedAtMs,
      endedAtMs,
      interrupted: false,
    };
    this.#lastTurn.set(turn);
    return turn;
  }

  async #speak(text: string): Promise<void> {
    const audioOut = await speech.speak(text, {
      engine: "piper",
      model: this.#ttsModel!,
      binPath: this.#ttsBinPath,
    });
    // Lazy-open the speaker on first speak() so we negotiate the right
    // sample rate with ALSA.
    if (!this.#spk) {
      const s = this.#speakerOpts ?? {};
      this.#spk = await audio.play({
        device: s.device ?? "default",
        sampleRate: audioOut.sampleRate,
        channels: audioOut.channels,
      });
    }
    await this.#spk.write(audioOut.samples);
  }

  /** Stop all loops and release devices. Idempotent. */
  async close(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#state.set("idle");
    if (this.#mic) {
      try {
        await this.#mic.close();
      } catch {}
      this.#mic = null;
    }
    if (this.#spk) {
      try {
        await this.#spk.close();
      } catch {}
      this.#spk = null;
    }
    if (this.#llm && typeof this.#llm.dispose === "function") {
      try {
        this.#llm.dispose();
      } catch {}
      this.#llm = null;
    }
    if (this.#memory) {
      try {
        this.#memory.close();
      } catch {}
      this.#memory = null;
    }
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.close();
  }
}

async function create(opts: AssistantOptions): Promise<Assistant> {
  return Assistant.create(opts);
}

export default {
  create,
  Assistant,
};
