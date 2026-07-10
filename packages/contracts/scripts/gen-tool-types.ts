#!/usr/bin/env bun
// Tool-plane contract-type codegen — turns the vendored cloud-copilot JSON
// Schemas (schemas/copilot/*.schema.json) into one TypeScript mirror
// (src/sdks/copilot/tools.generated.ts).
//
// Bespoke generator cloned from OpenPCB/scripts/gen-contract-types.ts (the
// BoardSnapshot pipeline), not a `json-schema-to-typescript` dependency: the
// input is the same narrow Pydantic-emitted dialect (draft 2020-12, `$defs` +
// `$ref` + `anyOf`-nullable + `enum`/`const`, no `oneOf`/`patternProperties`).
// If a vendored schema ever grows features this generator doesn't understand,
// it throws loudly rather than silently mis-generating.
//
// Multi-schema additions over the BoardSnapshot original:
//   - reads every schemas/copilot/*.schema.json (sorted for determinism)
//   - cross-file `$defs` dedup with a divergence guard (same name + different
//     body across files → hard error)
//   - one root interface per schema file (skipped when an identical `$def` of
//     the same name already rendered it)
//
//   bun scripts/gen-tool-types.ts            # regenerate in place
//   bun scripts/gen-tool-types.ts --check    # diff-only, exit 1 on drift
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const SCHEMA_DIR = path.join(ROOT, "schemas/copilot");
const OUTPUT_PATH = path.join(ROOT, "src/sdks/copilot/tools.generated.ts");

// ── minimal JSON Schema (2020-12, Pydantic-flavored) type model ──────────

interface JsonSchema {
  $ref?: string;
  type?: string | string[];
  enum?: (string | number | boolean)[];
  const?: string | number | boolean;
  anyOf?: JsonSchema[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  additionalProperties?: JsonSchema | boolean;
  required?: string[];
  description?: string;
  title?: string;
}

interface RootSchema extends JsonSchema {
  $defs?: Record<string, JsonSchema>;
}

function refName(ref: string): string {
  const m = /^#\/\$defs\/(.+)$/.exec(ref);
  if (!m) throw new Error(`unsupported $ref: ${ref}`);
  return m[1]!;
}

/** Renders a schema node as a TypeScript type expression. */
function tsType(schema: JsonSchema): string {
  if (schema.$ref) return refName(schema.$ref);

  if (schema.const !== undefined) return JSON.stringify(schema.const);

  if (schema.enum) {
    return schema.enum.map((v) => JSON.stringify(v)).join(" | ");
  }

  if (schema.anyOf) {
    return schema.anyOf.map(tsType).join(" | ");
  }

  if (schema.type === "array") {
    if (!schema.items) throw new Error("array schema missing items");
    const inner = tsType(schema.items);
    // parenthesize unions so `A | B[]` reads as `(A | B)[]`
    const needsParens = inner.includes("|");
    return `${needsParens ? `(${inner})` : inner}[]`;
  }

  if (schema.type === "object") {
    if (schema.properties) return renderInlineObject(schema);
    if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
      return `Record<string, ${tsType(schema.additionalProperties)}>`;
    }
    return "Record<string, unknown>";
  }

  switch (schema.type) {
    case "string":
      return "string";
    case "integer":
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "null":
      return "null";
    default: {
      // Pydantic `Any` emits a node with only metadata keys (title/default/
      // description) and no structural keys — mirror it as `unknown`.
      const structural = [
        "$ref", "type", "enum", "const", "anyOf", "items",
        "properties", "additionalProperties", "required",
      ];
      if (schema.type === undefined && !structural.some((k) => k in schema)) {
        return "unknown";
      }
      throw new Error(`unsupported schema node: ${JSON.stringify(schema)}`);
    }
  }
}

function renderInlineObject(schema: JsonSchema): string {
  const props = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const lines = Object.entries(props).map(
    ([name, prop]) => `${name}${required.has(name) ? "" : "?"}: ${tsType(prop)}`,
  );
  return `{ ${lines.join("; ")} }`;
}

