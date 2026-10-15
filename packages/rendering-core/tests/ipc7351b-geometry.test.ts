/**
 * Table-driven geometry qualification of every IPC-7351B preset at every
 * density: pad count, numbering, pitch, span, exposed pad, pairwise copper
 * gap — plus chip / SOT / SOIC / QFN against their cited drawings and the
 * KiCad library.
 */
import { describe, expect, test } from "bun:test";
import {
  ALL_FAMILIES,
  generateFootprint,
  type DensityLevel,
  type FootprintRenderSourcePad,
  type PackageFamily,
  type PreviewGraphic,
} from "../src/index.js";
import {
  CHIP_FAMILY,
  QFN_FAMILY,
  QFP_FAMILY,
  SOIC_FAMILY,
  SOT_FAMILY,
} from "../src/ipc7351b/family-presets.js";
import { CHIP_ADDITIONS, QFN_ADDITIONS, SOIC_ADDITIONS, SOT_ADDITIONS } from "../src/ipc7351b/ipc-dimensions.js";
import { QFN_EP_MIN_GAP_MM, calculateQfnPads } from "../src/ipc7351b/pad-calculator.js";
import {
  CHIP_DRAWINGS,
  QFN_DRAWINGS,
  SOIC_DRAWINGS,
  SOT_DRAWINGS,
  nominal,
} from "./fixtures/ipc7351b-drawings.js";
import { KICAD_ORACLE, KICAD_ORACLE_TOLERANCE } from "./fixtures/ipc7351b-kicad-oracle.js";
import {
  MIN_PAD_GAP_MM,
  distinct,
  isCounterClockwise,
  minPairwiseGap,
  padGap,
} from "./fixtures/pad-geometry.js";

const DENSITIES: readonly DensityLevel[] = ["most", "nominal", "least"];
const TOL = 1e-6;

function pads(family: Parameters<typeof generateFootprint>[0], label: string, density: DensityLevel) {
  return generateFootprint(family, label, density).source.pads;
}

function numbers(list: readonly FootprintRenderSourcePad[]): string[] {
  return list.map((pad) => pad.number);
}

function sequence(count: number): string[] {
  return Array.from({ length: count }, (_, index) => String(index + 1));
}

function familyOf(label: string): PackageFamily {
  for (const family of ALL_FAMILIES) {
    for (const size of family.sizes) if (size.label === label) return family.id;
  }
  throw new Error(`no preset labelled ${label}`);
}

function rectOn(graphics: readonly PreviewGraphic[], layer: string) {
  const found = graphics.filter((graphic) => graphic.layer === layer);
  expect(found).toHaveLength(1);
  const rect = found[0]!;
  if (rect.kind !== "rect") throw new Error(`${layer}: expected a rect, got ${rect.kind}`);
  return rect;
}

function expectCommon(list: readonly FootprintRenderSourcePad[], signalCount: number) {
  expect(new Set(list.map((pad) => pad.id)).size).toBe(list.length);
  expect(minPairwiseGap(list)).toBeGreaterThanOrEqual(MIN_PAD_GAP_MM - TOL);
  expect(isCounterClockwise(list.filter((pad) => Number(pad.number) <= signalCount))).toBe(true);
  for (const pad of list) {
    expect(pad.widthMm).toBeGreaterThan(0);
    expect(pad.heightMm).toBeGreaterThan(0);
  }
}

describe("every preset × density: count, numbering, gap", () => {
  const cases = [
    ...CHIP_FAMILY.sizes.map((s) => ({ family: "chip" as const, label: s.label, count: 2 })),
    ...SOT_FAMILY.sizes.map((s) => ({
      family: "sot" as const,
      label: s.label,
      count: [...s.params.leftPins, ...s.params.rightPins].filter((n) => n !== null).length + (s.params.tab ? 1 : 0),
    })),
    ...SOIC_FAMILY.sizes.map((s) => ({ family: "soic" as const, label: s.label, count: s.params.pinCount })),
    ...QFP_FAMILY.sizes.map((s) => ({ family: "qfp" as const, label: s.label, count: s.params.pinCount })),
    ...QFN_FAMILY.sizes.map((s) => ({ family: "qfn" as const, label: s.label, count: s.params.pinCount + 1 })),
  ];
  for (const { family, label, count } of cases) {
    for (const density of DENSITIES) {
      test(`${family} ${label} ${density}`, () => {
        const list = pads(family, label, density);
        expect(list).toHaveLength(count);
        expect(numbers(list)).toEqual(sequence(count));
        expectCommon(list, family === "qfn" ? count - 1 : count);
      });
    }
  }
});

