import * as fs from "fs";
import * as Module from "module";
import { basename, extname } from "path";

// Entry shape: `bun build-fallbacks.ts <outdir> [...sources]`.
// The outdir is the only meaningful argument; sources are tracked by the
// ninja edge but we discover them fresh via readdirSync so `bun install`
// side-effects (e.g. the `punycode` dep writing a new vendored copy)
// don't leave a stale arg list.
const outdir = process.argv[2];
if (!outdir) {
  console.error("build-fallbacks.ts: missing outdir argument");
  process.exit(1);
}

fs.mkdirSync(outdir, { recursive: true });

const allFiles = fs.readdirSync(".").filter(f => f.endsWith(".js"));
const builtins = Module.builtinModules;

const moduleNames = allFiles.map(name => basename(name, extname(name)).replaceAll(".", "/"));

async function buildOne(name: string): Promise<void> {
  // Every sibling fallback is treated as external so we don't bundle them
  // into each other. Node builtins are external too.
  const externals = new Set<string>();
  for (const b of builtins) {
    externals.add(b);
    externals.add(`node:${b}`);
  }
  for (const m of moduleNames) {
    if (m !== basename(name, extname(name))) {
      externals.add(m);
      externals.add(`node:${m}`);
    }
  }

  const isStream = name.includes("stream");
  const result = await Bun.build({
    entrypoints: [`./${name}`],
    outdir,
    target: "node",
    format: isStream ? "cjs" : "esm",
    minify: { syntax: true, whitespace: true, identifiers: false },
    external: [...externals],
    define: {
      "process.env.NODE_DEBUG": "false",
      "process.env.READABLE_STREAM": "'enable'",
      "global": "globalThis",
    },
  });

  if (!result.success) {
    const msg = result.logs.map(l => (typeof l === "string" ? l : `[${l.level}] ${l.message}`)).join("\n");
    throw new Error(`bun build failed for ${name}:\n${msg}`);
  }

  const outPath = `${outdir}/${name}`;
  // Bun.build resolves {success: true} even if the bundle emitted no
  // artifacts (eg every import was marked external). Guard against that
  // so the downstream `Bun.file(outPath).text()` doesn't silently ENOENT.
  const stat = await Bun.file(outPath).exists();
  if (!stat) {
    const outputs = result.outputs.map(o => o.path).join(", ") || "(none)";
    throw new Error(`bun build for ${name} did not produce ${outPath}. Emitted: ${outputs}`);
  }

  let outfile = (await Bun.file(outPath).text())
    .replaceAll("__require(", "require(")
    .replaceAll("import.meta.url", "''")
    .replaceAll("createRequire", "")
    .replaceAll("global.process", "require('process')")
    .trim();

  while (outfile.startsWith("import{")) {
    outfile = outfile.slice(outfile.indexOf(";") + 1);
  }

  if (outfile.includes('"node:module"')) {
    console.log(outfile);
    throw new Error("Unexpected import in " + name);
  }
  if (outfile.includes("import.meta")) {
    throw new Error("Unexpected import.meta in " + name);
  }
  if (outfile.includes(".$apply")) {
    throw new Error("$apply is not supported in browsers (while building " + name + ")");
  }
  if (outfile.includes(".$call")) {
    throw new Error("$call is not supported in browsers (while building " + name + ")");
  }
  if (outfile.includes("$isObject(") || outfile.includes("$isPromise(") || outfile.includes("$isUndefinedOrNull(")) {
    throw new Error("Unsupported function in " + name);
  }

  await Bun.write(outPath, outfile);
}

// Serial, not Promise.all. Earlier concurrent version deadlocked on
// macOS with system bun 1.3.7 — some Bun.build() calls appeared to hang
// indefinitely when a pool of ~25 bundles ran simultaneously, producing
// a partial `codegen/node-fallbacks/` directory and never finishing.
// Sequential execution adds a few hundred ms to `bun run build` on
// cold cache and avoids the race entirely.
for (const name of allFiles) {
  await buildOne(name);
}
