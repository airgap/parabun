// Grammar tests for the cyclic modifier + schema config list —
// para-schema-recursion-plan.md §1.1/§1.2/§1.6/§7.1.
//
//   declaration := [cyclicMod] "schema" [configList] ident "=" type
//   cyclicMod   := "cyclic" [ "(" intLiteral ")" ]
//   configList  := "(" key ":" value {"," key ":" value} [","] ")"
//
// Capability bits lower to a 4th __paraSchemaDecl argument and land on
// the wrapped schema as non-enumerable $cyclic / $depth (consumed by the
// validator in build step 3).
import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const RUNTIME_PATH = resolve(import.meta.dir, "../../../src/runtime.bun.js");

function transpile(code) {
  return new Bun.Transpiler({ loader: "ptsx" })
    .transformSync(code)
    .replace(/from\s+["']bun:wrap["']/g, `from "${RUNTIME_PATH}"`);
}

function transpileAndImport(code) {
  const out = transpile(code);
  const dir = mkdtempSync(join(tmpdir(), "para-schema-cyclic-"));
  const file = join(dir, "test.mjs");
  writeFileSync(file, out);
  return import(file);
}

describe("cyclic modifier + schema config list", () => {
  test("bare `cyclic schema` sets $cyclic === true", async () => {
    const m = await transpileAndImport(`
      export cyclic schema Node = {
        type: "object",
        properties: { next: { type: "array", items: Node } },
        required: [],
      };
    `);
    expect(m.Node.$cyclic).toBe(true);
    expect(m.Node.$depth).toBeUndefined();
  });

  test("`cyclic(1) schema` sets $cyclic === 1", async () => {
    const m = await transpileAndImport(`
      export cyclic(1) schema Node = {
        type: "object",
        properties: { next: { type: "array", items: Node } },
        required: [],
      };
    `);
    expect(m.Node.$cyclic).toBe(1);
  });

  test("combined `cyclic(2) schema(depth: 8)` sets both bits", async () => {
    const m = await transpileAndImport(`
      export cyclic(2) schema(depth: 8) Tree = {
        type: "object",
        properties: { parent: { type: "array", items: Tree }, children: { type: "array", items: Tree } },
        required: [],
      };
    `);
    expect(m.Tree.$cyclic).toBe(2);
    expect(m.Tree.$depth).toBe(8);
  });

  test("`schema(depth: 8)` without cyclic is legal (DoS-cap use case)", async () => {
    const m = await transpileAndImport(`
      export schema Comment = {
        type: "object",
        properties: { replies: { type: "array", items: Comment } },
        required: [],
      };
      export schema(depth: 8) Capped = {
        type: "object",
        properties: { replies: { type: "array", items: Capped } },
        required: [],
      };
    `);
    expect(m.Comment.$depth).toBeUndefined();
    expect(m.Capped.$depth).toBe(8);
    expect(m.Capped.$cyclic).toBeUndefined();
  });

  test("`depth: 0` and `depth: unbounded` are legal", async () => {
    const m = await transpileAndImport(`
      export schema(depth: 0) Zero = {
        type: "object",
        properties: { next: { type: "array", items: Zero } },
        required: [],
      };
      export schema(depth: unbounded) Free = {
        type: "object",
        properties: { next: { type: "array", items: Free } },
        required: [],
      };
    `);
    expect(m.Zero.$depth).toBe(0);
    expect(m.Free.$depth).toBe("unbounded");
  });

  test("trailing comma in config list is legal", async () => {
    const m = await transpileAndImport(`
      export schema(depth: 4,) X = { type: "string" };
    `);
    expect(m.X.$depth).toBe(4);
  });

  test("capability bits are non-enumerable (spread-safe) and survive registry refs", async () => {
    const m = await transpileAndImport(`
      export cyclic schema Node = {
        type: "object",
        properties: { next: { type: "array", items: Node } },
        required: [],
      };
      export const spread = { ...Node };
      export const viaRef = Node.next.element;
    `);
    expect(m.spread.$cyclic).toBeUndefined();
    expect(m.viaRef).toBe(m.Node);
    expect(m.viaRef.$cyclic).toBe(true);
  });

  test("`cyclic(0)` is a compile error with the omit-cyclic diagnostic", () => {
    expect(() =>
      transpile(`cyclic(0) schema Node = { type: "object", properties: {}, required: [] };`),
    ).toThrow(/omit the cyclic modifier/);
  });

  test("non-integer cyclic length is a compile error", () => {
    expect(() =>
      transpile(`cyclic(1.5) schema Node = { type: "object", properties: {}, required: [] };`),
    ).toThrow(/positive integer literal/);
  });

  test("unknown config key is a compile error (namespace reserved)", () => {
    expect(() => transpile(`schema(weird: 1) X = { type: "string" };`)).toThrow(
      /unknown schema config key/,
    );
  });

  test("duplicate config key is a compile error", () => {
    expect(() => transpile(`schema(depth: 1, depth: 2) X = { type: "string" };`)).toThrow(
      /duplicate schema config key/,
    );
  });

  test("bad depth value is a compile error", () => {
    expect(() => transpile(`schema(depth: nah) X = { type: "string" };`)).toThrow(
      /non-negative integer literal or `unbounded`/,
    );
    expect(() => transpile(`schema(depth: 1.5) X = { type: "string" };`)).toThrow(
      /non-negative integer literal or `unbounded`/,
    );
  });

  test("modifiers on the DSL braces form are a compile error", () => {
    expect(() => transpile(`cyclic schema Node { id: int }`)).toThrow(
      /require the `schema NAME = \.\.\.` or `schema NAME from \.\.\.` form/,
    );
  });

  test("`cyclic` stays a plain identifier when not followed by `schema`", async () => {
    const m = await transpileAndImport(`
      const cyclic = (x) => x * 2;
      export const a = cyclic(21);
      const cyclicVal = 5;
      export const b = cyclicVal + cyclic(0);
    `);
    expect(m.a).toBe(42);
    expect(m.b).toBe(5);
  });

  test("`schema(...)` without a trailing name stays a plain call", async () => {
    const m = await transpileAndImport(`
      const schema = (x) => "fn:" + x;
      export const out = schema("ok");
    `);
    expect(m.out).toBe("fn:ok");
  });

  test("`identity: preserve` sets $identity; bad values and duplicates error", async () => {
    const m = await transpileAndImport(`
      export schema(identity: preserve) Doc = { type: "object", properties: {}, required: [] };
      export schema(identity: preserve, depth: 4) Both = { type: "object", properties: {}, required: [] };
    `);
    expect(m.Doc.$identity).toBe("preserve");
    expect(m.Doc.$cyclic).toBeUndefined();
    expect(m.Both.$identity).toBe("preserve");
    expect(m.Both.$depth).toBe(4);
    expect(() => transpile(`schema(identity: nah) X = { type: "string" };`)).toThrow(
      /schema identity must be `preserve`/,
    );
    expect(() =>
      transpile(`schema(identity: preserve, identity: preserve) X = { type: "string" };`),
    ).toThrow(/duplicate schema config key `identity`/);
  });

  test("cyclic applies to `from` declarations too", async () => {
    const m = await transpileAndImport(`
      const doc = { type: "object", properties: { next: {} }, required: [] };
      export cyclic(1) schema Ring from doc;
    `);
    expect(m.Ring.$cyclic).toBe(1);
  });
});
