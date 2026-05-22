import { describe, expect, test } from "bun:test";
import { createHash, generateKeyPairSync } from "node:crypto";
import {
  packOpclib,
  unpackOpclib,
  signManifest,
  verifyManifest,
  withSignature,
  type OpclibLibraryHeader,
  type OpclibManifest,
} from "../src/index.js";

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

const LIB: OpclibLibraryHeader = {
  id: "test.lib",
  name: "Test Library",
  kind: "core",
  channel: "stable",
  version: "1.0.0",
  license: "MIT",
  generatedAt: "2026-05-18T00:00:00.000Z",
};

function buildMinimalManifest(): OpclibManifest {
  const bytes = new TextEncoder().encode("{}");
  const result = packOpclib({
    library: LIB,
    symbols: [
      {
        entry: {
          id: "test.sym.x",
          uuid: "00000000-0000-0000-0000-000000000001",
          version: "1.0.0",
          name: "X",
          path: "symbols/x.symbol.json",
          sha256: sha256(bytes),
        },
        bytes,
      },
    ],
    footprints: [
      {
        entry: {
          id: "test.fp.x",
          uuid: "00000000-0000-0000-0000-000000000002",
          version: "1.0.0",
          name: "X",
          path: "footprints/x.fp.json",
          sha256: sha256(bytes),
        },
        bytes,
      },
    ],
    models3d: [],
    components: [
      {
        entry: {
          id: "test.comp.x",
          uuid: "00000000-0000-0000-0000-000000000010",
          version: "1.0.0",
          name: "X",
          category: "passive",
          symbol: "test.sym.x",
          defaultFootprint: "test.fp.x",
          footprints: [{ footprint: "test.fp.x", label: "default" }],
          provenance: { source: "openpcb-original", license: "MIT" },
        },
        path: "components/x.component.json",
        bytes,
      },
    ],
  });
  return result.manifest;
}

describe("ed25519 sign/verify", () => {
  test("round-trips through pack with sign and verifies after unpack", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const bytes = new TextEncoder().encode("{}");
    const result = packOpclib({
      library: LIB,
      symbols: [
        {
          entry: {
            id: "test.sym.x",
            uuid: "00000000-0000-0000-0000-000000000001",
            version: "1.0.0",
            name: "X",
            path: "symbols/x.symbol.json",
            sha256: sha256(bytes),
          },
          bytes,
        },
      ],
      footprints: [
        {
          entry: {
            id: "test.fp.x",
            uuid: "00000000-0000-0000-0000-000000000002",
            version: "1.0.0",
            name: "X",
            path: "footprints/x.fp.json",
            sha256: sha256(bytes),
          },
          bytes,
        },
      ],
      models3d: [],
      components: [
        {
          entry: {
            id: "test.comp.x",
            uuid: "00000000-0000-0000-0000-000000000010",
            version: "1.0.0",
            name: "X",
            category: "passive",
            symbol: "test.sym.x",
            defaultFootprint: "test.fp.x",
            footprints: [{ footprint: "test.fp.x", label: "default" }],
            provenance: { source: "openpcb-original", license: "MIT" },
          },
          path: "components/x.component.json",
          bytes,
        },
      ],
      sign: { privateKey, keyId: "test-key" },
    });

    expect(result.manifest.signature).toBeDefined();
    expect(result.manifest.signature!.algorithm).toBe("ed25519");
    expect(result.manifest.signature!.keyId).toBe("test-key");

    const pkg = unpackOpclib(result.bytes);
    const verdict = verifyManifest(pkg.manifest, {
      resolveKey: (id) => (id === "test-key" ? publicKey : undefined),
    });
    expect(verdict.valid).toBe(true);
    expect(verdict.keyId).toBe("test-key");
  });

  test("rejects tampered manifest", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const manifest = buildMinimalManifest();
    const sig = signManifest(manifest, privateKey, "k1");
    const signed = withSignature(manifest, sig);
    const tampered = withSignature(
      { ...signed, library: { ...signed.library, version: "9.9.9" } },
      sig,
    );
    const verdict = verifyManifest(tampered, {
      resolveKey: () => publicKey,
    });
    expect(verdict.valid).toBe(false);
    expect(verdict.reason).toBe("bad-signature");
  });

  test("reports unknown-key when resolver returns undefined", () => {
    const { privateKey } = generateKeyPairSync("ed25519");
    const manifest = buildMinimalManifest();
    const signed = withSignature(
      manifest,
      signManifest(manifest, privateKey, "k1"),
    );
    const verdict = verifyManifest(signed, { resolveKey: () => undefined });
    expect(verdict.valid).toBe(false);
    expect(verdict.reason).toBe("unknown-key");
  });

  test("no-signature reports cleanly", () => {
    const manifest = buildMinimalManifest();
    const verdict = verifyManifest(manifest, { resolveKey: () => undefined });
    expect(verdict.valid).toBe(false);
    expect(verdict.reason).toBe("no-signature");
  });
});
