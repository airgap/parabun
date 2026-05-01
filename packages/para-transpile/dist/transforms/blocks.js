// Block-form ParaScript constructs:
//
//   signal NAME = EXPR;             → const NAME = require("para:signals").signal(EXPR);
//   effect { BODY }                 → require("para:signals").effect(() => { BODY });
//   arena  { BODY }                 → require("para:arena").scope(() => { BODY });
//   when EXPR { BODY }              → require("para:signals").when(() => EXPR, () => { BODY });
//   when not EXPR { BODY }          → require("para:signals").when(() => !(EXPR), () => { BODY });
//   when X { A } when not { B }     → two .when() calls, second predicate negated
//
// Bare-read sugar (rewriting `count` to `count.get()` inside tracked
// contexts) is NOT applied here — it requires real scope analysis and
// lands in v0.2. Until then user code must call `.get()` / `.set()`
// explicitly. Auto-promotion of `signal x = EXPR` to `derived(...)` when
// EXPR reads other signals is also v0.2-territory.
//
// All block parsers walk through the source brace-aware, using lex.ts's
// findMatchingBrace so braces inside strings/comments/regex don't confuse
// the matcher.
import { findMatchingBrace, scanRegions } from "../lex";
export function transformBlocks(src) {
    let out = src;
    out = transformSignalDecls(out);
    out = transformEffectBlocks(out);
    out = transformArenaBlocks(out);
    out = transformWhenBlocks(out);
    return out;
}
// ─────────────────────────────────────────────────────────────────────────
// signal NAME = EXPR;
// ─────────────────────────────────────────────────────────────────────────
function transformSignalDecls(src) {
    // Scan on the FULL source (not per code region) because a single
    // `signal x = …` initializer can contain string literals — splitting
    // by region first breaks the brace-depth scan halfway through. Instead
    // we use the spans only to (a) skip matches whose `signal` keyword is
    // inside a string/comment, and (b) advance over non-code regions during
    // the forward scan without counting their braces.
    const spans = scanRegions(src);
    const findSpan = (pos) => spans.find(s => pos >= s.start && pos < s.end);
    const inCode = (pos) => findSpan(pos)?.region === "code";
    const re = /(^|[;\n{}])(\s*)signal\s+([A-Za-z_$][\w$]*)\s*(?::\s*[^=;]+?)?\s*=\s*/g;
    let out = "";
    let last = 0;
    let m;
    while ((m = re.exec(src)) !== null) {
        const matchStart = m.index + m[1].length + m[2].length;
        if (!inCode(matchStart))
            continue;
        const matchEnd = re.lastIndex;
        const name = m[3];
        // Forward-scan through full source with paren tracking. String /
        // comment regions are skipped wholesale (their interior doesn't
        // contribute to brace depth).
        let depth = 0;
        let i = matchEnd;
        while (i < src.length) {
            if (!inCode(i)) {
                const span = findSpan(i);
                i = span ? span.end : i + 1;
                continue;
            }
            const c = src[i];
            if (c === "(" || c === "[" || c === "{")
                depth++;
            else if (c === ")" || c === "]" || c === "}")
                depth--;
            else if (depth === 0 && (c === ";" || c === "\n"))
                break;
            i++;
        }
        const initializer = src.slice(matchEnd, i).trim();
        out += src.slice(last, matchStart);
        out += `const ${name} = require("para:signals").signal(${initializer})`;
        last = i; // the trailing `;` / `\n` is appended on the next iter or final tail
        re.lastIndex = i;
    }
    out += src.slice(last);
    return out;
}
// ─────────────────────────────────────────────────────────────────────────
// effect { BODY } and arena { BODY } — both are keyword + block,
// shared shape.
// ─────────────────────────────────────────────────────────────────────────
function transformEffectBlocks(src) {
    return rewriteKeywordBlocks(src, "effect", body => `require("para:signals").effect(() => {${body}})`);
}
function transformArenaBlocks(src) {
    return rewriteKeywordBlocks(src, "arena", body => `require("para:arena").scope(() => {${body}})`);
}
function rewriteKeywordBlocks(src, keyword, wrap) {
    // Find `keyword` at statement-start position, immediately followed by `{`
    // (whitespace allowed). Replace `keyword { … }` with the wrapped form.
    // The `{` is matched via findMatchingBrace which is string-aware.
    const re = new RegExp(`(^|[;\\n{}])(\\s*)${keyword}(\\s*)\\{`, "g");
    let out = "";
    let last = 0;
    let m;
    while ((m = re.exec(src)) !== null) {
        const blockStart = m.index + m[1].length + m[2].length;
        // Position of the `{` is m.index + (full match length) - 1
        const openBrace = re.lastIndex - 1;
        const closeBrace = findMatchingBrace(src, openBrace);
        if (closeBrace === -1)
            continue; // unmatched — leave source alone
        const body = src.slice(openBrace + 1, closeBrace);
        out += src.slice(last, blockStart);
        out += wrap(body);
        last = closeBrace + 1;
        re.lastIndex = last;
    }
    out += src.slice(last);
    return out;
}
// ─────────────────────────────────────────────────────────────────────────
// when EXPR { BODY }      →  signals.when(() => EXPR, () => { BODY })
// when not EXPR { BODY }  →  signals.when(() => !(EXPR), () => { BODY })
// when X { A } when not { B }   — paired form: second arm reuses the
// predicate, negated.
// ─────────────────────────────────────────────────────────────────────────
function transformWhenBlocks(src) {
    // Walk the source statement-by-statement at top-level, finding `when`
    // tokens and identifying the form. We can't use a simple regex because
    // the predicate can contain operators / property accesses / etc.
    let out = "";
    let i = 0;
    while (i < src.length) {
        // Look for the next `when` keyword at a statement boundary.
        const wp = findNextWhenStart(src, i);
        if (wp === -1) {
            out += src.slice(i);
            return out;
        }
        out += src.slice(i, wp.start);
        // Parse predicate + body.
        const result = parseWhenStatement(src, wp.kwPos);
        if (!result) {
            // Couldn't parse — emit the keyword unchanged and continue.
            out += src.slice(wp.kwPos, wp.kwPos + 4);
            i = wp.kwPos + 4;
            continue;
        }
        // After parsing the first when, peek for paired `when not { … }`.
        const paired = peekPairedWhenNot(src, result.end);
        if (paired) {
            // Emit two `signals.when(...)` calls separated by `;`. Always pass
            // the RAW predicate to emitWhenCall — the helper owns the negation
            // so we never accidentally double-wrap a `!(!(EXPR))`.
            out += emitWhenCall(result.rawPredicate, result.body, result.negated);
            out += "; ";
            // Second arm: same raw predicate, opposite negation.
            out += emitWhenCall(result.rawPredicate, paired.body, !result.negated);
            i = paired.end;
        }
        else {
            out += emitWhenCall(result.rawPredicate, result.body, result.negated);
            i = result.end;
        }
    }
    return out;
}
function findNextWhenStart(src, from) {
    // Walk forward through code regions looking for `\bwhen\b` followed by
    // something that can start a predicate (`not`, an identifier, `!`, `(`,
    // a digit). For each candidate, verify the prior non-whitespace char is
    // a statement boundary (`;` `{` `}` `\n`-equivalent or start-of-input).
    // The whitespace-walking-back step is what lets two consecutive when
    // blocks find each other across only whitespace between them.
    const spans = scanRegions(src);
    let pos = from;
    while (pos < src.length) {
        const span = spans.find(s => pos >= s.start && pos < s.end);
        if (!span)
            return -1;
        if (span.region !== "code") {
            pos = span.end;
            continue;
        }
        const code = src.slice(span.start, span.end);
        const startInChunk = pos - span.start;
        const re = /\bwhen(?=\s+(?:not\s+)?[A-Za-z_$!(\d])/g;
        re.lastIndex = startInChunk;
        const m = re.exec(code);
        if (!m) {
            pos = span.end;
            continue;
        }
        const whenPos = span.start + m.index;
        // Validate: prior non-whitespace char is a statement boundary.
        let prev = whenPos - 1;
        while (prev >= 0 && /[ \t]/.test(src[prev]))
            prev--;
        const prevChar = prev < 0 ? "" : src[prev];
        if (prev < 0 || prevChar === ";" || prevChar === "{" || prevChar === "}" || prevChar === "\n") {
            return { start: prev + 1, kwPos: whenPos };
        }
        // Not at a boundary — `when` is mid-expression (or part of a longer
        // identifier the `\b` happened to allow through). Skip past it.
        pos = whenPos + 4;
    }
    return -1;
}
function parseWhenStatement(src, kwPos) {
    // kwPos points at the `w` of `when`. Move past `when` + whitespace.
    let i = kwPos + 4;
    while (i < src.length && /\s/.test(src[i]))
        i++;
    // Optional `not`.
    let negated = false;
    if (src.startsWith("not", i) && /\s/.test(src[i + 3] ?? "")) {
        negated = true;
        i += 3;
        while (i < src.length && /\s/.test(src[i]))
            i++;
    }
    // Predicate ends at the next top-level `{`. Track paren depth so a `{`
    // inside the predicate (object literal, etc.) doesn't terminate it.
    let depth = 0;
    const predStart = i;
    while (i < src.length) {
        const c = src[i];
        if (c === "(" || c === "[")
            depth++;
        else if (c === ")" || c === "]")
            depth--;
        else if (depth === 0 && c === "{")
            break;
        i++;
    }
    if (i >= src.length)
        return null;
    const rawPredicate = src.slice(predStart, i).trim();
    const predicate = negated ? `!(${rawPredicate})` : rawPredicate;
    // Body via brace-match.
    const openBrace = i;
    const closeBrace = findMatchingBrace(src, openBrace);
    if (closeBrace === -1)
        return null;
    const body = src.slice(openBrace + 1, closeBrace);
    return { rawPredicate, predicate, body, negated, end: closeBrace + 1 };
}
function peekPairedWhenNot(src, from) {
    // Skip whitespace.
    let i = from;
    while (i < src.length && /\s/.test(src[i]))
        i++;
    // Must be `when` (followed by space).
    if (!src.startsWith("when", i) || !/\s/.test(src[i + 4] ?? ""))
        return null;
    i += 4;
    while (i < src.length && /\s/.test(src[i]))
        i++;
    // Must be `not`.
    if (!src.startsWith("not", i) || !/[\s{]/.test(src[i + 3] ?? ""))
        return null;
    i += 3;
    while (i < src.length && /\s/.test(src[i]))
        i++;
    // Must be `{` immediately (NO predicate before the brace — that's the
    // bare paired form).
    if (src[i] !== "{")
        return null;
    const openBrace = i;
    const closeBrace = findMatchingBrace(src, openBrace);
    if (closeBrace === -1)
        return null;
    const body = src.slice(openBrace + 1, closeBrace);
    return { body, end: closeBrace + 1 };
}
function emitWhenCall(rawPredicate, body, negate) {
    const predicate = negate ? `!(${rawPredicate})` : rawPredicate;
    return `require("para:signals").when(() => ${predicate}, () => {${body}})`;
}
