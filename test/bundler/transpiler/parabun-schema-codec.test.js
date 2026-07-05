// Schema-driven MessagePack codec with REF backreferences —
// para-schema-recursion-plan.md §5/§7.3.
//
// Wrapped schemas expose .encode(v) → Uint8Array and .decode(bytes).
// refTracking (v1) = cyclic declarations: only objects at refTracking
// declaration boundaries enter the identity table; aliasing is preserved
// through REF backreferences. Without refTracking, shared objects fork
// into copies (plan §5.4). Bounds are enforced during decode.
import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const RUNTIME_PATH = resolve(import.meta.dir, "../../../src/runtime.bun.js");

function transpileAndImport(code) {
  const out = new Bun.Transpiler({ loader: "ptsx" })
    .transformSync(code)
    .replace(/from\s+["']bun:wrap["']/g, `from "${RUNTIME_PATH}"`);
  const dir = mkdtempSync(join(tmpdir(), "para-schema-codec-"));
  const file = join(dir, "test.mjs");
  writeFileSync(file, out);
  return import(file);
}

const NODE_BODY = `{
  type: "object",
  properties: { name: { type: "string" }, next: { type: "array", items: Node } },
  required: [],
}`;

describe("schema codec: plain round-trips", () => {
  test("primitives, nesting, and integer width classes survive round-trip", async () => {
    const m = await transpileAndImport(`
      export schema Doc = {
        type: "object",
        properties: {},
        required: [],
      };
      const value = {
        s: "hello", long: "x".repeat(300),
        i0: 0, i1: 100, i2: 200, i3: 40000, i4: 3000000000,
        n1: -5, n2: -100, n3: -30000, n4: -2000000000,
        f: 3.25, big: 9007199254740993n, negbig: -42n,
        t: true, fa: false, nil: null,
        arr: [1, "two", [3, 3.5], { deep: true }],
        obj: { a: { b: { c: "d" } } },
      };
      export const bytes = Doc.encode(value);
      export const back = Doc.decode(bytes);
    `);
    expect(m.bytes).toBeInstanceOf(Uint8Array);
    expect(m.back).toEqual({
      s: "hello",
      long: "x".repeat(300),
      i0: 0,
      i1: 100,
      i2: 200,
      i3: 40000,
      i4: 3000000000,
      n1: -5,
      n2: -100,
      n3: -30000,
      n4: -2000000000,
      f: 3.25,
      big: 9007199254740993n,
      negbig: -42n,
      t: true,
      fa: false,
      nil: null,
      arr: [1, "two", [3, 3.5], { deep: true }],
      obj: { a: { b: { c: "d" } } },
    });
  });

  test("recursive tree round-trips and re-validates Ok (validator as oracle)", async () => {
    const m = await transpileAndImport(`
      export schema Node = ${NODE_BODY};
      const tree = { name: "root", next: [{ name: "a", next: [{ name: "leaf" }] }, { name: "b" }] };
      export const back = Node.decode(Node.encode(tree));
      export const res = Node.parse(back);
    `);
    expect(m.back.next[0].next[0].name).toBe("leaf");
    expect(m.res.tag).toBe("Ok");
  });
});

describe("schema codec: cycles and aliasing (REF)", () => {
  test("self-loop round-trips with identity (cyclic(1))", async () => {
    const m = await transpileAndImport(`
      export cyclic(1) schema Node = ${NODE_BODY};
      const s = { name: "s" };
      s.next = [s];
      export const back = Node.decode(Node.encode(s));
      export const res = Node.parse(back);
    `);
    expect(m.back.name).toBe("s");
    expect(m.back.next[0]).toBe(m.back);
    expect(m.res.tag).toBe("Ok");
  });

  test("length-2 cycle round-trips with identity (cyclic(2))", async () => {
    const m = await transpileAndImport(`
      export cyclic(2) schema Node = ${NODE_BODY};
      const a = { name: "a" }, b = { name: "b" };
      a.next = [b]; b.next = [a];
      export const back = Node.decode(Node.encode(a));
    `);
    expect(m.back.name).toBe("a");
    expect(m.back.next[0].name).toBe("b");
    expect(m.back.next[0].next[0]).toBe(m.back);
  });

  test("DAG sharing preserved under refTracking; forked without it", async () => {
    const m = await transpileAndImport(`
      export cyclic schema Tracked = ${NODE_BODY.replaceAll("Node", "Tracked")};
      export schema Plain = ${NODE_BODY.replaceAll("Node", "Plain")};
      const mk = () => {
        const shared = { name: "shared" };
        return { name: "root", next: [{ name: "l", next: [shared] }, { name: "r", next: [shared] }] };
      };
      export const tracked = Tracked.decode(Tracked.encode(mk()));
      export const plain = Plain.decode(Plain.encode(mk()));
    `);
    // refTracking: one shared decoded object
    expect(m.tracked.next[0].next[0]).toBe(m.tracked.next[1].next[0]);
    // no refTracking: forked copies, equal content, distinct identity
    expect(m.plain.next[0].next[0]).not.toBe(m.plain.next[1].next[0]);
    expect(m.plain.next[0].next[0]).toEqual(m.plain.next[1].next[0]);
  });

  test("identity: preserve keeps DAG aliasing without licensing cycles", async () => {
    const m = await transpileAndImport(`
      export schema(identity: preserve) Node = ${NODE_BODY};
      const shared = { name: "shared" };
      const dag = { name: "root", next: [{ name: "l", next: [shared] }, { name: "r", next: [shared] }] };
      export const back = Node.decode(Node.encode(dag));
      const s = { name: "s" };
      s.next = [s];
      export const attempt = () => Node.encode(s);
    `);
    // DAG aliasing preserved through REF backreferences…
    expect(m.back.next[0].next[0]).toBe(m.back.next[1].next[0]);
    // …but a reference cycle is still illegal without cyclic.
    expect(m.attempt).toThrow(/cycle detected in acyclic type 'Node' \(encode\)/);
  });

  test("encoding a cyclic value through an acyclic declaration throws", async () => {
    const m = await transpileAndImport(`
      export schema Node = ${NODE_BODY};
      const s = { name: "s" };
      s.next = [s];
      export const attempt = () => Node.encode(s);
    `);
    expect(m.attempt).toThrow(/cycle detected in acyclic type 'Node' \(encode\)/);
  });
});

describe("schema codec: decode-side bounds and malformed input", () => {
  test("deep malicious payload rejected at the depth cap before materialization", async () => {
    const m = await transpileAndImport(`
      export schema(depth: 8) T = {
        type: "object",
        properties: { next: T },
        required: [],
      };
      // Hand-built msgpack: {next: {next: {...}}} nested 100k deep.
      // fixmap(1) + fixstr(4) "next", repeated, terminated by nil.
      const DEPTH = 100000;
      const head = [0x81, 0xa4, 0x6e, 0x65, 0x78, 0x74]; // {"next":
      const bytes = new Uint8Array(head.length * DEPTH + 1);
      for (let i = 0; i < DEPTH; i++) bytes.set(head, i * head.length);
      bytes[bytes.length - 1] = 0xc0; // nil
      export const attempt = () => T.decode(bytes);
    `);
    const t0 = performance.now();
    expect(m.attempt).toThrow(/nesting exceeds declared depth\(8\) on 'T'/);
    // Guard the DoS property: rejected in milliseconds, not after
    // materializing 100k objects.
    expect(performance.now() - t0).toBeLessThan(1000);
  });

  test("forward/out-of-range backreference is a decode error", async () => {
    const m = await transpileAndImport(`
      export cyclic schema Node = ${NODE_BODY};
      // ext8 len=1 type=0x50 payload=5 → REF(5) with 0 objects seen.
      export const attempt = () => Node.decode(new Uint8Array([0xc7, 0x01, 0x50, 0x05]));
    `);
    expect(m.attempt).toThrow(/invalid backreference in msgpack stream \(index 5, 0 objects seen\)/);
  });

  test("REF at a non-refTracking schema position is a decode error", async () => {
    const m = await transpileAndImport(`
      export schema Plain = ${NODE_BODY.replaceAll("Node", "Plain")};
      export const attempt = () => Plain.decode(new Uint8Array([0xc7, 0x01, 0x50, 0x00]));
    `);
    expect(m.attempt).toThrow(/REF at non-refTracking schema position/);
  });

  test("truncated stream is a decode error", async () => {
    const m = await transpileAndImport(`
      export schema Doc = { type: "object", properties: {}, required: [] };
      const bytes = Doc.encode({ hello: "world" });
      export const attempt = () => Doc.decode(bytes.slice(0, bytes.length - 3));
    `);
    expect(m.attempt).toThrow(/unexpected end of msgpack stream/);
  });

  test("cycle exceeding declared length is caught at decode", async () => {
    const m = await transpileAndImport(`
      export cyclic(1) schema Node = ${NODE_BODY};
      // Encoder does not enforce cycle LENGTH (the validator is the
      // oracle for value legality) — but the decoder must.
      const a = { name: "a" }, b = { name: "b" };
      a.next = [b]; b.next = [a];
      const bytes = Node.encode(a);
      export const attempt = () => Node.decode(bytes);
    `);
    expect(m.attempt).toThrow(/cycle exceeds declared length cyclic\(1\) on 'Node' \(actual: 2\)/);
  });
});

describe("schema codec: fuzz round-trip (§7.3)", () => {
  test("seeded random graphs round-trip isomorphically, aliasing included", async () => {
    const m = await transpileAndImport(`
      export cyclic schema Node = {
        type: "object",
        properties: {
          tag: { type: "string" },
          num: { type: "number" },
          next: { type: "array", items: Node },
        },
        required: [],
      };

      const mulberry32 = seed => () => {
        seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };

      // Build a random graph: a tree skeleton plus extra edges that
      // create DAG shares and back-edges (cycles).
      const build = rnd => {
        const count = 2 + Math.floor(rnd() * 12);
        const nodes = Array.from({ length: count }, (_, i) => ({
          tag: "n" + i,
          num: Math.floor(rnd() * 1000),
          next: [],
        }));
        for (let i = 1; i < count; i++) {
          nodes[Math.floor(rnd() * i)].next.push(nodes[i]); // tree edge
        }
        const extras = Math.floor(rnd() * 5);
        for (let e = 0; e < extras; e++) {
          const from = Math.floor(rnd() * count);
          const to = Math.floor(rnd() * count);
          nodes[from].next.push(nodes[to]); // DAG share or back-edge
        }
        return nodes[0];
      };

      // Isomorphism check with alias tracking: same shape, same
      // primitives, and the correspondence a→b is a bijection on nodes.
      const iso = (a, b, seen) => {
        if (a === null || typeof a !== "object") return a === b;
        if (seen.has(a)) return seen.get(a) === b;
        if (b === null || typeof b !== "object") return false;
        seen.set(a, b);
        if (a.tag !== b.tag || a.num !== b.num) return false;
        if (a.next.length !== (b.next ? b.next.length : 0)) return false;
        for (let i = 0; i < a.next.length; i++) {
          if (!iso(a.next[i], b.next[i], seen)) return false;
        }
        return true;
      };

      export const failures = [];
      for (let round = 0; round < 150; round++) {
        const rnd = mulberry32(0xbeef + round);
        const root = build(rnd);
        const back = Node.decode(Node.encode(root));
        if (!iso(root, back, new Map())) failures.push(round);
      }
    `);
    expect(m.failures).toEqual([]);
  });
});
