# @openpcb/kicad-import

KiCad → normalized "OpenPCB JSON" import layer.

## Exports

- `parseImportBundle`, `buildInspectResponse` — main entry
- `buildSymbolPreviewFromParsed`, `buildFootprintPreviewFromParsed`
- `validateFootprintPads`, `validateSymbolPinsCoverFootprintPads`
- `classifyModel3DLinks` — orphan/missing/shared 3D model resolution
- `extractPackageCode`, `groupFootprints` — family heuristics
- `buildIdentityPinMapJson`
- `KicadImportValidationError` (aliased as `ImportValidationError`)
