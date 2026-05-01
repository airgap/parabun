// `EXPR ..! HANDLER` → `EXPR.catch(HANDLER)`
// `EXPR ..& CLEANUP` → `EXPR.finally(CLEANUP)`
//
// These are right-to-left chainable: `p ..! a ..& b` becomes
// `p.catch(a).finally(b)`. Operator precedence is "conditional" in the
// canonical Zig parser, which means they bind tighter than assignment but
// looser than `||`/`&&` and friends.
//
// The text-level rewrite uses non-greedy matching from the operator to the
// end of the surrounding statement, then defers to the lexer's region
// scanner so we never apply it inside strings/comments.

import { rewriteCodeRegions } from "../lex";

export function transformErrorChain(src: string): string {
  return rewriteCodeRegions(src, code => {
    let out = code;
    // Repeatedly apply both rewrites until the source stops changing — chains
    // like `p ..! a ..! b ..& c` need multiple passes because each pass only
    // rewrites the LEFTMOST handler (its boundary is the next chain operator).
    // The lookahead alternatives below define what counts as "end of handler":
    //   - another chain operator (`..!`, `..&`) — stop before it so the next
    //     pass picks it up
    //   - an already-inserted `.catch(` / `.finally(` from a prior pass
    //   - a closing `}` or `)` or `]` — handler ended at end of an expression
    //   - a semicolon, end of input, or newline — statement-level boundary
    const stop = String.raw`(?=\s*\.\.[!&]|\.catch\(|\.finally\(|\s*[;)\]}]|\s*$|\s*\n)`;
    const finallyRe = new RegExp(String.raw`\s*\.\.&\s*(.+?)` + stop, "g");
    const catchRe = new RegExp(String.raw`\s*\.\.!\s*(.+?)` + stop, "g");
    let prev = "";
    while (prev !== out) {
      prev = out;
      out = out.replace(finallyRe, (_m, handler) => `.finally(${handler.trim()})`);
      out = out.replace(catchRe, (_m, handler) => `.catch(${handler.trim()})`);
    }
    return out;
  });
}
