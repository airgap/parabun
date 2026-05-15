# Publishing `@para/*` to npm

You own the `@para` scope on public npm. Pre-release `@para/*` packages publish
there directly — no registry setup, no scope shuffling.

## Packages in the pre-release lane

| Package               | Path                                   | Version       |
| --------------------- | -------------------------------------- | ------------- |
| `@lyku/para-signals`       | `packages/para-signals`                | `0.0.1-pre.0` |
| `@lyku/para-ui-preprocess` | `packages/para-ui-preprocess`          | `0.0.1-pre.0` |
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

# @lyku/para-ui-preprocess — tsc build first
cd packages/para-ui-preprocess && pnpm run build && npm publish

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

Consumers then install with `bun add @lyku/para-ui-preprocess@pre` (or whatever tag
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

## CI publish — `jenkins/Jenkinsfile.npm-publish`

The canonical publish path is the Jenkins pipeline at
`jenkins/Jenkinsfile.npm-publish` (modelled on lyku's, same Doppler secret
`NPM_ACCESS_TOKEN` from `ci-deploy/prd`).

Trigger from the Jenkins UI ("Build with Parameters"):

| Parameter               | Default | Notes                                                                                                                     |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| `VERSION_BUMP`          | `keep`  | `keep` publishes versions verbatim. `auto-pre-sha` bumps to `0.0.1-pre.<short-sha>` so re-runs produce distinct versions. |
| `PUBLISH_SIGNALS`       | `true`  | Required before `@lyku/para-ui` (transitive dep).                                                                              |
| `PUBLISH_UI`            | `true`  | sed-swaps the `file:` dep on `@lyku/para-signals` to the just-published semver, builds, publishes, reverts.                    |
| `PUBLISH_UI_PREPROCESS` | `false` | Off by default — lyku has its own local copy at `libs/para-ui-preprocess` until the sync gap is closed (LYK-874).         |

All packages publish `--tag pre` — npm's `latest` tag isn't touched.
Consumers opt in with `bun add @lyku/para-ui@pre`. When a package goes GA, drop
`--tag pre` from its stage.

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
   `"@lyku/para-ui": "file:..."` etc. for `"@lyku/para-ui-preprocess": "^0.0.1-pre.0"`,
   `"@lyku/para-ui": "^0.0.1-pre.0"`, `"@lyku/para-signals": "^0.0.1-pre.0"`.
2. Delete `/raid/lyku/libs/para-ui-preprocess/` — no longer needed; everything
   resolves from npm. The lyku/parabun drift problem goes away.
3. `bun install` — pulls from npm.

The current `file:` deps keep working in the interim. No urgency.
