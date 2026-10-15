/**
 * The frame-delta report between a pre-0.2.0 footprint preview (frame K,
 * Y-down, verbatim KiCad coordinates) and the 0.2.0 preview (frame C, Y-up)
 * of the SAME raw footprint. It predicts the KF1 image of the old model with
 * the one conversion in `frame.ts` and reports everything that differs from
 * that image, so a frame regeneration can never carry an unreviewed
 * land-pattern change.
 */
import type {
  FootprintPadDrillSlotMm,
  FootprintRenderModel,
  FootprintRenderSourcePad,
  PointMm,
  PreviewGraphic,
  PreviewLabel,
} from "@openpcb/rendering-core";
import {
  KICAD_FOOTPRINT_FRAME_STAMP,
  kicadPadToCanonical,
  kicadPointToCanonical,
} from "./frame.js";
import type { FootprintFrameStamp, FootprintPreviewModel } from "./types.js";

/** Positions and sizes: one nanometre, the canonical model's resolution. */
const FRAME_COMPARE_TOLERANCE_MM = 1e-6;
const FRAME_COMPARE_TOLERANCE_DEG = 1e-9;

/**
 * Differences between a pre-0.2.0 preview (frame K) and a 0.2.0 preview
 * (frame C) of the SAME raw footprint. Shared by CoreLibrary's frame
 * regeneration and OpenPCB's library migration so both apply one rule.
 *
 * `frameOnly` is true only when `padViolations` AND `other` are both empty:
 * the new model is the KF1 image of the old one plus the allowed additions.
 * A consumer that reviews `other` entries (an allow-list) must gate on
 * `padViolations.length === 0` and its own review of `other`, never on
 * `frameOnly` alone.
 */
export interface FrameConversionDelta {
  /** No pad violation and no `other` entry. */
  frameOnly: boolean;
  /**
   * Copper invariant failures, per electrical pad. For `centerMm` and
   * `drillOffsetMm`, `old` is the KF1 image of the old value — what a
   * frame-only conversion predicts — not the raw K value.
   */
  padViolations: Array<{
    padId: string;
    field: string;
    old: unknown;
    new: unknown;
  }>;
  /** Reported and allowed. */
  additions: Array<{ kind: AllowedAddition; count: number }>;
  /** Anything else. Any entry makes the delta not `frameOnly`. */
  other: Array<{ kind: string; detail: string }>;
}

export type AllowedAddition =
  | "plated-flag"
  | "courtyard-graphics"
  | "mask-graphics"
  | "paste-graphics"
  | "paste-subpads"
  | "frame-stamp"
  | "label-id";

const ADDITION_ORDER: readonly AllowedAddition[] = [
  "plated-flag",
  "courtyard-graphics",
  "mask-graphics",
  "paste-graphics",
  "paste-subpads",
  "frame-stamp",
  "label-id",
];

const COURTYARD_LAYERS = ["F.CrtYd", "B.CrtYd", "F.Courtyard", "B.Courtyard"];
const MASK_LAYERS = ["F.Mask", "B.Mask"];
const PASTE_LAYERS = ["F.Paste", "B.Paste"];

interface DeltaSink {
  padViolations: FrameConversionDelta["padViolations"];
  additions: Map<AllowedAddition, number>;
  other: FrameConversionDelta["other"];
}

function addAddition(sink: DeltaSink, kind: AllowedAddition, count = 1): void {
  sink.additions.set(kind, (sink.additions.get(kind) ?? 0) + count);
}

function near(a: number, b: number, tol = FRAME_COMPARE_TOLERANCE_MM): boolean {
  return Math.abs(a - b) <= tol;
}

function nearPoint(a: PointMm, b: PointMm): boolean {
  return near(a.x, b.x) && near(a.y, b.y);
}

function nearOptional(a: number | undefined, b: number | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  return near(a, b);
}

function nearOptionalPoint(
  a: PointMm | undefined,
  b: PointMm | undefined,
): boolean {
  if (a === undefined || b === undefined) return a === b;
  return nearPoint(a, b);
}

function isPastePad(pad: FootprintRenderSourcePad): boolean {
  return (pad as { role?: unknown }).role === "paste";
}

