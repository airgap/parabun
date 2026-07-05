export * from "./runtime";

// TODO: these are duplicated from bundle_v2.js, can we ... not do that?
export var __using = (stack, value, async) => {
  if (value != null) {
    if (typeof value !== "object" && typeof value !== "function")
      throw TypeError('Object expected to be assigned to "using" declaration');
    let dispose;
    if (async) dispose = value[Symbol.asyncDispose];
    if (dispose === void 0) dispose = value[Symbol.dispose];
    if (typeof dispose !== "function") throw TypeError("Object not disposable");
    stack.push([async, dispose, value]);
  } else if (async) {
    stack.push([async]);
  }
  return value;
};

// Parabun: defer disposers. `defer expr;` desugars to
//   using __parabun_defer_N$ = __parabunDefer0(() => expr);
// and `defer await expr;` to
//   await using __parabun_defer_N$ = __parabunAsyncDefer0(async () => expr);
// The runtime `using` semantics take care of LIFO disposal, early returns,
// throws, and `SuppressedError` chaining for exceptions from multiple
// disposers — we only need to wrap the thunk in a disposable shape.
export var __parabunDefer0 = thunk => ({ [Symbol.dispose]: thunk });
export var __parabunAsyncDefer0 = thunk => ({ [Symbol.asyncDispose]: thunk });

// Parabun: range literals. `a..b` (exclusive) and `a..=b` (inclusive) desugar
// to __parabunRange / __parabunRangeInclusive. V1 is integer-only / step=1;
// empty/inverted ranges return an empty array.
export var __parabunRange = (s, e) => {
  var n = e > s ? (e - s) | 0 : 0;
  var out = new Array(n);
  for (var i = 0; i < n; i++) out[i] = s + i;
  return out;
};
export var __parabunRangeInclusive = (s, e) => {
  var n = e >= s ? ((e - s) | 0) + 1 : 0;
  var out = new Array(n);
  for (var i = 0; i < n; i++) out[i] = s + i;
  return out;
};

// Parabun: `Nd` decimal literals desugar to `__paraDec("N")`. Compact
// inlined Decimal — see packages/para-decimal/src/index.ts for the full
// hand-written class with explicit rounding modes and types. Both
// implementations produce equivalent results for the v1 surface
// (`.plus`/`.minus`/`.times`/`.dividedBy` w/ HALF_EVEN, comparisons,
// `.neg`/`.abs`, `.toString`/`.toNumber`).
var __paraDec_pow10_cache = [1n];
var __paraDec_pow10 = n => {
  while (__paraDec_pow10_cache.length <= n) {
    __paraDec_pow10_cache.push(__paraDec_pow10_cache[__paraDec_pow10_cache.length - 1] * 10n);
  }
  return __paraDec_pow10_cache[n];
};
var __paraDec_absBig = x => (x < 0n ? -x : x);
var __paraDec_signBig = x => (x < 0n ? -1 : x > 0n ? 1 : 0);
var __paraDec_digitCount = x => {
  if (x === 0n) return 1;
  var n = __paraDec_absBig(x);
  var c = 0;
  var step = __paraDec_pow10(16);
  while (n >= step) {
    n /= step;
    c += 16;
  }
  while (n > 0n) {
    n /= 10n;
    c += 1;
  }
  return c;
};
var __paraDec_parse = s => {
  s = String(s).trim();
  if (s.length === 0) throw new SyntaxError("Decimal: empty string");
  var i = 0;
  var sign = 1n;
  if (s[i] === "+") i++;
  else if (s[i] === "-") {
    sign = -1n;
    i++;
  }
  var intStart = i;
  while (i < s.length && s[i] >= "0" && s[i] <= "9") i++;
  var intEnd = i;
  var fracStart = i;
  var fracEnd = i;
  if (s[i] === ".") {
    i++;
    fracStart = i;
    while (i < s.length && s[i] >= "0" && s[i] <= "9") i++;
    fracEnd = i;
  }
  if (intStart === intEnd && fracStart === fracEnd)
    throw new SyntaxError("Decimal: invalid numeric string " + JSON.stringify(s));
  var exponent = 0;
  if (i < s.length && (s[i] === "e" || s[i] === "E")) {
    i++;
    var expSign = 1;
    if (s[i] === "+") i++;
    else if (s[i] === "-") {
      expSign = -1;
      i++;
    }
    var expStart = i;
    while (i < s.length && s[i] >= "0" && s[i] <= "9") i++;
    if (i === expStart) throw new SyntaxError("Decimal: invalid exponent in " + JSON.stringify(s));
    exponent = expSign * parseInt(s.slice(expStart, i), 10);
  }
  if (i !== s.length) throw new SyntaxError("Decimal: trailing garbage in " + JSON.stringify(s));
  var combined = (s.slice(intStart, intEnd) || "0") + s.slice(fracStart, fracEnd);
  var coef = sign * BigInt(combined);
  var exp = exponent - (fracEnd - fracStart);
  return { coef, exp };
};
var __paraDec_align = (a, b) => {
  if (a.exp === b.exp) return { ca: a.coef, cb: b.coef, exp: a.exp };
  if (a.exp < b.exp) return { ca: a.coef, cb: b.coef * __paraDec_pow10(b.exp - a.exp), exp: a.exp };
  return { ca: a.coef * __paraDec_pow10(a.exp - b.exp), cb: b.coef, exp: b.exp };
};
var __paraDec_roundHalfEven = (coef, drop, sign) => {
  if (drop <= 0) return coef;
  var divisor = __paraDec_pow10(drop);
  var q = coef / divisor;
  var r = coef - q * divisor;
  if (r === 0n) return q;
  var half = divisor / 2n;
  var roundUp;
  if (r > half) roundUp = true;
  else if (r < half) roundUp = false;
  else roundUp = q % 2n !== 0n;
  return roundUp ? q + 1n : q;
};
class Decimal {
  constructor(coef, exp) {
    this.coef = coef;
    this.exp = exp;
  }
  static from(input) {
    if (input instanceof Decimal) return input;
    if (typeof input === "string") {
      var p = __paraDec_parse(input);
      return new Decimal(p.coef, p.exp);
    }
    if (typeof input === "number") {
      if (!Number.isFinite(input)) throw new RangeError("Decimal: NaN / Infinity not supported");
      return Decimal.from(input.toString());
    }
    if (typeof input === "bigint") return new Decimal(input, 0);
    throw new TypeError("Decimal: unsupported input type " + typeof input);
  }
  plus(o) {
    o = Decimal.from(o);
    var a = __paraDec_align(this, o);
    return new Decimal(a.ca + a.cb, a.exp);
  }
  minus(o) {
    o = Decimal.from(o);
    var a = __paraDec_align(this, o);
    return new Decimal(a.ca - a.cb, a.exp);
  }
  times(o) {
    o = Decimal.from(o);
    return new Decimal(this.coef * o.coef, this.exp + o.exp);
  }
  dividedBy(o, opts) {
    o = Decimal.from(o);
    if (o.coef === 0n) throw new RangeError("Decimal: division by zero");
    if (this.coef === 0n) return new Decimal(0n, 0);
    var precision = Math.max(1, (opts && opts.precision) || 20);
    var sign = __paraDec_signBig(this.coef) * __paraDec_signBig(o.coef);
    var a = __paraDec_absBig(this.coef);
    var b = __paraDec_absBig(o.coef);
    var targetDigits = precision + 1;
    var aDigits = __paraDec_digitCount(a);
    var bDigits = __paraDec_digitCount(b);
    var k = Math.max(0, targetDigits - (aDigits - bDigits) - 1);
    var scaled = a * __paraDec_pow10(k);
    var q = scaled / b;
    while (__paraDec_digitCount(q) < targetDigits) {
      k += 1;
      scaled *= 10n;
      q = scaled / b;
    }
    while (__paraDec_digitCount(q) > targetDigits) {
      q = __paraDec_roundHalfEven(q, __paraDec_digitCount(q) - targetDigits, sign);
    }
    q = __paraDec_roundHalfEven(q, 1, sign);
    var resultExp = this.exp - o.exp - (k - 1);
    while (q !== 0n && q % 10n === 0n) {
      q /= 10n;
      resultExp += 1;
    }
    return new Decimal(sign < 0 ? -q : q, resultExp);
  }
  div(o, opts) {
    return this.dividedBy(o, opts);
  }
  neg() {
    return new Decimal(-this.coef, this.exp);
  }
  abs() {
    return new Decimal(__paraDec_absBig(this.coef), this.exp);
  }
  compareTo(o) {
    o = Decimal.from(o);
    var a = __paraDec_align(this, o);
    return a.ca < a.cb ? -1 : a.ca > a.cb ? 1 : 0;
  }
  eq(o) {
    return this.compareTo(o) === 0;
  }
  lt(o) {
    return this.compareTo(o) === -1;
  }
  gt(o) {
    return this.compareTo(o) === 1;
  }
  lte(o) {
    return this.compareTo(o) <= 0;
  }
  gte(o) {
    return this.compareTo(o) >= 0;
  }
  isZero() {
    return this.coef === 0n;
  }
  isNegative() {
    return this.coef < 0n;
  }
  isPositive() {
    return this.coef > 0n;
  }
  toString() {
    if (this.coef === 0n) return "0";
    var negative = this.coef < 0n;
    var digits = __paraDec_absBig(this.coef).toString();
    if (this.exp === 0) return negative ? "-" + digits : digits;
    if (this.exp > 0) return (negative ? "-" : "") + digits + "0".repeat(this.exp);
    var point = digits.length + this.exp;
    var body = point > 0 ? digits.slice(0, point) + "." + digits.slice(point) : "0." + "0".repeat(-point) + digits;
    return negative ? "-" + body : body;
  }
  toNumber() {
    return parseFloat(this.toString());
  }
  toJSON() {
    return this.toString();
  }
}
export var __paraDec = source => Decimal.from(source);
__paraDec.Decimal = Decimal;

