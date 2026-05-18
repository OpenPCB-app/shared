/**
 * `.opclib` archive unpacker: ZIP extract → manifest parse → digest verify →
 * asset SHA256 verify. Pure (no DB, no filesystem write).
 *
 * Used by OpenPCB's library bootstrap (`sync/bootstrap.ts`) and (future)
 * Cloud's sync ingest.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { canonicalize } from "../pack/canonicalize.js";
import { OpclibFormatError } from "../errors.js";
import type { OpclibManifest, OpclibPackage } from "../types.js";
import { extractZipEntries } from "./zip-extractor.js";

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Read an `.opclib` from disk and unpack. Node-only. */
export async function readOpclibFromPath(
  absolutePath: string,
): Promise<OpclibPackage> {
  const bytes = await readFile(absolutePath);
  return unpackOpclib(new Uint8Array(bytes));
}

/** Unpack `.opclib` bytes → verified manifest + asset map. Browser-safe. */
export function unpackOpclib(bytes: Uint8Array): OpclibPackage {
  const archiveSha256 = sha256Hex(bytes);
  const entries = extractZipEntries(bytes);
  const assets = new Map<string, Uint8Array>();
  let manifestEntry: { bytes: Uint8Array } | null = null;
  for (const entry of entries) {
    const key = entry.path.toLowerCase();
    assets.set(key, entry.bytes);
    if (key === "library.json") manifestEntry = entry;
  }
  if (!manifestEntry) {
    throw new OpclibFormatError("library.json not found in package");
  }

  let manifest: OpclibManifest;
  try {
    manifest = JSON.parse(
      new TextDecoder().decode(manifestEntry.bytes),
    ) as OpclibManifest;
  } catch (error) {
    throw new OpclibFormatError(
      `library.json is not valid JSON: ${(error as Error).message}`,
    );
  }

  if (manifest.schemaVersion !== "1.0.0") {
    throw new OpclibFormatError(
      `unsupported schemaVersion: ${manifest.schemaVersion}`,
    );
  }

  // Validate manifest digest. The packager zeroes packageSha256, serialises
  // via `canonicalize` (sorted-key compact JSON), and hashes. Reverse here.
  const declared = manifest.integrity?.packageSha256 ?? "";
  if (!/^[a-f0-9]{64}$/.test(declared)) {
    throw new OpclibFormatError(`integrity.packageSha256 missing or malformed`);
  }
  const manifestForHash: OpclibManifest = {
    ...manifest,
    integrity: { algorithm: "sha256", packageSha256: "0".repeat(64) },
  };
  const recomputed = sha256Hex(
    new TextEncoder().encode(canonicalize(manifestForHash)),
  );
  if (recomputed !== declared) {
    throw new OpclibFormatError(
      `manifest digest mismatch: declared=${declared} recomputed=${recomputed}`,
    );
  }

  // Verify each referenced asset's sha256.
  const verify = (path: string, expected: string, kind: string) => {
    const data = assets.get(path.toLowerCase());
    if (!data) {
      throw new OpclibFormatError(`${kind} asset missing: ${path}`);
    }
    const actual = sha256Hex(data);
    if (actual !== expected) {
      throw new OpclibFormatError(
        `${kind} ${path} sha256 mismatch: expected ${expected} got ${actual}`,
      );
    }
  };
  for (const e of manifest.symbols) verify(e.path, e.sha256, "symbol");
  for (const e of manifest.footprints) verify(e.path, e.sha256, "footprint");
  for (const m of manifest.models3d) {
    for (const [fmt, info] of Object.entries(m.formats)) {
      if (info) verify(info.path, info.sha256, `model3d:${fmt}`);
    }
  }

  return { manifest, assets, archiveSha256 };
}

/** Backwards-compat alias matching OpenPCB's legacy export. */
export const readOpclibFromBytes = unpackOpclib;
