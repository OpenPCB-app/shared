/**
 * Pre-defined package size tables for common footprint families.
 *
 * Body dimensions sourced from manufacturer datasheets and
 * IPC-7351B recommended land pattern guidelines.
 */

import type {
  ChipParams,
  GullWingDualParams,
  QfnParams,
  QuadFlatParams,
  SotParams,
} from "./pad-calculator.js";

// ── Package family identifiers ──────────────────────────────────────

export type PackageFamily = "chip" | "sot" | "soic" | "qfp" | "qfn";

export interface PresetSize<TParams> {
  /** Imperial size code (e.g. "0402") or package name (e.g. "SOT-23") */
  readonly label: string;
  /** Metric size code if applicable */
  readonly metric: string | null;
  /** Short description */
  readonly subtitle: string;
  /** Parameters for the pad calculator */
  readonly params: TParams;
}

export interface PackageFamilyDef<TParams> {
  readonly id: PackageFamily;
  readonly label: string;
  readonly subtitle: string;
  readonly sizes: readonly PresetSize<TParams>[];
}

// ── Chip (2-terminal passive) ───────────────────────────────────────
//
// Resistor terminal dimensions (nominal = midpoint of the drawing's min/max)
// for every chip size: MLCC terminal bands differ, and the footprint names
// keep the historical `C_` prefix. Sources: SOURCES.md.

export const CHIP_FAMILY: PackageFamilyDef<ChipParams> = {
  id: "chip",
  label: "Chip",
  subtitle: "R, C, L (0201–2512)",
  sizes: [
    {
      // Vishay CRCW0201 e3 — doc 20052, rev 21-Sep-2022.
      label: "0201",
      metric: "0603",
      subtitle: "0.6 x 0.3 mm",
      params: { bodyLengthMm: 0.6, bodyWidthMm: 0.3, terminalLengthMm: 0.15 },
    },
    {
      // IPC-SM-782 §8.1 Rev A — Figure 2, 1005 [0402].
      label: "0402",
      metric: "1005",
      subtitle: "1.0 x 0.5 mm",
      params: { bodyLengthMm: 1.05, bodyWidthMm: 0.54, terminalLengthMm: 0.2 },
    },
    {
      // IPC-SM-782 §8.1 Rev A — Figure 2, 1608 [0603].
      label: "0603",
      metric: "1608",
      subtitle: "1.6 x 0.8 mm",
      params: {
        bodyLengthMm: 1.6,
        bodyWidthMm: 0.825,
        terminalLengthMm: 0.275,
      },
    },
    {
      // IPC-SM-782 §8.1 Rev A — Figure 2, 2012 [0805].
      label: "0805",
      metric: "2012",
      subtitle: "2.0 x 1.25 mm",
      params: { bodyLengthMm: 2.0, bodyWidthMm: 1.25, terminalLengthMm: 0.4 },
    },
    {
      // IPC-SM-782 §8.1 Rev A — Figure 2, 3216 [1206].
      label: "1206",
      metric: "3216",
      subtitle: "3.2 x 1.6 mm",
      params: { bodyLengthMm: 3.2, bodyWidthMm: 1.6, terminalLengthMm: 0.5 },
    },
    {
      // IPC-SM-782 §8.1 Rev A — Figure 2, 3225 [1210].
      label: "1210",
      metric: "3225",
      subtitle: "3.2 x 2.5 mm",
      params: { bodyLengthMm: 3.2, bodyWidthMm: 2.49, terminalLengthMm: 0.5 },
    },
    {
      // IPC-SM-782 §8.1 Rev A — Figure 2, 5025 [2010].
      label: "2010",
      metric: "5025",
      subtitle: "5.0 x 2.5 mm",
      params: { bodyLengthMm: 5.0, bodyWidthMm: 2.5, terminalLengthMm: 0.6 },
    },
    {
      // IPC-SM-782 §8.1 Rev A — Figure 2, 6332 [2512].
      label: "2512",
      metric: "6332",
      subtitle: "6.3 x 3.2 mm",
      params: { bodyLengthMm: 6.3, bodyWidthMm: 3.2, terminalLengthMm: 0.6 },
    },
  ],
};

// ── SOT (Small Outline Transistor) ──────────────────────────────────
//
// Nominal = midpoint of the min/max in the cited drawing (or the drawing's
// nominal where it gives one). Sources and the KiCad comparison tolerances
// are recorded in packages/rendering-core/SOURCES.md.

