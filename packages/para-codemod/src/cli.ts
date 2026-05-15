// C4a — `.svelte` → `.pui` migration driver.
//
// SAFETY: dry-run is the DEFAULT. `--write` is required to touch disk.
// Even then, only files that `safeMigrate` *verifies compile* are
// rewritten; would-regress and no-op files are left exactly as-is. The
// driver core (`runMigration`) takes injected compile/lower so it stays
// dependency-free + unit-testable; `main()` wires the real fork
// compiler + lowerPuiReactivity.
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { safeMigrate } from "./index.ts";

export interface MigrationDeps {
  compile: (src: string, opts: Record<string, unknown>) => unknown;
  lower: (src: string, runtime?: string, lp?: boolean, hmr?: boolean) => string;
}
export interface MigrationOptions {
  write: boolean; // false = dry-run (default)
}
export interface MigrationSummary {
  migrated: string[]; // .svelte paths rewritten → .pui
  skipped: string[]; // would-regress; left as .svelte
  noop: string[]; // nothing transformable; left as .svelte
}

/**
 * Migrate a list of `.svelte` files. Pure w.r.t. its `deps`; only
 * touches disk when `opts.write` is true (and only for verified-safe
 * migrations). A migrated file is written as a sibling `.pui` and the
 * original `.svelte` removed; skipped/no-op files are untouched.
 */
export function runMigration(files: string[], opts: MigrationOptions, deps: MigrationDeps): MigrationSummary {
  const sum: MigrationSummary = { migrated: [], skipped: [], noop: [] };
  for (const f of files) {
    if (!f.endsWith(".svelte")) continue;
    let src: string;
    try {
      src = readFileSync(f, "utf8");
    } catch {
      continue;
    }
    const r = safeMigrate(src, deps.compile, deps.lower);
    if (r.migrated) {
      sum.migrated.push(f);
      if (opts.write) {
        const target = f.replace(/\.svelte$/, ".pui");
        writeFileSync(target, r.code);
        if (target !== f) rmSync(f);
      }
    } else if (r.skippedReason && /regress|threw/.test(r.skippedReason)) {
      sum.skipped.push(f);
    } else {
      sum.noop.push(f);
    }
  }
  return sum;
}

function listSvelte(paths: string[]): string[] {
  const out: string[] = [];
  for (const p of paths) {
    try {
      const found = execFileSync("find", [p, "-name", "*.svelte", "-not", "-path", "*/node_modules/*"], {
        encoding: "utf8",
      })
        .trim()
        .split("\n")
        .filter(Boolean);
      out.push(...found);
    } catch {
      if (p.endsWith(".svelte")) out.push(p);
    }
  }
  return out;
}

export async function main(argv: string[]): Promise<number> {
  const write = argv.includes("--write");
  const paths = argv.filter(a => !a.startsWith("--"));
  if (paths.length === 0) {
    console.error("usage: para-codemod <path…> [--write]   (dry-run unless --write)");
    return 2;
  }
  // Resolve real deps lazily so the testable core stays dep-free.
  const { lowerPuiReactivity } = await import("@lyku/para-preprocess");
  const { compile } = await import("@lyku/para-ui/compiler");
  const files = listSvelte(paths);
  const sum = runMigration(files, { write }, { compile, lower: lowerPuiReactivity });
  const tx = sum.migrated.length + sum.skipped.length;
  console.log(`${write ? "MIGRATED" : "DRY-RUN (no --write)"} — ${files.length} .svelte scanned`);
  console.log(`  ✓ ${write ? "migrated" : "would migrate"} (verified-compile): ${sum.migrated.length}`);
  console.log(`  ↷ skipped (would regress → left as .svelte): ${sum.skipped.length}`);
  console.log(`  · no-op (nothing to transform): ${sum.noop.length}`);
  if (tx)
    console.log(
      `  → ${Math.round((sum.migrated.length / tx) * 100)}% of transformable safely migrated; 0 regressions by construction`,
    );
  if (!write && sum.migrated.length) console.log(`\n  re-run with --write to apply.`);
  return 0;
}

if (import.meta.main) {
  main(process.argv.slice(2)).then(c => process.exit(c));
}
