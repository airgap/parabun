// Para → TypeScript source transform for type-checking.
//
// Unlike `transpile-one.ts` (which uses Bun.Transpiler to strip types
// and emit JS), this module is PURELY TEXTUAL — it rewrites Para
// constructs (model, match, ::, is, etc.) to TS-shaped equivalents
// while preserving all type annotations. Output is valid TS that tsc
// can semantic-analyze.
//
// Used by both:
//   - the LSP's hover/completion/diagnostics path
//   - `parabun check` CLI for workspace-wide type-checking
//
// Position-preserving where feasible: per-line transforms keep column
// indices stable, multi-line transforms (model body, match body) only
// rewrite the opening/closing lines so body content maps 1:1 to source.

const PARABUN_SYNTAX_RE =
  /\bmemo\s|\bpure\s|\bfun\b|\bsignal\s+[A-Za-z_$]|\beffect\s*\{|\barena\s*\{|\b(?:parallel|para)\s*\{|\b(?:parallel|para)\s+(?:let|const)\b|\bwhen(?:\s+not)?\s+[!A-Za-z_$]|\bmodel\s+[A-Za-z_$]|\bmatch\s+[A-Za-z_$(]|::\s*[A-Z]|\bis\s+(?:not\s+)?[A-Z]|\.\.=|\.\.!|\.\.&|\|>|~>|(?<![\-=<])->/;

export function containsParabunSyntax(text: string): boolean {
  return PARABUN_SYNTAX_RE.test(text);
}

export function transformParabunToTS(source: string): string {
  if (!containsParabunSyntax(source)) return source;
  // Multi-line transforms run before per-line work because `model X { ... }`
  // and `match e { ... }` span multiple lines.
  source = transformModelDeclBlock(source);
  source = transformMatchBlock(source);
  // String-aware `is`-pattern rewrite at source level, so `is X` inside
  // string literals (e.g. an English description containing "is X") is
  // never mistaken for a type-guard.
  source = transformIsTypeGuardSource(source);
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    lines[i] = transformLine(lines[i]);
  }
  let result = lines.join("\n");
  result = transformMultilinePipeline(result);
  result = injectIsHelpers(result);
  return result;
}

// Mask strings/comments and apply `is Type` / `is not Type` rewrite to
// real expression context only. Line-level transformIsTypeGuard is left
// in place as a fallback (it runs on text that has already had matches
// removed — no-op in practice but keeps single-line snippets working).
function transformIsTypeGuardSource(source: string): string {
  const masked = maskStringsAndComments(source);
  const replacements: { start: number; end: number; replacement: string }[] = [];
  // Two passes: negated form first.
  const negRe = /\b([\w$.\[\]()]+)\s+is\s+not\s+([A-Z][\w$]*)\b/g;
  let m: RegExpExecArray | null;
  while ((m = negRe.exec(masked)) !== null) {
    const lhs = source.slice(m.index, m.index + m[1].length);
    replacements.push({
      start: m.index,
      end: m.index + m[0].length,
      replacement: `!__paraIs_${m[2]}(${lhs})`,
    });
  }
  // Skip overlapping spans for the plain pattern.
  const blocked: [number, number][] = replacements.map(r => [r.start, r.end]);
  const isOverlapping = (s: number) => blocked.some(([a, b]) => s >= a && s < b);
  const re = /\b([\w$.\[\]()]+)\s+is\s+([A-Z][\w$]*)\b/g;
  while ((m = re.exec(masked)) !== null) {
    if (isOverlapping(m.index)) continue;
    const lhs = source.slice(m.index, m.index + m[1].length);
    replacements.push({
      start: m.index,
      end: m.index + m[0].length,
      replacement: `__paraIs_${m[2]}(${lhs})`,
    });
  }
  if (replacements.length === 0) return source;
  replacements.sort((a, b) => a.start - b.start);
  let out = "";
  let cursor = 0;
  for (const r of replacements) {
    out += source.slice(cursor, r.start);
    out += r.replacement;
    cursor = r.end;
  }
  out += source.slice(cursor);
  return out;
}

// Replace string-literal and comment content with same-length blanks
// so regex passes can't fire inside them. Newlines and quote-chars
// preserved so position-anchored scans still work.
function maskStringsAndComments(source: string): string {
  let masked = "";
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "/" && source[i + 1] === "/") {
      const end = source.indexOf("\n", i);
      const stop = end === -1 ? source.length : end;
      masked += " ".repeat(stop - i);
      i = stop;
      continue;
    }
    if (ch === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? source.length : end + 2;
      const span = source.slice(i, stop);
      masked += span.replace(/[^\n]/g, " ");
      i = stop;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      const quote = ch;
      let j = i + 1;
      while (j < source.length) {
        const c = source[j];
        if (c === "\\") {
          j += 2;
          continue;
        }
        if (c === quote) {
          j++;
          break;
        }
        j++;
      }
      let blanked = quote;
      for (let k = i + 1; k < j - 1; k++) blanked += source[k] === "\n" ? "\n" : " ";
      blanked += source[j - 1] === quote ? quote : " ";
      masked += blanked;
      i = j;
      continue;
    }
    masked += ch;
    i++;
  }
  return masked;
}

function transformLine(line: string): string {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("//") || trimmed.startsWith("/*")) return line;
  line = expandFun(line);
  line = stripMemo(line);
  line = stripPure(line);
  line = stripValidationMarker(line);
  // `is`-guard rewrite happens at source level (string-aware) before
  // line splitting, so per-line pass would no-op anyway. Skipping it
  // here also prevents a second rewrite from firing inside string
  // contents that the source-level pass intentionally left alone.
  line = transformModelFromLine(line);
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

function stripValidationMarker(line: string): string {
  return line.replace(/(:):/g, "$1 ");
}

function transformIsTypeGuard(line: string): string {
  line = line.replace(
    /\b([\w$.\[\]()]+)\s+is\s+not\s+([A-Z][\w$]*)\b/g,
    (_m, lhs, type) => `!__paraIs_${type}(${lhs})`,
  );
  line = line.replace(/\b([\w$.\[\]()]+)\s+is\s+([A-Z][\w$]*)\b/g, (_m, lhs, type) => `__paraIs_${type}(${lhs})`);
  return line;
}

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

function transformModelFromLine(line: string): string {
  return line.replace(
    /\b(export\s+)?model\s+([A-Za-z_$][\w$]*)\s+(?:from\s+|=\s*)/,
    (_m, exportKw, name) => `${exportKw ?? ""}const ${name} = `,
  );
}

function transformModelDeclBlock(source: string): string {
  return source.replace(
    /\b(export\s+)?model\s+([A-Za-z_$][\w$]*)(\s*\{)([\s\S]*?)(\n\s*)\}/g,
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

function paraTypeFragmentToTs(raw: string): string {
  raw = raw.trim();
  if (/^\s*(?:"[^"]*"|\d+(?:\.\d+)?|true|false)/.test(raw)) return raw;
  const arrayMatch = raw.match(/^\[([A-Za-z_$][\w$]*)\](?:\([^)]*\))?$/);
  if (arrayMatch) return `${paraBaseTypeToTs(arrayMatch[1])}[]`;
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
      return t;
  }
}

function transformMatchBlock(source: string): string {
  // Mask out string + template + comment ranges so the `match` regex
  // can't fire inside them. Replace each masked region with placeholders
  // of equal length, then unmask after the transform. Equal-length
  // preserves all source positions for downstream per-line transforms.
  const placeholders: { start: number; text: string }[] = [];
  let masked = "";
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    // Single-line comment
    if (ch === "/" && source[i + 1] === "/") {
      const end = source.indexOf("\n", i);
      const stop = end === -1 ? source.length : end;
      placeholders.push({ start: masked.length, text: source.slice(i, stop) });
      masked += " ".repeat(stop - i);
      i = stop;
      continue;
    }
    // Block comment
    if (ch === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? source.length : end + 2;
      const span = source.slice(i, stop);
      placeholders.push({ start: masked.length, text: span });
      // Keep newlines so per-line transforms still see correct line counts.
      masked += span.replace(/[^\n]/g, " ");
      i = stop;
      continue;
    }
    // String literals — `'`, `"`, `\``
    if (ch === "'" || ch === '"' || ch === "`") {
      const quote = ch;
      let j = i + 1;
      while (j < source.length) {
        const c = source[j];
        if (c === "\\") {
          j += 2;
          continue;
        }
        if (c === quote) {
          j++;
          break;
        }
        j++;
      }
      const span = source.slice(i, j);
      placeholders.push({ start: masked.length, text: span });
      // Replace inner content with spaces; keep quotes + newlines so
      // pattern-anchors that look for quote chars still see them.
      let blanked = quote;
      for (let k = i + 1; k < j - 1; k++) {
        blanked += source[k] === "\n" ? "\n" : " ";
      }
      blanked += span[span.length - 1] === quote ? quote : " ";
      masked += blanked;
      i = j;
      continue;
    }
    masked += ch;
    i++;
  }

  // Run the match-block transform on the masked source. Then re-emit
  // unmasked content for any positions the regex didn't consume.
  // Track which spans the regex replaced, then for everything else,
  // restore original text.
  const replacements: { start: number; end: number; replacement: string }[] = [];
  const re = /\bmatch\s+([^{]+?)\s*\{[\s\S]*?\n\s*\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked)) !== null) {
    const subjectMasked = m[1];
    // Subject text comes from MASKED — for the IIFE arg, restore
    // original content from the same range in `source`.
    const subjStart = m.index + "match".length;
    const subjEnd = subjStart + (m[0].indexOf("{") - "match".length);
    const subjOrig = source.slice(subjStart, subjEnd).trim();
    replacements.push({
      start: m.index,
      end: m.index + m[0].length,
      replacement: `((__m: any): any => null as any)(${subjOrig})`,
    });
  }

  if (replacements.length === 0) return source;
  let out = "";
  let cursor = 0;
  for (const r of replacements) {
    out += source.slice(cursor, r.start);
    out += r.replacement;
    cursor = r.end;
  }
  out += source.slice(cursor);
  return out;
}

