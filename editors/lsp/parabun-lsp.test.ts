// Slice 0 verification for the reactive-graph hover. This unit-tests the
// pure static analysis + hover string — it does NOT verify in-editor
// rendering (that requires building/installing the .vsix against a release
// build and checking the real hover popup; that is the explicit next gate).
//
// PARABUN_LSP_NO_LISTEN keeps importing the server from taking over stdin.
process.env.PARABUN_LSP_NO_LISTEN = "1";
import { test, expect, describe } from "bun:test";
import { staticReactiveDependents, getParabunHover } from "./parabun-lsp";

const SRC = [
  "signal count = 0;", // 0
  "derived doubled = count * 2;", // 1
  "derived other = 5;", // 2
  "effect {", // 3
  "  console.log(count);", // 4
  "}", // 5
  "when count > 10 {", // 6
  "  notify();", // 7
  "}", // 8
  "let total = count ~> sink;", // 9
  "let plain = 42;", // 10
].join("\n");

describe("staticReactiveDependents", () => {
  test("finds derived / effect / when / binding that read the signal", () => {
    const d = staticReactiveDependents(SRC, "count");
    expect(d).toEqual([
      { kind: "derived", label: "derived doubled", line: 1 },
      { kind: "effect", label: "effect { … }", line: 3 },
      { kind: "when", label: "when count > 10", line: 6 },
      { kind: "binding", label: "reactive binding (~> / ->)", line: 9 },
    ]);
  });

  test("excludes a derived that does not read the signal", () => {
    expect(staticReactiveDependents(SRC, "count").some(x => x.label === "derived other")).toBe(false);
  });

  test("a signal with no dependents → empty", () => {
    expect(staticReactiveDependents("signal lonely = 1;\nlet x = 2;", "lonely")).toEqual([]);
  });

  test("word boundary: `count` does not match `count2` / `mycount`", () => {
    const s = "signal count = 0;\nderived d = count2 + mycount;";
    expect(staticReactiveDependents(s, "count")).toEqual([]);
  });

  test("// comments are ignored", () => {
    const s = "signal count = 0;\nderived d = 1; // count mentioned only in a comment";
    expect(staticReactiveDependents(s, "count")).toEqual([]);
  });
});

describe("getParabunHover — signal/derived name", () => {
  test("hovering a signal name lists its reactive dependents", () => {
    const h = getParabunHover(SRC, 0, 7); // the `count` in `signal count = 0`
    expect(h).toContain("`count` — reactive signal");
    expect(h).toContain("derived doubled");
    expect(h).toContain("effect { … }");
    expect(h).toContain("when count > 10");
    expect(h).toMatch(/runtime property/);
  });

  test("hovering a derived name reports it as read-only, no dependents here", () => {
    const h = getParabunHover(SRC, 1, 10); // `doubled`
    expect(h).toContain("`doubled` — reactive derived (read-only)");
    expect(h).toContain("No static single-file dependents found");
  });

  test("a plain (non-reactive) identifier gets no reactive hover", () => {
    const h = getParabunHover(SRC, 10, 5); // `plain`
    expect(h == null || !/reactive (signal|derived)/.test(h)).toBe(true);
  });

  test("the `signal` keyword hover still works (unchanged)", () => {
    const h = getParabunHover(SRC, 0, 2); // on the `signal` keyword
    expect(h).toContain("`signal` — reactive binding");
  });
});
