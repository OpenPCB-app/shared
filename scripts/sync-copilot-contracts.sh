#!/usr/bin/env bash
# Vendors cloud-copilot's committed contract schemas into
# packages/contracts/schemas/copilot (byte-identical copies) and stamps the
# provenance sha into that dir's README.md.
#
#   ./scripts/sync-copilot-contracts.sh          # from shared/ root
#   COPILOT_DIR=/path/to/cloud-copilot ./scripts/sync-copilot-contracts.sh
#
# Then regenerate + verify:
#   npm run gen --workspace packages/contracts
#   npm run build && npm test
#
# Drift guards: `gen:check` (shared CI, byte-diff); cloud-copilot's
# tests/contracts/test_schema_sync.py (set + byte equality vs this dir,
# skip-if-absent) catches a stale vendor locally.
set -euo pipefail
SHARED_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${COPILOT_DIR:-$SHARED_ROOT/../cloud-workspace/cloud-copilot}"
DEST="$SHARED_ROOT/packages/contracts/schemas/copilot"
# Keep in step with cloud-copilot tests/contracts/test_schema_sync.py _EXCLUDED:
# CopilotStreamFrame keeps its hand union + fixture test until R5 (D10);
# ProblemDetails collides with the errors-module export (same RFC-7807 concept,
# open index signature covers the tool-plane extensions);
# IngestEvent is an internal worker queue event, not a desktop wire contract.
EXCLUDE=("CopilotStreamFrame" "IngestEvent" "ProblemDetails")

[ -d "$SRC/contracts" ] || { echo "cloud-copilot checkout not found at $SRC (set COPILOT_DIR)"; exit 1; }
mkdir -p "$DEST"
# delete-then-copy so model REMOVALS propagate too
find "$DEST" -name '*.schema.json' -delete
for f in "$SRC"/contracts/*.schema.json; do
  name="$(basename "$f" .schema.json)"
  for ex in "${EXCLUDE[@]}"; do [ "$name" = "$ex" ] && continue 2; done
  cp "$f" "$DEST/"
done
SHA="$(git -C "$SRC" rev-parse --short HEAD)"
perl -pi -e "s/^- Vendored at commit: .*/- Vendored at commit: \`$SHA\`/" "$DEST/README.md" 2>/dev/null || true
echo "vendored $(ls "$DEST"/*.schema.json | wc -l | tr -d ' ') schemas at $SHA"
echo "next: npm run gen --workspace packages/contracts && npm run build && npm test"
