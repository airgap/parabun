#!/bin/bash
# Installs the latest Parabun VSIX into all available VS Code-compatible editors.
# Usage: ./editors/install-vsix.sh [path-to-vsix]
#
# If no path is given, builds a fresh VSIX from source.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VSIX_DIR="$SCRIPT_DIR/vscode/parabun"

if [ $# -ge 1 ]; then
    VSIX="$1"
else
    echo "=== Building VSIX ==="
    cd "$SCRIPT_DIR/../editors/ts-plugin" && npm run build --silent
    cd "$VSIX_DIR" && npm run build --silent
    VSIX="$VSIX_DIR/parabun.vsix"
    npx --yes @vscode/vsce@^3 package --out "$VSIX" 2>&1 | tail -1
fi

if [ ! -f "$VSIX" ]; then
    echo "error: VSIX not found at $VSIX" >&2
    exit 1
fi

INSTALLED=0

for CMD in code cursor kiro; do
    if command -v "$CMD" >/dev/null 2>&1; then
        echo "=== Installing into $CMD ==="
        "$CMD" --install-extension "$VSIX" --force 2>&1 && INSTALLED=$((INSTALLED + 1)) || echo "  failed"
    fi
done

if [ $INSTALLED -eq 0 ]; then
    echo "No editors found (looked for: code, cursor, kiro)"
    echo "Install manually: <editor> --install-extension $VSIX"
    exit 1
fi

echo "=== Installed into $INSTALLED editor(s) ==="
