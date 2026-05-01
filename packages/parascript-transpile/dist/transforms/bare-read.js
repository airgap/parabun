// Bare-read sugar — the scope-aware transform.
//
// After the structural transforms run, source like:
//   signal count = 0;
//   effect { console.log(count); }
//   count++;
// has been turned into:
//   const count = require("para:signals").signal(0);
//   require("para:signals").effect(() => { console.log(count); });
//   count++;
// — but the `count` inside the effect body is still a bare reference, and
// `count++` is still a bare update. The canonical Zig parser rewrites:
//   - `count` (read inside a tracked context) → `count.get()`
//   - `count = X` (write) → `count.set(X)`
//   - `count++` / `count--` → `count.set(count.get() ± 1)`
//   - `count += X` (compound assign) → `count.set(count.get() + X)`
// This pass does the same — and also auto-promotes
//   const x = signals.signal(EXPR-that-reads-other-signals)
// into
//   const x = signals.derived(() => EXPR-with-get-calls)
//
// Implementation: parse with @babel/parser, walk with @babel/traverse using
// its built-in scope machinery, regenerate with @babel/generator. Identifier
// resolution uses Babel's scope binding lookup so it correctly handles
// shadowing, function args, block scope, etc.
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import * as t from "@babel/types";
import generateModule from "@babel/generator";
// @babel/traverse and @babel/generator are CJS modules; their default
// export is the function. esbuild/tsc see the namespace; pull `.default`.
const traverse = (traverseModule.default ?? traverseModule);
const generate = (generateModule.default ?? generateModule);
// Tag attached to a Binding to mark it as referring to a signal cell.
const SIGNAL_FLAG = Symbol("paraSignalBinding");
export function transformBareRead(src) {
    // Pre-flight gate: if there are no signal bindings in the input, there's
    // nothing for this pass to do. Skip the parse + regenerate cycle entirely
    // so we don't reformat the source for files that just use other ParaScript
    // features (effect blocks of plain JS, error chains, etc.).
    if (!src.includes('require("para:signals").signal(') && !src.includes('require("para:signals").derived(')) {
        return src;
    }
    let ast;
    try {
        ast = parse(src, {
            sourceType: "unambiguous",
            plugins: ["typescript", "jsx"],
            allowReturnOutsideFunction: true,
            allowImportExportEverywhere: true,
            // Awaits at the top level are fine (Parabun supports top-level await).
            allowAwaitOutsideFunction: true,
        });
    }
    catch {
        // Parse failure — leave source untouched. The error surfaces at the
        // user's actual build step (bundler / runtime) with full context.
        return src;
    }
    const trackedArrows = new WeakSet();
    let dirty = false;
    // Pass 1: tag tracked-context arrows + record signal-bound identifiers.
    // We need to do these in one traversal so that the auto-promotion pass
    // (which converts signal() to derived()) sees correct binding info.
    traverse(ast, {
        // Mark arrow arguments of tracked calls so the bare-read pass knows
        // their bodies are tracked contexts.
        CallExpression(path) {
            if (isTrackedCallee(path.node.callee)) {
                for (const arg of path.node.arguments) {
                    if (t.isArrowFunctionExpression(arg))
                        trackedArrows.add(arg);
                }
            }
        },
        // Tag VariableDeclarator bindings whose init is signals.signal(...) or
        // signals.derived(...) as signal-typed.
        VariableDeclarator(path) {
            const init = path.node.init;
            if (!init)
                return;
            if (!isSignalCall(init) && !isDerivedCall(init))
                return;
            const id = path.node.id;
            if (!t.isIdentifier(id))
                return;
            const binding = path.scope.getBinding(id.name);
            if (binding)
                binding[SIGNAL_FLAG] = true;
        },
    });
    // Pass 2: auto-promote signal() to derived() when the initializer reads
    // other (already-known) signals. This must run BEFORE the bare-read pass
    // so the synthesized derived arrow gets bare-read treatment.
    traverse(ast, {
        VariableDeclarator(path) {
            const init = path.node.init;
            if (!init || !isSignalCall(init))
                return;
            const args = init.arguments;
            if (args.length !== 1)
                return;
            const expr = args[0];
            if (!t.isExpression(expr))
                return;
            // Scan the initializer for any identifier that resolves to a signal
            // binding visible from the declarator's scope (excluding the binding
            // we're declaring — that one isn't visible to its own initializer).
            const declName = t.isIdentifier(path.node.id) ? path.node.id.name : null;
            if (!exprReadsSignal(expr, path.scope, declName))
                return;
            // Promote: signals.signal(EXPR) → signals.derived(() => EXPR)
            const callee = init.callee;
            const newCallee = t.memberExpression(callee.object, t.identifier("derived"));
            const arrow = t.arrowFunctionExpression([], expr);
            const newCall = t.callExpression(newCallee, [arrow]);
            // Mark the new arrow as a tracked context.
            trackedArrows.add(arrow);
            path.node.init = newCall;
            dirty = true;
        },
    });
    // Pass 3: bare-read rewrite. Inside any tracked-arrow body:
    //   - Identifier reference of a signal binding → `.get()`
    //   - Assignment to signal binding → `.set(...)`
    //   - Update (`++` / `--`) on signal binding → `.set(... ±1)`
    traverse(ast, {
        Identifier(path) {
            if (!isSignalRef(path))
                return;
            if (!isInTrackedContext(path, trackedArrows))
                return;
            // Skip writes (handled below) and non-reference positions
            // (decl IDs, property names, etc.).
            if (!isReadReference(path))
                return;
            path.replaceWith(t.callExpression(t.memberExpression(t.identifier(path.node.name), t.identifier("get")), []));
            dirty = true;
            path.skip();
        },
        AssignmentExpression(path) {
            const left = path.node.left;
            if (!t.isIdentifier(left))
                return;
            const binding = path.scope.getBinding(left.name);
            if (!binding || !binding[SIGNAL_FLAG])
                return;
            if (!isInTrackedContext(path, trackedArrows))
                return;
            const right = path.node.right;
            let value;
            if (path.node.operator === "=") {
                value = right;
            }
            else {
                const op = path.node.operator.replace(/=$/, "");
                value = t.binaryExpression(op, t.callExpression(t.memberExpression(t.identifier(left.name), t.identifier("get")), []), right);
            }
            path.replaceWith(t.callExpression(t.memberExpression(t.identifier(left.name), t.identifier("set")), [value]));
            dirty = true;
            path.skip();
        },
        UpdateExpression(path) {
            const arg = path.node.argument;
            if (!t.isIdentifier(arg))
                return;
            const binding = path.scope.getBinding(arg.name);
            if (!binding || !binding[SIGNAL_FLAG])
                return;
            if (!isInTrackedContext(path, trackedArrows))
                return;
            const op = path.node.operator === "++" ? "+" : "-";
            const value = t.binaryExpression(op, t.callExpression(t.memberExpression(t.identifier(arg.name), t.identifier("get")), []), t.numericLiteral(1));
            path.replaceWith(t.callExpression(t.memberExpression(t.identifier(arg.name), t.identifier("set")), [value]));
            dirty = true;
            path.skip();
        },
    });
    if (!dirty)
        return src;
    return generate(ast).code;
}
// ─── detection helpers ─────────────────────────────────────────────────────
function isSignalsRequireMember(node, methodName) {
    if (!t.isMemberExpression(node))
        return false;
    if (!t.isIdentifier(node.property) || node.property.name !== methodName)
        return false;
    const obj = node.object;
    if (!t.isCallExpression(obj))
        return false;
    if (!t.isIdentifier(obj.callee) || obj.callee.name !== "require")
        return false;
    if (obj.arguments.length !== 1)
        return false;
    const arg = obj.arguments[0];
    if (!t.isStringLiteral(arg) || arg.value !== "para:signals")
        return false;
    return true;
}
function isSignalCall(node) {
    return t.isCallExpression(node) && isSignalsRequireMember(node.callee, "signal");
}
function isDerivedCall(node) {
    return t.isCallExpression(node) && isSignalsRequireMember(node.callee, "derived");
}
function isTrackedCallee(callee) {
    return (isSignalsRequireMember(callee, "effect") ||
        isSignalsRequireMember(callee, "derived") ||
        isSignalsRequireMember(callee, "when") ||
        isSignalsRequireMember(callee, "batch"));
}
function isInTrackedContext(path, trackedArrows) {
    let p = path.parentPath;
    while (p) {
        if (t.isArrowFunctionExpression(p.node) && trackedArrows.has(p.node))
            return true;
        p = p.parentPath;
    }
    return false;
}
function isSignalRef(path) {
    const binding = path.scope.getBinding(path.node.name);
    return !!binding && !!binding[SIGNAL_FLAG];
}
/**
 * Determine if an Identifier path is being USED as a value reference (vs.
 * declared, assigned to, used as a property name, used as a member-access
 * property, etc.). Babel's `isReferencedIdentifier()` does most of this.
 */