function expectedPad(old: FootprintRenderSourcePad): {
  centerMm: PointMm;
  drillOffsetMm?: PointMm;
} {
  return kicadPadToCanonical({
    position: old.centerMm,
    rotation: old.rotationDeg,
    ...(old.drillOffsetMm ? { drillOffset: old.drillOffsetMm } : {}),
  });
}

function compareSlot(
  id: string,
  oldSlot: FootprintPadDrillSlotMm | undefined,
  newSlot: FootprintPadDrillSlotMm | undefined,
  sink: DeltaSink,
): void {
  if (!oldSlot && newSlot) {
    sink.other.push({
      kind: "slot-drill-added",
      detail: `pad ${id}: oval drill ${newSlot.widthMm} x ${newSlot.heightMm}`,
    });
    return;
  }
  const same =
    (!oldSlot && !newSlot) ||
    (!!oldSlot &&
      !!newSlot &&
      near(oldSlot.widthMm, newSlot.widthMm) &&
      near(oldSlot.heightMm, newSlot.heightMm));
  if (!same) {
    sink.padViolations.push({
      padId: id,
      field: "drillSlotMm",
      old: oldSlot,
      new: newSlot,
    });
  }
}

function comparePlating(
  id: string,
  oldPlated: boolean | undefined,
  newPlated: boolean | undefined,
  sink: DeltaSink,
): void {
  if ((oldPlated ?? true) === (newPlated ?? true)) return;
  if (oldPlated === undefined && newPlated === false) {
    addAddition(sink, "plated-flag");
    return;
  }
  sink.padViolations.push({
    padId: id,
    field: "plated",
    old: oldPlated,
    new: newPlated,
  });
}

function compareElectricalPad(
  old: FootprintRenderSourcePad,
  next: FootprintRenderSourcePad,
  sink: DeltaSink,
): void {
  const id = old.id;
  const violation = (field: string, a: unknown, b: unknown) =>
    sink.padViolations.push({ padId: id, field, old: a, new: b });
  const expected = expectedPad(old);

  if (old.number !== next.number) violation("number", old.number, next.number);
  if (old.shape !== next.shape) violation("shape", old.shape, next.shape);
  if (!nearPoint(expected.centerMm, next.centerMm)) {
    violation("centerMm", expected.centerMm, next.centerMm);
  }
  if (!near(old.widthMm, next.widthMm))
    violation("widthMm", old.widthMm, next.widthMm);
  if (!near(old.heightMm, next.heightMm))
    violation("heightMm", old.heightMm, next.heightMm);
  if (!near(old.rotationDeg, next.rotationDeg, FRAME_COMPARE_TOLERANCE_DEG)) {
    violation("rotationDeg", old.rotationDeg, next.rotationDeg);
  }
  if (!nearOptional(old.roundrectRatio, next.roundrectRatio)) {
    violation("roundrectRatio", old.roundrectRatio, next.roundrectRatio);
  }
  if (!nearOptional(old.drillDiameterMm, next.drillDiameterMm)) {
    violation("drillDiameterMm", old.drillDiameterMm, next.drillDiameterMm);
  }
  compareSlot(id, old.drillSlotMm, next.drillSlotMm, sink);
  if (!nearOptionalPoint(expected.drillOffsetMm, next.drillOffsetMm)) {
    violation("drillOffsetMm", expected.drillOffsetMm, next.drillOffsetMm);
  }
  comparePlating(id, old.plated, next.plated, sink);
}

function comparePastePad(
  old: FootprintRenderSourcePad,
  next: FootprintRenderSourcePad | undefined,
  sink: DeltaSink,
): void {
  if (!next || !isPastePad(next)) {
    sink.other.push({ kind: "paste-subpad-removed", detail: `pad ${old.id}` });
    return;
  }
  const same =
    nearPoint(expectedPad(old).centerMm, next.centerMm) &&
    near(old.widthMm, next.widthMm) &&
    near(old.heightMm, next.heightMm) &&
    near(old.rotationDeg, next.rotationDeg, FRAME_COMPARE_TOLERANCE_DEG);
  if (!same)
    sink.other.push({ kind: "paste-subpad-changed", detail: `pad ${old.id}` });
}