// ── Para schema registry (para-schema-recursion-plan.md §2.1) ─────────────
//
// Every `schema NAME = …` / `schema NAME from …` declaration registers its
// decorated value here under a stable ID: `<import.meta.url>#NAME`. Recursive
// references inside schema bodies compile to module-relative registry refs
// (`{ $ref: "#NAME" }`) resolved lazily against the declaring module's URL —
// so schema values are plain acyclic JSON, and mutual recursion needs no
// TDZ dance, no thunks, no Proxies.
var __paraSchemaRegistry = new Map();

// Resolve a `$ref` string against the registry. Module-relative form
// (`#Name`) joins with the declaring module's URL; any other form is
// looked up verbatim (reserved for cross-module stable IDs).
var __paraSchemaResolve = (ref, baseUrl) => {
  var id = ref.charCodeAt(0) === 35 /* '#' */ && baseUrl ? baseUrl + ref : ref;
  var target = __paraSchemaRegistry.get(id);
  if (!target) throw new Error("unresolved schema reference '" + id + "'");
  return target;
};

var __paraHide = (obj, key, value) =>
  Object.defineProperty(obj, key, {
    value,
    enumerable: false,
    writable: false,
    configurable: true,
  });

// Does a (plain, acyclic) schema body contain any registry `$ref`?
// Declarations without refs are non-recursive and pay ZERO cycle/depth
// machinery at validation time (plan §4.3 — `containsRecursiveNodes`).
var __paraSchemaHasRefs = s => {
  if (!s || typeof s !== "object") return false;
  if (typeof s.$ref === "string") return true;
  if (Array.isArray(s)) {
    for (var i = 0; i < s.length; i++) if (__paraSchemaHasRefs(s[i])) return true;
    return false;
  }
  for (var k in s) if (__paraSchemaHasRefs(s[k])) return true;
  return false;
};

// ── Validator cycle/depth machinery (plan §4) ──────────────────────────────
//
// Validation is synchronous and single-threaded, so the per-root-call
// context lives in a module slot: the outermost parse() creates it and
// tears it down; nested declaration entries (crossing `$ref`s or embedded
// wrapped schemas) join it. Torn down after the root call — never
// persisted (mutation between calls would poison the memo).
//
//   inflight  WeakMap<object, Map<declId, pathDepth>> — values currently
//             being validated on this path; a hit means a cycle closed.
//   done      WeakMap<object, Set<declId>> — (value, declaration) pairs
//             already validated OK. Pair-keyed: the same object at two
//             different schema positions must be checked against both
//             (memoizing on the object alone is a soundness hole).
//             Prevents exponential re-validation on DAGs, not cycles.
//   depths    Map<declId, count> — per-declaration counters of
//             `$ref`-mediated entries on the current path (decremented on
//             return, so siblings don't accumulate).
//   pathDepth running count of declaration entries — stored per inflight
//             entry so cycle length is O(1) (currentDepth − storedDepth).
//   path      declaration names for the cycle diagnostic.
var __paraValCtx = null;
var __paraInlineId = 0;

