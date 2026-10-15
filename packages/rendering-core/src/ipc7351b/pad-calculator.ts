/**
 * IPC-7351B pad size calculators.
 *
 * All functions are pure — no I/O, no side effects.
 * Input dimensions in mm, output in mm.
 */

import type {
  FootprintRenderSourcePad,
  PreviewGraphic,
  PreviewLabel,
  PreviewRectGraphic,
} from "../types.js";
import {
  COURTYARD_LINE_WIDTH,
  SILK_LINE_WIDTH,
  type DensityLevel,
  type SolderFilletAdditions,
} from "./ipc-dimensions.js";

// ── Helpers ─────────────────────────────────────────────────────────

function padId(index: number): string {
  return `pad-${index + 1}`;
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function silkRect(
  cx: number,
  cy: number,
  width: number,
  height: number,
  _pads: readonly FootprintRenderSourcePad[],
): PreviewRectGraphic {
  return {
    kind: "rect",
    x: roundTo(cx - width / 2, 4),
    y: roundTo(cy - height / 2, 4),
    width: roundTo(width, 4),
    height: roundTo(height, 4),
    fill: "none",
    strokeWidthMm: SILK_LINE_WIDTH,
    layer: "F.SilkS",
  };
}

function courtyardRect(
  cx: number,
  cy: number,
  width: number,
  height: number,
): PreviewRectGraphic {
  return {
    kind: "rect",
    x: roundTo(cx - width / 2, 4),
    y: roundTo(cy - height / 2, 4),
    width: roundTo(width, 4),
    height: roundTo(height, 4),
    fill: "none",
    strokeWidthMm: COURTYARD_LINE_WIDTH,
    layer: "F.CrtYd",
  };
}

function refLabel(cy: number, halfHeight: number): PreviewLabel {
  return {
    id: "ref",
    text: "REF**",
    at: { x: 0, y: halfHeight + 0.8 },
    fontSizeMm: 0.8,
    rotationDeg: 0,
    anchorX: "center",
    anchorY: "bottom",
    layer: "F.SilkS",
    role: "reference",
  };
}

function valueLabel(cy: number, halfHeight: number): PreviewLabel {
  return {
    id: "value",
    text: "VALUE",
    at: { x: 0, y: -(halfHeight + 0.8) },
    fontSizeMm: 0.8,
    rotationDeg: 0,
    anchorX: "center",
    anchorY: "top",
    layer: "F.Fab",
    role: "value",
  };
}

// ── Results ─────────────────────────────────────────────────────────

export interface PadCalculatorResult {
  readonly pads: FootprintRenderSourcePad[];
  readonly graphics: PreviewGraphic[];
  readonly labels: PreviewLabel[];
}

// ── Chip (2-terminal passive) ───────────────────────────────────────

export interface ChipParams {
  /** Body length L, terminal end to terminal end along X (nominal mm) */
  bodyLengthMm: number;
  /** Body width W, along Y (nominal mm) */
  bodyWidthMm: number;
  /** Terminal length T, measured inward from each body end (nominal mm) */
  terminalLengthMm: number;
}

/**
 * IPC-7351B nominal land: the pad runs from the terminal's inner end minus
 * the heel addition to the body end plus the toe addition, so its centre
 * sits at (L − T)/2 + (toe − heel)/2 and its length is T + toe + heel.
 */
export function calculateChipPads(
  params: ChipParams,
  additions: SolderFilletAdditions,
): PadCalculatorResult {
  const { bodyLengthMm, bodyWidthMm, terminalLengthMm } = params;

  const padLength = roundTo(
    terminalLengthMm + additions.toe + additions.heel,
    4,
  );
  const padWidth = roundTo(bodyWidthMm + 2 * additions.side, 4);
  const padCenterX = roundTo(
    (bodyLengthMm - terminalLengthMm) / 2 +
      (additions.toe - additions.heel) / 2,
    4,
  );

  const pads: FootprintRenderSourcePad[] = [-padCenterX, padCenterX].map(
    (x, index) => ({
      id: padId(index),
      number: String(index + 1),
      shape: "rect",
      centerMm: { x, y: 0 },
      widthMm: padLength,
      heightMm: padWidth,
      rotationDeg: 0,
      layer: "F.Cu",
    }),
  );

  const courtW = roundTo(
    2 * padCenterX + padLength + 2 * additions.courtyard,
    4,
  );
  const courtH = roundTo(
    Math.max(bodyWidthMm, padWidth) + 2 * additions.courtyard,
    4,
  );

  const graphics: PreviewGraphic[] = [
    silkRect(0, 0, bodyLengthMm, bodyWidthMm, pads),
    courtyardRect(0, 0, courtW, courtH),
  ];

  const halfH = Math.max(courtH, bodyWidthMm) / 2;
  const labels = [refLabel(0, halfH), valueLabel(0, halfH)];

  return { pads, graphics, labels };
}

// ── Gull-wing dual row (SOIC) ──────────────────────────────────────

export interface GullWingDualParams {
  /** Number of pins (must be even for dual-row) */
  pinCount: number;
  /** Lead pitch e (center-to-center along a row, nominal mm) */
  pitchMm: number;
  /** Overall lead span E, tip to tip across the rows (nominal mm) */
  leadSpanMm: number;
  /** Foot length L (nominal mm) */
  terminalLengthMm: number;
  /** Lead width b (nominal mm) */
  terminalWidthMm: number;
  /** Body width E1, across the rows (nominal mm) — for silkscreen */
  bodyWidthMm: number;
  /** Body length D, along the rows (nominal mm) — for silkscreen */
  bodyLengthMm: number;
}

/**
 * IPC-7351B nominal land: the pad runs from the lead heel minus the heel
 * addition to the lead tip plus the toe addition, so its centre sits at
 * E/2 − L/2 + (toe − heel)/2 and its length is L + toe + heel.
 */
export function calculateGullWingDualPads(
  params: GullWingDualParams,
  additions: SolderFilletAdditions,
): PadCalculatorResult {
  const {
    pinCount,
    pitchMm,
    leadSpanMm,
    terminalLengthMm,
    terminalWidthMm,
    bodyWidthMm,
    bodyLengthMm,
  } = params;

  if (pinCount % 2 !== 0) {
    throw new Error("pinCount must be even for dual-row packages");
  }

  const pinsPerSide = pinCount / 2;
  const padWidth = roundTo(terminalWidthMm + 2 * additions.side, 4);
  const padLength = roundTo(
    terminalLengthMm + additions.toe + additions.heel,
    4,
  );
  const padCenterX = roundTo(
    leadSpanMm / 2 -
      terminalLengthMm / 2 +
      (additions.toe - additions.heel) / 2,
    4,
  );

  const pads: FootprintRenderSourcePad[] = [];
  const rowOffset = ((pinsPerSide - 1) * pitchMm) / 2;

  // Left column (pins 1..N/2, top to bottom)
  for (let i = 0; i < pinsPerSide; i++) {
    const y = roundTo(rowOffset - i * pitchMm, 4);
    pads.push({
      id: padId(pads.length),
      number: String(i + 1),
      shape: "rect",
      centerMm: { x: -padCenterX, y },
      widthMm: padLength,
      heightMm: padWidth,
      rotationDeg: 0,
      layer: "F.Cu",
    });
  }

  // Right column (pins N/2+1..N, bottom to top)
  for (let i = 0; i < pinsPerSide; i++) {
    const y = roundTo(-rowOffset + i * pitchMm, 4);
    pads.push({
      id: padId(pads.length),
      number: String(pinsPerSide + i + 1),
      shape: "rect",
      centerMm: { x: padCenterX, y },
      widthMm: padLength,
      heightMm: padWidth,
      rotationDeg: 0,
      layer: "F.Cu",
    });
  }

  const courtW = roundTo(
    2 * padCenterX + padLength + 2 * additions.courtyard,
    4,
  );
  const courtH = roundTo(
    Math.max(bodyLengthMm, pinsPerSide * pitchMm) + 2 * additions.courtyard,
    4,
  );

  const graphics: PreviewGraphic[] = [
    silkRect(0, 0, bodyWidthMm, bodyLengthMm, pads),
    courtyardRect(0, 0, courtW, courtH),
  ];

  const halfH = Math.max(courtH, bodyLengthMm) / 2;
  const labels = [refLabel(0, halfH), valueLabel(0, halfH)];

  return { pads, graphics, labels };
}

// ── SOT (asymmetric gull-wing: 2+1, 3+2, 3+3, 3+tab) ────────────────

export interface SotTab {
  /** Pin number of the wide tab lead. */
  readonly number: string;
  /** Tab lead width (b1 / b2, nominal mm). */
  readonly widthMm: number;
}

export interface SotParams {
  /** Lead slot pitch e (nominal mm); a skipped slot keeps the grid. */
  readonly pitchMm: number;
  /** Overall lead span tip-to-tip HE / E (nominal mm). */
  readonly leadSpanMm: number;
  /** Foot length Lp / L (nominal mm). */
  readonly terminalLengthMm: number;
  /** Lead width bp / b (nominal mm). */
  readonly terminalWidthMm: number;
  /** Body width between rows E / E1 (nominal mm) — for silkscreen. */
  readonly bodyWidthMm: number;
  /** Body length along rows D (nominal mm) — for silkscreen. */
  readonly bodyLengthMm: number;
  /** Left row, top → bottom; `null` is an unpopulated slot. */
  readonly leftPins: readonly (string | null)[];
  /** Right row, top → bottom; ignored when `tab` is set. */
  readonly rightPins: readonly (string | null)[];
  /** Single wide lead centred on the right side (SOT-223 tab). */
  readonly tab?: SotTab;
}

/**
 * IPC-7351B nominal land: the pad runs from the lead heel minus the heel
 * addition to the lead toe plus the toe addition, so its centre sits at
 * HE/2 − L/2 + (toe − heel)/2 and its length is L + toe + heel.
 */
export function calculateSotPads(
  params: SotParams,
  additions: SolderFilletAdditions,
): PadCalculatorResult {
  const { pitchMm, leadSpanMm, terminalLengthMm, terminalWidthMm, bodyWidthMm, bodyLengthMm } = params;
  const padLength = roundTo(terminalLengthMm + additions.toe + additions.heel, 4);
  const padWidth = roundTo(terminalWidthMm + 2 * additions.side, 4);
  const padCenterX = roundTo(
    leadSpanMm / 2 - terminalLengthMm / 2 + (additions.toe - additions.heel) / 2,
    4,
  );

  const placed: { number: string; x: number; y: number; heightMm: number }[] = [];
  const placeRow = (pins: readonly (string | null)[], x: number) => {
    const rowOffset = ((pins.length - 1) * pitchMm) / 2;
    pins.forEach((number, slot) => {
      if (number === null) return;
      placed.push({ number, x, y: roundTo(rowOffset - slot * pitchMm, 4), heightMm: padWidth });
    });
  };
  placeRow(params.leftPins, -padCenterX);
  if (params.tab) {
    placed.push({
      number: params.tab.number,
      x: padCenterX,
      y: 0,
      heightMm: roundTo(params.tab.widthMm + 2 * additions.side, 4),
    });
  } else {
    placeRow(params.rightPins, padCenterX);
  }
  placed.sort((a, b) => Number(a.number) - Number(b.number));

  const pads: FootprintRenderSourcePad[] = placed.map((pad, index) => ({
    id: padId(index),
    number: pad.number,
    shape: "rect",
    centerMm: { x: pad.x, y: pad.y },
    widthMm: padLength,
    heightMm: pad.heightMm,
    rotationDeg: 0,
    layer: "F.Cu",
  }));

  const padExtentY = Math.max(...placed.map((pad) => Math.abs(pad.y) + pad.heightMm / 2));
  const courtW = roundTo(
    Math.max(2 * padCenterX + padLength, bodyWidthMm) + 2 * additions.courtyard,
    4,
  );
  const courtH = roundTo(
    Math.max(bodyLengthMm, 2 * padExtentY) + 2 * additions.courtyard,
    4,
  );

  const graphics: PreviewGraphic[] = [
    silkRect(0, 0, bodyWidthMm, bodyLengthMm, pads),
    courtyardRect(0, 0, courtW, courtH),
  ];

  const halfH = Math.max(courtH, bodyLengthMm) / 2;
  const labels = [refLabel(0, halfH), valueLabel(0, halfH)];

  return { pads, graphics, labels };
}

// ── Quad flat (QFP) ─────────────────────────────────────────────────

export interface QuadFlatParams {
  /** Total pin count (must be divisible by 4) */
  pinCount: number;
  /** Pin pitch (mm) */
  pitchMm: number;
  /** Span X (center-to-center between left/right rows, mm) */
  spanXMm: number;
  /** Span Y (center-to-center between top/bottom rows, mm) */
  spanYMm: number;
  /** Terminal length (mm) */
  terminalLengthMm: number;
  /** Terminal width (mm) */
  terminalWidthMm: number;
  /** Body size X (mm) */
  bodyWidthMm: number;
  /** Body size Y (mm) */
  bodyLengthMm: number;
}

export function calculateQuadFlatPads(
  params: QuadFlatParams,
  additions: SolderFilletAdditions,
): PadCalculatorResult {
  const {
    pinCount,
    pitchMm,
    spanXMm,
    spanYMm,
    terminalLengthMm,
    terminalWidthMm,
    bodyWidthMm,
    bodyLengthMm,
  } = params;

  if (pinCount % 4 !== 0) {
    throw new Error("pinCount must be divisible by 4 for QFP packages");
  }

  const pinsPerSide = pinCount / 4;
  const padW = roundTo(terminalWidthMm + 2 * additions.side, 4);
  const padH = roundTo(terminalLengthMm + additions.toe + additions.heel, 4);
  const padCenterX = roundTo(
    spanXMm / 2 + (additions.toe - additions.heel) / 2,
    4,
  );
  const padCenterY = roundTo(
    spanYMm / 2 + (additions.toe - additions.heel) / 2,
    4,
  );

  const pads: FootprintRenderSourcePad[] = [];
  const rowOffsetX = ((pinsPerSide - 1) * pitchMm) / 2;
  const rowOffsetY = ((pinsPerSide - 1) * pitchMm) / 2;
  let pinNum = 1;

  // Left side (top to bottom)
  for (let i = 0; i < pinsPerSide; i++) {
    pads.push({
      id: padId(pads.length),
      number: String(pinNum++),
      shape: "rect",
      centerMm: {
        x: -padCenterX,
        y: roundTo(rowOffsetY - i * pitchMm, 4),
      },
      widthMm: padH,
      heightMm: padW,
      rotationDeg: 0,
      layer: "F.Cu",
    });
  }

  // Bottom side (left to right)
  for (let i = 0; i < pinsPerSide; i++) {
    pads.push({
      id: padId(pads.length),
      number: String(pinNum++),
      shape: "rect",
      centerMm: {
        x: roundTo(-rowOffsetX + i * pitchMm, 4),
        y: -padCenterY,
      },
      widthMm: padW,
      heightMm: padH,
      rotationDeg: 0,
      layer: "F.Cu",
    });
  }

  // Right side (bottom to top)
  for (let i = 0; i < pinsPerSide; i++) {
    pads.push({
      id: padId(pads.length),
      number: String(pinNum++),
      shape: "rect",
      centerMm: {
        x: padCenterX,
        y: roundTo(-rowOffsetY + i * pitchMm, 4),
      },
      widthMm: padH,
      heightMm: padW,
      rotationDeg: 0,
      layer: "F.Cu",
    });
  }

  // Top side (right to left)
  for (let i = 0; i < pinsPerSide; i++) {
    pads.push({
      id: padId(pads.length),
      number: String(pinNum++),
      shape: "rect",
      centerMm: {
        x: roundTo(rowOffsetX - i * pitchMm, 4),
        y: padCenterY,
      },
      widthMm: padW,
      heightMm: padH,
      rotationDeg: 0,
      layer: "F.Cu",
    });
  }

  const courtW = roundTo(spanXMm + padH + 2 * additions.courtyard, 4);
  const courtH = roundTo(spanYMm + padH + 2 * additions.courtyard, 4);

  const graphics: PreviewGraphic[] = [
    silkRect(0, 0, bodyWidthMm, bodyLengthMm, pads),
    courtyardRect(0, 0, courtW, courtH),
  ];

  const halfH = Math.max(courtH, bodyLengthMm) / 2;
  const labels = [refLabel(0, halfH), valueLabel(0, halfH)];

  return { pads, graphics, labels };
}

// ── QFN (perimeter pads + optional exposed pad) ─────────────────────

/**
 * Minimum copper gap between the exposed pad and the inner (heel) end of
 * every signal land. MO-220 drawings guarantee K ≥ 0.20–0.25 mm between the
 * package paddle and the terminals; the land keeps at least the smaller of
 * those so it never bridges what the package itself keeps apart.
 */
export const QFN_EP_MIN_GAP_MM = 0.2;

export interface QfnParams {
  /** Total pin count (perimeter only, must be divisible by 4) */
  pinCount: number;
  /** Pin pitch e (mm) */
  pitchMm: number;
  /** Body size D = E (square, mm) */
  bodySizeMm: number;
  /** Terminal width b (nominal, mm) */
  terminalWidthMm: number;
  /** Terminal length L, measured inward from the body edge (nominal, mm) */
  terminalLengthMm: number;
  /** Exposed pad D2 = E2 (nominal, mm); omitted or 0 = none */
  exposedPadMm?: number;
}

/**
 * Perimeter lands follow IPC-7351B nominal additions: toe outward past the
 * body edge, heel inward past the terminal end. The exposed pad is the
 * nominal D2, shrunk only when needed to keep `QFN_EP_MIN_GAP_MM` to the
 * signal lands' inner ends.
 */
export function calculateQfnPads(
  params: QfnParams,
  additions: SolderFilletAdditions,
): PadCalculatorResult {
  const {
    pinCount,
    pitchMm,
    bodySizeMm,
    terminalWidthMm,
    terminalLengthMm,
    exposedPadMm,
  } = params;

  if (pinCount % 4 !== 0) {
    throw new Error("pinCount must be divisible by 4 for QFN packages");
  }

  const pinsPerSide = pinCount / 4;
  const padW = roundTo(terminalWidthMm + 2 * additions.side, 4);
  const padH = roundTo(terminalLengthMm + additions.toe + additions.heel, 4);
  const edgeCenter = roundTo(
    bodySizeMm / 2 - terminalLengthMm / 2 + (additions.toe - additions.heel) / 2,
    4,
  );
  const innerEdge = edgeCenter - padH / 2;
  const rowOffset = ((pinsPerSide - 1) * pitchMm) / 2;

  const pads: FootprintRenderSourcePad[] = [];
  let pinNum = 1;

  // Left (top to bottom)
  for (let i = 0; i < pinsPerSide; i++) {
    pads.push({
      id: padId(pads.length),
      number: String(pinNum++),
      shape: "rect",
      centerMm: {
        x: -edgeCenter,
        y: roundTo(rowOffset - i * pitchMm, 4),
      },
      widthMm: padH,
      heightMm: padW,
      rotationDeg: 0,
      layer: "F.Cu",
    });
  }

  // Bottom (left to right)
  for (let i = 0; i < pinsPerSide; i++) {
    pads.push({
      id: padId(pads.length),
      number: String(pinNum++),
      shape: "rect",
      centerMm: {
        x: roundTo(-rowOffset + i * pitchMm, 4),
        y: -edgeCenter,
      },
      widthMm: padW,
      heightMm: padH,
      rotationDeg: 0,
      layer: "F.Cu",
    });
  }

  // Right (bottom to top)
  for (let i = 0; i < pinsPerSide; i++) {
    pads.push({
      id: padId(pads.length),
      number: String(pinNum++),
      shape: "rect",
      centerMm: {
        x: edgeCenter,
        y: roundTo(-rowOffset + i * pitchMm, 4),
      },
      widthMm: padH,
      heightMm: padW,
      rotationDeg: 0,
      layer: "F.Cu",
    });
  }

  // Top (right to left)
  for (let i = 0; i < pinsPerSide; i++) {
    pads.push({
      id: padId(pads.length),
      number: String(pinNum++),
      shape: "rect",
      centerMm: {
        x: roundTo(rowOffset - i * pitchMm, 4),
        y: edgeCenter,
      },
      widthMm: padW,
      heightMm: padH,
      rotationDeg: 0,
      layer: "F.Cu",
    });
  }

  if (exposedPadMm && exposedPadMm > 0) {
    const maxExposed = 2 * (innerEdge - QFN_EP_MIN_GAP_MM);
    const exposed = roundTo(Math.min(exposedPadMm, maxExposed), 4);
    if (exposed <= 0) {
      throw new Error("QFN exposed pad cannot keep the minimum gap to the signal pads");
    }
    pads.push({
      id: padId(pads.length),
      number: String(pinNum),
      shape: "rect",
      centerMm: { x: 0, y: 0 },
      widthMm: exposed,
      heightMm: exposed,
      rotationDeg: 0,
      layer: "F.Cu",
    });
  }

  const courtSize = roundTo(
    Math.max(bodySizeMm, 2 * edgeCenter + padH) + 2 * additions.courtyard,
    4,
  );
  const graphics: PreviewGraphic[] = [
    silkRect(0, 0, bodySizeMm, bodySizeMm, pads),
    courtyardRect(0, 0, courtSize, courtSize),
  ];

  const halfH = courtSize / 2;
  const labels = [refLabel(0, halfH), valueLabel(0, halfH)];

  return { pads, graphics, labels };
}