function comparePads(
  oldPads: readonly FootprintRenderSourcePad[],
  newPads: readonly FootprintRenderSourcePad[],
  sink: DeltaSink,
): void {
  const newById = new Map(newPads.map((pad) => [pad.id, pad]));
  const oldIds = new Set(oldPads.map((pad) => pad.id));

  for (const old of oldPads) {
    const next = newById.get(old.id);
    if (isPastePad(old)) {
      comparePastePad(old, next, sink);
      continue;
    }
    // No electrical pad may disappear, nor turn into a paste window.
    if (!next || isPastePad(next)) {
      sink.padViolations.push({
        padId: old.id,
        field: "present",
        old: true,
        new: false,
      });
      continue;
    }
    compareElectricalPad(old, next, sink);
  }

  for (const next of newPads) {
    if (oldIds.has(next.id)) continue;
    if (isPastePad(next)) {
      addAddition(sink, "paste-subpads");
    } else {
      sink.other.push({ kind: "pad-added", detail: `pad ${next.id}` });
    }
  }
}

/** The KF1 image of an old (K) graphic: what a frame-only conversion predicts. */
function graphicToCanonical(graphic: PreviewGraphic): PreviewGraphic {
  const n = kicadPointToCanonical;
  switch (graphic.kind) {
    case "line":
      return { ...graphic, a: n(graphic.a), b: n(graphic.b) };
    case "rect":
      // The K rect spans y..y+height; its image spans −(y+height)..−y.
      return {
        ...graphic,
        y: kicadPointToCanonical({ x: 0, y: graphic.y + graphic.height }).y,
      };
    case "circle":
      return { ...graphic, center: n(graphic.center) };
    case "arc3":
      return {
        ...graphic,
        start: n(graphic.start),
        mid: n(graphic.mid),
        end: n(graphic.end),
      };
    case "polyline":
      return { ...graphic, points: graphic.points.map(n) };
    case "bezier": {
      const [p0, p1, p2, p3] = graphic.points;
      return { ...graphic, points: [n(p0), n(p1), n(p2), n(p3)] };
    }
  }
}

/**
 * Structural equality where every number compares to within one nanometre.
 * Keys holding `undefined` are ignored (a JSON round trip drops them), so a
 * stored model and a freshly built one compare by content only.
 */
function nearlyEqual(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") return near(a, b);
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) {
    return a === b;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left).filter((key) => left[key] !== undefined);
  const rightKeys = Object.keys(right).filter(
    (key) => right[key] !== undefined,
  );
  return (
    keys.length === rightKeys.length &&
    keys.every((key) => nearlyEqual(left[key], right[key]))
  );
}

/** Graphics on layers older builders dropped are allowed to appear. */
function graphicAddition(layer: string): AllowedAddition | null {
  if (COURTYARD_LAYERS.includes(layer)) return "courtyard-graphics";
  if (MASK_LAYERS.includes(layer)) return "mask-graphics";
  if (PASTE_LAYERS.includes(layer)) return "paste-graphics";
  return null;
}

function describeGraphic(graphic: PreviewGraphic): string {
  return `${graphic.kind} on ${graphic.layer ?? "(no layer)"}`;
}

/** Pairs each expected item with the first unmatched candidate it equals. */
function matchInOrder<T>(
  expected: readonly T[],
  candidates: readonly T[],
  equal: (a: T, b: T) => boolean,
): { pairs: Array<[T, T]>; unmatchedExpected: T[]; unmatchedCandidates: T[] } {
  const used = new Array<boolean>(candidates.length).fill(false);
  const pairs: Array<[T, T]> = [];
  const unmatchedExpected: T[] = [];
  for (const item of expected) {
    const index = candidates.findIndex(
      (candidate, i) => !used[i] && equal(item, candidate),
    );
    if (index < 0) {
      unmatchedExpected.push(item);
      continue;
    }
    used[index] = true;
    pairs.push([item, candidates[index]!]);
  }
  const unmatchedCandidates = candidates.filter((_, i) => !used[i]);
  return { pairs, unmatchedExpected, unmatchedCandidates };
}

function compareGraphics(
  oldGraphics: readonly PreviewGraphic[],
  newGraphics: readonly PreviewGraphic[],
  sink: DeltaSink,
): void {
  const { unmatchedExpected, unmatchedCandidates } = matchInOrder(
    oldGraphics.map(graphicToCanonical),
    newGraphics,
    nearlyEqual,
  );
  for (const graphic of unmatchedExpected) {
    sink.other.push({
      kind: "graphic-changed",
      detail: describeGraphic(graphic),
    });
  }
  for (const graphic of unmatchedCandidates) {
    const kind = graphicAddition(graphic.layer ?? "");
    if (kind) {
      addAddition(sink, kind);
    } else {
      sink.other.push({
        kind: "graphic-added",
        detail: describeGraphic(graphic),
      });
    }
  }
}

