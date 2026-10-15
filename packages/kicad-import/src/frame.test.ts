import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { parseKicadFootprint } from "@openpcb/kicad-parsers";
import type { PointMm, PreviewGraphic } from "@openpcb/rendering-core";
import { buildFootprintPreviewFromParsed } from "./build-preview-models.js";
import {
  KICAD_FOOTPRINT_FRAME_STAMP,
  kicadPadToCanonical,
  kicadPointToCanonical,
} from "./frame.js";
import * as publicApi from "./index.js";
import { parseImportBundle } from "./inspect.js";
import type { FootprintFrameStamp, FootprintPreviewModel } from "./types.js";

// KF1 (OPENPCB-61 §3.1.2): KiCad footprint files are Y-down (K), the preview
// is Y-up (C). N = diag(1, −1): points are negated in y, angles unchanged.
// Every expectation below is written out by hand from the KiCad source text,
// never recorded from the builder's output.

const build = (source: string): FootprintPreviewModel =>
  buildFootprintPreviewFromParsed(parseKicadFootprint(source));

function padNumbered(model: FootprintPreviewModel, number: string) {
  const pad = model.pads.find((p) => p.number === number);
  if (!pad) throw new Error(`pad ${number} missing`);
  return pad;
}

function expectPoint(actual: PointMm, expected: PointMm): void {
  expect(actual.x).toBeCloseTo(expected.x, 12);
  expect(actual.y).toBeCloseTo(expected.y, 12);
}

/** Shoelace signed area: > 0 when the points run CCW in a Y-up frame. */
function signedArea(points: readonly PointMm[]): number {
  let sum = 0;
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length]!;
    sum += p.x * q.y - q.x * p.y;
  });
  return sum / 2;
}

function graphicsOn(model: FootprintPreviewModel, layer: string, kind: string) {
  return model.graphics.filter((g) => g.layer === layer && g.kind === kind);
}

// ── Goldens: references/kicad-libs/kicad-footprints @ cb8299c (excerpts) ──

// Package_TO_SOT_SMD.pretty/SOT-23.kicad_mod — pads, two silk lines, three
// courtyard lines, the F.Fab body with its pin-1 chamfer, and the texts.
const SOT23 = `(footprint "SOT-23" (layer "F.Cu") (attr smd)
  (property "Reference" "REF**" (at 0 -2.4 0) (layer "F.SilkS") (effects (font (size 1 1) (thickness 0.15))))
  (property "Value" "SOT-23" (at 0 2.4 0) (layer "F.Fab") (effects (font (size 1 1) (thickness 0.15))))
  (fp_line (start -0.76 -1.56) (end 0.76 -1.56) (stroke (width 0.12) (type solid)) (layer "F.SilkS"))
  (fp_line (start 0.76 0.56) (end 0.76 1.56) (stroke (width 0.12) (type solid)) (layer "F.SilkS"))
  (fp_line (start -1.93 -1.5) (end -0.9 -1.5) (stroke (width 0.05) (type solid)) (layer "F.CrtYd"))
  (fp_line (start -0.9 -1.7) (end 0.9 -1.7) (stroke (width 0.05) (type solid)) (layer "F.CrtYd"))
  (fp_line (start 1.93 -0.55) (end 1.93 0.55) (stroke (width 0.05) (type solid)) (layer "F.CrtYd"))
  (fp_poly (pts (xy -0.325 -1.45) (xy 0.65 -1.45) (xy 0.65 1.45) (xy -0.65 1.45) (xy -0.65 -1.125))
    (stroke (width 0.1) (type solid)) (fill no) (layer "F.Fab"))
  (fp_text user "\${REFERENCE}" (at 0 0 90) (layer "F.Fab") (effects (font (size 0.72 0.72) (thickness 0.11))))
  (pad "1" smd roundrect (at -0.9375 -0.95) (size 1.475 0.6) (layers "F.Cu" "F.Mask" "F.Paste") (roundrect_rratio 0.25))
  (pad "2" smd roundrect (at -0.9375 0.95) (size 1.475 0.6) (layers "F.Cu" "F.Mask" "F.Paste") (roundrect_rratio 0.25))
  (pad "3" smd roundrect (at 0.9375 0) (size 1.475 0.6) (layers "F.Cu" "F.Mask" "F.Paste") (roundrect_rratio 0.25))
)`;

