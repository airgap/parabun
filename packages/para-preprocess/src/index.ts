import type { PreprocessorGroup, Processed } from "svelte/compiler";

export type ParabunPreprocessOptions = {
  /**
   * Which `<script lang="...">` values should be treated as Parabun.
   * Defaults to ["parabun", "pts", "pjs"].
   */
  langs?: string[];
  /**
   * Also transform plain `<script>` blocks (no `lang`) and `<script lang="ts">`.
   * Useful if you want every script to go through the Parabun transpiler so
   * files can freely use Parabun operators without annotating each block.
   */
  all?: boolean;
  /**
   * Which runtime to emit injected imports against (`setContext`,
   * `getContext`, `onDestroy`, etc. — used by `provide`/`inject`/`using`
   * keyword lowering).
   *
   * - `"@lyku/para-ui"` (default): targets the Para UI fork
   *   (packages/para-svelte/packages/svelte). Para signals run at the
   *   reactive core; `signalOf()` is available. Consumers must have
   *   `@lyku/para-ui` resolvable (currently workspace-only — see
   *   PARA-FORK.md).
   * - `"svelte"`: targets unmodified Svelte from npm. The escape hatch
   *   for projects that haven't wired the fork yet. The lowering still
   *   uses `$state`/`$derived`/`$effect`; the only difference is the
   *   import specifier.
   */
  runtime?: "@lyku/para-ui" | "svelte";
  /**
   * Emit the dev/HMR `signal` bridge form: each `signal x = …` becomes
   * `import.meta.hot ? hmrSignal("<module>::x", () => signal(…)) :
   * signal(…)`. On a vite HMR module re-eval the registry returns the
   * SAME signal instance, so its current value + subscribers survive the
   * reload (component state doesn't reset on save). No-op in prod
   * (import.meta.hot is undefined → plain signal()). Off by default; the
   * editor/LSP path leaves it off so the type-relevant lowering stays
   * byte-identical (pui-transform parity).
   */
  hmr?: boolean;
};

const DEFAULT_LANGS = ["parabun", "pts", "pjs"];

function pickLoader(lang: string | undefined): "ts" | "tsx" | "jsx" {
  switch (lang) {
    case "pts":
    case "parabun":
    case "ts":
    case undefined:
      return "ts";
    case "ptsx":
    case "tsx":
      return "tsx";
    case "pjs":
    case "pjsx":
    case "jsx":
      return "jsx";
    default:
      return "ts";
  }
}

// The preprocessor runs in two very different environments:
//   - Build time: SvelteKit + Vite under `parabun`, where `Bun.Transpiler`
//     is available and we transpile parabun → standard TS.
//   - Editor time: `svelte-language-server` / `svelte-check` under Node,
//     where `Bun` is undefined. Calling `new Bun.Transpiler(...)` there
//     throws `ReferenceError: Bun is not defined`, which Svelte surfaces
//     as a diagnostic on the offending line, and the downstream TS service
//     then treats the script as JS (emitting TS8010 on every type
//     annotation).
//
// When Bun isn't available we relabel the block as `lang="ts"` and pass
// the original content through unchanged. The Svelte LSP type-checks it
// as TS, which works for any parabun script that's a syntactic TS subset;
// parabun-specific syntax (`..!`, `|>`, `pure`, etc.) is left to the
// parabun LSP, which runs in parallel via its own VSCode extension.
const HAS_BUN_TRANSPILER = typeof (globalThis as { Bun?: { Transpiler?: unknown } }).Bun?.Transpiler === "function";

// ---------------------------------------------------------------------------
// `.pui`-specific lowerings for the para reactive keywords. These keywords
// have their own meaning in para's core language, but inside a `.pui`
// component they need to bridge to Svelte's reactivity so the template
// re-renders. Each lowering produces standard TS so the downstream Svelte
// compiler sees something it understands.
//
// `signal X = Y` →
//     const __sig_X = signal(Y);
//     let X = $state(__sig_X.peek());
//     $effect.pre(() => { X = __sig_X.get(); });
//
// `X = Z` (where X is a known signal) → `__sig_X.set(Z);`
//
// v1 is regex-based; handles simple single-line declarations and
// assignments. Multi-declarator forms (`signal a = 1, b = 2`) and
// destructured assignments are explicit follow-up.
// ---------------------------------------------------------------------------