function jsdoc(description: string, indent = ""): string {
  const lines = description.split("\n").map((l) => l.trimEnd());
  return [`${indent}/**`, ...lines.map((l) => `${indent} * ${l}`), `${indent} */`].join("\n") + "\n";
}

function renderInterface(name: string, schema: JsonSchema): string {
  const props = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const doc = schema.description ? jsdoc(schema.description) : "";
  const fields = Object.entries(props)
    .map(([fieldName, prop]) => {
      const fieldDoc = prop.description ? jsdoc(prop.description, "  ") : "";
      const optional = required.has(fieldName) ? "" : "?";
      return `${fieldDoc}  ${fieldName}${optional}: ${tsType(prop)};`;
    })
    .join("\n");
  return `${doc}export interface ${name} {\n${fields}\n}\n`;
}

const HEADER = `// GENERATED FILE — DO NOT EDIT.
//
// Source: ../../schemas/copilot/*.schema.json (vendored from cloud-copilot's
// \`contracts/\` — see that dir's README.md for provenance + sync instructions).
//
// Regenerate with \`npm run gen --workspace packages/contracts\` after
// re-vendoring; \`npm run gen:check --workspace packages/contracts\` fails CI
// on drift. These are the canonical TS types for the R2 tool plane (manifest +
// tool request/response shapes) — the desktop remote-tool adapters (R4) and
// any web consumer import them from @openpcb/contracts.

`;

async function generate(): Promise<string> {
  const files = (await fs.readdir(SCHEMA_DIR))
    .filter((f) => f.endsWith(".schema.json"))
    .sort();
  if (files.length === 0) {
    throw new Error(`no schemas found in ${SCHEMA_DIR} — run scripts/sync-copilot-contracts.sh`);
  }

  const defs = new Map<string, { body: JsonSchema; canon: string; from: string }>();
  const roots: Array<{ name: string; schema: RootSchema; canon: string }> = [];
  for (const file of files) {
    const name = file.replace(/\.schema\.json$/, "");
    const root = JSON.parse(
      await fs.readFile(path.join(SCHEMA_DIR, file), "utf8"),
    ) as RootSchema;
    for (const [defName, defSchema] of Object.entries(root.$defs ?? {})) {
      const canon = JSON.stringify(defSchema); // Pydantic emission is key-order-stable
      const prev = defs.get(defName);
      if (prev && prev.canon !== canon) {
        throw new Error(`$defs divergence for "${defName}": ${prev.from} vs ${file}`);
      }
      if (!prev) defs.set(defName, { body: defSchema, canon, from: file });
    }
    const { $defs: _defs, ...rootBody } = root;
    roots.push({ name, schema: root, canon: JSON.stringify(rootBody) });
  }

  const parts: string[] = [];
  for (const [defName, def] of [...defs.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    parts.push(renderInterface(defName, def.body));
  }
  for (const { name, schema, canon } of roots) {
    const dup = defs.get(name);
    if (dup) {
      if (dup.canon !== canon) {
        throw new Error(`root/${name} diverges from a same-named $def (${dup.from})`);
      }
      continue; // already rendered as a $def
    }
    parts.push(renderInterface(name, schema));
  }
  return HEADER + parts.join("\n");
}

async function main() {
  const checkOnly = process.argv.includes("--check");
  const generated = await generate();

  if (!checkOnly) {
    await fs.writeFile(OUTPUT_PATH, generated, "utf8");
    console.log(`wrote ${path.relative(ROOT, OUTPUT_PATH)}`);
    return;
  }

  let existing = "";
  try {
    existing = await fs.readFile(OUTPUT_PATH, "utf8");
  } catch {
    // missing file — treated as drift below
  }
  if (existing !== generated) {
    console.error(
      `Contract codegen drift: ${path.relative(ROOT, OUTPUT_PATH)} is stale.\n` +
        `Run \`npm run gen --workspace packages/contracts\` and commit the result.`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(`${path.relative(ROOT, OUTPUT_PATH)} is up to date`);
}

await main();