function transformRbind(line: string): string {
  return line.replace(/~>/g, "= ");
}

function transformCallBind(line: string): string {
  return line.replace(/(?<![\-=<])->/g, ", ");
}

function transformSignal(line: string): string {
  return line.replace(/\b(signal)\b(?=\s+[A-Za-z_$][\w$]*\s*[=,;:!])/g, "let   ");
}

function transformEffect(line: string): string {
  return line.replace(/\b(effect)\b(?=\s*\{)/g, "      ");
}

function transformArena(line: string): string {
  return line.replace(/\b(arena)\b(?=\s*\{)/g, "     ");
}

function transformParallel(line: string): string {
  line = line.replace(/\b(parallel|para)(\s+)(?=let|const)/g, (_m, kw, space) => " ".repeat(kw.length) + space);
  line = line.replace(/\b(parallel|para)\b(?=\s*\{)/g, (_m, kw) => " ".repeat(kw.length));
  return line;
}

function transformWhenBlock(line: string): string {
  line = line.replace(/\bwhen\s+not(\s*\{)/g, (_m, brace) => `else    ${brace}`);
  line = line.replace(/\bwhen\s+not\s+(.+?)(\s*\{)/g, (_m, expr, brace) => `if      (!(${expr}))${brace}`);
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

function stripMemo(line: string): string {
  line = line.replace(
    /\bmemo(\s+)async(\s+)(?=[A-Za-z_$][\w$]*\s*(?:<|\())/g,
    (_m, s1, s2) => `async${s1}function${s2}`,
  );
  line = line.replace(/\bmemo(\s+)(?!async\b)(?=[A-Za-z_$][\w$]*\s*(?:<|\())/g, (_m, s1) => `function${s1}`);
  return line.replace(/\bmemo(\s+)(?=async\s|\(|<[\w\s,=]+>\s*\(|[A-Za-z_$][\w$]*\s*=>)/g, (_m, s1) => "    " + s1);
}

function transformCatchFinally(line: string): string {
  line = line.replace(/\s*\.\.&\s*(.+?)(?=\s*;|\s*$)/g, (_m, handler) => `.finally(${handler.trim()})`);
  line = line.replace(/\s*\.\.!\s*(.+?)(?=\.finally\(|\s*;|\s*$)/g, (_m, handler) => `.catch(${handler.trim()})`);
  return line;
}

function transformPipeline(line: string): string {
  if (!line.includes("|>")) return line;
  return line.replace(/((?:=|return|=>)\s*)(.+?\|>.+?)(?=\s*;|\s*$)/g, (_m, prefix, pipeline) => {
    return prefix + collapsePipeline(pipeline);
  });
}

function collapsePipeline(expr: string): string {
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
