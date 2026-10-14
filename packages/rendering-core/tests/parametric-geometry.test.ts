/**
 * Table-driven geometry fixtures for the parametric templates: pad count,
 * numbering, pitch, span, drill inside copper and pairwise copper gap.
 */
import { describe, expect, test } from "bun:test";
import {
  generateMountingArray,
  generatePinHeader,
  generateScrewTerminal,
  getTemplate,
  type FootprintRenderSourcePad,
  type ParamValues,
} from "../src/index.js";
import { MIN_PAD_GAP_MM, distinct, minPairwiseGap } from "./fixtures/pad-geometry.js";

const TOL = 1e-6;

function expectGrid(
  pads: readonly FootprintRenderSourcePad[],
  axis: "x" | "y",
  count: number,
  pitch: number,
) {
  const values = distinct(pads.map((pad) => pad.centerMm[axis]));
  expect(values).toHaveLength(count);
  for (let i = 1; i < values.length; i += 1) {
    expect(values[i]! - values[i - 1]!).toBeCloseTo(pitch, 6);
  }
  // Grid is centred: span = (count − 1) × pitch, symmetric about 0.
  expect(values[0]!).toBeCloseTo(-((count - 1) * pitch) / 2, 6);
}

function expectDrillsInsideCopper(pads: readonly FootprintRenderSourcePad[]) {
  for (const pad of pads) {
    const drill = pad.drillDiameterMm ?? 0;
    expect(drill).toBeGreaterThan(0);
    expect(Math.min(pad.widthMm, pad.heightMm)).toBeGreaterThan(drill);
  }
}

describe("pin header geometry", () => {
  const cases = [
    { rows: 1, pinsPerRow: 4, pitchMm: 2.54, mount: "tht", orientation: "vertical" },
    { rows: 2, pinsPerRow: 10, pitchMm: 2.54, mount: "tht", orientation: "vertical" },
    { rows: 2, pinsPerRow: 5, pitchMm: 2.54, mount: "tht", orientation: "horizontal" },
    { rows: 1, pinsPerRow: 8, pitchMm: 2.0, mount: "tht", orientation: "vertical" },
    { rows: 1, pinsPerRow: 6, pitchMm: 2.54, mount: "smd", orientation: "vertical" },
    { rows: 2, pinsPerRow: 5, pitchMm: 2.54, mount: "smd", orientation: "vertical" },
    { rows: 1, pinsPerRow: 10, pitchMm: 1.27, mount: "smd", orientation: "vertical" },
  ] as const;
  for (const params of cases) {
    test(`${params.rows}x${params.pinsPerRow} ${params.pitchMm} ${params.mount} ${params.orientation}`, () => {
      const pads = generatePinHeader(params).source.pads;
      const count = params.rows * params.pinsPerRow;
      expect(pads).toHaveLength(count);
      // Column-major 1-N-2-M numbering: pin n sits in column ⌊(n−1)/rows⌋.
      expect(pads.map((pad) => pad.number)).toEqual(
        Array.from({ length: count }, (_, i) => String(i + 1)),
      );
      const along = params.orientation === "vertical" ? "x" : "y";
      const across = params.orientation === "vertical" ? "y" : "x";
      expectGrid(pads, along, params.pinsPerRow, params.pitchMm);
      if (params.rows > 1) expectGrid(pads, across, params.rows, params.pitchMm);
      expect(pads[0]!.centerMm[along]).toBeLessThan(pads[count - 1]!.centerMm[along]);
      expect(minPairwiseGap(pads)).toBeGreaterThanOrEqual(MIN_PAD_GAP_MM - TOL);
      if (params.mount === "tht") expectDrillsInsideCopper(pads);
      else expect(pads.every((pad) => pad.drillDiameterMm === undefined)).toBe(true);
    });
  }
});

describe("screw terminal geometry", () => {
  const cases = [
    { poles: 2, pitchMm: 5.08, drillMm: 1.3 },
    { poles: 3, pitchMm: 2.54, drillMm: 1.0 },
    { poles: 12, pitchMm: 3.5, drillMm: 1.2 },
    { poles: 24, pitchMm: 10.16, drillMm: 2.5 },
  ] as const;
  for (const params of cases) {
    test(`${params.poles}p ${params.pitchMm} drill ${params.drillMm}`, () => {
      const pads = generateScrewTerminal(params).source.pads;
      expect(pads.map((pad) => pad.number)).toEqual(
        Array.from({ length: params.poles }, (_, i) => String(i + 1)),
      );
      expectGrid(pads, "x", params.poles, params.pitchMm);
      expect(distinct(pads.map((pad) => pad.centerMm.y))).toEqual([0]);
      expect(pads[0]!.shape).toBe("rect");
      expectDrillsInsideCopper(pads);
      expect(minPairwiseGap(pads)).toBeGreaterThanOrEqual(MIN_PAD_GAP_MM - TOL);
    });
  }
});

describe("mounting array geometry", () => {
  const cases = [
    { rows: 2, cols: 2, pitchXMm: 20, pitchYMm: 20, drillMm: 3.2, plated: false },
    { rows: 2, cols: 2, pitchXMm: 20, pitchYMm: 20, drillMm: 3.2, plated: true },
    { rows: 3, cols: 2, pitchXMm: 10, pitchYMm: 15, drillMm: 2.2, plated: true },
    { rows: 1, cols: 1, pitchXMm: 1, pitchYMm: 1, drillMm: 8, plated: false },
  ] as const;
  for (const params of cases) {
    test(`${params.rows}x${params.cols} ${params.pitchXMm}x${params.pitchYMm} drill ${params.drillMm} ${params.plated ? "PTH" : "NPTH"}`, () => {
      const pads = generateMountingArray(params).source.pads;
      expect(pads).toHaveLength(params.rows * params.cols);
      expect(pads.every((pad) => pad.number === "")).toBe(true);
      expect(new Set(pads.map((pad) => pad.id)).size).toBe(pads.length);
      expectGrid(pads, "x", params.cols, params.pitchXMm);
      expectGrid(pads, "y", params.rows, params.pitchYMm);
      expectDrillsInsideCopper(pads);
      expect(pads.every((pad) => pad.layer === (params.plated ? "F.Cu" : "Edge.Cuts"))).toBe(true);
      expect(minPairwiseGap(pads)).toBeGreaterThanOrEqual(MIN_PAD_GAP_MM - TOL);
    });
  }
});

// Reproductions: these schema-valid parameter sets produce overlapping pads.
// They pass while the defect exists; flip them once the schema or generator
// rejects them.
describe("known defect: schema accepts parameters whose pads overlap", () => {
  const overlapping: readonly { readonly template: string; readonly values: ParamValues }[] = [
    { template: "pin-header", values: { rows: 1, pinsPerRow: 4, pitchMm: 1.27, mount: "tht", orientation: "vertical" } },
    { template: "pin-header", values: { rows: 1, pinsPerRow: 4, pitchMm: 0.5, mount: "smd", orientation: "vertical" } },
    { template: "screw-terminal", values: { poles: 2, pitchMm: 2.54, drillMm: 2.5 } },
    { template: "mounting-array", values: { rows: 1, cols: 2, pitchXMm: 1, pitchYMm: 1, drillMm: 8, plated: true } },
  ];
  for (const { template, values } of overlapping) {
    test(`${template} ${JSON.stringify(values)}`, () => {
      const pads = getTemplate(template)!.generate(values).source.pads;
      expect(minPairwiseGap(pads)).toBeLessThan(0);
    });
  }
});
