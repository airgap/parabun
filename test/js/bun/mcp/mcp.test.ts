import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { bunExe } from "harness";

// @para/mcp client coverage (LYK-733).
//
// Two transports under test:
//   1. stdio — spawn the bun debug build with fixture-server.ts as argv[0].
//   2. ws    — spin up a Bun.serve WebSocket server inside the test that
//              speaks the same JSON-RPC dialect.
//
// Both share the same set of correctness checks: initialize handshake
// fills serverInfo + tools, tools/call dispatches and returns content,
// close() is idempotent, calls after close reject.

const fixtureServer = join(import.meta.dir, "fixture-server.ts");

describe("@para/mcp", () => {
  describe("stdio transport", () => {
    test("connect, list tools, call, close", async () => {
      const mcp = (await import("@para/mcp")).default;
      await using conn = await mcp.connect("stdio", bunExe(), { args: [fixtureServer] });

      // Initialize populated server info + tool catalog.
      expect(conn.serverInfo).toEqual({ name: "fixture-server", version: "0.0.1" });
      expect(conn.protocolVersion).toBe("2025-03-26");
      expect(conn.tools.map(t => t.name).sort()).toEqual(["add", "echo"]);

      // Tool input schemas come through intact.
      const echo = conn.tools.find(t => t.name === "echo")!;
      expect((echo.inputSchema as any).type).toBe("object");
      expect((echo.inputSchema as any).required).toEqual(["text"]);

      // Dispatch by name.
      const echoed = await conn.call("echo", { text: "hello" });
      expect(echoed.content).toEqual([{ type: "text", text: "hello" }]);

      const sum = await conn.call("add", { a: 7, b: 35 });
      expect(sum.content).toEqual([{ type: "text", text: "42" }]);
    }, 30000);

    test("call rejects with MCPError when server returns -32601", async () => {
      const mcp = (await import("@para/mcp")).default;
      await using conn = await mcp.connect("stdio", bunExe(), { args: [fixtureServer] });
      await expect(conn.call("nonexistent")).rejects.toMatchObject({
        name: "MCPError",
        code: -32601,
      });
    }, 30000);

    test("close is idempotent and rejects subsequent calls", async () => {
      const mcp = (await import("@para/mcp")).default;
      const conn = await mcp.connect("stdio", bunExe(), { args: [fixtureServer] });
      await conn.close();
      // Idempotent — second close is a no-op.
      await conn.close();
      await expect(conn.call("echo", { text: "x" })).rejects.toThrow(/closed/);
    }, 30000);

    test("refreshTools repopulates from the server", async () => {
      const mcp = (await import("@para/mcp")).default;
      await using conn = await mcp.connect("stdio", bunExe(), { args: [fixtureServer] });
      const before = conn.tools.length;
      const after = await conn.refreshTools();
      expect(after.length).toBe(before);
      expect(after.map(t => t.name).sort()).toEqual(["add", "echo"]);
    }, 30000);
  });

  describe("ws transport", () => {
    let server: ReturnType<typeof Bun.serve> | null = null;
    let port = 0;

    beforeAll(() => {
      // In-process MCP server over WebSocket. Same dialect as the stdio
      // fixture; reuses the dispatcher inline so tests don't need a
      // separate file.
      server = Bun.serve({
        port: 0,
        fetch(req, srv) {
          if (srv.upgrade(req)) return;
          return new Response("expected websocket", { status: 400 });
        },
        websocket: {
          message(ws, raw) {
            const msg = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
            const id = msg.id;
            if (id === undefined) return; // notification, no reply
            const send = (payload: object) => ws.send(JSON.stringify({ jsonrpc: "2.0", id, ...payload }));
            switch (msg.method) {
              case "initialize":
                send({
                  result: {
                    protocolVersion: msg.params?.protocolVersion ?? "2025-03-26",
                    capabilities: { tools: {} },
                    serverInfo: { name: "ws-fixture", version: "0.0.1" },
                  },
                });
                return;
              case "tools/list":
                send({
                  result: {
                    tools: [
                      {
                        name: "ping",
                        description: "Returns pong.",
                        inputSchema: { type: "object", properties: {} },
                      },
                    ],
                  },
                });
                return;
              case "tools/call":
                if (msg.params?.name === "ping") {
                  send({ result: { content: [{ type: "text", text: "pong" }] } });
                  return;
                }
                send({ error: { code: -32601, message: `unknown tool: ${msg.params?.name}` } });
                return;
              default:
                send({ error: { code: -32601, message: `method not found: ${msg.method}` } });
            }
          },
        },
      });
      port = (server as any).port;
    });

    afterAll(() => {
      server?.stop(true);
    });

    test("connect over ws, call ping", async () => {
      const mcp = (await import("@para/mcp")).default;
      await using conn = await mcp.connect("ws", `ws://127.0.0.1:${port}`);
      expect(conn.serverInfo?.name).toBe("ws-fixture");
      expect(conn.tools.map(t => t.name)).toEqual(["ping"]);
      const reply = await conn.call("ping");
      expect(reply.content).toEqual([{ type: "text", text: "pong" }]);
    }, 30000);

    test("connect rejects when ws server is unreachable", async () => {
      const mcp = (await import("@para/mcp")).default;
      // Reserved test port range; nothing listens here.
      await expect(mcp.connect("ws", "ws://127.0.0.1:1")).rejects.toThrow(/@para/mcp/);
    }, 30000);
  });

  test("connect rejects unknown transport", async () => {
    const mcp = (await import("@para/mcp")).default;
    // @ts-expect-error — exercising the runtime guard
    await expect(mcp.connect("http", "http://example.com")).rejects.toThrow(/unknown transport/);
  });
});
