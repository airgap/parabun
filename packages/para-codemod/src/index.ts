// Conservative .svelte → .pui codemod (LYK-901 / C4).
//
// Philosophy: `.pui` is a Svelte superset, so anything we do NOT transform
// stays valid. We therefore only rewrite patterns that are *unambiguously*
// mechanical; anything uncertain is left as raw Svelte (still valid .pui).
// Correctness over coverage — never produce a wrong transform.
//
// Rules (the LYK-901 set, verified against NotificationsPage):
//  1  let x = $state(v)            → signal x = v          (typed: signal x: T = v)
//  2  let x = $state()  (empty)    → signal x[: T|undefined] = undefined
//  3  const x = $derived(E)        → derived x = E   (single-line)
//     const x = $derived(\n…\n)    → derived x { return … }   (multi-line)
//     const x = $derived.by(()=>{B}) → derived x { B }
//  4  const x = $derived($store)   → source x = fromStore(store)  (+import)
//  5  onMount(() => { B })         → mount { B }
//     $effect(() => { B })         → effect { B }
//  6  everything else: untouched (consts/types/fns/template/escape-hatch
//     imports like untrack/tick, custom context accessors).

export interface CodemodResult {
  code: string;
  /** Human-readable notes: what converted, what was left raw and why. */
  notes: string[];
}

const SCRIPT_RE = /<script\b[^>]*>([\s\S]*?)<\/script>/g;

function findMatch(s: string, open: number, oc: string, cc: string): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    const ch = s[i];
    if (ch === oc) depth++;
    else if (ch === cc) {
      depth--;
      if (depth === 0) return i; // index of the closing char
    }
  }
  return -1;
}

