/**
 * Deterministic JSON serialization for the `.opclib` manifest digest.
 *
 * Format: compact, object keys sorted lexicographically at every depth,
 * arrays in original order, primitives serialised via `JSON.stringify`.
 *
 * Byte-deterministic across runtimes (Bun, Node, V8, JSC). The packer and the
 * unpacker MUST use the exact same algorithm, otherwise every package built
 * by the new packager will be rejected.
 *
 * NOT a general-purpose canonicalizer:
 *   - does not normalise Unicode (input strings pass through as-is)
 *   - does not handle BigInt or non-finite numbers (will throw via JSON.stringify)
 *   - does not implement RFC 8785 number canonicalisation
 */
export function canonicalize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean" || typeof value === "number") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    const parts = value.map((item) =>
      item === undefined ? "null" : canonicalize(item),
    );
    return `[${parts.join(",")}]`;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => {
        const v = obj[k];
        return (
          v !== undefined && typeof v !== "function" && typeof v !== "symbol"
        );
      })
      .sort();
    const parts = keys.map(
      (k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`,
    );
    return `{${parts.join(",")}}`;
  }
  throw new TypeError(`canonicalize: unsupported value type: ${typeof value}`);
}
