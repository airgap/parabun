// Since runtime.js loads first in the bundler, Ref.none will point at this
// value. And since it isnt exported, it will always be tree-shaken away.
var __INVALID__REF__;

// This ordering is deliberate so that the printer optimizes
// them into a single destructuring assignment.
var __create = Object.create;
var __descs = Object.getOwnPropertyDescriptors;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;

// Shared getter/setter functions: .bind(obj, key) avoids creating a closure
// and JSLexicalEnvironment per property. BoundFunction is much cheaper.
// Must be regular functions (not arrows) so .bind() can set `this`.
function __accessProp(key) {
  return this[key];
}

// This is used to implement "export * from" statements. It copies properties
// from the imported module to the current module's ESM export object. If the
// current module is an entry point and the target format is CommonJS, we
// also copy the properties to "module.exports" in addition to our module's
// internal ESM export object.
export var __reExport = (target, mod, secondTarget) => {
  var keys = __getOwnPropNames(mod);
  for (let key of keys)
    if (!__hasOwnProp.call(target, key) && key !== "default")
      __defProp(target, key, {
        get: __accessProp.bind(mod, key),
        enumerable: true,
      });

  if (secondTarget) {
    for (let key of keys)
      if (!__hasOwnProp.call(secondTarget, key) && key !== "default")
        __defProp(secondTarget, key, {
          get: __accessProp.bind(mod, key),
          enumerable: true,
        });

    return secondTarget;
  }
};

/*__PURE__*/
var __toESMCache_node;
/*__PURE__*/
var __toESMCache_esm;

// Converts the module from CommonJS to ESM. When in node mode (i.e. in an
// ".mjs" file, package.json has "type: module", or the "__esModule" export
// in the CommonJS file is falsy or missing), the "default" property is
// overridden to point to the original CommonJS exports object instead.
export var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? (__toESMCache_node ??= new WeakMap()) : (__toESMCache_esm ??= new WeakMap());
    var cached = cache.get(mod);
    if (cached) return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to =
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;

  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: __accessProp.bind(mod, key),
        enumerable: true,
      });

  if (canCache) cache.set(mod, to);
  return to;
};

// Converts the module from ESM to CommonJS. This clones the input module
// object with the addition of a non-enumerable "__esModule" property set
// to "true", which overwrites any existing export named "__esModule".
export var __toCommonJS = from => {
  var entry = (__moduleCache ??= new WeakMap()).get(from),
    desc;
  if (entry) return entry;
  entry = __defProp({}, "__esModule", { value: true });
  if ((from && typeof from === "object") || typeof from === "function")
    for (var key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(entry, key))
        __defProp(entry, key, {
          get: __accessProp.bind(from, key),
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
        });
  __moduleCache.set(from, entry);
  return entry;
};
/*__PURE__*/
var __moduleCache;

// When you do know the module is CJS
export var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);

export var __name = (target, name) => {
  Object.defineProperty(target, "name", {
    value: name,
    enumerable: false,
    configurable: true,
  });

  return target;
};

// ESM export -> CJS export
// except, writable incase something re-exports
var __returnValue = v => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}

export var __export = /* @__PURE__ */ (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name),
    });
};

function __exportValueSetter(name, newValue) {
  this[name] = newValue;
}

export var __exportValue = (target, all) => {
  for (var name in all) {
    __defProp(target, name, {
      get: __accessProp.bind(all, name),
      set: __exportValueSetter.bind(all, name),
      enumerable: true,
      configurable: true,
    });
  }
};

export var __exportDefault = (target, value) => {
  __defProp(target, "default", {
    get: () => value,
    set: newValue => (value = newValue),
    enumerable: true,
    configurable: true,
  });
};

function __hasAnyProps(obj) {
  for (let key in obj) return true;
  return false;
}

function __mergeDefaultProps(props, defaultProps) {
  var result = __create(defaultProps, __descs(props));

  for (let key in defaultProps) {
    if (result[key] !== undefined) continue;

    result[key] = defaultProps[key];
  }
  return result;
}
export var __merge = (props, defaultProps) => {
  return !__hasAnyProps(defaultProps)
    ? props
    : !__hasAnyProps(props)
      ? defaultProps
      : __mergeDefaultProps(props, defaultProps);
};

export var __legacyDecorateClassTS = function (decorators, target, key, desc) {
  var c = arguments.length,
    r = c < 3 ? target : desc === null ? (desc = Object.getOwnPropertyDescriptor(target, key)) : desc,
    d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
    r = Reflect.decorate(decorators, target, key, desc);
  else
    for (var i = decorators.length - 1; i >= 0; i--)
      if ((d = decorators[i])) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return (c > 3 && r && Object.defineProperty(target, key, r), r);
};

