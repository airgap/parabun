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
  /** Tool-call records — populated when `tools` are configured (LYK-734). */
  toolCalls: { name: string; args: unknown; result: unknown }[];
  startedAtMs: number;
  endedAtMs: number;
  /** True if barge-in cut the reply short. v1: always false. */
  interrupted: boolean;
};

// ─── Tool dispatch (LYK-734) ───────────────────────────────────────────────

/**
 * An inline tool the assistant can invoke during a chat turn. The model emits
 * arguments under `schema`, the runtime parses, and `run(args)` is invoked
 * with the parsed value. Return any JSON-serializable value — it's fed back
 * to the model as the tool result.
 */
type InlineTool = {
  name: string;
  description?: string;
  schema: object;
  run(args: any): unknown | Promise<unknown>;
};

/**
 * Anything with `.tools: ToolDescriptor[]` + `.call(name, args)` — `bun:mcp`'s
 * `MCPConnection` is the canonical implementation. We deliberately don't
 * `require("./mcp.ts")` for the type so `bun:assistant` doesn't pull MCP into
 * every assistant binary; the MCP connection is identified structurally.
 */
type MCPLike = {
  tools: Array<{ name: string; description?: string; inputSchema: object }>;
  call(name: string, args: Record<string, unknown>): Promise<unknown>;
};

type AssistantTool = InlineTool | MCPLike;

type NormalizedTool = {
  name: string;
  description?: string;
  schema: object;
  /** "inline" tools fire `.run`; "mcp" tools route through the connection. */
  source: "inline" | "mcp";
  dispatch(args: any): Promise<unknown>;
};

function isMCPLike(t: AssistantTool): t is MCPLike {
  return Array.isArray((t as MCPLike).tools) && typeof (t as any)["call"] === "function";
}

/**
 * Maximum tool-dispatch iterations per turn. After this we force the model
 * to commit to a final reply by giving up on the schema-constrained path.
 * Prevents infinite loops if a tool keeps emitting more tool calls.
 */
const MAX_TOOL_ITERATIONS = 8;

/**
 * Flatten an `AssistantTool` (inline or MCP-like) into one or more
 * `NormalizedTool` records the assistant's dispatch loop can consume.
 * MCP connections expand into one record per advertised tool.
 */
