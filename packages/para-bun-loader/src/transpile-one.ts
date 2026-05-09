#!/usr/bin/env -S parabun
// Read a single .pts/.pjs file from argv, transpile via Bun.Transpiler
// (the parabun-fork transpiler understands all Para syntax — model,
// match, ::, is, |>, pure, etc.), and write the resulting JS to stdout.
//
// Designed to be subprocessed by `@para/bun-loader`'s plugin from
// system Bun. Per-call cost is ~10-30ms (parabun startup + transpile);
// for a typical workspace build (a few hundred .pts files), total
// transpile time is single-digit seconds.

import { existsSync, statSync } from "node:fs";
import { dirname, resolve, isAbsolute, extname } from "node:path";
import { fileURLToPath } from "node:url";

// Path to the runtime helpers (`__paraFromSchema`, `__parabunRange`,
// etc.) bundled alongside this script. Parabun's transpiler emits
// `import { ... } from "bun:wrap"` for these; system Bun has no
// "bun:wrap" module, so we rewrite to this absolute path below.
const RUNTIME_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "runtime.js");

const path = process.argv[2];
if (!path) {
  console.error("usage: para-transpile-one <path>");
  process.exit(1);
}

const code = await Bun.file(path).text();

// `loader: "tsx"` runs the full TS+TSX pipeline including all Para
// extensions enabled in parabun (model, match, ::, is, etc.).
const transpiler = new Bun.Transpiler({ loader: "tsx" });
let out = transpiler.transformSync(code);

// Rewrite `from "bun:wrap"` (parabun's internal runtime-helper module)
// to the absolute path of our copied runtime.js — system Bun has no
// "bun:wrap", so the import would otherwise fail at evaluation time.
out = out.replace(/(\bfrom\s*["'])bun:wrap(["'])/g, `$1${RUNTIME_PATH}$2`);

// Rewrite relative imports so Bun's default resolver finds Para
// sources by extension. `import "./foo"` → `import "./foo.pts"` when
// `./foo.pts` (or `.pjs`/`.ptsx`/`.pjsx`) exists; `./foo/` → `./foo/index.pts`.
// Without this, bun's resolver only tries .ts/.tsx/.js/.jsx/.mjs/.cjs and
// returns "Cannot find module" for naked relative Para imports.
const PARA_EXTS = [".pts", ".pjs", ".ptsx", ".pjsx"] as const;
const baseDir = dirname(path);
out = out.replace(/(\b(?:from|import)\s*\(?\s*["'])(\.{1,2}\/[^"'\n]*?)(["'])/g, (whole, lead, spec, trail) => {
  if (extname(spec)) return whole;
  const target = isAbsolute(spec) ? spec : resolve(baseDir, spec);
  for (const ext of PARA_EXTS) {
    if (existsSync(target + ext)) return `${lead}${spec}${ext}${trail}`;
  }
  try {
    if (existsSync(target) && statSync(target).isDirectory()) {
      for (const ext of PARA_EXTS) {
        if (existsSync(resolve(target, `index${ext}`))) return `${lead}${spec}/index${ext}${trail}`;
      }
    }
  } catch {}
  return whole;
});

process.stdout.write(out);
