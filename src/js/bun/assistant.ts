// Hardcoded module "parabun:assistant"
//
// Tier 2 facade that composes parabun:audio + parabun:speech + parabun:llm into a
// complete edge AI assistant. Three-line case:
//
//   import assistant from "parabun:assistant";
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
//      directly via parabun:llm / parabun:speech / parabun:audio.
//
// What v1 ships (per PLAN-bun-assistant.md "Build order" §208):
//   - assistant.create + bot.run + bot.turns + bot.ask/say
//   - Reactive surface: state, lastTurn, history, interrupted signals
//   - In-memory chat history (full transcript across turns this process)
//
// Now shipped (post-v1):
//   - Persistent memory (step 4) — sqlite-backed, replays on construct.
//   - Tools / MCP (step 3, LYK-733/734) — inline `{name,schema,run}` tools
//     plus structural `MCPLike` connections flatten into bot.tools.
//   - Barge-in (step 5 first half, LYK-735) — VAD rising edge during
//     thinking/speaking aborts the chat token loop, drops the speaker
//     buffer via spk.stop(), and stamps `turn.interrupted = true`.
//   - Wake word (step 5 second half, LYK-739) — pass `wakeWord: "hey jetson"`
//     and the voice loop ignores utterances that don't carry the phrase.
//     Implemented as VAD-gated whisper transcription + phrase match
//     (`speech.wakeWord` is the standalone primitive); a follow-up will plug
//     in a dedicated low-power KWS engine for battery-powered devices.
//   - Scheduled prompts (step 7, LYK-737) — pass `schedule: [{cron, prompt}]`
//     and the bot fires `bot.ask(prompt)` on each cron match. Resulting
//     Turn carries `scheduled: true`. 5-field cron, local time. Skipped if
//     the bot is mid-turn; next minute retries.
//   - RAG (step 6, LYK-738) — pass `knowledge: { dir, encoder, topK? }` and
//     the bot indexes the directory at create() time, retrieves topK chunks
//     per user message, and injects them as a synthetic system message into
//     the LLM working copy (canonical history is untouched). Re-indexes on
//     fs.watch events. `bot.knowledge.search(text, n)` and `.reindex()`
//     exposed for direct use.
//
// Still deferred:
//   - Vision / VLM (step 8)

const audio = require("./audio.ts");
const speech = require("./speech.ts");
const llmMod = require("./llm.ts");
const signalsMod = require("./signals.ts");