export var __legacyDecorateParamTS = (index, decorator) => (target, key) => decorator(target, key, index);

export var __legacyMetadataTS = (k, v) => {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};

// Internal helpers for ES decorators
var __knownSymbol = (name, symbol) => ((symbol = Symbol[name]) ? symbol : Symbol.for("Symbol." + name));
var __typeError = msg => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);

// ES decorator helpers
export var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
export var __privateIn = (member, obj) =>
  Object(obj) !== obj ? __typeError('Cannot use the "in" operator on this value') : member.has(obj);
export var __privateGet = (obj, member, getter) => (
  __accessCheck(obj, member, "read from private field"),
  getter ? getter.call(obj) : member.get(obj)
);
export var __privateAdd = (obj, member, value) =>
  member.has(obj)
    ? __typeError("Cannot add the same private member more than once")
    : member instanceof WeakSet
      ? member.add(obj)
      : member.set(obj, value);
export var __privateSet = (obj, member, value, setter) => (
  __accessCheck(obj, member, "write to private field"),
  setter ? setter.call(obj, value) : member.set(obj, value),
  value
);
export var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

export var __decoratorStart = base => [, , , __create(base?.[__knownSymbol("metadata")] ?? null)];
var __decoratorStrings = ["class", "method", "getter", "setter", "accessor", "field", "value", "get", "set"];
var __expectFn = fn => (fn !== void 0 && typeof fn !== "function" ? __typeError("Function expected") : fn);
var __decoratorContext = (kind, name, done, metadata, fns) => ({
  kind: __decoratorStrings[kind],
  name,
  metadata,
  addInitializer: fn => (done._ ? __typeError("Already initialized") : fns.push(__expectFn(fn || null))),
});
export var __decoratorMetadata = (array, target) => __defNormalProp(target, __knownSymbol("metadata"), array[3]);
export var __runInitializers = (array, flags, self, value) => {
  for (var i = 0, fns = array[flags >> 1], n = fns && fns.length; i < n; i++)
    flags & 1 ? fns[i].call(self) : (value = fns[i].call(self, value));
  return value;
};
export var __decorateElement = (array, flags, name, decorators, target, extra) => {
  var fn,
    it,
    done,
    ctx,
    access,
    k = flags & 7,
    s = !!(flags & 8),
    p = !!(flags & 16);
  var j = k > 3 ? array.length + 1 : k ? (s ? 1 : 2) : 0,
    key = __decoratorStrings[k + 5];
  var initializers = k > 3 && (array[j - 1] = []),
    extraInitializers = array[j] || (array[j] = []);
  var desc =
    k &&
    (!p && !s && (target = target.prototype),
    k < 5 &&
      (k > 3 || !p) &&
      __getOwnPropDesc(
        k < 4
          ? target
          : {
              get [name]() {
                return __privateGet(this, extra);
              },
              set [name](x) {
                __privateSet(this, extra, x);
              },
            },
        name,
      ));
  k ? p && k < 4 && __name(extra, (k > 2 ? "set " : k > 1 ? "get " : "") + name) : __name(target, name);

  for (var i = decorators.length - 1; i >= 0; i--) {
    ctx = __decoratorContext(k, name, (done = {}), array[3], extraInitializers);

    if (k) {
      ((ctx.static = s),
        (ctx.private = p),
        (access = ctx.access = { has: p ? x => __privateIn(target, x) : x => name in x }));
      if (k ^ 3)
        access.get = p
          ? x => (k ^ 1 ? __privateGet : __privateMethod)(x, target, k ^ 4 ? extra : desc.get)
          : x => x[name];
      if (k > 2)
        access.set = p ? (x, y) => __privateSet(x, target, y, k ^ 4 ? extra : desc.set) : (x, y) => (x[name] = y);
    }

    it = (0, decorators[i])(
      k ? (k < 4 ? (p ? extra : desc[key]) : k > 4 ? void 0 : { get: desc.get, set: desc.set }) : target,
      ctx,
    );
    done._ = 1;

    if (k ^ 4 || it === void 0)
      __expectFn(it) && (k > 4 ? initializers.unshift(it) : k ? (p ? (extra = it) : (desc[key] = it)) : (target = it));
    else if (typeof it !== "object" || it === null) __typeError("Object expected");
    else
      (__expectFn((fn = it.get)) && (desc.get = fn),
        __expectFn((fn = it.set)) && (desc.set = fn),
        __expectFn((fn = it.init)) && initializers.unshift(fn));
  }

  return (
    k || __decoratorMetadata(array, target),
    desc && __defProp(target, name, desc),
    p ? (k ^ 4 ? extra : desc) : target
  );
};

