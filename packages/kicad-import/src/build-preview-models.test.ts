import { describe, expect, test } from "bun:test";
import type {
  ParsedKicadFootprint,
  ParsedKicadSymbol,
  ParsedPad,
  ParsedPin,
} from "@openpcb/kicad-parsers";
import {
  buildFootprintPreviewFromParsed,
  buildSymbolPreviewFromParsed,
} from "./build-preview-models.js";

// Fixtures are built as parsed structures rather than loaded from .kicad_mod /
// .kicad_sym files: this package is released via `git subtree split`, so a test
// reaching into a sibling package's fixture directory would break in the split
// repo.

function pad(
  number: string,
  x: number,
  layers: string[] = ["F.Cu", "F.Paste", "F.Mask"],
): ParsedPad {
  return {
    number,
    type: "smd",
    shape: "roundrect",
    position: { x, y: 0 },
    size: { width: 1.5, height: 0.6 },
    rotation: 0,
    layers,
  };
}

function line(layer: string, y: number): ParsedKicadFootprint["graphics"][number] {
  return {
    type: "line",
    layer,
    data: { start: { x: -2, y }, end: { x: 2, y }, width: 0.12 },
  };
}

function footprint(
  graphics: ParsedKicadFootprint["graphics"],
  pads: ParsedPad[] = [pad("1", -1), pad("2", 1)],
): ParsedKicadFootprint {
  return {
    name: "TEST_FP",
    description: "",
    tags: [],
    pads,
    graphics,
    model3dRefs: [],
    attributes: {} as ParsedKicadFootprint["attributes"],
    warnings: [],
    rawSource: "",
  };
}

function pin(number: string, unit: number, y: number): ParsedPin {
  return {
    name: `P${number}`,
    number,
    electricalType: "passive",
    direction: "right",
    position: { x: -7.62, y },
    length: 2.54,
    rotation: 0,
    unit,
    convert: 1,
    hidden: false,
    nameHidden: false,
    numberHidden: false,
  };
}

function symbol(pins: ParsedPin[], units: number): ParsedKicadSymbol {
  return {
    name: "TEST_SYM",
    kicadId: null,
    pins,
    units,
    properties: { Reference: "U", Value: "TEST_SYM" },
    bodyGraphics: [],
    warnings: [],
    rawSource: "",
    pinNameOffsetMm: 0.508,
    hidePinNames: false,
    hidePinNumbers: false,
  };
}

const layersOf = (model: { graphics: readonly { layer?: string }[] }) =>
  new Set(model.graphics.map((g) => g.layer));

describe("buildFootprintPreviewFromParsed — layer allowlist", () => {
  test("keeps silkscreen and fabrication geometry", () => {
    const model = buildFootprintPreviewFromParsed(
      footprint([line("F.SilkS", 1), line("F.Fab", 2)]),
    );
    expect(layersOf(model)).toEqual(new Set(["F.SilkS", "F.Fab"]));
  });

  test("keeps courtyard — it is the part's keep-out envelope", () => {
    const model = buildFootprintPreviewFromParsed(
      footprint([line("F.CrtYd", 3), line("B.CrtYd", -3)]),
    );
    expect(layersOf(model)).toEqual(new Set(["F.CrtYd", "B.CrtYd"]));
  });

  test("keeps mask and paste apertures", () => {
    const model = buildFootprintPreviewFromParsed(
      footprint([line("F.Mask", 1), line("F.Paste", 2)]),
    );
    expect(layersOf(model)).toEqual(new Set(["F.Mask", "F.Paste"]));
  });

  test("still drops layers outside the allowlist", () => {
    const model = buildFootprintPreviewFromParsed(
      footprint([line("Edge.Cuts", 1), line("Dwgs.User", 2), line("F.SilkS", 3)]),
    );
    expect(layersOf(model)).toEqual(new Set(["F.SilkS"]));
  });

  test("courtyard widens the model bounds to the true component extent", () => {
    const withoutCourtyard = buildFootprintPreviewFromParsed(
      footprint([line("F.SilkS", 1)]),
    );
    const withCourtyard = buildFootprintPreviewFromParsed(
      footprint([line("F.SilkS", 1), line("F.CrtYd", 5)]),
    );
    expect(withCourtyard.bounds!.maxY).toBeGreaterThan(
      withoutCourtyard.bounds!.maxY,
    );
  });
});

describe("buildFootprintPreviewFromParsed — pad layers", () => {
  test("exposes every pad layer while keeping `layer` as the primary", () => {
    const model = buildFootprintPreviewFromParsed(footprint([]));
    expect(model.pads[0]!.layer).toBe("F.Cu");
    expect(model.pads[0]!.layers).toEqual(["F.Cu", "F.Paste", "F.Mask"]);
  });

  test("keeps a THT pad whose copper layer is the wildcard", () => {
    const model = buildFootprintPreviewFromParsed(
      footprint([], [pad("1", 0, ["*.Cu", "*.Mask"])]),
    );
    expect(model.pads).toHaveLength(1);
    expect(model.pads[0]!.layers).toEqual(["*.Cu", "*.Mask"]);
  });

  test("drops a pad carrying no copper layer", () => {
    const model = buildFootprintPreviewFromParsed(
      footprint([], [pad("1", 0, ["F.SilkS"])]),
    );
    expect(model.pads).toHaveLength(0);
  });
});

describe("buildSymbolPreviewFromParsed — unit composition", () => {
  test("single-unit symbols keep their original coordinates", () => {
    const model = buildSymbolPreviewFromParsed(
      symbol([pin("1", 1, 2.54), pin("2", 1, -2.54)], 1),
    );
    expect(model.pins.map((p) => p.anchor.x)).toEqual([-7.62, -7.62]);
  });

  test("every unit's pins reach the preview", () => {
    const model = buildSymbolPreviewFromParsed(
      symbol(
        [
          pin("1", 1, 2.54),
          pin("2", 1, -2.54),
          pin("3", 2, 2.54),
          pin("4", 2, -2.54),
        ],
        2,
      ),
    );
    expect(model.pins).toHaveLength(4);
    expect(model.unitCount).toBe(2);
  });

  // The defect this composition exists to prevent: KiCad draws every unit at
  // the same local coordinates, so a unit-1-only preview left the other units'
  // pins coincident and any coordinate-based net derivation shorted them.
  test("no two pins of different units land on the same coordinate", () => {
    const model = buildSymbolPreviewFromParsed(
      symbol(
        [
          pin("1", 1, 2.54),
          pin("2", 1, -2.54),
          pin("3", 2, 2.54),
          pin("4", 2, -2.54),
          pin("5", 3, 2.54),
          pin("6", 3, -2.54),
        ],
        3,
      ),
    );
    const byCoordinate = new Map<string, number[]>();
    for (const p of model.pins) {
      const key = `${p.anchor.x},${p.anchor.y}`;
      byCoordinate.set(key, [...(byCoordinate.get(key) ?? []), p.unit]);
    }
    for (const units of byCoordinate.values()) {
      expect(new Set(units).size).toBe(1);
    }
    expect(byCoordinate.size).toBe(6);
  });
});
