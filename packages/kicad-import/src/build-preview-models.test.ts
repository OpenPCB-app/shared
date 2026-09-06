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
import { parseImportBundle } from "./inspect.js";
import { validateFootprintPads } from "./validate-pads.js";

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

describe("buildFootprintPreviewFromParsed — slotted drills", () => {
  test("emits drillSlotMm and keeps drillDiameterMm on the narrow axis", () => {
    const slotted: ParsedPad = {
      ...pad("1", 0, ["*.Cu", "*.Mask"]),
      type: "thru_hole",
      drillSlot: { width: 1, height: 3 },
      drillDiameter: 1,
    };
    const model = buildFootprintPreviewFromParsed(footprint([], [slotted]));
    expect(model.pads[0]!.drillSlotMm).toEqual({ widthMm: 1, heightMm: 3 });
    expect(model.pads[0]!.drillDiameterMm).toBe(1);
  });

  test("a round drill emits no slot", () => {
    const round: ParsedPad = {
      ...pad("1", 0, ["*.Cu", "*.Mask"]),
      type: "thru_hole",
      drillDiameter: 0.65,
    };
    const model = buildFootprintPreviewFromParsed(footprint([], [round]));
    expect(model.pads[0]!.drillSlotMm).toBeUndefined();
  });
});

describe("buildFootprintPreviewFromParsed — paste sub-pads", () => {
  test("keeps an unnumbered paste-only pad, tagged role paste", () => {
    const model = buildFootprintPreviewFromParsed(
      footprint([], [pad("1", -1), pad("", 0, ["F.Paste"])]),
    );
    expect(model.pads).toHaveLength(2);
    const sub = model.pads.find((p) => p.role === "paste");
    expect(sub!.number).toBe("");
    expect(sub!.layers).toEqual(["F.Paste"]);
  });

  test("still drops an unnumbered pad with neither copper nor paste", () => {
    const model = buildFootprintPreviewFromParsed(
      footprint([], [pad("", 0, ["F.SilkS"])]),
    );
    expect(model.pads).toHaveLength(0);
  });

  test("a numbered paste-only pad is not a sub-pad and stays dropped", () => {
    const model = buildFootprintPreviewFromParsed(
      footprint([], [pad("1", 0, ["F.Paste"])]),
    );
    expect(model.pads).toHaveLength(0);
  });

  test("paste sub-pads do not widen the bounds", () => {
    const withoutSub = buildFootprintPreviewFromParsed(
      footprint([], [pad("1", 0)]),
    );
    const withSub = buildFootprintPreviewFromParsed(
      footprint([], [pad("1", 0), pad("", 20, ["F.Paste"])]),
    );
    expect(withSub.bounds).toEqual(withoutSub.bounds);
  });
});

const QFN_WITH_SEGMENTED_EP = `(footprint "QFN-4-1EP_TEST"
  (layer "F.Cu")
  (attr smd)
  (pad "1" smd roundrect (at -1 -0.5) (size 0.8 0.4) (layers "F.Cu" "F.Paste" "F.Mask"))
  (pad "2" smd roundrect (at -1 0.5) (size 0.8 0.4) (layers "F.Cu" "F.Paste" "F.Mask"))
  (pad "3" smd roundrect (at 1 0.5) (size 0.8 0.4) (layers "F.Cu" "F.Paste" "F.Mask"))
  (pad "4" smd roundrect (at 1 -0.5) (size 0.8 0.4) (layers "F.Cu" "F.Paste" "F.Mask"))
  (pad "" smd roundrect (at -0.3 -0.3) (size 0.4 0.4) (layers "F.Paste"))
  (pad "" smd roundrect (at 0.3 -0.3) (size 0.4 0.4) (layers "F.Paste"))
  (pad "" smd roundrect (at -0.3 0.3) (size 0.4 0.4) (layers "F.Paste"))
  (pad "" smd roundrect (at 0.3 0.3) (size 0.4 0.4) (layers "F.Paste"))
)`;

describe("QFN with a segmented exposed pad", () => {
  const bundle = parseImportBundle({
    footprints: [
      { fileName: "QFN-4-1EP_TEST.kicad_mod", content: QFN_WITH_SEGMENTED_EP },
    ],
  });
  const normalized = bundle.normalizedFootprints[0]!;

  test("padCount counts the 4 numbered pads only", () => {
    expect(normalized.padCount).toBe(4);
  });

  test("the preview carries all 4 paste sub-pads", () => {
    expect(normalized.preview.pads).toHaveLength(8);
    expect(normalized.preview.pads.filter((p) => p.role === "paste")).toHaveLength(
      4,
    );
  });

  test("strict pad validation ignores the paste sub-pads", () => {
    expect(() =>
      validateFootprintPads({
        name: normalized.name,
        pads: normalized.preview.pads,
      }),
    ).not.toThrow();
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
