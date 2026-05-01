import { describe, expect, test } from "bun:test";
import { transpile } from "../src/index";

describe("pipeline operator", () => {
  test("x |> f → f(x)", () => {
    expect(transpile("const r = x |> f;").trim()).toBe("const r = f(x);");
  });

  test("chains left-to-right", () => {
    expect(transpile("const r = x |> f |> g;").trim()).toBe("const r = g(f(x));");
  });

  test("function-target form: x |> f(y) → f(y)(x)", () => {
    expect(transpile("const r = x |> f(y);").trim()).toBe("const r = f(y)(x);");
  });

  test("placeholder: x |> f(_, y) → f(x, y)", () => {
    expect(transpile("const r = x |> f(_, y);").trim()).toBe("const r = f(x, y);");
  });

  test("placeholder in middle: x |> f(a, _, b) → f(a, x, b)", () => {
    expect(transpile("const r = x |> f(a, _, b);").trim()).toBe("const r = f(a, x, b);");
  });

  test("method shorthand: x |> .method() → x.method()", () => {
    expect(transpile("const r = x |> .toUpperCase();").trim()).toBe("const r = x.toUpperCase();");
  });

  test("method shorthand with prop chain", () => {
    expect(transpile("const r = user |> .profile.name;").trim()).toBe("const r = user.profile.name;");
  });

  test("does not fire inside strings", () => {
    expect(transpile(`const s = "x |> f";`).trim()).toBe(`const s = "x |> f";`);
  });
});
