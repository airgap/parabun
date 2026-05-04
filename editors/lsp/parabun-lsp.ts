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

const PARABUN_SYNTAX_RE =
  /\bmemo\s|\bpure\s|\bfun\b|\bsignal\s+[A-Za-z_$]|\beffect\s*\{|\barena\s*\{|\b(?:parallel|para)\s*\{|\b(?:parallel|para)\s+(?:let|const)\b|\bwhen(?:\s+not)?\s+[!A-Za-z_$]|\.\.=|\.\.!|\.\.&|\|>|~>|(?<![\-=<])->/;

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
  line = stripMemo(line);
  line = stripPure(line);
  line = transformSignal(line);
  line = transformEffect(line);
  line = transformArena(line);
  line = transformParallel(line);
  line = transformWhenBlock(line);
  line = transformCatchFinally(line);
  line = transformRbind(line);
  line = transformCallBind(line);
  line = transformPipeline(line);
  return line;
}

// `A ~> B` → `A = B` (column-preserving: both `~>` and `= ` are 2 chars).
// TS then sees an assignment between two references, which is enough for
// identifier resolution, hover, and go-to-def. The direction is reversed
// compared to the real desugar (`B = A`), but TS doesn't care about that
// for symbol lookup, and we avoid rewriting A/B positions in a regex pass.
function transformRbind(line: string): string {
  return line.replace(/~>/g, "= ");
}

// `A -> fn` → `A , fn` (column-preserving: both `->` and `, ` are 2 chars).
// TS sees a comma expression between two references — enough for identifier
// resolution, hover, and go-to-def on both sides. Negative lookbehind keeps
// `-->` (post-decrement followed by `>`), `=>` (arrow), and `<-` from
// matching.
function transformCallBind(line: string): string {
  return line.replace(/(?<![\-=<])->/g, ", ");
}

// `signal NAME = RHS` → `let    NAME = RHS`. The `signal` keyword is replaced
// with `let   ` (3 chars + 3 spaces = 6, matching `signal`'s 6 chars) so every
// column after the keyword stays at its original position — hover, go-to-def,
// and diagnostic ranges all still map 1:1. `let` rather than `const` because
// Parabun rewrites `NAME = x` / `NAME++` to `.set()` calls at parse time, so
// those mutations must not trip TS's const-reassignment check.
function transformSignal(line: string): string {
  return line.replace(/\b(signal)\b(?=\s+[A-Za-z_$][\w$]*\s*[=,;:!])/g, "let   ");
}

// `effect { body }` → `      { body }` — six spaces replace `effect`, leaving
// a bare block statement that TypeScript accepts. Column positions inside
// the body are unchanged. Only triggers when `effect` is immediately before
// `{` (same line) — other uses of `effect` as an identifier are untouched.
function transformEffect(line: string): string {
  return line.replace(/\b(effect)\b(?=\s*\{)/g, "      ");
}

// `arena { body }` → `     { body }` — five spaces replace `arena`, same
// column-preserving trick as transformEffect.
function transformArena(line: string): string {
  return line.replace(/\b(arena)\b(?=\s*\{)/g, "     ");
}

// `parallel { … }` / `parallel let|const NAME …` (and `para` shorthand) →
// blank out the keyword (replacing each char with a space) so TypeScript sees
// a bare object literal or a normal `let|const` declaration. Column positions
// on the rest of the line stay stable for hover / go-to-def.
function transformParallel(line: string): string {
  // Statement form: keep `let|const` so TS still sees a declaration.
  line = line.replace(/\b(parallel|para)(\s+)(?=let|const)/g, (_m, kw, space) => " ".repeat(kw.length) + space);
  // Expression form: hand TS a bare `{ … }` — fine in expression position.
  line = line.replace(/\b(parallel|para)\b(?=\s*\{)/g, (_m, kw) => " ".repeat(kw.length));
  return line;
}

// `when EXPR { body }` → `if  (EXPR) { body }`
// `when not EXPR { body }` → `if      (!(EXPR)) { body }`
// `when not { body }` (bare paired form) → `else     { body }`
//
// Column-preserving rewrites that give TS a normal `if`/`else` shape so the
// embedded TypeScript checker doesn't choke on the surface syntax. The paired
// `when not { … }` lands as `else { … }` so it attaches to the preceding
// transformed `if` — readers still get sensible hover / TS diagnostics. The
// actual desugar is owned by the parser (→ require("para:signals").when(...)
// with the predicate negated for the `not` form); this transform is a TS-side
// shim only.
function transformWhenBlock(line: string): string {
  // Bare paired form first — `when not` followed directly by `{` (no
  // predicate). 8 chars `when not` ↔ 8 chars `else    `, brace column held.
  line = line.replace(/\bwhen\s+not(\s*\{)/g, (_m, brace) => `else    ${brace}`);
  // Negated form with predicate.
  line = line.replace(/\bwhen\s+not\s+(.+?)(\s*\{)/g, (_m, expr, brace) => `if      (!(${expr}))${brace}`);
  // Plain form with predicate.
  line = line.replace(/\bwhen\s+(.+?)(\s*\{)/g, (_m, expr, brace) => `if  (${expr})${brace}`);
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

// Statement form: `memo name(` → `function name(` and `memo async name(` →
// `async function name(`. TS needs a real `function` keyword to parse the
// declaration. This shifts the declaration line's columns right by 4 — hover
// on the body (different lines) is unaffected.
//
// Arrow/expression form: `memo (...) =>`, `memo x =>`, `memo async ...`, and
// `memo <T>(...)` — `memo` is replaced by 4 spaces so TS just sees the bare
// arrow. Column-preserving, so hover/go-to-def lands on the right span.
function stripMemo(line: string): string {
  line = line.replace(
    /\bmemo(\s+)async(\s+)(?=[A-Za-z_$][\w$]*\s*(?:<|\())/g,
    (_m, s1, s2) => `async${s1}function${s2}`,
  );
  // Negative lookahead on `async` keeps `memo async (k) =>` out of the
  // stmt-form path (where it would get rewritten as `function async (...)`);
  // the arrow-form pass below handles it.
  line = line.replace(/\bmemo(\s+)(?!async\b)(?=[A-Za-z_$][\w$]*\s*(?:<|\())/g, (_m, s) => `function${s}`);
  line = line.replace(
    /\bmemo(\s+)(?=\(|[A-Za-z_$][\w$]*\s*=>|async\s+(?:\(|[A-Za-z_$][\w$]*\s*=>)|<[\w\s,=]+>\s*\()/g,
    (_m, s) => `    ${s}`,
  );
  return line;
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

  // Memo suggest/warn hints
  const memoHints = findMemoHints(uri, content);
  diagnostics.push(...memoHints);

  // Purity violation errors for functions already marked pure
  const pureViolations = findPureViolations(uri, content);
  diagnostics.push(...pureViolations);

  publishDiagnostics(uri, diagnostics);
}

const PURE_HINT_CODE = "parabun-pure-eligible";
const MEMO_SUGGEST_CODE = "parabun-memo-eligible";
const MEMO_UNNECESSARY_CODE = "parabun-memo-unnecessary";

// Signals that correlate with "memo likely pays off":
//   - recursion (self-call)
//   - loop or array-method chain in body
//   - calls another declared-pure function
//   - takes exactly one argument (high cache-reuse, cheap key)
// Threshold of ≥2 keeps straight-line arithmetic one-liners (arcradius,
// clamp, lerp) out of the hint zone while still flagging obvious wins
// (fib, tree-walk, hash-by-key lookups).
const MEMO_SUGGEST_MIN_PRO_SIGNALS = 2;

interface MemoBodyAnalysis {
  pro: number;
  arity0: boolean;
  bodyTrivial: boolean;
}

function analyzeForMemo(fnName: string, params: string[], rawBody: string, allPureFns: Set<string>): MemoBodyAnalysis {
  const body = maskCommentsAndStrings(rawBody);
  const hasRecursion = fnName ? new RegExp(`\\b${fnName}\\s*\\(`).test(body) : false;
  const hasLoop = /\b(?:for|while)\b|\.(?:map|filter|reduce|forEach|some|every|flatMap|find|findIndex)\s*\(/.test(body);

  let callsAnotherPureFn = false;
  const callRe = /\b(\w+)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = callRe.exec(body)) !== null) {
    const name = m[1];
    if (name === fnName) continue;
    if (allPureFns.has(name)) {
      callsAnotherPureFn = true;
      break;
    }
  }

  const arity1 = params.length === 1;
  const arity0 = params.length === 0;

  // Body is "trivial" when it does none of the work-suggesting things — no
  // loop, no self-recursion, and no call to another declared-pure function.
  // The work is then O(1) arithmetic, so memo overhead tends to exceed it
  // even for multi-line bodies (e.g. `arcradius` with 4 args and a handful
  // of Math.sin/cos calls). Line count is an unreliable proxy for work.
  const bodyTrivial = !hasLoop && !hasRecursion && !callsAnotherPureFn;

  let pro = 0;
  if (hasRecursion) pro++;
  if (hasLoop) pro++;
  if (callsAnotherPureFn) pro++;
  if (arity1) pro++;

  return { pro, arity0, bodyTrivial };
}

function findMemoHints(uri: string, content: string): LspDiagnostic[] {
  const hints: LspDiagnostic[] = [];
  const lines = content.split("\n");
  const allPureFns = getAllPureFns(uri, content);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // `pure function name(` / `pure async function name(` / with `fun`.
    const pureMatch = line.match(/^(\s*(?:export\s+)?)(pure)(\s+(?:async\s+)?fun(?:ction)?\s+)(\w+)/);
    // `memo name(` / `memo async name(`.
    const memoMatch = !pureMatch ? line.match(/^(\s*(?:export\s+)?)(memo)(\s+(?:async\s+)?)(\w+)(?=\s*[(<])/) : null;

    if (!pureMatch && !memoMatch) continue;

    const sig = extractFunctionSignatureAndBody(lines, i);
    if (!sig) continue;

    const match = pureMatch ?? memoMatch!;
    const name = match[4];
    const kwStart = match[1].length;
    const kwEnd = kwStart + match[2].length;
    const { pro, arity0, bodyTrivial } = analyzeForMemo(name, sig.params, sig.body, allPureFns);

    if (pureMatch && pro >= MEMO_SUGGEST_MIN_PRO_SIGNALS) {
      hints.push({
        range: {
          start: { line: i, character: kwStart },
          end: { line: i, character: kwEnd },
        },
        severity: 4,
        source: "parabun",
        message: `Could be \`memo\` — body has ${pro} memo-friendly signals (recursion / loop / pure-fn call / single primitive arg)`,
        code: MEMO_SUGGEST_CODE,
      });
    } else if (memoMatch && pro < MEMO_SUGGEST_MIN_PRO_SIGNALS && (arity0 || bodyTrivial)) {
      const reason = arity0
        ? "0-arg memo — a plain `const` captures the value just as well"
        : "body is trivial — the memo map lookup likely costs more than the work";
      hints.push({
        range: {
          start: { line: i, character: kwStart },
          end: { line: i, character: kwEnd },
        },
        severity: 4,
        source: "parabun",
        message: `\`memo\` may not pay off here — ${reason}`,
        code: MEMO_UNNECESSARY_CODE,
      });
    }
  }

  return hints;
}

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

/** Replace line comments, block comments, and '/"-quoted string contents
 * with spaces so later regex scans don't false-positive on the word "this",
 * "arguments", or an identifier that looks like an assignment inside a
 * comment or string. Newlines are preserved; column offsets are unchanged;
 * template literals are left intact so their ${...} interpolations still
 * get scanned. */
function maskCommentsAndStrings(src: string): string {
  const out: string[] = [];
  const n = src.length;
  let i = 0;
  while (i < n) {
    const c = src[i];
    const next = src[i + 1];
    if (c === "/" && next === "/") {
      while (i < n && src[i] !== "\n") {
        out.push(" ");
        i++;
      }
      continue;
    }
    if (c === "/" && next === "*") {
      out.push("  ");
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) {
        out.push(src[i] === "\n" ? "\n" : " ");
        i++;
      }
      if (i < n) {
        out.push("  ");
        i += 2;
      }
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      out.push(quote);
      i++;
      while (i < n && src[i] !== quote && src[i] !== "\n") {
        if (src[i] === "\\" && i + 1 < n) {
          out.push("  ");
          i += 2;
          continue;
        }
        out.push(" ");
        i++;
      }
      if (i < n && src[i] === quote) {
        out.push(quote);
        i++;
      }
      continue;
    }
    out.push(c);
    i++;
  }
  return out.join("");
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

function bodyHasSideEffects(params: string[], rawBody: string): boolean {
  const body = maskCommentsAndStrings(rawBody);
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
    if (/\bpure\s+(?:async\s+)?fun(?:ction)?\s+\w+/.test(line)) continue; // already in allPureFns
    if (/\bmemo\s+(?:async\s+)?\w+\s*[(<]/.test(line)) continue; // memo is pure
    const fnMatch = line.match(/(?:^|export\s+)(?:async\s+)?fun(?:ction)?\s+(\w+)/);
    if (fnMatch) impureFns.add(fnMatch[1]);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Enter purity-check for `pure function name(` or `memo name(` bodies.
    // `memo` implies pure and gets the same enforcement.
    const pureMatch = line.match(
      /^(\s*(?:export\s+)?)(pure\s+(?:async\s+)?fun(?:ction)?|memo\s+(?:async\s+)?(?=\w+\s*[(<]))\b/,
    );
    if (!pureMatch || pureMatch.index === undefined) continue;

    const sigAndBody = extractFunctionSignatureAndBody(lines, i);
    if (!sigAndBody) continue;

    const { params, body: rawBody } = sigAndBody;
    // Mask comments and string literals so regex scans don't false-positive
    // on the word `this` in a `// ...` comment (or inside `"..."`).
    const body = maskCommentsAndStrings(rawBody);
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
  const typeDeclRe = /\b(?:type|interface)\s+(\w+)/g;
  while ((m = typeDeclRe.exec(body)) !== null) {
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

  // `memo` declarator: memo foo(...) / memo async foo(...) / export memo foo(...).
  // `memo` implies pure, so its names belong in the pure-fn set.
  const memoRe = /\bmemo\s+(?:async\s+)?(\w+)(?=\s*(?:<|\())/g;
  for (const m of content.matchAll(memoRe)) fns.add(m[1]);

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

  if (wordAt === "memo") {
    return [
      "### `memo` — memoized pure function declarator",
      "",
      "`memo name(params) { body }` declares a memoized pure function. `memo`",
      "is a first-class declarator: it implies both **pure** (no outer mutation,",
      "no `this`) and **function**, so no extra keyword is needed.",
      "",
      "Cache shape is picked from arity:",
      "- **0 args** — singleton, first result reused forever.",
      "- **1 arg** — `Map` keyed by the argument (object identity, no stringify).",
      "- **≥2 args / rest** — nested `Map` chain, one level per argument.",
      "",
      "Async calls dedupe concurrent in-flight invocations (later callers get",
      "the first call's promise); rejected promises evict.",
      "",
      "```typescript",
      "memo fib(n: number): number {",
      "  return n < 2 ? n : fib(n - 1) + fib(n - 2);",
      "}",
      "memo async load(key: string) { return await db.get(key); }",
      "export memo normalize(s: string) { return s.trim().toLowerCase(); }",
      "```",
    ].join("\n");
  }

  if (wordAt === "signal" && isSignalDeclarationAt(lineText, character)) {
    return [
      "### `signal` — reactive binding",
      "",
      "`signal NAME = RHS` declares a reactive signal. Bare reads of `NAME`",
      "rewrite to `NAME.get()`, assignments to `NAME.set(...)`. If `RHS` references",
      "another in-scope signal, the declaration auto-promotes to",
      "`derived(() => RHS)` (read-only).",
      "",
      "`signal` always implies `const` — there's no `signal let`/`var`. Use",
      "`// @parabun-strict-signals` to opt out of auto-derive file-wide.",
      "",
      "```typescript",
      "signal count = 0;",
      "signal doubled = count * 2;   // auto-derived",
      "effect { console.log(count, doubled); }",
      "count++;                      // triggers effect",
      "```",
      "",
      "Allow-list: `.get`, `.set`, `.peek`, `.subscribe`, `.update` stay as",
      "real `Signal` methods. Every other `NAME.foo` rewrites as `NAME.get().foo`.",
    ].join("\n");
  }

  if (wordAt === "effect" && isEffectBlockAt(lineText, character)) {
    return [
      "### `effect { ... }` — reactive effect block",
      "",
      "Runs the body once immediately, tracks every signal `.get()` inside",
      "as a dependency, and re-runs when any dep changes. Returning a function",
      "from the body registers it as a cleanup — it fires before the next run",
      "and on dispose.",
      "",
      "`return` / `break` / `continue` are arrow-local (the body lifts into an",
      "arrow). `await` is rejected — the flush loop is synchronous.",
      "",
      "```typescript",
      "signal count = 0;",
      "effect {",
      "  console.log(count);",
      "  return () => console.log('cleanup', count);",
      "}",
      "```",
    ].join("\n");
  }

  const around = lineText.slice(Math.max(0, character - 3), character + 3);

  if (around.includes("..=")) {
    return [
      "### `..=` — inclusive range",
      "",
      "`a..=b` is the inclusive integer range from `a` to `b`. `a..b` is exclusive.",
      "Empty / inverted ranges produce `[]` (no throw).",
      "",
      "```typescript",
      "for (const i of 0..=5) work(i);   // 0,1,2,3,4,5",
      "const evens = 0..=20 |> filter(i => i % 2 === 0);",
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
  if (around.includes("..>")) {
    return [
      "### `..>` — then operator",
      "",
      "Attaches a fulfillment handler to a promise expression.",
      "",
      "```typescript",
      "fetch(url) ..> parse",
      "// → fetch(url).then(parse)",
      "```",
    ].join("\n");
  }
  if (/\b(parallel|para)\b/.test(around)) {
    return [
      "### `parallel` — fan-out promise composition",
      "",
      "Two forms — both run their RHSes in parallel via `Promise.all` while",
      "preserving the surface-syntax names (no positional-array footgun).",
      "`para` is an interchangeable shorthand — both keywords lower identically.",
      "",
      "**Expression form:**",
      "",
      "```typescript",
      "const { user, posts } = await parallel {",
      "  user: fetchUser(id),",
      "  posts: fetchPosts(id),",
      "};",
      "// → Promise.all([fetchUser(id), fetchPosts(id)])",
      "//      .then(([__pb0, __pb1]) => ({ user: __pb0, posts: __pb1 }));",
      "```",
      "",
      "**Statement form:**",
      "",
      "```typescript",
      "parallel let user = fetchUser(id), posts = fetchPosts(id);",
      "// → const [user, posts] = await Promise.all([fetchUser(id), fetchPosts(id)]);",
      "```",
      "",
      "`Promise.all` semantics — fail-fast on first rejection. Per-decl",
      "`..!` in the statement form gives independent fallbacks.",
    ].join("\n");
  }
  if (around.includes("~>")) {
    return [
      "### `~>` — reactive binding operator",
      "",
      "`A ~> B` creates a reactive binding: whenever the signals read by `A`",
      "change, `B` gets re-assigned with `A`'s new value. `B` must be",
      "assignable — an identifier or property access.",
      "",
      "Desugars to `require('para:signals').effect(() => { B = A; })` —",
      "evaluating `A` in a tracked context and returning the disposer, so",
      "you can capture it: `const stop = src ~> dst;`.",
      "",
      "```typescript",
      "signal count = 0;",
      "count ~> elem.innerHTML;           // UI mirrors count",
      "count |> Math.abs ~> obj.absValue; // composes with |>",
      "const stop = count ~> other;       // capture disposer",
      "```",
    ].join("\n");
  }
  if (/(?<![\-=<])->/.test(around)) {
    return [
      "### `->` — reactive call-binding operator",
      "",
      "`A -> fn` creates a reactive call-binding: whenever the signals read",
      "by `A` change, `fn` is re-invoked with `A`'s new value. `fn` must be",
      "a callable target — an identifier, property access, or indexed",
      "function.",
      "",
      "Desugars to `require('para:signals').effect(() => { fn(A); })` — the",
      "call-sink complement to `~>`. Same precedence, same disposer return,",
      "same optional `when COND` guard.",
      "",
      "```typescript",
      "signal count = 0;",
      "count -> log;                      // log(count) on every change",
      "`v=${count}` -> process.stdout.write; // template + signal sink",
      "count -> log when enabled;         // guarded call",
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
  if (/\bwhen\b/.test(around) && /\{/.test(around)) {
    return [
      "### `when` — edge-triggered block (rising / falling)",
      "",
      "`when EXPR { BODY }` fires `BODY` once each time `EXPR` transitions",
      "false→true. `when not EXPR { BODY }` fires on the true→false edge.",
      "Reads inside `EXPR` are auto-tracked — every signal becomes a dep.",
      "",
      "**Paired form:** a bare `when not { BODY }` immediately following a",
      "`when EXPR { … }` block (no predicate after `not`) pairs with it as",
      "the inverse-edge handler, sharing the same predicate.",
      "",
      "Distinct from the suffix `when` clause used by `~>` / `->`: position",
      "disambiguates. Suffix `when` is an every-truthy guard; the block form",
      "is edge-triggered.",
      "",
      "Desugars to `require('para:signals').when(() => EXPR, () => { BODY })`",
      "— the `not` form negates the predicate (`() => !(EXPR)`), and the paired",
      "form emits two such calls.",
      "",
      "```typescript",
      "when motion.detected.get() && bot.state.get() === 'idle' {",
      "  bot.say('Welcome back!');",
      "}",
      "",
      "// Paired form: bare `when not { … }` reuses the predicate above",
      "when connected { showOnlineBanner(); }",
      "when not       { showOfflineBanner(); }",
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

// True when the cursor is sitting on the `signal` keyword of a `signal NAME =`
// declaration (as opposed to a plain identifier named `signal` imported from
// `para:signals`). Gates the hover so `const x = signal(0)` — which is also
// valid — doesn't trigger the keyword tooltip.
function isSignalDeclarationAt(line: string, col: number): boolean {
  const word = findWordBounds(line, col);
  if (!word || line.slice(word.start, word.end) !== "signal") return false;
  return /^\s+[A-Za-z_$][\w$]*\s*[=,;:!]/.test(line.slice(word.end));
}

function isEffectBlockAt(line: string, col: number): boolean {
  const word = findWordBounds(line, col);
  if (!word || line.slice(word.start, word.end) !== "effect") return false;
  return /^\s*\{/.test(line.slice(word.end));
}

function findWordBounds(line: string, col: number): { start: number; end: number } | null {
  if (col > line.length) return null;
  let start = col;
  let end = col;
  while (start > 0 && /\w/.test(line[start - 1])) start--;
  while (end < line.length && /\w/.test(line[end])) end++;
  if (start === end) return null;
  return { start, end };
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
    label: "memo",
    kind: 15,
    detail: "Parabun: memoized pure function declaration",
    insertText: "memo ${1:name}(${2:params}) {\n\t${0}\n}",
    insertTextFormat: 2,
  },
  {
    label: "memo async",
    kind: 15,
    detail: "Parabun: memoized pure async function declaration",
    insertText: "memo async ${1:name}(${2:params}) {\n\t${0}\n}",
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
    label: "parallel { … }",
    kind: 14,
    detail: "Parabun: fan-out promise composition (expression form)",
    insertText: "parallel {\n  ${1:key}: ${2:expr},\n}",
    insertTextFormat: 2,
  },
  {
    label: "parallel let",
    kind: 14,
    detail: "Parabun: fan-out promise composition (statement form)",
    insertText: "parallel let ${1:name} = ${2:expr};",
    insertTextFormat: 2,
  },
  {
    label: "para { … }",
    kind: 14,
    detail: "Parabun: fan-out promise composition (expression form, shorthand for `parallel`)",
    insertText: "para {\n  ${1:key}: ${2:expr},\n}",
    insertTextFormat: 2,
  },
  {
    label: "para let",
    kind: 14,
    detail: "Parabun: fan-out promise composition (statement form, shorthand for `parallel`)",
    insertText: "para let ${1:name} = ${2:expr};",
    insertTextFormat: 2,
  },
  {
    label: "..=",
    kind: 24,
    detail: "Parabun: inclusive range (`a..=b` includes b)",
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
    label: "..>",
    kind: 24,
    detail: "Parabun: then operator",
    insertText: "..> ",
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

    const thenMatch = line.match(/\.then\(([^)]+)\)/);
    if (thenMatch && thenMatch.index !== undefined) {
      const before = line.slice(0, thenMatch.index);
      const handler = thenMatch[1];
      const after = line.slice(thenMatch.index + thenMatch[0].length);
      actions.push({
        title: "Convert .then() to ..> operator",
        kind: "refactor.rewrite",
        edit: {
          changes: {
            [uri]: [
              {
                range: {
                  start: { line: i, character: 0 },
                  end: { line: i, character: line.length },
                },
                newText: `${before} ..> ${handler}${after}`,
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

const SEMANTIC_TOKEN_TYPES = ["function", "variable"];
const SEMANTIC_TOKEN_MODIFIERS = ["declaration", "pure", "signal"];

// Collect names declared with `signal NAME = ...` (including multi-declarator
// forms like `signal a = 1, b = 2`). Used to semantic-highlight signal-bound
// identifier references so readers can spot reactive reads/writes at a
// glance. Conservative: matches the declaration line only — doesn't follow
// re-exports, and doesn't handle `let x = signal(0)` (unsugared form —
// there's no parse-time marker the LSP can see from a regex).
function collectSignalNames(content: string): Set<string> {
  const names = new Set<string>();
  // `signal NAME` followed by `=`, `,`, `;`, `:` (TS annotation), `!` (TS
  // definite-assignment), or EOL. The leading context must be non-identifier
  // to avoid matching `mySignal foo` or `signals`.
  const declRe = /(?:^|[^A-Za-z0-9_$])signal\s+([A-Za-z_$][\w$]*)(?=\s*[=,;:!]|\s*$)/gm;
  for (const m of content.matchAll(declRe)) names.add(m[1]);

  // Multi-declarator tail: `signal a = 1, b = 2, c = 3`. Walk each `signal`
  // statement line and collect subsequent `, NAME =` bindings until the
  // trailing semicolon or newline. The initial-name regex above catches `a`;
  // this loop catches `b`, `c`.
  const stmtRe = /(?:^|[^A-Za-z0-9_$])signal\s+[A-Za-z_$][\w$]*\s*(?::[^=,;]*)?=(.*)$/gm;
  for (const m of content.matchAll(stmtRe)) {
    const tail = m[1];
    const tailRe = /,\s*([A-Za-z_$][\w$]*)(?=\s*[=,;:!]|\s*$)/g;
    for (const tm of tail.matchAll(tailRe)) names.add(tm[1]);
  }
  return names;
}

function computeSemanticTokens(uri: string, content: string): number[] {
  // Collect every token as {line, col, len, type, modifiers}, then sort and
  // emit. Multiple passes (pure / signal) touch different regions but may
  // overlap per line in any order — LSP requires strictly-ascending output.
  type Token = { line: number; col: number; len: number; type: number; modifiers: number };
  const tokens: Token[] = [];
  const lines = content.split("\n");

  const pureFns = getAllPureFns(uri, content);
  const signalNames = collectSignalNames(content);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // pure keyword
    const pureRe = /\b(pure)\s*(?=function\b|fun\b|async\b|\(|<[\w\s,=]+>\s*\(|\w+\s*=>)/g;
    let m: RegExpExecArray | null;
    while ((m = pureRe.exec(line)) !== null) {
      tokens.push({ line: i, col: m.index, len: 4, type: 0, modifiers: 0b010 }); // function + pure
    }

    // Pure function call sites
    if (pureFns.size > 0) {
      const callRe = /\b(\w+)\s*(?:\(|<[\w\s,=<>[\]|&]+>\s*\()/g;
      while ((m = callRe.exec(line)) !== null) {
        if (pureFns.has(m[1]) && !JS_KEYWORDS.test(m[1])) {
          tokens.push({ line: i, col: m.index, len: m[1].length, type: 0, modifiers: 0b010 });
        }
      }
    }

    // Signal-bound identifier references. Every occurrence of a name declared
    // via `signal NAME = ...` — declaration site included — gets the "signal"
    // modifier. Covers reads, writes, method calls (`count.get()` still gets
    // highlighted on the `count` part). Strings/comments aren't stripped;
    // accept the occasional false-positive inside a string literal to keep
    // the impl regex-only, matching the `pure` pass's style.
    if (signalNames.size > 0) {
      const idRe = /[A-Za-z_$][\w$]*/g;
      while ((m = idRe.exec(line)) !== null) {
        const name = m[0];
        if (!signalNames.has(name)) continue;
        // Skip property-access position: `foo.count` — `count` there is a
        // property, not a reference to the outer signal binding.
        if (m.index > 0 && line[m.index - 1] === ".") continue;
        tokens.push({ line: i, col: m.index, len: name.length, type: 1, modifiers: 0b100 });
      }
    }
  }

  tokens.sort((a, b) => a.line - b.line || a.col - b.col);

  // Dedup exact-overlap tokens (same line+col+len) — keep the first, OR-
  // combine modifiers. Rare in practice but guards against double-emission.
  const data: number[] = [];
  let prevLine = 0;
  let prevChar = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (i > 0) {
      const prev = tokens[i - 1];
      if (prev.line === t.line && prev.col === t.col && prev.len === t.len && prev.type === t.type) continue;
    }
    const deltaLine = t.line - prevLine;
    const deltaChar = deltaLine === 0 ? t.col - prevChar : t.col;
    data.push(deltaLine, deltaChar, t.len, t.type, t.modifiers);
    prevLine = t.line;
    prevChar = t.col;
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