function isReadReference(path) {
    // Babel exposes a built-in helper.
    return path.isReferencedIdentifier();
}
/**
 * Scan an expression for any identifier reference that resolves to a
 * signal binding visible at `scope`. Used for auto-promotion. The identifier
 * named `excludeName` is ignored — it's the binding currently being declared,
 * which isn't yet in scope from the initializer's POV.
 */
function exprReadsSignal(expr, scope, excludeName) {
    let found = false;
    // Build a tiny scope-aware traversal anchored at this scope. We can't
    // easily traverse a sub-expression with scope info via the public API
    // — but we can use the binding lookup at the scope passed in and walk
    // the expression manually checking each identifier.
    function visit(node) {
        if (found)
            return;
        if (t.isIdentifier(node)) {
            if (node.name === excludeName)
                return;
            const b = scope.getBinding(node.name);
            if (b && b[SIGNAL_FLAG])
                found = true;
            return;
        }
        // Skip identifier nodes that aren't references (property names,
        // decl IDs, etc.). For property access, ONLY visit the object side
        // unless the property is computed.
        if (t.isMemberExpression(node)) {
            visit(node.object);
            if (node.computed)
                visit(node.property);
            return;
        }
        if (t.isObjectProperty(node)) {
            if (node.computed)
                visit(node.key);
            visit(node.value);
            return;
        }
        // Generic descent — visit children.
        for (const key of Object.keys(node)) {
            const v = node[key];
            if (v && typeof v === "object") {
                if (Array.isArray(v)) {
                    for (const item of v) {
                        if (item && typeof item === "object" && "type" in item)
                            visit(item);
                    }
                }
                else if ("type" in v) {
                    visit(v);
                }
            }
        }
    }
    visit(expr);
    return found;
}
