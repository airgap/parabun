export * from "./runtime-base.js";

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

// Parabun: `model X from <expr>` desugars to `const X = __paraFromSchema(<expr>)`.
// Takes a JSON Schema 2020-12 object and returns `{ parse, schema }`.
// Runtime-interpreted (slower than a parse-time inline validator, but
// works for any JSON Schema regardless of source — file imports,
// runtime-built schemas, etc.). Validates a covering subset of JSON
// Schema: type, properties, required, enum, items, minItems/maxItems,
// minimum/maximum/exclusive*, minLength/maxLength, pattern, format
// (email/uuid/uri/date/date-time/ipv4/ipv6).
export var __paraFromSchema = schemaOrThunk => {
  if (typeof schemaOrThunk === "function") {
    try {
      return __paraFromSchemaEager(schemaOrThunk());
    } catch (e) {
      if (e instanceof ReferenceError) return __paraFromSchemaLazy(schemaOrThunk);
      throw e;
    }
  }
  return __paraFromSchemaEager(schemaOrThunk);
};

var __paraFromSchemaLazy = thunk => {
  var inner = null;
  var get = () => inner ?? (inner = __paraFromSchemaEager(thunk()));
  return new Proxy(
    {},
    {
      get: (_t, prop) => get()[prop],
      has: (_t, prop) => prop in get(),
      ownKeys: _t => Reflect.ownKeys(get()),
      getOwnPropertyDescriptor: (_t, prop) => {
        var d = Reflect.getOwnPropertyDescriptor(get(), prop);
        return d ? Object.assign({}, d, { configurable: true }) : undefined;
      },
      getPrototypeOf: _t => Reflect.getPrototypeOf(get()),
    },
  );
};

var __paraFromSchemaEager = schema => {
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
  Object.defineProperty(result, "parse", {
    value: v => {
      var e = validate(schema, v);
      return e ? { tag: "Err", error: e } : { tag: "Ok", value: v };
    },
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
  __paraAddFieldAccessors(result, schema);
  return result;
};

// Wrap a sub-schema value so it can be navigated like a model.
// See src/runtime.bun.js for full design notes (kept in sync).
var __paraWrapField = val => {
  if (val && typeof val === "object" && typeof val.parse === "function" && val.schema) return val;
  if (val && typeof val === "object" && !Array.isArray(val)) {
    if (val.properties && typeof val.properties === "object") {
      return __paraFromSchema(val);
    }
    if (val.type === "array" && val.items) {
      var result = Object.assign({}, val);
      Object.defineProperty(result, "element", {
        value: __paraWrapField(val.items),
        enumerable: false,
        writable: false,
        configurable: false,
      });
      return result;
    }
  }
  return val;
};

var __paraAddFieldAccessors = (result, schema) => {
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
        s => () =>
          __paraWrapField(s)
      )(sub),
      enumerable: false,
      configurable: false,
    });
  }
};

// Parabun: `api X = { ... }` desugars to `const X = __paraFromApiSchema(<body>)`.
export var __paraFromApiSchema = bodyOrThunk => {
  if (typeof bodyOrThunk === "function") {
    try {
      return __paraFromApiSchemaEager(bodyOrThunk());
    } catch (e) {
      if (e instanceof ReferenceError) {
        var inner = null;
        var get = () => inner ?? (inner = __paraFromApiSchemaEager(bodyOrThunk()));
        return new Proxy(
          {},
          {
            get: (_t, prop) => get()[prop],
            has: (_t, prop) => prop in get(),
            ownKeys: _t => Reflect.ownKeys(get()),
            getOwnPropertyDescriptor: (_t, prop) => {
              var d = Reflect.getOwnPropertyDescriptor(get(), prop);
              return d ? Object.assign({}, d, { configurable: true }) : undefined;
            },
            getPrototypeOf: _t => Reflect.getPrototypeOf(get()),
          },
        );
      }
      throw e;
    }
  }
  return __paraFromApiSchemaEager(bodyOrThunk);
};

var __paraFromApiSchemaEager = body => {
  var result = __paraFromSchema(body);
  var SCHEMA_KEYS = ["request", "response", "body", "params", "query", "headers"];
  var capitalize = s => s[0].toUpperCase() + s.slice(1);
  for (var i = 0; i < SCHEMA_KEYS.length; i++) {
    var k = SCHEMA_KEYS[i];
    if (body[k] === undefined) continue;
    var fieldSchema = body[k];
    Object.defineProperty(result, "parse" + capitalize(k), {
      value: (sub => v => {
        var subParser = __paraFromSchema(sub);
        return subParser.parse(v);
      })(fieldSchema),
      enumerable: false,
      writable: false,
      configurable: false,
    });
  }
  for (var i = 0; i < SCHEMA_KEYS.length; i++) {
    var k = SCHEMA_KEYS[i];
    if (body[k] === undefined) continue;
    Object.defineProperty(result, k, {
      value: __paraWrapField(body[k]),
      enumerable: true,
      writable: false,
      configurable: true,
    });
  }
  return result;
};

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
