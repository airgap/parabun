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

describe("parabun:csv", () => {
  it("parses simple comma-separated rows with headers + type inference", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-csv-basic",
      `
        import { parseCsv } from "parabun:csv";
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
        import { parseCsv } from "parabun:csv";
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
        import { parseCsv } from "parabun:csv";
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
        import { parseCsv } from "parabun:csv";
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
        import { parseCsv } from "parabun:csv";
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
        import { parseCsv } from "parabun:csv";
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
        import { parseCsv } from "parabun:csv";
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
        import { parseCsv } from "parabun:csv";
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
        import { parseCsv } from "parabun:csv";
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
        import { parseCsv } from "parabun:csv";
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
        import { parseCsv } from "parabun:csv";
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
        import { parseCsv } from "parabun:csv";
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

  it("parallel mode produces identical rows to serial on large unquoted CSVs", async () => {
    // Build a CSV big enough to trip the PARALLEL_MIN_BYTES gate (64 KB).
    // No quote chars anywhere, so the no-quote fast path engages.
    const { stdout, exitCode } = await runFixture(
      "parabun-csv-parallel-eq",
      `
        import { parseCsv } from "parabun:csv";

        const lines = ["id,name,score"];
        for (let i = 0; i < 4000; i++) {
          lines.push(\`\${i},user_\${i},\${i * 3.14}\`);
        }
        const text = lines.join("\\n") + "\\n";
        console.log("text.length", text.length);  // should be > 64 KB

        const collect = async (opts) => {
          const out = [];
          for await (const row of parseCsv(text, opts)) out.push(row);
          return out;
        };

        const serial = await collect({});
        const parallelRows = await collect({ parallel: true });
        console.log("serial.len", serial.length);
        console.log("parallel.len", parallelRows.length);
        console.log("equal", JSON.stringify(serial) === JSON.stringify(parallelRows));
      `,
    );
    const lines = stdout.split("\n");
    expect(lines).toEqual([
      expect.stringMatching(/^text\.length \d+$/),
      "serial.len 4000",
      "parallel.len 4000",
      "equal true",
    ]);
    expect(exitCode).toBe(0);
  });

  it("parallel mode falls back to serial when input has quote chars", async () => {
    // Same data, but include a quoted cell. The pre-scan finds the quote
    // and falls through to the serial path. Result is still correct.
    const { stdout, exitCode } = await runFixture(
      "parabun-csv-parallel-fallback",
      `
        import { parseCsv } from "parabun:csv";
        const lines = ["id,name"];
        for (let i = 0; i < 3000; i++) {
          // Inject a quoted cell every now and then.
          if (i === 7) lines.push(\`\${i},"alice, the great"\`);
          else lines.push(\`\${i},u\${i}\`);
        }
        const text = lines.join("\\n") + "\\n";

        const out = [];
        for await (const row of parseCsv(text, { parallel: true })) out.push(row);
        // The quoted field with embedded comma should still parse correctly
        // (serial handles it; parallel can't but defers to serial here).
        console.log("len", out.length);
        console.log("row7.name", out[7].name);
      `,
    );
    expect(stdout).toBe(["len 3000", "row7.name alice, the great"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("parallel mode below the size threshold falls back to serial", async () => {
    // Tiny input — well under 64 KB. parallel:true is silently a no-op;
    // serial path runs, output is the same.
    const { stdout, exitCode } = await runFixture(
      "parabun-csv-parallel-tiny",
      `
        import { parseCsv } from "parabun:csv";
        const text = "a,b\\n1,2\\n3,4\\n";
        const out = [];
        for await (const row of parseCsv(text, { parallel: true })) out.push(row);
        console.log(JSON.stringify(out));
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

  it("parallel mode preserves header detection across chunks", async () => {
    // The header lives in chunk 0; chunks 1..N-1 should NOT treat their
    // first row as a header. Verify that a 4-column header is applied
    // consistently to all rows.
    const { stdout, exitCode } = await runFixture(
      "parabun-csv-parallel-headers",
      `
        import { parseCsv } from "parabun:csv";
        const lines = ["a,b,c,d"];
        for (let i = 0; i < 5000; i++) {
          lines.push(\`\${i},\${i*2},\${i*3},\${i*4}\`);
        }
        const text = lines.join("\\n") + "\\n";

        const rows = [];
        for await (const row of parseCsv(text, { parallel: true })) rows.push(row);
        console.log("len", rows.length);
        console.log("row0", JSON.stringify(rows[0]));
        console.log("row4999", JSON.stringify(rows[4999]));
      `,
    );
    expect(stdout).toBe(
      ["len 5000", 'row0 {"a":0,"b":0,"c":0,"d":0}', 'row4999 {"a":4999,"b":9998,"c":14997,"d":19996}'].join("\n"),
    );
    expect(exitCode).toBe(0);
  });

  it("throws on unterminated quoted field", async () => {
    const { stderr, exitCode } = await runFixture(
      "parabun-csv-bad-quote",
      `
        import { parseCsv } from "parabun:csv";
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

  it("LYK-804: para:csv legacy alias still resolves to the same module", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-csv-legacy-alias",
      `
        const a = await import("para:csv");
        const b = await import("parabun:csv");
        // Same module under both names — exact identity check.
        console.log("same:", (a.default ?? a) === (b.default ?? b));
        // Smoke that the alias actually parses something.
        const rows = [];
        for await (const row of (a.default ?? a).parseCsv("x,y\\n1,2\\n", { headers: true })) rows.push(row);
        console.log("rows:", JSON.stringify(rows));
      `,
    );
    expect(stdout).toContain("same: true");
    expect(stdout).toContain('rows: [{"x":1,"y":2}]');
    expect(exitCode).toBe(0);
  });
});
