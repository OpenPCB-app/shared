/**
 * Public types for the KiCad import normalization layer.
 * Mirrors OpenPCB's library import contracts so the package can be a single
 * source of truth across OpenPCB, CoreLibrary admin, and Cloud.
 */
import type {
  FootprintRenderModel,
  FootprintRenderSourcePad,
  SymbolRenderModel,
} from "@openpcb/rendering-core";

/** Slotted drill footprint, from KiCad `(drill oval W H)`. */
export interface FootprintPreviewDrillSlotMm {
  readonly widthMm: number;
  readonly heightMm: number;
}

/**
 * Preview pad. Widens the render-core pad with the two facts KiCad carries
 * that a plain copper pad cannot express.
 */
export interface FootprintPreviewPad extends FootprintRenderSourcePad {
  /**
   * Present only for slotted (oval) drills. `drillDiameterMm` still carries
   * the narrow axis, so round-drill consumers degrade safely instead of
   * silently machining a too-small hole.
   */
  readonly drillSlotMm?: FootprintPreviewDrillSlotMm;
  /**
   * `"paste"` marks an unnumbered stencil-only sub-aperture — the paste
   * windows KiCad uses to segment a thermal/exposed pad. It has no copper and
   * no net, so it must never enter a pad count or a pin↔pad binding.
   */
  readonly role?: "paste";
}

export interface FootprintPreviewModel extends FootprintRenderModel {
  readonly pads: readonly FootprintPreviewPad[];
}

export interface ImportFileInput {
  fileName: string;
  content: string;
}

export interface ImportWarning {
  scope: "symbol" | "footprint";
  itemId: string;
  itemName: string;
  code: string;
  message: string;
}

export interface InspectSymbolItem {
  id: string;
  name: string;
  referencePrefix: string;
  pinCount: number;
  description: string | null;
  warningCount: number;
  preview: SymbolRenderModel;
}

export interface InspectFootprintItem {
  id: string;
  fileName: string;
  name: string;
  mountType: string;
  padCount: number;
  packageCode: {
    /** Canonical package code, e.g. "0805". Falls back to the footprint name. */
    code?: string;
    imperial: string | null;
    metric: string | null;
  };
  warningCount: number;
  preview: FootprintPreviewModel;
}

export type Model3DCandidateAssociation =
  | "valid"
  | "missing_target"
  | "orphan_asset"
  | "shared_body"
  | "unsupported_format"
  | "footprint-model-ref"
  | "symbol-name"
  | "archive-name"
  | "single-model";

export interface Model3DCandidate {
  fileName: string;
  extension: string;
  association: Model3DCandidateAssociation;
}

export interface ModelConversionMetadata {
  footprintId: string;
  sourceStepSha256: string;
  sourceStepUrl: string;
  sourceFilename: string;
  selectedModel: Model3DCandidate;
  modelRef: unknown | null;
  status: "pending_client_conversion";
}

export interface InspectPayload {
  symbols: InspectSymbolItem[];
  footprints: InspectFootprintItem[];
  model3dCandidates: Model3DCandidate[];
  warnings: ImportWarning[];
}

export interface InspectKicadRequest {
  symbolLibrary?: ImportFileInput | null;
  footprints: ImportFileInput[];
  model3dFiles?: Array<{ fileName: string }>;
}

export interface InspectKicadResponse extends InspectPayload {}

export interface CommitKicadRequest {
  symbolLibrary: ImportFileInput;
  footprints: ImportFileInput[];
  selection: {
    symbolId: string;
    footprintId?: string | null;
  };
  component: {
    name: string;
    description: string;
    tags?: string[];
  };
}

export interface CommitKicadResponse {
  componentId: string;
  componentName: string;
  reused: boolean;
}

export interface ArchiveImportWarning {
  code: string;
  message: string;
}

export interface CommitKicadZipResponse extends CommitKicadResponse {
  warnings: ArchiveImportWarning[];
  model3dCandidates: Model3DCandidate[];
  modelConversion: ModelConversionMetadata | null;
  selected: {
    symbolName: string;
    footprintName: string;
    modelFileName: string | null;
    confidence: "high" | "medium" | "low";
  };
}

/** Identity pin-map entry shape. Optional `category`, `license`,
 * `attribution` reserved for CoreLibrary's metadata superset. */
export interface LibraryPinMapEntry {
  pinNumber: string;
  padNumber: string;
  pinName: string | null;
}
