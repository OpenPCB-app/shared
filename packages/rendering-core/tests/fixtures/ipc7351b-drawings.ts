/**
 * Package drawing dimensions (mm) transcribed from the cited outlines, kept
 * apart from `family-presets.ts` so a preset typo fails a test. A dimension
 * is `[min, max]` (nominal = midpoint) or a single basic/nominal value.
 * Full citations: SOURCES.md.
 */
export type Dim = number | readonly [min: number, max: number];

export function nominal(dim: Dim): number {
  return typeof dim === "number" ? dim : (dim[0] + dim[1]) / 2;
}

export interface ChipDrawing {
  readonly source: string;
  /** Body length L, end to end. */
  readonly bodyLength: Dim;
  /** Body width W. */
  readonly bodyWidth: Dim;
  /** Terminal length T, from each body end. */
  readonly terminalLength: Dim;
}

const IPC_SM_782_CHIP_R =
  "IPC-SM-782 §8.1 Rev A (5/96) Figure 2, chip resistors";

/** Resistor terminal dimensions for every chip preset (D7). */
export const CHIP_DRAWINGS: Readonly<Record<string, ChipDrawing>> = {
  "0201": {
    // T is T1; the drawing's second band T2 is 0.10 ± 0.05.
    source: "Vishay CRCW0201 e3, doc 20052 rev 21-Sep-2022",
    bodyLength: [0.57, 0.63],
    bodyWidth: [0.27, 0.33],
    terminalLength: [0.1, 0.2],
  },
  "0402": {
    source: `${IPC_SM_782_CHIP_R}, 1005 [0402]`,
    bodyLength: [1.0, 1.1],
    bodyWidth: [0.48, 0.6],
    terminalLength: [0.1, 0.3],
  },
  "0603": {
    source: `${IPC_SM_782_CHIP_R}, 1608 [0603]`,
    bodyLength: [1.5, 1.7],
    bodyWidth: [0.7, 0.95],
    terminalLength: [0.15, 0.4],
  },
  "0805": {
    source: `${IPC_SM_782_CHIP_R}, 2012 [0805]`,
    bodyLength: [1.85, 2.15],
    bodyWidth: [1.1, 1.4],
    terminalLength: [0.15, 0.65],
  },
  "1206": {
    source: `${IPC_SM_782_CHIP_R}, 3216 [1206]`,
    bodyLength: [3.05, 3.35],
    bodyWidth: [1.45, 1.75],
    terminalLength: [0.25, 0.75],
  },
  "1210": {
    source: `${IPC_SM_782_CHIP_R}, 3225 [1210]`,
    bodyLength: [3.05, 3.35],
    bodyWidth: [2.34, 2.64],
    terminalLength: [0.25, 0.75],
  },
  "2010": {
    source: `${IPC_SM_782_CHIP_R}, 5025 [2010]`,
    bodyLength: [4.85, 5.15],
    bodyWidth: [2.35, 2.65],
    terminalLength: [0.35, 0.85],
  },
  "2512": {
    source: `${IPC_SM_782_CHIP_R}, 6332 [2512]`,
    bodyLength: [6.15, 6.45],
    bodyWidth: [3.05, 3.35],
    terminalLength: [0.35, 0.85],
  },
};

export interface SotDrawing {
  readonly source: string;
  /** Slot pitch e. */
  readonly e: Dim;
  /** Overall lead span HE / E. */
  readonly span: Dim;
  /** Foot length Lp / L. */
  readonly footLength: Dim;
  /** Lead width bp / b. */
  readonly leadWidth: Dim;
  /** Tab lead width b1 (SOT-223 only). */
  readonly tabWidth?: Dim;
  /** Pin numbers in slot order, left row then right row, top → bottom. */
  readonly left: readonly (string | null)[];
  readonly right: readonly (string | null)[];
  readonly tabNumber?: string;
}