function normalizeTool(tool: AssistantTool): NormalizedTool[] {
  if (isMCPLike(tool)) {
    return tool.tools.map(t => ({
      name: t.name,
      description: t.description,
      schema: t.inputSchema,
      source: "mcp" as const,
      // Bracket notation: the builtin preprocessor flags bare `.call` as
      // potentially-tampered Function.prototype.call. The MCPLike interface
      // uses `.call()` as the public dispatch method (LYK-733), so we
      // route around the preprocessor here.
      dispatch: (args: any) => (tool as any)["call"](t.name, args ?? {}),
    }));
  }
  if (typeof tool.name !== "string" || !tool.name) {
    throw new TypeError("bun:assistant: inline tool must have a non-empty `name`");
  }
  if (typeof (tool as InlineTool).run !== "function") {
    throw new TypeError(`bun:assistant: inline tool "${tool.name}" must define run()`);
  }
  const inline = tool as InlineTool;
  return [
    {
      name: inline.name,
      description: inline.description,
      schema: inline.schema ?? { type: "object" },
      source: "inline" as const,
      dispatch: async (args: any) => inline.run(args),
    },
  ];
}

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
  /**
   * Tools the assistant can invoke during a chat turn. Accepts a mix of:
   *   - `bun:mcp` connection objects (every tool the connection exposes
   *     is flattened into the assistant's tool list).
   *   - Inline `{ name, description?, schema, run }` descriptors.
   *
   * When non-empty, the chat loop runs in tool-dispatch mode: each turn
   * is a JSON-schema-constrained generation, results are fed back as
   * synthetic messages, and the loop continues until the model emits
   * a final reply (or `MAX_TOOL_ITERATIONS` is hit).
   */
  tools?: AssistantTool[];
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

  // ─── Tool dispatch (LYK-734) ───
  #tools: NormalizedTool[] = [];
  /** Names of tool calls currently in-flight. */
  #toolsActive: WritableSignal<Set<string>>;

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

  /**
   * Snapshot of currently-registered tools, flattened across MCP
   * connections + inline descriptors. Returns a fresh array each call —
   * mutating it doesn't affect the bot.
   */
  get tools(): Array<{ name: string; description?: string; schema: object; source: "inline" | "mcp" }> {
    return this.#tools.map(t => ({ name: t.name, description: t.description, schema: t.schema, source: t.source }));
  }

  /**
   * Set of tool names currently in-flight. Updates synchronously when a
   * dispatch starts and ends — wire to a UI to show active calls.
   */
  get toolsActive(): Signal<Set<string>> {
    return this.#toolsActive;
  }

  /** Add an inline tool or MCP connection mid-session. Returns the new tool count. */
  addTool(tool: AssistantTool): number {
    if (this.#disposed) throw new Error("bun:assistant: already disposed");
    for (const n of normalizeTool(tool)) this.#tools.push(n);
    return this.#tools.length;
  }

  /**
   * Remove a tool by name. Returns true if a tool was removed. Tools sourced
   * from an MCP connection are removed by their flattened name; the
   * connection itself stays open until the caller closes it.
   */
  removeTool(name: string): boolean {
    const before = this.#tools.length;
    this.#tools = this.#tools.filter(t => t.name !== name);
    return this.#tools.length < before;
  }

  constructor(opts: AssistantOptions) {
    this.#state = signalsMod.signal("idle");
    this.#lastTurn = signalsMod.signal<Turn | null>(null);
    this.#history = signalsMod.signal<Message[]>([]);
    this.#interrupted = signalsMod.signal(false);
    this.#toolsActive = signalsMod.signal<Set<string>>(new Set());
    this.#micOpts = opts.mic;
    this.#speakerOpts = opts.speaker;
    this.#chatOpts = opts.chatOpts;
    this.#ttsModel = opts.tts ?? null;
    this.#ttsBinPath = opts.ttsBinPath;

    if (opts.tools) {
      for (const t of opts.tools) {
        for (const n of normalizeTool(t)) this.#tools.push(n);
      }
    }

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

    let reply: string;
    let toolCalls: { name: string; args: unknown; result: unknown }[] = [];
    if (this.#tools.length === 0) {
      reply = await this.#llm.chatComplete(this.#messages, this.#chatOpts);
    } else {
      const result = await this.#runTurnWithTools();
      reply = result.reply;
      toolCalls = result.toolCalls;
    }

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
      toolCalls,
      startedAtMs,
      endedAtMs,
      interrupted: false,
    };
    this.#lastTurn.set(turn);
    return turn;
  }

  /**
   * Tool-dispatch chat loop. Each iteration runs a schema-constrained
   * `chatComplete` against a working copy of the history. The schema
   * forces `{tool, args, reply}` shape: the model picks a tool by name
   * (or `null` for "I'm done"), supplies args, and may emit a reply.
   * Tool results are folded back as synthetic user/assistant messages
   * within the working copy — the canonical history (#messages) only
   * gets the user→assistant pair.
   */
  async #runTurnWithTools(): Promise<{ reply: string; toolCalls: { name: string; args: unknown; result: unknown }[] }> {
    const toolNames = this.#tools.map(t => t.name);
    // `argsJson` is a string the model fills with a JSON-encoded args
    // object — an arbitrary `{ type: "object" }` schema would compile to
    // a recursive grammar rule, which our NFA engine refuses. Encoding
    // through a string is a v1 compromise that keeps the structure
    // (tool name, reply) grammar-constrained while letting per-tool
    // args flow as free-form JSON the dispatch layer parses.
    const schema = {
      type: "object",
      properties: {
        tool: { enum: [null, ...toolNames] },
        argsJson: { type: "string" },
        reply: { type: "string" },
      },
      required: ["tool", "argsJson", "reply"],
    };

    // Working copy of history with a tool-aware system prompt prepended.
    // The original system prompt (if any) stays as-is at index 0; the
    // tool-aware prompt is appended to it (or used standalone).
    const baseSystem = this.#messages.find(m => m.role === "system")?.content;
    const toolPrompt = this.#renderToolPrompt(baseSystem);
    const working: Message[] = [{ role: "system", content: toolPrompt }];
    for (const m of this.#messages) {
      if (m.role !== "system") working.push(m);
    }

    const toolCalls: { name: string; args: unknown; result: unknown }[] = [];

    for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
      const raw = await this.#llm.chatComplete(working, { ...this.#chatOpts, schema });
      let parsed: { tool: string | null; argsJson?: string; reply: string };
      try {
        parsed = JSON.parse(raw);
      } catch {
        // Schema-constrained sampling should make this unreachable; if a
        // server-side bug emits malformed JSON, surface it as the reply
        // rather than looping forever.
        return { reply: raw, toolCalls };
      }

      if (parsed.tool == null) {
        return { reply: parsed.reply ?? "", toolCalls };
      }

      const tool = this.#tools.find(t => t.name === parsed.tool);
      if (!tool) {
        // Hallucinated tool name — schema should prevent this, but be
        // defensive. Tell the model and let it recover.
        working.push({ role: "assistant", content: raw });
        working.push({
          role: "user",
          content: `(tool error: "${parsed.tool}" is not a registered tool. Available: ${toolNames.join(", ") || "(none)"})`,
        });
        continue;
      }

      // Decode args. The schema constrains shape (string), not contents —
      // if the model emits malformed JSON inside, treat as an empty args
      // object rather than blowing up the turn.
      let args: Record<string, unknown> = {};
      if (parsed.argsJson) {
        try {
          const decoded = JSON.parse(parsed.argsJson);
          if (decoded && typeof decoded === "object" && !Array.isArray(decoded)) {
            args = decoded as Record<string, unknown>;
          }
        } catch {
          // Leave args as {}.
        }
      }

      // Mark active.
      const active = new Set(this.#toolsActive.peek());
      active.add(tool.name);
      this.#toolsActive.set(active);

      let result: unknown;
      try {
        result = await tool.dispatch(args);
      } catch (e) {
        result = { error: e instanceof Error ? e.message : String(e) };
      } finally {
        const next = new Set(this.#toolsActive.peek());
        next.delete(tool.name);
        this.#toolsActive.set(next);
      }

      toolCalls.push({ name: tool.name, args, result });

      working.push({ role: "assistant", content: raw });
      working.push({
        role: "user",
        content: `(tool ${tool.name} returned: ${JSON.stringify(result)})`,
      });
    }

    // Iteration cap hit — force a final reply without the schema constraint
    // so the model can summarize what happened so far.
    const fallback = await this.#llm.chatComplete(
      [
        ...working,
        {
          role: "user",
          content: "(tool iteration cap reached; reply directly to the user without further tool calls)",
        },
      ],
      this.#chatOpts,
    );
    return { reply: fallback, toolCalls };
  }

  #renderToolPrompt(baseSystem: string | undefined): string {
    const lines: string[] = [];
    if (baseSystem) lines.push(baseSystem, "");
    lines.push("You have access to tools. Reply by emitting a JSON object with these fields:");
    lines.push("  - `tool`: the tool name to invoke, or `null` if you're ready to reply directly.");
    lines.push(
      '  - `argsJson`: a JSON-encoded string of the tool\'s arguments object (use "{}" when not calling a tool).',
    );
    lines.push('  - `reply`: your message to the user (use "" when calling a tool).');
    lines.push("");
    lines.push("Available tools:");
    for (const t of this.#tools) {
      const desc = t.description ? ` — ${t.description}` : "";
      lines.push(`  - ${t.name}${desc}`);
      lines.push(`      schema: ${JSON.stringify(t.schema)}`);
    }
    lines.push("");
    lines.push(
      "Tool results arrive as `(tool <name> returned: <json>)` user messages. Continue calling tools or reply directly when you have what you need.",
    );
    return lines.join("\n");
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
