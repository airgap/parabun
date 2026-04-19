/**
 * Parabun → TypeScript source transform.
 *
 * Desugars Parabun-specific syntax into valid TypeScript so the TS
 * language service can type-check it.  Position-preserving where
 * possible (pure keyword → same-length whitespace).
 *
 * This is NOT the runtime transpiler — Bun's Zig parser handles
 * actual compilation.  This only needs to satisfy the type checker.
 */

const PARABUN_SYNTAX_RE = /\bpure\s|\bfun\b|\.\.=|\.\.!|\.\.&|\|>/;

export function containsParabunSyntax(text: string): boolean {
  return PARABUN_SYNTAX_RE.test(text);
}

export function transformParabunToTS(source: string): string {
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
  if (trimmed.startsWith("//")) return line;

  if (trimmed.startsWith("/*")) return line;

  line = expandFun(line);
  line = stripPure(line);
  line = transformAwaitAssign(line);
  line = transformCatchFinally(line);
  line = transformPipeline(line);

  return line;
}

// `fun` → `function` (only in declaration context, not as a variable name)
function expandFun(line: string): string {
  return line.replace(/(?<!\.)(\bfun)\b(?=\s*[a-zA-Z_$*(<])/g, "function");
}

// Replace `pure` keyword with same-length whitespace (position-preserving).
function stripPure(line: string): string {
  return line.replace(
    /\bpure(\s+)(?=function\b|async\s+function\b|<[\w\s,=]+>\s*\(|\(|\w+\s*=>)/g,
    (_m, space) => "    " + space,
  );
}

// `const x ..= expr;` → `const x = await (expr);`
function transformAwaitAssign(line: string): string {
  return line.replace(/(\.\.)=(\s*)/g, (_m, _dots, space) => `= await${space.length > 0 ? space : " "}`);
}

// `expr ..! handler` → `expr.catch(handler)`
// `expr ..& handler` → `expr.finally(handler)`
function transformCatchFinally(line: string): string {
  // Process right-to-left so chaining works: `a ..! b ..& c` → `a.catch(b).finally(c)`
  // Handle ..& first, then ..!
  line = line.replace(/\s*\.\.&\s*(.+?)(?=\s*;|\s*$)/g, (_m, handler) => `.finally(${handler.trim()})`);
  line = line.replace(/\s*\.\.!\s*(.+?)(?=\.finally\(|\s*;|\s*$)/g, (_m, handler) => `.catch(${handler.trim()})`);
  return line;
}

// `x |> f |> g` → `g(f(x))`
function transformPipeline(line: string): string {
  if (!line.includes("|>")) return line;

  // Find contiguous pipeline expressions within assignments or returns.
  // We match the pipeline portion and replace it.
  return line.replace(/((?:=|return|=>)\s*)(.+?\|>.+?)(?=\s*;|\s*$)/g, (_m, prefix, pipeline) => {
    return prefix + collapsePipeline(pipeline);
  });
}

function collapsePipeline(expr: string): string {
  // Split on |> that aren't inside parens/brackets/braces.
  const parts = splitPipeline(expr);
  if (parts.length <= 1) return expr;

  let result = parts[0].trim();
  for (let i = 1; i < parts.length; i++) {
    const fn = parts[i].trim();
    result = `${fn}(${result})`;
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
      i++; // skip >
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
