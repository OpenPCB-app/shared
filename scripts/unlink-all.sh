#!/usr/bin/env bash
# Remove each shared package's global npm link registration. Use after a dev
# session if you want a clean global state. Consumers also need to run their
# own `shared:unlink` to restore github-tag installs.
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

for pkg in "${PACKAGES[@]}"; do
  echo "==> npm unlink @openpcb/$pkg (global)"
  (cd "$SHARED_ROOT/packages/$pkg" && npm unlink -g "@openpcb/$pkg" || true)
done

echo ""
echo "✔ Global npm link registrations cleared."