// Escape-node check (plan §1.5): every recursion loop in the SCHEMA graph
// of a plain (non-cyclic) declaration must pass through an escape node —
// an optional field, or an items edge on a possibly-empty array. Without
// one the schema has no finite inhabitants: `schema T = { next: T }` with
// `next` required can never be satisfied by a finite acyclic value.
// Loops that pass through a `cyclic` declaration are exempt (their values
// are legally cyclic). Walks the plain-JSON schema graph only — cheap,
// one-shot per declaration.
var __paraSchemaEscapeCheck = decl => {
  var frames = new Map(); // declId → { escapeAtEntry, cyclic }
  var order = []; // path of declIds, for loop-segment cyclic scan
  var escapes = 0;

  var enterDecl = t => {
    var tid = t.$id || t.$vid;
    if (frames.has(tid)) {
      var f = frames.get(tid);
      if (escapes > f.escapeAtEntry) return true; // escaped loop — fine
      // No escape on the loop: legal only if some declaration on the
      // loop segment (including the target) is cyclic.
      var idx = order.indexOf(tid);
      for (var i = idx; i < order.length; i++) {
        if (frames.get(order[i]).cyclic) return true;
      }
      if (t.$cyclic !== undefined) return true;
      throw new Error(
        "recursive schema '" +
          (t.$name || "(schema)") +
          "' has no finite inhabitants (every recursion loop needs an optional field or a possibly-empty array — or declare the schema cyclic)",
      );
    }
    frames.set(tid, { escapeAtEntry: escapes, cyclic: t.$cyclic !== undefined });
    order.push(tid);
    visit(t.schema, t.$base);
    order.pop();
    frames.delete(tid);
    return true;
  };

  var visitEdge = (sub, base, escapable) => {
    if (escapable) escapes++;
    visit(sub, base);
    if (escapable) escapes--;
  };

  var visit = (s, base) => {
    if (!s || typeof s !== "object") return;
    if (typeof s.$ref === "string") {
      var t;
      try {
        t = __paraSchemaResolve(s.$ref, base);
      } catch (_) {
        return; // unresolved — surfaces with its own diagnostic at validation
      }
      enterDecl(t);
      return;
    }
    if (typeof s.$walk === "function") {
      enterDecl(s); // embedded wrapped declaration — same boundary rules
      return;
    }
    if (s.items) {
      visitEdge(s.items, base, !(s.minItems >= 1));
    }
    if (s.properties && typeof s.properties === "object") {
      var req = {};
      if (Array.isArray(s.required)) for (var i = 0; i < s.required.length; i++) req[s.required[i]] = true;
      for (var k in s.properties) {
        visitEdge(s.properties[k], base, req[k] !== true);
      }
    }
  };

  enterDecl(decl);
};

var __paraValidateDecl = (decl, v, viaRef) => {
  var walk = decl.$walk;
  // No walker ⇒ the declaration validates itself (DSL braces form —
  // registered via __paraSchemaRegister with its own inline parse).
  if (!walk) {
    var r = decl.parse ? decl.parse(v) : { tag: "Ok" };
    return r.tag === "Ok" ? null : r.error;
  }
  // Zero-overhead fast path: no refs anywhere, no enclosing context.
  if (!decl.$hasRefs && !__paraValCtx) return walk(v);

  var ctx = __paraValCtx;
  var owner = false;
  if (!ctx) {
    ctx = __paraValCtx = {
      inflight: new WeakMap(),
      done: new WeakMap(),
      depths: new Map(),
      pathDepth: 0,
      path: [],
    };
    owner = true;
  }
  try {
    return __paraValidateDeclInCtx(decl, v, viaRef, ctx, walk);
  } finally {
    if (owner) __paraValCtx = null;
  }
};

var __paraValidateDeclInCtx = (decl, v, viaRef, ctx, walk) => {
  // Primitives can't participate in reference cycles and terminate
  // recursion by themselves — skip straight to the walker.
  if (v === null || typeof v !== "object") return walk(v);

  var id = decl.$id || decl.$vid;
  var name = decl.$name || "(schema)";

  var doneSet = ctx.done.get(v);
  if (doneSet && doneSet.has(id)) return null;

  var m = ctx.inflight.get(v);
  if (m && m.has(id)) {
    // A reference cycle just closed through this declaration.
    var cy = decl.$cyclic;
    if (cy === undefined) {
      return (
        "cycle detected in acyclic type '" +
        name +
        "' (path: " +
        ctx.path.join(" → ") +
        " → " +
        name +
        ")"
      );
    }
    if (cy !== true) {
      var k = ctx.pathDepth - m.get(id);
      if (k > cy) {
        return "cycle exceeds declared length cyclic(" + cy + ") on '" + name + "' (actual: " + k + ")";
      }
    }
    return null; // coinductive accept — no descent, no depth consumed
  }

  // Depth cap: counts `$ref`-mediated entries of THIS declaration on the
  // current path. Recursive declarations default to 128 (plan §1.4); the
  // back-edge case above returns before ever reaching this check.
  var dc = ctx.depths.get(id) || 0;
  if (viaRef) {
    var cap = decl.$depth;
    cap = cap === "unbounded" ? Infinity : cap === undefined ? (decl.$hasRefs ? 128 : Infinity) : cap;
    if (dc + 1 > cap) {
      return "nesting exceeds declared depth(" + cap + ") on '" + name + "'";
    }
    ctx.depths.set(id, dc + 1);
  }

  if (!m) {
    m = new Map();
    ctx.inflight.set(v, m);
  }
  m.set(id, ctx.pathDepth);
  ctx.pathDepth++;
  ctx.path.push(name);

  var err;
  try {
    err = walk(v);
  } finally {
    ctx.path.pop();
    ctx.pathDepth--;
    m.delete(id);
    if (viaRef) ctx.depths.set(id, dc);
  }

  if (!err) {
    var ds = ctx.done.get(v);
    if (!ds) {
      ds = new Set();
      ctx.done.set(v, ds);
    }
    ds.add(id);
  }
  return err;
};