export var __esm = (fn, res) => () => (fn && (res = fn((fn = 0))), res);

// This is used for JSX inlining with React.
export var $$typeof = /* @__PURE__ */ Symbol.for("react.element");

export var __jsonParse = /* @__PURE__ */ a => JSON.parse(a);

export var __promiseAll = args => Promise.all(args);

// Parabun: memoize a pure function. Safe only because `pure` is parse-time
// proven — no `this`, no global side effects, no impure reads.
//
// Keying:
//   arity 0: singleton cache — first call's result is reused forever
//   arity 1: Map keyed directly by the single argument (object identity for
//            non-primitives; no stringify cost)
//   arity ≥2 (or rest-arg): nested Maps, one level per argument. The terminal
//            value for a given arg sequence is stored at a private sentinel
//            Symbol on the deepest Map — this separates "intermediate level
//            descends further" from "terminal at this depth" so that calls
//            with different argument counts sharing a prefix don't collide
//            (e.g. `f("a","b","c")` vs `f("a","b")`).
//
// Promise rejection eviction: if the cached value is a thenable and it
// rejects, the entry is deleted so the next call re-runs. Fulfilled promises
// stay cached (that's the point — in-flight dedupe + memoized result).
var __parabunMemoTerminal = Symbol("parabun.memo.terminal");

// The returned function is augmented with three methods so callers can
// invalidate entries without tearing down the memoized wrapper:
//
//   memoFn.forget(...args)  — drop the cached entry for those args; returns
//                             boolean (was it cached?). For arity-0 memos,
//                             forget() with no args drops the singleton.
//   memoFn.clear()          — drop every cached entry.
//   memoFn.bypass(...args)  — call the underlying fn, skip the cache read,
//                             do NOT write the result to the cache. Useful
//                             when the caller wants a guaranteed-fresh
//                             result without invalidating state other
//                             callers may still rely on.
// Parabun: `defer EXPR` / `defer await EXPR` wrap a thunk into a disposable so
// the surrounding `using` / `await using` runs it on scope exit.
export var __parabunDefer0 = thunk => ({ [Symbol.dispose]: thunk });
export var __parabunAsyncDefer0 = thunk => ({ [Symbol.asyncDispose]: thunk });

