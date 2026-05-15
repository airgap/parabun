# Publishing `@para/*` to npm

You own the `@para` scope on public npm. Pre-release `@para/*` packages publish
there directly — no registry setup, no scope shuffling.

## Packages in the pre-release lane

| Package               | Path                                   | Version       |
| --------------------- | -------------------------------------- | ------------- |
| `@para/signals`       | `packages/para-signals`                | `0.0.1-pre.0` |
| `@para/ui-preprocess` | `packages/para-ui-preprocess`          | `0.0.1-pre.0` |
| `@para/ui`            | `packages/para-svelte/packages/svelte` | `0.0.1-pre.0` |

All three have `"publishConfig": { "access": "public" }` so npm doesn't refuse
on the default-private rule for scoped packages.

## Authentication

`~/.npmrc` already has the auth token line; if `npm whoami` returns 401, the
token's expired — refresh from https://www.npmjs.com/settings/<you>/tokens
(Automation token, granular access scoped to the `@para` org is fine).

## Publishing

```sh
# @para/signals — pure source, no build
cd packages/para-signals && npm publish

# @para/ui-preprocess — tsc build first
cd packages/para-ui-preprocess && pnpm run build && npm publish

# @para/ui — rollup build (slow) first
cd packages/para-svelte/packages/svelte && pnpm run build && npm publish
```

**`@para/ui` has a `file:` dep on `@para/signals` that must be swapped before
publish.** Current package.json:

```json
"dependencies": {
  "@para/signals": "file:../../../para-signals",
  ...
}
```

Before `npm publish`, change to `"@para/signals": "^0.0.1-pre.0"`. After
publish, revert. (A future Jenkins stage should mechanize this with `sed` +
`git checkout`.)

Publish order matters: `@para/signals` first (it's a dep of `@para/ui`); the
other two can publish in either order.

Tag the pre-release explicitly so it doesn't become npm's `latest`:

```sh
npm publish --tag pre
```

Consumers then install with `bun add @para/ui-preprocess@pre` (or whatever tag
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

## Wiring CI (Jenkins) — TODO

Parabun's `jenkins/Jenkinsfile` already authenticates to
`registry.digitalocean.com/parabun` for Docker pushes. An npm-publish stage:

1. Add `NPM_TOKEN` as a Jenkins secret (Automation token, write access to
   the `@para` scope only — least privilege).
2. New stage after the build, gated on `main`:

   ```groovy
   stage('publish-npm-pre') {
       when { branch 'main' }
       environment {
           NPM_TOKEN = credentials('para-npm-token')
       }
       steps {
           sh '''
               SHORT_SHA=$(git rev-parse --short HEAD)

               echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > ~/.npmrc

               # @para/signals
               cd packages/para-signals
               npm version "0.0.1-pre.${SHORT_SHA}" --no-git-tag-version
               npm publish --tag pre
               cd -

               # @para/ui-preprocess
               cd packages/para-ui-preprocess
               pnpm run build
               npm version "0.0.1-pre.${SHORT_SHA}" --no-git-tag-version
               npm publish --tag pre
               cd -

               # @para/ui — swap file: dep, publish, revert
               cd packages/para-svelte/packages/svelte
               sed -i 's|"@para/signals": "file:.*"|"@para/signals": "^0.0.1-pre.'"${SHORT_SHA}"'"|' package.json
               pnpm run build
               npm version "0.0.1-pre.${SHORT_SHA}" --no-git-tag-version
               npm publish --tag pre
               git checkout package.json
               cd -
           '''
       }
   }
   ```

3. Lyku CI just installs `@para/ui-preprocess@pre` etc. — no auth needed for
   read of public packages.

Not blocking F2 work; can wire whenever.

## Migration plan for lyku

Once a publish has landed:

1. `/raid/lyku/apps/desktop-electron/package.json` — swap
   `"@para/ui": "file:..."` etc. for `"@para/ui-preprocess": "^0.0.1-pre.0"`,
   `"@para/ui": "^0.0.1-pre.0"`, `"@para/signals": "^0.0.1-pre.0"`.
2. Delete `/raid/lyku/libs/para-ui-preprocess/` — no longer needed; everything
   resolves from npm. The lyku/parabun drift problem goes away.
3. `bun install` — pulls from npm.

The current `file:` deps keep working in the interim. No urgency.
