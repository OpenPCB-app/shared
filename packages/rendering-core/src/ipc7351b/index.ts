export type { DensityLevel, SolderFilletAdditions } from "./ipc-dimensions.js";
export type {
  PackageFamily,
  PresetSize,
  PackageFamilyDef,
} from "./family-presets.js";
export { ALL_FAMILIES, getFamilyById } from "./family-presets.js";
export type {
  GeneratedFootprintResult,
  GeneratedFootprintMetadata,
} from "./generate-footprint.js";
export { generateFootprint } from "./generate-footprint.js";
