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

  const wordAt = getWordAt(lineText, character);

  if (wordAt === "pure") {
    return {
      contents: [
        "### `pure` — function purity modifier",
        "",
        "Marks a function as **pure**. The transpiler enforces:",
        "- No `this` access",
        "- No mutation of outer-scope variables",
        "- Enables automatic inlining at `|>` call sites",
        "",
        "#### Before (Parabun)",
        "```typescript",
        "pure function add(a: number, b: number) {",
        "  return a + b;",
        "}",
        "const result = 10 |> add.bind(null, 5);",
        "```",
        "",
        "#### After (JavaScript)",
        "```javascript",
        "function add(a, b) {",
        "  return a + b;",
        "}",
        "const result = add(5, 10);",
        "```",
      ].join("\n"),
    };
  }

  const around = lineText.slice(Math.max(0, character - 3), character + 3);

  if (around.includes("..=")) {
    return {
      contents: [
        "### `..=` — await-assign operator",
        "",
        "Synchronously resolves already-settled promises without a microtask tick.",
        "Falls back to `await` for pending promises.",
        "",
        "#### Before (Parabun)",
        "```typescript",
        "const data ..= fetchUser(id);",
        "```",
        "",
        "#### After (JavaScript)",
        "```javascript",
        "var __ref = __parabunPeek(fetchUser(id));",
        "const data = __ref[0] ? __ref[1] : await __ref[1];",
        "```",
        "",
        "> Settled promises resolve **immediately** — no microtask delay.",
      ].join("\n"),
    };
  }
  if (around.includes("..!")) {
    return {
      contents: [
        "### `..!` — catch operator",
        "",
        "Attaches an error handler to a promise expression.",
        "",
        "#### Before (Parabun)",
        "```typescript",
        "const data = fetchUser(id) ..! (err) => fallback;",
        "```",
        "",
        "#### After (JavaScript)",
        "```javascript",
        "const data = fetchUser(id).catch((err) => fallback);",
        "```",
        "",
        "> Chainable: `expr ..! onError ..& onFinally`",
      ].join("\n"),
    };
  }
  if (around.includes("..&")) {
    return {
      contents: [
        "### `..&` — finally operator",
        "",
        "Attaches a cleanup handler that runs regardless of outcome.",
        "",
        "#### Before (Parabun)",
        "```typescript",
        "const result = fetchUser(id) ..& () => cleanup();",
        "```",
        "",
        "#### After (JavaScript)",
        "```javascript",
        "const result = fetchUser(id).finally(() => cleanup());",
        "```",
        "",
        "> Chainable: `expr ..! onError ..& onFinally`",
      ].join("\n"),
    };
  }
  if (around.includes("|>")) {
    return {
      contents: [
        "### `|>` — pipeline operator",
        "",
        "Pipes a value through a function. Chains read left-to-right.",
        "",
        "#### Before (Parabun)",
        "```typescript",
        "const result = data |> transform |> validate |> save;",
        "```",
        "",
        "#### After (JavaScript)",
        "```javascript",
        "const result = save(validate(transform(data)));",
        "```",
        "",
        "> With `pure` functions, the pipeline is **inlined** — zero call overhead.",
      ].join("\n"),
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
// Code Actions — refactoring suggestions
// ---------------------------------------------------------------------------

interface TextEdit {
  range: Range;
  newText: string;
}

interface CodeAction {
  title: string;
  kind: string;
  edit?: { changes: Record<string, TextEdit[]> };
}

function getCodeActions(uri: string, content: string, range: Range): CodeAction[] {
  const actions: CodeAction[] = [];
  const lines = content.split("\n");
  const startLine = range.start.line;
  const endLine = Math.min(range.end.line, lines.length - 1);

  for (let i = startLine; i <= endLine; i++) {
    const line = lines[i];

    // "Convert await to ..=" — find `await expr` patterns
    const awaitMatch = line.match(/\bawait\s+/);
    if (awaitMatch && awaitMatch.index !== undefined) {
      const col = awaitMatch.index;
      const prefix = line.slice(0, col);
      const assignMatch = prefix.match(/(const|let|var)\s+(\w+)\s*=\s*$/);
      if (assignMatch) {
        const keyword = assignMatch[1];
        const varName = assignMatch[2];
        const exprStart = col + awaitMatch[0].length;
        const expr = line.slice(exprStart).replace(/;?\s*$/, "");
        const lineStart = col - assignMatch[0].length;
        actions.push({
          title: `Convert to ${keyword} ${varName} ..= ${expr}`,
          kind: "refactor.rewrite",
          edit: {
            changes: {
              [uri]: [
                {
                  range: {
                    start: { line: i, character: lineStart },
                    end: { line: i, character: line.length },
                  },
                  newText: `${keyword} ${varName} ..= ${expr};`,
                },
              ],
            },
          },
        });
      }
    }

    // "Wrap in ..! catch" — find `.catch(` patterns
    const catchMatch = line.match(/\.catch\(([^)]+)\)/);
    if (catchMatch && catchMatch.index !== undefined) {
      const before = line.slice(0, catchMatch.index);
      const handler = catchMatch[1];
      const afterEnd = catchMatch.index + catchMatch[0].length;
      const after = line.slice(afterEnd);
      actions.push({
        title: "Convert .catch() to ..! operator",
        kind: "refactor.rewrite",
        edit: {
          changes: {
            [uri]: [
              {
                range: {
                  start: { line: i, character: 0 },
                  end: { line: i, character: line.length },
                },
                newText: `${before} ..! ${handler}${after}`,
              },
            ],
          },
        },
      });
    }

    // "Wrap in ..& finally" — find `.finally(` patterns
    const finallyMatch = line.match(/\.finally\(([^)]+)\)/);
    if (finallyMatch && finallyMatch.index !== undefined) {
      const before = line.slice(0, finallyMatch.index);
      const handler = finallyMatch[1];
      const afterEnd = finallyMatch.index + finallyMatch[0].length;
      const after = line.slice(afterEnd);
      actions.push({
        title: "Convert .finally() to ..& operator",
        kind: "refactor.rewrite",
        edit: {
          changes: {
            [uri]: [
              {
                range: {
                  start: { line: i, character: 0 },
                  end: { line: i, character: line.length },
                },
                newText: `${before} ..& ${handler}${after}`,
              },
            ],
          },
        },
      });
    }

    // "Add pure" — find function declarations without pure
    const fnMatch = line.match(/^(\s*)(export\s+)?(async\s+)?function\b/);
    if (fnMatch && !line.match(/\bpure\s/) && fnMatch.index !== undefined) {
      const indent = fnMatch[1] || "";
      const exportKw = fnMatch[2] || "";
      const insertCol = indent.length + exportKw.length;
      actions.push({
        title: "Add pure modifier",
        kind: "refactor.rewrite",
        edit: {
          changes: {
            [uri]: [
              {
                range: {
                  start: { line: i, character: insertCol },
                  end: { line: i, character: insertCol },
                },
                newText: "pure ",
              },
            ],
          },
        },
      });
    }

    // "Convert f(x) to x |> f" — simple single-arg call
    const callMatch = line.match(/\b([a-zA-Z_$]\w*)\(([a-zA-Z_$]\w*)\)/);
    if (callMatch && callMatch.index !== undefined) {
      const fnName = callMatch[1];
      const argName = callMatch[2];
      if (!["if", "for", "while", "switch", "return", "catch", "typeof", "require", "import"].includes(fnName)) {
        actions.push({
          title: `Convert ${fnName}(${argName}) to ${argName} |> ${fnName}`,
          kind: "refactor.rewrite",
          edit: {
            changes: {
              [uri]: [
                {
                  range: {
                    start: { line: i, character: callMatch.index },
                    end: { line: i, character: callMatch.index + callMatch[0].length },
                  },
                  newText: `${argName} |> ${fnName}`,
                },
              ],
            },
          },
        });
      }
    }
  }

  return actions;
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
          codeActionProvider: {
            codeActionKinds: ["refactor.rewrite"],
          },
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

    case "textDocument/codeAction": {
      const uri = params.textDocument.uri;
      const content = documents.get(uri);
      if (content) {
        sendResponse(id, getCodeActions(uri, content, params.range));
      } else {
        sendResponse(id, []);
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
