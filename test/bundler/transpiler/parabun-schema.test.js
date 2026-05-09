// Runtime tests for the `schema` keyword. There's no separate `api`
// or envelope-auto-detect mode — `schema X = body` and `schema { body }`
// are the two surface forms, both desugaring to `__paraFromSchema(...)`.
// HTTP-endpoint shapes are plain JS objects whose schema slots hold a
// `schema` value (imported binding or inline literal); lockstep (or any
// consumer) provides its own per-slot helpers.
import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// Resolve the runtime path relative to this test file so the suite works
// in any workspace layout (Linux x64 lives at /raid/parabun, macOS CI
// lives under /Users/<user>/jenkins/workspace, etc.).
const RUNTIME_PATH = resolve(import.meta.dir, "../../../src/runtime.bun.js");

function transpileAndImport(code) {
  const out = new Bun.Transpiler({ loader: "tsx" })
    .transformSync(code)
    .replace(/from\s+["']bun:wrap["']/g, `from "${RUNTIME_PATH}"`);
  const dir = mkdtempSync(join(tmpdir(), "para-schema-rt-"));
  const file = join(dir, "test.mjs");
  writeFileSync(file, out);
  return import(file);
}

describe("Parabun `schema` keyword", () => {
  test("`schema X = body` declaration produces a decorated value", async () => {
    const m = await transpileAndImport(`
      export schema User = {
        type: "object",
        properties: { id: { type: "bigint" }, name: { type: "string" } },
        required: ["id", "name"],
      };
    `);
    expect(typeof m.User.parse).toBe("function");
    expect(m.User.id.type).toBe("bigint");
    expect(m.User.name.type).toBe("string");
    expect(m.User.parse({ id: 1n, name: "Alice" }).tag).toBe("Ok");
    expect(m.User.parse({ id: 1n }).tag).toBe("Err");
  });

  test("`schema { body }` expression literal works at value position", async () => {
    const m = await transpileAndImport(`
      export const ep = {
        request: schema { type: "bigint" },
        authenticated: true,
      };
    `);
    expect(typeof m.ep.request.parse).toBe("function");
    expect(m.ep.request.type).toBe("bigint");
    expect(m.ep.request.parse(123n).tag).toBe("Ok");
    expect(m.ep.request.parse("nope").tag).toBe("Err");
    expect(m.ep.authenticated).toBe(true);
  });

  test("composition: outer object holds schema by reference, identity preserved", async () => {
    const m = await transpileAndImport(`
      export schema Profile = {
        type: "object",
        properties: { bio: { type: "string", maxLength: 500 } },
        required: ["bio"],
      };
      export const getUserProfile = {
        request: schema { type: "bigint" },
        response: Profile,
        authenticated: true,
        throws: [401, 404],
      };
    `);
    expect(m.getUserProfile.response).toBe(m.Profile);
    expect(m.getUserProfile.response.bio.type).toBe("string");
    expect(m.getUserProfile.response.bio.maxLength).toBe(500);
  });

  test("navigation: theModel.request.field.type reaches deep schema fragments", async () => {
    const m = await transpileAndImport(`
      export const ep = {
        request: schema {
          type: "object",
          properties: {
            id: { type: "bigint" },
            tags: { type: "array", items: { type: "string" } },
          },
          required: ["id"],
        },
      };
    `);
    expect(m.ep.request.id.type).toBe("bigint");
    expect(m.ep.request.tags.type).toBe("array");
    expect(m.ep.request.tags.element.type).toBe("string");
  });

  test("no envelope auto-detection: parseRequest/parseResponse are NOT added", async () => {
    const m = await transpileAndImport(`
      export const ep = {
        request: schema { type: "bigint" },
        response: schema { type: "string" },
        body: schema { type: "object", properties: { foo: { type: "string" } }, required: ["foo"] },
      };
    `);
    expect(m.ep.parseRequest).toBeUndefined();
    expect(m.ep.parseResponse).toBeUndefined();
    expect(m.ep.parseBody).toBeUndefined();
    // Each slot still has its own .parse:
    expect(m.ep.request.parse(1n).tag).toBe("Ok");
    expect(m.ep.response.parse("ok").tag).toBe("Ok");
    expect(m.ep.body.parse({ foo: "x" }).tag).toBe("Ok");
  });

  test("self-recursive schema declaration resolves through children", async () => {
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
    expect(m.Tree.parse({ value: "a", children: [{ value: "b" }] }).tag).toBe("Ok");
    expect(m.Tree.parse({ value: "a", children: [{ children: [] }] }).tag).toBe("Err");
  });

  test("`schema` is a plain identifier when not followed by `{`", async () => {
    // Catches a common regression: if the parser greedily treats every
    // `schema` token as a literal, normal identifier usage breaks.
    const m = await transpileAndImport(`
      const schema = (x) => "fn:" + x;
      export const out = schema("ok");
    `);
    expect(m.out).toBe("fn:ok");
  });

  test("inline schema literal in array slot", async () => {
    const m = await transpileAndImport(`
      export const ep = {
        throws: [400, 401, 500],
        responses: [
          schema { type: "string" },
          schema { type: "bigint" },
        ],
      };
    `);
    expect(m.ep.responses[0].type).toBe("string");
    expect(m.ep.responses[1].type).toBe("bigint");
    expect(m.ep.responses[0].parse("ok").tag).toBe("Ok");
    expect(m.ep.responses[1].parse(1n).tag).toBe("Ok");
    expect(m.ep.throws).toEqual([400, 401, 500]);
  });
});
