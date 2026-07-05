// `ts<import('./x').T>` TS-extraction directive — para-ts-extractor-plan.md
// step 6 (parser side). Closed form only; lowers to
// __paraTsSchema("<spec>", "<TypeName>") inside the normal
// __paraSchemaDecl wrapper, so capability modifiers compose. Unsubstituted
// sites throw at module evaluation with substitution instructions.
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
  const dir = mkdtempSync(join(tmpdir(), "para-schema-ts-"));
  const file = join(dir, "test.mjs");
  writeFileSync(file, out);
  return import(file);
}

describe("ts<import(...).T> extraction directive", () => {
  test("lowers to __paraTsSchema inside the declaration wrapper", () => {
    const out = transpile(`export schema Comment = ts<import("./types").Comment>;`);
    expect(out).toMatch(/__paraTsSchema(_\w+)?\("\.\/types", "Comment"\)/);
    expect(out).toMatch(/__paraSchemaDecl(_\w+)?\(import\.meta\.url, "Comment",/);
  });

  test("capability modifiers compose with the directive", () => {
    const out = transpile(`export cyclic(1) schema(depth: 32) C = ts<import('./t').C>;`);
    expect(out).toMatch(/__paraTsSchema(_\w+)?\("\.\/t", "C"\)/);
    expect(out).toContain("cyclic: 1");
    expect(out).toContain("depth: 32");
  });

  test("unsubstituted sites throw at module evaluation with instructions", async () => {
    let threw = null;
    try {
      await transpileAndImport(`export schema Comment = ts<import("./types").Comment>;`);
    } catch (e) {
      threw = e;
    }
    expect(threw).not.toBeNull();
    expect(String(threw)).toMatch(/ts<import\('\.\/types'\)\.Comment> was not substituted/);
    expect(String(threw)).toContain("para-extract");
  });

  test("`ts` stays a plain identifier when the closed form doesn't match", async () => {
    const m = await transpileAndImport(`
      const ts = { type: "string" };
      export schema S = ts;
      export const ok = S.parse("x");
    `);
    expect(m.ok.tag).toBe("Ok");
  });

  test("substituted output (what para-extract emits) round-trips through the registry", async () => {
    const m = await transpileAndImport(`
      export schema Comment = /* ts<import("./types").Comment> */ {
        type: "object",
        properties: {
          body: { type: "string" },
          replies: { type: "array", items: { $ref: "#Comment" } },
        },
        required: ["body", "replies"],
      };
      export const ok = Comment.parse({ body: "b", replies: [{ body: "r", replies: [] }] });
      export const bad = Comment.parse({ replies: [] });
    `);
    expect(m.ok.tag).toBe("Ok");
    expect(m.bad.tag).toBe("Err");
  });
});
