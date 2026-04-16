#!/bin/bash
# Runs inside the parabun Linux CI container (jenkins/Dockerfile.ci-linux)
# during the `Build Linux` stage. Produces build/debug/bun-debug AND
# build/release/bun — the release binary is what Jenkins publishes as a
# GitHub Release asset for Linux x64.
#
# Mirrors jenkins/build-macos.sh. Fails fast on any error so Jenkins
# catches it at the right step.
set -euo pipefail

echo "=== Host ==="
uname -a
echo "bun: $(bun --version)"
echo "cmake: $(cmake --version | head -1)"
echo "ninja: $(ninja --version)"
echo "clang: $(clang --version | head -1)"

# node-fallbacks maintains its own package.json. The build emits bundled
# fallbacks that ninja then reads — a stale install here breaks codegen.
echo "=== Refreshing node-fallbacks deps ==="
(cd src/node-fallbacks && bun install --ignore-scripts)

# scripts/build/config.ts::getGitRevision() needs .git to compute the
# revision. Jenkins checkout gives us a full .git, so this is typically a
# no-op, but we forward GIT_SHA anyway for consistency with build-macos.sh
# and build-windows.ps1 (those run over rsync/sparse-checkout with no .git).
export GIT_SHA="${GIT_SHA:-$(git rev-parse HEAD 2>/dev/null || echo unknown)}"
echo "GIT_SHA=${GIT_SHA}"

# Skip the debug build in CI: we only publish the release binary, and the
# Jenkins host's / partition (~500GB shared with lyku workspaces + docker)
# can't hold both build/debug (~9GB) and build/release (~25GB peak during
# zig ReleaseFast) simultaneously. Set BUILD_DEBUG=1 locally if you want
# to reproduce the full CI shape.
if [ "${BUILD_DEBUG:-0}" = "1" ]; then
    echo "=== Building Parabun (debug, no asan) ==="
    bun run build:debug:noasan

    echo "=== Smoke-test debug binary ==="
    ./build/debug/bun-debug --version
    ./build/debug/bun-debug -e 'console.log("hello from " + process.platform + "/" + process.arch)'
fi

echo "=== Cleaning stale PCH (container header mtimes may differ between runs) ==="
rm -f build/release/pch/*.pch build/debug/pch/*.pch

echo "=== Building Parabun (release) ==="
bun run build:release

echo "=== Smoke-test release binary ==="
./build/release/bun --revision
./build/release/bun -e 'console.log("hello from release/" + process.platform + "/" + process.arch)'

echo "=== Build artifacts ==="
ls -la build/release/bun
