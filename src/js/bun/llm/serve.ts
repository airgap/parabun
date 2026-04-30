// para:llm — HTTP serving subsurface (`llm.serve(opts)`).
//
// OpenAI-compatible HTTP API for any object with .chat() / .generate() /
// .embed() methods. Built on Bun.serve, no native deps. Lets existing
// OpenAI client SDKs (openai-node, langchain, llama-index) talk to a
// Parabun process running a local GGUF model.
//
//   import llm from "para:llm";
//
//   using m = await llm.LLM.load("./Llama-3.2-1B-Instruct-Q4_K_M.gguf");
//
//   const server = llm.serve({
//     engine: m,            // any object with .chat() / .generate() / .embed()
//     modelId: "llama-3.2-1b",
//     port: 11434,          // ollama's default port
//   });
//
//   // curl http://localhost:11434/v1/chat/completions \
//   //   -H "Content-Type: application/json" \
//   //   -d '{"model":"llama-3.2-1b","messages":[{"role":"user","content":"hi"}],"stream":true}'
//
// Endpoints:
//   GET  /v1/models                   → { data: [{ id: modelId, ... }] }
//   POST /v1/chat/completions         → ChatCompletion (or SSE stream when stream=true)
//   POST /v1/completions              → Completion (legacy text completion)
//   POST /v1/embeddings               → embedding vector(s) — only if engine.embed() exists
//   GET  /                            → simple identity ping for health checks
//
// What ships today: the orchestration. Routing, JSON parsing, SSE chunk
// formatting, OpenAI request/response shape, optional bearer auth, simple
// concurrency limit (FIFO queue — multiple callers serialize through one
// engine instance, since llama.cpp-class engines aren't internally batched).
//
// What's not here yet: continuous batching (vLLM-class scheduler), tool /
// function calling JSON shape, vision inputs, the assistants API. Those
// are real engineering, separate ships.

// ─── Types ─────────────────────────────────────────────────────────────────

type ChatRole = "system" | "user" | "assistant" | "tool";

type ChatMessage = {
  role: ChatRole;
  content: string;
  name?: string;
};

type ChatCompletionRequest = {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  stop?: string | string[];
  seed?: number;
};

type CompletionRequest = {
  model: string;
  prompt: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  stop?: string | string[];
  seed?: number;
};

type EmbeddingRequest = {
  model: string;
  input: string | string[];
};

/**
 * The engine interface. A para:llm instance satisfies this naturally; users
 * can implement their own (mocks, alternate inference engines) by matching
 * the shape.
 */
type Engine = {
  /** Stream tokens for a chat-template prompt. */
  chat?: (messages: ChatMessage[], opts?: GenerateOptions) => AsyncIterable<string>;
  /** Stream tokens for a raw prompt. */
  generate?: (prompt: string, opts?: GenerateOptions) => AsyncIterable<string>;
  /** Optional: embed text into a vector. */
  embed?: (text: string | string[]) => Promise<Float32Array | Float32Array[]>;
};

type GenerateOptions = {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stop?: string[];
  seed?: number;
};

type ServeOptions = {
  /** The inference engine. Required. */
  engine: Engine;
  /** Public model ID returned by /v1/models and echoed in responses. */
  modelId: string;
  /** Port to bind. Default 11434 (matches ollama's default). */
  port?: number;
  /** Hostname. Default "0.0.0.0". */
  hostname?: string;
  /**
   * Optional bearer token. When set, requests must carry
   *   Authorization: Bearer <token>
   * (or include `?api_key=<token>` for tools that don't speak headers).
   * When unset, every request is accepted — fine for localhost / private
   * networks, but you should set this if the server is exposed.
   */
  apiKey?: string;
  /**
   * Maximum concurrent generations. Most local engines (llama.cpp, para:llm)
   * aren't internally batched, so the right answer for low-end hosts is 1.
   * Higher values queue requests and serialize them. Default 1.
   */
  maxConcurrent?: number;
  /**
   * Hook called for every request after auth, with the parsed body. Return
   * truthy to short-circuit the response (write to res yourself); return
   * undefined to continue normal handling. Useful for logging / metrics /
   * request transforms.
   */
  onRequest?: (req: Request, body: any) => void | Response | Promise<void | Response>;
};

type Server = {
  port: number;
  hostname: string;
  url: string;
  stop: () => void;
};