// Package_SO.pretty/SOIC-8_3.9x4.9mm_P1.27mm.kicad_mod — the eight pads.
const SOIC8_PAD_AT: ReadonlyArray<readonly [string, number, number]> = [
  ["1", -2.475, -1.905],
  ["2", -2.475, -0.635],
  ["3", -2.475, 0.635],
  ["4", -2.475, 1.905],
  ["5", 2.475, 1.905],
  ["6", 2.475, 0.635],
  ["7", 2.475, -0.635],
  ["8", 2.475, -1.905],
];
const SOIC8 = `(footprint "SOIC-8_3.9x4.9mm_P1.27mm" (layer "F.Cu") (attr smd)
${SOIC8_PAD_AT.map(
  ([n, x, y]) =>
    `  (pad "${n}" smd roundrect (at ${x} ${y}) (size 1.95 0.6) (layers "F.Cu" "F.Mask" "F.Paste") (roundrect_rratio 0.25))`,
).join("\n")}
)`;

// Capacitor_SMD.pretty/CP_Elec_4x5.4.kicad_mod — the silk "+" polarity
// marker, the fab body circle and both pads.
const CP_ELEC = `(footprint "CP_Elec_4x5.4" (layer "F.Cu") (attr smd)
  (fp_line (start -3 -1.56) (end -2.5 -1.56) (stroke (width 0.12) (type solid)) (layer "F.SilkS"))
  (fp_line (start -2.75 -1.81) (end -2.75 -1.31) (stroke (width 0.12) (type solid)) (layer "F.SilkS"))
  (fp_circle (center 0 0) (end 2 0) (stroke (width 0.1) (type solid)) (fill no) (layer "F.Fab"))
  (pad "1" smd roundrect (at -1.8 0) (size 2.6 1.6) (layers "F.Cu" "F.Mask" "F.Paste") (roundrect_rratio 0.15625))
  (pad "2" smd roundrect (at 1.8 0) (size 2.6 1.6) (layers "F.Cu" "F.Mask" "F.Paste") (roundrect_rratio 0.15625))
)`;

// Synthetic probe: asymmetric numbered THT pads, an offset drill on a 30° pad,
// an oval slot, an NPTH, an arc, a polygon, a rect, a circle and a 45° text.
const FRAME_PROBE = `(footprint "FRAME_PROBE" (layer "F.Cu") (attr through_hole)
  (fp_text reference "REF**" (at 1 -2 45) (layer "F.SilkS") (effects (font (size 1 1) (thickness 0.15))))
  (fp_arc (start 0 -1) (mid 1 0) (end 0 1) (stroke (width 0.12) (type solid)) (layer "F.SilkS"))
  (fp_poly (pts (xy 0 0) (xy 2 0) (xy 2 -1)) (stroke (width 0.1) (type solid)) (fill no) (layer "F.Fab"))
  (fp_rect (start -1 -3) (end 3 -0.5) (stroke (width 0.05) (type solid)) (fill no) (layer "F.CrtYd"))
  (fp_circle (center -2 -1) (end -1.5 -1) (stroke (width 0.1) (type solid)) (fill no) (layer "F.Fab"))
  (pad "1" thru_hole rect (at -1 -2) (size 1.7 1.7) (drill 1) (layers "*.Cu" "*.Mask"))
  (pad "2" thru_hole oval (at 1 -2 30) (size 2 1.4) (drill 0.8 (offset 0.3 0.2)) (layers "*.Cu" "*.Mask"))
  (pad "3" thru_hole oval (at 3 -2 90) (size 1.2 2.4) (drill oval 0.6 1.6) (layers "*.Cu" "*.Mask"))
  (pad "" np_thru_hole circle (at 0 -4) (size 2.2 2.2) (drill 2.2) (layers "*.Cu" "*.Mask"))
)`;