// ── Schema-driven MessagePack codec with REF backreferences (plan §5) ──────
//
// Wrapped schemas expose non-enumerable `.encode(v) → Uint8Array` and
// `.decode(bytes) → value`. Plain values use standard MessagePack; the
// schema drives the WALK (declaration boundaries, refTracking positions,
// bounds) — it does not re-validate (the validator is a separate oracle).
//
// REF ext type: 0x50 ('P') — reserved in para repo
// packages/para-schema/msgpack-ext-ids.md. Payload: msgpack-encoded
// unsigned int = backreference index in encounter order.
//
// refTracking (v1) = declaration has `cyclic` capability. Only objects
// encoded at refTracking declaration boundaries enter the identity table
// (plain DTO encoding pays zero overhead). Indexes are assigned in
// PREORDER, before children encode, so cycles always resolve to already-
// assigned indexes — only backreferences ever occur. The decoder replays
// the identical schema walk, so encoder/decoder counters agree; at
// refTracking positions it allocates the shell FIRST, registers it, then
// fills fields (a backref may point at an ancestor mid-construction).
// Bounds are enforced DURING decode, before allocating each recursive
// descent — that is the actual DoS guard.
var __PARA_MSGPACK_REF = 0x50;
var __paraTextEnc = new TextEncoder();
var __paraTextDec = new TextDecoder();

var __paraMsgWriter = () => {
  var buf = new Uint8Array(256);
  var view = new DataView(buf.buffer);
  var len = 0;
  var ensure = n => {
    if (len + n <= buf.length) return;
    var cap = buf.length * 2;
    while (cap < len + n) cap *= 2;
    var nb = new Uint8Array(cap);
    nb.set(buf.subarray(0, len));
    buf = nb;
    view = new DataView(buf.buffer);
  };
  return {
    u8: b => {
      ensure(1);
      buf[len++] = b;
    },
    u16: x => {
      ensure(2);
      view.setUint16(len, x);
      len += 2;
    },
    u32: x => {
      ensure(4);
      view.setUint32(len, x);
      len += 4;
    },
    u64: x => {
      ensure(8);
      view.setBigUint64(len, x);
      len += 8;
    },
    i64: x => {
      ensure(8);
      view.setBigInt64(len, x);
      len += 8;
    },
    f64: x => {
      ensure(8);
      view.setFloat64(len, x);
      len += 8;
    },
    raw: bytes => {
      ensure(bytes.length);
      buf.set(bytes, len);
      len += bytes.length;
    },
    take: () => buf.slice(0, len),
  };
};

var __paraMsgUint = n => {
  // msgpack-encode a standalone unsigned int (REF payloads).
  var w = __paraMsgWriter();
  if (n < 128) w.u8(n);
  else if (n < 256) {
    w.u8(0xcc);
    w.u8(n);
  } else if (n < 65536) {
    w.u8(0xcd);
    w.u16(n);
  } else {
    w.u8(0xce);
    w.u32(n);
  }
  return w.take();
};

var __paraEncStr = (w, s) => {
  var bytes = __paraTextEnc.encode(s);
  var n = bytes.length;
  if (n < 32) w.u8(0xa0 | n);
  else if (n < 256) {
    w.u8(0xd9);
    w.u8(n);
  } else if (n < 65536) {
    w.u8(0xda);
    w.u16(n);
  } else {
    w.u8(0xdb);
    w.u32(n);
  }
  w.raw(bytes);
};

// Encode `v` at schema position `s` (null = schema-less region). `base`
// resolves module-relative $refs of the enclosing declaration body.
var __paraEncVal = (w, s, base, v, ctx) => {
  if (s && typeof s.$ref === "string") {
    return __paraEncDecl(w, __paraSchemaResolve(s.$ref, base), v, ctx, true);
  }
  if (s && typeof s.$walk === "function") {
    return __paraEncDecl(w, s, v, ctx, false);
  }
  if (v === null || v === undefined) return w.u8(0xc0);
  var t = typeof v;
  if (t === "boolean") return w.u8(v ? 0xc3 : 0xc2);
  if (t === "number") {
    if (Number.isInteger(v) && v >= -2147483648 && v <= 4294967295) {
      if (v >= 0) {
        if (v < 128) return w.u8(v);
        if (v < 256) {
          w.u8(0xcc);
          return w.u8(v);
        }
        if (v < 65536) {
          w.u8(0xcd);
          return w.u16(v);
        }
        w.u8(0xce);
        return w.u32(v);
      }
      if (v >= -32) return w.u8(0x100 + v);
      if (v >= -128) {
        w.u8(0xd0);
        return w.u8(v & 0xff);
      }
      if (v >= -32768) {
        w.u8(0xd1);
        return w.u16(v & 0xffff);
      }
      w.u8(0xd2);
      return w.u32(v >>> 0);
    }
    w.u8(0xcb);
    return w.f64(v);
  }
  if (t === "bigint") {
    if (v >= 0n) {
      if (v > 0xffffffffffffffffn) throw new Error("bigint too large for msgpack uint64");
      w.u8(0xcf);
      return w.u64(v);
    }
    if (v < -0x8000000000000000n) throw new Error("bigint too small for msgpack int64");
    w.u8(0xd3);
    return w.i64(v);
  }
  if (t === "string") return __paraEncStr(w, v);
  if (Array.isArray(v)) {
    var n = v.length;
    if (n < 16) w.u8(0x90 | n);
    else if (n < 65536) {
      w.u8(0xdc);
      w.u16(n);
    } else {
      w.u8(0xdd);
      w.u32(n);
    }
    var items = s && s.items ? s.items : null;
    for (var i = 0; i < n; i++) __paraEncVal(w, items, base, v[i], ctx);
    return;
  }
  if (t === "object") {
    // Schema-less cycle guard: without declaration boundaries there is
    // no refTracking, so a loop here would recurse forever.
    if (ctx.rawStack.has(v)) throw new Error("cycle detected outside schema-tracked positions");
    ctx.rawStack.add(v);
    try {
      var keys = [];
      for (var k in v) if (v[k] !== undefined) keys.push(k);
      var kn = keys.length;
      if (kn < 16) w.u8(0x80 | kn);
      else if (kn < 65536) {
        w.u8(0xde);
        w.u16(kn);
      } else {
        w.u8(0xdf);
        w.u32(kn);
      }
      var props = s && s.properties && typeof s.properties === "object" ? s.properties : null;
      for (var j = 0; j < kn; j++) {
        __paraEncStr(w, keys[j]);
        __paraEncVal(w, props ? props[keys[j]] : null, base, v[keys[j]], ctx);
      }
    } finally {
      ctx.rawStack.delete(v);
    }
    return;
  }
  throw new Error("unsupported value type in schema codec: " + t);
};

