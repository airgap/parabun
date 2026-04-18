#!/usr/bin/env bun
/**
 * parabun build-lib — compile TypeScript libraries that use Parabun syntax.
 * Drop-in replacement for @nx/js:tsc.
 *
 * Usage:
 *   bun editors/dts.ts --tsconfig tsconfig.lib.json
 *   bun editors/dts.ts tsconfig.lib.json --outDir dist
 *   bun editors/dts.ts --dts-only --tsconfig tsconfig.lib.json
 *
 * Produces .js + .d.ts + .d.ts.map (like tsc), transforming Parabun syntax
 * in-place before the tsc pass, then restoring originals.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync, cpSync } from "fs";
import { resolve, dirname, basename, relative, join } from "path";
import { spawnSync } from "child_process";
import { transformParabunToTS, containsParabunSyntax } from "./ts-plugin/src/transform";

function usage(): never {
  console.error("Usage:");
  console.error("  parabun build-lib --tsconfig tsconfig.lib.json");
  console.error("  parabun build-lib tsconfig.lib.json --outDir dist");
  console.error("  parabun build-lib --dts-only --tsconfig tsconfig.lib.json");
  process.exit(1);
}

const args = process.argv.slice(2);
let projectPath: string | null = null;
let outDir: string | null = null;
let dtsOnly = false;
const files: string[] = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--tsconfig" || args[i] === "-t") {
    projectPath = args[++i];
  } else if (args[i] === "--outDir") {
    outDir = args[++i];
  } else if (args[i] === "--dts-only") {
    dtsOnly = true;
  } else if (args[i] === "--help" || args[i] === "-h") {
    usage();
  } else if (args[i].endsWith("tsconfig.json") || args[i].endsWith("tsconfig.lib.json")) {
    projectPath = args[i];
  } else {
    files.push(args[i]);
  }
}

if (!projectPath && files.length === 0) {
  if (existsSync("tsconfig.lib.json")) {
    projectPath = "tsconfig.lib.json";
  } else if (existsSync("tsconfig.json")) {
    projectPath = "tsconfig.json";
  } else {
    usage();
  }
}

// --- Resolve tsconfig and sources ---

interface TsConfig {
  extends?: string;
  compilerOptions?: Record<string, any>;
  include?: string[];
  exclude?: string[];
  files?: string[];
}

function stripJsonComments(raw: string): string {
  let result = "";
  let inString = false;
  let escape = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (escape) {
      result += ch;
      escape = false;
      continue;
    }
    if (inString) {
      if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      result += ch;
      continue;
    }
    if (ch === '"') {
      inString = true;
      result += ch;
    } else if (ch === "/" && raw[i + 1] === "/") {
      while (i < raw.length && raw[i] !== "\n") i++;
      result += "\n";
    } else if (ch === "/" && raw[i + 1] === "*") {
      i += 2;
      while (i < raw.length && !(raw[i] === "*" && raw[i + 1] === "/")) i++;
      i++;
    } else {
      result += ch;
    }
  }
  return result;
}

function readTsConfig(path: string): TsConfig {
  return JSON.parse(stripJsonComments(readFileSync(path, "utf8")));
}

function resolveExtends(config: TsConfig, configDir: string): TsConfig {
  if (!config.extends) return config;
  const basePath = resolve(configDir, config.extends);
  const baseDir = dirname(basePath);
  let base = readTsConfig(basePath);
  base = resolveExtends(base, baseDir);
  return {
    ...base,
    ...config,
    compilerOptions: { ...base.compilerOptions, ...config.compilerOptions },
  };
}

const cwd = process.cwd();
let resolvedOutDir: string;
let sourceFiles: string[];
let configDir: string;
let fullConfig: TsConfig;

if (projectPath) {
  const absProject = resolve(cwd, projectPath);
  configDir = dirname(absProject);
  fullConfig = resolveExtends(readTsConfig(absProject), configDir);
  resolvedOutDir = outDir
    ? resolve(cwd, outDir)
    : fullConfig.compilerOptions?.outDir
      ? resolve(configDir, fullConfig.compilerOptions.outDir)
      : resolve(configDir, "dist");

  // Resolve source files using glob patterns from include/files
  const includes = fullConfig.include || [];
  const filesList = fullConfig.files || [];
  const globs = [...filesList, ...includes];

  if (globs.length === 0) {
    console.error("No files or include patterns found in", projectPath);
    process.exit(1);
  }

  sourceFiles = [];
  for (const pattern of globs) {
    const glob = new Bun.Glob(pattern);
    for (const f of glob.scanSync({ cwd: configDir, absolute: true })) {
      if (f.endsWith(".ts") && !f.endsWith(".d.ts") && !f.includes("node_modules")) {
        sourceFiles.push(f);
      }
    }
  }
} else {
  configDir = cwd;
  fullConfig = { compilerOptions: {} };
  resolvedOutDir = outDir ? resolve(cwd, outDir) : resolve(cwd, "dist");
  sourceFiles = files.map(f => resolve(cwd, f));
}

if (sourceFiles.length === 0) {
  console.error("No .ts source files found.");
  process.exit(1);
}

// --- Transform in-place, run tsc, restore ---

const absProject = projectPath ? resolve(cwd, projectPath) : null;
const backups = new Map<string, string>();

function transformInPlace() {
  let count = 0;
  for (const file of sourceFiles) {
    const content = readFileSync(file, "utf8");
    if (containsParabunSyntax(content)) {
      backups.set(file, content);
      writeFileSync(file, transformParabunToTS(content));
      count++;
    }
  }
  return count;
}

function restoreOriginals() {
  for (const [file, original] of backups) {
    writeFileSync(file, original);
  }
  backups.clear();
}

const transformed = transformInPlace();

try {
  const tscBin = resolve(configDir, "node_modules/.bin/tsc");
  const tscCmd = existsSync(tscBin) ? tscBin : "tsc";
  const tscArgs = absProject ? ["--project", absProject] : sourceFiles;

  if (outDir) {
    tscArgs.push("--outDir", resolvedOutDir);
  }

  if (dtsOnly) {
    tscArgs.push("--emitDeclarationOnly");
  }

  console.log(`Compiling ${sourceFiles.length} files (${transformed} transformed)${dtsOnly ? " [dts-only]" : ""}...`);

  const result = spawnSync(tscCmd, tscArgs, {
    cwd: configDir,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    restoreOriginals();
    console.error("tsc failed with exit code", result.status);
    process.exit(result.status || 1);
  }

  // When tsc widens rootDir to include resolved path aliases from other
  // libraries, it creates sibling directories in the output. Flatten the
  // target library's output up to outDir and remove the dependency artifacts.
  const libDirName = basename(configDir);
  const nestedLib = resolve(resolvedOutDir, libDirName);
  if (existsSync(nestedLib) && existsSync(resolve(nestedLib, "src"))) {
    for (const entry of readdirSync(resolvedOutDir)) {
      const full = resolve(resolvedOutDir, entry);
      if (entry === libDirName || entry === "package.json") continue;
      rmSync(full, { recursive: true, force: true });
    }
    for (const entry of readdirSync(nestedLib)) {
      const src = resolve(nestedLib, entry);
      const dest = resolve(resolvedOutDir, entry);
      if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
      cpSync(src, dest, { recursive: true });
    }
    rmSync(nestedLib, { recursive: true, force: true });
  }

  // Copy package.json to outDir if it exists alongside the tsconfig
  const srcPkg = resolve(configDir, "package.json");
  if (existsSync(srcPkg) && existsSync(resolvedOutDir)) {
    const pkg = JSON.parse(readFileSync(srcPkg, "utf8"));
    const indexJs = existsSync(resolve(resolvedOutDir, "src/index.js")) ? "./src/index.js" : "./index.js";
    const indexDts = indexJs.replace(".js", ".d.ts");
    pkg.main = indexJs;
    pkg.typings = indexDts;
    pkg.types = indexDts;
    pkg.module = indexJs;
    if (!pkg.type) pkg.type = "module";
    delete pkg.scripts;
    delete pkg.devDependencies;
    writeFileSync(resolve(resolvedOutDir, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
  }

  console.log(`Done. Output written to ${relative(cwd, resolvedOutDir)}/`);
} finally {
  restoreOriginals();
}