export const SOT_FAMILY: PackageFamilyDef<SotParams> = {
  id: "sot",
  label: "SOT",
  subtitle: "Small Outline Transistor",
  sizes: [
    {
      // JEDEC TO-236AB — NXP SOT23 package outline (sot023_po, 2014-09-22).
      label: "SOT-23",
      metric: null,
      subtitle: "3 pins, 0.95 mm pitch",
      params: {
        pitchMm: 0.95,
        leadSpanMm: 2.3,
        terminalLengthMm: 0.3,
        terminalWidthMm: 0.43,
        bodyWidthMm: 1.3,
        bodyLengthMm: 2.9,
        leftPins: ["1", null, "2"],
        rightPins: [null, "3", null],
      },
    },
    {
      // JEDEC MO-178AA — Renesas P5.064 (KA0005AB) Rev04, 2025-07-22.
      label: "SOT-23-5",
      metric: null,
      subtitle: "5 pins, 0.95 mm pitch",
      params: {
        pitchMm: 0.95,
        leadSpanMm: 2.8,
        terminalLengthMm: 0.45,
        terminalWidthMm: 0.4,
        bodyWidthMm: 1.6,
        bodyLengthMm: 2.9,
        leftPins: ["1", "2", "3"],
        rightPins: ["5", null, "4"],
      },
    },
    {
      // JEDEC MO-178AB — Renesas P6.064 (KA0006AB) Rev06.
      label: "SOT-23-6",
      metric: null,
      subtitle: "6 pins, 0.95 mm pitch",
      params: {
        pitchMm: 0.95,
        leadSpanMm: 2.8,
        terminalLengthMm: 0.45,
        terminalWidthMm: 0.4,
        bodyWidthMm: 1.6,
        bodyLengthMm: 2.9,
        leftPins: ["1", "2", "3"],
        rightPins: ["6", "5", "4"],
      },
    },
    {
      // JEDEC TO-261AA — NXP SOT223 (SC-73) outline; Vishay DWG 5969
      // (TO-261AA) agrees within 0.05 mm on every shared dimension.
      label: "SOT-223",
      metric: null,
      subtitle: "3 pins + tab, 2.3 mm pitch",
      params: {
        pitchMm: 2.3,
        leadSpanMm: 7.0,
        terminalLengthMm: 0.9,
        terminalWidthMm: 0.7,
        bodyWidthMm: 3.5,
        bodyLengthMm: 6.5,
        leftPins: ["1", "2", "3"],
        rightPins: [],
        tab: { number: "4", widthMm: 3.0 },
      },
    },
    {
      // JEITA SC-70 — NXP SOT323 package outline.
      label: "SOT-323",
      metric: null,
      subtitle: "3 pins, 0.65 mm pitch",
      params: {
        pitchMm: 0.65,
        leadSpanMm: 2.1,
        terminalLengthMm: 0.3,
        terminalWidthMm: 0.35,
        bodyWidthMm: 1.25,
        bodyLengthMm: 2.0,
        leftPins: ["1", null, "2"],
        rightPins: [null, "3", null],
      },
    },
  ],
};

// ── SOIC (Small Outline IC) ─────────────────────────────────────────
//
// Nominal = midpoint of the min/max in the cited drawing (e is basic).
// Fields: e = pitchMm, E (tip to tip) = leadSpanMm, L = terminalLengthMm,
// b = terminalWidthMm, E1 = bodyWidthMm, D = bodyLengthMm. Sources and the
// KiCad comparison tolerances: SOURCES.md.

export const SOIC_FAMILY: PackageFamilyDef<GullWingDualParams> = {
  id: "soic",
  label: "SOIC",
  subtitle: "Small Outline IC",
  sizes: [
    {
      // JEDEC MS-012AA — Analog Devices R-8 (012407-A).
      label: "SOIC-8",
      metric: null,
      subtitle: "8 pins, 1.27 mm pitch",
      params: {
        pinCount: 8,
        pitchMm: 1.27,
        leadSpanMm: 6.0,
        terminalLengthMm: 0.835,
        terminalWidthMm: 0.41,
        bodyWidthMm: 3.9,
        bodyLengthMm: 4.9,
      },
    },
    {
      // JEDEC MS-012AB — Analog Devices R-14 (060606-A).
      label: "SOIC-14",
      metric: null,
      subtitle: "14 pins, 1.27 mm pitch",
      params: {
        pinCount: 14,
        pitchMm: 1.27,
        leadSpanMm: 6.0,
        terminalLengthMm: 0.835,
        terminalWidthMm: 0.41,
        bodyWidthMm: 3.9,
        bodyLengthMm: 8.65,
      },
    },
    {
      // JEDEC MS-012AC — Analog Devices R-16 (060606-A).
      label: "SOIC-16",
      metric: null,
      subtitle: "16 pins, 1.27 mm pitch",
      params: {
        pinCount: 16,
        pitchMm: 1.27,
        leadSpanMm: 6.0,
        terminalLengthMm: 0.835,
        terminalWidthMm: 0.41,
        bodyWidthMm: 3.9,
        bodyLengthMm: 9.9,
      },
    },
    {
      // JEDEC MS-013AE — Analog Devices RW-28 (060706-A).
      label: "SOIC-28W",
      metric: null,
      subtitle: "28 pins, wide body",
      params: {
        pinCount: 28,
        pitchMm: 1.27,
        leadSpanMm: 10.325,
        terminalLengthMm: 0.835,
        terminalWidthMm: 0.41,
        bodyWidthMm: 7.5,
        bodyLengthMm: 17.9,
      },
    },
  ],
};

