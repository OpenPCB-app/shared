/**
 * `.opclib` package format — shared between the packer (CoreLibrary tools) and
 * the unpacker (OpenPCB library bootstrap, Cloud sync). Mirrors the JSON Schemas
 * under `./schemas/*.schema.json`.
 *
 * Both `LibraryManifest` and `OpclibManifest` refer to the same shape; the
 * latter is the alias OpenPCB has historically used.
 */

export interface OpclibLibraryHeader {
  id: string;
  name: string;
  kind?: "core" | "user" | "team";
  channel: "stable" | "beta" | "nightly";
  version: string;
  license: string;
  homepage?: string;
  minOpenPcbVersion?: string;
  generatedAt: string;
}

export interface OpclibAssetEntry {
  id: string;
  uuid: string;
  version: string;
  name: string;
  path: string;
  sha256: string;
  license?: string;
}

export interface OpclibFootprintEntry extends OpclibAssetEntry {
  package?: { code?: string; mountType?: string; standard?: string };
  models3d?: string[];
}

/**
 * Per-model author-time corrections, applied at render time in model space
 * before the per-instance placement transform. Optional — when absent the
 * model is rendered as authored (identity transform).
 *
 * Coordinate convention follows the rest of the package: millimetres for
 * `offsetMm`, degrees for `rotationDeg` (Euler XYZ), dimensionless scalars
 * for `scaleMm`. A `scaleMm` component of `-1` mirrors that axis; this is
 * how we correct KiCad PinHeader STEPs whose pin-row direction is flipped
 * versus the corresponding footprint.
 */
export interface Model3dTransform {
  offsetMm?: { x: number; y: number; z: number };
  rotationDeg?: { x: number; y: number; z: number };
  scaleMm?: { x: number; y: number; z: number };
  transformBaked?: boolean;
}

export interface OpclibModel3dEntry extends Model3dTransform {
  id: string;
  uuid: string;
  version: string;
  name: string;
  formats: Partial<Record<"glb" | "step", { path: string; sha256: string }>>;
  boundsMm?: { x: number; y: number; z: number };
}

export interface OpclibComponentEntry {
  id: string;
  uuid: string;
  version: string;
  name: string;
  description?: string;
  category: string;
  tags?: string[];
  aliases?: string[];
  symbol: string;
  defaultFootprint: string;
  footprints: Array<{
    footprint: string;
    label: string;
    pinMap?: Array<{ pinNumber: string; padNumber: string; pinName?: string }>;
  }>;
  parameters?: Record<string, unknown>;
  manufacturerParts?: Array<{ manufacturer: string; mpn: string }>;
  provenance: {
    source: string;
    license: string;
    attribution?: string[];
    notes?: string;
  };
  compatibility?: { minOpenPcbVersion?: string };
}

export interface OpclibManifest {
  schemaVersion: "1.0.0";
  library: OpclibLibraryHeader;
  symbols: OpclibAssetEntry[];
  footprints: OpclibFootprintEntry[];
  models3d: OpclibModel3dEntry[];
  components: OpclibComponentEntry[];
  templates?: unknown[];
  deprecated?: unknown[];
  integrity: { algorithm: "sha256"; packageSha256: string };
  signature?: { algorithm: "ed25519"; keyId: string; signature: string };
}

/** Legacy alias used by CoreLibrary's tools. */
export type LibraryManifest = OpclibManifest;
export type AssetEntry = OpclibAssetEntry;
export type FootprintEntry = OpclibFootprintEntry;
export type Model3dEntry = OpclibModel3dEntry;
export type ComponentEntry = OpclibComponentEntry;

/** Inflated `.opclib` package — manifest plus byte payloads keyed by lowercased path. */
export interface OpclibPackage {
  manifest: OpclibManifest;
  /** Map of zip path → raw bytes. Lower-case keys. */
  assets: Map<string, Uint8Array>;
  /** Sha-256 of the original archive bytes (what users download). */
  archiveSha256: string;
}

export interface ImportCounts {
  symbols: number;
  footprints: number;
  components: number;
  variants: number;
}

export interface ImportResult {
  sourceId: string;
  version: string;
  installOrigin: InstallOrigin;
  inserted: ImportCounts;
  updated: ImportCounts;
  models: { written: number; deduped: number };
  reimport: boolean;
}

export type InstallOrigin = "bundled" | "sync" | "manual-import";
