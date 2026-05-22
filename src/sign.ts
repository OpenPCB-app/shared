/**
 * Ed25519 signing for `.opclib` manifests.
 *
 * Signing target: canonicalised JSON of the manifest with the `signature`
 * field stripped (but `integrity.packageSha256` already populated). Verifiers
 * reproduce the same canonical form to check the signature.
 *
 * Keys are PEM-encoded Ed25519. Use `node:crypto.generateKeyPairSync("ed25519")`
 * to mint them; export with `.export({type:"pkcs8",format:"pem"})` (private) and
 * `.export({type:"spki",format:"pem"})` (public).
 */
import {
  sign as edSign,
  verify as edVerify,
  createPrivateKey,
  createPublicKey,
  type KeyObject,
} from "node:crypto";
import { canonicalize } from "./pack/canonicalize.js";
import type { OpclibManifest } from "./types.js";

export interface OpclibSignature {
  algorithm: "ed25519";
  keyId: string;
  signature: string;
}

/** Produce the byte sequence the signature covers. Strips any existing
 * `signature` field so re-signing is idempotent and verification is symmetric. */
function manifestSigningBytes(manifest: OpclibManifest): Uint8Array {
  const { signature: _omit, ...rest } = manifest;
  return new TextEncoder().encode(canonicalize(rest));
}

export function signManifest(
  manifest: OpclibManifest,
  privateKey: KeyObject | string | Buffer,
  keyId: string,
): OpclibSignature {
  const key: KeyObject =
    typeof privateKey === "string" || privateKey instanceof Buffer
      ? createPrivateKey(privateKey)
      : (privateKey as KeyObject);
  if (key.asymmetricKeyType !== "ed25519") {
    throw new Error(
      `signManifest: expected ed25519 key, got ${key.asymmetricKeyType}`,
    );
  }
  const bytes = manifestSigningBytes(manifest);
  const sig = edSign(null, bytes, key);
  return { algorithm: "ed25519", keyId, signature: sig.toString("base64") };
}

/** Pure helper returning a signed manifest clone — embeds signature in-place
 * is fine for the packer (which owns the manifest), but this is the safer
 * default for callers passing around shared references. */
export function withSignature(
  manifest: OpclibManifest,
  signature: OpclibSignature,
): OpclibManifest {
  return { ...manifest, signature };
}

export type TrustedKeyResolver = (
  keyId: string,
) => KeyObject | string | Buffer | undefined;

export interface VerifyManifestOptions {
  /** Resolve a public key by `keyId`. Return `undefined` for unknown keys. */
  resolveKey: TrustedKeyResolver;
}

export interface VerifyManifestResult {
  valid: boolean;
  keyId?: string;
  reason?: string;
}

export function verifyManifest(
  manifest: OpclibManifest,
  opts: VerifyManifestOptions,
): VerifyManifestResult {
  const sig = manifest.signature;
  if (!sig) return { valid: false, reason: "no-signature" };
  if (sig.algorithm !== "ed25519") {
    return {
      valid: false,
      keyId: sig.keyId,
      reason: `unsupported-algorithm:${sig.algorithm}`,
    };
  }
  const rawKey = opts.resolveKey(sig.keyId);
  if (!rawKey) return { valid: false, keyId: sig.keyId, reason: "unknown-key" };
  let key: KeyObject;
  try {
    key =
      typeof rawKey === "string" || rawKey instanceof Buffer
        ? createPublicKey(rawKey)
        : (rawKey as KeyObject);
  } catch (err) {
    return {
      valid: false,
      keyId: sig.keyId,
      reason: `invalid-key:${(err as Error).message}`,
    };
  }
  if (key.asymmetricKeyType !== "ed25519") {
    return {
      valid: false,
      keyId: sig.keyId,
      reason: `key-not-ed25519:${key.asymmetricKeyType}`,
    };
  }
  let ok = false;
  try {
    ok = edVerify(
      null,
      manifestSigningBytes(manifest),
      key,
      Buffer.from(sig.signature, "base64"),
    );
  } catch (err) {
    return {
      valid: false,
      keyId: sig.keyId,
      reason: `verify-error:${(err as Error).message}`,
    };
  }
  return ok
    ? { valid: true, keyId: sig.keyId }
    : { valid: false, keyId: sig.keyId, reason: "bad-signature" };
}
