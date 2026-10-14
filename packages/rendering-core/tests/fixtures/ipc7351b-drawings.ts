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
