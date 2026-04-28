#!/bin/bash
# Native Linux aarch64 build (LYK-756 part 2). Runs on the Jetson Orin Nano
# (or any bare-metal arm64 Linux box wired up as a Jenkins agent over SSH)
# rather than in a docker container — until LYK-756 part 3 ships a
# glibc-2.35 sysroot, cross-compile from x86_64 produces binaries that
# fail to run on the embedded targets we actually care about.
#
# Mirrors the shape of jenkins/build-macos.sh: rsync'd source tree (no
# .git), GIT_SHA forwarded by the caller, debug skipped by default,
# release binary smoke-tested at the end.
#
# Prereqs on the host:
#   - bun (bootstraps the build orchestrator)
#   - clang-21 + lld-21 on PATH as `clang` / `clang++` / `ld`
#   - gcc-13 on PATH (zig translate-c needs a recent libc++ headers path)
#   - cmake >= 3.30
#   - ninja
#   - rust nightly (rust-toolchain.toml pin)
#   - node >= 22
# Setup notes for a fresh Jetson live in /raid/parabun-fixtures/jetson-setup.md.
#
# Fails fast on any error so Jenkins catches it at the right step.
set -euo pipefail

echo "=== Host ==="
uname -a
cat /etc/os-release | grep -E '^(NAME|VERSION)=' || true
echo "bun: $(bun --version 2>/dev/null || echo MISSING)"
echo "cmake: $(cmake --version 2>/dev/null | head -1 || echo MISSING)"
echo "ninja: $(ninja --version 2>/dev/null || echo MISSING)"
echo "clang: $(clang --version 2>/dev/null | head -1 || echo MISSING)"

# node-fallbacks maintains its own package.json. The build emits bundled
# fallbacks that ninja then reads — a stale install here breaks codegen.
echo "=== Refreshing node-fallbacks deps ==="
(cd src/node-fallbacks && bun install --ignore-scripts)

# We rsync without .git, so scripts/build/config.ts can't compute the
# revision — it falls back to "unknown", which depVersionsHeader.ts then
# filters out, leaving BUN_VERSION_UWS/USOCKETS undefined and BunProcess.cpp
# unable to compile. The Jenkins stage forwards GIT_SHA as an env var so we
# hand it to the build directly.
export GIT_SHA="${GIT_SHA:-$(git rev-parse HEAD 2>/dev/null || echo unknown)}"
echo "GIT_SHA=${GIT_SHA}"

echo "=== Cleaning stale PCH + codegen (incremental workspace may have stale artifacts) ==="
rm -rf build/debug/pch/*.pch build/release/pch/*.pch \
       build/debug/tmp_modules build/release/tmp_modules

# Skip the debug build in CI by default. The Jetson Orin Nano's USB-mounted
# 2 TB volume has plenty of room, but a single release build already takes
# ~30-60 min on this hardware; doubling that for debug isn't worth it for
# every commit. Set BUILD_DEBUG=1 if you want the full CI shape locally.
if [ "${BUILD_DEBUG:-0}" = "1" ]; then
    echo "=== Building Parabun (debug, no asan) ==="
    bun run build:debug:noasan

    echo "=== Smoke-test debug binary ==="
    ./build/debug/bun-debug --version
    ./build/debug/bun-debug -e 'console.log("hello from " + process.platform + "/" + process.arch)'

    echo "=== Cleaning debug build artifacts to free disk ==="
    rm -rf build/debug/cache build/debug/*.o build/debug/obj
fi

echo "=== Cleaning zig caches from previous builds ==="
# The zig incremental cache occasionally produces stale .o files on
# non-x86 hosts where some kernel/libc combination triggers a translate-c
# fingerprint mismatch. The next build picks up bad codegen and fails
# linking. Wipe it per-run; the rest of the cache (cmake, vendor builds)
# still survives.
rm -rf build/release/cache/zig build/debug/cache/zig

echo "=== Building Parabun (release) ==="
bun run build:release

echo "=== Smoke-test release binary ==="
./build/release/bun --revision
./build/release/bun -e 'console.log("hello from release/" + process.platform + "/" + process.arch)'

echo "=== Cleaning post-build caches (free disk for next run) ==="
rm -rf build/release/cache/zig build/release/obj

echo "=== Build artifacts ==="
ls -la build/release/bun
file build/release/bun || true