// Structural Signal types — keep this module agnostic of @para/signals's
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
  /**
   * True if the turn was cut short by VAD-driven barge-in (LYK-735) — either
   * during chat-token generation or during TTS playback. The recorded
   * `assistant` field still reflects what the model produced before the cut.
   */
  interrupted: boolean;
  /**
   * True if this turn was fired by the `schedule` option (LYK-737) rather
   * than a user utterance / explicit `bot.ask`. The `user` field carries the
   * scheduled prompt text. Lets consumers filter the transcript ("show me
   * everything _I_ said") and lets `lastTurn` subscribers route proactive
   * turns differently (notification vs. inline log entry).
   */
  scheduled: boolean;
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
 * Anything with `.tools: ToolDescriptor[]` + `.call(name, args)` — `@para/mcp`'s
 * `MCPConnection` is the canonical implementation. We deliberately don't
 * `require("./mcp.ts")` for the type so `parabun:assistant` doesn't pull MCP into
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
    throw new TypeError("parabun:assistant: inline tool must have a non-empty `name`");
  }
  if (typeof (tool as InlineTool).run !== "function") {
    throw new TypeError(`parabun:assistant: inline tool "${tool.name}" must define run()`);
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
   *   - `@para/mcp` connection objects (every tool the connection exposes
   *     is flattened into the assistant's tool list).
   *   - Inline `{ name, description?, schema, run }` descriptors.
   *
   * When non-empty, the chat loop runs in tool-dispatch mode: each turn
   * is a JSON-schema-constrained generation, results are fed back as
   * synthetic messages, and the loop continues until the model emits
   * a final reply (or `MAX_TOOL_ITERATIONS` is hit).
   */
  tools?: AssistantTool[];
  /**
   * Wake-word gate (LYK-739). When set, the voice loop ignores utterances
   * until one matches one of the configured phrases. After a turn finishes
   * the gate re-arms — the bot listens for the next wake.
   *
   * String shorthand: `wakeWord: "hey jetson"` is equivalent to
   * `wakeWord: { phrase: "hey jetson" }`.
   */
  wakeWord?: string | WakeWordConfig;
  /**
   * Scheduled / proactive prompts (LYK-737). The bot fires `bot.ask(prompt)`
   * on each cron match, in local time. Standard 5-field cron syntax:
   * `"minute hour day-of-month month day-of-week"`. Supports `*`, exact
   * values, ranges (`N-M`), lists (`N,M`), and step (`*` or `N-M` `/N`).
   *
   * The resulting Turn carries `scheduled: true` so consumers can filter.
   * Skipped if the bot is mid-turn (state ≠ "idle"/"listening") — the next
   * tick (≤ 60 s later) retries.
   */
  schedule?: ScheduledPrompt[];
  /**
   * RAG over a local doc directory (LYK-738). Indexes the directory at
   * create() time, then per user message retrieves topK chunks and prepends
   * them as a synthetic "Relevant context" system message inside the LLM
   * working copy — without persisting to canonical history or memory.
   *
   * `encoder` is either a path to a sentence-embedding GGUF (BGE / E5 /
   * MiniLM-class) or a pre-loaded `parabun:llm.Encoder` instance. Re-indexes on
   * filesystem change via `fs.watch` (debounced).
   */
  knowledge?: KnowledgeOptions;
};

type ScheduledPrompt = {
  /** Cron expression, local time. e.g. `"0 8 * * *"` for 8 AM every day. */
  cron: string;
  /** Prompt text fed straight into `bot.ask()`. */
  prompt: string;
};

type KnowledgeOptions = {
  /** Root directory to index. Walked recursively. */
  dir: string;
  /**
   * Sentence-embedding GGUF path, or a pre-loaded encoder instance with an
   * `embed(text, opts) -> Float32Array` method. The synchronous embed shape
   * (matching `parabun:llm.Encoder`) is what we expect.
   */
  encoder: string | { embed(text: string, opts?: { pool?: string; normalize?: boolean }): Float32Array };
  /** How many chunks to retrieve per query. Default 4. */
  topK?: number;
  /** Approximate target chunk size in characters. Default 800. */
  chunkSize?: number;
  /** Number of characters of overlap between consecutive long-paragraph chunks. Default 100. */
  chunkOverlap?: number;
  /**
   * File extensions to read. Default `[".md", ".markdown", ".txt", ".mdx"]`.
   * Other extensions are skipped silently — vendor folders / build outputs
   * shouldn't be eaten by the indexer.
   */
  extensions?: string[];
  /**
   * Skip files larger than this (bytes). Default 1 MB. Keeps a stray binary
   * or a giant log from clobbering the in-memory matrix.
   */
  maxFileBytes?: number;
  /**
   * Watch the directory for changes and re-index automatically. Default
   * true. Set false when the dir is short-lived (tests, ephemeral fixtures)
   * — the watcher thread can race on freed inotify state during teardown.
   * Manual `bot.knowledge.reindex()` still works regardless.
   */
  watch?: boolean;
};

type KnowledgeChunk = {
  /** Absolute file path the chunk came from. */
  path: string;
  /** Character offset into the file. Useful for "open this file at line X" UIs. */
  offset: number;
  /** The chunk text itself (already trimmed). */
  text: string;
};

type KnowledgeHit = KnowledgeChunk & {
  /** Cosine similarity in [-1, 1]; for normalized vectors, [0, 1] for typical text. */
  score: number;
};

type WakeWordConfig = {
  /** One or more phrases. Matched case-insensitively, default substring. */
  phrase: string | string[];
  /** "contains" (default), "exact", or "fuzzy" Levenshtein with `maxEdits`. */
  match?: "contains" | "exact" | "fuzzy";
  /** Max edit distance for "fuzzy". Default 2. */
  maxEdits?: number;
  /**
   * If true, the wake utterance is ALSO fed to the LLM as the first turn.
   * Some users say "hey jetson, what's the time" in one breath; some pause.
   * Default false: the wake utterance is consumed by the gate, the next
   * utterance becomes the first turn.
   */
  feedThrough?: boolean;
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
    if (this.#disposed) throw new Error("parabun:assistant: memory store disposed");
    const rows = this.#db.query("SELECT role, content FROM turns ORDER BY id ASC").all() as Array<{
      role: "user" | "assistant" | "system";
      content: string;
    }>;
    return rows.map(r => ({ role: r.role, content: r.content }));
  }

  append(msg: Message): void {
    if (this.#disposed) throw new Error("parabun:assistant: memory store disposed");
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

// ─── Cron parser (LYK-737) ─────────────────────────────────────────────────
//
// Standard 5-field cron: `minute hour day-of-month month day-of-week`.
// Each field is one of:
//   *           any value
//   N           exact value
//   N-M         inclusive range
//   N,M,P       list (mixes with ranges: `1,3,5-7`)
//   */N         step (every Nth) starting from the field's min
//   N-M/P       range with step
//
// Resolved into precomputed Sets per field so cronMatches is O(1) per check.

type CronSpec = {
  minute: Set<number>;
  hour: Set<number>;
  dom: Set<number>;
  month: Set<number>;
  dow: Set<number>;
};

const CRON_FIELD_RANGES = [
  { min: 0, max: 59 }, // minute
  { min: 0, max: 23 }, // hour
  { min: 1, max: 31 }, // day-of-month
  { min: 1, max: 12 }, // month
  { min: 0, max: 6 }, // day-of-week (0 = Sunday)
] as const;

function parseCronField(part: string, idx: number): Set<number> {
  const { min, max } = CRON_FIELD_RANGES[idx];
  const out = new Set<number>();
  for (const piece of part.split(",")) {
    let rangeAndStep = piece;
    let step = 1;
    const slash = piece.indexOf("/");
    if (slash >= 0) {
      rangeAndStep = piece.slice(0, slash);
      step = parseInt(piece.slice(slash + 1), 10);
      if (!Number.isFinite(step) || step <= 0) {
        throw new Error(`parabun:assistant: invalid cron step "${piece}"`);
      }
    }
    let lo: number, hi: number;
    if (rangeAndStep === "*") {
      lo = min;
      hi = max;
    } else if (rangeAndStep.indexOf("-") >= 0) {
      const dash = rangeAndStep.indexOf("-");
      lo = parseInt(rangeAndStep.slice(0, dash), 10);
      hi = parseInt(rangeAndStep.slice(dash + 1), 10);
    } else {
      lo = hi = parseInt(rangeAndStep, 10);
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo < min || hi > max || lo > hi) {
      throw new Error(`parabun:assistant: cron field "${piece}" out of range [${min}, ${max}]`);
    }
    for (let v = lo; v <= hi; v += step) out.add(v);
  }
  return out;
}

function parseCron(expr: string): CronSpec {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(`parabun:assistant: cron expression must have 5 fields (got ${parts.length}): "${expr}"`);
  }
  return {
    minute: parseCronField(parts[0], 0),
    hour: parseCronField(parts[1], 1),
    dom: parseCronField(parts[2], 2),
    month: parseCronField(parts[3], 3),
    dow: parseCronField(parts[4], 4),
  };
}

function cronMatches(spec: CronSpec, date: Date): boolean {
  return (
    spec.minute.has(date.getMinutes()) &&
    spec.hour.has(date.getHours()) &&
    spec.dom.has(date.getDate()) &&
    spec.month.has(date.getMonth() + 1) &&
    spec.dow.has(date.getDay())
  );
}

// ─── KnowledgeStore (RAG, LYK-738) ─────────────────────────────────────────
//
// Pure-JS implementation. The storage is one contiguous Float32Array of
// row-normalized embeddings — at 384-dim BGE-small with 8000 chunks that's
// only 12 MB of RAM. Cosine search is a dot product per row, vectorized as
// far as a fmadd JIT will take us; on a Pi 5 this serves a query in a few
// ms for low-thousands of chunks.
//
// The chunker walks the dir, splits by paragraph (double newline), and
// further splits long paragraphs by character count with a configurable
// overlap. Tokenization isn't free in JS, so we use char count as the
// budget — encoders truncate at maxContext anyway.

const KNOWLEDGE_DEFAULT_EXTENSIONS = [".md", ".markdown", ".txt", ".mdx"];

/**
 * Chunk a single string into roughly-sized pieces split on paragraph
 * boundaries. Long paragraphs are broken into overlapping windows so we
 * don't drop information at chunk boundaries.
 *
 * Pure function — exported for tests + power users wiring custom indexers.
 */
function chunkText(
  text: string,
  opts?: { chunkSize?: number; chunkOverlap?: number },
): { offset: number; text: string }[] {
  const chunkSize = Math.max(64, opts?.chunkSize ?? 800);
  const overlap = Math.max(0, Math.min(chunkSize - 32, opts?.chunkOverlap ?? 100));
  const out: { offset: number; text: string }[] = [];

  // Normalize line endings, then split on blank-line boundaries — preserves
  // the byte offset of each paragraph by tracking position as we walk.
  const norm = text.replace(/\r\n?/g, "\n");
  const re = /\n[ \t]*\n+/g;
  let para = 0;
  let m: RegExpExecArray | null;
  const paras: { offset: number; text: string }[] = [];
  while ((m = re.exec(norm))) {
    const piece = norm.slice(para, m.index).trim();
    if (piece) paras.push({ offset: para, text: piece });
    para = m.index + m[0].length;
  }
  const tail = norm.slice(para).trim();
  if (tail) paras.push({ offset: para, text: tail });

  for (const p of paras) {
    if (p.text.length <= chunkSize) {
      out.push(p);
      continue;
    }
    // Long paragraph — split into overlapping windows. Step = chunkSize -
    // overlap, so each window covers fresh ground except for the overlap
    // at its leading edge.
    const step = chunkSize - overlap;
    for (let s = 0; s < p.text.length; s += step) {
      const slice = p.text.slice(s, s + chunkSize);
      if (slice.trim().length === 0) continue;
      out.push({ offset: p.offset + s, text: slice });
      if (s + chunkSize >= p.text.length) break;
    }
  }
  return out;
}

class KnowledgeStore {
  #encoder: { embed(text: string, opts?: any): Float32Array };
  #ownsEncoder: boolean;
  #dir: string;
  #topK: number;
  #chunkSize: number;
  #chunkOverlap: number;
  #extensions: string[];
  #maxFileBytes: number;

  // Indexed state — populated by reindex().
  #chunks: KnowledgeChunk[] = [];
  #vectors: Float32Array = new Float32Array(0);
  #dim: number = 0;

  // Re-index plumbing.
  #watcher: any | null = null;
  #reindexTimer: ReturnType<typeof setTimeout> | null = null;
  /** Single-flight guard so concurrent fs events coalesce into one rebuild. */
  #reindexInFlight: Promise<void> | null = null;
  #disposed = false;

  /** Number of indexed chunks. */
  get count(): number {
    return this.#chunks.length;
  }

  /** Embedding dimension (set after the first reindex). */
  get dim(): number {
    return this.#dim;
  }

  /** Root directory being indexed. */
  get dir(): string {
    return this.#dir;
  }

  constructor(
    encoder: { embed(text: string, opts?: any): Float32Array },
    ownsEncoder: boolean,
    opts: KnowledgeOptions,
  ) {
    const path = require("node:path");
    this.#encoder = encoder;
    this.#ownsEncoder = ownsEncoder;
    this.#dir = path.resolve(opts.dir);
    this.#topK = Math.max(1, opts.topK ?? 4);
    this.#chunkSize = Math.max(64, opts.chunkSize ?? 800);
    this.#chunkOverlap = Math.max(0, opts.chunkOverlap ?? 100);
    this.#extensions = (opts.extensions ?? KNOWLEDGE_DEFAULT_EXTENSIONS).map(e =>
      e.startsWith(".") ? e.toLowerCase() : "." + e.toLowerCase(),
    );
    this.#maxFileBytes = opts.maxFileBytes ?? 1024 * 1024;
  }

  static async create(opts: KnowledgeOptions): Promise<KnowledgeStore> {
    const fs = require("node:fs");
    if (typeof opts.dir !== "string" || !opts.dir) {
      throw new TypeError("parabun:assistant.knowledge: opts.dir is required");
    }
    if (!fs.existsSync(opts.dir)) {
      throw new Error(`parabun:assistant.knowledge: directory not found at "${opts.dir}"`);
    }
    let encoder: { embed(text: string, opts?: any): Float32Array };
    let owns = false;
    if (typeof opts.encoder === "string") {
      encoder = await llmMod.Encoder.load(opts.encoder);
      owns = true;
    } else if (opts.encoder && typeof (opts.encoder as any).embed === "function") {
      encoder = opts.encoder as any;
    } else {
      throw new TypeError("parabun:assistant.knowledge: opts.encoder must be a path or an Encoder-like object");
    }
    const store = new KnowledgeStore(encoder, owns, opts);
    await store.reindex();
    // Watcher is opt-out — defaults to on, but ephemeral / test directories
    // should pass watch: false to avoid the inotify-thread race that fires
    // when the dir disappears mid-test.
    if (opts.watch !== false) store.#startWatcher();
    return store;
  }

  /** Walk the directory, chunk, embed, replace the index in one pass. */
  async reindex(): Promise<void> {
    if (this.#disposed) throw new Error("parabun:assistant.knowledge: store disposed");
    // Serialize concurrent reindex calls — fs.watch can fire fast.
    if (this.#reindexInFlight) return this.#reindexInFlight;
    const run = (async () => {
      const newChunks = this.#walkAndChunk(this.#dir);
      if (newChunks.length === 0) {
        this.#chunks = [];
        this.#vectors = new Float32Array(0);
        return;
      }
      // Embed the first chunk to learn the dimension; allocate the matrix
      // once we know it.
      const first = this.#encoder.embed(newChunks[0].text, { pool: "mean", normalize: true });
      const dim = first.length;
      const matrix = new Float32Array(newChunks.length * dim);
      matrix.set(first, 0);
      for (let i = 1; i < newChunks.length; i++) {
        const v = this.#encoder.embed(newChunks[i].text, { pool: "mean", normalize: true });
        if (v.length !== dim) {
          throw new Error(
            `parabun:assistant.knowledge: encoder produced inconsistent dims (${dim} vs ${v.length}) at chunk ${i}`,
          );
        }
        matrix.set(v, i * dim);
      }
      this.#chunks = newChunks;
      this.#vectors = matrix;
      this.#dim = dim;
    })();
    this.#reindexInFlight = run;
    try {
      await run;
    } finally {
      this.#reindexInFlight = null;
    }
  }

  /**
   * Cosine search against the index. Returns the top-N hits in descending
   * score order. Embeds the query text with the same encoder + pool +
   * normalization as the corpus.
   */
  search(text: string, n?: number): KnowledgeHit[] {
    if (this.#disposed) throw new Error("parabun:assistant.knowledge: store disposed");
    if (this.#chunks.length === 0 || this.#dim === 0) return [];
    const k = Math.max(1, Math.min(this.#chunks.length, n ?? this.#topK));
    const q = this.#encoder.embed(text, { pool: "mean", normalize: true });
    if (q.length !== this.#dim) {
      throw new Error(`parabun:assistant.knowledge: query dim ${q.length} doesn't match index dim ${this.#dim}`);
    }
    const dim = this.#dim;
    const n_chunks = this.#chunks.length;
    const m = this.#vectors;
    // Compute all scores; keep top-k via a simple linear scan with insertion.
    // For low-thousands of chunks this beats a heap on real wall-clock time.
    const topIdx = new Int32Array(k);
    const topScore = new Float32Array(k);
    topScore.fill(-Infinity);
    for (let i = 0; i < n_chunks; i++) {
      let dot = 0;
      const off = i * dim;
      for (let j = 0; j < dim; j++) dot += m[off + j] * q[j];
      // Insertion into the sorted top-k tail.
      if (dot > topScore[k - 1]) {
        let pos = k - 1;
        while (pos > 0 && topScore[pos - 1] < dot) {
          topScore[pos] = topScore[pos - 1];
          topIdx[pos] = topIdx[pos - 1];
          pos--;
        }
        topScore[pos] = dot;
        topIdx[pos] = i;
      }
    }
    const hits: KnowledgeHit[] = [];
    for (let i = 0; i < k; i++) {
      if (topScore[i] === -Infinity) break;
      const c = this.#chunks[topIdx[i]];
      hits.push({ path: c.path, offset: c.offset, text: c.text, score: topScore[i] });
    }
    return hits;
  }

  /** Idempotent. Releases the watcher + (if owned) the encoder. */
  async close(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    if (this.#reindexTimer) {
      clearTimeout(this.#reindexTimer);
      this.#reindexTimer = null;
    }
    if (this.#watcher) {
      try {
        this.#watcher.close();
      } catch {}
      this.#watcher = null;
    }
    if (this.#ownsEncoder && this.#encoder && typeof (this.#encoder as any).dispose === "function") {
      try {
        (this.#encoder as any).dispose();
      } catch {}
    }
  }

  // ─── Internals ───

  #walkAndChunk(root: string): KnowledgeChunk[] {
    const fs = require("node:fs");
    const path = require("node:path");
    const out: KnowledgeChunk[] = [];
    const walk = (dir: string): void => {
      let entries: any[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const ent of entries) {
        // Skip dotdirs like .git, .obsidian — never indexed.
        if (ent.name.startsWith(".")) continue;
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          walk(full);
          continue;
        }
        if (!ent.isFile()) continue;
        const ext = path.extname(ent.name).toLowerCase();
        if (this.#extensions.indexOf(ext) === -1) continue;
        let stat: any;
        try {
          stat = fs.statSync(full);
        } catch {
          continue;
        }
        if (stat.size > this.#maxFileBytes) continue;
        let body: string;
        try {
          body = fs.readFileSync(full, "utf8");
        } catch {
          continue;
        }
        for (const c of chunkText(body, { chunkSize: this.#chunkSize, chunkOverlap: this.#chunkOverlap })) {
          out.push({ path: full, offset: c.offset, text: c.text });
        }
      }
    };
    walk(root);
    return out;
  }

  #startWatcher(): void {
    const fs = require("node:fs");
    try {
      this.#watcher = fs.watch(this.#dir, { recursive: true }, () => {
        // Debounce: editors often emit a flurry of events when saving.
        // Coalesce into one reindex 250 ms after the last event.
        if (this.#disposed) return;
        if (this.#reindexTimer) clearTimeout(this.#reindexTimer);
        this.#reindexTimer = setTimeout(() => {
          this.#reindexTimer = null;
          this.reindex().catch(() => undefined);
        }, 250);
      });
    } catch {
      // Some platforms (older macOS, some Linux containers) don't support
      // recursive watch. Fall back to manual `bot.knowledge.reindex()`.
    }
  }
}

// ─── Assistant ─────────────────────────────────────────────────────────────

class Assistant {
  // ─── Reactive surface (PLAN-bun-assistant.md "Signals exposed on Assistant") ───
  #state: WritableSignal<AssistantState>;
  #lastTurn: WritableSignal<Turn | null>;
  #history: WritableSignal<Message[]>;
  #interrupted: WritableSignal<boolean>;
  // Lifetime signal — true from create() until close()/[Symbol.dispose].
  // Distinct from `state` (which is the conversational state machine).
  // Effects bound via use() auto-tear-down when this flips false.
  #alive: WritableSignal<boolean>;
  #boundEffects: Array<() => void> = [];

  // ─── Composed resources ───
  #llm: any | null = null; // parabun:llm LLM instance
  #whisper: any | null = null; // parabun:llm WhisperModel
  #mic: any | null = null; // parabun:audio CaptureStream
  #spk: any | null = null; // parabun:audio PlaybackStream
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

  // ─── Barge-in (LYK-735) ───
  /**
   * The listen stream used by the active turns() loop. Shared with #speak()
   * and #runTurn() so they can wire up VAD-driven barge-in. Null outside the
   * voice loop (text-only ask() has no mic to barge with).
   */
  #activeListen: { active: Signal<boolean> } | null = null;
  /**
   * Set true the moment VAD fires while the assistant is speaking or thinking.
   * Read by the chunked-TTS loop and the chat-token loop to bail early.
   */
  #abortRequested = false;

  // ─── Wake word (LYK-739) ───
  #wakeWord: WakeWordConfig | null = null;

  // ─── Scheduled prompts (LYK-737) ───
  /** Parsed cron specs paired with their prompt text + last-fired-minute key. */
  #schedules: { spec: CronSpec; prompt: string; lastFiredKey: number }[] = [];
  /** Aligns first tick to the next :00 second boundary. */
  #scheduleAlignTimer: ReturnType<typeof setTimeout> | null = null;
  /** Per-minute tick interval after the alignment fires. */
  #scheduleTimer: ReturnType<typeof setInterval> | null = null;
  /** True while a scheduled turn is being awaited — guards against re-entry. */
  #scheduleBusy = false;
  /** Set true so #runTurn knows the next turn is proactive. */
  #scheduledFlag = false;

  // ─── Knowledge / RAG (LYK-738) ───
  #knowledge: KnowledgeStore | null = null;
  /** Default top-K when retrieving for a turn. Cached from opts at create. */
  #knowledgeTopK = 4;

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
  get alive(): Signal<boolean> {
    return this.#alive;
  }

  /**
   * Run an effect bound to the bot's lifetime. Behaves like
   * `signals.effect(fn)` but is automatically disposed when the bot
   * closes — no defensive `if (alive.get())` guards needed.
   */
  use(fn: () => void | (() => void)): () => void {
    const stop = signalsMod.effect(fn);
    this.#boundEffects.push(stop);
    return stop;
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
   * RAG store. Null when no `knowledge` option was passed. Exposed so
   * callers can `.search()` directly, force `.reindex()` after their own
   * doc updates, or read `.count` / `.dim` for observability.
   */
  get knowledge(): KnowledgeStore | null {
    return this.#knowledge;
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
    if (this.#disposed) throw new Error("parabun:assistant: already disposed");
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

  /**
   * Programmatically interrupt the in-flight turn. Same effect as VAD-driven
   * barge-in (LYK-735): the chat-token loop stops pulling, the chunked-TTS
   * loop bails out, the speaker buffer is dropped, and `bot.interrupted`
   * flips true. The current turn's `interrupted` field will be `true` when it
   * settles. Wire to a UI cancel button or any custom barge-in source.
   *
   * Idempotent within a turn — repeated calls are no-ops until the next turn
   * starts.
   */
  interrupt(): void {
    if (this.#disposed) return;
    if (this.#abortRequested) return;
    this.#abortRequested = true;
    this.#interrupted.set(true);
    if (this.#spk && typeof this.#spk.stop === "function") {
      this.#spk.stop().catch(() => {});
    }
  }

  constructor(opts: AssistantOptions) {
    this.#state = signalsMod.signal("idle");
    this.#lastTurn = signalsMod.signal<Turn | null>(null);
    this.#history = signalsMod.signal<Message[]>([]);
    this.#interrupted = signalsMod.signal(false);
    this.#alive = signalsMod.signal(true);
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

    if (opts.wakeWord !== undefined) {
      this.#wakeWord = typeof opts.wakeWord === "string" ? { phrase: opts.wakeWord } : opts.wakeWord;
    }

    if (opts.schedule && opts.schedule.length > 0) {
      for (const s of opts.schedule) {
        if (typeof s.cron !== "string" || typeof s.prompt !== "string") {
          throw new TypeError("parabun:assistant: schedule entries must have string `cron` and `prompt` fields");
        }
        // parseCron throws on invalid syntax; let it propagate so the user
        // gets the error at create() time, not silently inside a tick.
        this.#schedules.push({ spec: parseCron(s.cron), prompt: s.prompt, lastFiredKey: -1 });
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
    if (!opts.llm) throw new TypeError("parabun:assistant.create: opts.llm (path to GGUF) is required");
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

    // Optional: knowledge / RAG (LYK-738). Index synchronously at create
    // time so the first turn doesn't pay the indexing cost. Encoder load
    // + corpus walk + embed pass blocks here on the user's wall clock —
    // for a few thousand chunks that's a couple hundred ms on a desktop,
    // a couple seconds on a Pi. Watcher fires from inside reindex().
    if (opts.knowledge) {
      bot.#knowledge = await KnowledgeStore.create(opts.knowledge);
      bot.#knowledgeTopK = Math.max(1, opts.knowledge.topK ?? 4);
    }

    // Optional: schedule timers (LYK-737). Align the first tick to the
    // next :00 second of the next minute, then setInterval at 60 s. The
    // alignment matters: a cron entry of `0 8 * * *` should fire as close
    // to 08:00:00 as possible, not at whatever second create() finished.
    if (bot.#schedules.length > 0) bot.#startScheduleTimers();

    return bot;
  }

  #startScheduleTimers(): void {
    const tick = () => this.#scheduleTick().catch(() => undefined);
    const now = new Date();
    // ms to the start of the next minute. Subtract a small epsilon so a
    // sub-millisecond drift doesn't push us into the wrong minute.
    const msToNext = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
    this.#scheduleAlignTimer = setTimeout(() => {
      this.#scheduleAlignTimer = null;
      tick();
      this.#scheduleTimer = setInterval(tick, 60000);
    }, msToNext);
  }

  async #scheduleTick(): Promise<void> {
    if (this.#disposed) return;
    if (this.#scheduleBusy) return; // already running a scheduled turn
    // Skip if the bot is mid-turn — a scheduled fire colliding with a live
    // user turn would race on #messages. The next tick (≤60 s) retries.
    const state = this.#state.peek();
    if (state !== "idle" && state !== "listening") return;

    const now = new Date();
    // De-dup key: minute-of-epoch. A schedule that matches "*/15 * * * *"
    // shouldn't fire twice within the same minute even if our timer drifts.
    const minuteKey = Math.floor(now.getTime() / 60000);

    const due: { entry: { spec: CronSpec; prompt: string; lastFiredKey: number }; prompt: string }[] = [];
    for (const entry of this.#schedules) {
      if (entry.lastFiredKey === minuteKey) continue;
      if (cronMatches(entry.spec, now)) {
        entry.lastFiredKey = minuteKey;
        due.push({ entry, prompt: entry.prompt });
      }
    }
    if (due.length === 0) return;

    this.#scheduleBusy = true;
    try {
      for (const { prompt } of due) {
        if (this.#disposed) break;
        this.#scheduledFlag = true;
        try {
          await this.ask(prompt);
        } catch {
          // Surface as a console error in the future (PLAN-bun-assistant
          // §"Errors should not be invisible") — for now drop the throw
          // so a single failing schedule doesn't kill the timer.
        } finally {
          this.#scheduledFlag = false;
        }
      }
    } finally {
      this.#scheduleBusy = false;
    }
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
    if (this.#disposed) throw new Error("parabun:assistant: already disposed");
    if (!this.#mic || !this.#whisper) {
      throw new Error(
        "parabun:assistant.turns: voice loop requires both `stt` and `mic`. Use bot.ask(text) for text-only turns.",
      );
    }
    const sampleRate = this.#mic.sampleRate;
    const ls = speech.listen(this.#mic.frames(), { sampleRate });
    // Share the listen stream so #runTurn / #speak can subscribe to vad.active
    // for barge-in (LYK-735). Keeps the wiring out of the public surface.
    this.#activeListen = ls;
    this.#state.set("listening");
    // Wake-word gate (LYK-739). When configured, the bot stays in "listening"
    // and ignores transcribed utterances that don't carry the wake phrase.
    // After a turn finishes, the gate re-arms — so each turn starts with a
    // fresh wake. This matches user expectation on shared spaces (TVs,
    // kitchen displays) where every command is prefixed.
    let awake = this.#wakeWord == null;
    try {
      for await (const utt of ls) {
        // STT
        this.#state.set("thinking");
        const text = this.#transcribe(utt);
        if (!text || text.trim().length === 0) {
          this.#state.set("listening");
          continue;
        }

        let turnText = text;
        if (!awake && this.#wakeWord) {
          const matched = speech.matchWakePhrase(
            text,
            this.#wakeWord.phrase,
            this.#wakeWord.match ?? "contains",
            this.#wakeWord.maxEdits ?? 2,
          );
          if (!matched) {
            // Not the wake phrase — fall back to listening without yielding.
            this.#state.set("listening");
            continue;
          }
          awake = true;
          if (!this.#wakeWord.feedThrough) {
            // Consume the wake utterance; wait for the next one as the turn.
            this.#state.set("listening");
            continue;
          }
          // feedThrough mode: keep the full transcription (including the
          // wake phrase) as the turn's user input. The model sees the wake
          // word too, which is fine — it's just extra context.
        }

        const turn = await this.#runTurn(turnText);
        yield turn;
        // Re-arm the wake gate for the next turn.
        if (this.#wakeWord) awake = false;
        this.#state.set("listening");
      }
    } finally {
      this.#activeListen = null;
      // listen() ended (mic closed) — go idle.
      this.#state.set("idle");
    }
  }

  /**
   * Run a full LLM turn from text input. Skips STT; runs LLM + TTS if
   * configured. Useful for tests, CLI tools, scheduled prompts.
   */
  async ask(text: string): Promise<Turn> {
    if (this.#disposed) throw new Error("parabun:assistant: already disposed");
    if (!text || typeof text !== "string") {
      throw new TypeError("parabun:assistant.ask: text must be a non-empty string");
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
    if (this.#disposed) throw new Error("parabun:assistant: already disposed");
    if (!this.#ttsModel) {
      throw new Error("parabun:assistant.say: TTS not configured (opts.tts is unset)");
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

    // New turn — clear any prior interruption flag so the public signal
    // tracks "interrupted in the current turn" rather than "ever interrupted".
    this.#abortRequested = false;
    if (this.#interrupted.peek()) this.#interrupted.set(false);

    // Wire VAD-driven barge-in: while a turn is in flight, a rising edge on
    // listen()'s `active` signal flips #abortRequested. The chat-token loop
    // and the chunked-TTS loop both poll this flag and bail out (LYK-735).
    let bargeUnsub: (() => void) | null = null;
    if (this.#activeListen) {
      bargeUnsub = this.#activeListen.active.subscribe((on: boolean) => {
        if (on && !this.#abortRequested) {
          this.#abortRequested = true;
          this.#interrupted.set(true);
          // Best-effort: discard whatever's queued in ALSA so the user
          // hears their own voice cut us off, not 800ms of stale TTS.
          if (this.#spk && typeof this.#spk.stop === "function") {
            this.#spk.stop().catch(() => {});
          }
        }
      });
    }

    const userMsg: Message = { role: "user", content: userText };
    this.#messages.push(userMsg);
    this.#history.set(this.#messages.slice());
    this.#memory?.append(userMsg);

    // RAG retrieval (LYK-738). If a knowledge store is configured, run a
    // search against the user's text and build a working copy of #messages
    // with the retrieved chunks injected as a synthetic system message.
    // The synthetic context lives only for this turn — it doesn't go into
    // canonical history, doesn't persist to memory, and doesn't bias the
    // next turn's retrieval.
    const workingMessages = this.#buildWorkingMessages(userText);

    let reply: string;
    let toolCalls: { name: string; args: unknown; result: unknown }[] = [];
    let interrupted = false;
    try {
      if (this.#tools.length === 0) {
        reply = await this.#chatWithBargeIn(workingMessages);
      } else {
        const result = await this.#runTurnWithTools(workingMessages);
        reply = result.reply;
        toolCalls = result.toolCalls;
      }
    } finally {
      // No matter what threw, the flag tells us whether VAD fired.
      interrupted = this.#abortRequested;
    }

    const assistantMsg: Message = { role: "assistant", content: reply };
    this.#messages.push(assistantMsg);
    this.#history.set(this.#messages.slice());
    this.#memory?.append(assistantMsg);

    // TTS (if configured). Skip if we already got interrupted — the user
    // wants to talk, not hear our half-formed reply.
    if (this.#ttsModel && !interrupted) {
      this.#state.set("speaking");
      try {
        await this.#speak(reply);
      } finally {
        // #speak may have flipped the flag while playing.
        if (this.#abortRequested) interrupted = true;
      }
    }

    if (bargeUnsub) bargeUnsub();

    const endedAtMs = Date.now();
    const turn: Turn = {
      user: userText,
      assistant: reply,
      toolCalls,
      startedAtMs,
      endedAtMs,
      interrupted,
      scheduled: this.#scheduledFlag,
    };
    this.#lastTurn.set(turn);
    return turn;
  }

  /**
   * Build the messages list to pass to the LLM for the current turn,
   * injecting RAG-retrieved context if a knowledge store is configured.
   * Returns `this.#messages` as-is when no knowledge is wired (zero-cost
   * fast path).
   *
   * The injected context is a synthetic system message inserted right
   * after the original system prompt (if any), before the user/assistant
   * turn history. Format mimics conventional RAG prompts: numbered list
   * of chunks, each tagged with its source path. The LLM sees this as
   * authoritative reference material.
   */
  #buildWorkingMessages(userText: string): Message[] {
    if (!this.#knowledge || this.#knowledge.count === 0) return this.#messages;
    let hits: KnowledgeHit[];
    try {
      hits = this.#knowledge.search(userText, this.#knowledgeTopK);
    } catch {
      // A search failure (e.g., encoder dim mismatch after a hot-reload)
      // should not kill the turn — fall back to the bare message list.
      return this.#messages;
    }
    if (hits.length === 0) return this.#messages;

    const lines: string[] = ["Relevant context from your notes:", ""];
    for (let i = 0; i < hits.length; i++) {
      const h = hits[i];
      lines.push(`[${i + 1}] (${h.path})`);
      lines.push(h.text);
      lines.push("");
    }
    lines.push(
      "Use the context above when it's relevant to the user's request. " +
        "Cite the bracketed number when you reference a specific item; " +
        "if nothing above is relevant, ignore it.",
    );
    const ragMsg: Message = { role: "system", content: lines.join("\n") };

    // Insert after the canonical system prompt (slot 0) if there is one,
    // otherwise at slot 0. Keeps system-level instructions at the head.
    const out: Message[] = [];
    let inserted = false;
    for (const m of this.#messages) {
      out.push(m);
      if (!inserted && m.role === "system") {
        out.push(ragMsg);
        inserted = true;
      }
    }
    if (!inserted) out.unshift(ragMsg);
    return out;
  }

  /**
   * Run a plain chat call with cancellation support. We iterate the m.chat
   * generator instead of awaiting chatComplete so #abortRequested can stop
   * generation mid-stream — the partial text becomes the recorded reply.
   * Models running on the device path don't expose a hard-cancel today, so
   * we just stop pulling tokens; whatever is in flight finishes silently.
   */
  async #chatWithBargeIn(messages: Message[]): Promise<string> {
    let out = "";
    for await (const chunk of this.#llm.chat(messages, this.#chatOpts)) {
      out += chunk;
      if (this.#abortRequested) break;
    }
    return out;
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
  async #runTurnWithTools(
    sourceMessages: Message[],
  ): Promise<{ reply: string; toolCalls: { name: string; args: unknown; result: unknown }[] }> {
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
    // The base system prompt (the FIRST system message) is folded into the
    // toolPrompt and skipped. Any other system messages — e.g., retrieved
    // context injected by the RAG layer (LYK-738) — pass through so the
    // model sees the tool prompt + retrieved context + user/assistant turns.
    const baseSystem = sourceMessages.find(m => m.role === "system")?.content;
    const toolPrompt = this.#renderToolPrompt(baseSystem);
    const working: Message[] = [{ role: "system", content: toolPrompt }];
    let baseSystemSeen = false;
    for (const m of sourceMessages) {
      if (m.role === "system" && !baseSystemSeen && m.content === baseSystem) {
        baseSystemSeen = true;
        continue;
      }
      working.push(m);
    }

    const toolCalls: { name: string; args: unknown; result: unknown }[] = [];

    for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
      // Bail out of the tool loop if VAD fired since the last iteration.
      // We don't try to interrupt a single chatComplete call — the
      // schema-constrained generator returns intact and we exit on the
      // boundary. Good enough: tool turns are short.
      if (this.#abortRequested) {
        return { reply: "", toolCalls };
      }
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
    // Chunk playback so VAD can cut us mid-utterance (LYK-735). 100 ms slices
    // give the abort path a sub-quarter-second response time on the typical
    // 22 kHz Piper output, and the kernel buffer (~80 ms) holds at most one
    // slice past the abort point — drop() clears that.
    const samplesPerSlice = Math.max(1, Math.floor((audioOut.sampleRate * 100) / 1000)) * audioOut.channels;
    const total = audioOut.samples.length;
    let off = 0;
    while (off < total) {
      if (this.#abortRequested) {
        // VAD already fired; the subscriber called spk.stop(). Don't write
        // any more — return so #runTurn can mark the turn interrupted.
        return;
      }
      const end = Math.min(total, off + samplesPerSlice);
      // subarray is a view; the native binding copies into ALSA so this is safe.
      await this.#spk.write(audioOut.samples.subarray(off, end));
      off = end;
    }
  }

  /** Stop all loops and release devices. Idempotent. */
  async close(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#state.set("idle");
    if (this.#scheduleAlignTimer) {
      clearTimeout(this.#scheduleAlignTimer);
      this.#scheduleAlignTimer = null;
    }
    if (this.#scheduleTimer) {
      clearInterval(this.#scheduleTimer);
      this.#scheduleTimer = null;
    }
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
    if (this.#knowledge) {
      try {
        await this.#knowledge.close();
      } catch {}
      this.#knowledge = null;
    }
    if (this.#alive.peek()) {
      this.#alive.set(false);
      while (this.#boundEffects.length > 0) {
        const stop = this.#boundEffects.pop()!;
        try {
          stop();
        } catch {}
      }
    }
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.close();
  }

  [Symbol.dispose](): void {
    // Sync dispose: kicks off the async close() but doesn't await it.
    // The bot's individual resources (mic / spk / llm / memory / knowledge)
    // already have their own [Symbol.dispose] paths from prior commits;
    // this surface exists so callers can `using bot = ...` without `await`.
    void this.close();
  }
}

async function create(opts: AssistantOptions): Promise<Assistant> {
  return Assistant.create(opts);
}

export default {
  create,
  Assistant,
  // Cron primitives (LYK-737) — exposed for tests and for callers wiring
  // their own scheduler. The `schedule:` option uses these internally.
  parseCron,
  cronMatches,
  // RAG primitives (LYK-738) — exposed for tests and standalone use
  // (search a doc dir without spinning up an assistant). The `knowledge:`
  // option uses KnowledgeStore internally; chunkText is pure and a useful
  // building block for users wiring their own indexers.
  chunkText,
  KnowledgeStore,
};
