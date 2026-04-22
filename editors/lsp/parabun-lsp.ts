#!/usr/bin/env parabun
/**
 * Parabun Language Server
 *
 * Provides full TypeScript-level language features (hover, diagnostics,
 * completions, go-to-definition) for .pts/.ptsx/.pjs/.pjsx files by
 * embedding TypeScript's language service and transparently desugaring
 * Parabun syntax before the type checker sees it.
 *
 * Also provides Parabun-specific features: operator hover docs, code
 * actions, semantic tokens for `pure`, and Bun.Transpiler parse errors.
 *
 * Usage:  parabun run parabun-lsp.ts --stdio
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

function publishDiagnostics(uri: string, diagnostics: LspDiagnostic[]) {
  sendNotification("textDocument/publishDiagnostics", { uri, diagnostics });
}

function logMessage(type: number, message: string) {
  sendNotification("window/logMessage", { type, message });
}

// ---------------------------------------------------------------------------
// LSP types (minimal subset)
// ---------------------------------------------------------------------------

interface LspDiagnostic {
  range: LspRange;
  severity: number;
  source: string;
  message: string;
  code?: string;
}

interface LspRange {
  start: LspPosition;
  end: LspPosition;
}

interface LspPosition {
  line: number;
  character: number;
}

// ---------------------------------------------------------------------------
// Parabun → TypeScript transform (inlined from ts-plugin/transform.ts)
// ---------------------------------------------------------------------------

const PARABUN_SYNTAX_RE = /\bpure\s|\bfun\b|\.\.=|\.\.!|\.\.&|\|>/;

function containsParabunSyntax(text: string): boolean {
  return PARABUN_SYNTAX_RE.test(text);
}

function transformParabunToTS(source: string): string {
  if (!containsParabunSyntax(source)) return source;
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    lines[i] = transformLine(lines[i]);
  }
  let result = lines.join("\n");
  result = transformMultilinePipeline(result);
  return result;
}

function transformLine(line: string): string {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("//") || trimmed.startsWith("/*")) return line;
  line = expandFun(line);
  line = stripPure(line);
  line = transformAwaitAssign(line);
  line = transformCatchFinally(line);
  line = transformPipeline(line);
  return line;
}

function expandFun(line: string): string {
  return line.replace(/(?<!\.)(\bfun)\b(?=\s*[a-zA-Z_$*(<])/g, "function");
}

function stripPure(line: string): string {
  return line.replace(
    /\bpure(\s+)(?=function\b|async\s+function\b|<[\w\s,=]+>\s*\(|\(|\w+\s*=>)/g,
    (_m, space) => "    " + space,
  );
}

function transformAwaitAssign(line: string): string {
  return line.replace(/(\.\.)=(\s*)/g, (_m, _dots, space) => `= await${space.length > 0 ? space : " "}`);
}

function transformCatchFinally(line: string): string {
  line = line.replace(/\s*\.\.&\s*(.+?)(?=\s*;|\s*$)/g, (_m, handler) => `.finally(${handler.trim()})`);
  line = line.replace(/\s*\.\.!\s*(.+?)(?=\.finally\(|\s*;|\s*$)/g, (_m, handler) => `.catch(${handler.trim()})`);
  return line;
}

function transformPipeline(line: string): string {
  if (!line.includes("|>")) return line;
  return line.replace(
    /((?:=|return|=>)\s*)(.+?\|>.+?)(?=\s*;|\s*$)/g,
    (_m, prefix, pipeline) => prefix + collapsePipeline(pipeline),
  );
}

function collapsePipeline(expr: string): string {
  const parts = splitPipeline(expr);
  if (parts.length <= 1) return expr;
  let result = parts[0].trim();
  for (let i = 1; i < parts.length; i++) {
    result = `${parts[i].trim()}(${result})`;
  }
  return result;
}

function splitPipeline(expr: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
      current += ch;
    } else if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      current += ch;
    } else if (depth === 0 && ch === "|" && expr[i + 1] === ">") {
      parts.push(current);
      current = "";
      i++;
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);
  return parts;
}

function transformMultilinePipeline(source: string): string {
  if (!source.includes("|>")) return source;
  const lines = source.split("\n");
  const joined: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();
    if (trimmed.startsWith("|>") && joined.length > 0) {
      joined[joined.length - 1] += " " + trimmed;
    } else {
      joined.push(lines[i]);
    }
  }
  for (let i = 0; i < joined.length; i++) {
    if (joined[i].includes("|>")) {
      joined[i] = transformPipeline(joined[i]);
    }
  }
  return joined.join("\n");
}

// ---------------------------------------------------------------------------
// Transpiler instances (for Parabun-specific parse diagnostics)
// ---------------------------------------------------------------------------

const transpilers = {
  ts: new Bun.Transpiler({ loader: "ts" }),
  tsx: new Bun.Transpiler({ loader: "tsx" }),
  js: new Bun.Transpiler({ loader: "jsx" }),
};

function loaderForUri(uri: string): "ts" | "tsx" | "js" {
  if (uri.endsWith(".pts") || uri.endsWith(".ts")) return "ts";
  if (uri.endsWith(".ptsx") || uri.endsWith(".tsx")) return "tsx";
  return "js";
}

// ---------------------------------------------------------------------------
// Document store
// ---------------------------------------------------------------------------

const documents = new Map<string, string>();
const docVersions = new Map<string, number>();

// ---------------------------------------------------------------------------
// TypeScript language service
// ---------------------------------------------------------------------------

let ts: typeof import("typescript") | undefined;
let tsService: import("typescript").LanguageService | undefined;
let workspaceRoot = "";

function uriToPath(uri: string): string {
  if (uri.startsWith("file://")) {
    return decodeURIComponent(uri.slice(7));
  }
  return uri;
}

function pathToUri(filePath: string): string {
  return "file://" + encodeURI(filePath).replace(/#/g, "%23");
}

/** Get document content: prefer open document, fall back to disk */
function getDocContent(uri: string): string | undefined {
  const content = documents.get(uri);
  if (content !== undefined) return content;
  try {
    const filePath = uriToPath(uri);
    const text = require("fs").readFileSync(filePath, "utf8") as string;
    // Cache it so subsequent requests within the same session work
    documents.set(uri, text);
    docVersions.set(uri, 1);
    return text;
  } catch {
    return undefined;
  }
}