// Enter declaration `decl` with value `v` — identity table registration
// (refTracking), cycle detection for acyclic declarations, depth caps.
var __paraEncDecl = (w, decl, v, ctx, viaRef) => {
  var isObj = v !== null && typeof v === "object";
  if (!isObj) return __paraEncVal(w, decl.schema, decl.$base, v, ctx);

  // refTracking = cyclic || identity:preserve (plan §2.2/§5.4). Identity
  // buys DAG aliasing through REFs; only cyclic additionally licenses
  // backrefs onto in-flight ancestors (reference cycles).
  var refTracking = decl.$cyclic !== undefined || decl.$identity === "preserve";
  var id = decl.$id || decl.$vid;
  var name = decl.$name || "(schema)";
  var m = ctx.inflight.get(v);

  if (refTracking) {
    var idx = ctx.ids.get(v);
    if (idx !== undefined) {
      if (decl.$cyclic === undefined && m && m.has(id)) {
        // Revisiting an in-flight ancestor = a cycle; identity:preserve
        // alone does not license cycles.
        throw new Error("cycle detected in acyclic type '" + name + "' (encode)");
      }
      // Revisit (DAG share or cycle) → REF backreference.
      var payload = __paraMsgUint(idx);
      w.u8(0xc7); // ext8
      w.u8(payload.length);
      w.u8(__PARA_MSGPACK_REF);
      w.raw(payload);
      return;
    }
  }

  if (m && m.has(id)) {
    // Cycle through an acyclic declaration — same diagnostic family as
    // the validator; encoding cannot represent it without refTracking.
    throw new Error("cycle detected in acyclic type '" + name + "' (encode)");
  }

  var dc = ctx.depths.get(id) || 0;
  if (viaRef) {
    var cap = decl.$depth;
    cap = cap === "unbounded" ? Infinity : cap === undefined ? (decl.$hasRefs ? 128 : Infinity) : cap;
    if (dc + 1 > cap) throw new Error("nesting exceeds declared depth(" + cap + ") on '" + name + "'");
    ctx.depths.set(id, dc + 1);
  }
  if (!m) {
    m = new Map();
    ctx.inflight.set(v, m);
  }
  m.set(id, 0);
  if (refTracking) ctx.ids.set(v, ctx.nextId++); // preorder, before children

  try {
    __paraEncVal(w, decl.schema, decl.$base, v, ctx);
  } finally {
    m.delete(id);
    if (viaRef) ctx.depths.set(id, dc);
  }
};

var __paraSchemaEncode = (decl, v) => {
  var w = __paraMsgWriter();
  var ctx = {
    ids: new Map(),
    nextId: 0,
    inflight: new WeakMap(),
    depths: new Map(),
    rawStack: new Set(),
  };
  __paraEncDecl(w, decl, v, ctx, false);
  return w.take();
};

var __paraMsgReader = bytes => {
  var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  var pos = 0;
  var need = n => {
    if (pos + n > bytes.length) throw new Error("unexpected end of msgpack stream");
  };
  return {
    peek: () => {
      need(1);
      return bytes[pos];
    },
    u8: () => {
      need(1);
      return bytes[pos++];
    },
    u16: () => {
      need(2);
      var x = view.getUint16(pos);
      pos += 2;
      return x;
    },
    u32: () => {
      need(4);
      var x = view.getUint32(pos);
      pos += 4;
      return x;
    },
    u64: () => {
      need(8);
      var x = view.getBigUint64(pos);
      pos += 8;
      return x;
    },
    i64: () => {
      need(8);
      var x = view.getBigInt64(pos);
      pos += 8;
      return x;
    },
    f64: () => {
      need(8);
      var x = view.getFloat64(pos);
      pos += 8;
      return x;
    },
    str: n => {
      need(n);
      var s = __paraTextDec.decode(bytes.subarray(pos, pos + n));
      pos += n;
      return s;
    },
    done: () => pos >= bytes.length,
  };
};

// Read one REF payload (a msgpack uint) if the next token is our ext;
// returns the index or -1 when the next token is not a REF.
var __paraDecMaybeRef = r => {
  var b = r.peek();
  var extLen = -1;
  if (b === 0xd4) extLen = 1;
  else if (b === 0xd5) extLen = 2;
  else if (b === 0xd6) extLen = 4;
  else if (b === 0xd7) extLen = 8;
  else if (b === 0xc7) extLen = -2; // length byte follows
  if (extLen === -1) return -1;
  r.u8();
  if (extLen === -2) extLen = r.u8();
  var type = r.u8();
  if (type !== __PARA_MSGPACK_REF) throw new Error("unknown msgpack ext type " + type + " in schema codec");
  // Payload: msgpack uint.
  var pb = r.u8();
  if (pb < 128) return pb;
  if (pb === 0xcc) return r.u8();
  if (pb === 0xcd) return r.u16();
  if (pb === 0xce) return r.u32();
  throw new Error("malformed REF payload");
};

var __paraDecVal = (r, s, base, ctx, shell) => {
  if (s && typeof s.$ref === "string") {
    return __paraDecDecl(r, __paraSchemaResolve(s.$ref, base), ctx, true);
  }
  if (s && typeof s.$walk === "function") {
    return __paraDecDecl(r, s, ctx, false);
  }
  var b = r.peek();
  if ((b >= 0xd4 && b <= 0xd8) || b === 0xc7 || b === 0xc8 || b === 0xc9) {
    // A REF outside a refTracking declaration position is malformed —
    // the encoder only emits them at refTracking boundaries.
    var probe = __paraDecMaybeRef(r);
    throw new Error(
      "REF at non-refTracking schema position (index " + probe + ", " + ctx.objs.length + " objects seen)",
    );
  }
  if (ctx.rawDepth > 1024) throw new Error("nesting exceeds schema-less decode limit (1024)");

  r.u8();
  if (b === 0xc0) return null;
  if (b === 0xc2) return false;
  if (b === 0xc3) return true;
  if (b < 0x80) return b; // positive fixint
  if (b >= 0xe0) return b - 0x100; // negative fixint
  if (b === 0xcc) return r.u8();
  if (b === 0xcd) return r.u16();
  if (b === 0xce) return r.u32();
  if (b === 0xcf) return r.u64(); // bigint by construction (encoder)
  if (b === 0xd0) {
    var x8 = r.u8();
    return x8 > 127 ? x8 - 256 : x8;
  }
  if (b === 0xd1) {
    var x16 = r.u16();
    return x16 > 32767 ? x16 - 65536 : x16;
  }
  if (b === 0xd2) {
    var x32 = r.u32();
    return x32 > 2147483647 ? x32 - 4294967296 : x32;
  }
  if (b === 0xd3) return r.i64(); // bigint
  if (b === 0xcb) return r.f64();
  if ((b & 0xe0) === 0xa0) return r.str(b & 0x1f);
  if (b === 0xd9) return r.str(r.u8());
  if (b === 0xda) return r.str(r.u16());
  if (b === 0xdb) return r.str(r.u32());

  var n;
  if ((b & 0xf0) === 0x90 || b === 0xdc || b === 0xdd) {
    n = (b & 0xf0) === 0x90 ? b & 0x0f : b === 0xdc ? r.u16() : r.u32();
    var arr = shell || [];
    var items = s && s.items ? s.items : null;
    ctx.rawDepth++;
    for (var i = 0; i < n; i++) arr.push(__paraDecVal(r, items, base, ctx, null));
    ctx.rawDepth--;
    return arr;
  }
  if ((b & 0xf0) === 0x80 || b === 0xde || b === 0xdf) {
    n = (b & 0xf0) === 0x80 ? b & 0x0f : b === 0xde ? r.u16() : r.u32();
    var obj = shell || {};
    var props = s && s.properties && typeof s.properties === "object" ? s.properties : null;
    ctx.rawDepth++;
    for (var j = 0; j < n; j++) {
      var kb = r.u8();
      var key;
      if ((kb & 0xe0) === 0xa0) key = r.str(kb & 0x1f);
      else if (kb === 0xd9) key = r.str(r.u8());
      else if (kb === 0xda) key = r.str(r.u16());
      else if (kb === 0xdb) key = r.str(r.u32());
      else throw new Error("malformed msgpack map key");
      obj[key] = __paraDecVal(r, props ? props[key] : null, base, ctx, null);
    }
    ctx.rawDepth--;
    return obj;
  }
  throw new Error("unsupported msgpack token 0x" + b.toString(16));
};

