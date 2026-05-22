/**
 * `.opclib` archive packer. Pure: takes a structured input describing the
 * library + asset bytes, emits a zipped Uint8Array containing the manifest
 * plus all referenced assets, with a verified manifest digest.
 *
 * The CLI wrapper (CoreLibrary's `tools/pack.ts`) handles argv parsing,
 * filesystem walking, and writing the output file. The pure path lives here.
 */
import { zipSync, type Zippable } from "fflate";
import type { KeyObject } from "node:crypto";
import { canonicalize } from "./canonicalize.js";
import { sha256Bytes } from "./hash.js";
import { signManifest } from "../sign.js";
import { assertValidManifest } from "../validate/validator.js";
import type {
  OpclibLibraryHeader,
  OpclibManifest,
  OpclibAssetEntry,
  OpclibFootprintEntry,
  OpclibModel3dEntry,
  OpclibComponentEntry,
} from "../types.js";

/** Each symbol/footprint/component carries its asset bytes alongside the
 * manifest entry. The packer is filesystem-agnostic — the CLI wrapper reads
 * files and constructs this input. */
export interface PackedAsset<TEntry> {
  entry: TEntry;
  bytes: Uint8Array;
}

/** A 3D model has multiple format files (glb, step) — each shipped under the
 * `formats[fmt].path` declared in the manifest entry. */
export interface PackedModel3d {
  entry: OpclibModel3dEntry;
  assets: Array<{ format: "glb" | "step"; path: string; bytes: Uint8Array }>;
}

/** A component contributes a JSON asset (the component definition file) plus
 * its manifest entry. The manifest entry stays JSON-only; the asset is the
 * on-disk `.component.json` blob. */
export interface PackedComponent {
  entry: OpclibComponentEntry;
  /** Path inside the archive (matches the convention used by OpenPCB's
   * importer — typically `components/<id>.component.json`). */
  path: string;
  bytes: Uint8Array;
}

export interface PackOpclibInput {
  library: OpclibLibraryHeader;
  symbols: Array<PackedAsset<OpclibAssetEntry>>;
  footprints: Array<PackedAsset<OpclibFootprintEntry>>;
  models3d: PackedModel3d[];
  components: PackedComponent[];
  /** Optional fields surfaced in the manifest verbatim. */
  templates?: unknown[];
  deprecated?: unknown[];
  /** Optional Ed25519 signing. When set, the manifest is signed after
   * `integrity.packageSha256` is computed but before zipping. */
  sign?: { privateKey: KeyObject | string | Buffer; keyId: string };
}

export interface PackOpclibResult {
  bytes: Uint8Array;
  manifest: OpclibManifest;
  packageSha256: string;
}

/** Pack a `.opclib` archive. Validates the manifest against the schema before
 * zipping; throws `OpclibValidationError` on failure. */
export function packOpclib(input: PackOpclibInput): PackOpclibResult {
  const symbolEntries = input.symbols.map((s) => s.entry);
  const footprintEntries = input.footprints.map((f) => f.entry);
  const modelEntries = input.models3d.map((m) => m.entry);
  const componentEntries = input.components.map((c) => c.entry);

  const manifest: OpclibManifest = {
    schemaVersion: "1.0.0",
    library: input.library,
    symbols: symbolEntries,
    footprints: footprintEntries,
    models3d: modelEntries,
    components: componentEntries,
    ...(input.templates !== undefined ? { templates: input.templates } : {}),
    ...(input.deprecated !== undefined ? { deprecated: input.deprecated } : {}),
    integrity: { algorithm: "sha256", packageSha256: "0".repeat(64) },
  };

  assertValidManifest(manifest);

  // Stable manifest digest: zero packageSha256, canonicalise, hash.
  manifest.integrity.packageSha256 = "0".repeat(64);
  const packageSha256 = sha256Bytes(
    new TextEncoder().encode(canonicalize(manifest)),
  );
  manifest.integrity.packageSha256 = packageSha256;

  if (input.sign) {
    manifest.signature = signManifest(
      manifest,
      input.sign.privateKey,
      input.sign.keyId,
    );
  }

  // Build zip payload: manifest + every referenced file.
  const payload: Zippable = {};
  for (const s of input.symbols) payload[s.entry.path] = s.bytes;
  for (const f of input.footprints) payload[f.entry.path] = f.bytes;
  for (const m of input.models3d) {
    for (const fmt of m.assets) payload[fmt.path] = fmt.bytes;
  }
  for (const c of input.components) payload[c.path] = c.bytes;

  // Manifest is pretty-printed on-disk for human readability. The digest is
  // computed against the canonical form above; the reader re-canonicalises.
  payload["library.json"] = new TextEncoder().encode(
    JSON.stringify(manifest, null, 2),
  );

  const bytes = zipSync(payload, { level: 6 });
  return { bytes, manifest, packageSha256 };
}
