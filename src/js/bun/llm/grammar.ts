// Byte-level grammar engine for constrained decoding.
//
// Given a GBNF-style grammar (or a JSON schema compiled to one), this module
// builds a byte-level NFA and, at each sampling step, masks the tokens that
// would take the NFA off-grammar. The sampler then picks from only the
// accepting tokens so the generation is guaranteed to conform to the
// grammar — no retry/patch loop, no prompt-engineering tricks.
//
// Runtime shape:
//
//   const g = new Grammar(ast, tokenBytes, { eos, specialIds });
//   // in the decode loop:
//   const mask = g.allowedMask();          // Uint8Array(vocabSize)
//   for (let i = 0; i < vocabSize; i++) if (!mask[i]) logits[i] = -Infinity;
//   const next = sampler.sample(logits);
//   g.accept(next);                        // advance grammar by the chosen token
//
// Grammar state is a set of NFA states. Advancing a byte epsilon-closes the
// current set, takes single-byte transitions, and epsilon-closes again.
// Control/special tokens are always masked out during constrained decoding
// except for EOS when the grammar has reached an accepting state.
//
// The GBNF parser implements the llama.cpp subset: literal strings, character
// classes (including negation + ranges), rule references, grouping with (),
// alternation with |, and the quantifiers ?, *, +. That's enough surface to
// express every JSON schema we emit and the common user-written grammars.

// --- AST ---------------------------------------------------------------

export type Symbol =
  | { kind: "literal"; bytes: Uint8Array }
  | { kind: "charclass"; ranges: Array<[number, number]>; negated: boolean }
  | { kind: "ruleref"; name: string }
  | { kind: "star"; inner: Symbol }
  | { kind: "plus"; inner: Symbol }
  | { kind: "optional"; inner: Symbol }
  | { kind: "group"; alts: Symbol[][] };

export type Production = Symbol[];
export type RuleSet = Map<string, Production[]>;

// --- NFA -------------------------------------------------------------

interface Transition {
  // "byte": single-byte match; "range": byte ∈ [lo, hi]; "epsilon": free move.
  kind: "byte" | "range" | "epsilon";
  lo: number;
  hi: number;
  target: NFAState;
}

interface NFAState {
  id: number;
  outgoing: Transition[];
  accepting: boolean;
}

let _stateCounter = 0;
function newState(): NFAState {
  return { id: _stateCounter++, outgoing: [], accepting: false };
}
function epsilon(from: NFAState, to: NFAState): void {
  from.outgoing.push({ kind: "epsilon", lo: 0, hi: 0, target: to });
}
function byteEdge(from: NFAState, b: number, to: NFAState): void {
  from.outgoing.push({ kind: "byte", lo: b, hi: b, target: to });
}
function rangeEdge(from: NFAState, lo: number, hi: number, to: NFAState): void {
  from.outgoing.push({ kind: "range", lo, hi, target: to });
}

interface Compiled {
  start: NFAState;
  end: NFAState;
}

