#!/usr/bin/env bun
// Parabun meta-benchmark runner.
//
// Clones each target in manifest.json at its pinned commit, installs its deps,
// and invokes the target's four-way harness (node / bun / parabun / rewrite).
//
// Reproducibility: every package in the manifest has a pinned SHA and repo
// URL. The 117 validation targets + 4 rewrite benches were gated by an
// upstream `npm test` passing under node v22.4.0 when the manifest was built.
//
// Usage:
//   bun run run.ts                          # run all targets that have a rewrite
//   bun run run.ts --targets=foo,bar        # subset
//   bun run run.ts --all                    # also clone/install the 113
//                                           # validation-only targets
//   bun run run.ts --validate-upstream      # additionally re-run `npm test`
//                                           # as a per-target correctness gate
//   bun run run.ts --cache-dir=<path>       # override cache location
//
// Env overrides (propagate to each target's harness):
//   NODE_BIN     — node binary (default: `node` in PATH)
//   BUN_BIN      — upstream Bun (default: `bun` in PATH)
//   PARABUN_BIN  — parabun binary (default: `BUN_BIN`)

import { $, spawnSync } from "bun";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type Pkg = {
  name: string;
  repo: string;
  commit: string;
  subdir: string;
  rewriteLocal?: string;
  prebuild?: string;
};

const HERE = fileURLToPath(new URL(".", import.meta.url));
const MANIFEST = JSON.parse(await Bun.file(join(HERE, "manifest.json")).text()) as { packages: Pkg[] };

const args = new Map<string, string | true>();
for (const a of process.argv.slice(2)) {
  const [k, v] = a.startsWith("--") ? a.slice(2).split("=") : [a, true];
  args.set(k, v ?? true);
}

const CACHE = resolve(
  typeof args.get("cache-dir") === "string" ? (args.get("cache-dir") as string) : join(HERE, "cache"),
);
const RESULTS = join(HERE, "results");
mkdirSync(CACHE, { recursive: true });
mkdirSync(RESULTS, { recursive: true });

const wantAll = args.has("all");
const wantValidate = args.has("validate-upstream");
const filter = typeof args.get("targets") === "string" ? new Set((args.get("targets") as string).split(",")) : null;

let pkgs = MANIFEST.packages;
if (!wantAll) pkgs = pkgs.filter(p => p.rewriteLocal);
if (filter) pkgs = pkgs.filter(p => filter.has(p.name));

const platform = `${process.platform}-${process.arch}`;
console.log(`metabench: ${pkgs.length} targets, platform=${platform}, cache=${CACHE}`);

type Result =
  | { name: string; status: "ok"; bench_stdout?: string; validate?: "pass" | "fail" | "skipped" }
  | { name: string; status: "clone-fail" | "install-fail" | "validate-fail" | "bench-fail"; error: string };

const results: Result[] = [];

async function ensureClone(p: Pkg): Promise<boolean> {
  const dir = join(CACHE, p.name.replaceAll("/", "_").replaceAll("@", "_"));
  if (existsSync(join(dir, ".git"))) {
    const cur = (await $`git -C ${dir} rev-parse HEAD`.quiet().text()).trim();
    if (cur === p.commit) return true;
    rmSync(dir, { recursive: true, force: true });
  }
  mkdirSync(dir, { recursive: true });
  try {
    await $`git -C ${dir} init -q`.quiet();
    await $`git -C ${dir} remote add origin ${p.repo}`.quiet();
    await $`git -C ${dir} fetch --depth=1 -q origin ${p.commit}`.quiet();
    await $`git -C ${dir} checkout -q FETCH_HEAD`.quiet();
    return true;
  } catch (e) {
    return false;
  }
}

function pkgDir(p: Pkg): string {
  const root = join(CACHE, p.name.replaceAll("/", "_").replaceAll("@", "_"));
  return p.subdir && p.subdir !== "." ? join(root, p.subdir) : root;
}

for (const p of pkgs) {
  process.stdout.write(`[${p.name}] `);
  if (!(await ensureClone(p))) {
    results.push({ name: p.name, status: "clone-fail", error: "git fetch failed" });
    console.log("clone-fail");
    continue;
  }

  const cwd = pkgDir(p);
  if (!existsSync(join(cwd, "node_modules"))) {
    const r = spawnSync({
      cmd: ["npm", "install", "--no-audit", "--no-fund", "--legacy-peer-deps", "--loglevel=error"],
      cwd,
      stderr: "pipe",
      stdout: "pipe",
    });
    if (r.exitCode !== 0) {
      results.push({
        name: p.name,
        status: "install-fail",
        error: new TextDecoder().decode(r.stderr).split("\n").slice(-10).join("\n"),
      });
      console.log("install-fail");
      continue;
    }
  }

  if (p.prebuild) {
    const r = spawnSync({
      cmd: ["sh", "-c", p.prebuild],
      cwd,
      stderr: "pipe",
      stdout: "pipe",
      timeout: 300_000,
    });
    if (r.exitCode !== 0) {
      results.push({
        name: p.name,
        status: "install-fail",
        error: "prebuild: " + new TextDecoder().decode(r.stderr).split("\n").slice(-10).join("\n"),
      });
      console.log("prebuild-fail");
      continue;
    }
  }

  let validate: "pass" | "fail" | "skipped" = "skipped";
  if (wantValidate) {
    const r = spawnSync({ cmd: ["npm", "test"], cwd, stderr: "pipe", stdout: "pipe", timeout: 300_000 });
    validate = r.exitCode === 0 ? "pass" : "fail";
    if (validate === "fail") {
      results.push({
        name: p.name,
        status: "validate-fail",
        error: new TextDecoder().decode(r.stderr).split("\n").slice(-10).join("\n"),
      });
      console.log("validate-fail");
      continue;
    }
  }

  if (!p.rewriteLocal) {
    results.push({ name: p.name, status: "ok", validate });
    console.log("ok (validation-only)");
    continue;
  }

  const targetDir = join(HERE, "targets", p.rewriteLocal);
  const PARABUN = process.env.PARABUN_BIN || process.env.BUN_BIN || "bun";
  const r = spawnSync({
    cmd: [PARABUN, "run", join(targetDir, "harness.ts")],
    cwd: targetDir,
    stderr: "pipe",
    stdout: "pipe",
    env: { ...process.env, UPSTREAM_DIR: cwd },
    timeout: 600_000,
  });
  if (r.exitCode !== 0) {
    results.push({
      name: p.name,
      status: "bench-fail",
      error: new TextDecoder().decode(r.stderr).split("\n").slice(-15).join("\n"),
    });
    console.log("bench-fail");
    continue;
  }
  const stdout = new TextDecoder().decode(r.stdout);
  results.push({ name: p.name, status: "ok", bench_stdout: stdout, validate });
  console.log("ok");
}

const outfile = join(RESULTS, `${platform}.json`);
writeFileSync(outfile, JSON.stringify({ platform, timestamp: new Date().toISOString(), results }, null, 2));
console.log(`\nwrote ${outfile}`);

const ok = results.filter(r => r.status === "ok").length;
console.log(`${ok}/${results.length} benches succeeded`);