// TypeScript rejects files with unknown extensions. Present .pts/.ptsx
// files as .ts/.tsx so the language service will process them.
function toTsPath(filePath: string): string {
  if (filePath.endsWith(".pts")) return filePath.slice(0, -4) + ".ts";
  if (filePath.endsWith(".ptsx")) return filePath.slice(0, -5) + ".tsx";
  if (filePath.endsWith(".pjs")) return filePath.slice(0, -4) + ".js";
  if (filePath.endsWith(".pjsx")) return filePath.slice(0, -5) + ".jsx";
  return filePath;
}

function fromTsPath(tsPath: string): string {
  const fs = require("fs");
  // Check if the original .pts/.ptsx/.pjs/.pjsx exists for this virtual path
  const extMap: [string, string][] = [
    [".ts", ".pts"],
    [".tsx", ".ptsx"],
    [".js", ".pjs"],
    [".jsx", ".pjsx"],
  ];
  for (const [tsExt, pbExt] of extMap) {
    if (tsPath.endsWith(tsExt) && !tsPath.endsWith(".d.ts")) {
      const pbPath = tsPath.slice(0, -tsExt.length) + pbExt;
      if (documents.has(pathToUri(pbPath))) return pbPath;
      try {
        if (fs.statSync(pbPath).isFile()) return pbPath;
      } catch {}
    }
  }
  return tsPath;
}

function initTypeScriptService() {
  if (!workspaceRoot) return;

  try {
    const tsPath = require.resolve("typescript", {
      paths: [workspaceRoot],
    });
    ts = require(tsPath);
  } catch {
    try {
      ts = require("typescript");
    } catch {
      logMessage(
        2,
        "[parabun-lsp] TypeScript not found — type features disabled. Install typescript in your workspace.",
      );
      return;
    }
  }

  logMessage(3, `[parabun-lsp] TypeScript ${ts!.version} loaded`);

  let compilerOptions: import("typescript").CompilerOptions = {
    target: ts!.ScriptTarget.ESNext,
    module: ts!.ModuleKind.ESNext,
    moduleResolution: ts!.ModuleResolutionKind.Bundler,
    strict: true,
    esModuleInterop: true,
    jsx: ts!.JsxEmit.ReactJSX,
    noEmit: true,
    skipLibCheck: true,
    allowJs: true,
  };

  const configPath = ts!.findConfigFile(workspaceRoot, ts!.sys.fileExists);
  if (configPath) {
    const configFile = ts!.readConfigFile(configPath, ts!.sys.readFile);
    if (!configFile.error) {
      const parsed = ts!.parseJsonConfigFileContent(configFile.config, ts!.sys, workspaceRoot);
      compilerOptions = { ...parsed.options, noEmit: true, skipLibCheck: true };
      logMessage(3, `[parabun-lsp] Using tsconfig: ${configPath}`);
    }
  }

  const host: import("typescript").LanguageServiceHost = {
    getScriptFileNames() {
      // Present .pts/.ptsx as .ts/.tsx so TypeScript accepts them
      return [...documents.keys()].map(uri => toTsPath(uriToPath(uri)));
    },
    getScriptVersion(fileName) {
      // Map back to original URI for version lookup
      const realPath = fromTsPath(fileName);
      const uri = pathToUri(realPath);
      const v = docVersions.get(uri);
      return v !== undefined ? String(v) : "0";
    },
    getScriptSnapshot(fileName) {
      // Check if this is a virtual .ts path for an open .pts document
      const realPath = fromTsPath(fileName);
      const uri = pathToUri(realPath);
      const content = documents.get(uri);
      if (content !== undefined) {
        return ts!.ScriptSnapshot.fromString(transformParabunToTS(content));
      }
      // Try direct path on disk
      if (ts!.sys.fileExists(realPath)) {
        const text = ts!.sys.readFile(realPath)!;
        const isParabun = /\.p(?:ts|tsx|js|jsx)$/.test(realPath);
        return ts!.ScriptSnapshot.fromString(isParabun ? transformParabunToTS(text) : text);
      }
      // Try the fileName as-is (for lib files, node_modules, etc.)
      if (realPath !== fileName && ts!.sys.fileExists(fileName)) {
        return ts!.ScriptSnapshot.fromString(ts!.sys.readFile(fileName)!);
      }
      // Fall back to .pts/.ptsx/.pjs/.pjsx on disk when TS asks for .ts/.tsx/.js/.jsx
      const pbFallbacks: [string, string][] = [
        [".ts", ".pts"],
        [".tsx", ".ptsx"],
        [".js", ".pjs"],
        [".jsx", ".pjsx"],
      ];
      for (const [tsExt, pbExt] of pbFallbacks) {
        if (fileName.endsWith(tsExt)) {
          const pbPath = fileName.slice(0, -tsExt.length) + pbExt;
          if (ts!.sys.fileExists(pbPath)) {
            return ts!.ScriptSnapshot.fromString(transformParabunToTS(ts!.sys.readFile(pbPath)!));
          }
        }
      }
      return undefined;
    },
    getCompilationSettings: () => compilerOptions,
    getDefaultLibFileName: opts => ts!.getDefaultLibFilePath(opts),
    getCurrentDirectory: () => workspaceRoot,
    fileExists(path) {
      if (ts!.sys.fileExists(path)) return true;
      const pbMap: [string, string][] = [
        [".ts", ".pts"],
        [".tsx", ".ptsx"],
        [".js", ".pjs"],
        [".jsx", ".pjsx"],
      ];
      for (const [tsExt, pbExt] of pbMap) {
        if (path.endsWith(tsExt) && ts!.sys.fileExists(path.slice(0, -tsExt.length) + pbExt)) return true;
      }
      return false;
    },
    readFile: path => ts!.sys.readFile(path),
    readDirectory: (...args: any[]) => (ts!.sys.readDirectory as any)(...args),
    getDirectories: path => ts!.sys.getDirectories(path),
    resolveModuleNameLiterals(moduleLiterals, containingFile, _redirectedRef, options) {
      const parabunSys: import("typescript").System = {
        ...ts!.sys,
        fileExists(path: string): boolean {
          if (ts!.sys.fileExists(path)) return true;
          const pbMap: [string, string][] = [
            [".ts", ".pts"],
            [".tsx", ".ptsx"],
            [".js", ".pjs"],
            [".jsx", ".pjsx"],
          ];
          for (const [tsExt, pbExt] of pbMap) {
            if (path.endsWith(tsExt) && ts!.sys.fileExists(path.slice(0, -tsExt.length) + pbExt)) return true;
          }
          return false;
        },
      };
      return moduleLiterals.map(literal => {
        const name = literal.text;
        return ts!.resolveModuleName(name, containingFile, options, parabunSys);
      });
    },
  };

  tsService = ts!.createLanguageService(host, ts!.createDocumentRegistry());
  logMessage(3, "[parabun-lsp] TypeScript language service initialized");
}

