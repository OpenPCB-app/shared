/**
 * Symbol + footprint preview-builder smoke tests. Guards against silent
 * regressions in bounds computation, default constants, and the source →
 * model transform.
 */
import { describe, expect, test } from "bun:test";
import {
  buildSymbolRenderModel,
  buildFootprintRenderModel,
  DEFAULT_PCB_ZOOM,
  DEFAULT_SCHEMATIC_ZOOM,
  KLC_TEXT_SIZE_MM,
  PCB_GRID_MM,
  SCHEMATIC_GRID_MM,
  type SymbolRenderSource,
  type FootprintRenderSource,
} from "../src/index.js";

describe("KLC + grid + camera constants", () => {
  test("snap grids preserved at canonical values", () => {
    expect(SCHEMATIC_GRID_MM).toBe(2);
    expect(PCB_GRID_MM).toBe(0.25);
  });
  test("KLC text size = 50 mil", () => {
    expect(KLC_TEXT_SIZE_MM).toBeCloseTo(1.27, 6);
  });
  test("camera zoom defaults pinned", () => {
    expect(DEFAULT_SCHEMATIC_ZOOM).toBe(40);
    expect(DEFAULT_PCB_ZOOM).toBe(8);
  });
});

describe("buildSymbolRenderModel", () => {
  const source: SymbolRenderSource = {
    name: "R",
    unitCount: 1,
    referenceText: "R",
    valueText: "10k",
    warnings: [],
    pins: [
      {
        id: "p1",
        name: "~",
        number: "1",
        electricalType: "passive",
        unit: 1,
        hidden: false,
        positionMm: { x: -2.54, y: 0 },
        lengthMm: 2.54,
        rotationDeg: 0,
      },
      {
        id: "p2",
        name: "~",
        number: "2",
        electricalType: "passive",
        unit: 1,
        hidden: false,
        positionMm: { x: 2.54, y: 0 },
        lengthMm: 2.54,
        rotationDeg: 180,
      },
    ],
    graphics: [],
    labels: [],
  };

  test("emits one render-model pin per source pin", () => {
    const model = buildSymbolRenderModel(source);
    expect(model.pins).toHaveLength(2);
    expect(model.pins.map((p) => p.number).sort()).toEqual(["1", "2"]);
  });

  test("generates a bounds box when source provides pins", () => {
    const model = buildSymbolRenderModel(source);
    expect(model.bounds).not.toBeNull();
    if (!model.bounds) return;
    expect(model.bounds.maxX).toBeGreaterThan(model.bounds.minX);
  });

  test("includes labels for each pin", () => {
    const model = buildSymbolRenderModel(source);
    // every pin contributes at least a pin-number label (name is ~ → hidden)
    const numbers = model.labels.filter((l) => l.role === "pin-number");
    expect(numbers.length).toBeGreaterThanOrEqual(2);
  });
});

describe("buildFootprintRenderModel", () => {
  const source: FootprintRenderSource = {
    name: "R_0603_1608Metric",
    pads: [
      {
        id: "pad1",
        number: "1",
        shape: "roundrect",
        centerMm: { x: -0.75, y: 0 },
        widthMm: 0.9,
        heightMm: 0.95,
        rotationDeg: 0,
        roundrectRatio: 0.25,
        layer: "F.Cu",
      },
      {
        id: "pad2",
        number: "2",
        shape: "roundrect",
        centerMm: { x: 0.75, y: 0 },
        widthMm: 0.9,
        heightMm: 0.95,
        rotationDeg: 0,
        roundrectRatio: 0.25,
        layer: "F.Cu",
      },
    ],
    graphics: [],
    labels: [],
    warnings: [],
  };

  test("preserves pad count and ids", () => {
    const model = buildFootprintRenderModel(source);
    expect(model.pads).toHaveLength(2);
    expect(model.pads.map((p) => p.id)).toEqual(["pad1", "pad2"]);
  });

  test("computes bounds that include both pads", () => {
    const model = buildFootprintRenderModel(source);
    expect(model.bounds).not.toBeNull();
    if (!model.bounds) return;
    expect(model.bounds.minX).toBeLessThan(0);
    expect(model.bounds.maxX).toBeGreaterThan(0);
  });

  test("applies stroke expansion once per graphic", () => {
    const model = buildFootprintRenderModel({
      ...source,
      pads: [],
      graphics: [
        {
          kind: "line",
          a: { x: 0, y: 0 },
          b: { x: 1, y: 0 },
          strokeWidthMm: 0.1,
          layer: "F.SilkS",
        },
        {
          kind: "line",
          a: { x: 2, y: 0 },
          b: { x: 3, y: 0 },
          strokeWidthMm: 0.1,
          layer: "F.SilkS",
        },
      ],
    });

    expect(model.bounds).not.toBeNull();
    if (!model.bounds) return;
    expect(model.bounds.minX).toBeCloseTo(-0.05, 6);
    expect(model.bounds.maxX).toBeCloseTo(3.05, 6);
  });

  test("propagates warnings from source", () => {
    const withWarning: FootprintRenderSource = {
      ...source,
      warnings: [{ code: "test", message: "test" }],
    };
    const model = buildFootprintRenderModel(withWarning);
    expect(model.warnings).toHaveLength(1);
    expect(model.warnings[0]?.code).toBe("test");
  });
});

