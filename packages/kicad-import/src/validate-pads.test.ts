import { describe, expect, test } from "bun:test";
import { KicadImportValidationError } from "./errors.js";
import { validateFootprintPads } from "./validate-pads.js";

function pad(number: string): {
  id: string;
  number: string;
  shape: "circle";
  centerMm: { x: number; y: number };
  widthMm: number;
  heightMm: number;
  rotationDeg: number;
} {
  return {
    id: `pad-${number || "npth"}`,
    number,
    shape: "circle",
    centerMm: { x: 0, y: 0 },
    widthMm: 1,
    heightMm: 1,
    rotationDeg: 0,
  };
}

describe("validateFootprintPads", () => {
  test("accepts numbered pads", () => {
    expect(() =>
      validateFootprintPads({ name: "R_0603", pads: [pad("1"), pad("2")] }),
    ).not.toThrow();
  });

  test("rejects empty pad list by default", () => {
    expect(() => validateFootprintPads({ name: "Empty", pads: [] })).toThrow(
      KicadImportValidationError,
    );
  });

  test("rejects unnumbered pads by default", () => {
    expect(() =>
      validateFootprintPads({ name: "MountingHole", pads: [pad("")] }),
    ).toThrow(/empty number/);
  });

  test("allowUnnumberedPads accepts NPTH-only footprints (mounting hole)", () => {
    expect(() =>
      validateFootprintPads(
        { name: "MountingHole_3.2mm_M3", pads: [pad("")] },
        { allowUnnumberedPads: true },
      ),
    ).not.toThrow();
  });

  test("allowUnnumberedPads accepts mixed electrical + mechanical pads (barrel jack)", () => {
    expect(() =>
      validateFootprintPads(
        {
          name: "BarrelJack_Horizontal",
          pads: [pad("1"), pad("2"), pad("3"), pad("")],
        },
        { allowUnnumberedPads: true },
      ),
    ).not.toThrow();
  });

  test("allowUnnumberedPads still rejects a padless footprint", () => {
    expect(() =>
      validateFootprintPads(
        { name: "Empty", pads: [] },
        { allowUnnumberedPads: true },
      ),
    ).toThrow(KicadImportValidationError);
  });

  test("requirePads:false permits padless footprints", () => {
    expect(() =>
      validateFootprintPads({ name: "Logo", pads: [] }, { requirePads: false }),
    ).not.toThrow();
  });
});
