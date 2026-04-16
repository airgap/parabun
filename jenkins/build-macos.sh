#!/bin/bash
# Runs on the macOS agent. Mirrors the steps a dev does locally:
# reinstall node-fallbacks deps (they vendor a package.json per module),
# then produce build/debug/bun-debug AND build/release/bun — the release
# binary is what Jenkins publishes as a GitHub Release asset for macOS.
#
# Fails fast on any error so Jenkins catches it at the right step.
set -euo pipefail

# Homebrew paths on Apple Silicon are not in the non-interactive ssh PATH
# by default. Source them explicitly so cmake/ninja/bun resolve.
# llvm@21 is keg-only — Parabun's build rejects any clang outside [21.1, 21.1.99),
# so we front-load its bin dir. The `:-` guard keeps the script valid under `set -u`.
export PATH="/opt/homebrew/opt/llvm@21/bin:/opt/homebrew/bin:/usr/local/bin:${PATH:-}"

echo "=== Host ==="
uname -a
sw_vers | head -3
echo "bun: $(bun --version)"
echo "cmake: $(cmake --version | head -1)"
echo "ninja: $(ninja --version)"

# node-fallbacks maintains its own package.json. The build emits bundled
# fallbacks that ninja then reads — a stale install here is what produced
# the ENOENT the last Mac build hit.
echo "=== Refreshing node-fallbacks deps ==="
(cd src/node-fallbacks && bun install --ignore-scripts)

echo "=== Cleaning stale PCH + codegen (incremental workspace may have stale artifacts) ==="
rm -rf build/debug/pch/*.pch build/release/pch/*.pch build/debug/tmp_modules build/release/tmp_modules

echo "=== Building Parabun (debug, no asan) ==="
# We rsync without .git, so scripts/build/config.ts can't compute the
# revision — it falls back to "unknown", which depVersionsHeader.ts then
# filters out, leaving BUN_VERSION_UWS/USOCKETS undefined and BunProcess.cpp
# unable to compile. The caller (Jenkinsfile or direct ssh) passes GIT_SHA
# as an env var so we can hand it to the build.
export GIT_SHA="${GIT_SHA:-unknown}"
echo "GIT_SHA=${GIT_SHA}"
# ASAN's dyld-shim is Linux-only (uses __dyld_get_dyld_header which macOS
# doesn't expose). Use the noasan debug profile — it's also what we need
# anyway since asan interferes with Metal/CUDA signal handlers.
bun run build:debug:noasan

echo "=== Smoke-test debug binary ==="
./build/debug/bun-debug --version
./build/debug/bun-debug -e 'console.log("hello from " + process.platform + "/" + process.arch)'

# Release build — what gets published. Separate build/release/ tree so
# debug and release don't clobber each other across runs.
echo "=== Building Parabun (release) ==="
bun run build:release

echo "=== Smoke-test release binary ==="
./build/release/bun --revision
./build/release/bun -e 'console.log("hello from release/" + process.platform + "/" + process.arch)'

echo "=== Build artifacts ==="
ls -la build/debug/bun-debug build/release/bun