// Brace-aware scan: given the offset of an opening `{`, return the offset
// just AFTER its matching `}`. Skips braces inside strings, templates, and
// line/block comments. Returns -1 if unmatched.
function findMatchingBrace(source: string, openOffset: number): number {
  let depth = 1;
  let i = openOffset + 1;
  while (i < source.length && depth > 0) {
    const ch = source[i]!;
    // Line comment
    if (ch === "/" && source[i + 1] === "/") {
      const eol = source.indexOf("\n", i);
      i = eol === -1 ? source.length : eol;
      continue;
    }
    // Block comment
    if (ch === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end === -1 ? source.length : end + 2;
      continue;
    }
    // Strings (basic — doesn't handle template-literal `${}` nesting)
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      i++;
      while (i < source.length && source[i] !== quote) {
        if (source[i] === "\\") i++;
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

function lowerEffectBlocks(source: string): string {
  // `effect { body }` → `$effect(() => { body })`. Brace-aware so nested
  // braces inside the body don't terminate early.
  let out = "";
  let i = 0;
  const re = /(^|[^\w$.])effect\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const kwStart = m.index + (m[1] ? m[1].length : 0);
    const braceStart = re.lastIndex - 1; // position of `{`
    const braceEnd = findMatchingBrace(source, braceStart);
    if (braceEnd === -1) continue;
    out += source.slice(i, kwStart);
    const body = source.slice(braceStart + 1, braceEnd - 1);
    out += `$effect(() => {${body}})`;
    i = braceEnd;
    re.lastIndex = braceEnd;
  }
  out += source.slice(i);
  return out;
}

function lowerMountBlocks(source: string): { code: string; needsOnMount: boolean } {
  // `mount { body }` → `onMount(() => { body })`. Brace-aware (same
  // matcher shape as lowerEffectBlocks) so nested braces / object
  // literals / a returned cleanup arrow don't terminate early. The
  // `[^\w$.]` lead guard means `onMount {` (preceding char `n` is
  // `\w`) never re-matches, so this is safe to run alongside a
  // hand-authored `onMount(...)`. Unlike `effect {}` (a rune, no
  // import) this needs `onMount` from the runtime — reported via
  // needsOnMount so the import-injection pass can add it.
  let out = "";
  let i = 0;
  let needs = false;
  const re = /(^|[^\w$.])mount\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const kwStart = m.index + (m[1] ? m[1].length : 0);
    const braceStart = re.lastIndex - 1; // position of `{`
    const braceEnd = findMatchingBrace(source, braceStart);
    if (braceEnd === -1) continue;
    out += source.slice(i, kwStart);
    const body = source.slice(braceStart + 1, braceEnd - 1);
    out += `onMount(() => {${body}})`;
    needs = true;
    i = braceEnd;
    re.lastIndex = braceEnd;
  }
  out += source.slice(i);
  return { code: out, needsOnMount: needs };
}

function lowerDerivedDecls(source: string): string {
  // `derived NAME = EXPR` → `const NAME = $derived(EXPR)`. Simple
  // single-line form only for v1; multi-line expression bodies need a
  // smarter matcher (Phase 1 follow-up).
  const declRe = /^(\s*)derived\s+(\w+)(?:\s*:\s*[^=]+)?\s*=\s*(.+?)\s*;?\s*$/gm;
  return source.replace(declRe, (_full, indent, name, expr) => {
    return `${indent}const ${name} = $derived(${expr});`;
  });
}

function lowerPropDecls(source: string): string {
  // `prop NAME: TYPE` / `prop NAME: TYPE = DEFAULT` declarations merge
  // into a single `let { ... }: { ... } = $props()` destructure, emitted
  // at the position of the first prop. Svelte 5 expects exactly one
  // $props() call per component, so collecting + merging is the only
  // shape the compiler accepts. Subsequent prop lines become blank to
  // preserve overall line numbering.
  const lines = source.split("\n");
  const declRe = /^(\s*)prop\s+(\w+)(?:\s*:\s*([^=\n]+?))?\s*(?:=\s*(.+?))?\s*;?\s*$/;
  const props: Array<{ lineIdx: number; indent: string; name: string; type: string; default?: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i]!.match(declRe);
    if (!m) continue;
    const [, indent, name, type, def] = m;
    if (!name) continue;
    props.push({
      lineIdx: i,
      indent: indent ?? "",
      name,
      type: (type ?? "any").trim(),
      default: def?.trim(),
    });
  }
  if (props.length === 0) return source;

  const destructParts = props.map(p => (p.default !== undefined ? `${p.name} = ${p.default}` : p.name));
  const typeParts = props.map(p => (p.default !== undefined ? `${p.name}?: ${p.type}` : `${p.name}: ${p.type}`));
  const merged = `let { ${destructParts.join(", ")} }: { ${typeParts.join("; ")} } = $props();`;

  lines[props[0]!.lineIdx] = `${props[0]!.indent}${merged}`;
  for (let i = 1; i < props.length; i++) lines[props[i]!.lineIdx] = "";
  return lines.join("\n");
}

