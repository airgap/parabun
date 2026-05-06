// Hardcoded module "@para/mcp"
//
// Model Context Protocol client. Two transports for v1: stdio (subprocess
// over newline-delimited JSON-RPC 2.0) and ws (WebSocket text frames,
// each frame one JSON-RPC message).
//
// Surface (LYK-733):
//
//   const conn = await mcp.connect("stdio", "home-assistant-mcp", { args, env });
//   const conn = await mcp.connect("ws", "ws://hub.local:8080/mcp");
//   conn.tools;                   // ToolDescriptor[] — name, description, inputSchema
//   await conn.call(name, args);  // dispatch to the server, returns result
//   await conn.close();           // releases transport; idempotent
//
// Out of scope for v1 (deferred):
//   - Server hosting (separate proposal).
//   - HTTP / SSE transport.
//   - Auth wrapper (OAuth, etc.) — pass credentials through env / args.
//   - Resources / prompts surfaces (only tools/* covered).

const childProcess = require("node:child_process");

// ─── Types ─────────────────────────────────────────────────────────────────

type JsonRpcId = number | string;

type ToolDescriptor = {
  name: string;
  description?: string;
  inputSchema: object;
};

type ToolContent =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string }
  | { type: "resource"; resource: { uri: string; mimeType?: string; text?: string; blob?: string } };

type ToolCallResult = {
  content: ToolContent[];
  isError?: boolean;
};

type StdioConnectOpts = {
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
};

type ConnectOpts = {
  /**
   * Override the protocolVersion sent in `initialize`. Defaults to the latest
   * shipping MCP spec version this client was built against.
   */
  protocolVersion?: string;
  /**
   * Override the clientInfo block sent in `initialize`.
   */
  clientInfo?: { name: string; version: string };
};

const DEFAULT_PROTOCOL_VERSION = "2025-03-26";
const DEFAULT_CLIENT_INFO = { name: "@para/mcp", version: "0.1.0" } as const;

interface Transport {
  send(msg: object): void;
  onMessage(cb: (msg: any) => void): void;
  onClose(cb: (err?: Error) => void): void;
  close(): Promise<void>;
}

// ─── MCPError ──────────────────────────────────────────────────────────────

class MCPError extends Error {
  code: number;
  data: unknown;
  constructor(err: { code: number; message: string; data?: unknown }) {
    super(`@para/mcp: ${err.message}`);
    this.name = "MCPError";
    this.code = err.code;
    this.data = err.data;
  }
}

// ─── MCPConnection ─────────────────────────────────────────────────────────

class MCPConnection {
  #transport: Transport;
  #pending = new Map<JsonRpcId, { resolve: (v: any) => void; reject: (e: any) => void }>();
  #nextId = 1;
  #closed = false;

  // Populated by initialize().
  tools: ToolDescriptor[] = [];
  serverInfo: { name?: string; version?: string } | null = null;
  protocolVersion: string | null = null;
  /** Capabilities advertised by the server. */
  serverCapabilities: Record<string, unknown> = {};