// A symbol library exercising every symbol graphic kind, a text and three
// pins at asymmetric positions (Y-up `.kicad_sym` coordinates).
const FRAME_SYMBOL_LIB = `(kicad_symbol_lib (version 20231120) (generator "frame-test")
  (symbol "FRAME_SYM" (pin_names (offset 0.508)) (in_bom yes) (on_board yes)
    (property "Reference" "U" (at 0 6.35 0) (effects (font (size 1.27 1.27))))
    (property "Value" "FRAME_SYM" (at 0 -6.35 0) (effects (font (size 1.27 1.27))))
    (symbol "FRAME_SYM_0_1"
      (rectangle (start -5.08 5.08) (end 5.08 -2.54) (stroke (width 0.254) (type default)) (fill (type background)))
      (polyline (pts (xy -2.54 2.54) (xy 0 3.81) (xy 2.54 2.54)) (stroke (width 0) (type default)) (fill (type none)))
      (arc (start 1.27 0) (mid 0 1.27) (end -1.27 0) (stroke (width 0) (type default)) (fill (type none)))
      (circle (center 2.54 -1.27) (radius 0.635) (stroke (width 0) (type default)) (fill (type none)))
      (text "+" (at -3.81 3.81 0) (effects (font (size 1.27 1.27))))
    )
    (symbol "FRAME_SYM_1_1"
      (pin input line (at -7.62 2.54 0) (length 2.54) (name "IN" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
      (pin output line (at 7.62 1.27 180) (length 2.54) (name "OUT" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
      (pin power_in line (at 0 -5.08 90) (length 2.54) (name "GND" (effects (font (size 1.27 1.27)))) (number "3" (effects (font (size 1.27 1.27)))))
    )
  )
)`;

describe("kicadPointToCanonical / kicadPadToCanonical", () => {
  test("negates y, keeps x, never emits a signed zero", () => {
    expect(kicadPointToCanonical({ x: 1.5, y: -2 })).toEqual({ x: 1.5, y: 2 });
    expect(Object.is(kicadPointToCanonical({ x: 1, y: 0 }).y, 0)).toBe(true);
    expect(Object.is(kicadPointToCanonical({ x: 1, y: -0 }).y, 0)).toBe(true);
  });

  test("a missing or (0, 0) offset leaves drillOffsetMm absent", () => {
    for (const drillOffset of [undefined, { x: 0, y: 0 }]) {
      const out = kicadPadToCanonical({
        position: { x: 1, y: -2 },
        rotation: 30,
        ...(drillOffset ? { drillOffset } : {}),
      });
      expect(out).toEqual({ centerMm: { x: 1, y: 2 } });
      expect("drillOffsetMm" in out).toBe(false);
    }
  });

  // Cardinal angles are exact, as KiCad's RotatePoint special-cases them:
  // N·(0.3, 0.2) = (0.3, −0.2); R(90)·(0.3, −0.2) = (0.2, 0.3) and
  // R(270)·(0.3, −0.2) = (−0.2, −0.3).
  test("cardinal pad angles shift the copper exactly", () => {
    const at90 = kicadPadToCanonical({
      position: { x: 0, y: 0 },
      rotation: 90,
      drillOffset: { x: 0.3, y: 0.2 },
    });
    expect(at90).toEqual({
      centerMm: { x: 0.2, y: 0.3 },
      drillOffsetMm: { x: -0.3, y: 0.2 },
    });
    const atMinus90 = kicadPadToCanonical({
      position: { x: 0, y: 0 },
      rotation: -90,
      drillOffset: { x: 0.3, y: 0.2 },
    });
    expect(atMinus90.centerMm).toEqual({ x: -0.2, y: -0.3 });
  });

  // −N·(0, 0.2) = (−0, 0.2): the x must be stored as +0.
  test("a drill offset on one axis emits no signed zero", () => {
    const out = kicadPadToCanonical({
      position: { x: 0, y: 0 },
      rotation: 0,
      drillOffset: { x: 0, y: 0.2 },
    });
    expect(Object.is(out.drillOffsetMm!.x, 0)).toBe(true);
    expect(out.centerMm).toEqual({ x: 0, y: -0.2 });
  });
});