// ── QFP (Quad Flat Package) ─────────────────────────────────────────

function qfpParams(pinCount: number, pitchMm: number): QuadFlatParams {
  const pinsPerSide = pinCount / 4;
  const bodySize = Math.max(7.0, pinsPerSide * pitchMm + 1.0);
  const span = bodySize + 2.0;
  return {
    pinCount,
    pitchMm,
    spanXMm: span,
    spanYMm: span,
    terminalLengthMm: 0.6,
    terminalWidthMm: pitchMm * 0.5,
    bodyWidthMm: bodySize,
    bodyLengthMm: bodySize,
  };
}

export const QFP_FAMILY: PackageFamilyDef<QuadFlatParams> = {
  id: "qfp",
  label: "QFP",
  subtitle: "Quad Flat Package",
  sizes: [
    {
      label: "TQFP-32",
      metric: null,
      subtitle: "32 pins, 0.8 mm pitch",
      params: qfpParams(32, 0.8),
    },
    {
      label: "TQFP-48",
      metric: null,
      subtitle: "48 pins, 0.5 mm pitch",
      params: qfpParams(48, 0.5),
    },
    {
      label: "LQFP-64",
      metric: null,
      subtitle: "64 pins, 0.5 mm pitch",
      params: qfpParams(64, 0.5),
    },
    {
      label: "LQFP-100",
      metric: null,
      subtitle: "100 pins, 0.5 mm pitch",
      params: qfpParams(100, 0.5),
    },
  ],
};

// ── QFN (Quad Flat No-lead) ─────────────────────────────────────────
//
// MO-220 nominal terminal and exposed-pad dimensions from Analog Devices
// LFCSP outlines that state MO-220 compliance; see SOURCES.md.

function qfnParams(
  pinCount: number,
  bodySizeMm: number,
  pitchMm: number,
  terminal: { readonly widthMm: number; readonly lengthMm: number },
  exposedPadMm: number,
): QfnParams {
  return {
    pinCount,
    pitchMm,
    bodySizeMm,
    terminalWidthMm: terminal.widthMm,
    terminalLengthMm: terminal.lengthMm,
    exposedPadMm,
  };
}

export const QFN_FAMILY: PackageFamilyDef<QfnParams> = {
  id: "qfn",
  label: "QFN",
  subtitle: "Quad Flat No-lead",
  sizes: [
    {
      // MO-220-VEED-4 — ADI CP-16-50.
      label: "QFN-16",
      metric: null,
      subtitle: "16 pins, 3x3 mm, 0.5 pitch",
      params: qfnParams(16, 3.0, 0.5, { widthMm: 0.25, lengthMm: 0.4 }, 1.6),
    },
    {
      // MO-220-VGGD-1 — ADI CP-20-1.
      label: "QFN-20",
      metric: null,
      subtitle: "20 pins, 4x4 mm, 0.5 pitch",
      params: qfnParams(20, 4.0, 0.5, { widthMm: 0.23, lengthMm: 0.6 }, 2.1),
    },
    {
      // MO-220-VGGD-2 — ADI CP-24-1.
      label: "QFN-24",
      metric: null,
      subtitle: "24 pins, 4x4 mm, 0.5 pitch",
      params: qfnParams(24, 4.0, 0.5, { widthMm: 0.23, lengthMm: 0.4 }, 2.1),
    },
    {
      // MO-220-VHHD-2 — ADI CP-32-2.
      label: "QFN-32",
      metric: null,
      subtitle: "32 pins, 5x5 mm, 0.5 pitch",
      params: qfnParams(32, 5.0, 0.5, { widthMm: 0.23, lengthMm: 0.4 }, 3.1),
    },
  ],
};

// ── All families ────────────────────────────────────────────────────

export const ALL_FAMILIES = [
  CHIP_FAMILY,
  SOT_FAMILY,
  SOIC_FAMILY,
  QFP_FAMILY,
  QFN_FAMILY,
] as const;

export function getFamilyById(
  id: PackageFamily,
): PackageFamilyDef<unknown> | undefined {
  return ALL_FAMILIES.find((f) => f.id === id);
}