describe("dual / quad row presets: pitch and symmetric span", () => {
  function expectPitch(ys: readonly number[], pitch: number) {
    const sorted = [...ys].sort((a, b) => b - a);
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i - 1]! - sorted[i]!).toBeCloseTo(pitch, 6);
    }
  }
  for (const size of SOIC_FAMILY.sizes) {
    test(`soic ${size.label}`, () => {
      for (const density of DENSITIES) {
        const list = pads("soic", size.label, density);
        const xs = distinct(list.map((pad) => pad.centerMm.x));
        expect(xs).toHaveLength(2);
        expect(xs[0]!).toBeCloseTo(-xs[1]!, 6);
        expectPitch(list.filter((pad) => pad.centerMm.x < 0).map((pad) => pad.centerMm.y), size.params.pitchMm);
        expectPitch(list.filter((pad) => pad.centerMm.x > 0).map((pad) => pad.centerMm.y), size.params.pitchMm);
      }
    });
  }
  for (const size of QFP_FAMILY.sizes) {
    test(`qfp ${size.label}`, () => {
      for (const density of DENSITIES) {
        const list = pads("qfp", size.label, density);
        const perSide = size.params.pinCount / 4;
        const sides = [0, 1, 2, 3].map((side) => list.slice(side * perSide, (side + 1) * perSide));
        const [left, bottom, right, top] = sides as [FootprintRenderSourcePad[], FootprintRenderSourcePad[], FootprintRenderSourcePad[], FootprintRenderSourcePad[]];
        const span = right[0]!.centerMm.x;
        expect(distinct(left.map((pad) => pad.centerMm.x))).toEqual([-span]);
        expect(distinct(right.map((pad) => pad.centerMm.x))).toEqual([span]);
        expect(distinct(bottom.map((pad) => pad.centerMm.y))).toEqual([-span]);
        expect(distinct(top.map((pad) => pad.centerMm.y))).toEqual([span]);
        expectPitch(left.map((pad) => pad.centerMm.y), size.params.pitchMm);
        expectPitch(bottom.map((pad) => pad.centerMm.x), size.params.pitchMm);
      }
    });
  }
  test("chip pads mirror about the origin at every size and density", () => {
    for (const size of CHIP_FAMILY.sizes) {
      for (const density of DENSITIES) {
        const [p1, p2] = pads("chip", size.label, density);
        expect(p1!.centerMm.x).toBeCloseTo(-p2!.centerMm.x, 6);
        expect(p1!.centerMm.y).toBe(0);
      }
    }
  });
});