  constructor(transport: Transport) {
    this.#transport = transport;
    transport.onMessage(msg => this.#dispatch(msg));
    transport.onClose(err => this.#onTransportClose(err));
  }

  async #request<T = any>(method: string, params?: unknown): Promise<T> {
    if (this.#closed) throw new Error("@para/mcp: connection is closed");
    const id = this.#nextId++;
    const { promise, resolve, reject } = Promise.withResolvers<T>();
    this.#pending.set(id, { resolve, reject });
    try {
      this.#transport.send({ jsonrpc: "2.0", id, method, params });
    } catch (e) {
      this.#pending.delete(id);
      throw e;
    }
    return promise;
  }

  #notify(method: string, params?: unknown): void {
    if (this.#closed) return;
    try {
      this.#transport.send({ jsonrpc: "2.0", method, params });
    } catch {
      // Notifications are fire-and-forget; ignore transport write failures.
    }
  }

  #dispatch(msg: any): void {
    if (!msg || typeof msg !== "object") return;
    // Response (has id + result/error). Notifications from server (no id)
    // are intentionally ignored in v1 — there's no listener API yet.
    if (msg.id !== undefined && (msg.result !== undefined || msg.error !== undefined)) {
      const pending = this.#pending.get(msg.id);
      if (!pending) return;
      this.#pending.delete(msg.id);
      if (msg.error) pending.reject(new MCPError(msg.error));
      else pending.resolve(msg.result);
    }
  }

  #onTransportClose(err?: Error): void {
    if (this.#closed) return;
    this.#closed = true;
    const cause = err ?? new Error("@para/mcp: transport closed");
    for (const p of this.#pending.values()) p.reject(cause);
    this.#pending.clear();
  }

  /**
   * Performs the MCP `initialize` handshake and caches the tool list. Called
   * automatically by `mcp.connect()`; exposed for advanced use where the
   * caller wired the transport themselves.
   */
  async initialize(opts: ConnectOpts = {}): Promise<void> {
    const init = await this.#request<{
      protocolVersion: string;
      capabilities?: Record<string, unknown>;
      serverInfo?: { name: string; version: string };
    }>("initialize", {
      protocolVersion: opts.protocolVersion ?? DEFAULT_PROTOCOL_VERSION,
      capabilities: { tools: {} },
      clientInfo: opts.clientInfo ?? DEFAULT_CLIENT_INFO,
    });
    this.protocolVersion = init.protocolVersion;
    this.serverCapabilities = init.capabilities ?? {};
    this.serverInfo = init.serverInfo ?? null;

    // The MCP spec requires the client to send `notifications/initialized`
    // once the handshake is complete. Servers may reject other requests
    // until it arrives.
    this.#notify("notifications/initialized");

    // Pull the tool catalog up front. If the server doesn't expose tools,
    // leave the list empty.
    const toolsAdvertised = "tools" in this.serverCapabilities;
    if (toolsAdvertised) {
      try {
        const list = await this.#request<{ tools?: ToolDescriptor[] }>("tools/list");
        this.tools = list?.tools ?? [];
      } catch {
        this.tools = [];
      }
    }
  }

  /**
   * Refreshes the cached tool list. Servers that change their tool surface
   * at runtime emit `notifications/tools/list_changed`; v1 doesn't subscribe
   * to those, so callers can call this manually when they expect change.
   */
  async refreshTools(): Promise<ToolDescriptor[]> {
    const list = await this.#request<{ tools?: ToolDescriptor[] }>("tools/list");
    this.tools = list?.tools ?? [];
    return this.tools;
  }

  /**
   * Invoke a tool by name with arguments. Returns the server's
   * `ToolCallResult` shape — `{ content: ToolContent[], isError? }`.
   */
  async call(name: string, args: Record<string, unknown> = {}): Promise<ToolCallResult> {
    if (typeof name !== "string" || !name) {
      throw new TypeError("@para/mcp: tool name must be a non-empty string");
    }
    return this.#request<ToolCallResult>("tools/call", { name, arguments: args });
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    for (const p of this.#pending.values()) {
      p.reject(new Error("@para/mcp: connection closed"));
    }
    this.#pending.clear();
    try {
      await this.#transport.close();
    } catch {
      // Best-effort close.
    }
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.close();
  }
}

// ─── Stdio transport ───────────────────────────────────────────────────────

function makeStdioTransport(command: string, opts: StdioConnectOpts): Transport {
  const proc = childProcess.spawn(command, opts.args ?? [], {
    env: opts.env ?? process.env,
    cwd: opts.cwd,
    // stderr: "inherit" so server logs surface during dev. stdout/stdin
    // carry the protocol; both are line-buffered.
    stdio: ["pipe", "pipe", "inherit"],
  });

  let onMessage: ((msg: any) => void) | null = null;
  let onClose: ((err?: Error) => void) | null = null;
  let buffer = "";
  let closed = false;

  proc.stdout!.setEncoding("utf8");
  proc.stdout!.on("data", (chunk: string) => {
    buffer += chunk;
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      if (!line.trim()) continue;
      let msg: unknown;
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }
      onMessage?.(msg);
    }
  });

  proc.on("exit", code => {
    if (closed) return;
    closed = true;
    onClose?.(code === 0 ? undefined : new Error(`@para/mcp: stdio server exited with code ${code}`));
  });
  proc.on("error", err => {
    if (closed) return;
    closed = true;
    onClose?.(err);
  });

  return {
    send(msg) {
      if (closed) throw new Error("@para/mcp: stdio transport is closed");
      proc.stdin!.write(JSON.stringify(msg) + "\n");
    },
    onMessage(cb) {
      onMessage = cb;
    },
    onClose(cb) {
      onClose = cb;
    },
    async close() {
      if (closed) return;
      closed = true;
      try {
        proc.stdin!.end();
      } catch {}
      // Give the server a chance to exit cleanly; SIGTERM after 2s.
      const exited = new Promise<void>(resolve => proc.once("exit", () => resolve()));
      const timer = setTimeout(() => {
        try {
          proc.kill("SIGTERM");
        } catch {}
      }, 2000);
      await exited;
      clearTimeout(timer);
    },
  };
}