function lowerProvideInject(source: string): { code: string; imports: Set<string> } {
  // `provide NAME = EXPR` → `setContext("NAME", EXPR)`
  // `inject NAME: TYPE` → `const NAME: TYPE = getContext("NAME")`
  // String-keyed for v1; workspace-scoped typed-key registry is a follow-up
  // (see LYK-848 description).
  const imports = new Set<string>();
  const provideRe = /^(\s*)provide\s+(\w+)(?:\s*:\s*[^=]+)?\s*=\s*(.+?)\s*;?\s*$/gm;
  let code = source.replace(provideRe, (_full, indent, name, expr) => {
    imports.add("setContext");
    return `${indent}setContext(${JSON.stringify(name)}, ${expr});`;
  });
  const injectRe = /^(\s*)inject\s+(\w+)\s*:\s*(.+?)\s*;?\s*$/gm;
  code = code.replace(injectRe, (_full, indent, name, type) => {
    imports.add("getContext");
    return `${indent}const ${name}: ${type.trim()} = getContext(${JSON.stringify(name)});`;
  });
  return { code, imports };
}

function lowerUsingDecls(source: string): { code: string; needsOnDestroy: boolean } {
  // `using NAME = EXPR` → `const NAME = EXPR; onDestroy(() => NAME.dispose?.())`
  // Auto-disposes the resource on component unmount. para resources
  // expose `.dispose()` and Symbol.dispose; we call `.dispose()` (the
  // friendlier name) with optional chaining so values that don't have
  // it (handled non-disposable resources) don't crash unmount.
  let needs = false;
  const re = /^(\s*)using\s+(\w+)(?:\s*:\s*[^=]+)?\s*=\s*(.+?)\s*;?\s*$/gm;
  const code = source.replace(re, (_full, indent, name, expr) => {
    needs = true;
    return `${indent}const ${name} = ${expr}; onDestroy(() => ${name}.dispose?.());`;
  });
  return { code, needsOnDestroy: needs };
}

/**
 * LYK-886 escape analysis (hardened: per-name `signalOf` precision).
 *
 * Builds the "does this signal name escape the component?" predicate for a
 * `.pui` `<script>` body. A `signal x` only needs the para bridge (extra
 * para signal + cross-system subscribe effect) when external para code can
 * observe it via `signalOf`, or it leaves via component context / `export`.
 * Otherwise it lowers to a plain `$state` cell (~1.84× faster, ~2.3× less
 * heap at whole-component scale — it deletes a whole signal + effect per
 * local cell; survives render cost where LYK-884's backend-swap washed out).
 *
 * Single shared implementation: imported by both this build path and the
 * editor's pui-transform.ts, so editor↔build parity is structural (one
 * function), not byte-mirrored copies. The build path passes `source` after
 * provide/inject have desugared to setContext/getContext; the editor passes
 * the raw `<script>` body where they're still keywords — the context regex
 * matches BOTH forms so the verdict is identical regardless of caller.
 *
 * CONSERVATIVE BY DESIGN: the fallback is the proven-correct bridge, so an
 * over-eager inline is a correctness bug (external para observers silently
 * go stale). Precise for the traceable forms; falls back to the coarse
 * "all names escape" gate only when `signalOf` is called with an argument
 * we cannot statically resolve to a name.
 */
