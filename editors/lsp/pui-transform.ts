/**
 * pui-transform — `.pui` → typed-TSX + bidirectional sourcemap mapper for
 * parabun-lsp in-`.pui` type intelligence (LYK-880 Slice B).
 *
 * Two real v3 maps, chained for column-accurate mapping:
 *   raw .pui  --lowering map (magic-string)-->  lowered Svelte
 *   lowered   --svelte2tsx map-->               generated TSX
 *
 * The lowering is re-implemented here over a whole-file MagicString with
 * segment-preserving overwrites: keywords/punctuation are rewritten while
 * user identifiers and expressions stay in place, so they keep exact
 * column mapping. `effect { body }` rewrites only the opener/closer — the
 * (often large) body is untouched and fully mapped. Where source↔output
 * token order is inherently reordered (the `signal x` bridge, merged
 * `prop` destructure) the line is overwritten whole and is line-accurate
 * (the LSP additionally strips the `__sig_` prefix in hovers).
 *
 * `.code` is asserted byte-identical to @lyku/para-preprocess's proven
 * `lowerPuiReactivity(src,'@lyku/para-ui',true)` by puiLowerParity (test),
 * so the magic-string port is faithful and the generated map trustworthy.
 *
 * Bundled self-contained via esbuild-pui-transform.mjs.
 */

import { svelte2tsx } from "svelte2tsx";
import MagicStringNS from "magic-string";
import { TraceMap, originalPositionFor, generatedPositionFor } from "@jridgewell/trace-mapping";

const MagicString: typeof import("magic-string").default = (MagicStringNS as any).default ?? (MagicStringNS as any);

const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

