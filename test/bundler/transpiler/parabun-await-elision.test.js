import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe } from "harness";

describe("Parabun ..= await elision", () => {
  const transpiler = new Bun.Transpiler({ loader: "ts" });

  describe("transpiler output", () => {
    it("emits __parabunPeek for assignment form", () => {
      const out = transpiler.transformSync('async function f() { let x; x ..= fetch("/"); }');
      expect(out).toContain("__parabunPeek");
      expect(out).toContain("var ");
      expect(out).toContain("await");
    });

    it("emits __parabunPeek for declaration form", () => {
      const out = transpiler.transformSync('async function f() { const x ..= fetch("/"); }');
      expect(out).toContain("__parabunPeek");
      expect(out).toContain("await");
    });

    it("emits var declaration for temp ref", () => {
      const out = transpiler.transformSync('async function f() { let x; x ..= fetch("/"); }');
      expect(out).toMatch(/var\s+\w+/);
    });

    it("emits conditional with ternary", () => {
      const out = transpiler.transformSync('async function f() { let x; x ..= fetch("/"); }');
      expect(out).toContain("?");
      expect(out).toContain(":");
    });

    it("imports from bun:wrap", () => {
      const out = transpiler.transformSync('async function f() { const x ..= fetch("/"); }');
      expect(out).toContain('from "bun:wrap"');
    });
  });

  describe("runtime behavior", () => {
    it("resolves already-settled promise without microtask queue", async () => {
      await using proc = Bun.spawn({
        cmd: [
          bunExe(),
          "-e",
          `
          async function main() {
            const x ..= Promise.resolve(42);
            console.log(x);
          }
          main();
          `,
        ],
        env: bunEnv,
        stdout: "pipe",
        stderr: "pipe",
      });

      const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

      expect(stdout.trim()).toBe("42");
      expect(exitCode).toBe(0);
    });

    it("awaits pending promise normally", async () => {
      await using proc = Bun.spawn({
        cmd: [
          bunExe(),
          "-e",
          `
          async function main() {
            const x ..= new Promise(r => setTimeout(() => r("delayed"), 10));
            console.log(x);
          }
          main();
          `,
        ],
        env: bunEnv,
        stdout: "pipe",
        stderr: "pipe",
      });

      const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

      expect(stdout.trim()).toBe("delayed");
      expect(exitCode).toBe(0);
    });

    it("handles non-promise values", async () => {
      await using proc = Bun.spawn({
        cmd: [
          bunExe(),
          "-e",
          `
          async function main() {
            const x ..= 99;
            console.log(x);
          }
          main();
          `,
        ],
        env: bunEnv,
        stdout: "pipe",
        stderr: "pipe",
      });

      const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

      expect(stdout.trim()).toBe("99");
      expect(exitCode).toBe(0);
    });

    it("handles assignment form with multiple ..=", async () => {
      await using proc = Bun.spawn({
        cmd: [
          bunExe(),
          "-e",
          `
          async function main() {
            let x;
            x ..= Promise.resolve(1);
            console.log("a:", x);
            x ..= Promise.resolve(2);
            console.log("b:", x);
          }
          main();
          `,
        ],
        env: bunEnv,
        stdout: "pipe",
        stderr: "pipe",
      });

      const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

      expect(stdout.trim()).toBe("a: 1\nb: 2");
      expect(exitCode).toBe(0);
    });

    it("preserves rejected promise behavior", async () => {
      await using proc = Bun.spawn({
        cmd: [
          bunExe(),
          "-e",
          `
          async function main() {
            try {
              const x ..= Promise.reject(new Error("boom"));
              console.log("should not reach");
            } catch (e) {
              console.log("caught:", e.message);
            }
          }
          main();
          `,
        ],
        env: bunEnv,
        stdout: "pipe",
        stderr: "pipe",
      });

      const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

      expect(stdout.trim()).toBe("caught: boom");
      expect(exitCode).toBe(0);
    });

    it("works at top level", async () => {
      await using proc = Bun.spawn({
        cmd: [
          bunExe(),
          "-e",
          `
          const x ..= Promise.resolve("top-level");
          console.log(x);
          `,
        ],
        env: bunEnv,
        stdout: "pipe",
        stderr: "pipe",
      });

      const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

      expect(stdout.trim()).toBe("top-level");
      expect(exitCode).toBe(0);
    });
  });
});
