#!/usr/bin/env parabun
/**
 * Parabun Language Server
 *
 * A lightweight LSP server that uses Bun.Transpiler to provide
 * diagnostics for .pts (Parabun TypeScript) and .pjs (Parabun JavaScript) files.
 *
 * Usage:  bun run parabun-lsp.ts --stdio
 */

// ---------------------------------------------------------------------------
// JSON-RPC / LSP message framing
// ---------------------------------------------------------------------------

const HEADER_SEP = "\r\n\r\n";

let inputBuffer = "";

function send(msg: object) {
  const body = JSON.stringify(msg);
  const header = `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n`;
  process.stdout.write(header + body);
}

function sendResponse(id: number | string, result: unknown) {
  send({ jsonrpc: "2.0", id, result });
}

function sendNotification(method: string, params: unknown) {
  send({ jsonrpc: "2.0", method, params });
}

function publishDiagnostics(uri: string, diagnostics: Diagnostic[]) {
  sendNotification("textDocument/publishDiagnostics", { uri, diagnostics });
}

// ---------------------------------------------------------------------------
// LSP types (minimal subset)
// ---------------------------------------------------------------------------

interface Diagnostic {
  range: Range;
  severity: number; // 1=Error, 2=Warning, 3=Info, 4=Hint
  source: string;
  message: string;
}

interface Range {
  start: Position;
  end: Position;
}

interface Position {
  line: number;
  character: number;
}

interface BuildMessagePosition {
  line: number;
  column: number;
  length: number;
  lineText: string;
  file: string;
}

// ---------------------------------------------------------------------------
// Transpiler instances
// ---------------------------------------------------------------------------

const transpilers = {
  ts: new Bun.Transpiler({ loader: "ts" }),
  tsx: new Bun.Transpiler({ loader: "tsx" }),
  js: new Bun.Transpiler({ loader: "jsx" }),
};

function loaderForUri(uri: string): "ts" | "tsx" | "js" {
  if (uri.endsWith(".pts")) return "ts";
  if (uri.endsWith(".ptsx")) return "tsx";
  return "js";
}

// ---------------------------------------------------------------------------
// Document store
// ---------------------------------------------------------------------------

const documents = new Map<string, string>();

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validate(uri: string, content: string) {
  const loader = loaderForUri(uri);
  const transpiler = transpilers[loader];
  const diagnostics: Diagnostic[] = [];

  try {
    transpiler.transformSync(content);
  } catch (e: any) {
    const pos: BuildMessagePosition | undefined = e?.position;
    const message: string = e?.message ?? String(e);
    const level: string = e?.level ?? "error";

    // LSP lines/columns are 0-based; Bun's are 1-based
    const line = pos ? pos.line - 1 : 0;
    const col = pos ? pos.column - 1 : 0;
    const len = pos?.length ?? 1;

    diagnostics.push({
      range: {
        start: { line, character: col },
        end: { line, character: col + len },
      },
      severity: level === "warning" ? 2 : 1,
      source: "parabun",
      message,
    });
  }

  publishDiagnostics(uri, diagnostics);
}

// ---------------------------------------------------------------------------
// Completions — Parabun keywords and snippets
// ---------------------------------------------------------------------------

const parabunCompletions = [
  {
    label: "pure",
    kind: 14, // Keyword
    detail: "Parabun: pure function modifier",
    insertText: "pure ",
  },
  {
    label: "pure function",
    kind: 15, // Snippet
    detail: "Parabun: pure function declaration",
    insertText: "pure function ${1:name}(${2:params}) {\n\t${0}\n}",
    insertTextFormat: 2, // Snippet
  },
  {
    label: "pure async function",
    kind: 15,
    detail: "Parabun: pure async function declaration",
    insertText: "pure async function ${1:name}(${2:params}) {\n\t${0}\n}",
    insertTextFormat: 2,
  },
  {
    label: "..=",
    kind: 24, // Operator
    detail: "Parabun: await-assign (desugars to await)",
    insertText: "..= ",
  },
  {
    label: "..!",
    kind: 24,
    detail: "Parabun: catch operator (desugars to .catch())",
    insertText: "..! ",
  },
  {
    label: "..&",
    kind: 24,
    detail: "Parabun: finally operator (desugars to .finally())",
    insertText: "..& ",
  },
  {
    label: "|>",
    kind: 24,
    detail: "Parabun: pipeline operator (desugars to f(x))",
    insertText: "|> ",
  },
];

// ---------------------------------------------------------------------------
// Hover — Parabun-specific hover info
// ---------------------------------------------------------------------------

function getHoverInfo(content: string, line: number, character: number): { contents: string } | null {
  const lines = content.split("\n");
  if (line >= lines.length) return null;
  const lineText = lines[line];

  // Check if cursor is on a Parabun keyword/operator
  const wordAt = getWordAt(lineText, character);

  if (wordAt === "pure") {
    return {
      contents: [
        "```parabun",
        "pure function modifier",
        "```",
        "---",
        "Marks a function as **pure** — it cannot access `this` or cause side effects.",
        "",
        "Desugars to a standard function at transpile time.",
        "",
        "```typescript",
        "pure function add(a: number, b: number): number {",
        "  return a + b;",
        "}",
        "```",
      ].join("\n"),
    };
  }

  // Check for operators at the cursor position
  const around = lineText.slice(Math.max(0, character - 2), character + 2);

  if (around.includes("..=")) {
    return {
      contents: "**`..=` await-assign** — Desugars `x ..= expr` to `const x = await expr`",
    };
  }
  if (around.includes("..!")) {
    return {
      contents: "**`..!` catch operator** — Desugars `expr ..! handler` to `expr.catch(handler)`",
    };
  }
  if (around.includes("..&")) {
    return {
      contents: "**`..&` finally operator** — Desugars `expr ..& cleanup` to `expr.finally(cleanup)`",
    };
  }
  if (around.includes("|>")) {
    return {
      contents: "**`|>` pipeline operator** — Desugars `x |> f` to `f(x)`",
    };
  }

  return null;
}