describe("goldens (references/kicad-libs @ cb8299c)", () => {
  test("SOT-23: pad 1 top-left, pad 2 bottom-left, pad 3 right", () => {
    const model = build(SOT23);
    expect(padNumbered(model, "1").centerMm).toEqual({ x: -0.9375, y: 0.95 });
    expect(padNumbered(model, "2").centerMm).toEqual({ x: -0.9375, y: -0.95 });
    expect(padNumbered(model, "3").centerMm).toEqual({ x: 0.9375, y: 0 });
    expect(Object.is(padNumbered(model, "3").centerMm.y, 0)).toBe(true);
    // Pad identity and shape are untouched by the frame.
    expect(model.pads.map((p) => p.id)).toEqual(["1:0", "2:1", "3:2"]);
    const pad1 = padNumbered(model, "1");
    expect([
      pad1.widthMm,
      pad1.heightMm,
      pad1.rotationDeg,
      pad1.roundrectRatio,
    ]).toEqual([1.475, 0.6, 0, 0.25]);
  });

  test("SOT-23: the F.Fab pin-1 chamfer sits on pad 1's corner", () => {
    const body = graphicsOn(build(SOT23), "F.Fab", "polyline")[0] as Extract<
      PreviewGraphic,
      { kind: "polyline" }
    >;
    expect(body.points).toEqual([
      { x: -0.325, y: 1.45 },
      { x: 0.65, y: 1.45 },
      { x: 0.65, y: -1.45 },
      { x: -0.65, y: -1.45 },
      { x: -0.65, y: 1.125 },
    ]);
  });

  test("SOT-23: the reference sits above the body, its id carries the converted anchor", () => {
    const ref = build(SOT23).labels.find((l) => l.role === "reference")!;
    expect(ref.at).toEqual({ x: 0, y: 2.4 });
    expect(ref.id).toBe("fp-text:F.SilkS:0:2.4:REF**");
    const fabRef = build(SOT23).labels.find(
      (l) => l.layer === "F.Fab" && l.role === "footprint-text",
    )!;
    expect(fabRef.rotationDeg).toBe(90);
  });

  test("SOIC-8: pins 1..4 left top→bottom, 5..8 right bottom→top (CCW from the top)", () => {
    const model = build(SOIC8);
    const centres = SOIC8_PAD_AT.map(([n]) => padNumbered(model, n).centerMm);
    expect(centres).toEqual([
      { x: -2.475, y: 1.905 },
      { x: -2.475, y: 0.635 },
      { x: -2.475, y: -0.635 },
      { x: -2.475, y: -1.905 },
      { x: 2.475, y: -1.905 },
      { x: 2.475, y: -0.635 },
      { x: 2.475, y: 0.635 },
      { x: 2.475, y: 1.905 },
    ]);
    expect(signedArea(centres)).toBeGreaterThan(0);
    // The same numbering read in the raw Y-down coordinates runs the other way.
    expect(signedArea(SOIC8_PAD_AT.map(([, x, y]) => ({ x, y })))).toBeLessThan(
      0,
    );
  });

  test('CP_Elec_4x5.4: the silk "+" is top-left', () => {
    const model = build(CP_ELEC);
    const lines = graphicsOn(model, "F.SilkS", "line") as Array<
      Extract<PreviewGraphic, { kind: "line" }>
    >;
    expect(lines[0]).toMatchObject({
      a: { x: -3, y: 1.56 },
      b: { x: -2.5, y: 1.56 },
    });
    expect(lines[1]).toMatchObject({
      a: { x: -2.75, y: 1.81 },
      b: { x: -2.75, y: 1.31 },
    });
    const circle = graphicsOn(model, "F.Fab", "circle")[0]!;
    expect(circle).toMatchObject({ center: { x: 0, y: 0 }, radiusMm: 2 });
    expect(padNumbered(model, "1").centerMm).toEqual({ x: -1.8, y: 0 });
  });
});