// ─── FIFO concurrency gate ─────────────────────────────────────────────────

class Semaphore {
  #permits: number;
  #waiters: Array<() => void> = [];

  constructor(permits: number) {
    this.#permits = permits;
  }

  async acquire(): Promise<() => void> {
    if (this.#permits > 0) {
      this.#permits--;
      return () => this.#release();
    }
    return new Promise<() => void>(resolve => {
      this.#waiters.push(() => {
        this.#permits--;
        resolve(() => this.#release());
      });
    });
  }

  #release(): void {
    this.#permits++;
    const next = this.#waiters.shift();
    if (next) next();
  }
}

// ─── serve() — start an OpenAI-compatible HTTP server ─────────────────────

export function serve(opts: ServeOptions): Server {
  if (!opts.engine) throw new TypeError("bun:serve.openai: opts.engine is required");
  if (!opts.modelId || typeof opts.modelId !== "string") {
    throw new TypeError("bun:serve.openai: opts.modelId must be a string");
  }
  const port = opts.port ?? 11434;
  const hostname = opts.hostname ?? "0.0.0.0";
  const apiKey = opts.apiKey ?? null;
  const sem = new Semaphore(Math.max(1, opts.maxConcurrent ?? 1));
  const engine = opts.engine;
  const modelId = opts.modelId;

  const checkAuth = (req: Request): boolean => {
    if (!apiKey) return true;
    const auth = req.headers.get("authorization");
    if (auth === `Bearer ${apiKey}`) return true;
    const url = new URL(req.url);
    if (url.searchParams.get("api_key") === apiKey) return true;
    return false;
  };

  const json = (status: number, body: any): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });

  const errorResponse = (status: number, message: string, type = "invalid_request_error"): Response =>
    json(status, { error: { message, type, code: null } });

  const buildOpts = (req: ChatCompletionRequest | CompletionRequest): GenerateOptions => ({
    temperature: req.temperature,
    topP: req.top_p,
    maxTokens: req.max_tokens,
    stop: typeof req.stop === "string" ? [req.stop] : req.stop,
    seed: req.seed,
  });

  // ID generator for completion responses. Doesn't need to be cryptographic,
  // just monotonically unique per process (clients use it for idempotency).
  let idCounter = 0;
  const newId = (prefix: string): string => `${prefix}-${Date.now().toString(36)}${(idCounter++).toString(36)}`;

  const sseLine = (obj: any): string => `data: ${JSON.stringify(obj)}\n\n`;
  const sseDone = "data: [DONE]\n\n";

  const handleChat = async (req: Request, body: ChatCompletionRequest): Promise<Response> => {
    if (!engine.chat) {
      return errorResponse(501, "engine does not implement chat(); send to /v1/completions instead");
    }
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return errorResponse(400, "messages must be a non-empty array");
    }
    const release = await sem.acquire();
    const id = newId("chatcmpl");
    const created = Math.floor(Date.now() / 1000);
    const stream = body.stream === true;

    if (!stream) {
      try {
        let text = "";
        for await (const piece of engine.chat(body.messages, buildOpts(body))) {
          text += piece;
        }
        return json(200, {
          id,
          object: "chat.completion",
          created,
          model: modelId,
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: text },
              finish_reason: "stop",
            },
          ],
          usage: null, // we don't count tokens here yet
        });
      } finally {
        release();
      }
    }

    // SSE streaming response.
    const encoder = new TextEncoder();
    const sseBody = new ReadableStream({
      async start(controller) {
        try {
          // Initial role-only chunk — matches OpenAI's wire format.
          controller.enqueue(
            encoder.encode(
              sseLine({
                id,
                object: "chat.completion.chunk",
                created,
                model: modelId,
                choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }],
              }),
            ),
          );
          for await (const piece of engine.chat!(body.messages, buildOpts(body))) {
            controller.enqueue(
              encoder.encode(
                sseLine({
                  id,
                  object: "chat.completion.chunk",
                  created,
                  model: modelId,
                  choices: [{ index: 0, delta: { content: piece }, finish_reason: null }],
                }),
              ),
            );
          }
          controller.enqueue(
            encoder.encode(
              sseLine({
                id,
                object: "chat.completion.chunk",
                created,
                model: modelId,
                choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
              }),
            ),
          );
          controller.enqueue(encoder.encode(sseDone));
          controller.close();
        } catch (err) {
          controller.enqueue(encoder.encode(sseLine({ error: { message: String((err as Error)?.message ?? err) } })));
          controller.close();
        } finally {
          release();
        }
      },
    });

    return new Response(sseBody, {
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
    });
  };

  const handleCompletion = async (req: Request, body: CompletionRequest): Promise<Response> => {
    if (!engine.generate) {
      return errorResponse(501, "engine does not implement generate()");
    }
    if (typeof body.prompt !== "string") {
      return errorResponse(400, "prompt must be a string");
    }
    const release = await sem.acquire();
    const id = newId("cmpl");
    const created = Math.floor(Date.now() / 1000);
    const stream = body.stream === true;

    if (!stream) {
      try {
        let text = "";
        for await (const piece of engine.generate(body.prompt, buildOpts(body))) text += piece;
        return json(200, {
          id,
          object: "text_completion",
          created,
          model: modelId,
          choices: [{ index: 0, text, finish_reason: "stop", logprobs: null }],
          usage: null,
        });
      } finally {
        release();
      }
    }

    const encoder = new TextEncoder();
    const sseBody = new ReadableStream({
      async start(controller) {
        try {
          for await (const piece of engine.generate!(body.prompt, buildOpts(body))) {
            controller.enqueue(
              encoder.encode(
                sseLine({
                  id,
                  object: "text_completion",
                  created,
                  model: modelId,
                  choices: [{ index: 0, text: piece, finish_reason: null, logprobs: null }],
                }),
              ),
            );
          }
          controller.enqueue(encoder.encode(sseDone));
          controller.close();
        } catch (err) {
          controller.enqueue(encoder.encode(sseLine({ error: { message: String((err as Error)?.message ?? err) } })));
          controller.close();
        } finally {
          release();
        }
      },
    });

    return new Response(sseBody, {
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
    });
  };

  const handleEmbeddings = async (req: Request, body: EmbeddingRequest): Promise<Response> => {
    if (!engine.embed) {
      return errorResponse(501, "engine does not implement embed()");
    }
    const inputs = Array.isArray(body.input) ? body.input : [body.input];
    if (inputs.some(s => typeof s !== "string")) {
      return errorResponse(400, "input must be a string or string[]");
    }
    const release = await sem.acquire();
    try {
      const result = await engine.embed(body.input);
      const vectors = Array.isArray(result) ? (result as Float32Array[]) : [result as Float32Array];
      return json(200, {
        object: "list",
        data: vectors.map((v, i) => ({
          object: "embedding",
          embedding: Array.from(v),
          index: i,
        })),
        model: modelId,
        usage: null,
      });
    } finally {
      release();
    }
  };

  const fetch = async (req: Request): Promise<Response> => {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/") {
      return json(200, { service: "bun:serve", model: modelId, ok: true });
    }

    if (req.method === "GET" && url.pathname === "/v1/models") {
      if (!checkAuth(req)) return errorResponse(401, "missing or invalid API key", "invalid_api_key");
      return json(200, {
        object: "list",
        data: [
          {
            id: modelId,
            object: "model",
            created: Math.floor(Date.now() / 1000),
            owned_by: "parabun",
          },
        ],
      });
    }

    if (req.method !== "POST") return errorResponse(404, "route not found");
    if (!checkAuth(req)) return errorResponse(401, "missing or invalid API key", "invalid_api_key");

    let body: any;
    try {
      body = await req.json();
    } catch {
      return errorResponse(400, "invalid JSON body");
    }

    if (opts.onRequest) {
      const short = await opts.onRequest(req, body);
      if (short) return short;
    }

    if (url.pathname === "/v1/chat/completions") return handleChat(req, body);
    if (url.pathname === "/v1/completions") return handleCompletion(req, body);
    if (url.pathname === "/v1/embeddings") return handleEmbeddings(req, body);

    return errorResponse(404, "route not found");
  };

  // @ts-expect-error — Bun's global is available at runtime in the Parabun
  // builtin environment; the type isn't pulled into this module's scope.
  const server = Bun.serve({ port, hostname, fetch });
  return {
    port: server.port,
    hostname: server.hostname,
    url: `http://${server.hostname}:${server.port}`,
    stop: () => server.stop(),
  };
}
