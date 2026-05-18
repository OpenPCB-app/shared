/**
 * AJV-driven JSON Schema validation for `.opclib` manifests and assets.
 *
 * Schema files live alongside this module at `../schemas/*.schema.json` and
 * are bundled into the published package via the package.json `files` array.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Ajv, { type AnySchema, type ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { OpclibValidationError } from "../errors.js";

export interface OpclibValidationResult {
  valid: boolean;
  errors: ReadonlyArray<{ path: string; message: string }>;
}

const SCHEMAS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "schemas",
);

export function loadSchema(name: string): AnySchema {
  const file = path.join(SCHEMAS_DIR, `${name}.schema.json`);
  return JSON.parse(readFileSync(file, "utf8")) as AnySchema;
}

export function makeAjv(): InstanceType<typeof Ajv> {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv as never);
  return ajv;
}

let _libraryValidator: ValidateFunction | null = null;
function getLibraryValidator(): ValidateFunction {
  if (!_libraryValidator) {
    _libraryValidator = makeAjv().compile(loadSchema("library"));
  }
  return _libraryValidator;
}

/** Validate a parsed manifest object against `library.schema.json`. Returns a
 * `{ valid, errors }` tuple — does NOT throw. Throw the result via
 * `assertValidManifest` if the caller wants exception semantics. */
export function validateManifest(manifest: unknown): OpclibValidationResult {
  const validate = getLibraryValidator();
  const valid = validate(manifest) as boolean;
  if (valid) return { valid: true, errors: [] };
  const errors = (validate.errors ?? []).map((err) => ({
    path: err.instancePath || "/",
    message: err.message ?? "validation failed",
  }));
  return { valid: false, errors };
}

export function assertValidManifest(manifest: unknown): void {
  const result = validateManifest(manifest);
  if (!result.valid) {
    throw new OpclibValidationError(
      "Manifest failed schema validation",
      result.errors,
    );
  }
}