describe("FRAME_PROBE: offset drill, slot, NPTH, graphics", () => {
  const model = build(FRAME_PROBE);

  test("offset drill: the hole stays at N·at, the copper moves by R(α)·N·offset", () => {
    const pad2 = padNumbered(model, "2");
    expect(pad2.rotationDeg).toBe(30);
    expect(pad2.drillOffsetMm).toEqual({ x: -0.3, y: 0.2 });
    // (1, 2) + R(30)·(0.3, −0.2) = (1 + 0.3·cos30 + 0.2·sin30, 2 + 0.3·sin30 − 0.2·cos30)
    expectPoint(pad2.centerMm, {
      x: 1.3598076211353316,
      y: 1.9767949192431122,
    });
    const r = (30 * Math.PI) / 180;
    const off = pad2.drillOffsetMm!;
    expectPoint(
      {
        x: pad2.centerMm.x + off.x * Math.cos(r) - off.y * Math.sin(r),
        y: pad2.centerMm.y + off.x * Math.sin(r) + off.y * Math.cos(r),
      },
      { x: 1, y: 2 },
    );
  });

  // Independent route: KiCad's own ShapePos in K, then N. RotatePoint is
  // x' = y·sin + x·cos, y' = y·cos − x·sin (libs/kimath trigo.cpp).
  test("offset drill agrees with KiCad ShapePos computed in the KiCad frame", () => {
    const r = (30 * Math.PI) / 180;
    const [ox, oy] = [0.3, 0.2];
    const copperK = {
      x: 1 + (oy * Math.sin(r) + ox * Math.cos(r)),
      y: -2 + (oy * Math.cos(r) - ox * Math.sin(r)),
    };
    expectPoint(padNumbered(model, "2").centerMm, {
      x: copperK.x,
      y: -copperK.y,
    });
  });

  test("slot, NPTH and plain pads keep their shape; only y flips", () => {
    expect(padNumbered(model, "1").centerMm).toEqual({ x: -1, y: 2 });
    const pad3 = padNumbered(model, "3");
    expect(pad3.centerMm).toEqual({ x: 3, y: 2 });
    expect(pad3.rotationDeg).toBe(90);
    expect(pad3.drillSlotMm).toEqual({ widthMm: 0.6, heightMm: 1.6 });
    const npth = model.pads.find((p) => p.number === "")!;
    expect(npth.centerMm).toEqual({ x: 0, y: 4 });
    expect(npth.plated).toBe(false);
  });

  test("an arc keeps its mid on the arc and reverses its signed turn", () => {
    const arc = graphicsOn(model, "F.SilkS", "arc3")[0] as Extract<
      PreviewGraphic,
      { kind: "arc3" }
    >;
    expect([arc.start, arc.mid, arc.end]).toEqual([
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
    ]);
    expect(Math.hypot(arc.mid.x, arc.mid.y)).toBeCloseTo(1, 12);
    const turn = (s: PointMm, m: PointMm, e: PointMm) =>
      (m.x - s.x) * (e.y - m.y) - (m.y - s.y) * (e.x - m.x);
    expect(turn({ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 })).toBe(2);
    expect(turn(arc.start, arc.mid, arc.end)).toBe(-2);
  });

  test("a text at (1, −2, 45°) becomes (1, 2, 45°)", () => {
    const ref = model.labels.find((l) => l.role === "reference")!;
    expect(ref.at).toEqual({ x: 1, y: 2 });
    expect(ref.rotationDeg).toBe(45);
  });

  test("polygon winding reverses; rect and circle map their corners/centre", () => {
    const poly = graphicsOn(model, "F.Fab", "polyline")[0] as Extract<
      PreviewGraphic,
      { kind: "polyline" }
    >;
    expect(
      signedArea([
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: -1 },
      ]),
    ).toBe(-1);
    expect(signedArea(poly.points)).toBe(1);
    // K corners (−1, −3)/(3, −0.5) → C (−1, 3)/(3, 0.5): origin is the C min corner.
    expect(graphicsOn(model, "F.CrtYd", "rect")[0]).toMatchObject({
      x: -1,
      y: 0.5,
      width: 4,
      height: 2.5,
    });
    expect(graphicsOn(model, "F.Fab", "circle")[0]).toMatchObject({
      center: { x: -2, y: 1 },
      radiusMm: 0.5,
    });
  });

  test("paste sub-pads are converted like any pad", () => {
    const qfn = build(`(footprint "Q" (layer "F.Cu")
      (pad "1" smd rect (at 0 -1) (size 2 2) (layers "F.Cu" "F.Paste" "F.Mask"))
      (pad "" smd rect (at -0.5 -1.2) (size 0.8 0.8) (layers "F.Paste")))`);
    const sub = qfn.pads.find((p) => p.role === "paste")!;
    expect(sub.id).toBe("?:1");
    expect(sub.centerMm).toEqual({ x: -0.5, y: 1.2 });
  });

  // A parser build that does not populate `text` falls back to the raw
  // `(at x y angle)` node; that path converts the anchor too.
  test("the legacy text fallback converts its anchor", () => {
    const raw = parseKicadFootprint(`(footprint "T" (layer "F.Cu"))`);
    const legacyText = {
      type: "text" as const,
      layer: "F.SilkS",
      data: { __args: ["user", "X"], at: [1, -2, 45] },
    };
    const label = buildFootprintPreviewFromParsed({
      ...raw,
      graphics: [legacyText],
    }).labels[0]!;
    expect(label.at).toEqual({ x: 1, y: 2 });
    expect(label.rotationDeg).toBe(45);
    expect(label.id).toBe("fp-text:F.SilkS:1:2:X");
  });
});

