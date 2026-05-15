/**
 * pui-transform — the `.pui` → typed-TSX transform + sourcemap mapper used
 * by parabun-lsp for in-`.pui` type intelligence (LYK-880 Slice B).
 *
 * Bundled to a single self-contained server/parabun-pui-transform.js via
 * editors/lsp/esbuild-pui-transform.mjs (svelte2tsx + svelte compiler +
 * @lyku/para-preprocess + @jridgewell/trace-mapping inlined) so the LSP
 * `require()`s one file instead of copy-assets recursively shipping
 * svelte's whole node_modules tree.
 *
 * Pipeline mirrors editors/ts-plugin/src/pui2tsx.ts but with
 * `linePreserving` lowering (so svelte2tsx's generated→source map composes
 * line-accurately back to the raw .pui) and an exposed position mapper.
 */

import { svelte2tsx } from "svelte2tsx";
import { lowerPuiReactivity } from "@lyku/para-preprocess";
import { TraceMap, originalPositionFor, generatedPositionFor } from "@jridgewell/trace-mapping";

const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

export interface PuiTransform {
  /** svelte2tsx output — what the TS service type-checks. */
  code: string;
  /** raw .pui (line,character 0-based) → generated TSX position, or null. */
  toGenerated(line: number, character: number): { line: number; character: number } | null;
  /** generated TSX (line,character 0-based) → raw .pui position, or null. */
  toOriginal(line: number, character: number): { line: number; character: number } | null;
}

/**
 * Transform raw `.pui` source to typed TSX with a bidirectional
 * line-accurate position mapper. `linePreserving` lowering keeps the
 * lowered Svelte line-aligned with the raw .pui, so svelte2tsx's v3 map
 * (generated ↔ lowered) is also generated ↔ raw at line granularity.
 * Columns on rewritten script lines are approximate until a magic-string
 * lowering map lands (LYK-880 Inc 4).
 */
export function puiTransform(raw: string, filename: string): PuiTransform {
  const lowered = raw.replace(
    SCRIPT_RE,
    (_full, attrs: string, body: string) =>
      `<script${attrs}>${lowerPuiReactivity(body, "@lyku/para-ui", true)}</script>`,
  );
  const out = svelte2tsx(lowered, { filename, isTsFile: true, mode: "ts" });
  const tm = new TraceMap(out.map as never);
  const SOURCE = filename;

  return {
    code: out.code,
    toGenerated(line, character) {
      const g = generatedPositionFor(tm, {
        source: SOURCE,
        line: line + 1,
        column: character,
      });
      if (g.line == null) return null;
      return { line: g.line - 1, character: g.column ?? 0 };
    },
    toOriginal(line, character) {
      const o = originalPositionFor(tm, { line: line + 1, column: character });
      if (o.line == null) return null;
      return { line: o.line - 1, character: o.column ?? 0 };
    },
  };
}