describe("buildFootprintRenderModel — layer filtering", () => {
  const line = (
    layer: string | undefined,
  ): FootprintRenderSource["graphics"][number] => ({
    kind: "line",
    a: { x: -1, y: 0 },
    b: { x: 1, y: 0 },
    strokeWidthMm: 0.12,
    layer,
  });

  const padOn = (
    id: string,
    layer: string | undefined,
    layers?: string[],
  ): FootprintRenderSource["pads"][number] => ({
    id,
    number: "1",
    shape: "rect",
    centerMm: { x: 0, y: 0 },
    widthMm: 1,
    heightMm: 1,
    rotationDeg: 0,
    layer,
    layers,
  });

  const sourceWith = (
    graphics: FootprintRenderSource["graphics"],
    pads: FootprintRenderSource["pads"] = [padOn("p", "F.Cu")],
  ): FootprintRenderSource => ({
    name: "FP",
    pads,
    graphics,
    labels: [],
    warnings: [],
  });

  const SILK_AND_COURTYARD = ["F.SilkS", "F.CrtYd"];

  test("an absent allowlist passes every graphic through", () => {
    const model = buildFootprintRenderModel(
      sourceWith([line("F.SilkS"), line("Edge.Cuts")]),
    );
    expect(model.graphics).toHaveLength(2);
  });

  test("an allowlist keeps only the named layers", () => {
    const model = buildFootprintRenderModel(
      sourceWith([line("F.SilkS"), line("F.CrtYd"), line("Edge.Cuts")]),
      { includeLayerNames: SILK_AND_COURTYARD },
    );
    expect(model.graphics.map((g) => g.layer)).toEqual(["F.SilkS", "F.CrtYd"]);
  });

  test("a graphic with no layer is dropped when an allowlist is present", () => {
    const model = buildFootprintRenderModel(
      sourceWith([line("F.SilkS"), line(undefined)]),
      { includeLayerNames: SILK_AND_COURTYARD },
    );
    expect(model.graphics).toHaveLength(1);
  });

  test("a pad passes when ANY of its layers is allowed", () => {
    const model = buildFootprintRenderModel(
      sourceWith(
        [],
        [
          padOn("smd", "F.Cu", ["F.Cu", "F.Paste", "F.Mask"]),
          padOn("tht", "*.Cu", ["*.Cu", "*.Mask"]),
          padOn("silk-only", "F.SilkS", ["F.SilkS"]),
        ],
      ),
      { includePadLayerNames: ["F.Cu", "B.Cu", "*.Cu"] },
    );
    expect(model.pads.map((p) => p.id)).toEqual(["smd", "tht"]);
  });

  test("pad filtering falls back to `layer` when `layers` is absent", () => {
    const model = buildFootprintRenderModel(
      sourceWith([], [padOn("legacy", "B.Cu"), padOn("dropped", "F.Mask")]),
      { includePadLayerNames: ["F.Cu", "B.Cu", "*.Cu"] },
    );
    expect(model.pads.map((p) => p.id)).toEqual(["legacy"]);
  });
});

describe("buildSymbolRenderModel — multi-unit composition", () => {
  const pinAt = (
    id: string,
    unit: number,
    y: number,
  ): SymbolRenderSource["pins"][number] => ({
    id,
    name: id,
    number: id,
    electricalType: "passive",
    unit,
    hidden: false,
    positionMm: { x: -2.54, y },
    lengthMm: 2.54,
    rotationDeg: 0,
  });

  const threeUnits: SymbolRenderSource = {
    name: "U",
    unitCount: 3,
    referenceText: "U",
    valueText: "74HC04",
    warnings: [],
    pins: [
      pinAt("1", 1, 2.54),
      pinAt("2", 1, -2.54),
      pinAt("3", 2, 2.54),
      pinAt("4", 2, -2.54),
      pinAt("5", 3, 2.54),
      pinAt("6", 3, -2.54),
    ],
    graphics: [],
    labels: [],
  };

  test("composeAllUnits off keeps unit 1 only", () => {
    const model = buildSymbolRenderModel(threeUnits, {
      composeAllUnits: false,
    });
    expect(model.pins.map((p) => p.unit)).toEqual([1, 1]);
  });

  test("composeAllUnits on spreads every unit to a distinct coordinate", () => {
    const model = buildSymbolRenderModel(threeUnits, {
      composeAllUnits: true,
    });
    expect(model.pins).toHaveLength(6);
    const coords = new Set(model.pins.map((p) => `${p.anchor.x},${p.anchor.y}`));
    expect(coords.size).toBe(6);
  });

  // preserveOrigin disables the per-unit X translation, so composing with it
  // stacks the units back on top of each other. Guards the pairing used by
  // kicad-import's buildSymbolPreviewFromParsed.
  test("composeAllUnits with preserveOrigin re-stacks the units", () => {
    const model = buildSymbolRenderModel(threeUnits, {
      composeAllUnits: true,
      preserveOrigin: true,
    });
    const coords = new Set(model.pins.map((p) => `${p.anchor.x},${p.anchor.y}`));
    expect(coords.size).toBe(2);
  });
});