// Brace-aware: offset just AFTER the `}` matching the `{` at openOffset.
// Skips comments/strings. -1 if unbalanced. (Mirrors para-preprocess.)
function findMatchingBrace(s: string, openOffset: number): number {
  let depth = 1;
  let i = openOffset + 1;
  while (i < s.length && depth > 0) {
    const ch = s[i]!;
    if (ch === "/" && s[i + 1] === "/") {
      const eol = s.indexOf("\n", i);
      i = eol === -1 ? s.length : eol;
      continue;
    }
    if (ch === "/" && s[i + 1] === "*") {
      const end = s.indexOf("*/", i + 2);
      i = end === -1 ? s.length : end + 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      const q = ch;
      i++;
      while (i < s.length && s[i] !== q) {
        if (s[i] === "\\") i++;
        i++;
      }
      i++;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    i++;
  }
  return depth === 0 ? i : -1;
}

interface LoweredFile {
  code: string;
  /** v3 map: lowered file ↔ raw .pui (sources: [filename]). */
  map: any;
}

/**
 * Lower every `<script>` body's Para keywords in the raw .pui over a
 * whole-file MagicString. Segment-preserving where token order allows;
 * whole-line where it's inherently reordered. linePreserving (imports
 * injected inline) so line counts match raw.
 */
function lowerPuiFileWithMap(raw: string, filename: string): LoweredFile {
  const ms = new MagicString(raw);
  // overwrite, but appendLeft for zero-length ranges (expr ending exactly
  // at line-end with no trailing `;` is common).
  const repl = (start: number, end: number, str: string) => {
    if (start === end) ms.appendLeft(start, str);
    else ms.overwrite(start, end, str);
  };
  // LYK-886: mirrors lowerPuiReactivity's `escapes` byte-for-byte. MUST
  // reach an identical verdict or the editor's type-lowering diverges from
  // the runtime lowering and byte-parity breaks. Matches both keyword
  // (`provide`/`inject` — seen raw here) and desugared (`setContext`/
  // `getContext` — what the build path sees) forms so the verdict is the
  // same whichever a path observes. `body` is the current <script> slice.
  const puiEscapes = (name: string, body: string): boolean => {
    if (/\bsignalOf\b/.test(body)) return true;
    const n = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b(?:setContext|getContext|provide|inject)\\b[^\\n]*\\b${n}\\b`).test(body)) return true;
    if (new RegExp(`\\bexport\\b[^\\n]*\\b${n}\\b`).test(body)) return true;
    return false;
  };
  const signalNames = new Set<string>();
  const svelteImports = new Set<string>();
  let needsSignalImport = false;
  let firstBodyStart = -1;
  const bodyRanges: Array<[number, number]> = [];

  SCRIPT_RE.lastIndex = 0;
  let sm: RegExpExecArray | null;
  while ((sm = SCRIPT_RE.exec(raw)) !== null) {
    const bodyStart = sm.index + sm[0].indexOf(">", 1) + 1;
    const bodyEnd = sm.index + sm[0].length - "</script>".length;
    const body = raw.slice(bodyStart, bodyEnd);
    if (firstBodyStart === -1) firstBodyStart = bodyStart;
    bodyRanges.push([bodyStart, bodyEnd]);

    // ── effect { body } → $effect(() => { body }) ───────────────────────
    // Overwrite opener + matching close only; body stays mapped.
    {
      const re = /(^|[^\w$.])effect\s*\{/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(body)) !== null) {
        const kwStart = bodyStart + m.index + (m[1] ? m[1].length : 0);
        const braceStart = bodyStart + re.lastIndex - 1;
        const braceEnd = findMatchingBrace(raw, braceStart);
        if (braceEnd === -1) continue;
        repl(kwStart, braceStart + 1, "$effect(() => {");
        repl(braceEnd - 1, braceEnd, "})");
        re.lastIndex = braceEnd - bodyStart;
      }
    }

    // ── mount { body } → onMount(() => { body }) ────────────────────────
    // Same opener/closer-only rewrite as effect; body stays mapped. Needs
    // the `onMount` runtime import (added below). `[^\w$.]` lead guard
    // means a hand-authored `onMount {` never re-matches.
    {
      const re = /(^|[^\w$.])mount\s*\{/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(body)) !== null) {
        const kwStart = bodyStart + m.index + (m[1] ? m[1].length : 0);
        const braceStart = bodyStart + re.lastIndex - 1;
        const braceEnd = findMatchingBrace(raw, braceStart);
        if (braceEnd === -1) continue;
        repl(kwStart, braceStart + 1, "onMount(() => {");
        repl(braceEnd - 1, braceEnd, "})");
        svelteImports.add("onMount");
        re.lastIndex = braceEnd - bodyStart;
      }
    }

    // Per-line passes. Recompute line offsets against raw (effect overwrite
    // doesn't move line starts: opener/closer lines keep their newline).
    const lineStarts: number[] = [bodyStart];
    for (let k = bodyStart; k < bodyEnd; k++) if (raw[k] === "\n") lineStarts.push(k + 1);

    for (const ls of lineStarts) {
      let le = raw.indexOf("\n", ls);
      if (le === -1 || le > bodyEnd) le = bodyEnd;
      const lineText = raw.slice(ls, le);

      // derived NAME = EXPR → const NAME = $derived(EXPR)  (order preserved)
      let d = lineText.match(/^(\s*)derived\s+(\w+)((?:\s*:\s*[^=]+)?)\s*=\s*(.+?)\s*;?\s*$/);
      if (d) {
        const indent = d[1]!;
        const nameRel = lineText.indexOf(d[2]!, indent.length);
        const nameAbs = ls + nameRel;
        const exprRel = lineText.lastIndexOf(d[4]!);
        const exprAbs = ls + exprRel;
        repl(ls, nameAbs, `${indent}const `);
        repl(nameAbs + d[2]!.length, exprAbs, ` = $derived(`);
        repl(exprAbs + d[4]!.length, le, `);`);
        continue;
      }

      // provide NAME = EXPR → setContext("NAME", EXPR)
      let pv = lineText.match(/^(\s*)provide\s+(\w+)(?:\s*:\s*[^=]+)?\s*=\s*(.+?)\s*;?\s*$/);
      if (pv) {
        svelteImports.add("setContext");
        const indent = pv[1]!;
        const exprRel = lineText.lastIndexOf(pv[3]!);
        repl(ls, ls + exprRel, `${indent}setContext(${JSON.stringify(pv[2]!)}, `);
        repl(ls + exprRel + pv[3]!.length, le, `);`);
        continue;
      }

      // inject NAME: TYPE → const NAME: TYPE = getContext("NAME")
      let ij = lineText.match(/^(\s*)inject\s+(\w+)\s*:\s*(.+?)\s*;?\s*$/);
      if (ij) {
        svelteImports.add("getContext");
        const indent = ij[1]!;
        repl(ls, le, `${indent}const ${ij[2]!}: ${ij[3]!.trim()} = getContext(${JSON.stringify(ij[2]!)});`);
        continue;
      }

      // using NAME = EXPR → const NAME = EXPR; onDestroy(() => NAME.dispose?.())
      let us = lineText.match(/^(\s*)using\s+(\w+)(?:\s*:\s*[^=]+)?\s*=\s*(.+?)\s*;?\s*$/);
      if (us) {
        svelteImports.add("onDestroy");
        const indent = us[1]!;
        const name = us[2]!;
        const exprRel = lineText.lastIndexOf(us[3]!);
        repl(ls, ls + exprRel, `${indent}const ${name} = `);
        repl(ls + exprRel + us[3]!.length, le, `; onDestroy(() => ${name}.dispose?.());`);
        continue;
      }

      // signal NAME = EXPR → bridge (source↔output reordered → whole-line).
      let sg = lineText.match(/^(\s*)signal\s+(\w+)(?:\s*:\s*[^=]+)?\s*=\s*(.+?)\s*;?\s*$/);
      if (sg) {
        const indent = sg[1]!;
        const name = sg[2]!;
        const expr = sg[3]!;
        // LYK-886: provably component-local → plain `$state`, no bridge.
        // NOT added to signalNames (so the __sig_ assignment-rewrite +
        // signal import are skipped for this name), matching the build
        // path with linePreserving=true.
        if (!puiEscapes(name, body)) {
          repl(ls, le, `${indent}let ${name} = $state(${expr});`);
          continue;
        }
        signalNames.add(name);
        needsSignalImport = true;
        repl(
          ls,
          le,
          `${indent}const __sig_${name} = signal(${expr}); ` +
            `let ${name} = $state(__sig_${name}.peek()); ` +
            `$effect.pre(() => __sig_${name}.subscribe((__v: typeof ${name}) => { ${name} = __v; }));`,
        );
        continue;
      }
    }

    // prop NAME: TYPE [= DEF] → merged single `let { … } = $props()` at the
    // first prop line; later prop lines blanked. Reordered/merged → not
    // token-faithful; line-accurate.
    {
      const propLines: Array<{ ls: number; le: number; indent: string; name: string; type: string; def?: string }> = [];
      for (const ls of lineStarts) {
        let le = raw.indexOf("\n", ls);
        if (le === -1 || le > bodyEnd) le = bodyEnd;
        const m = raw.slice(ls, le).match(/^(\s*)prop\s+(\w+)(?:\s*:\s*([^=\n]+?))?\s*(?:=\s*(.+?))?\s*;?\s*$/);
        if (!m || !m[2]) continue;
        propLines.push({ ls, le, indent: m[1] ?? "", name: m[2], type: (m[3] ?? "any").trim(), def: m[4]?.trim() });
      }
      if (propLines.length) {
        const dParts = propLines.map(p => (p.def !== undefined ? `${p.name} = ${p.def}` : p.name));
        const tParts = propLines.map(p => (p.def !== undefined ? `${p.name}?: ${p.type}` : `${p.name}: ${p.type}`));
        const merged = `${propLines[0]!.indent}let { ${dParts.join(", ")} }: { ${tParts.join("; ")} } = $props();`;
        repl(propLines[0]!.ls, propLines[0]!.le, merged);
        for (let k = 1; k < propLines.length; k++) repl(propLines[k]!.ls, propLines[k]!.le, "");
      }
    }
  }

  // Assignment rewrite: `NAME = EXPR` → `__sig_NAME.set(EXPR)` for known
  // signals, skipping the bridge decl line. Scan raw lines (line-anchored;
  // unaffected by prior overwrites since those changed only matched lines).
  if (signalNames.size) {
    let off = 0;
    for (const lineText of raw.split("\n")) {
      const ls = off;
      const le = off + lineText.length;
      off = le + 1;
      // Only rewrite assignment lines inside a <script> body (original
      // lowerPuiReactivity ran per-body; markup must stay untouched).
      if (!bodyRanges.some(([s, e]) => ls >= s && le <= e)) continue;
      for (const name of signalNames) {
        if (lineText.includes(`const __sig_${name}`)) continue;
        const m = lineText.match(new RegExp(`^(\\s*)${name}\\s*=\\s*(.+?)\\s*;?\\s*$`));
        if (!m || m[2] === undefined) continue;
        const indent = m[1]!;
        const exprRel = lineText.lastIndexOf(m[2]!);
        try {
          repl(ls, ls + exprRel, `${indent}__sig_${name}.set(`);
          repl(ls + exprRel + m[2]!.length, le, `);`);
        } catch {
          /* overlaps a decl we already rewrote — skip */
        }
        break;
      }
    }
  }

  // Inline import injection (linePreserving: no newline → line count ==
  // raw). lowerPuiReactivity prepends the signal import FIRST then the
  // svelte imports SECOND, so the svelte imports end up before the signal
  // import in the final string — mirror that order here for byte-parity.
  let prefix = "";
  if (svelteImports.size) {
    prefix += `import { ${[...svelteImports].join(", ")} } from "@lyku/para-ui"; `;
  }
  if (needsSignalImport && !/from\s+['"]@para\/signals['"]/.test(raw)) {
    prefix += `import { signal } from "@lyku/para-signals"; `;
  }
  // Insert imports at the start of the first <script> body (inside the
  // tag), inline — matches lowerPuiReactivity, keeps line count == raw.
  if (prefix && firstBodyStart >= 0) ms.appendLeft(firstBodyStart, prefix);

  return {
    code: ms.toString(),
    map: ms.generateMap({ source: filename, hires: true, includeContent: false }),
  };
}

export interface PuiTransform {
  code: string;
  toGenerated(line: number, character: number): { line: number; character: number } | null;
  toOriginal(line: number, character: number): { line: number; character: number } | null;
}

export function puiTransform(raw: string, filename: string): PuiTransform {
  const low = lowerPuiFileWithMap(raw, filename);
  const out = svelte2tsx(low.code, { filename, isTsFile: true, mode: "ts" });

  const sv = new TraceMap(out.map as never); // generated ↔ lowered
  const lo = new TraceMap(low.map as never); // lowered ↔ raw
  const SOURCE = filename;
  const LOWERED = filename + ".lowered";

  return {
    code: out.code,
    toGenerated(line, character) {
      // raw → lowered → generated
      const l = generatedPositionFor(lo, { source: SOURCE, line: line + 1, column: character });
      if (l.line == null) return null;
      const g = generatedPositionFor(sv, { source: LOWERED, line: l.line, column: l.column ?? 0 });
      if (g.line == null) {
        // svelte2tsx labels its source by `filename`, not `.lowered`;
        // retry with the actual source name.
        const g2 = generatedPositionFor(sv, { source: SOURCE, line: l.line, column: l.column ?? 0 });
        if (g2.line == null) return null;
        return { line: g2.line - 1, character: g2.column ?? 0 };
      }
      return { line: g.line - 1, character: g.column ?? 0 };
    },
    toOriginal(line, character) {
      // generated → lowered → raw
      const l = originalPositionFor(sv, { line: line + 1, column: character });
      if (l.line == null) return null;
      const o = originalPositionFor(lo, { line: l.line, column: l.column ?? 0 });
      if (o.line == null) return null;
      return { line: o.line - 1, character: o.column ?? 0 };
    },
  };
}

/** Test hook: lowered code only (for byte-parity vs lowerPuiReactivity). */
export function _puiLoweredCode(raw: string, filename = "x.pui"): string {
  return lowerPuiFileWithMap(raw, filename).code;
}
