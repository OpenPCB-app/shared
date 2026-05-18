/** Thrown when a `.opclib` archive is malformed: missing manifest, bad
 * digest, asset hash mismatch, unsupported schemaVersion. */
export class OpclibFormatError extends Error {
  override readonly name = "OpclibFormatError";
  constructor(message: string) {
    super(message);
  }
}

/** Thrown when manifest contents don't match the JSON Schema. */
export class OpclibValidationError extends Error {
  override readonly name = "OpclibValidationError";
  readonly errors: ReadonlyArray<{ path: string; message: string }>;

  constructor(
    message: string,
    errors: ReadonlyArray<{ path: string; message: string }> = [],
  ) {
    super(message);
    this.errors = errors;
  }
}