function getWordAt(line: string, col: number): string {
  let start = col;
  let end = col;
  while (start > 0 && /\w/.test(line[start - 1])) start--;
  while (end < line.length && /\w/.test(line[end])) end++;
  return line.slice(start, end);
}

// ---------------------------------------------------------------------------
// Semantic Tokens — pure keyword highlighting
// ---------------------------------------------------------------------------

// Token types: 0=function
// Token modifiers: bit 0 = declaration, bit 1 = pure
const SEMANTIC_TOKEN_TYPES = ["function"];
const SEMANTIC_TOKEN_MODIFIERS = ["declaration", "pure"];

function computeSemanticTokens(content: string): number[] {
  const data: number[] = [];
  const lines = content.split("\n");
  let prevLine = 0;
  let prevChar = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Find "pure" keyword followed by function/async/(
    const pureRe = /\b(pure)\s*(?=function\b|async\b|\(|\w+\s*=>)/g;
    let m: RegExpExecArray | null;

    while ((m = pureRe.exec(line)) !== null) {
      const deltaLine = i - prevLine;
      const deltaChar = deltaLine === 0 ? m.index - prevChar : m.index;

      // deltaLine, deltaStartChar, length, tokenType, tokenModifiers
      data.push(deltaLine, deltaChar, 4, 0, 0b10); // bit 1 = pure modifier

      prevLine = i;
      prevChar = m.index;
    }
  }

  return data;
}

// ---------------------------------------------------------------------------
// Request dispatch
// ---------------------------------------------------------------------------

function handleMessage(msg: any) {
  const { id, method, params } = msg;

  switch (method) {
    case "initialize":
      sendResponse(id, {
        capabilities: {
          textDocumentSync: {
            openClose: true,
            change: 1, // Full sync
          },
          completionProvider: {
            triggerCharacters: [".", "|"],
          },
          hoverProvider: true,
          semanticTokensProvider: {
            legend: {
              tokenTypes: SEMANTIC_TOKEN_TYPES,
              tokenModifiers: SEMANTIC_TOKEN_MODIFIERS,
            },
            full: true,
          },
        },
        serverInfo: {
          name: "parabun-lsp",
          version: "0.1.0",
        },
      });
      break;

    case "initialized":
      // Client acknowledged — nothing to do
      break;

    case "shutdown":
      sendResponse(id, null);
      break;

    case "exit":
      process.exit(0);
      break;

    case "textDocument/didOpen": {
      const { uri, text } = params.textDocument;
      documents.set(uri, text);
      validate(uri, text);
      break;
    }

    case "textDocument/didChange": {
      const uri = params.textDocument.uri;
      const content = params.contentChanges[0]?.text;
      if (content !== undefined) {
        documents.set(uri, content);
        validate(uri, content);
      }
      break;
    }

    case "textDocument/didClose": {
      const uri = params.textDocument.uri;
      documents.delete(uri);
      publishDiagnostics(uri, []);
      break;
    }

    case "textDocument/completion": {
      sendResponse(id, {
        isIncomplete: false,
        items: parabunCompletions,
      });
      break;
    }

    case "textDocument/hover": {
      const uri = params.textDocument.uri;
      const content = documents.get(uri);
      if (content) {
        const hover = getHoverInfo(content, params.position.line, params.position.character);
        sendResponse(id, hover ? { contents: { kind: "markdown", value: hover.contents } } : null);
      } else {
        sendResponse(id, null);
      }
      break;
    }

    case "textDocument/semanticTokens/full": {
      const uri = params.textDocument.uri;
      const content = documents.get(uri);
      if (content) {
        sendResponse(id, { data: computeSemanticTokens(content) });
      } else {
        sendResponse(id, { data: [] });
      }
      break;
    }

    default:
      // Respond to unknown requests so the client doesn't hang
      if (id !== undefined) {
        sendResponse(id, null);
      }
      break;
  }
}

// ---------------------------------------------------------------------------
// stdin reader — Content-Length framed messages
// ---------------------------------------------------------------------------

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk: string) => {
  inputBuffer += chunk;

  while (true) {
    const sepIdx = inputBuffer.indexOf(HEADER_SEP);
    if (sepIdx === -1) break;

    const header = inputBuffer.slice(0, sepIdx);
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      // Malformed header — skip past the separator
      inputBuffer = inputBuffer.slice(sepIdx + HEADER_SEP.length);
      continue;
    }

    const contentLength = parseInt(match[1], 10);
    const bodyStart = sepIdx + HEADER_SEP.length;

    if (inputBuffer.length < bodyStart + contentLength) {
      break; // Wait for more data
    }

    const body = inputBuffer.slice(bodyStart, bodyStart + contentLength);
    inputBuffer = inputBuffer.slice(bodyStart + contentLength);

    try {
      handleMessage(JSON.parse(body));
    } catch {
      // Ignore malformed JSON
    }
  }
});

process.stdin.resume();
