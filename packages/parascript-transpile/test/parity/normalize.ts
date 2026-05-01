// Normalize two transpiler outputs so they can be compared structurally.
// The two parsers (Zig + our TS) emit semantically-equivalent JS but
// differ in surface details:
//   - gensym names: canonical uses `__parabun_defer_0$`, ours uses
//     `__paraDefer0` etc. Identifiers are renamed to a stable
//     `__GENSYM_<kind>_N` shape based on first-occurrence order.
//   - formatting / whitespace: handled by re-emitting through Babel
//     with consistent options.
//   - comma expressions vs Block / SExpr statements: split a top-level
//     `(a, b);` into separate `a; b;` statements so parser choice
//     doesn't matter.
//
// Returns a normalized string that can be byte-compared.

import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import * as t from "@babel/types";
import generateModule from "@babel/generator";

const traverse = ((traverseModule as any).default ?? traverseModule) as typeof import("@babel/traverse").default;
const generate = ((generateModule as any).default ?? generateModule) as typeof import("@babel/generator").default;

// Patterns that mark gensym'd identifiers from either transpiler. The
// `kind` group captures the semantic role (defer, etc.) so we can
// rename to `__GENSYM_DEFER_0` rather than collapsing all gensyms.
const GENSYM_PATTERNS: { re: RegExp; kind: string }[] = [
  { re: /^__parabun_defer_(\d+)\$$/, kind: "DEFER" },
  { re: /^__paraDefer(\d+)$/, kind: "DEFER" },
  { re: /^__bun_temp_ref_([\da-fA-F]+)\$$/, kind: "TEMP" },
  { re: /^__pb([\da-fA-F]*)$/, kind: "TEMP" },
];

function classifyGensym(name: string): { kind: string; index: number } | null {
  for (const { re, kind } of GENSYM_PATTERNS) {
    const m = name.match(re);
    if (m) return { kind, index: parseInt(m[1] ?? "0", 16) };
  }
  return null;
}

export function normalize(src: string): string {
  let ast: t.File;
  try {
    ast = parse(src, {
      sourceType: "unambiguous",
      plugins: ["typescript", "jsx"],
      allowReturnOutsideFunction: true,
      allowImportExportEverywhere: true,
      allowAwaitOutsideFunction: true,
    });
  } catch (e) {
    // If we can't parse, return the source verbatim — the caller's diff
    // surfaces this with the parse error preserved.
    return src;
  }

  // Step 1: strip TS-only nodes (canonical emits plain JS; standalone
  // preserves type annotations because TSC isn't in our pipeline).
  stripTypeScript(ast);

  // Step 2: unwrap canonical's IIFE signal initializer wrappers —
  // `signals.signal((() => EXPR)())` ≡ `signals.signal(EXPR)`.
  unwrapSignalIIFE(ast);

  // Step 3: drop `import { X as X_HASH } from "bun:wrap"` (and similar
  // bare-helper imports) and rewrite the aliased call sites to bare
  // names. Mirrors how the canonical Zig parser pulls runtime helpers
  // into module scope, vs. the standalone's bare-name calls.
  normalizeWrapImports(ast);

  // Step 4: split top-level comma expressions into separate statements.
  // This collapses the difference between `(a, b);` (our paired-when
  // emit) and `a; b;` (canonical's two-statement emit).
  splitTopLevelCommaStatements(ast);

  // Step 5: rename gensym'd identifiers to stable per-kind indices based
  // on first-binding order.
  renameGensyms(ast);

  // Step 6: regenerate with consistent formatting.
  return generate(ast, {
    compact: false,
    concise: false,
    retainLines: false,
    minified: false,
  }).code;
}

