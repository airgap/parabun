const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

// Copy LSP server
fs.mkdirSync(path.join(root, "server"), { recursive: true });
fs.copyFileSync(path.resolve(root, "../../lsp/parabun-lsp.ts"), path.join(root, "server/parabun-lsp.ts"));

// Bundle `typescript` next to the LSP script so its
// `require.resolve("typescript", { paths: [lspDir] })` fallback finds it
// even when the user's workspace doesn't have a typescript dep. Without
// this, validation silently produced zero diagnostics ("type features
// disabled") in any workspace that lacks tsc.
const tsSrc = path.resolve(root, "node_modules/typescript");
const tsDest = path.join(root, "server/node_modules/typescript");
fs.rmSync(tsDest, { recursive: true, force: true });
fs.mkdirSync(path.dirname(tsDest), { recursive: true });
fs.cpSync(tsSrc, tsDest, { recursive: true, dereference: true });

// Copy TS plugin (built output only — no symlink, no npm dep)
const pluginSrc = path.resolve(root, "../../ts-plugin");
const pluginDest = path.join(root, "node_modules/parabun-ts-plugin");

// Remove stale symlink or directory
try {
  const stat = fs.lstatSync(pluginDest);
  if (stat.isSymbolicLink()) {
    fs.unlinkSync(pluginDest);
  } else if (stat.isDirectory()) {
    fs.rmSync(pluginDest, { recursive: true });
  }
} catch {}

fs.mkdirSync(path.join(pluginDest, "out"), { recursive: true });
fs.copyFileSync(path.join(pluginSrc, "package.json"), path.join(pluginDest, "package.json"));
for (const f of fs.readdirSync(path.join(pluginSrc, "out"))) {
  fs.copyFileSync(path.join(pluginSrc, "out", f), path.join(pluginDest, "out", f));
}

console.log("copied: server/parabun-lsp.ts, node_modules/parabun-ts-plugin/");
