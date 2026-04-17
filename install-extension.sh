#!/bin/bash
# curl -fsSL https://raw.githubusercontent.com/airgap/parabun/main/install-extension.sh | bash
#
# Downloads the latest parabun.vsix from GitHub Releases and installs it
# into every VS Code-compatible editor found on the system.
set -euo pipefail

REPO="airgap/parabun"
ASSET="parabun.vsix"
TMP="$(mktemp -d)"
VSIX="$TMP/$ASSET"

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

echo "Downloading latest $ASSET..."
curl -fsSL -o "$VSIX" \
  "https://github.com/$REPO/releases/latest/download/$ASSET"

INSTALLED=0

for CMD in code cursor kiro; do
  if command -v "$CMD" >/dev/null 2>&1; then
    echo "Installing into $CMD..."
    "$CMD" --install-extension "$VSIX" --force 2>&1 && INSTALLED=$((INSTALLED + 1)) || echo "  $CMD failed"
  fi
done

if [ $INSTALLED -eq 0 ]; then
  echo "No editors found (looked for: code, cursor, kiro)."
  echo "Install manually: <editor> --install-extension $VSIX"
  exit 1
fi

echo "Installed Parabun extension into $INSTALLED editor(s)."
