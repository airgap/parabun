import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { bunEnv, bunExe, tempDir } from "../../../test/harness.ts";
import { transpile } from "../src/index";

// Cross-cutting tests : transforms should compose cleanly when more than
// one Para operator appears in the same expression.

describe("integration: pipeline + error-chain", () => {
  test("data |> transform ..! handler", () => {
    expect(transpile("const r = data |> transform ..! handler;")).toBe("const r = transform(data).catch(handler);");
  });

  test("data |> transform ..& cleanup", () => {
    expect(transpile("const r = data |> transform ..& cleanup;")).toBe("const r = transform(data).finally(cleanup);");
  });

  test("data |> transform ..! handler ..& cleanup", () => {
    expect(transpile("const r = data |> transform ..! handler ..& cleanup;")).toBe(
      "const r = transform(data).catch(handler).finally(cleanup);",
    );
  });
});

describe("integration: pipeline + ranges", () => {
  test("range piped through filter via placeholder", () => {
    const out = transpile("const evens = 0..=20 |> filter(_, even);");
    expect(out).toContain('import { __parabunRangeInclusive } from "bun:wrap";');
    expect(out).toContain("const evens = filter(__parabunRangeInclusive(0, 20), even);");
  });
});

describe("integration: pure + pipeline", () => {
  test("pure function + pipeline call", () => {
    const out = transpile(`pure function sq(x) { return x * x; }\nconst r = 5 |> sq |> sq;`);
    expect(out).toContain("     function sq(x) { return x * x; }");
    expect(out).toContain("const r = sq(sq(5));");
  });
});

test("parity runner fails when the canonical driver cannot start", async () => {
  using dir = tempDir("para-parity-missing-driver", {});
  const fixtures = readdirSync(new URL("./parity/fixtures/", import.meta.url)).filter(path => path.endsWith(".pts"));
  expect(fixtures.length).toBeGreaterThan(0);

  await using proc = Bun.spawn({
    cmd: [bunExe(), fileURLToPath(new URL("./parity/runner.ts", import.meta.url))],
    env: { ...bunEnv, PARABUN: join(String(dir), "missing-parabun") },
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  expect(stdout).toContain(`0 passed, ${fixtures.length} failed, 0 skipped (${fixtures.length} fixtures)`);
  expect(stderr).toContain("ENOENT");
  expect(exitCode).toBe(1);
});
