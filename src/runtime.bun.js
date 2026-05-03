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
