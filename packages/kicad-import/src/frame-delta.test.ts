import { describe, expect, test } from "bun:test";
import { parseKicadFootprint } from "@openpcb/kicad-parsers";
import type {
  FootprintRenderModel,
  FootprintRenderSourcePad,
  PreviewGraphic,
  PreviewLabel,
} from "@openpcb/rendering-core";
import { buildFootprintPreviewFromParsed } from "./build-preview-models.js";
import { compareFrameConversion } from "./frame-delta.js";
import { KICAD_FOOTPRINT_FRAME_STAMP } from "./frame.js";
import type { FootprintPreviewModel } from "./types.js";

const build = (source: string): FootprintPreviewModel =>
  buildFootprintPreviewFromParsed(parseKicadFootprint(source));

// references/kicad-libs/kicad-footprints @ cb8299c,
// Package_TO_SOT_SMD.pretty/SOT-23.kicad_mod (the excerpt frame.test.ts uses).
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

// What the pre-0.2.0 builder stored for the SOT23 excerpt: every coordinate
// verbatim from the file (Y-down), no stamp. KiCad 6+ `(stroke (width …))` is
// not read by the builder, so every stroke is its 0.12 default.
function smdPad(id: string, x: number, y: number): FootprintRenderSourcePad {
  return {
    id,
    number: id.split(":")[0]!,
    shape: "roundrect",
    centerMm: { x, y },
    widthMm: 1.475,
    heightMm: 0.6,
    rotationDeg: 0,
    roundrectRatio: 0.25,
    layer: "F.Cu",
  };
}
const kLine = (
  layer: string,
  a: [number, number],
  b: [number, number],
): PreviewGraphic => ({
  kind: "line",
  a: { x: a[0], y: a[1] },
  b: { x: b[0], y: b[1] },
  strokeWidthMm: 0.12,
  layer,
});
const kLabel = (
  text: string,
  at: [number, number],
  layer: string,
  role: PreviewLabel["role"],
  extra: Partial<PreviewLabel> = {},
): PreviewLabel => ({
  id: `fp-text:${layer}:${at[0]}:${at[1]}:${text}`,
  text,
  at: { x: at[0], y: at[1] },
  fontSizeMm: 1,
  rotationDeg: 0,
  anchorX: "center",
  anchorY: "middle",
  layer,
  role,
  ...extra,
});
const SOT23_COURTYARD_K = [
  kLine("F.CrtYd", [-1.93, -1.5], [-0.9, -1.5]),
  kLine("F.CrtYd", [-0.9, -1.7], [0.9, -1.7]),
  kLine("F.CrtYd", [1.93, -0.55], [1.93, 0.55]),
];
const LEGACY_SOT23: FootprintRenderModel = {
  kind: "footprint",
  units: "mm",
  name: "SOT-23",
  pads: [
    smdPad("1:0", -0.9375, -0.95),
    smdPad("2:1", -0.9375, 0.95),
    smdPad("3:2", 0.9375, 0),
  ],
  graphics: [
    kLine("F.SilkS", [-0.76, -1.56], [0.76, -1.56]),
    kLine("F.SilkS", [0.76, 0.56], [0.76, 1.56]),
    ...SOT23_COURTYARD_K,
    {
      kind: "polyline",
      points: [
        { x: -0.325, y: -1.45 },
        { x: 0.65, y: -1.45 },
        { x: 0.65, y: 1.45 },
        { x: -0.65, y: 1.45 },
        { x: -0.65, y: -1.125 },
      ],
      closed: true,
      fill: "none",
      strokeWidthMm: 0.12,
      layer: "F.Fab",
    },
  ],
  labels: [
    {
      ...kLabel("REF**", [0, 0], "F.Fab", "footprint-text", {
        fontSizeMm: 0.72,
        rotationDeg: 90,
      }),
      id: "fp-text:F.Fab:0:0:${REFERENCE}",
    },
    kLabel("REF**", [0, -2.4], "F.SilkS", "reference"),
    kLabel("SOT-23", [0, 2.4], "F.Fab", "value"),
  ],
  bounds: null,
  warnings: [],
};