describe("chip presets against their cited resistor drawings (IPC-7351B nominal land)", () => {
  test("every chip preset has a drawing and a KiCad oracle row", () => {
    const labels = CHIP_FAMILY.sizes.map((size) => size.label).sort();
    expect(Object.keys(CHIP_DRAWINGS).sort()).toEqual(labels);
    for (const label of labels) expect(KICAD_ORACLE[label]).toBeDefined();
  });
  for (const [label, drawing] of Object.entries(CHIP_DRAWINGS)) {
    for (const density of DENSITIES) {
      test(`${label} ${density} — ${drawing.source}`, () => {
        const add = CHIP_ADDITIONS[density];
        const body = nominal(drawing.bodyLength);
        const width = nominal(drawing.bodyWidth);
        const terminal = nominal(drawing.terminalLength);
        const expectedX = (body - terminal) / 2 + (add.toe - add.heel) / 2;
        const expectedLength = terminal + add.toe + add.heel;
        const expectedWidth = width + 2 * add.side;
        const source = generateFootprint("chip", label, density).source;

        expect(numbers(source.pads)).toEqual(["1", "2"]);
        source.pads.forEach((pad, index) => {
          expect(pad.centerMm.x).toBeCloseTo(index === 0 ? -expectedX : expectedX, 4);
          expect(pad.centerMm.y).toBe(0);
          expect(pad.rotationDeg).toBe(0);
          expect(pad.widthMm).toBeCloseTo(expectedLength, 4);
          expect(pad.heightMm).toBeCloseTo(expectedWidth, 4);
          // The land covers the whole nominal terminal (inner end to body end).
          const outer = Math.abs(pad.centerMm.x) + pad.widthMm / 2;
          const inner = Math.abs(pad.centerMm.x) - pad.widthMm / 2;
          expect(outer).toBeGreaterThanOrEqual(body / 2 - TOL);
          expect(inner).toBeLessThanOrEqual(body / 2 - terminal + TOL);
        });

        // Silk is the body outline L (x) × W (y); courtyard = outer pad edges + 2c.
        const silk = rectOn(source.graphics, "F.SilkS");
        expect(silk.width).toBeCloseTo(body, 4);
        expect(silk.height).toBeCloseTo(width, 4);
        expect(silk.x + silk.width / 2).toBeCloseTo(0, 4);
        expect(silk.y + silk.height / 2).toBeCloseTo(0, 4);
        const courtyard = rectOn(source.graphics, "F.CrtYd");
        expect(courtyard.width).toBeCloseTo(2 * expectedX + expectedLength + 2 * add.courtyard, 4);
        expect(courtyard.height).toBeCloseTo(Math.max(width, expectedWidth) + 2 * add.courtyard, 4);
        expect(courtyard.x + courtyard.width / 2).toBeCloseTo(0, 4);
        expect(courtyard.y + courtyard.height / 2).toBeCloseTo(0, 4);
      });
    }
  }
});

describe("SOT presets against their cited drawings (IPC-7351B nominal land)", () => {
  for (const [label, drawing] of Object.entries(SOT_DRAWINGS)) {
    for (const density of DENSITIES) {
      test(`${label} ${density} — ${drawing.source}`, () => {
        const add = SOT_ADDITIONS[density];
        const span = nominal(drawing.span);
        const foot = nominal(drawing.footLength);
        const e = nominal(drawing.e);
        const expectedX = span / 2 - foot / 2 + (add.toe - add.heel) / 2;
        const expectedLength = foot + add.toe + add.heel;
        const list = pads("sot", label, density);

        const placements: { number: string; x: number; y: number; height: number }[] = [];
        const row = (pins: readonly (string | null)[], x: number) =>
          pins.forEach((number, slot) => {
            if (number !== null) {
              placements.push({
                number,
                x,
                y: ((pins.length - 1) * e) / 2 - slot * e,
                height: nominal(drawing.leadWidth) + 2 * add.side,
              });
            }
          });
        row(drawing.left, -expectedX);
        row(drawing.right, expectedX);
        if (drawing.tabNumber && drawing.tabWidth) {
          placements.push({
            number: drawing.tabNumber,
            x: expectedX,
            y: 0,
            height: nominal(drawing.tabWidth) + 2 * add.side,
          });
        }

        expect(list).toHaveLength(placements.length);
        for (const want of placements) {
          const pad = list.find((candidate) => candidate.number === want.number);
          expect(pad).toBeDefined();
          expect(pad!.centerMm.x).toBeCloseTo(want.x, 4);
          expect(pad!.centerMm.y).toBeCloseTo(want.y, 4);
          expect(pad!.widthMm).toBeCloseTo(expectedLength, 4);
          expect(pad!.heightMm).toBeCloseTo(want.height, 4);
        }
        // The land covers the whole nominal foot (heel to toe).
        for (const pad of list) {
          const outer = Math.abs(pad.centerMm.x) + pad.widthMm / 2;
          const inner = Math.abs(pad.centerMm.x) - pad.widthMm / 2;
          expect(outer).toBeGreaterThanOrEqual(span / 2 - TOL);
          expect(inner).toBeLessThanOrEqual(span / 2 - foot + TOL);
        }
      });
    }
  }
});

