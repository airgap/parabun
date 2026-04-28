// Minimal MCP server fixture for bun:mcp tests.
//
// Implements the parts of the protocol bun:mcp's v1 client uses:
//   - initialize → returns serverInfo + tool capability
//   - notifications/initialized → ignored
//   - tools/list → two fake tools
//   - tools/call → dispatches by name
//
// Speaks newline-delimited JSON-RPC 2.0 over stdin/stdout, per the MCP
// stdio transport spec.

type JsonRpcId = number | string;
type RpcMessage = {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method?: string;
  params?: any;
  result?: any;
  error?: { code: number; message: string; data?: any };
};

const send = (msg: RpcMessage) => process.stdout.write(JSON.stringify(msg) + "\n");

const tools = [
  {
    name: "echo",
    description: "Returns the input text unchanged.",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    },
  },
  {
    name: "add",
    description: "Returns a + b.",
    inputSchema: {
      type: "object",
      properties: { a: { type: "number" }, b: { type: "number" } },
      required: ["a", "b"],
    },
  },
];

function dispatch(msg: RpcMessage) {
  const { id, method, params } = msg;
  // Notifications carry no id and expect no reply.
  if (id === undefined) return;

  switch (method) {
    case "initialize":
      send({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: params?.protocolVersion ?? "2025-03-26",
          capabilities: { tools: {} },
          serverInfo: { name: "fixture-server", version: "0.0.1" },
        },
      });
      return;
    case "tools/list":
      send({ jsonrpc: "2.0", id, result: { tools } });
      return;
    case "tools/call": {
      const name = params?.name;
      const args = params?.arguments ?? {};
      if (name === "echo") {
        send({
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: String(args.text ?? "") }] },
        });
        return;
      }
      if (name === "add") {
        const sum = (Number(args.a) || 0) + (Number(args.b) || 0);
        send({
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: String(sum) }] },
        });
        return;
      }
      send({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `unknown tool: ${name}` },
      });
      return;
    }
    default:
      send({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `method not found: ${method}` },
      });
  }
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => {
  buffer += chunk;
  let nl: number;
  while ((nl = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, nl);
    buffer = buffer.slice(nl + 1);
    if (!line.trim()) continue;
    try {
      dispatch(JSON.parse(line));
    } catch {
      // ignore
    }
  }
});
process.stdin.on("end", () => process.exit(0));
