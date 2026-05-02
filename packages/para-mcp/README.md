# @para/mcp

A Model Context Protocol client. Two transports today:

- **stdio** — subprocess over newline-delimited JSON-RPC 2.0
- **ws** — WebSocket text frames

```js
import mcp from "@para/mcp";

await using conn = await mcp.connect({
  transport: "stdio",
  command: "node",
  args: ["./my-mcp-server.js"],
});

// List tools the server exposes
console.log(await conn.tools());

// Call a tool
const result = await conn.call("read_file", { path: "/etc/hostname" });
```

## Composing with `@para/assistant`

The connection object is structurally compatible with `@para/assistant`'s `tools:` option — the assistant flattens every tool the connection exposes into its own catalog and routes calls back through `conn.call`.

```js
import assistant from "@para/assistant";

const bot = assistant.create({
  llm,
  tools: [conn], // any { tools, call } object works
});
```

## Out of scope (v1)

- Server hosting (we're a client)
- HTTP / SSE transports
- OAuth wrappers
- `resources/*` and `prompts/*` surfaces (`tools/*` only)

## Requires

`node:child_process` for the stdio transport. Works on Node, Bun, Deno, ParaBun. Browser-only environments need the `ws` transport.

## Status

`private:true / 0.0.0-dev` — pending the workspace split. See [parabun.script.dev](https://parabun.script.dev) for the runtime-bundled story today.
