/**
 * Public surface of `@openpcb/kicad-import`.
 *
 * Normalizes KiCad symbol/footprint files into a stable "OpenPCB JSON" shape
 * with preview render models, 3D model classification, family heuristics, and
 * import validation.
 *
 * Pure logic — no DB, no HTTP, no filesystem. Browser/Node/Bun safe.
 */
export * from "./types.js";
export { KicadImportValidationError } from "./errors.js";
export { KicadImportValidationError as ImportValidationError } from "./errors.js";
export {
  parseImportBundle,
  buildInspectResponse,
  type NormalizedImportedSymbol,
  type NormalizedImportedFootprint,
  type ParsedImportBundle,
} from "./inspect.js";
export {
  buildSymbolPreviewFromParsed,
  buildFootprintPreviewFromParsed,
} from "./build-preview-models.js";
export {
  validateFootprintPads,
  validateSymbolPinsCoverFootprintPads,
  type FootprintWithPads,
  type SymbolPinsLike,
  type PadValidationOptions,
} from "./validate-pads.js";
export { buildIdentityPinMapJson } from "./pinmap.js";
export {
  classifyModel3DLinks,
  type Model3DLinkStatus,
  type Model3DClassification,
} from "./model-linker.js";
export {
  extractPackageCode,
  groupFootprints,
  extractGroupKey,
  isHandSolderVariant,
  isManufacturerSpecific,
  isPolarized,
  type FootprintFileInfo,
  type GroupingSuggestion,
} from "./heuristics.js";
