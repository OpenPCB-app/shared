/**
 * Sanity test against the actual `openpcb-core-library-1.0.0.opclib` shipped
 * with OpenPCB. Skipped if the file isn't present (the shared/ repo is
 * cloneable in isolation).
 *
 * Regression guard: any change to canonicalize/digest math that breaks
 * compatibility with packages built by the previous code path will fail this
 * test.
 */
import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import path from "node:path";
import { readOpclibFromPath } from "../src/index.js";

const REAL_FIXTURE = path.resolve(
  import.meta.dir,
  "..",
  "..",
  "..",
  "..",
  "OpenPCB",
  "resources",
  "core-library",
  "openpcb-core-library-1.0.0.opclib",
);

describe("real openpcb-core-library-1.0.0.opclib", () => {
  if (!existsSync(REAL_FIXTURE)) {
    test.skip("fixture not present; skipping (clone OpenPCB next to shared/ to enable)", () => {
      // no-op
    });
    return;
  }

  test("unpacks + verifies digest + verifies asset sha256s", async () => {
    const pkg = await readOpclibFromPath(REAL_FIXTURE);
    expect(pkg.manifest.schemaVersion).toBe("1.0.0");
    expect(pkg.manifest.library.id).toBe("openpcb.core");
    expect(pkg.manifest.library.version).toBe("1.0.0");
    expect(pkg.manifest.symbols.length).toBeGreaterThan(0);
    expect(pkg.manifest.footprints.length).toBeGreaterThan(0);
    expect(pkg.manifest.components.length).toBeGreaterThan(0);
    expect(pkg.archiveSha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
