// Tests for the Para schema-DSL form: `schema NAME { field: type, ... }`.
// (The keyword used to be `model`; the DSL syntax is unchanged.) This is
// the refinement-typed declaration style used by pg-models — distinct
// from the JSON Schema literal forms covered by parabun-schema.test.js.
import { describe, expect, test } from "bun:test";

function ts(code, options = {}) {
  return new Bun.Transpiler({
    loader: "tsx",
    ...options,
  }).transformSync(code);
}

describe("Parabun schema DSL declaration", () => {
  test("simple schema produces a const with a parse function", () => {
    const out = ts(`
      schema User {
        id: int,
        name: str
      }
    `);
    expect(out).toContain("const User =");
    expect(out).toContain("parse:");
  });

  test("primitive type checks: int/str/bool/float", () => {
    const out = ts(`
      schema Item {
        id: int,
        name: str,
        active: bool,
        price: float
      }
    `);
    expect(out).toContain('typeof v.id !== "number"');
    expect(out).toContain("Number.isInteger(v.id)");
    expect(out).toContain('typeof v.name !== "string"');
    expect(out).toContain('typeof v.active !== "boolean"');
    expect(out).toContain('typeof v.price !== "number"');
  });

  test("optional fields skip the check when null/undefined", () => {
    const out = ts(`
      schema User {
        id: int,
        name: str?
      }
    `);
    expect(out).toContain("v.name !== undefined");
    expect(out).toContain("v.name !== null");
  });

  test("returns Ok({ ...v }) on success, Err(msg) on failure", () => {
    const out = ts(`
      schema X { id: int }
    `);
    expect(out).toContain('tag: "Ok"');
    expect(out).toContain("value: v");
    expect(out).toContain('tag: "Err"');
    expect(out).toContain("expected object");
    expect(out).toContain("id: expected int");
  });

  test("`export schema X { ... }` exports the schema directly", () => {
    const out = ts(`
      export schema User { id: int }
    `);
    expect(out).toContain("export const User =");
    expect(out).toContain("parse:");
    expect(out).toContain("schema:");
  });

  test("`export schema X from <expr>` exports a from-schema binding", () => {
    const out = ts(`
      const s = { type: "object", properties: { id: { type: "integer" } }, required: ["id"] }
      export schema User from s
    `);
    expect(out).toContain("export const User =");
    expect(out).toMatch(/__paraFromSchema(_\w+)?\(\(\) => s\)/);
  });

  test("schema can still be re-exported via export clause", () => {
    const out = ts(`
      schema User { id: int }
      export { User }
    `);
    expect(out).toContain("export ");
    expect(out).toContain("User");
  });

  test("`model` is no longer a keyword — usable as a plain identifier", () => {
    const out = ts(`
      const model = "string named model";
      console.log(model);
    `);
    expect(out).toContain('const model = "string');
  });

  test("trailing semicolon between fields accepted", () => {
    const out = ts(`
      schema User {
        id: int;
        name: str;
      }
    `);
    expect(out).toContain("typeof v.id");
    expect(out).toContain("typeof v.name");
  });

  test("nested schema ref — capitalized field type → calls TypeName.parse", () => {
    const out = ts(`
      schema User { id: int }
      schema Order {
        user: User,
        amount: int
      }
    `);
    expect(out).toMatch(/User\.parse\(v\.user\)\.tag !== "Ok"/);
    expect(out).toContain('"user: expected User"');
  });

  test("nested schema ref — optional gates the .parse call", () => {
    const out = ts(`
      schema User { id: int }
      schema Order {
        user: User?,
        amount: int
      }
    `);
    expect(out).toContain("v.user !== undefined");
    expect(out).toContain("v.user !== null");
    expect(out).toMatch(/User\.parse\(v\.user\)\.tag !== "Ok"/);
  });

  test("lowercase unknown type still permissive (no check emitted)", () => {
    const out = ts(`
      schema X {
        weird: somethingmadeup
      }
    `);
    expect(out).not.toContain(".parse(v.weird)");
    expect(out).not.toContain("typeof v.weird");
  });

  test("array field type [int] — Array.isArray + .some inner check", () => {
    const out = ts(`
      schema Bag {
        items: [int]
      }
    `);
    expect(out).toContain("!Array.isArray(v.items)");
    expect(out).toContain(".some(");
    expect(out).toContain('typeof x !== "number"');
    expect(out).toContain("Number.isInteger(x)");
    expect(out).toContain('"items: expected [int]"');
  });

  test("array field type [User] — nested schema ref inside array", () => {
    const out = ts(`
      schema User { id: int }
      schema Org {
        members: [User]
      }
    `);
    expect(out).toContain("!Array.isArray(v.members)");
    expect(out).toMatch(/User\.parse\(x\)\.tag !== "Ok"/);
    expect(out).toContain('"members: expected [User]"');
  });

  // ---- LYK-814: `::` per-arg validation marker ----

  test("`function name(arg:: Type)` injects Type.parse + throw", () => {
    const out = ts(`
      function handler(req:: User) { return req.id }
    `);
    expect(out).toContain("User.parse(req)");
    expect(out).toContain('=== "Err"');
    expect(out).toContain("throw new Error");
  });

  test("`::` skips untyped args", () => {
    const out = ts(`
      function handler(req:: User, ctx) { return ctx }
    `);
    expect(out).toContain("User.parse(req)");
    expect(out).not.toContain("ctx.parse");
  });

  test("plain `:` annotation does NOT trigger validation (TS-compat)", () => {
    const out = ts(`
      function handler(req: User) { return req.id }
    `);
    expect(out).not.toContain("User.parse(req)");
    expect(out).not.toContain("__paraCheck");
  });

  test("`::` skips JS builtin types (String, Number, etc.)", () => {
    const out = ts(`
      function echo(s:: String) { return s }
    `);
    expect(out).not.toContain("String.parse");
  });

  test("`::` works on multiple args independently", () => {
    const out = ts(`
      function process(u:: User, post:: Post) { return u.id }
    `);
    expect(out).toContain("User.parse(u)");
    expect(out).toContain("Post.parse(post)");
  });

  // ---- LYK-813: schema X from <expr> ----

  test("`schema X from <expr>` lowers to __paraFromSchema runtime call", () => {
    const out = ts(`
      const s = { type: "object", properties: { id: { type: "integer" } }, required: ["id"] }
      schema User from s
    `);
    expect(out).toContain("const User =");
    expect(out).toMatch(/__paraFromSchema(_\w+)?\(\(\) => s\)/);
  });

  test("`from` accepts arbitrary expressions, not just identifiers", () => {
    const out = ts(`
      schema X from { type: "object", properties: { id: { type: "integer" } }, required: ["id"] }
    `);
    expect(out).toMatch(/__paraFromSchema(_\w+)?\(/);
    expect(out).toContain('type: "object"');
  });

  // ---- LYK-812: .schema emit ----

  test(".schema emitted alongside .parse for every schema", () => {
    const out = ts(`schema User { id: int, name: str }`);
    expect(out).toContain("parse:");
    expect(out).toContain("schema:");
    expect(out).toContain('type: "object"');
    expect(out).toContain("properties:");
    expect(out).toContain("required:");
  });

  test(".schema includes only non-optional fields in `required`", () => {
    const out = ts(`
      schema User {
        id: int,
        name: str,
        bio: str?
      }
    `);
    expect(out).toMatch(/required:\s*\[\s*"id"\s*,\s*"name"\s*\]/);
    expect(out).not.toMatch(/required:\s*\[\s*"id"\s*,\s*"name"\s*,\s*"bio"/);
  });

  test(".schema maps int range → minimum + exclusiveMaximum", () => {
    const out = ts(`schema X { age: int(0..150) }`);
    expect(out).toContain("minimum: 0");
    expect(out).toContain("exclusiveMaximum: 150");
  });

  test(".schema maps int(..=) → minimum + maximum (inclusive)", () => {
    const out = ts(`schema Y { score: int(1..=100) }`);
    expect(out).toContain("minimum: 1");
    expect(out).toContain("maximum: 100");
  });

  test(".schema maps str range → minLength + maxLength", () => {
    const out = ts(`schema X { name: str(1..=64) }`);
    expect(out).toContain("minLength: 1");
    expect(out).toContain("maxLength: 64");
  });

  test(".schema maps Email/UUID/Url/Date/DateTime/IpV4 → format", () => {
    const out = ts(`
      schema X {
        email: Email,
        id: UUID,
        href: Url,
        birthday: Date,
        when: DateTime,
        addr: IpV4
      }
    `);
    expect(out).toContain('format: "email"');
    expect(out).toContain('format: "uuid"');
    expect(out).toContain('format: "uri"');
    expect(out).toContain('format: "date"');
    expect(out).toContain('format: "date-time"');
    expect(out).toContain('format: "ipv4"');
  });

  test(".schema maps Slug → pattern (no JSON Schema format for it)", () => {
    const out = ts(`schema X { slug: Slug }`);
    expect(out).toContain('pattern: "^[a-z0-9]+(-[a-z0-9]+)*$"');
  });

  test(".schema maps [T] → array + items", () => {
    const out = ts(`schema X { tags: [str] }`);
    expect(out).toContain('type: "array"');
    expect(out).toMatch(/items:\s*\{\s*type:\s*"string"/);
  });

  test(".schema maps [T](min..=max) → minItems + maxItems", () => {
    const out = ts(`schema X { tags: [int](1..=10) }`);
    expect(out).toContain("minItems: 1");
    expect(out).toContain("maxItems: 10");
  });

  test('.schema maps "a" | "b" → enum', () => {
    const out = ts(`schema X { status: "a" | "b" | "c" }`);
    expect(out).toMatch(/enum:\s*\[\s*"a"\s*,\s*"b"\s*,\s*"c"\s*\]/);
  });

  test(".schema nested schema ref → `<TypeName>.schema` reference", () => {
    const out = ts(`
      schema User { id: int }
      schema Post { author: User }
    `);
    expect(out).toMatch(/author:\s*User\.schema/);
  });

  test('literal-union string field — `status: "a" | "b" | "c"`', () => {
    const out = ts(`
      schema Job {
        status: "queued" | "running" | "done"
      }
    `);
    expect(out).toContain('v.status !== "queued"');
    expect(out).toContain('v.status !== "running"');
    expect(out).toContain('v.status !== "done"');
  });

  test("literal-union numeric field — `flag: 0 | 1 | 2`", () => {
    const out = ts(`
      schema Bit {
        flag: 0 | 1 | 2
      }
    `);
    expect(out).toContain("v.flag !== 0");
    expect(out).toContain("v.flag !== 1");
    expect(out).toContain("v.flag !== 2");
  });

  test("array length bounds — `[Tag](1..=10)`", () => {
    const out = ts(`
      schema Post {
        tags: [str](1..=10)
      }
    `);
    expect(out).toContain("v.tags.length < 1");
    expect(out).toContain("v.tags.length > 10");
  });

  test("Url builtin — scheme + ://", () => {
    const out = ts(`schema Link { href: Url }`);
    expect(out).toContain('typeof v.href !== "string"');
    expect(out).toContain(".test(v.href)");
    expect(out).toContain('"href: expected Url"');
  });

  test("IpV4 builtin", () => {
    const out = ts(`schema Net { addr: IpV4 }`);
    expect(out).toContain('"addr: expected IpV4"');
    expect(out).toContain(".test(v.addr)");
  });

  test("Date / DateTime builtins", () => {
    const out = ts(`
      schema Event {
        on: Date,
        at: DateTime
      }
    `);
    expect(out).toContain('"on: expected Date"');
    expect(out).toContain('"at: expected DateTime"');
  });

  test("Slug builtin", () => {
    const out = ts(`schema Post { slug: Slug }`);
    expect(out).toContain('"slug: expected Slug"');
  });

  test("Email refinement — typeof string + regex test", () => {
    const out = ts(`
      schema User {
        email: Email
      }
    `);
    expect(out).toContain('typeof v.email !== "string"');
    expect(out).toContain(".test(v.email)");
    expect(out).toContain("@");
    expect(out).toContain('"email: expected Email"');
  });

  test("UUID refinement — RFC-4122 regex check", () => {
    const out = ts(`
      schema X { id: UUID }
    `);
    expect(out).toContain('typeof v.id !== "string"');
    expect(out).toContain(".test(v.id)");
    expect(out).toMatch(/8\}/);
    expect(out).toContain('"id: expected UUID"');
  });

  test("range refinement int(0..150) — exclusive max", () => {
    const out = ts(`
      schema Person { age: int(0..150) }
    `);
    expect(out).toContain("v.age < 0");
    expect(out).toContain("v.age >= 150");
  });

  test("range refinement int(1..=100) — inclusive max", () => {
    const out = ts(`
      schema Score { value: int(1..=100) }
    `);
    expect(out).toContain("v.value < 1");
    expect(out).toContain("v.value > 100");
  });

  test("range refinement str(1..=64) — uses .length", () => {
    const out = ts(`
      schema Tag { name: str(1..=64) }
    `);
    expect(out).toContain("v.name.length < 1");
    expect(out).toContain("v.name.length > 64");
  });

  test("recursive schema — Tree references itself", () => {
    const out = ts(`
      schema Tree {
        value: int,
        left: Tree?,
        right: Tree?
      }
    `);
    expect(out).toContain("const Tree =");
    expect(out).toMatch(/Tree\.parse\(v\.left\)\.tag !== "Ok"/);
    expect(out).toMatch(/Tree\.parse\(v\.right\)\.tag !== "Ok"/);
  });

  test("optional array — `[T]?` gates the array check", () => {
    const out = ts(`
      schema Bag {
        items: [int]?
      }
    `);
    expect(out).toContain("v.items !== undefined");
    expect(out).toContain("v.items !== null");
    expect(out).toContain("!Array.isArray(v.items)");
  });

  test("Uses Result-typed return — compatible with match", () => {
    const out = ts(`
      schema User { id: int }
      const r = User.parse(input)
      const msg = match r {
        Ok(u) => "ok " + u.id,
        Err(e) => "bad: " + e
      }
    `);
    expect(out).toContain("User.parse(input)");
    expect(out).toMatch(/switch \(__pm\w*\$?\.tag\)/);
    expect(out).toContain('case "Ok":');
    expect(out).toContain('case "Err":');
  });
});
