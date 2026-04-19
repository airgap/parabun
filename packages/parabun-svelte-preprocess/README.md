# parabun-svelte-preprocess

A Svelte preprocessor that lets `.svelte` files use Parabun syntax (`pure`, `..!`, `..&`, `..=`, `|>`) inside `<script>` blocks, and lets them import `.pts` / `.pjs` modules.

Parabun's parser handles its extensions unconditionally, so this preprocessor is a thin wrapper around `Bun.Transpiler` — it hands the script body to the transpiler and returns plain JS/TS that the Svelte compiler (or `vitePreprocess`) can consume.

## Install

```sh
bun add -d parabun-svelte-preprocess
```

Requires Parabun (`bun` in this fork) at runtime — it uses `Bun.Transpiler`.

## Usage

```js
// svelte.config.js
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { parabunPreprocess } from "parabun-svelte-preprocess";

export default {
  preprocess: [
    parabunPreprocess(),
    vitePreprocess(),
  ],
};
```

Then in a component:

```svelte
<script lang="parabun">
  import { load } from "./data.pts";

  pure fun double(x: number) { return x * 2; }

  const rows = await load() ..! (err) => {
    console.error(err);
    return [];
  };
</script>

{#each rows as row}
  <p>{double(row.n)}</p>
{/each}
```

## Options

```ts
parabunPreprocess({
  langs: ["parabun", "pts", "pjs"], // lang attribute values to transform
  all: false,                        // also transform plain/ts scripts
});
```

- **`langs`** — which `<script lang="...">` values trigger Parabun transpilation. Defaults to `["parabun", "pts", "pjs"]`.
- **`all`** — when `true`, every `<script>` block (including bare `<script>` and `<script lang="ts">`) is run through the Parabun transpiler. Handy if you want Parabun operators everywhere without annotating each block.

## Caveats

- Sourcemaps are not currently forwarded. `Bun.Transpiler.transformSync` doesn't emit them, so this preprocessor returns only transformed code. Line numbers stay close enough to original for most debugging; precise mapping is a follow-up.
- Chain with `vitePreprocess()` (or your TS-aware preprocessor) *after* this one. We emit plain TS, which Svelte then type-strips.
- Only the `script` hook is implemented. Parabun syntax is not meaningful in `style` or `markup`.
