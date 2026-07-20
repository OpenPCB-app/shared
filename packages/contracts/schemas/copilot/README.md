# Vendored cloud-copilot tool-plane schemas

Byte-identical copies of `cloud-copilot/contracts/*.schema.json` (Python-canonical,
emitted by `uv run python -m scripts.emit_contracts` from the Pydantic models).

Excluded from vendoring: `CopilotStreamFrame` (hand union + fixture drift test in
`tests/copilot-stream-frame.test.ts` until R5/D10), `IngestEvent` (internal
worker queue event, not a desktop wire contract), and `ProblemDetails` (the
package's errors module already exports the RFC-7807 shape with an open index
signature that covers the tool-plane extension members).

`inputSchemaRef`/`outputSchemaRef` values inside `ToolManifest` entries are plain
model names (e.g. `"ComponentSearchRequest"`) resolved against THIS directory as
`<name>.schema.json` — the R4 desktop remote-tool adapter generator relies on it.

- Source repo: OpenPCB-app/cloud-copilot (locally: `../cloud-workspace/cloud-copilot`)
- Vendored at commit: `42a5365`

## Sync

    ./scripts/sync-copilot-contracts.sh        # from shared/ root

then regenerate + verify:

    npm run gen --workspace packages/contracts
    npm run build && npm test

Drift guards: `gen:check` (shared CI, byte-diff of `tools.generated.ts`) here;
`tests/contracts/` (cloud-copilot CI, emit-vs-committed) there;
`cloud-copilot/tests/contracts/test_schema_sync.py` (set + byte equality vs this
dir, skip-if-absent) catches a stale vendor locally.
