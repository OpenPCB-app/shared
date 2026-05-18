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
