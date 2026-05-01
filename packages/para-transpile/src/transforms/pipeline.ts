// `x |> f`        → f(x)
// `x |> f |> g`   → g(f(x))   (left-associative threading)
// `x |> f(y)`     → f(y)(x)   (function-target form: result of f(y) is called)
// `x |> .method()`→ x.method()  (method-shorthand: leading dot binds receiver)
// `x |> f(_, y)`  → f(x, y)   (placeholder: `_` substitutes the LHS)
//
// Scanner-based, not regex — pipeline expressions span balanced parens
// (`x |> f(_, y)`) and chain through other `|>` operators, both of which
// regex with depth-blind lookaheads gets wrong. We walk the code region
// with a brace-tracking pass to find the START and END of each pipeline
// expression (delimited by `=` / `,` / `(` / `[` / `{` / `;` / `return`
// / `=>` on the left and `;` / depth-0 `,` / `)` / `]` / `}` / EOL on
// the right), then split on top-level `|>` and reduce.

import { rewriteCodeRegions } from "../lex";

export function transformPipeline(src: string): string {
  return rewriteCodeRegions(src, code => {
    if (!code.includes("|>")) return code;
    return collapsePipelinesInCode(code);
  });
}

function collapsePipelinesInCode(code: string): string {
  let out = "";
  let i = 0;
  while (i < code.length) {
    const pipe = findNextTopLevelPipe(code, i);
    if (pipe === -1) {
      out += code.slice(i);
      return out;
    }
    const start = scanLhsStart(code, pipe);
    const end = scanRhsEnd(code, pipe + 2);
    // Emit everything before the pipeline expression unchanged.
    out += code.slice(i, start);
    // Reduce the full chain (from `start` through `end`).
    const expr = code.slice(start, end);
    const leadingWs = expr.match(/^\s*/)![0];
    const trailingWs = expr.match(/\s*$/)![0];
    out += leadingWs + collapsePipelineChain(expr.trim()) + trailingWs;
    i = end;
  }
  return out;
}

/**
 * Find the position of the next top-level `|>` token (depth 0, not inside
 * parens/brackets/braces). Returns -1 if none found.
 */
function findNextTopLevelPipe(code: string, from: number): number {
  let depth = 0;
  for (let i = from; i < code.length; i++) {
    const c = code[i]!;
    if (c === "(" || c === "[" || c === "{") {
      depth++;
      continue;
    }
    if (c === ")" || c === "]" || c === "}") {
      depth--;
      continue;
    }
    if (depth === 0 && c === "|" && code[i + 1] === ">") {
      return i;
    }
  }
  return -1;
}

/**
 * Walk backward from `pipePos` through balanced parens to find the start
 * of the pipeline expression. Stops at the first depth-0 delimiter.
 */
function scanLhsStart(code: string, pipePos: number): number {
  let depth = 0;
  let i = pipePos - 1;
  // Skip whitespace immediately before `|>`.
  while (i >= 0 && /\s/.test(code[i]!)) i--;
  while (i >= 0) {
    const c = code[i]!;
    if (c === ")" || c === "]" || c === "}") {
      depth++;
      i--;
      continue;
    }
    if (c === "(" || c === "[" || c === "{") {
      if (depth === 0) {
        // Hit an opening delimiter at depth 0 — pipeline starts after it.
        return i + 1;
      }
      depth--;
      i--;
      continue;
    }
    if (depth === 0) {
      if (c === "," || c === ";" || c === "\n") {
        return i + 1;
      }
      if (c === "=") {
        // `=` is only a delimiter if it's a STANDALONE assignment, not
        // part of a compound operator. Check both neighbors:
        //   - left in [! < > + - * / % & | ^ ? . =] → compound (==, ===,
        //     <=, >=, !=, !==, +=, -=, *=, /=, %=, &=, |=, ^=, ??=, ..=)
        //   - right === '=' → first `=` of `==` / `===`
        //   - right === '>' → `=>` arrow — boundary IS here (after the `>`)
        const left = code[i - 1] ?? "";
        const right = code[i + 1] ?? "";
        if (right === ">") {
          // Arrow `=>` — pipeline starts after the `>` plus any whitespace.
          let j = i + 2;
          while (j < code.length && /\s/.test(code[j]!)) j++;
          return j;
        }
        if (/[!<>+\-*/%&|^?.=]/.test(left) || right === "=") {
          // Compound — keep walking.
          i--;
          continue;
        }
        // Plain assignment — pipeline starts after the `=`.
        return i + 1;
      }
      // `return ` keyword check.
      if (c === "n" && code.slice(Math.max(0, i - 5), i + 1) === "return") {
        let j = i + 1;
        while (j < code.length && /\s/.test(code[j]!)) j++;
        return j;
      }
    }
    i--;
  }
  return 0;
}