function stripTypeScript(ast: t.File) {
  traverse(ast, {
    // Replace `EXPR as TYPE` with EXPR.
    TSAsExpression(path) {
      path.replaceWith(path.node.expression);
    },
    TSTypeAssertion(path) {
      path.replaceWith(path.node.expression);
    },
    TSNonNullExpression(path) {
      path.replaceWith(path.node.expression);
    },
    // Drop variable / parameter annotations.
    Identifier(path) {
      if ((path.node as any).typeAnnotation) (path.node as any).typeAnnotation = null;
      if ((path.node as any).optional) (path.node as any).optional = null;
    },
    // Drop type-only declarations entirely.
    "TSInterfaceDeclaration|TSTypeAliasDeclaration|TSDeclareFunction|TSDeclareMethod"(path) {
      path.remove();
    },
    // Strip return-type annotations on functions and arrows.
    Function(path) {
      if ((path.node as any).returnType) (path.node as any).returnType = null;
      if ((path.node as any).typeParameters) (path.node as any).typeParameters = null;
    },
  });
}

function unwrapSignalIIFE(ast: t.File) {
  // Pattern: CallExpression(callee=ArrowFunctionExpression(params=[], body=EXPR), arguments=[])
  // — i.e., `(() => EXPR)()` evaluating to EXPR. Replace with the body.
  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;
      if (path.node.arguments.length !== 0) return;
      if (!t.isArrowFunctionExpression(callee)) return;
      if (callee.params.length !== 0) return;
      const body = callee.body;
      if (t.isExpression(body)) {
        path.replaceWith(body);
      }
      // For block bodies (function-style arrows), leave as-is.
    },
  });
}

function normalizeWrapImports(ast: t.File) {
  // First pass: collect alias maps from `import { X as Y } from "bun:wrap"`.
  const aliasToOriginal = new Map<string, string>();
  const importsToRemove: any[] = [];
  traverse(ast, {
    ImportDeclaration(path) {
      const src = path.node.source.value;
      if (src !== "bun:wrap") return;
      for (const spec of path.node.specifiers) {
        if (t.isImportSpecifier(spec)) {
          const importedName = t.isIdentifier(spec.imported) ? spec.imported.name : spec.imported.value;
          aliasToOriginal.set(spec.local.name, importedName);
        }
      }
      importsToRemove.push(path);
    },
  });
  for (const p of importsToRemove) p.remove();
  if (aliasToOriginal.size === 0) return;
  // Second pass: rewrite all references to the aliased names.
  traverse(ast, {
    Identifier(path) {
      const target = aliasToOriginal.get(path.node.name);
      if (target) path.node.name = target;
    },
  });
}

function splitTopLevelCommaStatements(ast: t.File) {
  // Walk every block (Program + BlockStatement) and replace any
  // ExpressionStatement whose expression is a top-level SequenceExpression
  // with N separate ExpressionStatements.
  traverse(ast, {
    "Program|BlockStatement"(path) {
      const body = (path.node as any).body as t.Statement[];
      const out: t.Statement[] = [];
      for (const stmt of body) {
        if (t.isExpressionStatement(stmt) && t.isSequenceExpression(stmt.expression)) {
          for (const expr of stmt.expression.expressions) {
            out.push(t.expressionStatement(expr));
          }
        } else {
          out.push(stmt);
        }
      }
      (path.node as any).body = out;
    },
  });
}

function renameGensyms(ast: t.File) {
  // First pass: collect all gensym BINDING names in source order, assign
  // each to a stable rename.
  const renames = new Map<string, string>();
  const counters = new Map<string, number>();
  traverse(ast, {
    Identifier(path) {
      const name = path.node.name;
      if (renames.has(name)) return;
      const cls = classifyGensym(name);
      if (!cls) return;
      // Only rename based on a binding (declaration), not a reference.
      // For VariableDeclarator IDs and function/arrow params.
      if (path.parent && t.isVariableDeclarator(path.parent) && path.parent.id === path.node) {
        const n = counters.get(cls.kind) ?? 0;
        counters.set(cls.kind, n + 1);
        renames.set(name, `__GENSYM_${cls.kind}_${n}`);
      }
    },
  });
  // Second pass: rewrite all references.
  traverse(ast, {
    Identifier(path) {
      const target = renames.get(path.node.name);
      if (target) path.node.name = target;
    },
  });
}
