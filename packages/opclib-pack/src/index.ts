/**
 * Public surface of `@openpcb/opclib-pack`.
 *
 * `.opclib` is the on-disk format for OpenPCB component libraries. It's a
 * zipped manifest (`library.json`) plus referenced symbol/footprint/3D-model/
 * component asset files, with a deterministic sha256 digest for integrity.
 *
 * Pack path (CoreLibrary tools): walk filesystem → build PackOpclibInput →
 *   `packOpclib(input)` → Uint8Array → write to disk.
 *
 * Unpack path (OpenPCB bootstrap, Cloud sync): read bytes →
 *   `unpackOpclib(bytes)` → OpclibPackage → iterate `manifest.{symbols,
 *   footprints, components, models3d}` → upsert to DB / store.
 */

// Types
export type {
  OpclibManifest,
  LibraryManifest,
  OpclibLibraryHeader,
  OpclibAssetEntry,
  OpclibFootprintEntry,
  OpclibModel3dEntry,
  OpclibComponentEntry,
  AssetEntry,
  FootprintEntry,
  Model3dEntry,
  ComponentEntry,
  OpclibPackage,
  ImportCounts,
  ImportResult,
  InstallOrigin,
} from "./types.js";

// Errors
export { OpclibFormatError, OpclibValidationError } from "./errors.js";

// Pack
export {
  packOpclib,
  type PackOpclibInput,
  type PackOpclibResult,
  type PackedAsset,
  type PackedModel3d,
  type PackedComponent,
} from "./pack/packer.js";
export { canonicalize } from "./pack/canonicalize.js";
export { sha256Bytes, sha256File } from "./pack/hash.js";

// Unpack
export {
  unpackOpclib,
  readOpclibFromPath,
  readOpclibFromBytes,
} from "./unpack/reader.js";
export {
  extractZipEntries,
  decodeTextEntry,
  ZIP_LIMITS,
  type ZipEntryContent,
} from "./unpack/zip-extractor.js";
export { readAssetJson, readAssetBytes } from "./unpack/asset-accessor.js";

// Validate
export {
  validateManifest,
  assertValidManifest,
  makeAjv,
  loadSchema,
  type OpclibValidationResult,
} from "./validate/validator.js";
export { ID_REGEX, UUID_REGEX, SEMVER_REGEX } from "./validate/constants.js";
