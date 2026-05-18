#!/usr/bin/env bash
# Copy bundled JSON schemas into dist/ alongside compiled JS so the validator
# (which resolves them via `import.meta.url`) finds them at consumer install
# time.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

mkdir -p "$PKG_ROOT/dist/schemas"
cp "$PKG_ROOT/src/schemas/"*.schema.json "$PKG_ROOT/dist/schemas/"
echo "✓ copied schemas → dist/schemas/"