export const SOT_DRAWINGS: Readonly<Record<string, SotDrawing>> = {
  "SOT-23": {
    source: "NXP SOT23 package outline, JEDEC TO-236AB",
    e: 0.95,
    span: [2.1, 2.5],
    footLength: [0.15, 0.45],
    leadWidth: [0.38, 0.48],
    left: ["1", null, "2"],
    right: [null, "3", null],
  },
  "SOT-23-5": {
    source: "Renesas P5.064 Rev04, JEDEC MO-178AA",
    e: 0.95,
    span: 2.8,
    footLength: 0.45,
    leadWidth: 0.4,
    left: ["1", "2", "3"],
    right: ["5", null, "4"],
  },
  "SOT-23-6": {
    source: "Renesas P6.064 Rev06, JEDEC MO-178AB",
    e: 0.95,
    span: 2.8,
    footLength: 0.45,
    leadWidth: 0.4,
    left: ["1", "2", "3"],
    right: ["6", "5", "4"],
  },
  "SOT-223": {
    source: "NXP SOT223 (SC-73) outline; Vishay DWG 5969, JEDEC TO-261AA",
    e: 2.3,
    span: [6.7, 7.3],
    footLength: [0.7, 1.1],
    leadWidth: [0.6, 0.8],
    tabWidth: [2.9, 3.1],
    left: ["1", "2", "3"],
    right: [],
    tabNumber: "4",
  },
  "SOT-323": {
    source: "NXP SOT323 package outline, JEITA SC-70",
    e: 0.65,
    span: [2.0, 2.2],
    footLength: [0.15, 0.45],
    leadWidth: [0.3, 0.4],
    left: ["1", null, "2"],
    right: [null, "3", null],
  },
};

export interface SoicDrawing {
  readonly source: string;
  readonly pins: number;
  /** Lead pitch e. */
  readonly e: Dim;
  /** Lead span E, tip to tip. */
  readonly span: Dim;
  /** Foot length L. */
  readonly footLength: Dim;
  /** Lead width b. */
  readonly leadWidth: Dim;
  /** Body width E1 (across the rows). */
  readonly bodyWidth: Dim;
  /** Body length D (along the rows). */
  readonly bodyLength: Dim;
}

export const SOIC_DRAWINGS: Readonly<Record<string, SoicDrawing>> = {
  "SOIC-8": {
    source: "ADI R-8 (012407-A), JEDEC MS-012-AA",
    pins: 8,
    e: 1.27,
    span: [5.8, 6.2],
    footLength: [0.4, 1.27],
    leadWidth: [0.31, 0.51],
    bodyWidth: [3.8, 4.0],
    bodyLength: [4.8, 5.0],
  },
  "SOIC-14": {
    source: "ADI R-14 (060606-A), JEDEC MS-012-AB",
    pins: 14,
    e: 1.27,
    span: [5.8, 6.2],
    footLength: [0.4, 1.27],
    leadWidth: [0.31, 0.51],
    bodyWidth: [3.8, 4.0],
    bodyLength: [8.55, 8.75],
  },
  "SOIC-16": {
    source: "ADI R-16 (060606-A), JEDEC MS-012-AC",
    pins: 16,
    e: 1.27,
    span: [5.8, 6.2],
    footLength: [0.4, 1.27],
    leadWidth: [0.31, 0.51],
    bodyWidth: [3.8, 4.0],
    bodyLength: [9.8, 10.0],
  },
  "SOIC-28W": {
    source: "ADI RW-28 (060706-A), JEDEC MS-013-AE",
    pins: 28,
    e: 1.27,
    span: [10.0, 10.65],
    footLength: [0.4, 1.27],
    leadWidth: [0.31, 0.51],
    bodyWidth: [7.4, 7.6],
    bodyLength: [17.7, 18.1],
  },
};

export interface QfnDrawing {
  readonly source: string;
  readonly pins: number;
  /** Body D = E. */
  readonly body: Dim;
  readonly e: Dim;
  /** Terminal length L. */
  readonly terminalLength: Dim;
  /** Terminal width b. */
  readonly terminalWidth: Dim;
  /** Exposed pad D2 = E2. */
  readonly exposedPad: Dim;
}

export const QFN_DRAWINGS: Readonly<Record<string, QfnDrawing>> = {
  "QFN-16": {
    source: "ADI CP-16-50, JEDEC MO-220-VEED-4",
    pins: 16,
    body: [2.9, 3.1],
    e: 0.5,
    terminalLength: [0.35, 0.45],
    terminalWidth: [0.2, 0.3],
    exposedPad: [1.5, 1.7],
  },
  "QFN-20": {
    source: "ADI CP-20-1, JEDEC MO-220-VGGD-1",
    pins: 20,
    body: [3.9, 4.1],
    e: 0.5,
    terminalLength: 0.6,
    terminalWidth: 0.23,
    exposedPad: [1.95, 2.25],
  },
  "QFN-24": {
    source: "ADI CP-24-1, JEDEC MO-220-VGGD-2",
    pins: 24,
    body: [3.9, 4.1],
    e: 0.5,
    terminalLength: [0.3, 0.5],
    terminalWidth: 0.23,
    exposedPad: [1.95, 2.25],
  },
  "QFN-32": {
    source: "ADI CP-32-2, JEDEC MO-220-VHHD-2",
    pins: 32,
    body: 5.0,
    e: 0.5,
    terminalLength: [0.3, 0.5],
    terminalWidth: 0.23,
    exposedPad: [2.95, 3.25],
  },
};
