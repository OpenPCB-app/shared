import { OpclibFormatError } from "../errors.js";
import type { OpclibPackage } from "../types.js";

/** Read a JSON asset by zip path (case-insensitive). */
export function readAssetJson<T>(pkg: OpclibPackage, path: string): T {
  const bytes = pkg.assets.get(path.toLowerCase());
  if (!bytes) {
    throw new OpclibFormatError(`asset not found in package: ${path}`);
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

/** Read a binary asset by zip path (case-insensitive). */
export function readAssetBytes(pkg: OpclibPackage, path: string): Uint8Array {
  const bytes = pkg.assets.get(path.toLowerCase());
  if (!bytes) {
    throw new OpclibFormatError(`asset not found in package: ${path}`);
  }
  return bytes;
}
