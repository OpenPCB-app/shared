// Wiring sanity for the vendored tool-plane schemas + generated types:
// every schema parses, its title matches the file stem, and the generated
// module exports an interface for it (deep drift is gen:check's job).
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");
const SCHEMA_DIR = path.join(ROOT, "schemas/copilot");
const GENERATED = readFileSync(
  path.join(ROOT, "src/sdks/copilot/tools.generated.ts"),
  "utf8",
);

const files = readdirSync(SCHEMA_DIR).filter((f) => f.endsWith(".schema.json"));

describe("vendored copilot tool schemas", () => {
  test("dir is non-empty", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const stem = file.replace(/\.schema\.json$/, "");
    test(`${stem}: parses, titled, generated`, () => {
      const schema = JSON.parse(
        readFileSync(path.join(SCHEMA_DIR, file), "utf8"),
      ) as { title?: string };
      expect(schema.title).toBe(stem);
      expect(GENERATED).toContain(`export interface ${stem} `);
    });
  }
});
