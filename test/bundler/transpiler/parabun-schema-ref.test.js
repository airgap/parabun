// Registry `$ref` lowering for recursive/mutual schema declarations —
// para-schema-recursion-plan.md §1.7 / §2.1 / §7.5.
//
// `schema NAME = body` desugars to
//   `const NAME = __paraSchemaDecl(import.meta.url, "NAME", body)`
// and bare references to schema-declared symbols in schema-value positions
// (object property values, array elements) lower to `{ $ref: "#NAME" }`,
// resolved lazily through the runtime schema registry. Schema values are
// therefore plain acyclic JSON — no thunks, no Proxies, no cyclic object
// graphs.
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
  const dir = mkdtempSync(join(tmpdir(), "para-schema-ref-"));
  const file = join(dir, "test.mjs");
  writeFileSync(file, out);
  return import(file);
}

describe("schema $ref lowering", () => {
  test("self-reference lowers to { $ref: '#Name' }, not a live object reference", async () => {
    const m = await transpileAndImport(`
      export schema Tree = {
        type: "object",
        properties: {
          value: { type: "string" },
          children: { type: "array", items: Tree },
        },
        required: ["value"],
      };
    `);
    expect(m.Tree.schema.properties.children.items).toEqual({ $ref: "#Tree" });
    // Acyclic: the raw schema value stringifies without a cycle error.
    expect(() => JSON.stringify(m.Tree.schema)).not.toThrow();
  });

  test("declaration output is a plain object (no Proxy thunk fallback), carries $id", async () => {
    const m = await transpileAndImport(`
      export schema Node = {
        type: "object",
        properties: { next: { type: "array", items: Node } },
        required: [],
      };
    `);
    // The lazy path returned a Proxy over {}; the eager path returns the
    // spread-decorated schema itself, whose own keys include "type".
    expect(Object.getOwnPropertyDescriptor(m.Node, "type")).toBeDefined();
    expect(m.Node.$id.endsWith("#Node")).toBe(true);
    expect(JSON.stringify(m.Node)).toContain('"$ref"');
  });

  test("navigation identity through $ref: Tree.children.element === Tree", async () => {
    const m = await transpileAndImport(`
      export schema Tree = {
        type: "object",
        properties: {
          value: { type: "string" },
          children: { type: "array", items: Tree },
        },
        required: ["value"],
      };
    `);
    expect(m.Tree.children.element).toBe(m.Tree);
  });

  test("recursive validation through the registry", async () => {
    const m = await transpileAndImport(`
      export schema Tree = {
        type: "object",
        properties: {
          value: { type: "string" },
          children: { type: "array", items: Tree },
        },
        required: ["value"],
      };
    `);
    expect(m.Tree.parse({ value: "a", children: [{ value: "b", children: [{ value: "c" }] }] }).tag).toBe("Ok");
    expect(m.Tree.parse({ value: "a", children: [{ children: [] }] }).tag).toBe("Err");
  });

  test("mutual recursion with a forward reference (A refs B before B declares)", async () => {
    const m = await transpileAndImport(`
      export schema Post = {
        type: "object",
        properties: {
          title: { type: "string" },
          comments: { type: "array", items: Comment },
        },
        required: ["title"],
      };
      export schema Comment = {
        type: "object",
        properties: {
          body: { type: "string" },
          reply_to: { type: "array", items: Post },
        },
        required: ["body"],
      };
    `);
    expect(m.Post.schema.properties.comments.items).toEqual({ $ref: "#Comment" });
    expect(m.Comment.schema.properties.reply_to.items).toEqual({ $ref: "#Post" });
    expect(
      m.Post.parse({
        title: "t",
        comments: [{ body: "c", reply_to: [{ title: "t2" }] }],
      }).tag,
    ).toBe("Ok");
    expect(m.Post.parse({ title: "t", comments: [{ reply_to: [] }] }).tag).toBe("Err");
  });

  test("cross-schema composition in the same file resolves identity through $ref", async () => {
    const m = await transpileAndImport(`
      export schema Profile = {
        type: "object",
        properties: { bio: { type: "string" } },
        required: ["bio"],
      };
      export schema User = {
        type: "object",
        properties: { name: { type: "string" }, profile: Profile },
        required: ["name"],
      };
    `);
    expect(m.User.schema.properties.profile).toEqual({ $ref: "#Profile" });
    expect(m.User.profile).toBe(m.Profile);
    expect(m.User.parse({ name: "n", profile: { bio: "b" } }).tag).toBe("Ok");
    expect(m.User.parse({ name: "n", profile: {} }).tag).toBe("Err");
  });

  test("array-element references rewrite (union-style lists)", async () => {
    const m = await transpileAndImport(`
      export schema A = { type: "string" };
      export schema B = { type: "bigint" };
      export schema Wrapper = { type: "object", properties: { options: { list: [A, B] } }, required: [] };
    `);
    expect(m.Wrapper.schema.properties.options.list).toEqual([{ $ref: "#A" }, { $ref: "#B" }]);
  });

  test("member access on a schema symbol inside a body is NOT rewritten", async () => {
    const m = await transpileAndImport(`
      export schema Base = {
        type: "object",
        properties: { id: { type: "bigint" } },
        required: ["id"],
      };
      export schema Derived = {
        type: "object",
        properties: Base.schema.properties,
        required: ["id"],
      };
    `);
    expect(m.Derived.schema.properties.id.type).toBe("bigint");
    expect(m.Derived.parse({ id: 1n }).tag).toBe("Ok");
  });

  test("shadowed names are left alone", async () => {
    const m = await transpileAndImport(`
      export schema Leaf = { type: "string" };
      export const out = (() => {
        const Leaf = { type: "bigint" };
        return schema { type: "object", properties: { x: Leaf }, required: [] };
      })();
    `);
    // Inner const shadows the schema declaration: stays a direct object.
    expect(m.out.schema.properties.x.type).toBe("bigint");
    expect(m.out.schema.properties.x.$ref).toBeUndefined();
  });

  test("unresolved $ref throws with the plan's diagnostic wording", async () => {
    const m = await transpileAndImport(`
      export const bad = schema { $ref: "#Nope" };
    `);
    expect(() => m.bad.parse({})).toThrow(/unresolved schema reference '.*#Nope'/);
  });

  test("same declaration transpiled twice yields the same relative $ref (determinism)", () => {
    const src = `
      export schema Tree = {
        type: "object",
        properties: { children: { type: "array", items: Tree } },
        required: [],
      };
    `;
    const a = transpile(src);
    const b = transpile(src);
    expect(a).toBe(b);
    expect(a).toContain('"#Tree"');
    expect(a).toContain("__paraSchemaDecl");
  });

  test("`schema X from <expr>` ingests via __paraSchemaIngest and registers", async () => {
    const m = await transpileAndImport(`
      const doc = { type: "object", properties: { id: { type: "bigint" } }, required: ["id"] };
      export schema Ext from doc;
      export schema Uses = {
        type: "object",
        properties: { ext: Ext },
        required: ["ext"],
      };
    `);
    expect(m.Uses.schema.properties.ext).toEqual({ $ref: "#Ext" });
    expect(m.Uses.parse({ ext: { id: 1n } }).tag).toBe("Ok");
    expect(m.Uses.parse({ ext: {} }).tag).toBe("Err");
  });

  test("DSL braces declarations register: $refs delegate to the DSL's inline parse", async () => {
    const m = await transpileAndImport(`
      schema User { id: int, name: str }
      export schema Wrap = {
        type: "object",
        properties: { u: User },
        required: ["u"],
      };
      export const ok = Wrap.parse({ u: { id: 1, name: "a" } });
      export const bad = Wrap.parse({ u: { id: "nope", name: "a" } });
    `);
    expect(m.Wrap.schema.properties.u).toEqual({ $ref: "#User" });
    expect(m.ok.tag).toBe("Ok");
    expect(m.bad.tag).toBe("Err");
  });

  test("identifiers inside `from` expressions are NOT rewritten", async () => {
    const m = await transpileAndImport(`
      export schema Base = {
        type: "object",
        properties: { id: { type: "bigint" } },
        required: ["id"],
      };
      const derive = s => ({ ...s.schema, required: [] });
      export schema Relaxed from derive(Base);
      export const check = Relaxed.parse({});
    `);
    expect(m.check.tag).toBe("Ok");
  });
});
