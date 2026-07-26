import { boundsFromPadsAndGraphics } from "./footprint-bounds.js";
import { isFiniteBoundsMm, normalizeBounds } from "./geometry.js";
import type {
  BuildFootprintRenderModelOptions,
  FootprintRenderModel,
  FootprintRenderSource,
  FootprintRenderSourcePad,
} from "./types.js";

function filterByLayer(
  includeLayerNames: readonly string[] | undefined,
  layer: string | undefined,
): boolean {
  if (!includeLayerNames || includeLayerNames.length === 0) {
    return true;
  }
  if (!layer) {
    return false;
  }
  return includeLayerNames.includes(layer);
}

/**
 * A pad passes when ANY of its layers is allowed. Matching only `layer` (the
 * primary copper layer) would drop pads whose copper layer differs from the
 * allowlist even though they carry an allowed mask/paste aperture.
 */
function padPassesLayerFilter(
  includePadLayerNames: readonly string[] | undefined,
  pad: FootprintRenderSourcePad,
): boolean {
  if (!includePadLayerNames || includePadLayerNames.length === 0) {
    return true;
  }
  const layers =
    pad.layers && pad.layers.length > 0
      ? pad.layers
      : pad.layer
        ? [pad.layer]
        : [];
  return layers.some((layer) => includePadLayerNames.includes(layer));
}

export function buildFootprintRenderModel(
  source: FootprintRenderSource,
  options: BuildFootprintRenderModelOptions = {},
): FootprintRenderModel {
  const graphics = source.graphics.filter((graphic) =>
    filterByLayer(options.includeLayerNames, graphic.layer),
  );

  const labels = source.labels.filter((label) =>
    filterByLayer(options.includeLayerNames, label.layer),
  );

  const pads = options.includePadLayerNames
    ? source.pads.filter((pad) =>
        padPassesLayerFilter(options.includePadLayerNames, pad),
      )
    : source.pads;

  // Bounds from pads + graphics only. Labels are excluded so that PCB
  // selection/hit regions are not inflated by KiCad value/reference text
  // anchored far outside the body. Library preview tile recomputes a
  // label-inclusive bbox at runtime via `footprintVisualBounds`.
  const bounds = boundsFromPadsAndGraphics({ pads, graphics });

  const resolvedBounds = isFiniteBoundsMm(bounds)
    ? normalizeBounds(bounds, 2.0)
    : null;

  return {
    kind: "footprint",
    units: "mm",
    name: source.name,
    pads,
    graphics,
    labels,
    bounds: resolvedBounds,
    warnings: source.warnings,
  };
}
