// Runs the vendored WPT webstorage *.window.js tests against Parabun's
// Storage, localStorage and sessionStorage. The .window.js files are
// byte-identical to upstream; this driver supplies the testharness globals
// and a `window` binding. Web Storage is opt-in, so like webstorage.test.ts
// this file re-runs itself under --localstorage-file.
//
// Vendored from web-platform-tests/wpt @ 6cd3f1c39e2aec3d58f140aa0ff2991d79eb9991
// (webstorage/*.window.js). README.md lists which files were kept and why the
// rest were not.

import { describe, expect, test } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { setCurrentFile, wptTest } from "./testharness-shim";

const g = globalThis as any;
const INNER_ENV = "WEBSTORAGE_WPT_INNER";

const enabled = typeof g.Storage === "function" && "localStorage" in g && "sessionStorage" in g;

if (!enabled && process.env[INNER_ENV]) {
  throw new Error(
    "--localstorage-file was passed but Storage, localStorage and sessionStorage are not installed on globalThis",
  );
}

if (!enabled) {
  test("runs the WPT webstorage suite under --localstorage-file", async () => {
    using dir = tempDir("webstorage-wpt", {});
    const file = join(String(dir), "local.sqlite");
    await using proc = Bun.spawn({
      cmd: [bunExe(), "test", "--localstorage-file", file, import.meta.path],
      env: { ...bunEnv, [INNER_ENV]: "1" },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    const output = stdout + stderr;
    // The pass count is the one README.md pins; a change to the vendored files
    // moves both together. " 0 fail" alone would also accept an empty run.
    expect(output).toContain("1236 pass");
    expect(output).toContain(" 0 fail");
    expect(exitCode).toBe(0);
  }, 300_000);
} else {
  const files = readdirSync(import.meta.dir)
    .filter(name => name.endsWith(".window.js"))
    .sort();

  // bun:test injects its own `test` binding into every imported module, which
  // would shadow the WPT-style test(fn, name). Load each vendored file as text
  // and run it inside a Function whose `test` parameter is the shim and whose
  // `window` is this global. Everything else resolves via globalThis.
  for (const file of files) {
    describe(file, () => {
      setCurrentFile(file);
      const src = readFileSync(join(import.meta.dir, file), "utf8");
      new Function("test", "window", src)(wptTest, globalThis);
    });
  }
}
