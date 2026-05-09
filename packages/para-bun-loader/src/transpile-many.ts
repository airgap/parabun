#!/usr/bin/env -S parabun
// Batch version of transpile-one.ts: read N input/output path pairs from
// argv (alternating: in1 out1 in2 out2 ...), transpile each via
// Bun.Transpiler in a single parabun process. Eliminates per-file
// parabun startup cost (~1.5s on debug-asan builds), which dominates
// gen-dts.sh runtime when there are many .pts files.
//
// Output rewrites match transpile-one.ts:
//   - `from "bun:wrap"` → absolute path of bundled runtime.js
//   - `import "./foo"` (no ext) → `import "./foo.<ext>"` for first
//     existing Para extension; or `./foo/index.<ext>` if dir.
//
// Each output file is written verbatim. On per-file error, prints
// "[err] <path>: <message>" to stderr and continues.
import { existsSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve, isAbsolute, extname } from "node:path";
import { fileURLToPath } from "node:url";

const RUNTIME_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "runtime.js");
const PARA_EXTS = [".pts", ".pjs", ".ptsx", ".pjsx"] as const;

const argv = process.argv.slice(2);
if (argv.length === 0 || argv.length % 2 !== 0) {
  console.error("usage: para-transpile-many <in1> <out1> <in2> <out2> ...");
  process.exit(1);
}

const transpiler = new Bun.Transpiler({ loader: "tsx" });

let count = 0;
let errors = 0;
for (let i = 0; i < argv.length; i += 2) {
  const inPath = argv[i];
  const outPath = argv[i + 1];
  try {
    const code = await Bun.file(inPath).text();
    let out = transpiler.transformSync(code);
    out = out.replace(/(\bfrom\s*["'])bun:wrap(["'])/g, `$1${RUNTIME_PATH}$2`);
    const baseDir = dirname(inPath);
    out = out.replace(/(\b(?:from|import)\s*\(?\s*["'])(\.{1,2}\/[^"'\n]*?)(["'])/g, (whole, lead, spec, trail) => {
      if (extname(spec)) return whole;
      const target = isAbsolute(spec) ? spec : resolve(baseDir, spec);
      for (const ext of PARA_EXTS) if (existsSync(target + ext)) return `${lead}${spec}${ext}${trail}`;
      try {
        if (existsSync(target) && statSync(target).isDirectory()) {
          for (const ext of PARA_EXTS)
            if (existsSync(resolve(target, `index${ext}`))) return `${lead}${spec}/index${ext}${trail}`;
        }
      } catch {}
      return whole;
    });
    writeFileSync(outPath, out);
    count++;
  } catch (e) {
    errors++;
    console.error(`[err] ${inPath}: ${(e as Error).message}`);
  }
}
console.error(`[transpile-many] ok=${count} err=${errors}`);