// ---------------------------------------------------------------------------
// Position utilities
// ---------------------------------------------------------------------------

function offsetToPosition(content: string, offset: number): LspPosition {
  let line = 0;
  let character = 0;
  for (let i = 0; i < offset && i < content.length; i++) {
    if (content[i] === "\n") {
      line++;
      character = 0;
    } else {
      character++;
    }
  }
  return { line, character };
}

function positionToOffset(content: string, line: number, character: number): number {
  let currentLine = 0;
  let offset = 0;
  while (offset < content.length && currentLine < line) {
    if (content[offset] === "\n") currentLine++;
    offset++;
  }
  return offset + character;
}

function mapPositionToTransformed(
  original: string,
  transformed: string,
  line: number,
  character: number,
): { line: number; character: number } {
  const origLines = original.split("\n");
  const transLines = transformed.split("\n");

  if (origLines.length === transLines.length) {
    if (line >= origLines.length) return { line, character };
    const origLine = origLines[line];
    const transLine = transLines[line];
    if (origLine === transLine) return { line, character };
    return { line, character: mapCharInLine(origLine, transLine, character) };
  }

  const origOffset = positionToOffset(original, line, character);
  const ratio = transformed.length > 0 ? origOffset / original.length : 0;
  const transOffset = Math.min(Math.round(ratio * transformed.length), transformed.length);
  return offsetToPosition(transformed, transOffset);
}

function mapCharInLine(origLine: string, transLine: string, col: number): number {
  if (col >= origLine.length) return Math.min(col, transLine.length);

  let wStart = col;
  let wEnd = col;
  while (wStart > 0 && /\w/.test(origLine[wStart - 1])) wStart--;
  while (wEnd < origLine.length && /\w/.test(origLine[wEnd])) wEnd++;
  const word = origLine.slice(wStart, wEnd);

  if (!word) return Math.min(col, transLine.length);

  const searchStart = Math.max(0, wStart - 20);
  const idx = transLine.indexOf(word, searchStart);
  if (idx !== -1) return idx + (col - wStart);

  return Math.min(col, transLine.length);
}

function mapPositionFromTransformed(
  original: string,
  transformed: string,
  line: number,
  character: number,
): LspPosition {
  const origLines = original.split("\n");
  const transLines = transformed.split("\n");

  if (origLines.length === transLines.length && line < transLines.length) {
    const origLine = origLines[line];
    const transLine = transLines[line];
    if (origLine === transLine) return { line, character };
    return {
      line,
      character: mapCharInLine(transLine, origLine, character),
    };
  }

  const transOffset = positionToOffset(transformed, line, character);
  const ratio = transformed.length > 0 ? transOffset / transformed.length : 0;
  const origOffset = Math.min(Math.round(ratio * original.length), original.length);
  return offsetToPosition(original, origOffset);
}

// ---------------------------------------------------------------------------
// Validation — combined Bun transpiler + TypeScript diagnostics
// ---------------------------------------------------------------------------

function validate(uri: string, content: string) {
  const diagnostics: LspDiagnostic[] = [];

  // Bun transpiler diagnostics (Parabun parse errors)
  const loader = loaderForUri(uri);
  const transpiler = transpilers[loader];
  try {
    transpiler.transformSync(transformParabunToTS(content));
  } catch (e: any) {
    const pos = e?.position;
    const message: string = e?.message ?? String(e);
    const level: string = e?.level ?? "error";
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

  // TypeScript diagnostics
  if (tsService && ts) {
    const fileName = toTsPath(uriToPath(uri));
    const transformed = transformParabunToTS(content);

    try {
      const semanticDiags = tsService.getSemanticDiagnostics(fileName);
      const syntacticDiags = tsService.getSyntacticDiagnostics(fileName);

      for (const diag of [...syntacticDiags, ...semanticDiags]) {
        if (diag.start === undefined || diag.length === undefined) continue;

        const startPos = offsetToPosition(transformed, diag.start);
        const endPos = offsetToPosition(transformed, diag.start + diag.length);

        const origStart = mapPositionFromTransformed(content, transformed, startPos.line, startPos.character);
        const origEnd = mapPositionFromTransformed(content, transformed, endPos.line, endPos.character);

        const message = ts.flattenDiagnosticMessageText(diag.messageText, "\n");

        // Skip false positives from the transform (..= → await in non-async)
        if (message.includes("'await' expressions are only allowed")) continue;

        diagnostics.push({
          range: { start: origStart, end: origEnd },
          severity:
            diag.category === ts.DiagnosticCategory.Error ? 1 : diag.category === ts.DiagnosticCategory.Warning ? 2 : 3,
          source: "ts",
          message: `TS${diag.code}: ${message}`,
        });
      }
    } catch (e: any) {
      logMessage(2, `[parabun-lsp] TS diagnostics error: ${e?.message ?? e}`);
    }
  }

  // Pure-eligibility hints
  const pureHints = findPureEligibleHints(content);
  diagnostics.push(...pureHints);

  // Purity violation errors for functions already marked pure
  const pureViolations = findPureViolations(uri, content);
  diagnostics.push(...pureViolations);

  publishDiagnostics(uri, diagnostics);
}

const PURE_HINT_CODE = "parabun-pure-eligible";

function findPureEligibleHints(content: string): LspDiagnostic[] {
  const hints: LspDiagnostic[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\bpure\s/.test(line)) continue;

    const fnMatch = line.match(/^(\s*(?:export\s+)?(?:async\s+)?)(fun(?:ction)?)\b/);
    if (!fnMatch || fnMatch.index === undefined) continue;

    const sigAndBody = extractFunctionSignatureAndBody(lines, i);
    if (sigAndBody === null) continue;

    if (bodyHasSideEffects(sigAndBody.params, sigAndBody.body)) continue;

    const kwStart = fnMatch[1].length;
    const kwEnd = kwStart + fnMatch[2].length;
    hints.push({
      range: {
        start: { line: i, character: kwStart },
        end: { line: i, character: kwEnd },
      },
      severity: 4,
      source: "parabun",
      message: "Function could be marked pure",
      code: PURE_HINT_CODE,
    });
  }

  return hints;
}

