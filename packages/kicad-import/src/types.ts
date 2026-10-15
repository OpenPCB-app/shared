/**
 * Public types for the KiCad import normalization layer.
 * Mirrors OpenPCB's library import contracts so the package can be a single
 * source of truth across OpenPCB, CoreLibrary admin, and Cloud.
 */
import type {
  FootprintPadDrillSlotMm,
  FootprintRenderModel,
  FootprintRenderSourcePad,
  SymbolRenderModel,
} from "@openpcb/rendering-core";

/**
 * Slotted drill footprint, from KiCad `(drill oval W H)`.
 *
 * @deprecated The declaration moved to `FootprintPadDrillSlotMm` in
 * `@openpcb/rendering-core`, next to the pad that carries it. Kept as an alias
 * so existing importers of this name keep compiling.
 */
export type FootprintPreviewDrillSlotMm = FootprintPadDrillSlotMm;

/**
 * Preview pad. Widens the render-core pad with the one fact KiCad carries that
 * a plain copper pad cannot express. `drillSlotMm` and `plated` are inherited
 * — they live on the render-core pad so DRC, export and rendering read one
 * declaration.
 */
export interface FootprintPreviewPad extends FootprintRenderSourcePad {
  /**
   * `"paste"` marks an unnumbered stencil-only sub-aperture — the paste
   * windows KiCad uses to segment a thermal/exposed pad. It has no copper and
   * no net, so it must never enter a pad count or a pin↔pad binding.
   */
  readonly role?: "paste";
}

/**
 * Producer stamp naming the coordinate frame a footprint preview is in.
 *
 * KiCad footprint files are Y-down (frame K); OpenPCB's canonical model is
 * Y-up (frame C). Every footprint preview built by this package has been
 * converted K→C exactly once (`kicadPointToCanonical` /
 * `kicadPadToCanonical`), and says so here. It is a CLAIM made by the
 * producer: a consumer that receives a model from an untrusted source must
 * verify the geometry, not trust the stamp.
 */
export interface FootprintFrameStamp {
  readonly frame: "openpcb-y-up";
  readonly origin: "kicad-converted";
  /** Bumped whenever the K→C conversion output changes for the same input. */
  readonly transformVersion: number;
  readonly tool: "@openpcb/kicad-import";
}

export interface FootprintPreviewModel extends FootprintRenderModel {
  readonly pads: readonly FootprintPreviewPad[];
  /**
   * Always present on models built by `@openpcb/kicad-import` ≥ 0.2.0. Every
   * coordinate of the model (pad centres, drill offsets, graphics, label
   * anchors, bounds) is in the canonical Y-up frame; angles are unchanged
   * from the KiCad source (KiCad's visually-CCW angles are math-CCW in Y-up).
   */
  readonly frame: FootprintFrameStamp;
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
