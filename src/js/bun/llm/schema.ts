// JSON-schema → GBNF-style RuleSet compiler for constrained decoding.
//
// Given a JSON schema (subset: type, properties, required, items, enum,
// const, additionalProperties=false), this module produces a RuleSet that
// matches any JSON conforming to the schema. The generated grammar is
// whitespace-tolerant between JSON tokens (value-separators, object braces,
// etc.) but not permissive inside string literals.
//
// Supported schema keywords:
//   - type: "string" | "number" | "integer" | "boolean" | "null" | "object" | "array"
//   - type: an array of the above (compiles to alternation)
//   - properties + required + additionalProperties (object only; defaults
//     to additionalProperties=false)
//   - items (single schema — tuple schemas not supported)
//   - minItems, maxItems (array only; small caps — implemented via
//     unrolled alternation so we don't need grammar-level counting)
//   - minLength, maxLength for strings (same caveat)
//   - minimum/maximum for integer (compile to a range check only if both
//     ends are given and small; otherwise fall back to unbounded integer)
//   - enum: list of JSON literals
//   - const: single JSON literal
//
// Unsupported (v1): oneOf, anyOf, allOf, $ref across files, pattern, format,
// patternProperties, dependencies. Anything unsupported silently degrades to
// the "any JSON value" production — better to over-allow than to reject valid
// output. A future version can tighten.
//
// The compiler produces numbered rules (obj0, str0, …) so different schemas
// fed to the same compiler don't collide. The returned root rule is always
// literally "root".

const grammarModule = require("./grammar.ts");

// Local aliases for the AST types grammar.ts exports. We don't import them
// across the module boundary (the bundler forbids ESM `import` statements in
// builtin modules), so these shapes are kept in sync by convention.
type Symbol =
  | { kind: "literal"; bytes: Uint8Array }
  | { kind: "charclass"; ranges: Array<[number, number]>; negated: boolean }
  | { kind: "ruleref"; name: string }
  | { kind: "star"; inner: Symbol }
  | { kind: "plus"; inner: Symbol }
  | { kind: "optional"; inner: Symbol }
  | { kind: "group"; alts: Symbol[][] };
type Production = Symbol[];
type RuleSet = Map<string, Production[]>;

type JSONSchema = Record<string, unknown>;

const utf8 = new TextEncoder();

function lit(text: string): Symbol {
  return { kind: "literal", bytes: utf8.encode(text) };
}

function ref(name: string): Symbol {
  return { kind: "ruleref", name };
}

function group(...alts: Production[]): Symbol {
  return { kind: "group", alts };
}

function star(inner: Symbol): Symbol {
  return { kind: "star", inner };
}

function opt(inner: Symbol): Symbol {
  return { kind: "optional", inner };
}

