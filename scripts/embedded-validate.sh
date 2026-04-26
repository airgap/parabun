#!/usr/bin/env bash
#
# Validates a fresh Pi 5 or Jetson Orin Nano for parabun development.
#
# Run on the device after a clean OS image boot:
#   curl -fsSL <url>/embedded-validate.sh | bash
# or, with the repo cloned:
#   ./scripts/embedded-validate.sh
#
# Non-destructive. Reads system state, optionally builds parabun if the
# repo is present and --build is passed. Exits 0 if nothing critical is
# missing for parabun development; exits non-zero with a clear failure
# list otherwise.

set -u

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
DO_BUILD=0
DO_SMOKE=0

for arg in "$@"; do
  case "$arg" in
    --build) DO_BUILD=1 ;;
    --smoke) DO_SMOKE=1 ;;
    --all)   DO_BUILD=1; DO_SMOKE=1 ;;
    -h|--help)
      cat <<EOF
Usage: embedded-validate.sh [--build] [--smoke] [--all]

  --build   Native-build parabun (release). Requires REPO_ROOT to be a parabun checkout.
  --smoke   Run a minimal parabun smoke test after build.
  --all     --build --smoke

Default (no flags): probe-only. Reports system, CPU, GPU, V4L2, ALSA state.
EOF
      exit 0 ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

PASS=0
WARN=0
FAIL=0

ok()   { printf "  \033[32mok\033[0m   %s\n" "$*"; PASS=$((PASS+1)); }
warn() { printf "  \033[33mwarn\033[0m %s\n" "$*"; WARN=$((WARN+1)); }
fail() { printf "  \033[31mfail\033[0m %s\n" "$*"; FAIL=$((FAIL+1)); }
info() { printf "       %s\n" "$*"; }
section() { printf "\n\033[1m==> %s\033[0m\n" "$*"; }

have() { command -v "$1" >/dev/null 2>&1; }

# ---------------------------------------------------------------------------
section "system"
KERNEL=$(uname -srm)
ARCH=$(uname -m)
info "kernel: $KERNEL"
if [[ "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]]; then
  ok "arch: $ARCH (aarch64)"
else
  fail "arch: $ARCH (expected aarch64; this script is for embedded ARM targets)"
fi

if [[ -f /etc/os-release ]]; then
  . /etc/os-release
  info "os: ${PRETTY_NAME:-unknown}"
fi

# Identify board
BOARD="unknown"
if [[ -f /proc/device-tree/model ]]; then
  MODEL=$(tr -d '\0' < /proc/device-tree/model)
  info "model: $MODEL"
  case "$MODEL" in
    *"Raspberry Pi 5"*) BOARD="pi5" ;;
    *"Jetson"*|*"Orin"*) BOARD="jetson" ;;
    *) BOARD="other-arm" ;;
  esac
fi
info "board: $BOARD"

# CPU
CORES=$(nproc 2>/dev/null || echo "?")
info "cores: $CORES"
MEM_KB=$(awk '/^MemTotal:/{print $2}' /proc/meminfo 2>/dev/null || echo 0)
MEM_GB=$((MEM_KB / 1024 / 1024))
info "memory: ${MEM_GB}GB"

# ---------------------------------------------------------------------------
section "cpu features"
if grep -qw asimd /proc/cpuinfo 2>/dev/null || grep -qw neon /proc/cpuinfo 2>/dev/null; then
  ok "neon/asimd present (parabun_image_codecs PB_HAVE_NEON path will compile)"
else
  fail "neon/asimd missing — image kernels will fall back to scalar"
fi
for f in fp aes sha2 crc32; do
  if grep -qw "$f" /proc/cpuinfo 2>/dev/null; then ok "$f"; else warn "$f missing"; fi
done

# ---------------------------------------------------------------------------
section "build tools"
for tool in cmake ninja git curl python3 cc c++; do
  if have "$tool"; then
    ok "$tool: $(command -v "$tool")"
  else
    fail "$tool not found (install with apt before --build)"
  fi
done
if have clang++; then
  info "clang++: $(clang++ --version | head -1)"
else
  warn "clang++ not found (parabun build prefers clang; gcc may work)"
fi

# Disk
DISK_FREE=$(df -BG / | awk 'NR==2{gsub("G",""); print $4}')
info "/ free: ${DISK_FREE}GB"
if (( DISK_FREE < 30 )); then
  warn "less than 30GB free; parabun build needs ~20GB cache + workdir"
fi

# ---------------------------------------------------------------------------
section "gpu / accelerator"
case "$BOARD" in
  jetson)
    if have nvidia-smi; then
      ok "nvidia-smi present"
      nvidia-smi --query-gpu=name,driver_version,compute_cap --format=csv,noheader 2>&1 | head -3 | sed 's/^/       /'
    else
      info "nvidia-smi not present (normal on Jetson; tegrastats is the equivalent)"
    fi
    if have tegrastats; then
      ok "tegrastats present"
    else
      warn "tegrastats not found — install nvidia-l4t-tools"
    fi
    if [[ -e /usr/local/cuda ]]; then
      CUDA_VER=$(cat /usr/local/cuda/version.txt 2>/dev/null || readlink /usr/local/cuda)
      ok "cuda: $CUDA_VER"
    else
      fail "no /usr/local/cuda — install JetPack CUDA runtime"
    fi
    if [[ -e /dev/nvgpu ]] || [[ -e /dev/nvhost-gpu ]]; then
      ok "gpu device node present"
    else
      warn "no /dev/nvgpu or /dev/nvhost-gpu — driver may not be loaded"
    fi
    ;;
  pi5)
    if [[ -e /dev/dri/renderD128 ]]; then
      ok "/dev/dri/renderD128 present (V3D GPU node)"
    else
      warn "no /dev/dri/renderD128 — V3D GPU not exposed"
    fi
    if have vcgencmd; then
      info "throttle state: $(vcgencmd get_throttled)"
      info "core temp:      $(vcgencmd measure_temp)"
    fi
    info "Pi 5 has no CUDA. Vulkan compute backend (planned Phase 3) will target V3D."
    ;;
  *)
    info "unknown board — skipping accelerator checks"
    ;;