// Compile a grammar to an NFA. The entry rule is named "root" by convention
// (same as llama.cpp's GBNF). Each rule reference is *inlined* — a fresh
// copy of the rule body is built at every call site, with its own start/end
// states. Sharing a single (start,end) pair per rule, the textbook "slot"
// trick, is wrong for an NFA: after the shared end is reached, the
// ε-closure can jump to the end of *any* reference, producing spurious
// transitions between unrelated call sites. True CFG execution needs a
// pushdown automaton; for the right-regular grammars we actually emit
// (typed JSON schemas, GBNF without recursion) pure inlining is correct
// and cheap. We detect cycles and reject — schemas using the recursive
// "json-value" primitives would expand infinitely under inlining and the
// caller must break the cycle before compiling.
function compileGrammar(rules: RuleSet, rootName = "root"): { startClosure: Set<NFAState>; finalAccept: NFAState } {
  _stateCounter = 0;
  const onStack = new Set<string>();

  function compileSymbol(sym: Symbol): Compiled {
    switch (sym.kind) {
      case "literal": {
        const start = newState();
        let cur = start;
        for (const b of sym.bytes) {
          const next = newState();
          byteEdge(cur, b, next);
          cur = next;
        }
        return { start, end: cur };
      }
      case "charclass": {
        const start = newState();
        const end = newState();
        if (sym.negated) {
          // Produce edges for the complement of the listed ranges over 0..255.
          const sorted = [...sym.ranges].sort((a, b) => a[0] - b[0]);
          let cursor = 0;
          for (const [lo, hi] of sorted) {
            if (cursor < lo) rangeEdge(start, cursor, lo - 1, end);
            if (hi + 1 > cursor) cursor = hi + 1;
          }
          if (cursor <= 255) rangeEdge(start, cursor, 255, end);
        } else {
          for (const [lo, hi] of sym.ranges) {
            if (lo === hi) byteEdge(start, lo, end);
            else rangeEdge(start, lo, hi, end);
          }
        }
        return { start, end };
      }
      case "ruleref":
        return compileRuleInline(sym.name);
      case "star": {
        const inner = compileSymbol(sym.inner);
        const start = newState();
        const end = newState();
        epsilon(start, inner.start);
        epsilon(inner.end, start);
        epsilon(start, end);
        return { start, end };
      }
      case "plus": {
        const inner = compileSymbol(sym.inner);
        const end = newState();
        epsilon(inner.end, inner.start);
        epsilon(inner.end, end);
        return { start: inner.start, end };
      }
      case "optional": {
        const inner = compileSymbol(sym.inner);
        const start = newState();
        const end = newState();
        epsilon(start, inner.start);
        epsilon(inner.end, end);
        epsilon(start, end);
        return { start, end };
      }
      case "group": {
        const start = newState();
        const end = newState();
        for (const alt of sym.alts) {
          const comp = compileProduction(alt);
          epsilon(start, comp.start);
          epsilon(comp.end, end);
        }
        return { start, end };
      }
    }
  }

  function compileProduction(prod: Production): Compiled {
    if (prod.length === 0) {
      const s = newState();
      return { start: s, end: s };
    }
    const parts = prod.map(compileSymbol);
    for (let i = 0; i < parts.length - 1; i++) epsilon(parts[i].end, parts[i + 1].start);
    return { start: parts[0].start, end: parts[parts.length - 1].end };
  }

  function compileRuleInline(name: string): Compiled {
    if (onStack.has(name)) {
      throw new Error(
        `bun:llm: grammar: rule "${name}" is recursive — the NFA engine is right-regular only. ` +
          `Rewrite the grammar or remove the cycle.`,
      );
    }
    const alts = rules.get(name);
    if (!alts) throw new Error(`bun:llm: grammar rule "${name}" not defined`);
    onStack.add(name);
    const start = newState();
    const end = newState();
    for (const alt of alts) {
      const comp = compileProduction(alt);
      epsilon(start, comp.start);
      epsilon(comp.end, end);
    }
    onStack.delete(name);
    return { start, end };
  }

  const root = compileRuleInline(rootName);
  root.end.accepting = true;
  const startClosure = epsilonClose(new Set([root.start]));
  return { startClosure, finalAccept: root.end };
}

function epsilonClose(states: Set<NFAState>): Set<NFAState> {
  const out = new Set(states);
  const stack = [...states];
  while (stack.length) {
    const s = stack.pop()!;
    for (const t of s.outgoing) {
      if (t.kind === "epsilon" && !out.has(t.target)) {
        out.add(t.target);
        stack.push(t.target);
      }
    }
  }
  return out;
}

function advanceByte(states: Set<NFAState>, byte: number): Set<NFAState> {
  const next = new Set<NFAState>();
  for (const s of states) {
    for (const t of s.outgoing) {
      if (t.kind === "byte" && t.lo === byte) next.add(t.target);
      else if (t.kind === "range" && byte >= t.lo && byte <= t.hi) next.add(t.target);
    }
  }
  return next.size ? epsilonClose(next) : next;
}