// ─── WebSocket transport ───────────────────────────────────────────────────

function makeWsTransport(url: string): Promise<Transport> {
  return new Promise((resolve, reject) => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      reject(e);
      return;
    }

    let onMessage: ((msg: any) => void) | null = null;
    let onClose: ((err?: Error) => void) | null = null;
    let opened = false;
    let closed = false;

    ws.addEventListener("open", () => {
      opened = true;
      resolve({
        send(msg) {
          if (closed) throw new Error("@para/mcp: ws transport is closed");
          ws.send(JSON.stringify(msg));
        },
        onMessage(cb) {
          onMessage = cb;
        },
        onClose(cb) {
          onClose = cb;
        },
        async close() {
          if (closed) return;
          closed = true;
          try {
            ws.close();
          } catch {}
        },
      });
    });

    ws.addEventListener("message", e => {
      if (!onMessage) return;
      const data = e.data;
      if (typeof data !== "string") return; // binary frames are not protocol
      try {
        onMessage(JSON.parse(data));
      } catch {
        // ignore malformed frames
      }
    });

    ws.addEventListener("error", () => {
      if (opened) return; // post-open errors surface via "close"
      reject(new Error(`@para/mcp: WebSocket error connecting to ${url}`));
    });

    ws.addEventListener("close", e => {
      if (closed) return;
      closed = true;
      if (!opened) {
        reject(new Error(`@para/mcp: WebSocket closed before open (code=${e.code})`));
        return;
      }
      onClose?.(e.code === 1000 ? undefined : new Error(`@para/mcp: WebSocket closed (code=${e.code})`));
    });
  });
}

// ─── Public connect() ──────────────────────────────────────────────────────

async function connect(
  transport: "stdio",
  command: string,
  opts?: StdioConnectOpts & ConnectOpts,
): Promise<MCPConnection>;
async function connect(transport: "ws", url: string, opts?: ConnectOpts): Promise<MCPConnection>;
async function connect(
  transport: "stdio" | "ws",
  target: string,
  opts: (StdioConnectOpts & ConnectOpts) | ConnectOpts = {},
): Promise<MCPConnection> {
  let t: Transport;
  if (transport === "stdio") {
    t = makeStdioTransport(target, opts as StdioConnectOpts);
  } else if (transport === "ws") {
    t = await makeWsTransport(target);
  } else {
    throw new Error(`@para/mcp: unknown transport "${transport}". Use "stdio" or "ws".`);
  }
  const conn = new MCPConnection(t);
  try {
    await conn.initialize(opts as ConnectOpts);
  } catch (e) {
    await conn.close().catch(() => {});
    throw e;
  }
  return conn;
}

export default {
  connect,
  MCPError,
};
