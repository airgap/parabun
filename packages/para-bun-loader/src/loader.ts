// Bun plugin that lets system Bun load Para source files (.pts/.pjs/
// .ptsx/.pjsx) by subprocessing to parabun for transpilation.
//
// Register via `bunfig.toml`:
//   preload = ["@para/bun-loader/preload"]
//
// The plugin shells out to a parabun-debug binary for each .pts file
// it sees. Set the binary path via PARABUN_BIN env var; defaults to
// looking for `parabun` in PATH.

import { plugin, spawn } from "bun";
import { resolve, dirname, isAbsolute, extname } from "node:path";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Resolve which parabun binary to use. Priority:
//   1. $PARABUN_BIN (explicit override)
//   2. /raid/parabun/build/debug/bun-debug (local dev build)
//   3. /raid/parabun/build/release/bun (local release build)
//   4. `parabun` on PATH (last resort — may be outdated)
function resolveParabunBin() {
  if (process.env.PARABUN_BIN) return process.env.PARABUN_BIN;
  const candidates = ["/raid/parabun/build/debug/bun-debug", "/raid/parabun/build/release/bun"];
  for (const c of candidates) if (existsSync(c)) return c;
  return "parabun";
}
const PARABUN_BIN = resolveParabunBin();

// Resolve the bundled transpile-one.ts shipped in this package.
const PKG_DIR = dirname(fileURLToPath(import.meta.url));
const TRANSPILE_ONE = resolve(PKG_DIR, "transpile-one.ts");

const FILTER = /\.(pts|pjs|ptsx|pjsx)$/;
const EXTS = [".pts", ".pjs", ".ptsx", ".pjsx"] as const;

plugin({
  name: "para-loader",
  setup(build) {
    // Resolve handler: when a relative/absolute import has no extension
    // (or resolves to a directory), try appending Para extensions and
    // return the first match. Without this, `import "./foo"` fails to
    // find `./foo.pts` because Bun's default resolver only tries
    // .ts/.tsx/.js/.jsx/.mjs/.cjs.
    build.onResolve({ filter: /.*/ }, args => {
      // Only handle relative/absolute paths from a known importer.
      if (!args.importer) return undefined;
      if (!args.path.startsWith(".") && !args.path.startsWith("/")) return undefined;
      const base = isAbsolute(args.path) ? args.path : resolve(dirname(args.importer), args.path);
      // If base has a known extension and exists, let bun handle it.
      if (extname(base) && existsSync(base)) return null;
      // Try Para extensions on the literal path.
      for (const ext of EXTS) {
        const candidate = base + ext;
        if (existsSync(candidate)) return { path: candidate };
      }
      // Try directory-index resolution: ./foo → ./foo/index.pts
      try {
        if (existsSync(base) && statSync(base).isDirectory()) {
          for (const ext of EXTS) {
            const candidate = resolve(base, `index${ext}`);
            if (existsSync(candidate)) return { path: candidate };
          }
        }
      } catch {}
      return null; // fall through to bun's resolver
    });

    build.onLoad({ filter: FILTER }, async args => {
      const proc = spawn({
        cmd: [PARABUN_BIN, "run", TRANSPILE_ONE, args.path],
        env: { ...process.env, BUN_DEBUG_QUIET_LOGS: "1" },
        stdout: "pipe",
        stderr: "pipe",
      });
      const [out, err, code] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]);
      if (code !== 0) {
        throw new Error(`@para/bun-loader: failed to transpile ${args.path}\n  exit=${code}\n  stderr=${err}`);
      }
      return {
        contents: out,
        loader: args.path.endsWith("x") ? "tsx" : "ts",
      };
    });
  },
});
