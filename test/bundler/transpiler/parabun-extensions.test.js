import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

describe(".pts extension (TypeScript + Parabun)", () => {
  it("runs a .pts file directly", async () => {
    using dir = tempDir("pts-run", {
      "main.pts": `
        pure function add(a: number, b: number): number { return a + b; }
        console.log(add(2, 3));
      `,
    });
    await using proc = Bun.spawn({
      cmd: [bunExe(), "main.pts"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(stdout.trim()).toBe("5");
    expect(exitCode).toBe(0);
  });

  it("imports a .pts module from .pts", async () => {
    using dir = tempDir("pts-import", {
      "main.pts": `
        import { multiply } from "./math.pts";
        console.log(multiply(4, 5));
      `,
      "math.pts": `
        export pure function multiply(a: number, b: number): number { return a * b; }
      `,
    });
    await using proc = Bun.spawn({
      cmd: [bunExe(), "main.pts"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(stdout.trim()).toBe("20");
    expect(exitCode).toBe(0);
  });

  it("imports a .pts module from .ts", async () => {
    using dir = tempDir("ts-import-pts", {
      "main.ts": `
        import { greet } from "./greeter.pts";
        console.log(greet("world"));
      `,
      "greeter.pts": `
        export pure function greet(name: string): string { return "hello " + name; }
      `,
    });
    await using proc = Bun.spawn({
      cmd: [bunExe(), "main.ts"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(stdout.trim()).toBe("hello world");
    expect(exitCode).toBe(0);
  });

  it("supports TypeScript generics in .pts", async () => {
    using dir = tempDir("pts-generics", {
      "main.pts": `
        pure function identity<T>(x: T): T { return x; }
        console.log(identity<number>(42));
      `,
    });
    await using proc = Bun.spawn({
      cmd: [bunExe(), "main.pts"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(stdout.trim()).toBe("42");
    expect(exitCode).toBe(0);
  });

  it("enforces purity in .pts files", async () => {
    using dir = tempDir("pts-purity", {
      "main.pts": `
        pure function bad(): void { console.log("side effect"); }
      `,
    });
    await using proc = Bun.spawn({
      cmd: [bunExe(), "main.pts"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(exitCode).not.toBe(0);
  });
});

describe(".pjs extension (JavaScript + Parabun)", () => {
  it("runs a .pjs file directly", async () => {
    using dir = tempDir("pjs-run", {
      "main.pjs": `
        pure function square(x) { return x * x; }
        console.log(square(7));
      `,
    });
    await using proc = Bun.spawn({
      cmd: [bunExe(), "main.pjs"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(stdout.trim()).toBe("49");
    expect(exitCode).toBe(0);
  });

  it("imports a .pjs module from .pjs", async () => {
    using dir = tempDir("pjs-import", {
      "main.pjs": `
        import { add } from "./math.pjs";
        console.log(add(10, 20));
      `,
      "math.pjs": `
        export pure function add(a, b) { return a + b; }
      `,
    });
    await using proc = Bun.spawn({
      cmd: [bunExe(), "main.pjs"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(stdout.trim()).toBe("30");
    expect(exitCode).toBe(0);
  });

  it("imports a .pjs module from .js", async () => {
    using dir = tempDir("js-import-pjs", {
      "main.js": `
        import { negate } from "./util.pjs";
        console.log(negate(5));
      `,
      "util.pjs": `
        export pure function negate(x) { return -x; }
      `,
    });
    await using proc = Bun.spawn({
      cmd: [bunExe(), "main.js"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(stdout.trim()).toBe("-5");
    expect(exitCode).toBe(0);
  });

  it("supports pipeline operator in .pjs", async () => {
    using dir = tempDir("pjs-pipeline", {
      "main.pjs": `
        pure function double(x) { return x * 2; }
        pure function inc(x) { return x + 1; }
        const result = 5 |> double |> inc;
        console.log(result);
      `,
    });
    await using proc = Bun.spawn({
      cmd: [bunExe(), "main.pjs"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(stdout.trim()).toBe("11");
    expect(exitCode).toBe(0);
  });

  it("enforces purity in .pjs files", async () => {
    using dir = tempDir("pjs-purity", {
      "main.pjs": `
        pure function bad() { console.log("side effect"); }
      `,
    });
    await using proc = Bun.spawn({
      cmd: [bunExe(), "main.pjs"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(exitCode).not.toBe(0);
  });
});

describe("cross-extension imports", () => {
  it("imports .pts from .pjs", async () => {
    using dir = tempDir("pjs-import-pts", {
      "main.pjs": `
        import { add } from "./math.pts";
        console.log(add(3, 4));
      `,
      "math.pts": `
        export pure function add(a: number, b: number): number { return a + b; }
      `,
    });
    await using proc = Bun.spawn({
      cmd: [bunExe(), "main.pjs"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(stdout.trim()).toBe("7");
    expect(exitCode).toBe(0);
  });

  it("imports .pjs from .pts", async () => {
    using dir = tempDir("pts-import-pjs", {
      "main.pts": `
        import { square } from "./util.pjs";
        const result: number = square(6);
        console.log(result);
      `,
      "util.pjs": `
        export pure function square(x) { return x * x; }
      `,
    });
    await using proc = Bun.spawn({
      cmd: [bunExe(), "main.pts"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(stdout.trim()).toBe("36");
    expect(exitCode).toBe(0);
  });

  it("imports .pts from .ts and .pjs from .js in same project", async () => {
    using dir = tempDir("mixed-ext", {
      "main.ts": `
        import { add } from "./math.pts";
        import { greet } from "./hello.pjs";
        console.log(add(1, 2));
        console.log(greet("bun"));
      `,
      "math.pts": `
        export pure function add(a: number, b: number): number { return a + b; }
      `,
      "hello.pjs": `
        export pure function greet(name) { return "hi " + name; }
      `,
    });
    await using proc = Bun.spawn({
      cmd: [bunExe(), "main.ts"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(stdout.trim()).toBe("3\nhi bun");
    expect(exitCode).toBe(0);
  });
});

describe(".ptsx extension (TSX + Parabun)", () => {
  it("runs a .ptsx file directly", async () => {
    using dir = tempDir("ptsx-run", {
      "main.ptsx": `
        pure function add(a: number, b: number): number { return a + b; }
        console.log(add(10, 11));
      `,
    });
    await using proc = Bun.spawn({
      cmd: [bunExe(), "main.ptsx"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(stdout.trim()).toBe("21");
    expect(exitCode).toBe(0);
  });

  it("imports a .ptsx module from .ts", async () => {
    using dir = tempDir("ts-import-ptsx", {
      "main.ts": `
        import { double } from "./util.ptsx";
        console.log(double(21));
      `,
      "util.ptsx": `
        export pure function double(n: number): number { return n * 2; }
      `,
    });
    await using proc = Bun.spawn({
      cmd: [bunExe(), "main.ts"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(stdout.trim()).toBe("42");
    expect(exitCode).toBe(0);
  });

  it("enforces purity in .ptsx files", async () => {
    using dir = tempDir("ptsx-purity", {
      "main.ptsx": `
        pure function bad(): void { console.log("side effect"); }
      `,
    });
    await using proc = Bun.spawn({
      cmd: [bunExe(), "main.ptsx"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(exitCode).not.toBe(0);
  });
});

describe(".pjsx extension (JSX + Parabun)", () => {
  it("runs a .pjsx file directly", async () => {
    using dir = tempDir("pjsx-run", {
      "main.pjsx": `
        pure function square(x) { return x * x; }
        console.log(square(9));
      `,
    });
    await using proc = Bun.spawn({
      cmd: [bunExe(), "main.pjsx"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(stdout.trim()).toBe("81");
    expect(exitCode).toBe(0);
  });

  it("imports a .pjsx module from .js", async () => {
    using dir = tempDir("js-import-pjsx", {
      "main.js": `
        import { triple } from "./util.pjsx";
        console.log(triple(10));
      `,
      "util.pjsx": `
        export pure function triple(x) { return x * 3; }
      `,
    });
    await using proc = Bun.spawn({
      cmd: [bunExe(), "main.js"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(stdout.trim()).toBe("30");
    expect(exitCode).toBe(0);
  });

  it("enforces purity in .pjsx files", async () => {
    using dir = tempDir("pjsx-purity", {
      "main.pjsx": `
        pure function bad() { console.log("side effect"); }
      `,
    });
    await using proc = Bun.spawn({
      cmd: [bunExe(), "main.pjsx"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(exitCode).not.toBe(0);
  });
});

describe("transpiler API with .pts/.pjs", () => {
  it("transpiles .pts content via Bun.Transpiler", () => {
    const transpiler = new Bun.Transpiler({ loader: "ts" });
    const code = `pure function add(a: number, b: number): number { return a + b; }`;
    const out = transpiler.transformSync(code);
    expect(out).toContain("function add");
    expect(out).not.toContain("pure");
  });

  it("transpiles .pjs content via Bun.Transpiler", () => {
    const transpiler = new Bun.Transpiler({ loader: "jsx" });
    const code = `pure function square(x) { return x * x; }`;
    const out = transpiler.transformSync(code);
    expect(out).toContain("function square");
    expect(out).not.toContain("pure");
  });
});
