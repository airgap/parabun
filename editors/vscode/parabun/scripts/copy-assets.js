const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");

// Refuse to build a .vsix if the local parabun on PATH is a debug
// build. The extension's activate() now guards against running with a
// debug build (the ASAN + tracing overhead makes the LSP unusable —
// 38 s cold start vs 4 s release), but catching it earlier at build
// time keeps a developer from packaging + installing a .vsix that
// will then refuse to start.
try {
  const revision = execFileSync("parabun", ["--revision"], { encoding: "utf8", timeout: 5000 }).trim();
  if (revision.includes("-debug")) {
    console.error(
      `\nERROR: the \`parabun\` binary on PATH is a debug build (${revision}).\n` +
        `Debug builds are 10-100x slower than release and make the installed\n` +
        `extension unusable — and its activate() now refuses to start.\n\n` +
        `Fix one of:\n` +
        `  1. Build & symlink release:\n` +
        `       cd /raid/parabun && bun run build:release\n` +
        `       sudo ln -sf /raid/parabun/build/release/bun /usr/local/bin/parabun\n` +
        `  2. Adjust your PATH so a release-build parabun comes first.\n`,
    );
    process.exit(1);
  }
  console.log("parabun binary check ok:", revision);
} catch (e) {
  console.error(
    "\nERROR: failed to invoke `parabun --revision` to verify the binary is a release build.\n" +
      "Make sure `parabun` is on PATH and points to a release build.\n" +
      `Underlying error: ${e.message ?? e}\n`,
  );
  process.exit(1);
}

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
