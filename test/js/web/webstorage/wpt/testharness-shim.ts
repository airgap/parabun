// Minimal WPT testharness.js shim mapped onto bun:test, after
// test/js/third_party/wpt-h2/testharness-shim.ts. Only the surface the
// vendored webstorage *.window.js files touch is implemented, ported from
// upstream resources/testharness.js at the same commit so failure messages
// read like WPT's.
//
// testharness runs a synchronous test() the moment it is called, and the
// vendored files lean on that: several nest test() inside a running test,
// and set.window.js reads `this.name` and uses `this.add_cleanup`. bun:test
// cannot register a test from inside one, so each body runs eagerly here and
// bun:test only receives the recorded outcome.
//
// Tests named in `knownFailures` register as test.todo so the suite stays
// green while naming every gap. Their bodies still run: one that starts
// passing registers a failing test instead, so the entry has to be removed.

import { test as bunTest } from "bun:test";

const quotaReason =
  "assert_throws_quotaexceedederror requires the WebIDL QuotaExceededError interface (`self.QuotaExceededError`, " +
  "with `quota` and `requested` attributes); Bun has no such global and webstorage.ts throws the legacy " +
  "DOMException form, as Node does";

// Keyed "<vendored file>: <test name>" because two files share a test name.
export const knownFailures: Record<string, string> = {
  "storage_local_setitem_quotaexceedederr.window.js: Throws QuotaExceededError when the quota has been exceeded":
    quotaReason,
  "storage_session_setitem_quotaexceedederr.window.js: Throws QuotaExceededError when the quota has been exceeded":
    quotaReason,
  "storage_local_quota_independent_from_session.window.js: localStorage retains comparable quota after sessionStorage exhaustion":
    quotaReason,
  "storage_session_quota_independent_from_local.window.js: sessionStorage retains comparable quota after localStorage exhaustion":
    quotaReason,
};

class AssertionError extends Error {
  override name = "AssertionError";
}

function truncate(s: string, len: number): string {
  return s.length > len ? s.substring(0, len - 3) + "..." : s;
}

const replacements: Record<string, string> = {
  "0": "0",
  "1": "x01",
  "2": "x02",
  "3": "x03",
  "4": "x04",
  "5": "x05",
  "6": "x06",
  "7": "x07",
  "8": "b",
  "9": "t",
  "10": "n",
  "11": "v",
  "12": "f",
  "13": "r",
  "14": "x0e",
  "15": "x0f",
  "16": "x10",
  "17": "x11",
  "18": "x12",
  "19": "x13",
  "20": "x14",
  "21": "x15",
  "22": "x16",
  "23": "x17",
  "24": "x18",
  "25": "x19",
  "26": "x1a",
  "27": "x1b",
  "28": "x1c",
  "29": "x1d",
  "30": "x1e",
  "31": "x1f",
  "0xfffd": "ufffd",
  "0xfffe": "ufffe",
  "0xffff": "uffff",
};

const formatEscapeMap: Record<string, string> = { "\\": "\\\\", '"': '\\"' };
for (const p in replacements) {
  formatEscapeMap[String.fromCharCode(Number(p))] = "\\" + replacements[p];
}
const formatEscapePattern = new RegExp(
  `[${Object.keys(formatEscapeMap)
    .map(k => (k === "\\" ? "\\\\" : k))
    .join("")}]`,
  "g",
);

function format_value(val: unknown, seen: unknown[] = []): string {
  if (typeof val === "object" && val !== null) {
    if (seen.indexOf(val) >= 0) return "[...]";
    seen.push(val);
  }
  if (Array.isArray(val)) {
    return "[" + val.map(x => format_value(x, seen)).join(", ") + "]";
  }
  switch (typeof val) {
    case "string":
      return '"' + val.replace(formatEscapePattern, match => formatEscapeMap[match]) + '"';
    case "boolean":
    case "undefined":
      return String(val);
    case "number":
      if (val === 0 && 1 / val === -Infinity) return "-0";
      return String(val);
    case "bigint":
      return String(val) + "n";
    case "object":
      if (val === null) return "null";
    // falls through
    default:
      return typeof val + ' "' + truncate(String(val), 1000) + '"';
  }
}

function assert(
  expectedTrue: boolean,
  functionName: string,
  description: string | undefined,
  error: string,
  substitutions: Record<string, unknown> = {},
): void {
  if (expectedTrue === true) return;
  const message = (functionName + ": " + (description ? description + " " : "") + error).replace(
    /\$\{(\w+)\}/g,
    (_, key) => format_value(substitutions[key]),
  );
  throw new AssertionError(message);
}