function extractFunctionSignatureAndBody(lines: string[], fnLine: number): { params: string[]; body: string } | null {
  let braceDepth = 0;
  let started = false;
  const bodyParts: string[] = [];

  // Extract param names from the signature line(s)
  const sigText = lines.slice(fnLine, Math.min(fnLine + 5, lines.length)).join(" ");
  const paramMatch = sigText.match(/\(([^)]*)\)/);
  const params: string[] = [];
  if (paramMatch) {
    for (const p of paramMatch[1].split(",")) {
      const name = p
        .replace(/[:=].*/s, "")
        .replace(/\.\.\./g, "")
        .trim();
      if (name && /^\w+$/.test(name)) params.push(name);
    }
  }

  for (let i = fnLine; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === "{") {
        if (!started) started = true;
        braceDepth++;
      } else if (ch === "}") {
        braceDepth--;
        if (started && braceDepth === 0) {
          return { params, body: bodyParts.join("") };
        }
      }
      if (started && braceDepth >= 1) {
        bodyParts.push(ch);
      }
    }
    if (started) bodyParts.push("\n");
  }

  return null;
}

function bodyHasSideEffects(params: string[], body: string): boolean {
  if (/\bthis\b/.test(body) || /\barguments\b/.test(body)) return true;

  const locals = collectLocals(params, body);
  const paramSet = new Set<string>(params);

  const assignRe = /\b(\w+)\s*(?:=[^=>]|[+\-*/%&|^]={1,2}|\+\+|--)/g;
  let m: RegExpExecArray | null;
  while ((m = assignRe.exec(body)) !== null) {
    if (!locals.has(m[1]) && !JS_KEYWORDS.test(m[1])) return true;
  }

  const prefixRe = /(?:\+\+|--)(\w+)/g;
  while ((m = prefixRe.exec(body)) !== null) {
    if (!locals.has(m[1])) return true;
  }

  // Parameter property/index mutation
  const propAssignRe = /\b(\w+)(\.[a-zA-Z_$]\w*|\[[^\]]*\])\s*(?:=[^=>]|[+\-*/%&|^]={1,2})/g;
  while ((m = propAssignRe.exec(body)) !== null) {
    if (paramSet.has(m[1])) return true;
  }

  // Mutating method calls on parameters
  const mutMethodRe =
    /\b(\w+)(?:\.[a-zA-Z_$]\w*)*\.(push|pop|shift|unshift|splice|sort|reverse|fill|copyWithin|set|delete|clear|add)\s*\(/g;
  while ((m = mutMethodRe.exec(body)) !== null) {
    if (paramSet.has(m[1])) return true;
  }

  return false;
}

function pureDiag(line: number, col: number, len: number, severity: number, message: string): LspDiagnostic {
  return {
    range: { start: { line, character: col }, end: { line, character: col + len } },
    severity,
    source: "parabun",
    message,
  };
}

const PURE_SAFE_CALLS = new Set([
  "Math",
  "JSON",
  "Object",
  "Array",
  "String",
  "Number",
  "Boolean",
  "BigInt",
  "Symbol",
  "parseInt",
  "parseFloat",
  "isNaN",
  "isFinite",
  "encodeURI",
  "encodeURIComponent",
  "decodeURI",
  "decodeURIComponent",
  "structuredClone",
  "atob",
  "btoa",
  "Intl",
  "Reflect",
  "Error",
  "TypeError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "Int8Array",
  "Uint8Array",
  "Uint8ClampedArray",
  "Int16Array",
  "Uint16Array",
  "Int32Array",
  "Uint32Array",
  "Float32Array",
  "Float64Array",
  "BigInt64Array",
  "BigUint64Array",
  "ArrayBuffer",
  "DataView",
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",
  "RegExp",
  "Promise",
]);