describe("compareFrameConversion", () => {
  const next = build(SOT23);

  test("frame-only SOT-23 → frameOnly; only the stamp and the moved label ids are reported", () => {
    const delta = compareFrameConversion(LEGACY_SOT23, next);
    expect(delta).toEqual({
      frameOnly: true,
      padViolations: [],
      additions: [
        { kind: "frame-stamp", count: 1 },
        { kind: "label-id", count: 2 },
      ],
      other: [],
    });
    // Stored rows are JSON: a round trip (undefined keys dropped, stamp no
    // longer frozen) must not change the verdict.
    const stored = <T>(value: T): T => JSON.parse(JSON.stringify(value));
    expect(compareFrameConversion(stored(LEGACY_SOT23), stored(next))).toEqual(
      delta,
    );
  });

  test("a pad size change → padViolations", () => {
    const old = {
      ...LEGACY_SOT23,
      pads: [
        { ...LEGACY_SOT23.pads[0]!, widthMm: 1.5 },
        ...LEGACY_SOT23.pads.slice(1),
      ],
    };
    const delta = compareFrameConversion(old, next);
    expect(delta.frameOnly).toBe(false);
    expect(delta.padViolations).toEqual([
      { padId: "1:0", field: "widthMm", old: 1.5, new: 1.475 },
    ]);
  });

  test("an added courtyard → additions, still frameOnly", () => {
    const old = {
      ...LEGACY_SOT23,
      graphics: LEGACY_SOT23.graphics.filter((g) => g.layer !== "F.CrtYd"),
    };
    const delta = compareFrameConversion(old, next);
    expect(delta.frameOnly).toBe(true);
    expect(delta.additions).toContainEqual({
      kind: "courtyard-graphics",
      count: 3,
    });
  });

  test("an added slot → other (never silent)", () => {
    const slotted = build(`(footprint "S" (layer "F.Cu")
      (pad "1" thru_hole oval (at 0 -1) (size 1.2 2.4) (drill oval 0.6 1.6) (layers "*.Cu" "*.Mask")))`);
    const old: FootprintRenderModel = {
      ...LEGACY_SOT23,
      graphics: [],
      labels: [],
      pads: [
        {
          id: "1:0",
          number: "1",
          shape: "oval",
          centerMm: { x: 0, y: -1 },
          widthMm: 1.2,
          heightMm: 2.4,
          rotationDeg: 0,
          drillDiameterMm: 0.6,
          layer: "*.Cu",
        },
      ],
    };
    const delta = compareFrameConversion(old, slotted);
    expect(delta.frameOnly).toBe(false);
    expect(delta.padViolations).toEqual([]);
    expect(delta.other).toEqual([
      { kind: "slot-drill-added", detail: "pad 1:0: oval drill 0.6 x 1.6" },
    ]);
  });

  test("a pad that did not move by N, or disappeared, is a violation", () => {
    const moved = {
      ...LEGACY_SOT23,
      pads: [smdPad("1:0", -0.9375, 0.95), ...LEGACY_SOT23.pads.slice(1)],
    };
    expect(compareFrameConversion(moved, next).padViolations).toEqual([
      {
        padId: "1:0",
        field: "centerMm",
        old: { x: -0.9375, y: -0.95 },
        new: { x: -0.9375, y: 0.95 },
      },
    ]);
    const extra = {
      ...LEGACY_SOT23,
      pads: [...LEGACY_SOT23.pads, smdPad("4:3", 2, 2)],
    };
    expect(compareFrameConversion(extra, next).padViolations).toEqual([
      { padId: "4:3", field: "present", old: true, new: false },
    ]);
  });

  test("an unconverted 'new' model is caught (guards a no-op builder)", () => {
    const delta = compareFrameConversion(LEGACY_SOT23, {
      ...(LEGACY_SOT23 as FootprintPreviewModel),
      frame: KICAD_FOOTPRINT_FRAME_STAMP,
    });
    expect(delta.frameOnly).toBe(false);
    expect(delta.padViolations.map((v) => `${v.padId}:${v.field}`)).toEqual([
      "1:0:centerMm",
      "2:1:centerMm",
    ]);
    expect(delta.other.map((o) => o.kind)).toContain("graphic-changed");
    expect(delta.other.map((o) => o.kind)).toContain("label-changed");
  });

  test("a moved silk line is reported as other", () => {
    const old = {
      ...LEGACY_SOT23,
      graphics: [
        kLine("F.SilkS", [-0.76, -1.6], [0.76, -1.6]),
        ...LEGACY_SOT23.graphics.slice(1),
      ],
    };
    const kinds = compareFrameConversion(old, next).other.map((o) => o.kind);
    expect(kinds).toEqual(["graphic-changed", "graphic-added"]);
  });

  test("the drill-offset shift is expected; a pre-offset preview is not frame-only", () => {
    const source = `(footprint "P" (layer "F.Cu")
      (pad "2" thru_hole oval (at 1 -2 30) (size 2 1.4) (drill 0.8 (offset 0.3 0.2)) (layers "*.Cu" "*.Mask")))`;
    const pad: FootprintRenderSourcePad = {
      id: "2:0",
      number: "2",
      shape: "oval",
      centerMm: { x: 1, y: -2 },
      widthMm: 2,
      heightMm: 1.4,
      rotationDeg: 30,
      drillDiameterMm: 0.8,
      layer: "*.Cu",
    };
    const base = { ...LEGACY_SOT23, graphics: [], labels: [] };
    const withOffset = compareFrameConversion(
      { ...base, pads: [{ ...pad, drillOffsetMm: { x: 0.3, y: 0.2 } }] },
      build(source),
    );
    expect(withOffset.frameOnly).toBe(true);
    const withoutOffset = compareFrameConversion(
      { ...base, pads: [pad] },
      build(source),
    );
    expect(withoutOffset.padViolations.map((v) => v.field)).toEqual([
      "centerMm",
      "drillOffsetMm",
    ]);
  });

  test("an NPTH plated flag and paste sub-pads are allowed additions", () => {
    const source = `(footprint "Q" (layer "F.Cu")
      (pad "" np_thru_hole circle (at 0 -4) (size 2.2 2.2) (drill 2.2) (layers "*.Cu" "*.Mask"))
      (pad "1" smd rect (at 0 1) (size 2 2) (layers "F.Cu" "F.Paste" "F.Mask"))
      (pad "" smd rect (at -0.5 1) (size 0.8 0.8) (layers "F.Paste"))
      (pad "" smd rect (at 0.5 1) (size 0.8 0.8) (layers "F.Paste")))`;
    const old: FootprintRenderModel = {
      ...LEGACY_SOT23,
      graphics: [],
      labels: [],
      pads: [
        {
          id: "?:0",
          number: "",
          shape: "circle",
          centerMm: { x: 0, y: -4 },
          widthMm: 2.2,
          heightMm: 2.2,
          rotationDeg: 0,
          drillDiameterMm: 2.2,
          layer: "*.Cu",
        },
        {
          id: "1:1",
          number: "1",
          shape: "rect",
          centerMm: { x: 0, y: 1 },
          widthMm: 2,
          heightMm: 2,
          rotationDeg: 0,
          layer: "F.Cu",
        },
      ],
    };
    const delta = compareFrameConversion(old, build(source));
    expect(delta.frameOnly).toBe(true);
    expect(delta.additions).toEqual([
      { kind: "plated-flag", count: 1 },
      { kind: "paste-subpads", count: 2 },
      { kind: "frame-stamp", count: 1 },
    ]);
  });

  test("an already-converted old model is refused explicitly", () => {
    expect(compareFrameConversion(next, next)).toEqual({
      frameOnly: false,
      padViolations: [],
      additions: [],
      other: [
        {
          kind: "old-already-converted",
          detail: "old model carries a frame stamp",
        },
      ],
    });
  });
});
