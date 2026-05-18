# @openpcb/opclib-pack

Pack and unpack `.opclib` archives — the on-disk format for OpenPCB component
libraries. ZIP envelope + canonical-JSON manifest + sha256 integrity digest.

## Why this package exists

The pack and unpack code used to live in two places — `CoreLibrary/tools/`
(pack) and `OpenPCB/src/modules/library/backend/sync/` (unpack) — with the
critical `canonicalize()` function duplicated, byte-identical by convention
only. If those two implementations drifted, every package built by the new
packager would be rejected by every importer. This package eliminates that
risk.

## Install

```jsonc
{
  "dependencies": {
    "@openpcb/opclib-pack": "github:OpenPCB-app/shared#opclib-pack-v0.1.0",
  },
}
```

## Usage

### Unpack (OpenPCB bootstrap, Cloud sync)

```ts
import {
  readOpclibFromPath,
  readAssetJson,
  type OpclibPackage,
} from "@openpcb/opclib-pack";

const pkg: OpclibPackage = await readOpclibFromPath("/path/to/lib.opclib");
// pkg.manifest        ← parsed + digest-verified manifest
// pkg.assets          ← Map<lowercase-path, Uint8Array>
// pkg.archiveSha256   ← integrity-checkable hash of the file bytes

for (const sym of pkg.manifest.symbols) {
  const json = readAssetJson(pkg, sym.path);
  // ...persist to DB / S3
}
```

### Pack (CoreLibrary tools)

```ts
import { packOpclib } from "@openpcb/opclib-pack";

const { bytes, packageSha256 } = packOpclib({
  library: { id: "openpcb.core", name: "OpenPCB Core Library", channel: "stable", version: "1.0.0", license: "...", generatedAt: new Date().toISOString() },
  symbols: [{ entry: { id, uuid, version, name, path, sha256, license }, bytes: assetBytes }],
  footprints: [...],
  models3d: [{ entry, assets: [{ format: "glb", path, bytes }, ...] }],
  components: [{ entry, path: "components/foo.component.json", bytes }],
});
// → bytes is a Uint8Array; write to `.opclib` file
```

### Canonical JSON

`canonicalize(obj)` is the deterministic JSON serializer used for the manifest
digest. Sorted keys, compact, no Unicode normalisation. Exported in case
downstream code needs to hash other structures the same way.

## Format

`.opclib` is a ZIP with:

- `library.json` — pretty-printed `OpclibManifest`. The manifest's
  `integrity.packageSha256` is the sha256 of the canonical-JSON form of the
  manifest with that field zeroed.
- All asset files referenced by `symbols[].path`, `footprints[].path`,
  `models3d[].formats[*].path`, and component files at the paths embedded in
  the manifest. Each entry's `sha256` is independently verified.

See `src/schemas/*.schema.json` for the formal contracts.

## Schema validation

```ts
import { validateManifest } from "@openpcb/opclib-pack";

const result = validateManifest(parsedJson);
if (!result.valid) {
  for (const err of result.errors) console.error(err.path, err.message);
}
```

## Status

`schemaVersion: "1.0.0"` — frozen. Future format changes will bump
`schemaVersion` and the unpacker will reject older versions.