function findPureViolations(uri: string, content: string): LspDiagnostic[] {
  const diagnostics: LspDiagnostic[] = [];
  const lines = content.split("\n");

  // Collect all pure function names (same-file + imports)
  const allPureFns = getAllPureFns(uri, content);

  // Collect impure same-file function names
  const impureFns = new Set<string>();
  for (const line of lines) {
    const pureFnMatch = line.match(/\bpure\s+(?:async\s+)?fun(?:ction)?\s+(\w+)/);
    if (pureFnMatch) continue; // already in allPureFns
    const fnMatch = line.match(/(?:^|export\s+)(?:async\s+)?fun(?:ction)?\s+(\w+)/);
    if (fnMatch) impureFns.add(fnMatch[1]);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const pureMatch = line.match(/^(\s*(?:export\s+)?)(pure)\s+(?:async\s+)?fun(?:ction)?\b/);
    if (!pureMatch || pureMatch.index === undefined) continue;

    const sigAndBody = extractFunctionSignatureAndBody(lines, i);
    if (!sigAndBody) continue;

    const { params, body } = sigAndBody;
    const locals = collectLocals(params, body);

    // Find the body start line (first { after the function line)
    let bodyStartLine = i;
    for (let j = i; j < lines.length; j++) {
      if (lines[j].includes("{")) {
        bodyStartLine = j;
        break;
      }
    }

    const paramSet = new Set<string>(params);
    const bodyLines = body.split("\n");
    for (let b = 0; b < bodyLines.length; b++) {
      const bline = bodyLines[b];
      const lineIdx = bodyStartLine + b;
      let m: RegExpExecArray | null;

      // --- Level 1: this / arguments ---

      const thisRe = /\bthis\b/g;
      while ((m = thisRe.exec(bline)) !== null) {
        diagnostics.push(pureDiag(lineIdx, m.index, 4, 1, 'Cannot use "this" inside a pure function'));
      }

      const argsRe = /\barguments\b/g;
      while ((m = argsRe.exec(bline)) !== null) {
        diagnostics.push(pureDiag(lineIdx, m.index, 9, 1, 'Cannot use "arguments" inside a pure function'));
      }

      // --- Level 1: assignment to non-local ---

      const assignRe = /\b(\w+)\s*(?:=[^=>]|[+\-*/%&|^]={1,2}|\+\+|--)/g;
      while ((m = assignRe.exec(bline)) !== null) {
        const name = m[1];
        if (!locals.has(name) && !JS_KEYWORDS.test(name)) {
          diagnostics.push(
            pureDiag(lineIdx, m.index, name.length, 1, `Cannot modify outer variable "${name}" inside a pure function`),
          );
        }
      }

      const prefixRe = /(\+\+|--)(\w+)/g;
      while ((m = prefixRe.exec(bline)) !== null) {
        const name = m[2];
        if (!locals.has(name) && !JS_KEYWORDS.test(name)) {
          diagnostics.push(
            pureDiag(
              lineIdx,
              m.index + m[1].length,
              name.length,
              1,
              `Cannot modify outer variable "${name}" inside a pure function`,
            ),
          );
        }
      }

      // --- Level 2: parameter property/index mutation ---

      const propAssignRe = /\b(\w+)(\.[a-zA-Z_$]\w*|\[[^\]]*\])\s*(?:=[^=>]|[+\-*/%&|^]={1,2})/g;
      while ((m = propAssignRe.exec(bline)) !== null) {
        if (paramSet.has(m[1])) {
          diagnostics.push(
            pureDiag(
              lineIdx,
              m.index,
              m[0].trimEnd().length - 1,
              1,
              `Cannot mutate parameter "${m[1]}" inside a pure function`,
            ),
          );
        }
      }

      const mutMethodRe =
        /\b(\w+)(?:\.[a-zA-Z_$]\w*)*\.(push|pop|shift|unshift|splice|sort|reverse|fill|copyWithin|set|delete|clear|add)\s*\(/g;
      while ((m = mutMethodRe.exec(bline)) !== null) {
        const root = m[1];
        if (paramSet.has(root)) {
          diagnostics.push(
            pureDiag(
              lineIdx,
              m.index,
              m[0].length - 1,
              1,
              `Cannot call mutating method ".${m[2]}()" on parameter "${root}" inside a pure function`,
            ),
          );
        }
      }

      // --- Level 3 hints: non-deterministic / I/O (warning, not error) ---

      const nonDetRe = /\b(Math\.random|Date\.now|performance\.now|crypto\.randomUUID|crypto\.getRandomValues)\s*\(/g;
      while ((m = nonDetRe.exec(bline)) !== null) {
        diagnostics.push(
          pureDiag(
            lineIdx,
            m.index,
            m[1].length,
            2,
            `"${m[1]}()" is non-deterministic — breaks referential transparency in pure function`,
          ),
        );
      }

      const ioRe =
        /\b(console)\s*\.\s*(log|warn|error|info|debug|trace|dir|table|time|timeEnd|assert|count|group|groupEnd)\s*\(/g;
      while ((m = ioRe.exec(bline)) !== null) {
        const call = `${m[1]}.${m[2]}`;
        diagnostics.push(
          pureDiag(
            lineIdx,
            m.index,
            call.length,
            2,
            `"${call}()" performs I/O — breaks referential transparency in pure function`,
          ),
        );
      }

      const fetchRe = /\b(fetch)\s*\(/g;
      while ((m = fetchRe.exec(bline)) !== null) {
        diagnostics.push(
          pureDiag(lineIdx, m.index, 5, 2, `"fetch()" performs I/O — breaks referential transparency in pure function`),
        );
      }

      const newDateRe = /\bnew\s+(Date)\s*\(/g;
      while ((m = newDateRe.exec(bline)) !== null) {
        diagnostics.push(
          pureDiag(
            lineIdx,
            m.index,
            m[0].length - 1,
            2,
            `"new Date()" is non-deterministic — breaks referential transparency in pure function`,
          ),
        );
      }

      // --- Calls to known-impure same-file functions ---

      const callRe = /\b(\w+)\s*\(/g;
      while ((m = callRe.exec(bline)) !== null) {
        const name = m[1];
        if (impureFns.has(name) && !allPureFns.has(name) && !locals.has(name) && !JS_KEYWORDS.test(name)) {
          diagnostics.push(
            pureDiag(lineIdx, m.index, name.length, 1, `Calling non-pure function "${name}()" inside a pure function`),
          );
        }
      }
    }
  }

  return diagnostics;
}

const JS_KEYWORDS =
  /^(?:const|let|var|return|if|else|for|while|switch|case|break|continue|throw|new|typeof|void|delete|in|of|do|try|catch|finally|import|export|default|class|function|fun|async|await|yield|true|false|null|undefined)$/;

function collectLocals(params: string[], body: string): Set<string> {
  const locals = new Set<string>(params);
  let m: RegExpExecArray | null;
  const declRe = /\b(?:const|let|var)\s+(?:(\w+)|[{[]).*?(?:=|;|\n)/g;
  while ((m = declRe.exec(body)) !== null) {
    if (m[1]) locals.add(m[1]);
  }
  const fnDeclRe = /\b(?:function|fun|class)\s+(\w+)/g;
  while ((m = fnDeclRe.exec(body)) !== null) {
    if (m[1]) locals.add(m[1]);
  }
  const forRe = /\bfor\s*\(\s*(?:const|let|var)\s+(?:(\w+)|[\[{])/g;
  while ((m = forRe.exec(body)) !== null) {
    if (m[1]) locals.add(m[1]);
  }
  return locals;
}

// ---------------------------------------------------------------------------
// Cross-file pure function resolution
// ---------------------------------------------------------------------------

// Cache of pure function names per file path (absolute)
const pureFnCache = new Map<string, { mtime: number; fns: Set<string> }>();

function scanFileForPureFns(filePath: string): Set<string> {
  try {
    const stat = Bun.file(filePath);
    const mtime = stat.lastModified;
    const cached = pureFnCache.get(filePath);
    if (cached && cached.mtime === mtime) return cached.fns;

    const text = require("fs").readFileSync(filePath, "utf8") as string;
    const fns = collectPureFnNames(text);
    pureFnCache.set(filePath, { mtime, fns });
    return fns;
  } catch {
    return new Set();
  }
}

function collectPureFnNames(content: string): Set<string> {
  const fns = new Set<string>();

  // Named declaration: pure function foo / pure async fun foo / export pure function foo
  const declRe = /\bpure\s+(?:async\s+)?fun(?:ction)?\s+(\w+)/g;
  for (const m of content.matchAll(declRe)) fns.add(m[1]);

  // Expression form: const foo = pure (...) / const foo = pure <T>(...)
  // Also tolerates a multi-line generic-parameter block between `=` and `pure`
  // (e.g. `const foo = <T, U extends ...> pure (...) => ...`), which breaks
  // a per-line regex. The `<[^=]*?>` is deliberately non-greedy and excludes
  // `=` so a subsequent `const bar = ...` on a later line can't be consumed
  // as if it were the closing angle bracket's content. Angle-bracket generics
  // in type bounds (e.g. `Extract<keyof T, ...>`) are allowed via `[\s\S]`.
  const exprRe = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:<[\s\S]*?>\s*)?pure[\s<(]/g;
  for (const m of content.matchAll(exprRe)) fns.add(m[1]);

  return fns;
}

function resolveImportPath(importSpec: string, fromUri: string): string | null {
  const fromPath = uriToPath(fromUri);
  const dir = fromPath.replace(/\/[^/]+$/, "");

  if (!importSpec.startsWith(".")) return null; // skip bare specifiers

  const base = dir + "/" + importSpec;
  const candidates = [
    base + ".pts",
    base + ".ptsx",
    base + ".pjs",
    base + ".pjsx",
    base + ".ts",
    base + ".tsx",
    base + ".js",
    base + ".jsx",
    base,
    base + "/index.pts",
    base + "/index.ts",
    base + "/index.js",
  ];

  const fs = require("fs");
  for (const c of candidates) {
    try {
      if (fs.statSync(c).isFile()) return c;
    } catch {}
  }
  return null;
}

/** Resolve all imported pure function names for a given file */
function getImportedPureFns(uri: string, content: string): Set<string> {
  const result = new Set<string>();
  const importRe = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(content)) !== null) {
    const specifiers = m[1];
    const modulePath = m[2];
    const resolved = resolveImportPath(modulePath, uri);
    if (!resolved) continue;

    const pureFns = scanFileForPureFns(resolved);
    if (pureFns.size === 0) continue;

    for (const spec of specifiers.split(",")) {
      const name = spec.replace(/\s+as\s+\w+/, "").trim();
      const alias = spec.includes(" as ") ? spec.replace(/.*\s+as\s+/, "").trim() : name;
      if (pureFns.has(name)) result.add(alias);
    }
  }
  return result;
}

/** Get all pure function names visible in a file (same-file + imports) */
function getAllPureFns(uri: string, content: string): Set<string> {
  const local = collectPureFnNames(content);
  const imported = getImportedPureFns(uri, content);
  for (const name of imported) local.add(name);
  return local;
}

// ---------------------------------------------------------------------------
// Hover — TypeScript type info + Parabun operator docs
// ---------------------------------------------------------------------------

function getHoverResult(
  uri: string,
  content: string,
  line: number,
  character: number,
): { contents: { kind: string; value: string }; range?: LspRange } | null {
  // Parabun-specific hover first
  const parabunHover = getParabunHover(content, line, character);
  if (parabunHover) {
    return { contents: { kind: "markdown", value: parabunHover } };
  }

  // TypeScript hover
  if (tsService && ts) {
    const fileName = toTsPath(uriToPath(uri));
    const transformed = transformParabunToTS(content);
    const mappedPos = mapPositionToTransformed(content, transformed, line, character);
    const offset = positionToOffset(transformed, mappedPos.line, mappedPos.character);

    try {
      const info = tsService.getQuickInfoAtPosition(fileName, offset);
      if (info) {
        const display = ts.displayPartsToString(info.displayParts);
        const docs = ts.displayPartsToString(info.documentation ?? []);
        const tags = (info.tags ?? [])
          .map(tag => {
            const tagText = typeof tag.text === "string" ? tag.text : (tag.text ?? []).map(p => p.text).join("");
            return `*@${tag.name}* ${tagText}`;
          })
          .join("\n\n");

        let value = "```typescript\n" + display + "\n```";
        if (docs) value += "\n\n" + docs;
        if (tags) value += "\n\n" + tags;

        return { contents: { kind: "markdown", value } };
      }
    } catch (e: any) {
      logMessage(2, `[parabun-lsp] TS hover error: ${e?.message ?? e}`);
    }
  }

  return null;
}

function getParabunHover(content: string, line: number, character: number): string | null {
  const lines = content.split("\n");
  if (line >= lines.length) return null;
  const lineText = lines[line];
  const wordAt = getWordAt(lineText, character);

  if (wordAt === "fun") {
    return [
      "### `fun` — shorthand for `function`",
      "",
      "Parabun shorthand. `fun` desugars to `function` at parse time.",
      "",
      "```typescript",
      "fun add(a: number, b: number) { return a + b; }",
      "export fun greet(name: string) { return `hi ${name}`; }",
      "pure fun double(x: number) { return x * 2; }",
      "```",
    ].join("\n");
  }

  if (wordAt === "pure") {
    return [
      "### `pure` — function purity modifier",
      "",
      "Marks a function as **pure**. The transpiler enforces:",
      "- No `this` access",
      "- No mutation of outer-scope variables",
      "- Enables automatic inlining at `|>` call sites",
      "",
      "```typescript",
      "pure fun add(a: number, b: number) {",
      "  return a + b;",
      "}",
      "```",
    ].join("\n");
  }

  const around = lineText.slice(Math.max(0, character - 3), character + 3);

  if (around.includes("..=")) {
    return [
      "### `..=` — await-assign operator",
      "",
      "Synchronously resolves settled promises without a microtask tick.",
      "",
      "```typescript",
      "const data ..= fetchUser(id);",
      "// → const data = await fetchUser(id);",
      "```",
    ].join("\n");
  }
  if (around.includes("..!")) {
    return [
      "### `..!` — catch operator",
      "",
      "Attaches an error handler to a promise expression.",
      "",
      "```typescript",
      "fetchUser(id) ..! (err) => fallback",
      "// → fetchUser(id).catch((err) => fallback)",
      "```",
    ].join("\n");
  }
  if (around.includes("..&")) {
    return [
      "### `..&` — finally operator",
      "",
      "Attaches a cleanup handler that runs regardless of outcome.",
      "",
      "```typescript",
      "fetchUser(id) ..& () => cleanup()",
      "// → fetchUser(id).finally(() => cleanup())",
      "```",
    ].join("\n");
  }
  if (around.includes("|>")) {
    return [
      "### `|>` — pipeline operator",
      "",
      "Pipes a value through a function. Chains read left-to-right.",
      "",
      "```typescript",
      "data |> transform |> validate |> save",
      "// → save(validate(transform(data)))",
      "```",
    ].join("\n");
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
// Go-to-definition
// ---------------------------------------------------------------------------

function getDefinition(uri: string, content: string, line: number, character: number): any[] | null {
  if (!tsService || !ts) return null;

  const fileName = toTsPath(uriToPath(uri));
  const transformed = transformParabunToTS(content);
  const mappedPos = mapPositionToTransformed(content, transformed, line, character);
  const offset = positionToOffset(transformed, mappedPos.line, mappedPos.character);

  try {
    const defs = tsService.getDefinitionAtPosition(fileName, offset);
    if (!defs || defs.length === 0) return null;

    return defs.map(def => {
      const realTargetPath = fromTsPath(def.fileName);
      const targetUri = pathToUri(realTargetPath);
      const targetContent = documents.get(targetUri);
      let startPos: LspPosition;
      let endPos: LspPosition;

      // Read the original source — prefer open document, fall back to disk
      const origContent =
        targetContent ??
        (() => {
          try {
            return require("fs").readFileSync(realTargetPath, "utf8") as string;
          } catch {
            return "";
          }
        })();
      const isParabun = /\.p(?:ts|tsx|js|jsx)$/.test(realTargetPath);

      if (isParabun && origContent) {
        const targetTransformed = transformParabunToTS(origContent);
        const tStart = offsetToPosition(targetTransformed, def.textSpan.start);
        const tEnd = offsetToPosition(targetTransformed, def.textSpan.start + def.textSpan.length);
        startPos = mapPositionFromTransformed(origContent, targetTransformed, tStart.line, tStart.character);
        endPos = mapPositionFromTransformed(origContent, targetTransformed, tEnd.line, tEnd.character);
      } else {
        startPos = offsetToPosition(origContent, def.textSpan.start);
        endPos = offsetToPosition(origContent, def.textSpan.start + def.textSpan.length);
      }

      return {
        targetUri,
        targetRange: { start: startPos, end: endPos },
        targetSelectionRange: { start: startPos, end: endPos },
      };
    });
  } catch (e: any) {
    logMessage(2, `[parabun-lsp] TS definition error: ${e?.message ?? e}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Completions — TypeScript + Parabun keywords
// ---------------------------------------------------------------------------

const parabunCompletions = [
  {
    label: "fun",
    kind: 14,
    detail: "Parabun: function (shorthand)",
    insertText: "fun ",
  },
  {
    label: "fun (declaration)",
    kind: 15,
    detail: "Parabun: function declaration",
    insertText: "fun ${1:name}(${2:params}) {\n\t${0}\n}",
    insertTextFormat: 2,
  },
  {
    label: "pure",
    kind: 14,
    detail: "Parabun: pure function modifier",
    insertText: "pure ",
  },
  {
    label: "pure fun",
    kind: 15,
    detail: "Parabun: pure function declaration",
    insertText: "pure fun ${1:name}(${2:params}) {\n\t${0}\n}",
    insertTextFormat: 2,
  },
  {
    label: "pure async fun",
    kind: 15,
    detail: "Parabun: pure async function declaration",
    insertText: "pure async fun ${1:name}(${2:params}) {\n\t${0}\n}",
    insertTextFormat: 2,
  },
  {
    label: "memo pure fun",
    kind: 15,
    detail: "Parabun: memoized pure function declaration",
    insertText: "memo pure fun ${1:name}(${2:params}) {\n\t${0}\n}",
    insertTextFormat: 2,
  },
  {
    label: "defer",
    kind: 14,
    detail: "Parabun: schedule disposal on block exit",
    insertText: "defer ${0};",
    insertTextFormat: 2,
  },
  {
    label: "defer await",
    kind: 14,
    detail: "Parabun: schedule async disposal on block exit (async fn only)",
    insertText: "defer await ${0};",
    insertTextFormat: 2,
  },
  {
    label: "..=",
    kind: 24,
    detail: "Parabun: await-assign operator",
    insertText: "..= ",
  },
  {
    label: "..!",
    kind: 24,
    detail: "Parabun: catch operator",
    insertText: "..! ",
  },
  {
    label: "..&",
    kind: 24,
    detail: "Parabun: finally operator",
    insertText: "..& ",
  },
  {
    label: "|>",
    kind: 24,
    detail: "Parabun: pipeline operator",
    insertText: "|> ",
  },
];

function getCompletions(
  uri: string,
  content: string,
  line: number,
  character: number,
): { isIncomplete: boolean; items: any[] } {
  const items: any[] = [...parabunCompletions];

  if (tsService && ts) {
    const fileName = toTsPath(uriToPath(uri));
    const transformed = transformParabunToTS(content);
    const mappedPos = mapPositionToTransformed(content, transformed, line, character);
    const offset = positionToOffset(transformed, mappedPos.line, mappedPos.character);

    try {
      const completions = tsService.getCompletionsAtPosition(fileName, offset, undefined);
      if (completions) {
        for (const entry of completions.entries.slice(0, 100)) {
          items.push({
            label: entry.name,
            kind: tsCompletionKindToLsp(entry.kind),
            detail: entry.kind,
            sortText: entry.sortText,
            insertText: entry.insertText ?? entry.name,
          });
        }
      }
    } catch {
      // TS completions unavailable
    }
  }

  return { isIncomplete: false, items };
}

function tsCompletionKindToLsp(kind: string): number {
  const map: Record<string, number> = {
    keyword: 14,
    function: 3,
    method: 2,
    property: 10,
    variable: 6,
    class: 7,
    interface: 8,
    enum: 13,
    module: 9,
    type: 8,
    constant: 21,
    string: 15,
  };
  return map[kind] ?? 1;
}

// ---------------------------------------------------------------------------
// Code Actions
// ---------------------------------------------------------------------------

interface TextEdit {
  range: LspRange;
  newText: string;
}

interface CodeAction {
  title: string;
  kind: string;
  diagnostics?: LspDiagnostic[];
  edit?: { changes: Record<string, TextEdit[]> };
}

function getCodeActions(uri: string, content: string, range: LspRange, params?: any): CodeAction[] {
  const actions: CodeAction[] = [];
  const lines = content.split("\n");
  const startLine = range.start.line;
  const endLine = Math.min(range.end.line, lines.length - 1);

  for (let i = startLine; i <= endLine; i++) {
    const line = lines[i];

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

    const catchMatch = line.match(/\.catch\(([^)]+)\)/);
    if (catchMatch && catchMatch.index !== undefined) {
      const before = line.slice(0, catchMatch.index);
      const handler = catchMatch[1];
      const after = line.slice(catchMatch.index + catchMatch[0].length);
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

    const finallyMatch = line.match(/\.finally\(([^)]+)\)/);
    if (finallyMatch && finallyMatch.index !== undefined) {
      const before = line.slice(0, finallyMatch.index);
      const handler = finallyMatch[1];
      const after = line.slice(finallyMatch.index + finallyMatch[0].length);
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

    const fnMatch = line.match(/^(\s*)(export\s+)?(async\s+)?fun(?:ction)?\b/);
    if (fnMatch && !line.match(/\bpure\s/) && fnMatch.index !== undefined) {
      const indent = fnMatch[1] || "";
      const exportKw = fnMatch[2] || "";
      const insertCol = indent.length + exportKw.length;
      const isQuickFix = params?.context?.diagnostics?.some((d: any) => d.code === PURE_HINT_CODE);
      actions.push({
        title: "Add pure modifier",
        kind: isQuickFix ? "quickfix" : "refactor.rewrite",
        diagnostics: isQuickFix ? params.context.diagnostics.filter((d: any) => d.code === PURE_HINT_CODE) : undefined,
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
  }

  return actions;
}

// ---------------------------------------------------------------------------
// Semantic Tokens — pure keyword highlighting
// ---------------------------------------------------------------------------

const SEMANTIC_TOKEN_TYPES = ["function"];
const SEMANTIC_TOKEN_MODIFIERS = ["declaration", "pure"];

function computeSemanticTokens(uri: string, content: string): number[] {
  const data: number[] = [];
  const lines = content.split("\n");
  let prevLine = 0;
  let prevChar = 0;

  const pureFns = getAllPureFns(uri, content);

  function pushToken(line: number, col: number, len: number, type: number, modifiers: number) {
    const deltaLine = line - prevLine;
    const deltaChar = deltaLine === 0 ? col - prevChar : col;
    data.push(deltaLine, deltaChar, len, type, modifiers);
    prevLine = line;
    prevChar = col;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // pure keyword
    const pureRe = /\b(pure)\s*(?=function\b|fun\b|async\b|\(|<[\w\s,=]+>\s*\(|\w+\s*=>)/g;
    let m: RegExpExecArray | null;
    while ((m = pureRe.exec(line)) !== null) {
      pushToken(i, m.index, 4, 0, 0b10); // type=function, modifier=pure
    }

    // Pure function call sites
    if (pureFns.size > 0) {
      const callRe = /\b(\w+)\s*(?:\(|<[\w\s,=<>[\]|&]+>\s*\()/g;
      while ((m = callRe.exec(line)) !== null) {
        if (pureFns.has(m[1]) && !JS_KEYWORDS.test(m[1])) {
          pushToken(i, m.index, m[1].length, 0, 0b10); // type=function, modifier=pure
        }
      }
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
      workspaceRoot = params.rootUri ? uriToPath(params.rootUri) : (params.rootPath ?? "");
      initTypeScriptService();

      sendResponse(id, {
        capabilities: {
          textDocumentSync: { openClose: true, change: 1 },
          completionProvider: {
            triggerCharacters: [".", "|", '"', "'", "/"],
          },
          hoverProvider: true,
          definitionProvider: true,
          codeActionProvider: {
            codeActionKinds: ["refactor.rewrite", "quickfix"],
          },
          semanticTokensProvider: {
            legend: {
              tokenTypes: SEMANTIC_TOKEN_TYPES,
              tokenModifiers: SEMANTIC_TOKEN_MODIFIERS,
            },
            full: true,
          },
        },
        serverInfo: { name: "parabun-lsp", version: "0.2.0" },
      });
      break;

    case "initialized":
      break;

    case "shutdown":
      sendResponse(id, null);
      break;

    case "exit":
      process.exit(0);
      break;

    case "textDocument/didOpen": {
      const { uri, text, version, languageId } = params.textDocument;
      logMessage(3, `[parabun-lsp] didOpen: uri=${uri} lang=${languageId} len=${text?.length ?? 0}`);
      documents.set(uri, text);
      docVersions.set(uri, version ?? 1);
      validate(uri, text);
      break;
    }

    case "textDocument/didChange": {
      const uri = params.textDocument.uri;
      const content = params.contentChanges[0]?.text;
      if (content !== undefined) {
        documents.set(uri, content);
        docVersions.set(uri, (docVersions.get(uri) ?? 0) + 1);
        validate(uri, content);
      }
      break;
    }

    case "textDocument/didClose": {
      const uri = params.textDocument.uri;
      documents.delete(uri);
      docVersions.delete(uri);
      publishDiagnostics(uri, []);
      break;
    }

    case "textDocument/completion": {
      const uri = params.textDocument.uri;
      const content = getDocContent(uri);
      if (content) {
        sendResponse(id, getCompletions(uri, content, params.position.line, params.position.character));
      } else {
        sendResponse(id, {
          isIncomplete: false,
          items: parabunCompletions,
        });
      }
      break;
    }

    case "textDocument/hover": {
      const uri = params.textDocument.uri;
      const content = getDocContent(uri);
      if (content) {
        const result = getHoverResult(uri, content, params.position.line, params.position.character);
        sendResponse(id, result);
      } else {
        logMessage(2, `[parabun-lsp] hover: could not read ${uri}`);
        sendResponse(id, null);
      }
      break;
    }

    case "textDocument/definition": {
      const uri = params.textDocument.uri;
      const content = getDocContent(uri);
      if (content) {
        sendResponse(id, getDefinition(uri, content, params.position.line, params.position.character));
      } else {
        sendResponse(id, null);
      }
      break;
    }

    case "textDocument/codeAction": {
      const uri = params.textDocument.uri;
      const content = getDocContent(uri);
      if (content) {
        sendResponse(id, getCodeActions(uri, content, params.range, params));
      } else {
        sendResponse(id, []);
      }
      break;
    }

    case "textDocument/semanticTokens/full": {
      const uri = params.textDocument.uri;
      const content = getDocContent(uri);
      if (content) {
        sendResponse(id, {
          data: computeSemanticTokens(uri, content),
        });
      } else {
        sendResponse(id, { data: [] });
      }
      break;
    }

    case "parabun/pureFunctions": {
      const uri = params.textDocument.uri;
      const content = getDocContent(uri);
      if (content) {
        sendResponse(id, { names: [...getAllPureFns(uri, content)] });
      } else {
        sendResponse(id, { names: [] });
      }
      break;
    }

    default:
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
      inputBuffer = inputBuffer.slice(sepIdx + HEADER_SEP.length);
      continue;
    }

    const contentLength = parseInt(match[1], 10);
    const bodyStart = sepIdx + HEADER_SEP.length;

    if (inputBuffer.length < bodyStart + contentLength) {
      break;
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