describe("SOIC presets against MS-012 / MS-013 drawings (IPC-7351B nominal land)", () => {
  test("every SOIC preset has a drawing and a KiCad oracle row", () => {
    const labels = SOIC_FAMILY.sizes.map((size) => size.label).sort();
    expect(Object.keys(SOIC_DRAWINGS).sort()).toEqual(labels);
    for (const label of labels) expect(KICAD_ORACLE[label]).toBeDefined();
  });
  test("SOIC oracle tolerances stay under the hard ceilings (centre 0.15, size 0.60)", () => {
    for (const size of SOIC_FAMILY.sizes) {
      const tolerance = KICAD_ORACLE_TOLERANCE[size.label]!;
      expect(tolerance.centerMm).toBeLessThanOrEqual(0.15);
      expect(tolerance.sizeMm).toBeLessThanOrEqual(0.6);
      expect(tolerance.largePadMm).toBeLessThanOrEqual(0.6);
    }
  });
  for (const [label, drawing] of Object.entries(SOIC_DRAWINGS)) {
    for (const density of DENSITIES) {
      test(`${label} ${density} — ${drawing.source}`, () => {
        const add = SOIC_ADDITIONS[density];
        const span = nominal(drawing.span);
        const foot = nominal(drawing.footLength);
        const e = nominal(drawing.e);
        const bodyWidth = nominal(drawing.bodyWidth);
        const bodyLength = nominal(drawing.bodyLength);
        const perSide = drawing.pins / 2;
        const rowOffset = ((perSide - 1) * e) / 2;
        const expectedX = span / 2 - foot / 2 + (add.toe - add.heel) / 2;
        const expectedLength = foot + add.toe + add.heel;
        const expectedWidth = nominal(drawing.leadWidth) + 2 * add.side;
        const source = generateFootprint("soic", label, density).source;

        // Pins 1…N/2 down the left row, N/2+1…N up the right row.
        expect(numbers(source.pads)).toEqual(sequence(drawing.pins));
        source.pads.forEach((pad, index) => {
          const left = index < perSide;
          const slot = left ? index : index - perSide;
          expect(pad.centerMm.x).toBeCloseTo(left ? -expectedX : expectedX, 4);
          expect(pad.centerMm.y).toBeCloseTo(left ? rowOffset - slot * e : -rowOffset + slot * e, 4);
          expect(pad.rotationDeg).toBe(0);
          expect(pad.widthMm).toBeCloseTo(expectedLength, 4);
          expect(pad.heightMm).toBeCloseTo(expectedWidth, 4);
          // The land covers the whole nominal foot (heel to tip).
          const outer = Math.abs(pad.centerMm.x) + pad.widthMm / 2;
          const inner = Math.abs(pad.centerMm.x) - pad.widthMm / 2;
          expect(outer).toBeGreaterThanOrEqual(span / 2 - TOL);
          expect(inner).toBeLessThanOrEqual(span / 2 - foot + TOL);
        });

        // Silk is the body outline E1 (x) × D (y); courtyard = outer pad edges + 2c.
        const silk = rectOn(source.graphics, "F.SilkS");
        expect(silk.width).toBeCloseTo(bodyWidth, 4);
        expect(silk.height).toBeCloseTo(bodyLength, 4);
        expect(silk.x + silk.width / 2).toBeCloseTo(0, 4);
        expect(silk.y + silk.height / 2).toBeCloseTo(0, 4);
        const outerEdge = Math.max(...source.pads.map((pad) => Math.abs(pad.centerMm.x) + pad.widthMm / 2));
        const courtyard = rectOn(source.graphics, "F.CrtYd");
        expect(courtyard.width).toBeCloseTo(2 * outerEdge + 2 * add.courtyard, 4);
        expect(courtyard.height).toBeCloseTo(Math.max(bodyLength, perSide * e) + 2 * add.courtyard, 4);
        expect(courtyard.x + courtyard.width / 2).toBeCloseTo(0, 4);
        expect(courtyard.y + courtyard.height / 2).toBeCloseTo(0, 4);
      });
    }
  }
});