export function buildEscapeChecker(source: string): (name: string) => boolean {
  // Identifiers passed directly to signalOf(...). signalOf is THE
  // para-handle API — calling it on a cell is the explicit "keep this
  // para-observable" intent that forces the bridge.
  const signalOfd = new Set<string>();
  let untraceable = false; // signalOf(<non-identifier>) → can't trace
  for (const m of source.matchAll(/\bsignalOf\s*\(\s*([^)]*?)\s*\)/g)) {
    const arg = (m[1] ?? "").trim();
    if (/^[A-Za-z_$][\w$]*$/.test(arg)) signalOfd.add(arg);
    else untraceable = true;
  }
  // Simple identifier aliases `const|let|var L = R;`. Fixpoint so a name
  // aliased into a signalOf'd binding (including chains) also escapes —
  // closes the `const y = x; signalOf(y)` hole without full AST analysis.
  const aliases: Array<[string, string]> = [];
  for (const m of source.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*;?/g)) {
    aliases.push([m[1]!, m[2]!]);
  }
  for (let grew = true; grew; ) {
    grew = false;
    for (const [l, r] of aliases) {
      if (signalOfd.has(l) && !signalOfd.has(r)) {
        signalOfd.add(r);
        grew = true;
      }
    }
  }
  return (name: string): boolean => {
    if (untraceable) return true; // unresolvable signalOf arg → keep bridge for all (safe)
    if (signalOfd.has(name)) return true;
    const n = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b(?:setContext|getContext|provide|inject)\\b[^\\n]*\\b${n}\\b`).test(source)) return true;
    if (new RegExp(`\\bexport\\b[^\\n]*\\b${n}\\b`).test(source)) return true;
    return false;
  };
}

/**
 * Lower a `.pui` `<script>` body's Para reactive keywords (signal / derived /
 * effect / mount / prop / provide / inject / using) to standard Svelte 5 runes.
 * Synchronous and side-effect-free — safe to call from a TS language-service
 * plugin or any tooling that needs the type-relevant transform without the
 * full async PreprocessorGroup. The operator desugars (`..!`, `|>`, `pure`)
 * are NOT applied here (they're Bun.Transpiler's job and don't change the
 * component's type surface). Exported for `pui2tsx` / editor tooling.
 *
 * `linePreserving` (editor/LSP use): inject the @lyku/para-signals +
 * runtime imports WITHOUT a trailing newline, so the lowered output has
 * the exact same line count as the input. The build path leaves it off
 * (own-line imports read cleaner in generated code; the Svelte compiler
 * doesn't care about line parity). With it on, the only residual
 * input→output divergence is intra-line column shift on rewritten lines,
 * which keeps svelte2tsx-sourcemap composition line-accurate.
 */
export function lowerPuiReactivity(
  source: string,
  runtime: "@lyku/para-ui" | "svelte" = "@lyku/para-ui",
  linePreserving = false,
  hmr = false,
): string {
  // Effect blocks first (brace-aware) so subsequent regex passes don't
  // accidentally chew the rewritten `$effect(() => {...})` body.
  source = lowerEffectBlocks(source);
  const mountResult = lowerMountBlocks(source);
  source = mountResult.code;
  source = lowerDerivedDecls(source);
  source = lowerPropDecls(source);

  const provideInject = lowerProvideInject(source);
  source = provideInject.code;

  const usingResult = lowerUsingDecls(source);
  source = usingResult.code;

  // Aggregate Svelte imports needed by the lowerings above. provide/inject
  // contributes setContext/getContext; using contributes onDestroy.
  const svelteImports = new Set<string>(provideInject.imports);
  if (usingResult.needsOnDestroy) svelteImports.add("onDestroy");
  if (mountResult.needsOnMount) svelteImports.add("onMount");

  // LYK-886 escape analysis. A `signal x` only needs the para bridge
  // (extra para signal + cross-system subscribe effect) if external para
  // code can observe it via `signalOf`. When `x` provably never escapes
  // the component we lower it to a plain `$state` cell instead — measured
  // ~1.84× faster + ~2.3× less heap at whole-component scale because it
  // deletes a whole signal + a whole effect per local cell (it removes
  // work, unlike the rejected LYK-884 backend-swap which washed out).
  //
  // CONSERVATIVE BY DESIGN: the fallback is the proven-correct bridge, so
  // an over-eager inline would be a correctness bug (external para
  // observers would silently stop seeing updates). We only inline when
  // certain. v1 escape vectors (keep the bridge if ANY hold):
  //   - `signalOf` appears anywhere in the script. Coarse file-level gate
  //     — signalOf in a .pui is the rare escape hatch; when present the
  //     whole file keeps today's behavior (zero regression). Per-name
  //     precision is a documented later refinement.
  //   - the name flows into component context (`setContext(`/`getContext(`
  //     — provide/inject already desugared to these by this point).
  //   - the name appears in an `export` (belt-and-suspenders: exporting a
  //     value isn't a para-observe, but cheap to be extra safe).
  // NB: this predicate is mirrored byte-for-byte in editors/lsp
  // pui-transform.ts (puiEscapes). It must reach an IDENTICAL verdict in
  // both paths or the editor's type-lowering diverges from the runtime
  // lowering and the byte-parity test fails. It therefore matches BOTH
  // the keyword forms (`provide`/`inject`, which the editor path still
  // sees raw) AND their desugared forms (`setContext`/`getContext`, which
  // this build path has already lowered by now) — whichever a given path
  // observes, the verdict is the same. The checker is the single shared
  // implementation imported by pui-transform.ts too, so editor↔build
  // parity is structural (one function), not hand-maintained copies.
  const escapes = buildEscapeChecker(source);

  const signalNames = new Set<string>();
  const lines = source.split("\n");
  // Match: optional indent, "signal", whitespace, identifier, optional
  // type annotation, "=", expression, optional trailing semicolon. The
  // expression is non-greedy up to end-of-line so we don't accidentally
  // pull in subsequent statements separated by `;` on the same line.
  const declRe = /^(\s*)signal\s+(\w+)(?:\s*:\s*[^=]+)?\s*=\s*(.+?)\s*;?\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const m = line.match(declRe);
    if (!m) continue;
    const [, indent, name, expr] = m;
    if (!name || expr === undefined) continue;

    // LYK-886: provably component-local → plain `$state`, no para bridge.
    // Assignments stay as-is (`$state` is natively reactive), so this name
    // is deliberately NOT added to signalNames (which drives the
    // `__sig_NAME.set()` rewrite + the @lyku/para-signals import).
    if (!escapes(name)) {
      lines[i] = `${indent}let ${name} = $state(${expr});`;
      continue;
    }

    signalNames.add(name);
    // Bridge form: a para signal lives alongside a $state cell. The
    // $effect.pre subscribes ACROSS the systems — para's .subscribe()
    // creates a para effect that synchronously runs the callback on
    // every set(), and the callback writes into Svelte's $state
    // (which then drives DOM updates the normal way). The cleanup
    // returned by .subscribe() runs on effect teardown (component
    // unmount) so the subscription doesn't leak.
    // In `hmr` mode the signal is allocated through the globalThis
    // registry keyed by module-url + name, so a vite HMR re-eval of
    // this module returns the SAME instance — current value + existing
    // subscribers survive the reload instead of resetting to `expr`.
    // Gated on `import.meta.hot` so a prod build (no hot) takes the
    // plain `signal(expr)` arm and never touches the registry.
    const make = hmr
      ? `(import.meta.hot ? hmrSignal(import.meta.url + "::${name}", () => signal(${expr})) : signal(${expr}))`
      : `signal(${expr})`;
    lines[i] =
      `${indent}const __sig_${name} = ${make}; ` +
      `let ${name} = $state(__sig_${name}.peek()); ` +
      `$effect.pre(() => __sig_${name}.subscribe((__v: typeof ${name}) => { ${name} = __v; }));`;
  }

  // Rewrite simple `NAME = EXPR;` assignment lines into `__sig_NAME.set(EXPR);`
  // for each declared signal. Skip the declaration line (it now starts with
  // `const __sig_NAME =`) and only match standalone-assignment lines.
  for (const name of signalNames) {
    const assignRe = new RegExp(`^(\\s*)${name}\\s*=\\s*(.+?)\\s*;?\\s*$`);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (line.includes(`const __sig_${name}`)) continue;
      const m = line.match(assignRe);
      if (!m) continue;
      const [, indent, expr] = m;
      if (expr === undefined) continue;
      lines[i] = `${indent}__sig_${name}.set(${expr});`;
    }
  }

  let result = lines.join("\n");

  // Inject @lyku/para-signals import if any signals declared and not already
  // imported. Prepended as its own line — adds 1 to all subsequent line
  // numbers from the user's view, which is acceptable for v1; downstream
  // Svelte compiler diagnostics will be offset by 1.
  const importSep = linePreserving ? " " : "\n";
  if (signalNames.size > 0 && !/from\s+['"]@para\/signals['"]/.test(result)) {
    const names = hmr ? "signal, hmrSignal" : "signal";
    result = `import { ${names} } from "@lyku/para-signals";${importSep}` + result;
  }

  // Inject extra runtime imports (setContext/getContext from provide/inject,
  // onDestroy from `using`). Dedup against either runtime spelling so a hand-
  // authored `import {...} from "@lyku/para-ui"` already in the script doesn't get
  // shadowed by an emitted `from "svelte"` and vice versa.
  if (svelteImports.size > 0) {
    const existing = new Set<string>();
    const importRe = /import\s*\{([^}]+)\}\s*from\s+['"](?:svelte|@lyku\/para-ui)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = importRe.exec(result)) !== null) {
      for (const name of m[1]!.split(",")) existing.add(name.trim().split(/\s+as\s+/)[0]!);
    }
    const toAdd = [...svelteImports].filter(n => !existing.has(n));
    if (toAdd.length > 0) {
      result = `import { ${toAdd.join(", ")} } from "${runtime}";${importSep}` + result;
    }
  }

  return result;
}

export function parabunPreprocess(opts: ParabunPreprocessOptions = {}): PreprocessorGroup {
  const langs = new Set(opts.langs ?? DEFAULT_LANGS);
  const runtime: "@lyku/para-ui" | "svelte" = opts.runtime ?? "@lyku/para-ui";
  // Default the HMR bridge form on in dev, off in prod. vite sets
  // NODE_ENV=development for the dev server and production for `build`,
  // so signal identity survives save-reload in dev without bloating the
  // prod bundle. Still double-guarded at runtime by `import.meta.hot`.
  const hmr = opts.hmr ?? process.env.NODE_ENV !== "production";
  const transpilerCache = new Map<string, Bun.Transpiler>();

  const getTranspiler = (loader: "ts" | "tsx" | "jsx") => {
    let t = transpilerCache.get(loader);
    if (!t) {
      t = new Bun.Transpiler({ loader });
      transpilerCache.set(loader, t);
    }
    return t;
  };

  return {
    name: "parabun",
    script({ content, attributes, filename }): Processed | undefined {
      const lang = typeof attributes.lang === "string" ? attributes.lang : undefined;
      // `.pui` files are parabun-flavored by extension: every script
      // block runs through the parabun pipeline regardless of `lang`, since
      // the filename itself is the marker. For plain `.svelte`, the
      // `langs`/`opts.all` filter governs as before.
      const isPui = filename?.endsWith(".pui") ?? false;
      const shouldRun = isPui
        ? true
        : opts.all
          ? lang === undefined || lang === "ts" || lang === "tsx" || langs.has(lang)
          : lang !== undefined && langs.has(lang);
      if (!shouldRun) return;

      // For `.pui` files, run the para-reactivity lowering first to bridge
      // `signal`/`derived`/`effect` into Svelte runes ($state, $effect).
      // After this pass the content is standard TS, so parabun's own
      // transpile (when running under Bun) sees nothing parabun-specific
      // to transform — it's effectively a passthrough for the bridge form.
      const preprocessed = isPui ? lowerPuiReactivity(content, runtime, false, hmr) : content;
      // Svelte's preprocess loop short-circuits with no_change() when
      // `processed.code === content && !processed.map` (see
      // svelte/compiler/preprocess/index.js process_single_tag) — which
      // would silently drop our `lang: "ts"` rewrite. Append a trailing
      // newline in the Node-fallback path so the code differs by one
      // semantically-inert character and the attribute change is honored.
      const code = HAS_BUN_TRANSPILER
        ? getTranspiler(pickLoader(lang)).transformSync(preprocessed)
        : preprocessed === content
          ? preprocessed + "\n"
          : preprocessed;
      return {
        code,
        attributes: { ...attributes, lang: "ts" },
        dependencies: filename ? [filename] : undefined,
      };
    },
  };
}

export default parabunPreprocess;
