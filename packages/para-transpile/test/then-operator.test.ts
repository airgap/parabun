import { describe, expect, test } from "bun:test";
import { transpile } from "../src/index";

describe("..> (then operator)", () => {
  test("..> desugars to .then", () => {
    expect(transpile("const x = p ..> handler;").trim()).toBe("const x = p.then(handler);");
  });

  test("chained ..> ..>", () => {
    expect(transpile("const x = p ..> f ..> g;").trim()).toBe("const x = p.then(f).then(g);");
  });

  test("arrow handler", () => {
    expect(transpile("const x = p ..> v => v + 1;").trim()).toBe("const x = p.then(v => v + 1);");
  });

  test("chains ..> with ..!", () => {
    expect(transpile("const x = p ..> f ..! handler;").trim()).toBe("const x = p.then(f).catch(handler);");
  });

  test("chains ..> with ..&", () => {
    expect(transpile("const x = p ..> f ..& cleanup;").trim()).toBe("const x = p.then(f).finally(cleanup);");
  });

  test("full chain ..> ..! ..&", () => {
    expect(transpile("const x = p ..> f ..! handler ..& cleanup;").trim()).toBe(
      "const x = p.then(f).catch(handler).finally(cleanup);",
    );
  });

  test("|> binds tighter than ..>", () => {
    // data |> transform ..> next → transform(data).then(next)
    expect(transpile("const x = data |> transform ..> next;").trim()).toBe("const x = transform(data).then(next);");
  });

  test("does not fire inside string literals", () => {
    expect(transpile(`const s = "p ..> q";`).trim()).toBe(`const s = "p ..> q";`);
  });

  test("does not fire inside template literals", () => {
    expect(transpile("const s = `p ..> q`;").trim()).toBe("const s = `p ..> q`;");
  });

  test("does not fire inside line comments", () => {
    expect(transpile(`// p ..> q\nconst x = 1;`).trim()).toBe(`// p ..> q\nconst x = 1;`);
  });

  test("does not fire inside block comments", () => {
    expect(transpile(`/* p ..> q */\nconst x = 1;`).trim()).toBe(`/* p ..> q */\nconst x = 1;`);
  });

  test("does fire inside template interpolation", () => {
    expect(transpile("const s = `${p ..> q}`;").trim()).toBe("const s = `${p.then(q)}`;");
  });

  test("multi-line file", () => {
    const input = `
const result = fetch("/api")
  ..> r => r.json()
  ..! console.error
  ..& cleanup;
`;
    const out = transpile(input).trim();
    expect(out).toContain(".then(r => r.json())");
    expect(out).toContain(".catch(console.error)");
    expect(out).toContain(".finally(cleanup)");
  });

  test("bare arrow handler on a single line", () => {
    expect(transpile("const x = p ..> r => r.json();").trim()).toBe("const x = p.then(r => r.json());");
  });

  test("chain of three with bare arrows on a single line", () => {
    expect(transpile("const x = p ..> r => r.json() ..! err => defaults ..& () => done();").trim()).toBe(
      "const x = p.then(r => r.json()).catch(err => defaults).finally(() => done());",
    );
  });

  test("bare arrow with nullary `() => ...` handler", () => {
    expect(transpile("const x = p ..& () => done();").trim()).toBe("const x = p.finally(() => done());");
  });

  test("inner chain inside parens stays nested", () => {
    expect(transpile("const x = p ..! err => (recover() ..! finalFallback);").trim()).toBe(
      "const x = p.catch(err => (recover().catch(finalFallback)));",
    );
  });

  test("mix of bare arrow and named handler in one chain", () => {
    expect(transpile("const x = p ..> r => r.value ..! handler ..& done;").trim()).toBe(
      "const x = p.then(r => r.value).catch(handler).finally(done);",
    );
  });

  test("parenthesized arrow form still works (regression)", () => {
    expect(transpile("const x = promise ..> (r => r.json());").trim()).toBe("const x = promise.then((r => r.json()));");
  });

  test("end-of-statement bare arrow without trailing semicolon", () => {
    expect(transpile("const x = p ..> r => r.json()").trim()).toBe("const x = p.then(r => r.json())");
  });
});