// Parabun: `Nd` decimal literals desugar to `__paraDec("N")`. Compact inlined
// Decimal — see packages/para-decimal for the full hand-written class. v1
// surface: .plus/.minus/.times/.dividedBy (HALF_EVEN), comparisons, .neg/.abs,
// .toString/.toNumber.
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
class __ParaDecimal {
  constructor(coef, exp) {
    this.coef = coef;
    this.exp = exp;
  }
  static from(input) {
    if (input instanceof __ParaDecimal) return input;
    if (typeof input === "string") {
      var p = __paraDec_parse(input);
      return new __ParaDecimal(p.coef, p.exp);
    }
    if (typeof input === "number") {
      if (!Number.isFinite(input)) throw new RangeError("Decimal: NaN / Infinity not supported");
      return __ParaDecimal.from(input.toString());
    }
    if (typeof input === "bigint") return new __ParaDecimal(input, 0);
    throw new TypeError("Decimal: unsupported input type " + typeof input);
  }
  plus(o) {
    o = __ParaDecimal.from(o);
    var a = __paraDec_align(this, o);
    return new __ParaDecimal(a.ca + a.cb, a.exp);
  }
  minus(o) {
    o = __ParaDecimal.from(o);
    var a = __paraDec_align(this, o);
    return new __ParaDecimal(a.ca - a.cb, a.exp);
  }
  times(o) {
    o = __ParaDecimal.from(o);
    return new __ParaDecimal(this.coef * o.coef, this.exp + o.exp);
  }
  dividedBy(o, opts) {
    o = __ParaDecimal.from(o);
    if (o.coef === 0n) throw new RangeError("Decimal: division by zero");
    if (this.coef === 0n) return new __ParaDecimal(0n, 0);
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
    return new __ParaDecimal(sign < 0 ? -q : q, resultExp);
  }
  div(o, opts) {
    return this.dividedBy(o, opts);
  }
  neg() {
    return new __ParaDecimal(-this.coef, this.exp);
  }
  abs() {
    return new __ParaDecimal(__paraDec_absBig(this.coef), this.exp);
  }
  compareTo(o) {
    o = __ParaDecimal.from(o);
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
export var __paraDec = source => __ParaDecimal.from(source);
__paraDec.Decimal = __ParaDecimal;

// Parabun: `a..b` exclusive / `a..=b` inclusive integer ranges → arrays.
// Ascending only (Python-like): an empty array when a > b.
export var __parabunRange = (a, b) => {
  var out = [];
  for (var i = a; i < b; i++) out.push(i);
  return out;
};
export var __parabunRangeInclusive = (a, b) => {
  var out = [];
  for (var i = a; i <= b; i++) out.push(i);
  return out;
};
// Parabun: `schema { ... }` → __paraFromSchema({ ... }, import.meta.url).
// Bundled output keeps schemas as plain objects (no runtime validator).
export var __paraFromSchema = (schema) => schema;
// Parabun: `schema NAME = <body>` / `schema NAME from <expr>` /
// `schema NAME { field: type }` →
// __paraSchemaDecl/__paraSchemaIngest/__paraSchemaRegister(
//   import.meta.url, "NAME", <body>).
// The registry lets `{ $ref: "#NAME" }` registry references inside schema
// bodies resolve back to the declared value (recursive/mutual schemas).
var __paraSchemaRegistry = new Map();
export var __paraSchemaDecl = (baseUrl, name, schema) => {
  __paraSchemaRegistry.set(baseUrl + "#" + name, schema);
  return schema;
};
export var __paraSchemaIngest = (baseUrl, name, schema) => __paraSchemaDecl(baseUrl, name, schema);
export var __paraSchemaRegister = (baseUrl, name, model) => __paraSchemaDecl(baseUrl, name, model);
// `schema NAME = ts<import('./x').T>` — unsubstituted TS-extraction site.
export var __paraTsSchema = (specifier, typeName) => {
  throw new Error(
    "ts<import('" +
      specifier +
      "')." +
      typeName +
      "> was not substituted — run `bun para-extract <file>` to inline the extracted schema body",
  );
};
export var __parabunMemo = (fn, arity) => {
  if (arity === 0) {
    var __has = false,
      __cached;
    var wrap = function () {
      if (__has) return __cached;
      __cached = fn.apply(this, arguments);
      __has = true;
      if (__cached && typeof __cached.then === "function") {
        __cached.then(undefined, () => {
          __has = false;
          __cached = undefined;
        });
      }
      return __cached;
    };
    wrap.forget = wrap.clear = () => {
      var had = __has;
      __has = false;
      __cached = undefined;
      return had;
    };
    wrap.bypass = function () {
      return fn.apply(this, arguments);
    };
    return wrap;
  }
  if (arity === 1) {
    var __cache1 = new Map();
    var wrap1 = function (a) {
      if (__cache1.has(a)) return __cache1.get(a);
      var v = fn.apply(this, arguments);
      __cache1.set(a, v);
      if (v && typeof v.then === "function") {
        v.then(undefined, () => __cache1.delete(a));
      }
      return v;
    };
    wrap1.forget = a => __cache1.delete(a);
    wrap1.clear = () => __cache1.clear();
    wrap1.bypass = function () {
      return fn.apply(this, arguments);
    };
    return wrap1;
  }
  var __root = new Map();
  var TERMINAL = __parabunMemoTerminal;
  var wrapN = function () {
    var args = arguments;
    var m = __root;
    for (var i = 0; i < args.length; i++) {
      var k = args[i];
      var next = m.get(k);
      if (!(next instanceof Map)) {
        next = new Map();
        m.set(k, next);
      }
      m = next;
    }
    if (m.has(TERMINAL)) return m.get(TERMINAL);
    var v = fn.apply(this, args);
    m.set(TERMINAL, v);
    if (v && typeof v.then === "function") {
      v.then(undefined, () => m.delete(TERMINAL));
    }
    return v;
  };
  wrapN.forget = function () {
    var args = arguments;
    var m = __root;
    for (var i = 0; i < args.length; i++) {
      var next = m.get(args[i]);
      if (!(next instanceof Map)) return false;
      m = next;
    }
    return m.delete(TERMINAL);
  };
  wrapN.clear = () => __root.clear();
  wrapN.bypass = function () {
    return fn.apply(this, arguments);
  };
  return wrapN;
};