/** Equal in everything but the id, which embeds the anchor coordinates. */
function labelsEqual(a: PreviewLabel, b: PreviewLabel): boolean {
  return nearlyEqual({ ...a, id: "" }, { ...b, id: "" });
}

function compareLabels(
  oldLabels: readonly PreviewLabel[],
  newLabels: readonly PreviewLabel[],
  sink: DeltaSink,
): void {
  const { pairs, unmatchedExpected, unmatchedCandidates } = matchInOrder(
    oldLabels.map((label) => ({
      ...label,
      at: kicadPointToCanonical(label.at),
    })),
    newLabels,
    labelsEqual,
  );
  // Label ids embed the anchor coordinates, so they change with the frame.
  const changedIds = pairs.filter(
    ([expected, next]) => expected.id !== next.id,
  ).length;
  if (changedIds > 0) addAddition(sink, "label-id", changedIds);
  for (const label of unmatchedExpected) {
    sink.other.push({
      kind: "label-changed",
      detail: `"${label.text}" on ${label.layer ?? "(no layer)"}`,
    });
  }
  for (const label of unmatchedCandidates) {
    sink.other.push({
      kind: "label-added",
      detail: `"${label.text}" on ${label.layer ?? "(no layer)"}`,
    });
  }
}

function checkFrameStamp(newC: FootprintPreviewModel, sink: DeltaSink): void {
  const stamp = (newC as { frame?: Partial<FootprintFrameStamp> | null }).frame;
  if (!stamp) {
    sink.other.push({
      kind: "frame-stamp-missing",
      detail: "new model carries no frame stamp",
    });
    return;
  }
  const expected = KICAD_FOOTPRINT_FRAME_STAMP;
  const matches =
    stamp.frame === expected.frame &&
    stamp.origin === expected.origin &&
    stamp.transformVersion === expected.transformVersion &&
    stamp.tool === expected.tool;
  if (!matches) {
    sink.other.push({
      kind: "frame-stamp-mismatch",
      detail: `expected transform version ${expected.transformVersion}, got ${JSON.stringify(stamp)}`,
    });
    return;
  }
  addAddition(sink, "frame-stamp");
}

/**
 * Compares a pre-0.2.0 preview (K) with the 0.2.0 preview (C) of the same
 * raw footprint. Copper invariants, per electrical (non-paste) pad id of
 * `oldK`: same id, number and shape; `centerMm` is the KF1 image of the old
 * centre (incl. the drill-offset shift); sizes, rotation, roundrect ratio and
 * drill diameter unchanged; slot unchanged (a newly present slot is reported
 * as `other: slot-drill-added`); `drillOffsetMm = −N·old.drillOffsetMm`. No
 * electrical pad may disappear. Graphics and labels must be the KF1 image of
 * the old ones; only the `AllowedAddition` kinds may appear on top.
 */
export function compareFrameConversion(
  oldK: FootprintRenderModel,
  newC: FootprintPreviewModel,
): FrameConversionDelta {
  // A stamped "old" model is already canonical: comparing it would report
  // every coordinate as moved, so refuse with one explicit entry instead.
  if ((oldK as { frame?: unknown }).frame) {
    return {
      frameOnly: false,
      padViolations: [],
      additions: [],
      other: [
        {
          kind: "old-already-converted",
          detail: "old model carries a frame stamp",
        },
      ],
    };
  }
  const sink: DeltaSink = {
    padViolations: [],
    additions: new Map(),
    other: [],
  };
  checkFrameStamp(newC, sink);
  comparePads(oldK.pads, newC.pads, sink);
  compareGraphics(oldK.graphics, newC.graphics, sink);
  compareLabels(oldK.labels, newC.labels, sink);

  const additions = ADDITION_ORDER.filter((kind) =>
    sink.additions.has(kind),
  ).map((kind) => ({
    kind,
    count: sink.additions.get(kind)!,
  }));
  return {
    frameOnly: sink.padViolations.length === 0 && sink.other.length === 0,
    padViolations: sink.padViolations,
    additions,
    other: sink.other,
  };
}
