/**
 * The KiCad → canonical frame conversion for footprint-local geometry.
 *
 * KiCad footprint files (frame K) are +x right, +y DOWN. OpenPCB's canonical
 * model (frame C) is +x right, +y UP. With `N = diag(1, −1)`:
 *
 * - point: `p_C = N·p_K`;
 * - angle: unchanged. KiCad's `RotatePoint` is math-CW in Y-down, i.e.
 *   visually CCW, and `N·RotK(p, θ) = R(θ)·N·p`, so a KiCad angle IS the
 *   math-CCW angle in Y-up;
 * - a 3-point arc maps pointwise, which reverses its signed turn — correct
 *   for a reflection.
 *
 * This module is THE one conversion site for `.kicad_mod` geometry. Only the
 * footprint builders in `build-preview-models.ts` convert data with it
 * (`frame-delta.ts` uses it to PREDICT a converted model, never to store one);
 * the parsed `raw` stays in K and is never rendered. The symbol path is
 * untouched: `.kicad_sym` coordinates are Y-up already.
 */
import type { PointMm } from "@openpcb/rendering-core";
import type { FootprintFrameStamp } from "./types.js";

export const KICAD_FOOTPRINT_TRANSFORM_VERSION = 1 as const;

export const KICAD_FOOTPRINT_FRAME_STAMP: FootprintFrameStamp = Object.freeze({
  frame: "openpcb-y-up",
  origin: "kicad-converted",
  transformVersion: KICAD_FOOTPRINT_TRANSFORM_VERSION,
  tool: "@openpcb/kicad-import",
});

/** Folds `-0` into `0` so no signed zero reaches a stored model. */
function clean(value: number): number {
  return value === 0 ? 0 : value;
}

/** THE single K→C point map for footprint-local geometry. Angles are NOT changed. */
export function kicadPointToCanonical(p: PointMm): PointMm {
  return { x: p.x, y: p.y === 0 ? 0 : -p.y };
}

/** Math-CCW rotation in Y-up; cardinal angles are exact, as in KiCad's `RotatePoint`. */
function rotateCcwDeg(p: PointMm, deg: number): PointMm {
  const n = ((deg % 360) + 360) % 360;
  if (n === 0) return { x: p.x, y: p.y };
  if (n === 90) return { x: -p.y, y: p.x };
  if (n === 180) return { x: -p.x, y: -p.y };
  if (n === 270) return { x: p.y, y: -p.x };
  const r = (n * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

/**
 * Pad centre + drill offset, K→C.
 *
 * KiCad puts the HOLE at the pad's `at` and the COPPER at
 * `at + RotK(offset, α)` — `PAD::ShapePos()` (pcbnew/pad.cpp, KiCad 8.0.4):
 * `loc_offset = m_offset; RotatePoint(loc_offset, m_orient);
 *  shape_pos = m_pos + loc_offset;` with `RotatePoint` (libs/kimath trigo.cpp)
 * `x' = y·sin + x·cos, y' = y·cos − x·sin`.
 *
 * OpenPCB's native convention is the reverse (copper at `centerMm`, hole at
 * `centerMm + R(α)·drillOffsetMm`), so:
 * - `centerMm = N·(at + RotK(offset, α)) = N·at + R(α)·N·offset`
 * - `drillOffsetMm = −N·offset = (−ox, +oy)`
 * and the hole lands at `centerMm + R(α)·drillOffsetMm = N·at`.
 *
 * A missing or `(0, 0)` offset (KiCad's default) states nothing: the result
 * then carries no `drillOffsetMm`.
 */
export function kicadPadToCanonical(pad: {
  position: PointMm;
  rotation: number;
  drillOffset?: PointMm;
}): { centerMm: PointMm; drillOffsetMm?: PointMm } {
  const at = kicadPointToCanonical(pad.position);
  const offset = pad.drillOffset;
  if (!offset || (offset.x === 0 && offset.y === 0)) {
    return { centerMm: at };
  }
  const nOffset = kicadPointToCanonical(offset);
  const shift = rotateCcwDeg(nOffset, pad.rotation);
  return {
    centerMm: { x: clean(at.x + shift.x), y: clean(at.y + shift.y) },
    drillOffsetMm: { x: clean(-nOffset.x), y: clean(-nOffset.y) },
  };
}
