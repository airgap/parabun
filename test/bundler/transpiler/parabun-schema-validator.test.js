// Validator cycle/depth machinery — para-schema-recursion-plan.md §4/§7.2.
//
// Cycle bookkeeping activates only at declaration boundaries ($ref
// crossings); plain trees through non-recursive schemas pay nothing.
// Diagnostics per plan §8.
import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const RUNTIME_PATH = resolve(import.meta.dir, "../../../src/runtime.bun.js");

function transpileAndImport(code) {
  const out = new Bun.Transpiler({ loader: "ptsx" })
    .transformSync(code)
    .replace(/from\s+["']bun:wrap["']/g, `from "${RUNTIME_PATH}"`);
  const dir = mkdtempSync(join(tmpdir(), "para-schema-val-"));
  const file = join(dir, "test.mjs");
  writeFileSync(file, out);
  return import(file);
}

// `next` is optional (escape node) so plain trees stay legal alongside cycles.
const NODE_BODY = `{
  type: "object",
  properties: { name: { type: "string" }, next: { type: "array", items: Node } },
  required: [],
}`;

describe("schema validator: cycles", () => {
  test("cycle through an acyclic recursive schema is an error, not a stack overflow", async () => {
    const m = await transpileAndImport(`
      export schema Node = ${NODE_BODY};
      const a = { name: "a" };
      a.next = [a];
      export const res = Node.parse(a);
    `);
    expect(m.res.tag).toBe("Err");
    expect(m.res.error).toMatch(/cycle detected in acyclic type 'Node'/);
    expect(m.res.error).toContain("Node → Node");
  });

  test("deep cycle through an acyclic schema also errors (no overflow)", async () => {
    const m = await transpileAndImport(`
      export schema Node = ${NODE_BODY};
      const nodes = Array.from({ length: 50 }, (_, i) => ({ name: "n" + i }));
      for (let i = 0; i < 49; i++) nodes[i].next = [nodes[i + 1]];
      nodes[49].next = [nodes[0]];
      export const res = Node.parse(nodes[0]);
    `);
    expect(m.res.tag).toBe("Err");
    expect(m.res.error).toMatch(/cycle detected in acyclic type 'Node'/);
  });

  test("bare cyclic accepts cycles of any length", async () => {
    const m = await transpileAndImport(`
      export cyclic schema Node = ${NODE_BODY};
      const a = { name: "a" }, b = { name: "b" }, c = { name: "c" };
      a.next = [b]; b.next = [c]; c.next = [a];
      export const res = Node.parse(a);
    `);
    expect(m.res.tag).toBe("Ok");
  });

  test("cyclic(1): self-loop passes, length-2 cycle fails with the length diagnostic", async () => {
    const m = await transpileAndImport(`
      export cyclic(1) schema Node = ${NODE_BODY};
      const self = { name: "s" };
      self.next = [self];
      export const okRes = Node.parse(self);
      const a = { name: "a" }, b = { name: "b" };
      a.next = [b]; b.next = [a];
      export const errRes = Node.parse(a);
    `);
    expect(m.okRes.tag).toBe("Ok");
    expect(m.errRes.tag).toBe("Err");
    expect(m.errRes.error).toMatch(/cycle exceeds declared length cyclic\(1\) on 'Node' \(actual: 2\)/);
  });

  test("cyclic(2) off-by-one: length 1 and 2 pass, length 3 fails", async () => {
    const m = await transpileAndImport(`
      export cyclic(2) schema Node = ${NODE_BODY};
      const s = { name: "s" }; s.next = [s];
      export const r1 = Node.parse(s);
      const a = { name: "a" }, b = { name: "b" };
      a.next = [b]; b.next = [a];
      export const r2 = Node.parse(a);
      const x = { name: "x" }, y = { name: "y" }, z = { name: "z" };
      x.next = [y]; y.next = [z]; z.next = [x];
      export const r3 = Node.parse(x);
    `);
    expect(m.r1.tag).toBe("Ok");
    expect(m.r2.tag).toBe("Ok");
    expect(m.r3.tag).toBe("Err");
    expect(m.r3.error).toMatch(/actual: 3/);
  });

  test("field mismatch inside a legal cycle still errors", async () => {
    const m = await transpileAndImport(`
      export cyclic schema Node = {
        type: "object",
        properties: { name: { type: "string" }, next: { type: "array", items: Node } },
        required: ["name"],
      };
      const a = { name: "a" }, b = {}; // b missing required name
      a.next = [b]; b.next = [a];
      export const res = Node.parse(a);
    `);
    expect(m.res.tag).toBe("Err");
    expect(m.res.error).toContain("missing required field name");
  });
});

describe("schema validator: depth", () => {
  // depth(n) permits n $ref-mediated re-entries: a chain of k linked
  // nodes costs k−1 re-entries.
  test("depth(2) off-by-one: chains of 3 pass, 4 fail", async () => {
    const m = await transpileAndImport(`
      export schema(depth: 2) Node = ${NODE_BODY};
      const chain = n => {
        const head = { name: "0" };
        let cur = head;
        for (let i = 1; i < n; i++) { const nxt = { name: String(i) }; cur.next = [nxt]; cur = nxt; }
        return head;
      };
      export const r2 = Node.parse(chain(2));
      export const r3 = Node.parse(chain(3));
      export const r4 = Node.parse(chain(4));
    `);
    expect(m.r2.tag).toBe("Ok");
    expect(m.r3.tag).toBe("Ok");
    expect(m.r4.tag).toBe("Err");
    expect(m.r4.error).toMatch(/nesting exceeds declared depth\(2\) on 'Node'/);
  });

  test("depth(0): flat value passes, any recursion fails", async () => {
    const m = await transpileAndImport(`
      export schema(depth: 0) Node = ${NODE_BODY};
      export const flat = Node.parse({ name: "a" });
      export const rec = Node.parse({ name: "a", next: [{ name: "b" }] });
    `);
    expect(m.flat.tag).toBe("Ok");
    expect(m.rec.tag).toBe("Err");
    expect(m.rec.error).toMatch(/depth\(0\)/);
  });

  test("recursive schemas default to depth 128; unbounded opts out", async () => {
    const m = await transpileAndImport(`
      export schema Node = ${NODE_BODY};
      export schema(depth: unbounded) Free = {
        type: "object",
        properties: { name: { type: "string" }, next: { type: "array", items: Free } },
        required: [],
      };
      const chain = n => {
        const head = { name: "0" };
        let cur = head;
        for (let i = 1; i < n; i++) { const nxt = { name: String(i) }; cur.next = [nxt]; cur = nxt; }
        return head;
      };
      export const under = Node.parse(chain(100));
      export const over = Node.parse(chain(200));
      export const free = Free.parse(chain(200));
    `);
    expect(m.under.tag).toBe("Ok");
    expect(m.over.tag).toBe("Err");
    expect(m.over.error).toMatch(/depth\(128\)/);
    expect(m.free.tag).toBe("Ok");
  });

  test("back-edges never consume depth: cyclic(1) self-loop passes at depth 0", async () => {
    const m = await transpileAndImport(`
      export cyclic(1) schema(depth: 0) Node = ${NODE_BODY};
      const s = { name: "s" };
      s.next = [s];
      export const res = Node.parse(s);
    `);
    expect(m.res.tag).toBe("Ok");
  });

  test("legal cycle does not exempt excessive tree depth elsewhere", async () => {
    const m = await transpileAndImport(`
      export cyclic schema(depth: 2) Node = ${NODE_BODY};
      const s = { name: "s" };
      s.next = [s]; // legal self-cycle
      const deep = { name: "0", next: [{ name: "1", next: [{ name: "2", next: [{ name: "3" }] }] }] };
      deep.next.push(s);
      export const res = Node.parse(deep);
    `);
    expect(m.res.tag).toBe("Err");
    expect(m.res.error).toMatch(/depth\(2\)/);
  });

  test("siblings do not accumulate depth", async () => {
    const m = await transpileAndImport(`
      export schema(depth: 1) Node = ${NODE_BODY};
      // Three siblings, each one level deep — max path re-entry is 1.
      export const res = Node.parse({
        name: "root",
        next: [{ name: "a" }, { name: "b" }, { name: "c" }],
      });
    `);
    expect(m.res.tag).toBe("Ok");
  });
});

describe("schema validator: DAGs and memo soundness", () => {
  test("diamond sharing validates fine", async () => {
    const m = await transpileAndImport(`
      export schema Node = ${NODE_BODY};
      const shared = { name: "shared" };
      const left = { name: "l", next: [shared] };
      const right = { name: "r", next: [shared] };
      export const res = Node.parse({ name: "root", next: [left, right] });
    `);
    expect(m.res.tag).toBe("Ok");
  });

  test("same object at two schema positions is validated against both (pair-keyed memo)", async () => {
    const m = await transpileAndImport(`
      export schema Loose = { type: "object", properties: {}, required: [] };
      export schema Strict = {
        type: "object",
        properties: { id: { type: "bigint" } },
        required: ["id"],
      };
      export schema Both = {
        type: "object",
        properties: { a: Loose, b: Strict },
        required: ["a", "b"],
      };
      const obj = {}; // legal for Loose, illegal for Strict
      export const res = Both.parse({ a: obj, b: obj });
    `);
    expect(m.res.tag).toBe("Err");
    expect(m.res.error).toContain("b:");
  });
});

describe("schema escape-node check (§1.5)", () => {
  test("plain recursive schema with no escape node throws on first parse", async () => {
    const m = await transpileAndImport(`
      export schema T = {
        type: "object",
        properties: { next: T },
        required: ["next"],
      };
      export const attempt = () => T.parse({ next: {} });
    `);
    expect(m.attempt).toThrow(/no finite inhabitants/);
  });

  test("cyclic exempts the escape-node requirement", async () => {
    const m = await transpileAndImport(`
      export cyclic(1) schema T = {
        type: "object",
        properties: { next: T },
        required: ["next"],
      };
      const s = {};
      s.next = s;
      export const res = T.parse(s);
    `);
    expect(m.res.tag).toBe("Ok");
  });

  test("optional field and possibly-empty array both count as escape nodes", async () => {
    const m = await transpileAndImport(`
      export schema Opt = {
        type: "object",
        properties: { next: Opt },
        required: [],
      };
      export schema Arr = {
        type: "object",
        properties: { children: { type: "array", items: Arr } },
        required: ["children"],
      };
      export const optRes = Opt.parse({ next: { } });
      export const arrRes = Arr.parse({ children: [] });
    `);
    expect(m.optRes.tag).toBe("Ok");
    expect(m.arrRes.tag).toBe("Ok");
  });

  test("mutual recursion with no escape on the loop throws; escape anywhere fixes it", async () => {
    const m = await transpileAndImport(`
      export schema A = { type: "object", properties: { b: B }, required: ["b"] };
      export schema B = { type: "object", properties: { a: A }, required: ["a"] };
      export const attempt = () => A.parse({});
      export schema C = { type: "object", properties: { d: D }, required: ["d"] };
      export schema D = { type: "object", properties: { c: C }, required: [] };
      export const okRes = C.parse({ d: {} });
    `);
    expect(m.attempt).toThrow(/no finite inhabitants/);
    expect(m.okRes.tag).toBe("Ok");
  });

  test("required non-empty array of self (minItems) is caught", async () => {
    const m = await transpileAndImport(`
      export schema T = {
        type: "object",
        properties: { kids: { type: "array", items: T, minItems: 1 } },
        required: ["kids"],
      };
      export const attempt = () => T.parse({ kids: [] });
    `);
    expect(m.attempt).toThrow(/no finite inhabitants/);
  });
});