describe("contract: stamp, raw immutability, symbol path", () => {
  test("every built model carries the frozen v1 stamp", () => {
    const expected: FootprintFrameStamp = {
      frame: "openpcb-y-up",
      origin: "kicad-converted",
      transformVersion: 1,
      tool: "@openpcb/kicad-import",
    };
    for (const source of [SOT23, SOIC8, CP_ELEC, FRAME_PROBE]) {
      expect(build(source).frame).toEqual(expected);
    }
    expect(Object.isFrozen(KICAD_FOOTPRINT_FRAME_STAMP)).toBe(true);
    const bundle = parseImportBundle({
      footprints: [{ fileName: "SOT-23.kicad_mod", content: SOT23 }],
    });
    expect(bundle.normalizedFootprints[0]!.preview.frame).toEqual(expected);
    // OpenPCB detects a qualified package through this public value export.
    expect(publicApi.KICAD_FOOTPRINT_TRANSFORM_VERSION).toBe(1);
  });

  test("the parsed raw is never mutated (deep-frozen input)", () => {
    const deepFreeze = <T>(value: T): T => {
      if (value && typeof value === "object" && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const child of Object.values(value)) deepFreeze(child);
      }
      return value;
    };
    const raw = parseKicadFootprint(FRAME_PROBE);
    const before = structuredClone(raw);
    deepFreeze(raw);
    expect(() => buildFootprintPreviewFromParsed(raw)).not.toThrow();
    expect(raw).toEqual(before);
    expect(raw.pads[1]!.position).toEqual({ x: 1, y: -2 });
    expect(raw.pads[1]!.drillOffset).toEqual({ x: 0.3, y: 0.2 });
  });

  // `.kicad_sym` coordinates are Y-up already: the symbol builder must be
  // byte-identical to before the frame change. The hash was taken from
  // `@openpcb/kicad-import` at shared 91c7e7e (pre-SH1) on this fixture.
  test("symbol previews are byte-identical to the pre-frame builder", () => {
    const bundle = parseImportBundle({
      symbolLibrary: { fileName: "frame.kicad_sym", content: FRAME_SYMBOL_LIB },
      footprints: [],
    });
    const preview = bundle.normalizedSymbols[0]!.preview;
    expect(preview.pins.map((p) => [p.id, p.anchor.x, p.anchor.y])).toEqual([
      ["u1:1", -7.62, 2.54],
      ["u1:2", 7.62, 1.27],
      ["u1:3", 0, -5.08],
    ]);
    expect(
      createHash("sha256").update(JSON.stringify(preview)).digest("hex"),
    ).toBe("5a68a988a7840fbc442ce5743057ca92b88de6d3a5ec185419b00b37a325f885");
  });
});
