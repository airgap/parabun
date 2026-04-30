# Parabun meta-benchmarks

Cross-platform runner that clones upstream npm packages at pinned commits and measures parabun's rewrite vs. node / bun / parabun-drop-in.

## Files

- `manifest.json` — 117 packages pinned by `{name, repo, commit, subdir, prebuild?, rewriteLocal?}`. 4 have rewrites; 113 are validation-only (passing `npm test` under node v22.4.0 when pinned).
- `run.ts` — orchestrator. Clones at pinned SHA, installs, runs each target's harness.
- `targets/<pkg>/` — per-package bench files: `gen.*`, `run-upstream.*`, `run-parabun.pjs`, `harness.ts`.
- `cache/` — clones land here (gitignored).
- `results/<platform>.json` — per-run output, one file per platform.

## Prerequisites

- `git`, `node`, `npm`, `bun` on PATH
- A built parabun binary (for the rewrite side)

## Usage

```sh
# From parabun repo root, after building parabun:
cd bench/metabench

# Run all rewrite benches:
PARABUN_BIN=/path/to/parabun/build/release/bun bun run run.ts

# Subset:
PARABUN_BIN=... bun run run.ts --targets=cosine-similarity,fast-levenshtein

# Also validate upstream tests still pass as correctness gate:
PARABUN_BIN=... bun run run.ts --validate-upstream

# Include all 113 validation-only targets (disk-heavy):
PARABUN_BIN=... bun run run.ts --all --validate-upstream
```

## Env overrides

| var            | default           | purpose                                  |
|----------------|-------------------|------------------------------------------|
| `PARABUN_BIN`  | `$BUN_BIN` or bun | the parabun build under test             |
| `BUN_BIN`      | `bun`             | upstream bun baseline                    |
| `NODE_BIN`     | `node`            | node baseline                            |
| `UPSTREAM_DIR` | (set by runner)   | cloned package root, passed to harness   |

## Reproducibility

Each manifest entry pins a SHA — cloning on a new host lands the same tree the upstream `npm test` gate was verified against. When bumping a pin, re-run `npm test` upstream to confirm the new commit still gates, then update the SHA + commit the manifest.

## Adding a new rewrite target

1. Clone upstream, confirm `npm test` passes at a specific SHA.
2. Add to `manifest.json`: `{name, repo, commit, subdir, rewriteLocal: "<pkg>"}`. Add `prebuild` if the upstream needs a build step (e.g. `npm run tsc` for ml-kmeans).
3. Create `targets/<pkg>/`:
   - `gen.*` — deterministic test data
   - `run-upstream.*` — exercise upstream lib, reading it via `process.env.UPSTREAM_DIR`
   - `run-parabun.pjs` — the rewrite using `para:simd` / `para:parallel` etc.
   - `harness.ts` — spawns the 4 runtimes, prints timing table
4. `bun run run.ts --targets=<pkg>` to verify.
