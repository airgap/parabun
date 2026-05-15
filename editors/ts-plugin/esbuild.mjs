// Bundle the TS language-service plugin into one self-contained CJS file.
//
// svelte2tsx + svelte (compiler) + @lyku/para-preprocess are inlined so the
// vsix doesn't have to ship their node_modules. `typescript` stays external
// — the tsserver provides it at load time, and bundling a second copy would
// break the `ts` identity the plugin proxies.
import { build } from "esbuild";
import { rmSync, mkdirSync } from "node:fs";

// Fresh out/ — only the single bundled index.js should ship in the vsix.
rmSync("out", { recursive: true, force: true });
mkdirSync("out");

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node18",
  outfile: "out/index.js",
  external: ["typescript", "typescript/lib/tsserverlibrary"],
  // Resolve @lyku/para-preprocess via its `bun` export condition, which
  // points at src/index.ts — so this bundle doesn't require the preprocess
  // package's dist/ to be prebuilt (CI's VSIX stage only builds this
  // plugin). esbuild compiles the referenced TS source inline.
  conditions: ["bun", "import", "default"],
  logLevel: "info",
});
