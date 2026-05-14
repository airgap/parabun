# Publishing `@para/*` to GitHub Packages

Para's npm packages publish to **GitHub Packages** under the `@para` scope. This
is the lowest-friction path that respects `feedback_no_oven_sh_publish` (publish
only to airgap infra, not upstream Bun / Svelte registries).

## One-time prerequisite — create the `@para` GitHub owner

GitHub Packages requires the npm scope to match the GitHub user or org owning
the registry. Two options:

1. **Create a GitHub organization named `para`** (recommended — matches the
   user-facing brand). https://github.com/organizations/new — pick `para` as
   the org name. Free tier is fine for our publishing volume.
2. **Rename packages to `@airgap/*`** — reuse the existing `airgap` org. Means
   a find-replace across the codebase. Avoid unless step 1 is somehow blocked.

This step has to happen before the first `npm publish` — there's no way to set
it up later from inside the package files alone.

## Per-developer authentication

Each developer who publishes (and lyku/parabun CI) needs a GitHub PAT with the
`write:packages` scope.

1. https://github.com/settings/tokens/new — classic PAT, check `write:packages`
   (which auto-checks `read:packages` and `repo`).
2. Export it as `GITHUB_TOKEN` in your shell:
   ```sh
   export GITHUB_TOKEN=ghp_...
   ```
3. Copy the template:
   ```sh
   cp .npmrc.example .npmrc
   ```
   `.npmrc` is gitignored (the template `.npmrc.example` is committed). The
   template references `${GITHUB_TOKEN}` so even the committed file leaks
   nothing; the copy step is just to satisfy npm, which doesn't read
   `.npmrc.example`.

For consumers (anywhere that installs `@para/*`):

```ini
; .npmrc in the consuming project
@para:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Token needs `read:packages` scope only.

## Publishing

Three packages currently in the pre-release lane:

| Package               | Path                                   | Version       |
| --------------------- | -------------------------------------- | ------------- |
| `@para/signals`       | `packages/para-signals`                | `0.0.1-pre.0` |
| `@para/ui-preprocess` | `packages/para-ui-preprocess`          | `0.0.1-pre.0` |
| `@para/ui`            | `packages/para-svelte/packages/svelte` | `0.0.1-pre.0` |

Manual publish (one-off, until Jenkins is wired):

```sh
cd packages/para-signals && npm publish
cd packages/para-ui-preprocess && pnpm run build && npm publish
cd packages/para-svelte/packages/svelte && pnpm run build && npm publish
```

Note `@para/ui-preprocess` and `@para/ui` have `prepublishOnly` build steps.
`@para/signals` is pure source-only — no build.

**`file:` deps need swapping at publish time.** `@para/ui`'s package.json has
`"@para/signals": "file:../../../para-signals"` for local dev. Before publishing
`@para/ui`, swap that to a real semver: `"@para/signals": "^0.0.1-pre.0"` (or
whatever was just published). After `npm publish`, revert the file. The Jenkins
stage below should mechanize this with a `sed` + `git checkout` pair.

## Version bumps

Pre-releases follow `0.0.1-pre.N` — bump `N` on each republish. When the API is
stable enough to drop the `-pre` suffix, bump to `0.0.1` then `0.1.0`. The
`feedback_no_partial_release` rule (`@para/transpile` stays gated until every
desugaring works) applies to GA versions only; pre-releases are explicit
"not GA" and surfaces of the API may change.

## Wiring CI (Jenkins) — TODO

The parabun `jenkins/Jenkinsfile` already authenticates to
`registry.digitalocean.com/parabun` for Docker pushes. Adding an npm-publish
stage:

1. Add `GITHUB_PACKAGES_TOKEN` as a Jenkins secret (separate from the
   parabun-binary publish token — least privilege).
2. New stage after the build, gated on `main`:
   ```groovy
   stage('publish-npm-pre') {
     when { branch 'main' }
     environment {
       GITHUB_TOKEN = credentials('github-packages-token')
     }
     steps {
       sh '''
         for pkg in packages/para-signals \\
                    packages/para-ui-preprocess \\
                    packages/para-svelte/packages/svelte; do
           cd "$pkg" && npm version "0.0.1-pre.$(git rev-parse --short HEAD)" \\
             --no-git-tag-version && npm publish && cd -
         done
       '''
     }
   }
   ```
3. Lyku's CI gets a `read:packages` token, installs `@para/ui-preprocess` etc.
   like any other dep — drift goes away entirely.

Not blocking F2 work; can be wired whenever.

## Migration plan for lyku

Once published:

1. `/raid/lyku/.npmrc` — add the `@para:registry` line above.
2. `/raid/lyku/apps/desktop-electron/package.json` — swap
   `"@para/ui": "file:..."` etc. for `"^0.0.1-pre.0"` version specs.
3. Delete `/raid/lyku/libs/para-ui-preprocess/` — no longer needed; everything
   resolves from npm.
4. `bun install` — pulls from GH Packages.

The current `file:` deps keep working in the interim. No urgency.