/**
 * Walk forward from `startPos` through balanced parens to find the end of
 * the pipeline expression. Skips OVER any chained `|>` at depth 0, so the
 * full chain is one expression.
 */
function scanRhsEnd(code: string, startPos: number): number {
  let depth = 0;
  let i = startPos;
  while (i < code.length) {
    const c = code[i]!;
    if (c === "(" || c === "[" || c === "{") {
      depth++;
      i++;
      continue;
    }
    if (c === ")" || c === "]" || c === "}") {
      if (depth === 0) return i;
      depth--;
      i++;
      continue;
    }
    if (depth === 0) {
      if (c === ";" || c === "\n") return i;
      if (c === ",") return i;
      // `..!` / `..&` are looser-precedence than `|>` per the Para
      // operator table — pipeline ends BEFORE them so the chain operators
      // see the pipeline result as their LHS.
      if (c === "." && code[i + 1] === "." && (code[i + 2] === "!" || code[i + 2] === "&")) {
        return i;
      }
    }
    i++;
  }
  return code.length;
}

function collapsePipelineChain(expr: string): string {
  const parts = splitOnPipe(expr);
  if (parts.length <= 1) return expr;
  let result = parts[0]!.trim();
  for (let i = 1; i < parts.length; i++) {
    result = applyStage(parts[i]!.trim(), result);
  }
  return result;
}

function applyStage(stage: string, lhs: string): string {
  // Method shorthand: `.method(args)` or `.prop`
  if (stage.startsWith(".")) {
    return `${lhs}${stage}`;
  }
  // Placeholder substitution: top-level `_` inside a call argument list
  // becomes the LHS. Works only when stage is shaped like `f(...)`.
  const callMatch = matchCall(stage);
  if (callMatch) {
    const { fn, args } = callMatch;
    if (hasTopLevelPlaceholder(args)) {
      const substituted = substitutePlaceholder(args, lhs);
      return `${fn}(${substituted})`;
    }
    // No placeholder: function-target form — `x |> f(y)` ≡ `f(y)(x)`
    return `${stage}(${lhs})`;
  }
  // Plain ident or property chain: `x |> f` ≡ `f(x)`
  return `${stage}(${lhs})`;
}

/** Match `f(args)` where the matching `)` closes at the very end. */
function matchCall(stage: string): { fn: string; args: string } | null {
  const open = stage.indexOf("(");
  if (open < 0) return null;
  if (stage[stage.length - 1] !== ")") return null;
  let depth = 0;
  for (let i = open; i < stage.length; i++) {
    const c = stage[i]!;
    if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0) {
        // The closing must be the last char for this to be a clean call.
        if (i !== stage.length - 1) return null;
        return { fn: stage.slice(0, open), args: stage.slice(open + 1, i) };
      }
    }
  }
  return null;
}

function splitOnPipe(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if (depth === 0 && c === "|" && s[i + 1] === ">") {
      out.push(s.slice(start, i));
      start = i + 2;
      i++;
    }
  }
  out.push(s.slice(start));
  return out;
}

function hasTopLevelPlaceholder(args: string): boolean {
  let depth = 0;
  for (let i = 0; i < args.length; i++) {
    const c = args[i]!;
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if (depth === 0 && c === "_") {
      const before = args[i - 1] ?? "";
      const after = args[i + 1] ?? "";
      if (!/[\w$]/.test(before) && !/[\w$]/.test(after)) return true;
    }
  }
  return false;
}

function substitutePlaceholder(args: string, replacement: string): string {
  let out = "";
  let depth = 0;
  for (let i = 0; i < args.length; i++) {
    const c = args[i]!;
    if (c === "(" || c === "[" || c === "{") {
      depth++;
      out += c;
      continue;
    }
    if (c === ")" || c === "]" || c === "}") {
      depth--;
      out += c;
      continue;
    }
    if (depth === 0 && c === "_") {
      const before = args[i - 1] ?? "";
      const after = args[i + 1] ?? "";
      if (!/[\w$]/.test(before) && !/[\w$]/.test(after)) {
        out += replacement;
        continue;
      }
    }
    out += c;
  }
  return out;
}
