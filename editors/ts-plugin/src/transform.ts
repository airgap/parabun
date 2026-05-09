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

const PARABUN_SYNTAX_RE =
  /\bpure\s|\bfun\b|\.\.=|\.\.!|\.\.&|\|>|\bschema\s+[A-Za-z_$]|\bschema\s*\{|\bmatch\s+[A-Za-z_$(]|\beffect\s*\{|\bwhen(?:\s+not)?\s+|\bsignal\s+[A-Za-z_$]|\barena\s*\{|::\s*[A-Z]|\bis\s+(?:not\s+)?[A-Z]/;

export function containsParabunSyntax(text: string): boolean {
  return PARABUN_SYNTAX_RE.test(text);
}

export function transformParabunToTS(source: string): string {
  if (!containsParabunSyntax(source)) return source;

  // Whole-source transforms first — these need multi-line awareness
  // (`schema X { ... }` body, `match e { ... }` arms).
  source = transformModelDecls(source);
  source = transformInlineSchemaExpr(source);
  source = transformMatchExprs(source);

  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    lines[i] = transformLine(lines[i]);
  }

  let result = lines.join("\n");
  result = transformMultilinePipeline(result);
  // After all desugars, scan for __paraIs_<Type>() calls and prepend
  // typed-predicate helpers so TS narrows `if (x is Type) { ... }`.
  result = injectIsHelpers(result);
  return result;
}

function transformLine(line: string): string {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("//")) return line;

  if (trimmed.startsWith("/*")) return line;

  line = expandFun(line);
  line = stripPure(line);
  line = stripValidationMarker(line);
  line = transformIsTypeGuard(line);
  line = transformModelFromLine(line);
  line = transformEffectLine(line);
  line = transformWhenLine(line);
  line = transformArenaLine(line);
  line = transformSignalLine(line);
  line = transformCatchFinally(line);
  line = transformPipeline(line);

  return line;
}

// `fun` → `function` (only in declaration context, not as a variable name)
function expandFun(line: string): string {
  return line.replace(/(?<!\.)(\bfun)\b(?=\s*[a-zA-Z_$*(<])/g, "function");
}

// `(req:: User)` → `(req:  User)` — strip the second `:` so TS sees a normal
// type annotation. Position-preserving.
function stripValidationMarker(line: string): string {
  return line.replace(/(:):/g, "$1 ");
}

// `expr is Type` / `expr is not Type` → `__paraIs_Type(expr)` /
// `!__paraIs_Type(expr)`. Helper functions are injected at the top of
// the source by `injectIsHelpers` — they're typed `(v: any): v is Type`,
// so TS narrows `expr` inside `if (...) { ... }` bodies.
function transformIsTypeGuard(line: string): string {
  line = line.replace(
    /\b([\w$.\[\]()]+)\s+is\s+not\s+([A-Z][\w$]*)\b/g,
    (_m, lhs, type) => `!__paraIs_${type}(${lhs})`,
  );
  line = line.replace(/\b([\w$.\[\]()]+)\s+is\s+([A-Z][\w$]*)\b/g, (_m, lhs, type) => `__paraIs_${type}(${lhs})`);
  return line;
}

// Scan the (already-transformed) source for `__paraIs_<Type>(...)`
// references and prepend a typed-predicate helper for each unique Type.
// Each helper has shape `(v: any): v is Type => Type.parse(v).tag === "Ok"`,
// which gives TS proper narrowing in `if (x is Type) { ... }` bodies.
function injectIsHelpers(source: string): string {
  const types = new Set<string>();
  const re = /__paraIs_([A-Z][\w$]*)\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) types.add(m[1]);
  if (types.size === 0) return source;
  const helpers = [...types]
    .map(t => `const __paraIs_${t} = (v: any): v is ${t} => (${t} as any).parse(v).tag === "Ok";`)
    .join("\n");
  return helpers + "\n" + source;
}

// `schema X from <rest-of-line>` OR `schema X = <rest-of-line>` →
// `const X = <rest-of-line>`. No `: any` annotation — TS infers the
// const's type from the value, preserving literal types when the
// source ends with `as const` (lockstep parity).
function transformModelFromLine(line: string): string {
  return line.replace(
    /\b(export\s+)?schema\s+([A-Za-z_$][\w$]*)\s+(?:from\s+|=\s*)/,
    (_m, exportKw, name) => `${exportKw ?? ""}const ${name} = `,
  );
}

// `effect { ... }` → `(() => { ... })()` — preserves the body for type-check.
// Only triggers when `effect` is immediately followed by `{` on the same line.
function transformEffectLine(line: string): string {
  return line.replace(/\b(effect)(\s*\{)/g, (_m, _kw, brace) => `(() =>${brace}`);
}

// `when EXPR { ... }` → `if (EXPR) { ... }`
// `when not EXPR { ... }` → `if (!(EXPR)) { ... }`
// `when not { ... }` (paired form) → `else { ... }`
function transformWhenLine(line: string): string {
  // Bare paired form first.
  line = line.replace(/\bwhen\s+not(\s*\{)/g, (_m, brace) => `else${brace}`);
  // Negated predicate form.
  line = line.replace(/\bwhen\s+not\s+(.+?)(\s*\{)/g, (_m, pred, brace) => `if (!(${pred}))${brace}`);
  // Plain predicate form.
  line = line.replace(/\bwhen\s+(.+?)(\s*\{)/g, (_m, pred, brace) => `if (${pred})${brace}`);
  return line;
}

// `arena { ... }` → `(() => { ... })()` (sync IIFE) — DeferGC scope is runtime-only.
function transformArenaLine(line: string): string {
  return line.replace(/\b(arena)(\s*\{)/g, (_m, _kw, brace) => `(() =>${brace}`);
}

// `signal NAME = EXPR` → `let NAME: any = EXPR` — type-check fidelity only.
function transformSignalLine(line: string): string {
  return line.replace(/\b(signal)\s+([A-Za-z_$][\w$]*)\b/g, (_m, _kw, name) => `let ${name}: any`);
}

// Inline `schema { ... }` expression → `({ ... })`. Paren-wrap only —
// no `as const` (would balloon memory across hundreds of open endpoint
// files in the IDE) and no `as any` (would blind diagnostics inside
// the body). The literal narrowness the brand codegen wants happens
// offline in `gen-dts-rewrite`. Brace-balanced; strings/comments
// skipped so a `}` inside a literal can't close the body early.
function transformInlineSchemaExpr(source: string): string {
  const out: string[] = [];
  const re = /\bschema\s*\{/g;
  let match: RegExpExecArray | null;
  let lastEnd = 0;
  while ((match = re.exec(source)) !== null) {
    const start = match.index;
    if (isInsideStringOrComment(source, start)) continue;
    const openBraceIdx = start + match[0].length - 1;
    let depth = 1;
    let j = openBraceIdx + 1;
    while (j < source.length && depth > 0) {
      const ch = source[j];
      if (ch === '"' || ch === "'" || ch === "`") {
        const q = ch;
        j++;
        while (j < source.length && source[j] !== q) {
          if (source[j] === "\\") j++;
          j++;
        }
        j++;
        continue;
      }
      if (ch === "/" && source[j + 1] === "/") {
        while (j < source.length && source[j] !== "\n") j++;
        continue;
      }
      if (ch === "/" && source[j + 1] === "*") {
        j += 2;
        while (j < source.length - 1 && !(source[j] === "*" && source[j + 1] === "/")) j++;
        j += 2;
        continue;
      }
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      j++;
    }
    if (depth !== 0) continue;
    const closeIdx = j - 1;
    const body = source.slice(openBraceIdx, closeIdx + 1);
    out.push(source.slice(lastEnd, start));
    out.push(`(${body})`);
    lastEnd = closeIdx + 1;
    re.lastIndex = closeIdx + 1;
  }
  out.push(source.slice(lastEnd));
  return out.join("");
}

function isInsideStringOrComment(source: string, offset: number): boolean {
  let i = 0;
  while (i < offset) {
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const q = ch;
      i++;
      while (i < offset && source[i] !== q) {
        if (source[i] === "\\") i++;
        i++;
      }
      if (i >= offset) return true;
      i++;
      continue;
    }
    if (ch === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      if (i > offset) return true;
      continue;
    }
    if (ch === "/" && source[i + 1] === "*") {
      i += 2;
      while (i < source.length - 1 && !(source[i] === "*" && source[i + 1] === "/")) i++;
      if (i > offset) return true;
      i += 2;
      continue;
    }
    i++;
  }
  return false;
}

// Hybrid rewrite: open `schema NAME {` becomes `type NAME = {`, close `}`
// is augmented with the const decl. Body lines only get rewritten when
// they have Para-specific type fragments (refinements, array+bounds,
// lowercase Para aliases). Plain TS field types pass through verbatim
// — preserving hover positions for the common pg-models case.
function transformModelDecls(source: string): string {
  return source.replace(
    /\b(export\s+)?schema\s+([A-Za-z_$][\w$]*)(\s*\{)([\s\S]*?)(\n\s*)\}/g,
    (_m, exportKw, name, openBrace, body, closeWs) => {
      const e = exportKw ?? "";
      const rewritten = rewriteParaFieldLines(body);
      const constDecl =
        ` ${e}const ${name}: { parse: (v: any) => { tag: "Ok"; value: ${name} } | { tag: "Err"; error: string }; schema: any } = ` +
        `{ parse: (_v: any) => ({} as any), schema: {} as any };`;
      return `${e}type ${name} =${openBrace}${rewritten}${closeWs}};${constDecl}`;
    },
  );
}

function rewriteParaFieldLines(body: string): string {
  return body
    .split("\n")
    .map(line => {
      // Para syntax: `field: type` with optional `?` POSTFIX on the type
      // (`field: type?`). TS uses prefix `?:` (`field?: type`). Match
      // both shapes; detect the Para postfix by the trailing `?` on raw.
      const m = line.match(/^(\s*)([A-Za-z_$][\w$]*)(\??)\s*:\s*(.+?)(\?)?(\s*[,;]?\s*)$/);
      if (!m) return line;
      const [, leadWs, name, prefixOpt, raw, postfixOpt, trail] = m;
      const trimmed = raw.trim();
      const optional = prefixOpt === "?" || postfixOpt === "?";
      const isParaSpecific =
        /\(/.test(trimmed) ||
        /^\[[A-Za-z_$][\w$]*\]/.test(trimmed) ||
        /^(int|str|bool|float|num|Email|UUID|Url|Date|DateTime|IpV4|IpV6|Slug)$/.test(trimmed) ||
        postfixOpt === "?";
      if (!isParaSpecific) return line;
      const tsType = paraTypeFragmentToTs(trimmed);
      return `${leadWs}${name}${optional ? "?" : ""}: ${tsType}${trail}`;
    })
    .join("\n");
}

// Map Para field type names to TS types. Strips refinements / array
// suffix / range and normalizes to a plain TS type expression.
function parseModelFieldsForType(body: string): { name: string; tsType: string; optional: boolean }[] {
  const out: { name: string; tsType: string; optional: boolean }[] = [];
  const stripped = body.replace(/\/\/[^\n]*/g, "");
  // `field: type-frag` per non-comma/semi/newline token.
  const fieldRe = /([A-Za-z_$][\w$]*)\s*:\s*([^,;\n]+)/g;
  let m: RegExpExecArray | null;
  while ((m = fieldRe.exec(stripped)) !== null) {
    let raw = m[2].trim();
    const optional = raw.endsWith("?");
    if (optional) raw = raw.slice(0, -1).trim();
    out.push({ name: m[1], tsType: paraTypeFragmentToTs(raw), optional });
  }
  return out;
}

function paraTypeFragmentToTs(raw: string): string {
  raw = raw.trim();
  // Literal-union: `"a" | "b" | 0 | 1` → keep as-is (valid TS).
  if (/^\s*(?:"[^"]*"|\d+(?:\.\d+)?|true|false)/.test(raw)) {
    return raw;
  }
  // Array `[T]` or `[T](min..=max)` → `T[]`.
  const arrayMatch = raw.match(/^\[([A-Za-z_$][\w$]*)\](?:\([^)]*\))?$/);
  if (arrayMatch) return `${paraBaseTypeToTs(arrayMatch[1])}[]`;
  // Range refinement `int(0..150)` / `str(1..=64)` — strip the parens.
  const rangeMatch = raw.match(/^([A-Za-z_$][\w$]*)\([^)]*\)$/);
  if (rangeMatch) return paraBaseTypeToTs(rangeMatch[1]);
  return paraBaseTypeToTs(raw);
}

function paraBaseTypeToTs(t: string): string {
  switch (t) {
    case "int":
    case "float":
    case "num":
    case "number":
      return "number";
    case "str":
    case "string":
    case "Email":
    case "UUID":
    case "Url":
    case "Date":
    case "DateTime":
    case "IpV4":
    case "IpV6":
    case "Slug":
      return "string";
    case "bool":
    case "boolean":
      return "boolean";
    default:
      return t; // capitalized → assumed model name (resolves to its own type)
  }
}

// `match EXPR { arm => result, ... }` → `((__m: any): any => null as any)(EXPR)`
// Same shape as the runtime emit (IIFE consuming the subject) so TS sees a
// well-typed expression.
function transformMatchExprs(source: string): string {
  return source.replace(
    /\bmatch\s+([^{]+?)\s*\{[\s\S]*?\n\s*\}/g,
    (_m, subject) => `((__m: any): any => null as any)(${subject.trim()})`,
  );
}

// Replace `pure` keyword with same-length whitespace (position-preserving).
function stripPure(line: string): string {
  return line.replace(
    /\bpure(\s+)(?=function\b|async\s+function\b|<[\w\s,=]+>\s*\(|\(|\w+\s*=>)/g,
    (_m, space) => "    " + space,
  );
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
