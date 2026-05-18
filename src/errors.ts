/**
 * Thrown by inspect / validate / commit-side helpers when input fails
 * domain-level validation (empty fields, malformed KiCad, pins without
 * numbers, etc.).
 *
 * Consumers that map errors to HTTP can detect this class via
 * `instanceof KicadImportValidationError` or by `error.name`.
 */
export class KicadImportValidationError extends Error {
  override readonly name = "KicadImportValidationError";
  readonly code = "kicad_import_validation_error";

  constructor(message: string) {
    super(message);
  }
}
