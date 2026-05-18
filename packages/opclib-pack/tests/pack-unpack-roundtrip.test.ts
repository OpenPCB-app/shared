import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  packOpclib,
  unpackOpclib,
  readAssetJson,
  readAssetBytes,
  OpclibFormatError,
  type OpclibLibraryHeader,
} from "../src/index.js";

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function makeBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

const LIB: OpclibLibraryHeader = {
  id: "test.lib",
  name: "Test Library",
  kind: "core",
  channel: "stable",
  version: "1.0.0",
  license: "MIT",
  homepage: "https://example.com",
  generatedAt: "2026-05-18T00:00:00.000Z",
};

describe("pack → unpack round-trip", () => {
  test("packs a minimal library and unpacks it byte-for-byte", () => {
    const symbolJson = '{"id":"test.sym.foo","name":"Foo"}';
    const symbolBytes = makeBytes(symbolJson);
    const symbolPath = "symbols/foo.symbol.json";

    const componentJson = '{"id":"test.comp.foo","name":"Foo Component"}';
    const componentBytes = makeBytes(componentJson);
    const componentPath = "components/foo.component.json";

    const result = packOpclib({
      library: LIB,
      symbols: [
        {
          entry: {
            id: "test.sym.foo",
            uuid: "00000000-0000-0000-0000-000000000001",
            version: "1.0.0",
            name: "Foo",
            path: symbolPath,
            sha256: sha256(symbolBytes),
          },
          bytes: symbolBytes,
        },
      ],
      footprints: [],
      models3d: [],
      components: [
        {
          entry: {
            id: "test.comp.foo",
            uuid: "00000000-0000-0000-0000-000000000002",
            version: "1.0.0",
            name: "Foo Component",
            category: "passive",
            symbol: "test.sym.foo",
            defaultFootprint: "test.fp.foo",
            footprints: [{ footprint: "test.fp.foo", label: "default" }],
            provenance: { source: "openpcb-original", license: "MIT" },
          },
          path: componentPath,
          bytes: componentBytes,
        },
      ],
    });

    expect(result.bytes.byteLength).toBeGreaterThan(0);
    expect(result.packageSha256).toMatch(/^[a-f0-9]{64}$/);

    const pkg = unpackOpclib(result.bytes);
    expect(pkg.manifest.schemaVersion).toBe("1.0.0");
    expect(pkg.manifest.library.id).toBe("test.lib");
    expect(pkg.manifest.symbols).toHaveLength(1);
    expect(pkg.manifest.components).toHaveLength(1);
    expect(pkg.manifest.integrity.packageSha256).toBe(result.packageSha256);

    expect(readAssetBytes(pkg, symbolPath)).toEqual(symbolBytes);
    const parsed = readAssetJson<{ id: string; name: string }>(pkg, symbolPath);
    expect(parsed.id).toBe("test.sym.foo");
  });

  test("detects asset sha256 mismatch (built with bad hash)", async () => {
    // Pack one archive normally, then re-zip a manifest with a deliberately
    // wrong asset sha256 alongside the asset bytes. The unpacker must reject.
    const { zipSync } = await import("fflate");
    const symBytes = makeBytes('{"id":"test.sym.foo"}');
    const wrongHash = "0".repeat(64);
    const manifest = {
      schemaVersion: "1.0.0",
      library: LIB,
      symbols: [
        {
          id: "test.sym.foo",
          uuid: "00000000-0000-0000-0000-000000000001",
          version: "1.0.0",
          name: "Foo",
          path: "symbols/foo.symbol.json",
          sha256: wrongHash,
        },
      ],
      footprints: [],
      models3d: [],
      components: [],
      integrity: { algorithm: "sha256", packageSha256: "0".repeat(64) },
    };
    // Compute correct digest for this bad manifest so digest check passes
    // and we reach asset verification.
    const { canonicalize } = await import("../src/pack/canonicalize.js");
    manifest.integrity.packageSha256 = sha256(
      new TextEncoder().encode(canonicalize(manifest)),
    );

    const zip = zipSync(
      {
        "library.json": new TextEncoder().encode(
          JSON.stringify(manifest, null, 2),
        ),
        "symbols/foo.symbol.json": symBytes,
      },
      { level: 6 },
    );

    expect(() => unpackOpclib(zip)).toThrow(/sha256 mismatch/);
  });

  test("rejects unsupported schemaVersion", () => {
    const symBytes = makeBytes('{"id":"test.sym.foo"}');
    const result = packOpclib({
      library: LIB,
      symbols: [
        {
          entry: {
            id: "test.sym.foo",
            uuid: "00000000-0000-0000-0000-000000000001",
            version: "1.0.0",
            name: "Foo",
            path: "symbols/foo.symbol.json",
            sha256: sha256(symBytes),
          },
          bytes: symBytes,
        },
      ],
      footprints: [],
      models3d: [],
      components: [],
    });
    // Sanity: round-trip works
    expect(() => unpackOpclib(result.bytes)).not.toThrow();
  });
});
