/** Copper-gap helpers for generator geometry fixtures (axis-aligned pads only). */
import type { FootprintRenderSourcePad } from "../../src/index.js";

/**
 * Solder-mask bridge minimum of the default fab preset (JLCPCB 0.10 mm,
 * eda-standards skill "Silkscreen and solder-mask fab rows"); every pair of
 * generated lands must keep at least this much copper apart.
 */
export const MIN_PAD_GAP_MM = 0.1;

const EPS = 1e-9;

interface Extent {
  readonly halfX: number;
  readonly halfY: number;
}

function extent(pad: FootprintRenderSourcePad): Extent {
  const quarterTurns = Math.round(pad.rotationDeg / 90);
  if (Math.abs(pad.rotationDeg - quarterTurns * 90) > EPS) {
    throw new Error(`pad ${pad.number}: non-orthogonal rotation ${pad.rotationDeg}`);
  }
  const swap = quarterTurns % 2 !== 0;
  return {
    halfX: (swap ? pad.heightMm : pad.widthMm) / 2,
    halfY: (swap ? pad.widthMm : pad.heightMm) / 2,
  };
}

/** Copper-to-copper distance; negative means overlap. Circles are exact, rect/oval use their box. */
export function padGap(a: FootprintRenderSourcePad, b: FootprintRenderSourcePad): number {
  const dx = Math.abs(a.centerMm.x - b.centerMm.x);
  const dy = Math.abs(a.centerMm.y - b.centerMm.y);
  if (a.shape === "circle" && b.shape === "circle") {
    return Math.hypot(dx, dy) - a.widthMm / 2 - b.widthMm / 2;
  }
  const ea = extent(a);
  const eb = extent(b);
  const gx = dx - ea.halfX - eb.halfX;
  const gy = dy - ea.halfY - eb.halfY;
  return gx > 0 && gy > 0 ? Math.hypot(gx, gy) : Math.max(gx, gy);
}

export function minPairwiseGap(pads: readonly FootprintRenderSourcePad[]): number {
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < pads.length; i += 1) {
    for (let j = i + 1; j < pads.length; j += 1) {
      min = Math.min(min, padGap(pads[i]!, pads[j]!));
    }
  }
  return min;
}

/**
 * True when pad numbers 1..N run counter-clockwise (Y-up, viewed from the
 * top) around the origin starting at pin 1 — the IPC-7351 / JEDEC order.
 */
export function isCounterClockwise(pads: readonly FootprintRenderSourcePad[]): boolean {
  const ordered = [...pads].sort((a, b) => Number(a.number) - Number(b.number));
  const angle = (pad: FootprintRenderSourcePad) => Math.atan2(pad.centerMm.y, pad.centerMm.x);
  const start = angle(ordered[0]!);
  let previous = 0;
  for (const pad of ordered.slice(1)) {
    let delta = angle(pad) - start;
    while (delta <= EPS) delta += 2 * Math.PI;
    if (delta <= previous + EPS) return false;
    previous = delta;
  }
  return true;
}

/** Distinct sorted values, merged within 1 µm. */
export function distinct(values: readonly number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.filter((value, index) => index === 0 || value - sorted[index - 1]! > 1e-3);
}
