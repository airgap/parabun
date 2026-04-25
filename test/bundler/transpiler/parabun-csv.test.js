import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

async function runFixture(prefix, source) {
  using dir = tempDir(prefix, { "index.ts": source.trimStart() });
  await using proc = Bun.spawn({
    cmd: [bunExe(), "index.ts"],
    env: bunEnv,
    cwd: String(dir),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

describe("bun:csv", () => {
  it("parses simple comma-separated rows with headers + type inference", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-csv-basic",
      `
        import { parseCsv } from "bun:csv";
        const src = "name,age,active\\nAlice,30,true\\nBob,25,false\\n";
        const rows = [];
        for await (const row of parseCsv(src)) rows.push(row);
        console.log(JSON.stringify(rows));
      `,
    );
    expect(stdout).toBe(
      JSON.stringify([
        { name: "Alice", age: 30, active: true },
        { name: "Bob", age: 25, active: false },
      ]),
    );
    expect(exitCode).toBe(0);
  });

  it("handles quoted fields with embedded commas + doubled-quote escapes", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-csv-quoted",
      `
        import { parseCsv } from "bun:csv";
        const src =
          'a,b,c\\n' +
          '"hello, world","she said ""hi""","plain"\\n';
        const rows = [];
        for await (const row of parseCsv(src, { typeInference: false })) rows.push(row);
        console.log(JSON.stringify(rows));
      `,
    );
    expect(stdout).toBe(JSON.stringify([{ a: "hello, world", b: 'she said "hi"', c: "plain" }]));
    expect(exitCode).toBe(0);
  });

  it("handles quoted fields with embedded newlines", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-csv-multiline",
      `
        import { parseCsv } from "bun:csv";
        const src = 'col\\n"line1\\nline2\\nline3"\\n';
        const rows = [];
        for await (const row of parseCsv(src, { typeInference: false })) rows.push(row);
        console.log(JSON.stringify(rows));
      `,
    );
    expect(stdout).toBe(JSON.stringify([{ col: "line1\nline2\nline3" }]));
    expect(exitCode).toBe(0);
  });

  it("emits arrays when headers:false", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-csv-arrays",
      `
        import { parseCsv } from "bun:csv";
        const src = "1,2,3\\n4,5,6\\n";
        const rows = [];
        for await (const row of parseCsv(src, { headers: false })) rows.push(row);
        console.log(JSON.stringify(rows));
      `,
    );
    expect(stdout).toBe(
      JSON.stringify([
        [1, 2, 3],
        [4, 5, 6],
      ]),
    );
    expect(exitCode).toBe(0);
  });

  it("uses an explicit headers array", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-csv-explicit-headers",
      `
        import { parseCsv } from "bun:csv";
        const src = "1,2\\n3,4\\n";
        const rows = [];
        for await (const row of parseCsv(src, { headers: ["x", "y"] })) rows.push(row);
        console.log(JSON.stringify(rows));
      `,
    );
    expect(stdout).toBe(
      JSON.stringify([
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ]),
    );
    expect(exitCode).toBe(0);
  });

  it("custom delimiter (TSV)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-csv-tsv",
      `
        import { parseCsv } from "bun:csv";
        const src = "a\\tb\\n1\\t2\\n";
        const rows = [];
        for await (const row of parseCsv(src, { delimiter: "\\t" })) rows.push(row);
        console.log(JSON.stringify(rows));
      `,
    );
    expect(stdout).toBe(JSON.stringify([{ a: 1, b: 2 }]));
    expect(exitCode).toBe(0);
  });

  it("CRLF line endings", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-csv-crlf",
      `
        import { parseCsv } from "bun:csv";
        const src = "a,b\\r\\n1,2\\r\\n3,4\\r\\n";
        const rows = [];
        for await (const row of parseCsv(src)) rows.push(row);
        console.log(JSON.stringify(rows));
      `,
    );
    expect(stdout).toBe(
      JSON.stringify([
        { a: 1, b: 2 },
        { a: 3, b: 4 },
      ]),
    );
    expect(exitCode).toBe(0);
  });

  it("empty cells become null with type inference", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-csv-null",
      `
        import { parseCsv } from "bun:csv";
        const src = "a,b,c\\n,2,\\n4,,6\\n";
        const rows = [];
        for await (const row of parseCsv(src)) rows.push(row);
        console.log(JSON.stringify(rows));
      `,
    );
    expect(stdout).toBe(
      JSON.stringify([
        { a: null, b: 2, c: null },
        { a: 4, b: null, c: 6 },
      ]),
    );
    expect(exitCode).toBe(0);
  });

  it("type inference can be disabled", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-csv-no-typing",
      `
        import { parseCsv } from "bun:csv";
        const src = "a,b\\n1,true\\n";
        const rows = [];
        for await (const row of parseCsv(src, { typeInference: false })) rows.push(row);
        console.log(JSON.stringify(rows));
      `,
    );
    expect(stdout).toBe(JSON.stringify([{ a: "1", b: "true" }]));
    expect(exitCode).toBe(0);
  });

  it("skipLines drops leading rows before header detection", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-csv-skiplines",
      `
        import { parseCsv } from "bun:csv";
        const src =
          "# generated by foo\\n" +
          "# pid 12345\\n" +
          "name,score\\n" +
          "Alice,99\\n";
        const rows = [];
        for await (const row of parseCsv(src, { skipLines: 2 })) rows.push(row);
        console.log(JSON.stringify(rows));
      `,
    );
    expect(stdout).toBe(JSON.stringify([{ name: "Alice", score: 99 }]));
    expect(exitCode).toBe(0);
  });

  it("works on Uint8Array input", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-csv-bytes",
      `
        import { parseCsv } from "bun:csv";
        const bytes = new TextEncoder().encode("a,b\\n1,2\\n");
        const rows = [];
        for await (const row of parseCsv(bytes)) rows.push(row);
        console.log(JSON.stringify(rows));
      `,
    );
    expect(stdout).toBe(JSON.stringify([{ a: 1, b: 2 }]));
    expect(exitCode).toBe(0);
  });

  it("works on a Blob input", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-csv-blob",
      `
        import { parseCsv } from "bun:csv";
        const blob = new Blob(["a,b\\n", "1,2\\n", "3,4\\n"]);
        const rows = [];
        for await (const row of parseCsv(blob)) rows.push(row);
        console.log(JSON.stringify(rows));
      `,
    );
    expect(stdout).toBe(
      JSON.stringify([
        { a: 1, b: 2 },
        { a: 3, b: 4 },
      ]),
    );
    expect(exitCode).toBe(0);
  });

  it("throws on unterminated quoted field", async () => {
    const { stderr, exitCode } = await runFixture(
      "parabun-csv-bad-quote",
      `
        import { parseCsv } from "bun:csv";
        try {
          for await (const _ of parseCsv('a,b\\n"unterminated')) {}
        } catch (e) {
          console.error("CAUGHT:" + e.message);
          process.exit(7);
        }
        process.exit(0);
      `,
    );
    expect(stderr).toContain("unterminated quoted field");
    expect(exitCode).toBe(7);
  });
});
