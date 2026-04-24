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

# We rsync without .git, so scripts/build/config.ts can't compute the
# revision — it falls back to "unknown", which depVersionsHeader.ts then
# filters out, leaving BUN_VERSION_UWS/USOCKETS undefined and BunProcess.cpp
# unable to compile. The caller (Jenkinsfile or direct ssh) passes GIT_SHA
# as an env var so we can hand it to the build.
export GIT_SHA="${GIT_SHA:-unknown}"
echo "GIT_SHA=${GIT_SHA}"

# Skip the debug build in CI by default: the mac-mini has limited disk
# (~250 GB) and the debug + release builds together can exhaust it.
# Set BUILD_DEBUG=1 if you want to reproduce the full CI shape locally.
if [ "${BUILD_DEBUG:-0}" = "1" ]; then
    echo "=== Building Parabun (debug, no asan) ==="
    bun run build:debug:noasan

    echo "=== Codesigning debug binary with JIT + debugger entitlements ==="
    codesign --force --timestamp --sign - --entitlements entitlements.debug.plist ./build/debug/bun-debug

    echo "=== Smoke-test debug binary ==="
    ./build/debug/bun-debug --version
    ./build/debug/bun-debug -e 'console.log("hello from " + process.platform + "/" + process.arch)'

    # Free disk before release build
    echo "=== Cleaning debug build artifacts to free disk ==="
    rm -rf build/debug/cache build/debug/*.o build/debug/obj
fi

echo "=== Cleaning zig caches from previous builds ==="
rm -rf build/release/cache/zig build/debug/cache/zig

echo "=== Building Parabun (release) ==="
bun run build:release

# Ad-hoc codesign with the JIT entitlements. Required on Apple Silicon:
# JavaScriptCore allocates executable pages via MAP_JIT, and an unsigned
# binary without com.apple.security.cs.allow-jit is SIGKILL'd on first JIT
# call. The `--sign -` form uses an ad-hoc identity (no Developer ID
# needed) — Gatekeeper still won't trust it on download without further
# steps, but users can `xattr -d com.apple.quarantine` to clear that. For
# full notarization, a Developer ID identity + notarytool submission is
# needed; we're not there yet.
echo "=== Codesigning release binary with JIT entitlements ==="
codesign --force --timestamp --sign - --entitlements entitlements.plist ./build/release/bun
codesign --verify --deep --strict --verbose=2 ./build/release/bun

echo "=== Smoke-test release binary ==="
./build/release/bun --revision
./build/release/bun -e 'console.log("hello from release/" + process.platform + "/" + process.arch)'

echo "=== Cleaning post-build caches (free disk for next run) ==="
rm -rf build/release/cache/zig build/release/obj

echo "=== Build artifacts ==="
ls -la build/release/bun
