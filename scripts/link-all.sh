#!/usr/bin/env bash
# Register every shared package with `npm link` so consumers can symlink them
# into their own node_modules. Run this once after cloning, then run
# `npm link @openpcb/<pkg>` (or the consumer's `shared:link` script) from each
# consumer directory.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHARED_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PACKAGES=(
  kicad-parsers
  rendering-core
  kicad-import
  step-to-glb
  r3f-eda-canvas
  opclib-pack
)

# Ensure dist/ exists for every package before linking; consumers resolve
# `main: ./dist/index.js` and will fail import if dist/ is empty.
echo "==> Building all packages (one-shot tsc per package)…"
(cd "$SHARED_ROOT" && npm run build)

for pkg in "${PACKAGES[@]}"; do
  echo "==> npm link @openpcb/$pkg"
  (cd "$SHARED_ROOT/packages/$pkg" && npm link)
done

echo ""
echo "✔ All 5 @openpcb/* packages registered with npm link."
echo ""
echo "Next: from each consumer, run \`npm run shared:link\` (or manually"
echo "      \`npm link @openpcb/<pkg>\` for each package you want to dev locally)."
echo ""
echo "Run \`npm run dev\` in this directory to keep dist/ rebuilt on source edits."
