import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Node-only convenience: hash a file by absolute path. */
export function sha256File(absPath: string): string {
  return sha256Bytes(readFileSync(absPath));
}