// --- Grammar runtime --------------------------------------------------

export interface GrammarRuntimeOptions {
  tokenBytes: Uint8Array[];
  // Token ids that are never emitted by on-grammar generation (control
  // tokens, BOS, etc.). Always masked out except for `eos`, which is
  // allowed when the grammar has reached an accepting state.
  specialIds?: Set<number>;
  eos: number;
  // Additional terminators that act like EOS for stopping purposes
  // (e.g. <|eot_id|> for Llama-3 chat). Allowed when in accepting state.
  stopIds?: number[];
}

// Byte-trie over the token vocabulary. Each node maps bytes to children; a
// non-negative `tokenId` marks a terminal (a complete token ending here).
// Built once at Grammar construction and reused for every allowedMask() call;
// lets us DFS along only the byte-paths that actually correspond to tokens,
// pruning whole subtrees the moment the NFA goes empty — orders of magnitude
// faster than iterating the 128k-token vocab independently.
interface TrieNode {
  tokenId: number;
  // Flat arrays are ~3× faster to iterate than Map in V8 for small fanouts,
  // and token-byte fanouts are small (most trie nodes have ≤8 children).
  childBytes: number[];
  childNodes: TrieNode[];
}

function buildTokenTrie(tokenBytes: Uint8Array[]): TrieNode {
  const root: TrieNode = { tokenId: -1, childBytes: [], childNodes: [] };
  for (let id = 0; id < tokenBytes.length; id++) {
    const bytes = tokenBytes[id];
    if (!bytes || bytes.length === 0) continue;
    let node = root;
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      let idx = node.childBytes.indexOf(b);
      if (idx < 0) {
        idx = node.childBytes.length;
        node.childBytes.push(b);
        node.childNodes.push({ tokenId: -1, childBytes: [], childNodes: [] });
      }
      node = node.childNodes[idx];
    }
    node.tokenId = id;
  }
  return root;
}

class Grammar {
  readonly tokenBytes: Uint8Array[];
  readonly #special: Set<number>;
  readonly #eos: number;
  readonly #stopIds: Set<number>;
  readonly #finalAccept: NFAState;
  #states: Set<NFAState>;
  readonly #vocabSize: number;
  readonly #trie: TrieNode;

  constructor(rules: RuleSet, opts: GrammarRuntimeOptions, rootName = "root") {
    const { startClosure, finalAccept } = compileGrammar(rules, rootName);
    this.#states = startClosure;
    this.#finalAccept = finalAccept;
    this.tokenBytes = opts.tokenBytes;
    this.#special = opts.specialIds ?? new Set();
    this.#eos = opts.eos;
    this.#stopIds = new Set(opts.stopIds ?? []);
    this.#vocabSize = opts.tokenBytes.length;
    this.#trie = buildTokenTrie(opts.tokenBytes);
  }

