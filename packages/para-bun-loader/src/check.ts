#!/usr/bin/env -S bun
// `parabun check` — type-check Para sources via the user's installed
// typescript package. Reuses the transform from `transform-ts.ts` to
// rewrite Para constructs to TS-shaped equivalents in-memory; tsc's
// Compiler API does the rest.
//
// usage:
//   parabun check [path]               # check files under path (defaults to cwd)
//   parabun check --tsconfig=p.json    # use explicit tsconfig
//   parabun check file.pts             # check a single file
//
// Exit code 1 if any errors found.

import { readFileSync, statSync, readdirSync } from "node:fs";
import { resolve, dirname, join, relative, isAbsolute } from "node:path";
import { transformParabunToTS } from "./transform-ts";

// Lazy-load typescript so the CLI doesn't crash when run from outside
// a TS workspace; we want a useful error first.
let ts: typeof import("typescript");
try {
  ts = await import("typescript");
} catch {
  console.error("parabun check: cannot find `typescript` package — install it as a dev dep:");
  console.error("  bun add -D typescript");
  process.exit(2);
}

// ---- arg parsing ---------------------------------------------------------
const args = process.argv.slice(2);
let target = ".";
let tsconfigArg: string | undefined;
for (const a of args) {
  if (a.startsWith("--tsconfig=")) tsconfigArg = a.slice("--tsconfig=".length);
  else if (a.startsWith("--")) {
    /* unknown flag — ignore for now */
  } else target = a;
}
const targetAbs = isAbsolute(target) ? target : resolve(process.cwd(), target);

// ---- find tsconfig --------------------------------------------------------
function findTsconfig(start: string): string | undefined {
  if (tsconfigArg) return resolve(process.cwd(), tsconfigArg);
  let dir = statSync(start).isDirectory() ? start : dirname(start);
  while (true) {
    const candidate = join(dir, "tsconfig.json");
    try {
      statSync(candidate);
      return candidate;
    } catch {}
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}
const tsconfigPath = findTsconfig(targetAbs);
if (!tsconfigPath) {
  console.error(`parabun check: no tsconfig.json found from ${targetAbs}`);
  process.exit(2);
}

// ---- gather .pts/.ptsx files ----------------------------------------------
function walk(dir: string, out: string[]) {
  let ents: string[];
  try {
    ents = readdirSync(dir);
  } catch {
    return;
  }
  for (const e of ents) {
    if (e === "node_modules" || e === ".git" || e === "dist" || e === "tmp" || e === ".nx") continue;
    const p = join(dir, e);
    let s;
    try {
      s = statSync(p);
    } catch {
      continue;
    }
    if (s.isDirectory()) walk(p, out);
    else if (/\.(pts|ptsx|pjs|pjsx)$/.test(e)) out.push(p);
  }
}

const paraFiles: string[] = [];
const tStat = statSync(targetAbs);
if (tStat.isFile()) {
  if (/\.(pts|ptsx|pjs|pjsx)$/.test(targetAbs)) paraFiles.push(targetAbs);
} else {
  walk(targetAbs, paraFiles);
}

if (paraFiles.length === 0) {
  console.error("parabun check: no .pts/.ptsx files found");
  process.exit(0);
}

// ---- read tsconfig --------------------------------------------------------
const cfgRaw = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
if (cfgRaw.error) {
  console.error(
    "parabun check: tsconfig parse error:",
    ts.flattenDiagnosticMessageText(cfgRaw.error.messageText, "\n"),
  );
  process.exit(2);
}
const parsedCfg = ts.parseJsonConfigFileContent(cfgRaw.config, ts.sys, dirname(tsconfigPath));

// ---- build virtual file system --------------------------------------------
// For each .pts file, transform → in-memory .ts; tsc reads via host hooks.
// Rewrite `import './foo'` → `import './foo.ts'` so cross-file references
// in the virtual FS resolve to the same set of in-memory entries.
const transformed = new Map<string, string>();
for (const f of paraFiles) {
  const src = readFileSync(f, "utf8");
  const out = transformParabunToTS(src);
  // The virtual filename uses .ts extension so tsc treats it as TS.
  transformed.set(
    f.replace(/\.(pts|ptsx)$/, ext => (ext === ".ptsx" ? ".tsx" : ".ts")),
    out,
  );
}

const compilerOptions: import("typescript").CompilerOptions = {
  ...parsedCfg.options,
  noEmit: true,
  skipLibCheck: true,
  // Suppress "cannot find module" for missing .d.ts on workspace deps;
  // we only care about type errors in the Para sources themselves.
  // (Caller can override via tsconfig for stricter cross-file checks.)
};

// File-list = original tsconfig "include" matches + our virtual .ts entries.
const fileSet = new Set<string>([...parsedCfg.fileNames, ...transformed.keys()]);

const host = ts.createCompilerHost(compilerOptions);
const origReadFile = host.readFile.bind(host);
const origFileExists = host.fileExists.bind(host);
host.fileExists = path => {
  if (transformed.has(path)) return true;
  return origFileExists(path);
};
host.readFile = path => {
  const t = transformed.get(path);
  if (t !== undefined) return t;
  return origReadFile(path);
};

const program = ts.createProgram({
  rootNames: [...fileSet],
  options: compilerOptions,
  host,
});

// ---- collect diagnostics --------------------------------------------------
const allDiagnostics = [
  ...program.getSyntacticDiagnostics(),
  ...program.getSemanticDiagnostics(),
  ...program.getGlobalDiagnostics(),
];

// Map virtual `.ts` filenames back to the original `.pts` paths.
const virtualToOriginal = new Map<string, string>();
for (const orig of paraFiles) {
  virtualToOriginal.set(
    orig.replace(/\.(pts|ptsx)$/, ext => (ext === ".ptsx" ? ".tsx" : ".ts")),
    orig,
  );
}

let errorCount = 0;
const formatHost: import("typescript").FormatDiagnosticsHost = {
  getCanonicalFileName: f => f,
  getCurrentDirectory: () => process.cwd(),
  getNewLine: () => "\n",
};

// Build path-rewrite pairs covering both the absolute virtual path
// AND its relative form (tsc's formatter prints paths relative to
// cwd). Sort by length-desc so longer paths match before any prefix
// collision.
const cwd = process.cwd();
const rewritePairs: [string, string][] = [];
for (const [v, orig] of virtualToOriginal) {
  rewritePairs.push([v, orig]);
  const relV = relative(cwd, v);
  const relO = relative(cwd, orig);
  if (relV !== v) rewritePairs.push([relV, relO]);
}
rewritePairs.sort((a, b) => b[0].length - a[0].length);
function rewriteFilenames(text: string): string {
  for (const [from, to] of rewritePairs) {
    if (text.includes(from)) text = text.split(from).join(to);
  }
  return text;
}

for (const d of allDiagnostics) {
  if (d.category === ts.DiagnosticCategory.Error) errorCount++;
  const formatted = ts.formatDiagnosticsWithColorAndContext([d], formatHost);
  process.stderr.write(rewriteFilenames(formatted));
}

if (errorCount > 0) {
  console.error(
    `\nparabun check: ${errorCount} error${errorCount === 1 ? "" : "s"} in ${paraFiles.length} file${paraFiles.length === 1 ? "" : "s"}`,
  );
  process.exit(1);
} else {
  console.log(`parabun check: no errors in ${paraFiles.length} file${paraFiles.length === 1 ? "" : "s"}`);
}