var __paraDecDecl = (r, decl, ctx, viaRef) => {
  var refTracking = decl.$cyclic !== undefined || decl.$identity === "preserve";
  var id = decl.$id || decl.$vid;
  var name = decl.$name || "(schema)";

  var refIdx = __paraDecMaybeRef(r);
  if (refIdx !== -1) {
    if (!refTracking) {
      throw new Error(
        "REF at non-refTracking schema position (index " + refIdx + ", " + ctx.objs.length + " objects seen)",
      );
    }
    if (refIdx >= ctx.objs.length) {
      throw new Error(
        "invalid backreference in msgpack stream (index " + refIdx + ", " + ctx.objs.length + " objects seen)",
      );
    }
    var entry = ctx.objs[refIdx];
    if (entry.inflight) {
      // Backref onto an ancestor still under construction — a cycle.
      var cy = decl.$cyclic;
      if (cy === undefined) throw new Error("cycle detected in acyclic type '" + name + "' (decode)");
      if (cy !== true) {
        var k = ctx.pathDepth - entry.pathDepth;
        if (k > cy) {
          throw new Error("cycle exceeds declared length cyclic(" + cy + ") on '" + name + "' (actual: " + k + ")");
        }
      }
    }
    return entry.v;
  }

  // Depth cap BEFORE allocating the descent — the actual DoS guard.
  var dc = ctx.depths.get(id) || 0;
  if (viaRef) {
    var cap = decl.$depth;
    cap = cap === "unbounded" ? Infinity : cap === undefined ? (decl.$hasRefs ? 128 : Infinity) : cap;
    if (dc + 1 > cap) throw new Error("nesting exceeds declared depth(" + cap + ") on '" + name + "'");
    ctx.depths.set(id, dc + 1);
  }

  var b = r.peek();
  var entry2 = null;
  var shell = null;
  if (refTracking && (((b & 0xf0) === 0x80 || b === 0xde || b === 0xdf) || ((b & 0xf0) === 0x90 || b === 0xdc || b === 0xdd))) {
    // Shell-first: allocate + register before filling, so backrefs can
    // land on this object while it is still mid-construction.
    shell = (b & 0xf0) === 0x90 || b === 0xdc || b === 0xdd ? [] : {};
    entry2 = { v: shell, inflight: true, pathDepth: ctx.pathDepth };
    ctx.objs.push(entry2);
  }

  ctx.pathDepth++;
  try {
    var out = __paraDecVal(r, decl.schema, decl.$base, ctx, shell);
    if (entry2) entry2.inflight = false;
    return out;
  } finally {
    ctx.pathDepth--;
    if (viaRef) ctx.depths.set(id, dc);
  }
};

var __paraSchemaDecode = (decl, bytes) => {
  var r = __paraMsgReader(bytes);
  var ctx = { objs: [], pathDepth: 0, depths: new Map(), rawDepth: 0 };
  return __paraDecDecl(r, decl, ctx, false);
};

// Parabun: `schema NAME = <body>` desugars to
//   `const NAME = __paraSchemaDecl(import.meta.url, "NAME", <body>[, caps])`.
// Decorates the body (same as __paraFromSchema) and registers it under
// its stable ID so `$ref`s from this and other schemas can reach it.
// `caps` carries declaration capability bits (plan §1.4/§2.2):
//   { cyclic: true | x }   — cycles permitted (any length / ≤ x hops)
//   { depth: n | "unbounded" } — recursive-nesting cap / explicit opt-out
// Stored non-enumerably as $cyclic / $depth; the validator (plan §4,
// build step 3) consumes them.
export var __paraSchemaDecl = (baseUrl, name, schema, caps) => {
  var wrapped = __paraFromSchemaEager(schema, baseUrl);
  __paraHide(wrapped, "$id", baseUrl + "#" + name);
  __paraHide(wrapped, "$name", name);
  if (caps) {
    if (caps.cyclic !== undefined) __paraHide(wrapped, "$cyclic", caps.cyclic);
    if (caps.depth !== undefined) __paraHide(wrapped, "$depth", caps.depth);
    if (caps.identity !== undefined) __paraHide(wrapped, "$identity", caps.identity);
  }
  __paraSchemaRegistry.set(baseUrl + "#" + name, wrapped);
  return wrapped;
};

// Parabun: `schema NAME { field: type }` (DSL braces form) desugars its
// model object through
//   `const NAME = __paraSchemaRegister(import.meta.url, "NAME", <model>)`.
// Registers AS-IS (no re-decoration — the DSL's inline parse/validate
// stay authoritative) so `$ref`s from JSON-literal schema bodies resolve
// to it; the validator delegates to the model's own .parse.
export var __paraSchemaRegister = (baseUrl, name, model) => {
  __paraHide(model, "$id", baseUrl + "#" + name);
  __paraHide(model, "$name", name);
  __paraSchemaRegistry.set(baseUrl + "#" + name, model);
  return model;
};