function same_value(x: unknown, y: unknown): boolean {
  if (y !== y) return x !== x;
  if (x === 0 && y === 0) return 1 / (x as number) === 1 / (y as number);
  return x === y;
}

function assert_unreached(description?: string): void {
  assert(false, "assert_unreached", description, "Reached unreachable code");
}

class WptTest {
  readonly name: string;
  readonly cleanups: (() => unknown)[] = [];

  constructor(name: string) {
    this.name = name;
  }

  add_cleanup(callback: () => unknown): void {
    this.cleanups.push(callback);
  }

  unreached_func(description?: string): () => void {
    return () => assert_unreached(description);
  }
}

let currentFile = "";

export function setCurrentFile(file: string): void {
  currentFile = file;
}

// Exported rather than installed on globalThis because bun:test injects its
// own `test` binding into every module it loads; run.test.ts feeds this in as
// a Function-constructor parameter instead.
export const wptTest = (fn: (this: WptTest, t: WptTest) => unknown, name: string) => {
  const t = new WptTest(name);
  let failure: unknown;
  try {
    fn.call(t, t);
  } catch (e) {
    failure = e;
  }
  // Upstream reports a throwing cleanup as a harness error rather than a test
  // failure; here it fails the test, which is the stricter reading.
  for (const cleanup of t.cleanups) {
    try {
      cleanup();
    } catch (e) {
      failure ??= e;
    }
  }

  const key = `${currentFile}: ${name}`;
  if (key in knownFailures) {
    if (failure === undefined) {
      bunTest(name, () => {
        throw new Error(`"${key}" is listed in knownFailures but passed; remove the entry`);
      });
    } else {
      bunTest.todo(name);
    }
    return;
  }
  bunTest(name, () => {
    if (failure !== undefined) throw failure;
  });
};

const g = globalThis as any;

g.format_value = format_value;
g.assert_unreached = assert_unreached;

g.assert_true = (actual: unknown, description?: string) => {
  assert(actual === true, "assert_true", description, "expected true got ${actual}", { actual });
};

g.assert_false = (actual: unknown, description?: string) => {
  assert(actual === false, "assert_false", description, "expected false got ${actual}", { actual });
};

g.assert_equals = (actual: unknown, expected: unknown, description?: string) => {
  assert(
    typeof actual === typeof expected,
    "assert_equals",
    description,
    "expected (${expectedType}) ${expected} but got (${actualType}) ${actual}",
    { expected, actual, expectedType: typeof expected, actualType: typeof actual },
  );
  assert(same_value(actual, expected), "assert_equals", description, "expected ${expected} but got ${actual}", {
    expected,
    actual,
  });
};

g.assert_not_equals = (actual: unknown, expected: unknown, description?: string) => {
  assert(!same_value(actual, expected), "assert_not_equals", description, "got disallowed value ${actual}", {
    actual,
  });
};

g.assert_array_equals = (actual: any, expected: any, description?: string) => {
  assert(
    typeof actual === "object" && actual !== null && "length" in actual,
    "assert_array_equals",
    description,
    "value is ${actual}, expected array",
    { actual },
  );
  assert(
    actual.length === expected.length,
    "assert_array_equals",
    description,
    "lengths differ, expected array ${expected} length ${expectedLength}, got ${actual} length ${actualLength}",
    { expected, expectedLength: expected.length, actual, actualLength: actual.length },
  );
  for (let i = 0; i < actual.length; i++) {
    assert(
      actual.hasOwnProperty(i) === expected.hasOwnProperty(i),
      "assert_array_equals",
      description,
      "expected property ${i} to be ${expected} but was ${actual} (expected array ${arrayExpected} got ${arrayActual})",
      {
        i,
        expected: expected.hasOwnProperty(i) ? "present" : "missing",
        actual: actual.hasOwnProperty(i) ? "present" : "missing",
        arrayExpected: expected,
        arrayActual: actual,
      },
    );
    assert(
      same_value(expected[i], actual[i]),
      "assert_array_equals",
      description,
      "expected property ${i} to be ${expected} but got ${actual} (expected array ${arrayExpected} got ${arrayActual})",
      { i, expected: expected[i], actual: actual[i], arrayExpected: expected, arrayActual: actual },
    );
  }
};

