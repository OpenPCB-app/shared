import type { AiJsonSchemaObject } from "../json-schema.js";

export interface AiValidationError {
  path: string;
  message: string;
}

export function validateAgainstSchema(
  value: unknown,
  schema: AiJsonSchemaObject,
  path = "",
): AiValidationError[] {
  const errors: AiValidationError[] = [];
  const type = schema.type;
  if (type !== undefined) {
    const types = Array.isArray(type) ? type : [type];
    if (!types.some((t) => matchesType(value, t))) {
      errors.push({
        path: path || "$",
        message: `expected type ${types.join("|")}`,
      });
      return errors;
    }
  }
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    schema.properties
  ) {
    const obj = value as Record<string, unknown>;
    for (const required of schema.required ?? []) {
      if (!(required in obj)) {
        errors.push({
          path: joinPath(path, required),
          message: "required property missing",
        });
      }
    }
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (key in obj) {
        errors.push(
          ...validateAgainstSchema(obj[key], propSchema, joinPath(path, key)),
        );
      }
    }
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((item, idx) => {
      errors.push(
        ...validateAgainstSchema(
          item,
          schema.items as AiJsonSchemaObject,
          `${path}[${idx}]`,
        ),
      );
    });
  }
  return errors;
}

function matchesType(value: unknown, type: string): boolean {
  switch (type) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "object":
      return (
        typeof value === "object" && value !== null && !Array.isArray(value)
      );
    case "array":
      return Array.isArray(value);
    case "null":
      return value === null;
    default:
      return true;
  }
}

function joinPath(base: string, key: string): string {
  return base ? `${base}.${key}` : key;
}

export function parseToolArguments(
  argumentsJson: string,
): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(argumentsJson) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "invalid JSON",
    };
  }
}