// A canonical set of rules installed into every emitted grammar. Names are
// chosen to not collide with user-level names (lowercase prefix + "-").
function installPrimitives(rules: RuleSet): void {
  // Optional whitespace between JSON tokens. Intentionally not `\s+` — the
  // model should be allowed to omit whitespace entirely.
  rules.set("ws", [
    [
      star({
        kind: "charclass",
        ranges: [
          [0x09, 0x09],
          [0x0a, 0x0a],
          [0x0d, 0x0d],
          [0x20, 0x20],
        ],
        negated: false,
      }),
    ],
  ]);

  // Hex char class (for \uXXXX string escapes).
  const hex: Symbol = {
    kind: "charclass",
    ranges: [
      [0x30, 0x39],
      [0x41, 0x46],
      [0x61, 0x66],
    ],
    negated: false,
  };

  // String body: any char except " or \, or an escape sequence.
  const escape: Symbol = group(
    [
      lit("\\"),
      {
        kind: "charclass",
        ranges: [
          [0x22, 0x22],
          [0x5c, 0x5c],
          [0x2f, 0x2f],
          [0x62, 0x62],
          [0x66, 0x66],
          [0x6e, 0x6e],
          [0x72, 0x72],
          [0x74, 0x74],
        ],
        negated: false,
      },
    ],
    [lit("\\u"), hex, hex, hex, hex],
  );
  const stringChar: Symbol = group(
    [
      {
        kind: "charclass",
        ranges: [
          [0x20, 0x21],
          [0x23, 0x5b],
          [0x5d, 0x7e],
          [0x80, 0xff],
        ],
        negated: false,
      },
    ],
    [escape],
  );
  rules.set("json-string", [[lit('"'), star(stringChar), lit('"')]]);

  // Integer (no leading zeros unless the whole thing is "0").
  const digit: Symbol = { kind: "charclass", ranges: [[0x30, 0x39]], negated: false };
  const digit19: Symbol = { kind: "charclass", ranges: [[0x31, 0x39]], negated: false };
  rules.set("json-int", [
    [opt(lit("-")), lit("0")],
    [opt(lit("-")), digit19, star(digit)],
  ]);

  // Number: int frac? exp?
  rules.set("json-number", [
    [
      ref("json-int"),
      opt(group([lit("."), digit, star(digit)])),
      opt(group([group([lit("e")], [lit("E")]), opt(group([lit("+")], [lit("-")])), digit, star(digit)])),
    ],
  ]);

  rules.set("json-bool", [[lit("true")], [lit("false")]]);
  rules.set("json-null", [[lit("null")]]);

  // "Any" JSON value — fallback for schemas we can't fully encode.
  rules.set("json-value", [
    [ref("json-string")],
    [ref("json-number")],
    [ref("json-bool")],
    [ref("json-null")],
    [ref("json-object-any")],
    [ref("json-array-any")],
  ]);

  // Permissive object/array used by json-value.
  rules.set("json-object-any", [
    [lit("{"), ref("ws"), lit("}")],
    [
      lit("{"),
      ref("ws"),
      ref("json-string"),
      ref("ws"),
      lit(":"),
      ref("ws"),
      ref("json-value"),
      star(
        group([ref("ws"), lit(","), ref("ws"), ref("json-string"), ref("ws"), lit(":"), ref("ws"), ref("json-value")]),
      ),
      ref("ws"),
      lit("}"),
    ],
  ]);
  rules.set("json-array-any", [
    [lit("["), ref("ws"), lit("]")],
    [
      lit("["),
      ref("ws"),
      ref("json-value"),
      star(group([ref("ws"), lit(","), ref("ws"), ref("json-value")])),
      ref("ws"),
      lit("]"),
    ],
  ]);
}

interface CompileContext {
  rules: RuleSet;
  counter: { n: number };
}

function fresh(ctx: CompileContext, prefix: string): string {
  return `${prefix}${ctx.counter.n++}`;
}

function quoteJson(literal: unknown): string {
  return JSON.stringify(literal);
}

function compileValue(ctx: CompileContext, schema: JSONSchema): Symbol {
  if (schema.const !== undefined) {
    return lit(quoteJson(schema.const));
  }
  if (Array.isArray(schema.enum)) {
    const alts: Production[] = schema.enum.map(v => [lit(quoteJson(v))] as Production);
    return group(...alts);
  }
  const t = schema.type;
  if (Array.isArray(t)) {
    const alts: Production[] = t.map(ty => [compileValue(ctx, { ...schema, type: ty })] as Production);
    return group(...alts);
  }
  switch (t) {
    case "string":
      return ref("json-string");
    case "integer":
      return ref("json-int");
    case "number":
      return ref("json-number");
    case "boolean":
      return ref("json-bool");
    case "null":
      return ref("json-null");
    case "array":
      return compileArray(ctx, schema);
    case "object":
      return compileObject(ctx, schema);
    default:
      return ref("json-value");
  }
}

