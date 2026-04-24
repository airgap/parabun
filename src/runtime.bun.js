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

// Parabun: peek a promise for ..= await elision.
// Returns [1, result] if fulfilled or non-promise, [0, value] otherwise.
export var __parabunPeek = v => {
  var s = Bun.peek.status(v);
  return s === "fulfilled" ? [1, Bun.peek(v)] : [0, v];
};

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
