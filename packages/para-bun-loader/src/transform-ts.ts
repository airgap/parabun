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
  /\bmemo\s|\bpure\s|\bfun\b|\bsignal\s+[A-Za-z_$]|\beffect\s*\{|\barena\s*\{|\b(?:parallel|para)\s*\{|\b(?:parallel|para)\s+(?:let|const)\b|\bwhen(?:\s+not)?\s+[!A-Za-z_$]|\bschema\s+[A-Za-z_$]|\bschema\s*\{|\bmatch\s+[A-Za-z_$(]|::\s*[A-Z]|\bis\s+(?:not\s+)?[A-Z]|\.\.=|\.\.!|\.\.&|\|>|~>|(?<![\-=<])->|(?:\|\||&&|\?\??|=>|:)\s*throw\s/;

export function containsParabunSyntax(text: string): boolean {
  return PARABUN_SYNTAX_RE.test(text);
}

export function transformParabunToTS(source: string): string {
  if (!containsParabunSyntax(source)) return source;
  // Multi-line transforms run before per-line work because `schema X { ... }`
  // and `match e { ... }` span multiple lines.
  source = transformModelDeclBlock(source);
  source = transformSchemaEqualsBlock(source);
  source = transformInlineSchemaExpr(source);
  source = transformThrowExpr(source);
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
  result = injectSchemaHelper(result);
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
// Cheap "is offset N inside a string / line comment / block comment"
// scan. Used by `transformInlineSchemaExpr` and `transformThrowExpr`
// to skip matches inside string literals (e.g. an English description
// containing the literal word "throw"). Linear-from-start; called per
// regex match site, so O(n²) worst case but bounded by source length.
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

// Single-line `schema X from <expr>` and single-line `schema X = <expr>`
// (non-brace rhs only — `transformSchemaEqualsBlock` handles `=` with
// an object-literal body). Wraps in `__paraFromSchema(() => (<expr>))`
// so tsc sees the typed result.
function transformModelFromLine(line: string): string {
  line = line.replace(
    /\b(export\s+)?schema\s+([A-Za-z_$][\w$]*)\s+from\s+(.+?)(\s*;?\s*)$/,
    (_m, exportKw, name, expr, trailing) =>
      `${exportKw ?? ""}const ${name} = __paraFromSchema(() => (${expr}))${trailing}${schemaTypeAlias(exportKw, name)}`,
  );
  line = line.replace(
    /\b(export\s+)?schema\s+([A-Za-z_$][\w$]*)\s*=\s*(?!\{)(.+?)(\s*;?\s*)$/,
    (_m, exportKw, name, expr, trailing) =>
      `${exportKw ?? ""}const ${name} = __paraFromSchema(() => (${expr}))${trailing}${schemaTypeAlias(exportKw, name)}`,
  );
  return line;
}

// Emit a TS type alias so a `schema X` declaration is usable in BOTH
// value AND type position. The alias resolves to `(typeof X)["schema"]`
// — the unwrapped JSON Schema body — so `PostgresTableModel<X>` and
// other heavy generics skip the `{...} & S` intersection walk that
// the full helper return type forces. Measured 1.5-2.2x speedup on
// warm edits in lyku.
function schemaTypeAlias(exportKw: string | undefined, name: string): string {
  return `;${exportKw ?? ""}type ${name} = (typeof ${name})["schema"]`;
}

// `[export ]schema NAME { fields }` — refinement-typed DSL form. Emits
// a typed `const NAME: { parse, schema } = ...` plus a `type NAME = {
// ... }` alias. Body's Para-specific type fragments (refinements,
// arrays + bounds, lowercase aliases) get rewritten to plain TS.
function transformModelDeclBlock(source: string): string {
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

// Multi-line `[export ]schema NAME = { ... }` → typed wrapper call.
function transformSchemaEqualsBlock(source: string): string {
  const re = /\b(export\s+)?schema\s+([A-Za-z_$][\w$]*)\s*=\s*\{/g;
  const out: string[] = [];
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const exportKw = m[1] ?? "";
    const name = m[2];
    const openIdx = m.index + m[0].length - 1;
    let i = openIdx + 1;
    let depth = 1;
    while (i < source.length && depth > 0) {
      const ch = source[i];
      if (ch === '"' || ch === "'" || ch === "`") {
        const q = ch;
        i++;
        while (i < source.length && source[i] !== q) {
          if (source[i] === "\\") i++;
          i++;
        }
        i++;
        continue;
      }
      if (ch === "/" && source[i + 1] === "/") {
        while (i < source.length && source[i] !== "\n") i++;
        continue;
      }
      if (ch === "/" && source[i + 1] === "*") {
        i += 2;
        while (i < source.length - 1 && !(source[i] === "*" && source[i + 1] === "/")) i++;
        i += 2;
        continue;
      }
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      i++;
    }
    if (depth !== 0) continue;
    const closeIdx = i - 1;
    const body = source.slice(openIdx, closeIdx + 1);
    out.push(source.slice(lastEnd, m.index));
    out.push(`${exportKw}const ${name} = __paraFromSchema(() => (${body}))${schemaTypeAlias(exportKw, name)}`);
    lastEnd = closeIdx + 1;
    re.lastIndex = closeIdx + 1;
  }
  out.push(source.slice(lastEnd));
  return out.join("");
}

// Inline `schema { ... }` expression literal → `__paraFromSchema(() => ({...}))`.
function transformInlineSchemaExpr(source: string): string {
  const out: string[] = [];
  const re = /\bschema\s*\{/g;
  let lastEnd = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    const start = match.index;
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
    out.push(`__paraFromSchema(() => (${body}))`);
    lastEnd = closeIdx + 1;
    re.lastIndex = closeIdx + 1;
  }
  out.push(source.slice(lastEnd));
  return out.join("");
}

// Ambient declaration of `__paraFromSchema` so the typed wrapper-call
// emit above resolves. Mirrors `__paraAddFieldAccessors` + `__paraWrapField`
// behaviour at runtime: `.parse` / `.is` / `.schema` always present;
// `& S` so the schema's own keys pass through; recursive `__ParaSchemaValue`
// wrap under `properties` / `items` so deep navigation
// (`User.id.type`, `Tags.element.type`) resolves.
// Rewrite `<trigger> throw E` (where E ends at the next depth-0
// `;` / `,` / `)` / `}` / `]`) into `<trigger> (() => { throw E; })()`.
// Mirrors what the Zig parser does at runtime — Para allows `throw` at
// any expression position, but plain TS doesn't (TS1109). Triggers are
// the documented expression-position openers: `||` / `&&` / `??` /
// `?` (ternary) / `:` (ternary) / `=>` (arrow body).
//
// `?.` (optional chaining) is excluded — only `?` followed by something
// that isn't `.` triggers. `:` matches only when the line context is
// ternary, but we keep it simple here and let nested object-literal
// `{ key: throw E }` ride through too — that's also legal Para and the
// same desugar applies.
function transformThrowExpr(source: string): string {
  const out: string[] = [];
  const re = /(\|\||&&|\?\?|\?(?!\.)|:|=>)\s*throw\s+/g;
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const start = m.index;
    if (isInsideStringOrComment(source, start)) continue;
    const trigger = m[1];
    let i = re.lastIndex;
    const operandStart = i;
    let depth = 0;
    while (i < source.length) {
      const ch = source[i];
      if (ch === '"' || ch === "'" || ch === "`") {
        const q = ch;
        i++;
        while (i < source.length && source[i] !== q) {
          if (source[i] === "\\") i++;
          i++;
        }
        i++;
        continue;
      }
      if (ch === "/" && source[i + 1] === "/") {
        while (i < source.length && source[i] !== "\n") i++;
        continue;
      }
      if (ch === "/" && source[i + 1] === "*") {
        i += 2;
        while (i < source.length - 1 && !(source[i] === "*" && source[i + 1] === "/")) i++;
        i += 2;
        continue;
      }
      if (ch === "(" || ch === "{" || ch === "[") {
        depth++;
        i++;
        continue;
      }
      if (ch === ")" || ch === "}" || ch === "]") {
        if (depth === 0) break;
        depth--;
        i++;
        continue;
      }
      if (depth === 0 && (ch === ";" || ch === ",")) break;
      i++;
    }
    const operandEnd = i;
    const operand = source.slice(operandStart, operandEnd).trim();
    if (!operand) continue; // bail on empty operand — leave for tsc to flag
    out.push(source.slice(lastEnd, start));
    out.push(`${trigger} (() => { throw ${operand}; })()`);
    lastEnd = operandEnd;
    re.lastIndex = operandEnd;
  }
  out.push(source.slice(lastEnd));
  return out.join("");
}

function injectSchemaHelper(source: string): string {
  if (!/\b__paraFromSchema\b/.test(source)) return source;
  const helper =
    `type __ParaResult<T> = { tag: "Ok"; value: T } | { tag: "Err"; error: string };\n` +
    `type __ParaSchemaValue<S> = {\n` +
    `  readonly parse: (v: unknown) => __ParaResult<unknown>;\n` +
    `  readonly is: (v: unknown) => boolean;\n` +
    `  readonly schema: S;\n` +
    `  readonly element: S extends { items: infer I } ? __ParaSchemaValue<I> : never;\n` +
    `} & S & (S extends { properties: infer P } ? { readonly [K in keyof P]: __ParaSchemaValue<P[K]> } : {});\n` +
    `declare function __paraFromSchema<S>(s: () => S): __ParaSchemaValue<S>;`;
  return helper + "\n" + source;
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

  // Run the match-block transform on the masked source. Body close is
  // found by depth-balanced scan from the opening `{` — the older
  // regex (`[\s\S]*?\n\s*\}`) couldn't terminate a single-line
  // `match e { ... }` and swallowed the enclosing function's closing
  // brace, which made tsc parse past EOF in `parabun check`.
  const replacements: { start: number; end: number; replacement: string }[] = [];
  const re = /\bmatch\s+([^{]+?)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked)) !== null) {
    const openIdx = m.index + m[0].length - 1;
    let depth = 1;
    let j = openIdx + 1;
    while (j < masked.length && depth > 0) {
      const ch = masked[j];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      j++;
    }
    if (depth !== 0) continue;
    const closeIdx = j - 1;
    const subjStart = m.index + "match".length;
    const subjEnd = m.index + m[0].length - 1;
    const subjOrig = source.slice(subjStart, subjEnd).trim();
    replacements.push({
      start: m.index,
      end: closeIdx + 1,
      replacement: `((__m: any): any => null as any)(${subjOrig})`,
    });
    re.lastIndex = closeIdx + 1;
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