  // Set bit i = 1 if token id i is allowed in the current grammar state.
  // Runs a DFS over the token prefix trie, carrying the NFA state set along
  // each branch. Off-grammar branches prune immediately, so cost is driven
  // by reachable (grammar, token-prefix) pairs — typically thousands per
  // step, not 128k. EOS and chat-template stop ids are handled separately:
  // allowed only when the grammar has reached an accepting state.
  allowedMask(): Uint8Array {
    const mask = new Uint8Array(this.#vocabSize);
    if (this.isAccepting()) {
      if (this.#eos >= 0 && this.#eos < this.#vocabSize) mask[this.#eos] = 1;
      for (const id of this.#stopIds) {
        if (id >= 0 && id < this.#vocabSize) mask[id] = 1;
      }
    }
    this.#maskDfs(this.#trie, this.#states, mask);
    return mask;
  }

  #maskDfs(node: TrieNode, states: Set<NFAState>, mask: Uint8Array): void {
    if (node.tokenId >= 0) {
      const id = node.tokenId;
      // EOS and stop ids are handled above. Special ids (BOS, other control
      // tokens) must never appear in on-grammar output.
      if (id !== this.#eos && !this.#stopIds.has(id) && !this.#special.has(id)) {
        mask[id] = 1;
      }
    }
    const bytes = node.childBytes;
    const children = node.childNodes;
    for (let i = 0; i < bytes.length; i++) {
      const next = advanceByte(states, bytes[i]);
      if (next.size > 0) this.#maskDfs(children[i], next, mask);
    }
  }

  accept(tokenId: number): void {
    if (tokenId === this.#eos || this.#stopIds.has(tokenId)) return;
    const bytes = this.tokenBytes[tokenId];
    if (!bytes) throw new Error(`bun:llm: grammar: token id ${tokenId} has no byte sequence`);
    let cur = this.#states;
    for (let i = 0; i < bytes.length; i++) {
      cur = advanceByte(cur, bytes[i]);
      if (cur.size === 0) {
        throw new Error(`bun:llm: grammar: cannot accept token ${tokenId} (off-grammar byte at offset ${i})`);
      }
    }
    this.#states = cur;
  }

  isAccepting(): boolean {
    return this.#states.has(this.#finalAccept);
  }
}

// --- GBNF parser ------------------------------------------------------

// llama.cpp-compatible GBNF. The parser accepts "root ::= ...", char classes
// [a-zA-Z], literal strings "...", rule refs, alternation with |, grouping
// with (), and ?/*/+ quantifiers. Escapes inside literals and classes follow
// the standard subset: \n \r \t \\ \" \] and \xHH.
function parseGBNF(src: string): RuleSet {
  let pos = 0;
  const rules: RuleSet = new Map();

  function skipSpaces(): void {
    while (pos < src.length) {
      const c = src[pos];
      if (c === " " || c === "\t" || c === "\r" || c === "\n") {
        pos++;
      } else if (c === "#") {
        while (pos < src.length && src[pos] !== "\n") pos++;
      } else {
        break;
      }
    }
  }

  function eof(): boolean {
    skipSpaces();
    return pos >= src.length;
  }

  function expectOp(op: string): void {
    skipSpaces();
    if (src.slice(pos, pos + op.length) !== op) {
      throw new Error(`bun:llm: grammar: expected "${op}" at offset ${pos}, got "${src.slice(pos, pos + 10)}"`);
    }
    pos += op.length;
  }

  function parseIdent(): string {
    skipSpaces();
    const start = pos;
    while (pos < src.length) {
      const c = src.charCodeAt(pos);
      const isLetter = (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a);
      const isDigit = c >= 0x30 && c <= 0x39;
      const isAllowed = isLetter || isDigit || src[pos] === "-" || src[pos] === "_";
      if (!isAllowed) break;
      pos++;
    }
    if (pos === start) throw new Error(`bun:llm: grammar: expected identifier at offset ${pos}`);
    return src.slice(start, pos);
  }

  function parseEscape(closer: string): number {
    if (src[pos] !== "\\") {
      const ch = src.charCodeAt(pos);
      pos++;
      return ch;
    }
    pos++;
    const c = src[pos];
    pos++;
    switch (c) {
      case "n":
        return 0x0a;
      case "r":
        return 0x0d;
      case "t":
        return 0x09;
      case "\\":
        return 0x5c;
      case '"':
        return 0x22;
      case "]":
        return 0x5d;
      case "[":
        return 0x5b;
      case "'":
        return 0x27;
      case "x": {
        const h = src.slice(pos, pos + 2);
        if (!/^[0-9a-fA-F]{2}$/.test(h)) throw new Error(`bun:llm: grammar: bad \\xHH escape at offset ${pos}`);
        pos += 2;
        return parseInt(h, 16);
      }
      default:
        throw new Error(`bun:llm: grammar: unknown escape \\${c} at offset ${pos - 2} (closer "${closer}")`);
    }
  }

  function parseLiteral(): Symbol {
    if (src[pos] !== '"') throw new Error(`bun:llm: grammar: expected '"' at offset ${pos}`);
    pos++;
    const bytes: number[] = [];
    while (pos < src.length && src[pos] !== '"') {
      // Multi-byte UTF-8: the literal is JS string so we need to re-encode.
      if (src[pos] === "\\") {
        bytes.push(parseEscape('"'));
      } else {
        const cp = src.codePointAt(pos)!;
        const encoded = new TextEncoder().encode(String.fromCodePoint(cp));
        for (const b of encoded) bytes.push(b);
        pos += cp > 0xffff ? 2 : 1;
      }
    }
    if (src[pos] !== '"') throw new Error(`bun:llm: grammar: unterminated literal at offset ${pos}`);
    pos++;
    return { kind: "literal", bytes: Uint8Array.from(bytes) };
  }

  function parseCharclass(): Symbol {
    if (src[pos] !== "[") throw new Error(`bun:llm: grammar: expected '[' at offset ${pos}`);
    pos++;
    let negated = false;
    if (src[pos] === "^") {
      negated = true;
      pos++;
    }
    const ranges: Array<[number, number]> = [];
    while (pos < src.length && src[pos] !== "]") {
      const lo = parseEscape("]");
      let hi = lo;
      if (src[pos] === "-" && src[pos + 1] !== "]") {
        pos++;
        hi = parseEscape("]");
      }
      ranges.push([lo, hi]);
    }
    if (src[pos] !== "]") throw new Error(`bun:llm: grammar: unterminated char class at offset ${pos}`);
    pos++;
    return { kind: "charclass", ranges, negated };
  }

  function parseAtom(): Symbol {
    skipSpaces();
    const c = src[pos];
    if (c === '"') return parseLiteral();
    if (c === "[") return parseCharclass();
    if (c === "(") {
      pos++;
      const alts = parseAlternation();
      skipSpaces();
      if (src[pos] !== ")") throw new Error(`bun:llm: grammar: expected ')' at offset ${pos}`);
      pos++;
      return { kind: "group", alts };
    }
    const name = parseIdent();
    return { kind: "ruleref", name };
  }

  function parseQuantified(): Symbol {
    let atom = parseAtom();
    while (pos < src.length) {
      const c = src[pos];
      if (c === "?") {
        pos++;
        atom = { kind: "optional", inner: atom };
      } else if (c === "*") {
        pos++;
        atom = { kind: "star", inner: atom };
      } else if (c === "+") {
        pos++;
        atom = { kind: "plus", inner: atom };
      } else {
        break;
      }
    }
    return atom;
  }

  function parseProduction(): Production {
    const out: Symbol[] = [];
    while (true) {
      skipSpaces();
      if (pos >= src.length) break;
      const c = src[pos];
      if (c === "|" || c === ")" || c === ";" || c === "\0") break;
      // Rule terminator: next token is "identifier" followed by "::=".
      if (/[A-Za-z_]/.test(c)) {
        const save = pos;
        const name = parseIdent();
        skipSpaces();
        if (src.slice(pos, pos + 3) === "::=") {
          pos = save;
          break;
        }
        out.push({ kind: "ruleref", name });
        continue;
      }
      out.push(parseQuantified());
    }
    return out;
  }

  function parseAlternation(): Production[] {
    const alts: Production[] = [parseProduction()];
    while (true) {
      skipSpaces();
      if (src[pos] !== "|") break;
      pos++;
      alts.push(parseProduction());
    }
    return alts;
  }

  while (!eof()) {
    const name = parseIdent();
    expectOp("::=");
    const alts = parseAlternation();
    rules.set(name, alts);
  }
  if (!rules.has("root")) {
    throw new Error("bun:llm: grammar: no root rule defined");
  }
  return rules;
}

export default { compileGrammar, Grammar, parseGBNF };