// Parabun: `schema NAME from <expr>` desugars to
//   `const NAME = __paraSchemaIngest(import.meta.url, "NAME", <expr>[, caps])`.
// Same registration + decoration as __paraSchemaDecl today; kept as a
// separate entry point so ingestion-time checks (escape-node,
// shell-constructibility — plan §1.5) can land here without touching
// the literal-declaration path.
export var __paraSchemaIngest = (baseUrl, name, schema, caps) =>
  __paraSchemaDecl(baseUrl, name, schema, caps);

// Takes a JSON Schema 2020-12 object and returns `{ parse, schema }`.
// Runtime-interpreted (slower than a parse-time inline validator, but
// works for any JSON Schema regardless of source — file imports,
// runtime-built schemas, etc.). Validates a covering subset of JSON
// Schema: type, properties, required, enum, items, minItems/maxItems,
// minimum/maximum/exclusive*, minLength/maxLength, pattern, format
// (email/uuid/uri/date/date-time/ipv4/ipv6), plus registry `$ref`s.
// `baseUrl` (optional) is the base for module-relative `$ref`s; inline
// `schema { … }` literals pass their module URL.
export var __paraFromSchema = (schema, baseUrl) => __paraFromSchemaEager(schema, baseUrl);

var __paraFromSchemaEager = (schema, baseUrl) => {
  var FORMATS = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    uri: /^[a-z][a-z0-9+.-]*:\/\/[^\s]+$/i,
    date: /^\d{4}-\d{2}-\d{2}$/,
    "date-time": /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/,
    ipv4: /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/,
    ipv6: /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$|^([0-9a-f]{1,4}:){1,7}:$|^::([0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4}$|^([0-9a-f]{1,4}:){1,6}(:[0-9a-f]{1,4})+$/i,
  };
  var validate = (s, v) => {
    if (typeof s.$ref === "string") {
      // Registry reference — delegate to the target declaration.
      // Crossing a `$ref` IS the declaration boundary: the target
      // validates under its own base URL and capabilities (plan §1.4
      // non-propagation falls out of this delegation), and the cycle/
      // depth machinery hooks exactly here (viaRef entry).
      var target = __paraSchemaResolve(s.$ref, baseUrl);
      return __paraValidateDecl(target, v, true);
    }
    if (s !== schema && s && typeof s.$walk === "function") {
      // Embedded wrapped declaration (cross-module composition, `from`
      // ingests) — same boundary semantics as a `$ref`, minus the depth
      // consumption (it's a first crossing, not a recursive re-entry).
      return __paraValidateDecl(s, v, false);
    }
    if (s.enum) {
      for (var i = 0; i < s.enum.length; i++) if (v === s.enum[i]) return null;
      return "expected one of " + JSON.stringify(s.enum);
    }
    var t = s.type;
    if (t === "string" || t === "varchar" || t === "text" || t === "char") {
      if (typeof v !== "string") return "expected string";
      if (s.minLength != null && v.length < s.minLength) return "shorter than minLength " + s.minLength;
      if (s.maxLength != null && v.length > s.maxLength) return "longer than maxLength " + s.maxLength;
      if (s.format && FORMATS[s.format] && !FORMATS[s.format].test(v)) return "expected format " + s.format;
      if (s.pattern && !new RegExp(s.pattern).test(v)) return "does not match pattern " + s.pattern;
      return null;
    }
    if (t === "integer" || t === "bigint" || t === "snowflake") {
      // Accept BigInt (typical for `bigint`/`snowflake` from DB libs) OR
      // an integer-shaped Number (typical for JSON-deserialized values).
      // Comparisons coerce: BigInt < Number is fine in modern JS, BUT
      // BigInt < BigInt requires both to be BigInt — so we coerce
      // bound checks to whichever shape `v` is.
      var isBig = typeof v === "bigint";
      if (!isBig && (typeof v !== "number" || !Number.isInteger(v))) return "expected integer";
      if (s.minimum != null && v < (isBig ? BigInt(s.minimum) : s.minimum)) return "below minimum " + s.minimum;
      if (s.maximum != null && v > (isBig ? BigInt(s.maximum) : s.maximum)) return "above maximum " + s.maximum;
      if (s.exclusiveMinimum != null && v <= (isBig ? BigInt(s.exclusiveMinimum) : s.exclusiveMinimum))
        return "must be > exclusiveMinimum " + s.exclusiveMinimum;
      if (s.exclusiveMaximum != null && v >= (isBig ? BigInt(s.exclusiveMaximum) : s.exclusiveMaximum))
        return "must be < exclusiveMaximum " + s.exclusiveMaximum;
      return null;
    }
    if (t === "number" || t === "numeric") {
      if (typeof v !== "number") return "expected number";
      if (s.minimum != null && v < s.minimum) return "below minimum " + s.minimum;
      if (s.maximum != null && v > s.maximum) return "above maximum " + s.maximum;
      if (s.exclusiveMinimum != null && v <= s.exclusiveMinimum)
        return "must be > exclusiveMinimum " + s.exclusiveMinimum;
      if (s.exclusiveMaximum != null && v >= s.exclusiveMaximum)
        return "must be < exclusiveMaximum " + s.exclusiveMaximum;
      return null;
    }
    if (t === "boolean") return typeof v === "boolean" ? null : "expected boolean";
    if (t === "timestamptz") return typeof v === "string" || v instanceof Date ? null : "expected timestamp";
    if (t === "array") {
      if (!Array.isArray(v)) return "expected array";
      if (s.minItems != null && v.length < s.minItems) return "fewer than minItems " + s.minItems;
      if (s.maxItems != null && v.length > s.maxItems) return "more than maxItems " + s.maxItems;
      if (s.items)
        for (var i = 0; i < v.length; i++) {
          var e = validate(s.items, v[i]);
          if (e) return "item[" + i + "]: " + e;
        }
      return null;
    }
    if (t === "object" || (t == null && s.properties)) {
      if (typeof v !== "object" || v === null) return "expected object";
      if (s.required)
        for (var i = 0; i < s.required.length; i++) {
          var k = s.required[i];
          if (v[k] === undefined || v[k] === null) return "missing required field " + k;
        }
      if (s.properties)
        for (var k in s.properties) {
          if (v[k] === undefined || v[k] === null) continue; // optional skip
          var e = validate(s.properties[k], v[k]);
          if (e) return k + ": " + e;
        }
      return null;
    }
    if (t === "jsonb" || t === "json" || t === "enum") {
      // Permissive — jsonb is opaque; enum should already be handled by .enum above.
      if (t === "enum" && Array.isArray(s.enum)) {
        for (var i = 0; i < s.enum.length; i++) if (v === s.enum[i]) return null;
        return "expected one of " + JSON.stringify(s.enum);
      }
      return null;
    }
    return null; // unknown type → permissive
  };
  // Spread the source schema's keys onto the result so existing
  // consumers that read `user.properties` / `user.required` /
  // `user.type` still work after the conversion. `parse` and `schema`
  // are added as NON-ENUMERABLE so `{ ...userModel }` spread doesn't
  // copy them — important when downstream code spreads model fields
  // into other schema literals (e.g. `aiSettings: { ...aiSettings }`).
  var result = Object.assign({}, schema);
  // Internal hooks for the cycle/depth machinery (__paraValidateDecl):
  // the raw walker, the containsRecursiveNodes flag, and a fallback
  // identity for anonymous (inline) schemas so memo entries never
  // collide across two distinct inline literals.
  __paraHide(result, "$walk", v => validate(schema, v));
  __paraHide(result, "$hasRefs", __paraSchemaHasRefs(schema));
  __paraHide(result, "$vid", "(inline#" + __paraInlineId++ + ")");
  __paraHide(result, "$base", baseUrl);
  // Escape-node check (plan §1.5) — runs once, on first parse: the
  // earliest point where forward/mutual references are all registered.
  // Success is memoized; a failing schema keeps throwing.
  var escapeChecked = false;
  var parseFn = v => {
    if (!escapeChecked) {
      if (result.$hasRefs) __paraSchemaEscapeCheck(result);
      escapeChecked = true;
    }
    var e = __paraValidateDecl(result, v, false);
    return e ? { tag: "Err", error: e } : { tag: "Ok", value: v };
  };
  Object.defineProperty(result, "parse", {
    value: parseFn,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  // `validate` is an alias for `parse` today — both validate an already-
  // parsed value against the schema. The semantic split (parse handles
  // strings via JSON.parse, validate operates on already-parsed objects)
  // is a follow-up; the alias gives consumers the .validate name to
  // reach for in the meantime.
  Object.defineProperty(result, "validate", {
    value: parseFn,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  Object.defineProperty(result, "schema", {
    value: schema,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  // Schema-driven MessagePack codec (plan §5). Structural, not
  // validating — run .parse/.validate separately when needed.
  __paraHide(result, "encode", v => __paraSchemaEncode(result, v));
  __paraHide(result, "decode", bytes => __paraSchemaDecode(result, bytes));
  // Field navigation: for an object-shape schema, expose each property
  // as a non-enumerable accessor that returns the wrapped sub-schema.
  // Lets consumers walk the schema graph naturally:
  //   `User.profile.bio` ≡ `User.schema.properties.profile.properties.bio`
  // (only when `properties` exists; leaves don't get accessors).
  __paraAddFieldAccessors(result, schema, baseUrl);

  return result;
};

// Wrap a sub-schema value so it can be navigated like a model:
//   - if `val` is a registry reference (`{ $ref: "#Name" }`), resolve it —
//     navigation lands on the registered declaration itself, preserving
//     identity (`Tree.children.element === Tree`);
//   - if `val` is already a wrapped model (has `.parse` + `.schema`), return as-is;
//   - if `val` is an object-shape schema (`{type:'object', properties:...}`),
//     wrap recursively so its fields are navigable;
//   - if `val` is an array schema (`{type:'array', items: <subSchema>}`),
//     return the schema with a non-enumerable `.element` getter pointing at
//     the wrapped item type — explicit descent per LYK-826's API design.
//     A getter (not a value) so `$ref` items resolve lazily: forward and
//     self references aren't registered yet when the array wraps;
//   - otherwise return `val` as-is — leaf JSON Schema fragments stay raw.
var __paraWrapField = (val, baseUrl) => {
  if (val && typeof val === "object" && typeof val.$ref === "string") {
    return __paraSchemaResolve(val.$ref, baseUrl);
  }
  if (val && typeof val === "object" && typeof val.parse === "function" && val.schema) return val;
  if (val && typeof val === "object" && !Array.isArray(val)) {
    if (val.properties && typeof val.properties === "object") {
      return __paraFromSchema(val, baseUrl);
    }
    if (val.type === "array" && val.items) {
      var result = Object.assign({}, val);
      Object.defineProperty(result, "element", {
        get: (
          (items, base) => () =>
            __paraWrapField(items, base)
        )(val.items, baseUrl),
        enumerable: false,
        configurable: false,
      });
      return result;
    }
  }
  return val;
};

// Add navigable field-accessors to a wrapped model. For each entry in
// the schema's `.properties`, expose a non-enumerable getter on the
// result whose value is the wrapped sub-schema. We don't shadow keys
// that already exist on the result (e.g. `type`, `properties`,
// `required` are spread-copied keys of the parent schema).
var __paraAddFieldAccessors = (result, schema, baseUrl) => {
  // Only add field-navigation accessors when the schema EXPLICITLY
  // declares itself an object schema. Lockstep-style records often
  // omit `type: 'object'` (the convention is "any schema with
  // properties is implicitly an object"). Adding accessors there
  // would shadow inner `type`/`required`/`items` properties — which
  // breaks downstream tools that introspect via `'type' in schema`.
  if (!schema || schema.type !== "object" || !schema.properties || typeof schema.properties !== "object") return;
  for (var key in schema.properties) {
    if (Object.prototype.hasOwnProperty.call(result, key)) continue;
    var sub = schema.properties[key];
    Object.defineProperty(result, key, {
      get: (
        (s, base) => () =>
          __paraWrapField(s, base)
      )(sub, baseUrl),
      enumerable: false,
      configurable: false,
    });
  }
};

// Note: HTTP envelope auto-detection was dropped. `__paraFromSchema`
// is a pure JSON Schema decorator now — it adds `.parse`, `.schema`,
// `.is`, and field-navigation accessors. Endpoint shapes
// (`{ request, response, throws, ... }`) are plain JS objects whose
// schema slots hold either an imported `schema X = ...` binding or an
// inline `schema { ... }` literal; lockstep (or any consumer) is
// responsible for any per-slot helpers like `parseRequest`.

export var __callDispose = (stack, error, hasError) => {
  let fail = e =>
      (error = hasError
        ? new SuppressedError(e, error, "An error was suppressed during disposal")
        : ((hasError = true), e)),
    next = it => {
      while ((it = stack.pop())) {
        try {
          var result = it[1] && it[1].call(it[2]);
          if (it[0]) return Promise.resolve(result).then(next, e => (fail(e), next()));
        } catch (e) {
          fail(e);
        }
      }
      if (hasError) throw error;
    };
  return next();
};