g.assert_greater_than_equal = (actual: unknown, expected: unknown, description?: string) => {
  assert(
    typeof actual === "number" || typeof actual === "bigint",
    "assert_greater_than_equal",
    description,
    "expected a number but got a ${type_actual}",
    { type_actual: typeof actual },
  );
  assert(
    typeof actual === typeof expected,
    "assert_greater_than_equal",
    description,
    "expected a ${type_expected} but got a ${type_actual}",
    { type_expected: typeof expected, type_actual: typeof actual },
  );
  assert(
    (actual as number) >= (expected as number),
    "assert_greater_than_equal",
    description,
    "expected a number greater than or equal to ${expected} but got ${actual}",
    { expected, actual },
  );
};

g.assert_throws_js = (constructor: any, func: () => unknown, description?: string) => {
  const assertion_type = "assert_throws_js";
  try {
    func.call(undefined);
    assert(false, assertion_type, description, "${func} did not throw", { func });
  } catch (e: any) {
    if (e instanceof AssertionError) throw e;
    assert(typeof e === "object", assertion_type, description, "${func} threw ${e} with type ${type}, not an object", {
      func,
      e,
      type: typeof e,
    });
    assert(e !== null, assertion_type, description, "${func} threw null, not an object", { func });
    assert(typeof constructor === "function", assertion_type, description, "${constructor} is not a constructor", {
      constructor,
    });
    let obj = constructor;
    while (obj) {
      if (typeof obj === "function" && obj.name === "Error") break;
      obj = Object.getPrototypeOf(obj);
    }
    assert(obj != null, assertion_type, description, "${constructor} is not an Error subtype", { constructor });
    assert(
      e.constructor === constructor && e.name === constructor.name,
      assertion_type,
      description,
      "${func} threw ${actual} (${actual_name}) expected instance of ${expected} (${expected_name})",
      { func, actual: e, actual_name: e.name, expected: constructor, expected_name: constructor.name },
    );
  }
};

g.assert_throws_exactly = (exception: unknown, func: () => unknown, description?: string) => {
  const assertion_type = "assert_throws_exactly";
  try {
    func.call(undefined);
    assert(false, assertion_type, description, "${func} did not throw", { func });
  } catch (e) {
    if (e instanceof AssertionError) throw e;
    assert(
      same_value(e, exception),
      assertion_type,
      description,
      "${func} threw ${e} but we expected it to throw ${exception}",
      { func, e, exception },
    );
  }
};

// The vendored files only use the no-constructor form: (func, requested, quota, description).
g.assert_throws_quotaexceedederror = (
  func: () => unknown,
  requested: unknown,
  quota: unknown,
  description?: string,
) => {
  const assertion_type = "assert_throws_quotaexceedederror";
  const constructor = (globalThis as any).self.QuotaExceededError;
  try {
    func.call(undefined);
    assert(false, assertion_type, description, "${func} did not throw", { func });
  } catch (e: any) {
    if (e instanceof AssertionError) throw e;
    assert(typeof e === "object", assertion_type, description, "${func} threw ${e} with type ${type}, not an object", {
      func,
      e,
      type: typeof e,
    });
    assert(e !== null, assertion_type, description, "${func} threw null, not an object", { func });
    assert(
      requested === null || typeof requested === "number" || typeof requested === "function",
      assertion_type,
      description,
      "${requested} is not null, a number, or a function",
      { requested },
    );
    assert(
      quota === null || typeof quota === "number" || typeof quota === "function",
      assertion_type,
      description,
      "${quota} is not null or a number",
      { quota },
    );
    const required_props: Record<string, unknown> = { code: 22, name: "QuotaExceededError" };
    if (typeof requested !== "function") required_props.requested = requested;
    if (typeof quota !== "function") required_props.quota = quota;
    for (const [prop, expected] of Object.entries(required_props)) {
      assert(
        prop in e && e[prop] == expected,
        assertion_type,
        description,
        "${func} threw ${e} that is not a correct QuotaExceededError: property ${prop} is equal to ${actual}, expected ${expected}",
        { func, e, prop, actual: e[prop], expected },
      );
    }
    if (typeof requested === "function") {
      assert(
        requested(e.requested),
        assertion_type,
        description,
        "${func} threw ${e} that is not a correct QuotaExceededError: requested value ${requested} did not pass the requested predicate",
        { func, e, requested },
      );
    }
    if (typeof quota === "function") {
      assert(
        quota(e.quota),
        assertion_type,
        description,
        "${func} threw ${e} that is not a correct QuotaExceededError: quota value ${quota} did not pass the quota predicate",
        { func, e, quota },
      );
    }
    assert(
      e.constructor === constructor,
      assertion_type,
      description,
      "${func} threw an exception from the wrong global",
      {
        func,
      },
    );
  }
};