esac

# ---------------------------------------------------------------------------
section "v4l2 (camera)"
if have v4l2-ctl; then
  ok "v4l2-ctl present"
  DEVS=$(v4l2-ctl --list-devices 2>/dev/null)
  if [[ -n "$DEVS" ]]; then
    echo "$DEVS" | sed 's/^/       /'
    # Try to find a /dev/video* and report formats
    FIRST_VIDEO=$(ls /dev/video* 2>/dev/null | head -1 || true)
    if [[ -n "$FIRST_VIDEO" ]]; then
      info "formats on $FIRST_VIDEO:"
      v4l2-ctl -d "$FIRST_VIDEO" --list-formats 2>/dev/null | sed 's/^/       /' | head -30
    fi
  else
    warn "no v4l2 devices enumerated (plug in C920?)"
  fi
else
  warn "v4l2-ctl not installed (apt install v4l-utils)"
fi

# ---------------------------------------------------------------------------
section "alsa (audio)"
if have arecord; then
  ok "arecord present"
  CARDS=$(arecord -l 2>&1)
  if echo "$CARDS" | grep -q "card "; then
    echo "$CARDS" | sed 's/^/       /' | head -20
  else
    warn "no capture devices (plug in headset?)"
  fi
else
  warn "arecord not installed (apt install alsa-utils)"
fi
if have aplay; then
  PLAY=$(aplay -l 2>&1)
  if echo "$PLAY" | grep -q "card "; then
    echo "$PLAY" | sed 's/^/       /' | head -20
  fi
fi

# ---------------------------------------------------------------------------
section "parabun repo"
if [[ -f "$REPO_ROOT/scripts/build.ts" && -f "$REPO_ROOT/CLAUDE.md" ]]; then
  ok "REPO_ROOT looks like parabun: $REPO_ROOT"
  if [[ -d "$REPO_ROOT/.git" ]]; then
    BRANCH=$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")
    HEAD=$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo "?")
    info "branch: $BRANCH @ $HEAD"
  fi
else
  warn "REPO_ROOT not a parabun checkout: $REPO_ROOT"
  if (( DO_BUILD )); then fail "--build requested but no repo present"; fi
fi

# ---------------------------------------------------------------------------
if (( DO_BUILD )); then
  section "native build (release)"
  info "this will run for 20-60 minutes on first build"
  if ! have bun; then
    fail "bun not in PATH — install upstream bun first to bootstrap parabun: curl -fsSL https://bun.sh/install | bash"
  else
    info "bootstrap bun: $(bun --version)"
    pushd "$REPO_ROOT" >/dev/null || { fail "cd $REPO_ROOT"; }
    if bun run build:release; then
      ok "release build succeeded"
      if [[ -x "$REPO_ROOT/build/release/bun" ]]; then
        VERSION=$("$REPO_ROOT/build/release/bun" --version 2>&1 || echo "?")
        ok "build/release/bun --version: $VERSION"
      else
        fail "no build/release/bun binary after build"
      fi
    else
      fail "release build failed — see logs above"
    fi
    popd >/dev/null
  fi
fi

# ---------------------------------------------------------------------------
if (( DO_SMOKE )); then
  section "smoke test"
  BUN_BIN="$REPO_ROOT/build/release/bun"
  if [[ ! -x "$BUN_BIN" ]]; then BUN_BIN="$REPO_ROOT/build/debug/bun-debug"; fi
  if [[ -x "$BUN_BIN" ]]; then
    ok "binary: $BUN_BIN"
    if "$BUN_BIN" -e 'console.log("hello from", process.platform, process.arch, Bun.version)' 2>&1; then
      ok "hello-world ran"
    else
      fail "hello-world threw"
    fi
    # Pure-fn smoke (parabun extension)
    if "$BUN_BIN" -e 'const f = pure(x => x*2); console.log(f(21))' 2>&1 | grep -q "^42$"; then
      ok "pure() smoke passed"
    else
      warn "pure() smoke did not produce 42 (may be ok if extension surface changed)"
    fi
  else
    fail "no parabun binary to smoke-test"
  fi
fi

# ---------------------------------------------------------------------------
section "summary"
printf "  pass: %d   warn: %d   fail: %d\n" "$PASS" "$WARN" "$FAIL"
if (( FAIL > 0 )); then
  printf "\n\033[31mfailed.\033[0m fix the items above before relying on this device.\n"
  exit 1
elif (( WARN > 0 )); then
  printf "\n\033[33mok with warnings.\033[0m review them but device is usable.\n"
  exit 0
else
  printf "\n\033[32mall checks passed.\033[0m\n"
  exit 0
fi
