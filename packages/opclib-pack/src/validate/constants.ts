export const ID_REGEX = /^[a-z][a-z0-9]*(\.[a-z0-9][a-z0-9-]*)+$/;
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const SEMVER_REGEX = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/;

/** Size and entry-count caps applied during ZIP extraction.
 *
 * These guard against zip-bombs and adversarial inputs; the packer should
 * stay well under these (the OpenPCB core library is ~1 MB total). */
export const ZIP_LIMITS = {
  /** Maximum compressed archive size accepted. */
  maxArchiveBytes: 50 * 1024 * 1024,
  /** Maximum sum of uncompressed entry sizes. */
  maxTotalUncompressedBytes: 200 * 1024 * 1024,
  /** Maximum number of entries in a single archive. */
  maxEntries: 500,
  /** Per-entry cap for text decoding (`decodeTextEntry`). */
  maxTextFileBytes: 5 * 1024 * 1024,
} as const;