function transformScript(body: string, notes: string[]): { code: string; needsFromStore: boolean } {
  let needsFromStore = false;

  // ── Rule 5: onMount(() => { … }) → mount { … } ; $effect → effect ──
  // Sync zero-arg arrow only. async / $effect.pre / non-arrow → left raw.
  body = rewriteCallArrowBlock(body, "onMount", "mount", notes);
  body = rewriteCallArrowBlock(body, "$effect", "effect", notes);

  // ── Per-line passes (state/derived decls) ──
  const out: string[] = [];
  const lines = body.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // ── Rules 3 + 4: unified `const NAME = $derived…` scan ──
    // Paren/brace-matched so single-line, multi-line, object-literal and
    // `.by` forms are all handled; bare `$store` arg → rule 4.
    let m = line.match(/^(\s*)const\s+(\w+)\s*=\s*\$derived(\.by)?\s*\(/);
    if (m) {
      const indent = m[1]!;
      const name = m[2]!;
      const isBy = !!m[3];
      const joined = lines.slice(i).join("\n");
      const openParen = joined.indexOf("(", joined.indexOf("$derived"));
      const closeParen = findMatch(joined, openParen, "(", ")");
      if (closeParen !== -1) {
        const argSpan = joined.slice(openParen + 1, closeParen);
        const consumed = joined.slice(0, closeParen).split("\n").length;
        if (isBy) {
          // $derived.by(() => { BODY })  → derived NAME { BODY }
          const braceStart = joined.indexOf("{", openParen);
          const braceEnd = braceStart === -1 ? -1 : findMatch(joined, braceStart, "{", "}");
          if (braceStart !== -1 && braceEnd !== -1 && braceEnd < closeParen) {
            const inner = joined.slice(braceStart + 1, braceEnd);
            out.push(`${indent}derived ${name} {${inner}`);
            out.push(`${indent}}`);
            i += joined.slice(0, braceEnd).split("\n").length - 1;
            notes.push(`rule3c: const ${name} = $derived.by(()=>{…}) → derived ${name} { … }`);
            continue;
          }
        } else {
          const arg = argSpan.trim();
          const storeM = arg.match(/^\$(\w+)$/);
          if (storeM) {
            // Rule 4
            out.push(`${indent}source ${name} = fromStore(${storeM[1]});`);
            needsFromStore = true;
            i += consumed - 1;
            notes.push(`rule4: $derived($${storeM[1]}) → source ${name} = fromStore(${storeM[1]})`);
            continue;
          }
          if (consumed === 1) {
            out.push(`${indent}derived ${name} = ${arg};`);
            notes.push(`rule3a: single-line $derived → derived ${name} = …`);
          } else {
            out.push(`${indent}derived ${name} {`);
            out.push(`${indent}\treturn (${arg});`);
            out.push(`${indent}}`);
            notes.push(`rule3b: multi-line $derived → derived ${name} { return … }`);
          }
          i += consumed - 1;
          continue;
        }
      }
    }

    // Rule 1/2: let x = $state(…)
    // typed via generic: let x = $state<T>(v)  → signal x: T = v
    m = line.match(/^(\s*)let\s+(\w+)\s*=\s*\$state<([^>]+)>\((.*)\)\s*;?\s*$/);
    if (m && balancedParens(m[4] ?? "")) {
      const v = (m[4] ?? "").trim();
      out.push(
        v ? `${m[1]}signal ${m[2]}: ${m[3]} = ${v};` : `${m[1]}signal ${m[2]}: ${m[3]} | undefined = undefined;`,
      );
      notes.push(`rule1/2: let ${m[2]} = $state<${m[3]}>(…) → signal`);
      continue;
    }
    // explicit annotation: let x: T = $state(v)
    m = line.match(/^(\s*)let\s+(\w+)\s*:\s*([^=]+?)\s*=\s*\$state\((.*)\)\s*;?\s*$/);
    if (m && balancedParens(m[4] ?? "")) {
      const v = (m[4] ?? "").trim();
      const t = m[3]!.trim();
      out.push(
        v
          ? `${m[1]}signal ${m[2]}: ${t} = ${v};`
          : `${m[1]}signal ${m[2]}: ${/\bundefined\b/.test(t) ? t : `${t} | undefined`} = undefined;`,
      );
      notes.push(`rule1/2: let ${m[2]}: ${t} = $state(…) → signal`);
      continue;
    }
    // bare: let x = $state(v)  /  let x = $state()
    m = line.match(/^(\s*)let\s+(\w+)\s*=\s*\$state\((.*)\)\s*;?\s*$/);
    if (m && balancedParens(m[3] ?? "")) {
      const v = (m[3] ?? "").trim();
      out.push(v ? `${m[1]}signal ${m[2]} = ${v};` : `${m[1]}signal ${m[2]} = undefined;`);
      notes.push(`rule1/2: let ${m[2]} = $state(…) → signal`);
      continue;
    }

    out.push(line);
  }
  body = out.join("\n");

  // Drop `onMount` from a `import … from 'svelte'` iff no onMount calls
  // remain (all converted). Keep untrack/tick etc. — by-design residual.
  if (!/\bonMount\s*\(/.test(body)) {
    body = body.replace(/(import\s*\{)([^}]*)\}(\s*from\s*['"]svelte['"])/, (full, a, names, c) => {
      const kept = names
        .split(",")
        .map((s: string) => s.trim())
        .filter((s: string) => s && s !== "onMount");
      if (kept.length === names.split(",").filter((s: string) => s.trim()).length) return full;
      if (kept.length === 0) return ""; // whole import removed
      notes.push("dropped now-unused `onMount` from the svelte import");
      return `${a} ${kept.join(", ")} }${c}`;
    });
    body = body.replace(/^\s*\n/, "");
  }

  return { code: body, needsFromStore };
}

function rewriteCallArrowBlock(src: string, callName: string, keyword: string, notes: string[]): string {
  // callName(() => { BODY })  → keyword { BODY }   (sync, zero-arg arrow only)
  let out = "";
  let i = 0;
  const esc = callName.replace(/[$]/g, "\\$");
  const re = new RegExp(`(^|[^\\w$.])${esc}\\s*\\(\\s*\\(\\s*\\)\\s*=>\\s*\\{`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const pre = m[1] ?? "";
    const kwStart = m.index + pre.length;
    const braceStart = src.indexOf("{", m.index + pre.length + callName.length);
    const braceEnd = findMatch(src, braceStart, "{", "}");
    if (braceEnd === -1) continue;
    // require the call to close as `})` right after the block
    const after = src.slice(braceEnd + 1).match(/^\s*\)\s*;?/);
    if (!after) continue;
    out += src.slice(i, kwStart);
    out += `${keyword} {${src.slice(braceStart + 1, braceEnd)}}`;
    const consumedEnd = braceEnd + 1 + after[0].length;
    i = consumedEnd;
    re.lastIndex = consumedEnd;
    notes.push(`rule5: ${callName}(() => {…}) → ${keyword} { … }`);
  }
  out += src.slice(i);
  return out;
}

function balancedParens(s: string): boolean {
  let d = 0;
  for (const c of s) {
    if (c === "(") d++;
    else if (c === ")") {
      if (--d < 0) return false;
    }
  }
  return d === 0;
}

/**
 * Conservatively rewrite a `.svelte` source string to `.pui` Para dialect.
 * Only `<script>` bodies are touched; markup is byte-preserved. Returns the
 * new source plus notes on what converted / was left raw. The caller renames
 * the file `.svelte`→`.pui` (a CLI concern, out of scope here).
 */
export function svelteToPui(source: string): CodemodResult {
  const notes: string[] = [];
  let needsFromStoreAny = false;
  const code = source.replace(SCRIPT_RE, (full, bodyRaw: string) => {
    const { code: newBody, needsFromStore } = transformScript(bodyRaw, notes);
    needsFromStoreAny ||= needsFromStore;
    let b = newBody;
    if (needsFromStore && !/from\s+['"]@lyku\/para-signals['"]/.test(b)) {
      // inject the fromStore import at the top of the script body
      b = b.replace(/^(\s*)/, `$1import { fromStore } from "@lyku/para-signals";\n$1`);
      notes.push('added `import { fromStore } from "@lyku/para-signals"`');
    }
    return full.replace(bodyRaw, b);
  });
  if (notes.length === 0) notes.push("no transformable patterns found — file left as-is (still valid .pui)");
  void needsFromStoreAny;
  return { code, notes };
}