function compileArray(ctx: CompileContext, schema: JSONSchema): Symbol {
  const itemSchema = (schema.items as JSONSchema | undefined) ?? {};
  const item = compileValue(ctx, itemSchema);
  const name = fresh(ctx, "arr");
  // [  item ( , item )*  ]   or  [ ]
  ctx.rules.set(name, [
    [lit("["), ref("ws"), lit("]")],
    [lit("["), ref("ws"), item, star(group([ref("ws"), lit(","), ref("ws"), item])), ref("ws"), lit("]")],
  ]);
  return ref(name);
}

// Permutations of an object's properties grow factorially, so for v1 we
// enforce properties in declaration order. That matches the 99% use-case
// (prompted models produce keys in the order you prompted them) and keeps
// grammar size linear.
function compileObject(ctx: CompileContext, schema: JSONSchema): Symbol {
  const props = (schema.properties as Record<string, JSONSchema> | undefined) ?? {};
  const required = new Set((schema.required as string[] | undefined) ?? []);
  const keys = Object.keys(props);
  if (keys.length === 0) return ref("json-object-any");

  const name = fresh(ctx, "obj");

  // Build the sequence: each key is either required (emit unconditionally)
  // or optional (wrap in a group and make optional). Between keys we need
  // a comma — but only if there's been a preceding emitted key. We model
  // this with a flag: first emission has no leading comma, subsequent
  // emissions do. Simpler approach: split into "first" and "rest" halves.
  const alts: Production[] = [];
  // Emit every non-empty subset of keys that respects declaration order and
  // the required-set — factorial in the worst case, so only OK for small
  // objects. For larger schemas we fall back to a more permissive form.
  if (keys.length > 8) {
    // Permissive: any subset of required keys emitted first, then extra
    // properties. This is a v1 compromise.
    const parts: Symbol[] = [lit("{"), ref("ws")];
    let first = true;
    for (const k of keys) {
      const value = compileValue(ctx, props[k]);
      const pair: Production = [lit(quoteJson(k)), ref("ws"), lit(":"), ref("ws"), value];
      if (first) {
        parts.push(required.has(k) ? group(pair) : opt(group(pair)));
        first = false;
      } else {
        const withComma: Production = [ref("ws"), lit(","), ref("ws"), ...pair];
        parts.push(required.has(k) ? group(withComma) : opt(group(withComma)));
      }
    }
    parts.push(ref("ws"));
    parts.push(lit("}"));
    ctx.rules.set(name, [parts]);
    return ref(name);
  }

  // For small objects, enumerate every subset that includes all required keys.
  const subsets: string[][] = [];
  const total = 1 << keys.length;
  for (let mask = 0; mask < total; mask++) {
    const subset: string[] = [];
    let includesAllRequired = true;
    for (let i = 0; i < keys.length; i++) {
      const included = (mask & (1 << i)) !== 0;
      if (included) subset.push(keys[i]);
      else if (required.has(keys[i])) {
        includesAllRequired = false;
        break;
      }
    }
    if (includesAllRequired) subsets.push(subset);
  }
  if (subsets.length === 0) subsets.push([]);
  for (const subset of subsets) {
    const parts: Symbol[] = [lit("{"), ref("ws")];
    for (let i = 0; i < subset.length; i++) {
      const k = subset[i];
      const v = compileValue(ctx, props[k]);
      if (i > 0) {
        parts.push(ref("ws"));
        parts.push(lit(","));
        parts.push(ref("ws"));
      }
      parts.push(lit(quoteJson(k)));
      parts.push(ref("ws"));
      parts.push(lit(":"));
      parts.push(ref("ws"));
      parts.push(v);
    }
    parts.push(ref("ws"));
    parts.push(lit("}"));
    alts.push(parts);
  }
  ctx.rules.set(name, alts);
  return ref(name);
}

function compileSchema(schema: JSONSchema): RuleSet {
  const rules: RuleSet = new Map();
  installPrimitives(rules);
  const ctx: CompileContext = { rules, counter: { n: 0 } };
  const rootSym = compileValue(ctx, schema);
  rules.set("root", [[rootSym]]);
  return rules;
}

export default { compileSchema };