describe("QFN presets against MO-220 drawings: lands and exposed pad", () => {
  for (const [label, drawing] of Object.entries(QFN_DRAWINGS)) {
    for (const density of DENSITIES) {
      test(`${label} ${density} — ${drawing.source}`, () => {
        const add = QFN_ADDITIONS[density];
        const body = nominal(drawing.body);
        const length = nominal(drawing.terminalLength);
        const e = nominal(drawing.e);
        const list = pads("qfn", label, density);
        const signal = list.slice(0, drawing.pins);
        const ep = list[drawing.pins]!;
        const perSide = drawing.pins / 4;

        const landCenter = body / 2 - length / 2 + (add.toe - add.heel) / 2;
        const landLength = length + add.toe + add.heel;
        const innerEdge = landCenter - landLength / 2;
        for (const pad of signal) {
          const along = Math.abs(pad.centerMm.x) > Math.abs(pad.centerMm.y) ? pad.heightMm : pad.widthMm;
          const across = along === pad.heightMm ? pad.widthMm : pad.heightMm;
          expect(Math.max(Math.abs(pad.centerMm.x), Math.abs(pad.centerMm.y))).toBeCloseTo(landCenter, 4);
          expect(across).toBeCloseTo(landLength, 4);
          expect(along).toBeCloseTo(nominal(drawing.terminalWidth) + 2 * add.side, 4);
        }
        const left = signal.slice(0, perSide);
        for (let i = 1; i < perSide; i += 1) {
          expect(left[i - 1]!.centerMm.y - left[i]!.centerMm.y).toBeCloseTo(e, 6);
        }

        expect(ep.number).toBe(String(drawing.pins + 1));
        expect(ep.centerMm).toEqual({ x: 0, y: 0 });
        expect(ep.widthMm).toBe(ep.heightMm);
        const expectedEp = Math.min(nominal(drawing.exposedPad), 2 * (innerEdge - QFN_EP_MIN_GAP_MM));
        expect(ep.widthMm).toBeCloseTo(expectedEp, 4);
        for (const pad of signal) {
          expect(padGap(ep, pad)).toBeGreaterThanOrEqual(QFN_EP_MIN_GAP_MM - TOL);
        }
      });
    }
  }

  test("an exposed pad larger than the lands allow is clamped to the minimum gap", () => {
    const qfn16 = QFN_FAMILY.sizes.find((size) => size.label === "QFN-16")!.params;
    const result = calculateQfnPads({ ...qfn16, exposedPadMm: 3.0 }, QFN_ADDITIONS.most);
    const signal = result.pads.slice(0, 16);
    const ep = result.pads[16]!;
    // Lands end 1.5 − 0.8 / 2 = 1.1 mm from centre, so the paddle stops at 0.9.
    expect(ep.widthMm).toBeCloseTo(1.8, 6);
    expect(Math.min(...signal.map((pad) => padGap(ep, pad)))).toBeCloseTo(QFN_EP_MIN_GAP_MM, 6);
  });
});

describe("chip / SOT / SOIC / QFN against KiCad standard-library footprints (nominal density)", () => {
  for (const [label, oracle] of Object.entries(KICAD_ORACLE)) {
    const tolerance = KICAD_ORACLE_TOLERANCE[label]!;
    test(`${label} ≈ ${oracle.file} (centre ±${tolerance.centerMm}, size ±${tolerance.sizeMm}/${tolerance.largePadMm} mm)`, () => {
      const list = pads(familyOf(label), label, "nominal");
      expect(numbers(list).sort()).toEqual(oracle.pads.map(([number]) => number).sort());
      for (const [number, x, y, sizeX, sizeY] of oracle.pads) {
        const pad = list.find((candidate) => candidate.number === number)!;
        const large = Math.min(sizeX, sizeY) > 1.2;
        const sizeTolerance = large ? tolerance.largePadMm : tolerance.sizeMm;
        expect(Math.abs(pad.centerMm.x - x)).toBeLessThanOrEqual(tolerance.centerMm + TOL);
        expect(Math.abs(pad.centerMm.y - -y)).toBeLessThanOrEqual(tolerance.centerMm + TOL);
        expect(Math.abs(pad.widthMm - sizeX)).toBeLessThanOrEqual(sizeTolerance + TOL);
        expect(Math.abs(pad.heightMm - sizeY)).toBeLessThanOrEqual(sizeTolerance + TOL);
      }
    });
  }
});
