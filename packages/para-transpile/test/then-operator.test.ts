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
});
