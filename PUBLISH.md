# Publishing `@para/*` to npm

You own the `@para` scope on public npm. Pre-release `@para/*` packages publish
there directly — no registry setup, no scope shuffling.

## Packages in the pre-release lane

| Package                    | Path                                   | Version       |
| -------------------------- | -------------------------------------- | ------------- |
| `@lyku/para-signals`       | `packages/para-signals`                | `0.0.1-pre.0` |
| `@lyku/para-preprocess` | `packages/para-preprocess`          | `0.0.1-pre.0` |
| `@lyku/para-ui`            | `packages/para-svelte/packages/svelte` | `0.0.1-pre.0` |

All three have `"publishConfig": { "access": "public" }` so npm doesn't refuse
on the default-private rule for scoped packages.

## Authentication

`~/.npmrc` already has the auth token line; if `npm whoami` returns 401, the
token's expired — refresh from https://www.npmjs.com/settings/<you>/tokens
(Automation token, granular access scoped to the `@para` org is fine).

## Publishing

```sh
# @lyku/para-signals — pure source, no build
cd packages/para-signals && npm publish

# @lyku/para-preprocess — tsc build first
cd packages/para-preprocess && pnpm run build && npm publish

# @lyku/para-ui — rollup build (slow) first
cd packages/para-svelte/packages/svelte && pnpm run build && npm publish
```

**`@lyku/para-ui` has a `file:` dep on `@lyku/para-signals` that must be swapped before
publish.** Current package.json:

```json
"dependencies": {
  "@lyku/para-signals": "file:../../../para-signals",
  ...
}
```

Before `npm publish`, change to `"@lyku/para-signals": "^0.0.1-pre.0"`. After
publish, revert. (A future Jenkins stage should mechanize this with `sed` +
`git checkout`.)

Publish order matters: `@lyku/para-signals` first (it's a dep of `@lyku/para-ui`); the
other two can publish in either order.

Tag the pre-release explicitly so it doesn't become npm's `latest`:

```sh
npm publish --tag pre
```

Consumers then install with `bun add @lyku/para-preprocess@pre` (or whatever tag
is current) until a `latest`-tagged GA ships.

## Version bumps

`0.0.1-pre.0` → `0.0.1-pre.1` → ... Manual bumps for now:

```sh
cd packages/para-signals && npm version 0.0.1-pre.1 --no-git-tag-version
```

When the API is stable enough to drop `-pre`, bump to `0.0.1` then `0.1.0`. The
`feedback_no_partial_release` rule (`@para/transpile` stays gated until every
desugaring works) applies to GA versions only; pre-releases are explicit
"not GA" and the API surface may change.

## CI publish — `Publish npm` stage in `jenkins/Jenkinsfile`

The npm publish runs as a stage inside the existing `parabun` Jenkins job
(no separate job to wire up). Trigger from the Jenkins UI ("Build with
Parameters") on the `parabun` job:

**Publish-only fast path** (skip the 30+min build matrix):

| Parameter                                                                            | Set to     | Notes                         |
| ------------------------------------------------------------------------------------ | ---------- | ----------------------------- |
| `BUILD_LINUX` / `BUILD_LINUX_ARM64` / `BUILD_MACOS` / `BUILD_WINDOWS` / `BUILD_VSIX` | `false`    | Skip platform builds entirely |
| `RUN_TESTS`                                                                          | `false`    | No build artifacts to test    |
| `PUBLISH_RELEASE`                                                                    | `false`    | No artifacts to upload to GH  |
| `PUBLISH_DOCKER`                                                                     | `false`    | No Linux binary to image      |
| `PUBLISH_NPM`                                                                        | **`true`** | Run the npm publish stage     |

**Full release run**: leave all build params on as usual, set
`PUBLISH_NPM=true`. npm publish runs after the release/Docker stages.

The stage publishes `@lyku/para-signals` first then `@lyku/para-ui` (the
latter depends on the former). Both `--tag pre` — npm's `latest` tag is
untouched. The @lyku/para-ui stage sed-swaps the local-dev `file:` dep on
`@lyku/para-signals` to a real semver before publish, reverts in
`post.always` even on failure.

`@lyku/para-preprocess` is NOT published from this stage — lyku has
its own copy at `libs/para-preprocess` (LYK-874). Add a publish step
in a follow-up commit once the sync gap is closed.

Authentication: Doppler secret `NPM_ACCESS_TOKEN` in `ci-deploy/prd`,
same secret lyku's CI uses.

Local publishes (only if Jenkins is unavailable):

```sh
# @lyku/para-signals first
cd packages/para-signals && npm publish --tag pre

# Then @lyku/para-ui, with file:-dep swap
cd packages/para-svelte/packages/svelte
sed -i 's|"@lyku/para-signals": "file:[^"]*"|"@lyku/para-signals": "^0.0.1-pre.0"|' package.json
pnpm run build && npm publish --tag pre
git checkout package.json
```

Requires Automation-type npm token (granular tokens hit a 2FA OTP prompt
that local CLI can't satisfy unattended). Personal tokens with publish
scope work for manual one-shots.

## Migration plan for lyku

Once a publish has landed:

1. `/raid/lyku/apps/desktop-electron/package.json` — swap
   `"@lyku/para-ui": "file:..."` etc. for `"@lyku/para-preprocess": "^0.0.1-pre.0"`,
   `"@lyku/para-ui": "^0.0.1-pre.0"`, `"@lyku/para-signals": "^0.0.1-pre.0"`.
2. Delete `/raid/lyku/libs/para-preprocess/` — no longer needed; everything
   resolves from npm. The lyku/parabun drift problem goes away.
3. `bun install` — pulls from npm.

The current `file:` deps keep working in the interim. No urgency.
