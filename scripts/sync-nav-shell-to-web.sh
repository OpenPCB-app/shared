#!/usr/bin/env bash
#
# Rebuild the @openpcb/nav-shell standalone bundle and copy it into the web/
# landing repo as opcb-nav.js — the single committed artifact the static site
# loads. Run this whenever the nav-shell source changes (and on release), then
# commit the updated web/opcb-nav.js. This is the "single source → two consumers"
# sync: the cloud app consumes the npm ESM build; the landing consumes this file.
#
#   shared/scripts/sync-nav-shell-to-web.sh [WEB_DIR]
#
# WEB_DIR defaults to ../web relative to the shared repo root (the sibling
# checkout layout). Override with an absolute path or the WEB_DIR env var.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHARED_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PKG="$SHARED_ROOT/packages/nav-shell"
WEB_DIR="${1:-${WEB_DIR:-$SHARED_ROOT/../web}}"

echo "==> Building @openpcb/nav-shell (tsc + bun bundle)…"
(cd "$PKG" && npm run build:all)

SRC="$PKG/dist/standalone/opcb-nav.js"
[ -f "$SRC" ] || { echo "✖ missing $SRC — build failed"; exit 1; }
[ -d "$WEB_DIR" ] || { echo "✖ web dir not found: $WEB_DIR (pass it as arg 1 or WEB_DIR=…)"; exit 1; }

DEST="$WEB_DIR/opcb-nav.js"
if [ -f "$DEST" ] && cmp -s "$SRC" "$DEST"; then
  echo "✓ $DEST already in sync (no change)."
else
  cp "$SRC" "$DEST"
  echo "✓ synced → $DEST"
fi

echo "   sha256: $(shasum -a 256 "$DEST" | cut -d' ' -f1)"
echo "   bytes:  $(wc -c < "$DEST")"
echo ""
echo "Next: commit web/opcb-nav.js in the web repo and push to master (FTP deploy)."
