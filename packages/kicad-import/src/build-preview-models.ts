import {
  buildFootprintRenderModel,
  buildSymbolRenderModel,
  type FootprintRenderModel,
  type FootprintRenderSource,
  type FootprintRenderSourcePad,
  type PointMm,
  type PreviewGraphic,
  type PreviewLabel,
  type PreviewWarning,
  type SymbolRenderModel,
  type SymbolRenderSource,
  type SymbolRenderSourceGraphic,
  type SymbolRenderSourceLabel,
  type SymbolRenderSourcePin,
} from "@openpcb/rendering-core";
import type {
  ParsedKicadFootprint,
  ParsedKicadSymbol,
  ParsedPad,
} from "@openpcb/kicad-parsers";
import {
  KICAD_FOOTPRINT_FRAME_STAMP,
  kicadPadToCanonical,
  kicadPointToCanonical,
} from "./frame.js";
import type { FootprintPreviewModel, FootprintPreviewPad } from "./types.js";

type SNode = Array<string | number | SNode>;

function asSNode(value: unknown): SNode | null {
  return Array.isArray(value) ? (value as SNode) : null;
}

function nodeTag(node: SNode | null): string | null {
  if (!node) {
    return null;
  }
  const tag = node[0];
  return typeof tag === "string" ? tag : null;
}

function childNode(node: SNode | null, tag: string): SNode | null {
  if (!node) {
    return null;
  }
  for (const entry of node) {
    if (!Array.isArray(entry)) {
      continue;
    }
    if (entry[0] === tag) {
      return entry as SNode;
    }
  }
  return null;
}

function children(node: SNode | null, tag: string): SNode[] {
  if (!node) {
    return [];
  }
  const out: SNode[] = [];
  for (const entry of node) {
    if (!Array.isArray(entry)) {
      continue;
    }
    if (entry[0] === tag) {
      out.push(entry as SNode);
    }
  }
  return out;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function valueAt(node: SNode | null, index: number): number | null {
  if (!node) {
    return null;
  }
  return toNumber(node[index]);
}

function textAt(node: SNode | null, index: number): string | null {
  if (!node) {
    return null;
  }
  const value = node[index];
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return null;
}

function parsePointFromChild(node: SNode | null, tag: string): PointMm | null {
  const pointNode = childNode(node, tag);
  const x = valueAt(pointNode, 1);
  const y = valueAt(pointNode, 2);
  if (x === null || y === null) {
    return null;
  }
  return { x, y };
}

function parseStrokeWidth(node: SNode): number {
  const stroke = childNode(node, "stroke");
  const widthNode = childNode(stroke, "width");
  return valueAt(widthNode, 1) ?? 0.15;
}

function parseFill(node: SNode): "none" | "solid" {
  const fillNode = childNode(node, "fill");
  const typeNode = childNode(fillNode, "type");
  const type = textAt(typeNode, 1) ?? "none";
  return type === "none" ? "none" : "solid";
}

function parsePointsNode(node: SNode): PointMm[] {
  const pts = childNode(node, "pts");
  const out: PointMm[] = [];
  for (const xyNode of children(pts, "xy")) {
    const x = valueAt(xyNode, 1);
    const y = valueAt(xyNode, 2);
    if (x === null || y === null) {
      continue;
    }
    out.push({ x, y });
  }
  return out;
}

function symbolGraphicFromNode(
  node: SNode,
  warnings: PreviewWarning[],
): PreviewGraphic | null {
  const tag = nodeTag(node);
  if (!tag) {
    return null;
  }

  if (tag === "rectangle") {
    const start = parsePointFromChild(node, "start");
    const end = parsePointFromChild(node, "end");
    if (!start || !end) {
      return null;
    }
    const minX = Math.min(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    return {
      kind: "rect",
      x: minX,
      y: minY,
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
      fill: parseFill(node),
      strokeWidthMm: parseStrokeWidth(node),
    };
  }

  if (tag === "polyline") {
    const points = parsePointsNode(node);
    if (points.length < 2) {
      return null;
    }
    const first = points[0];
    const last = points[points.length - 1];
    const closed =
      !!first &&
      !!last &&
      Math.abs(first.x - last.x) < 1e-6 &&
      Math.abs(first.y - last.y) < 1e-6;
    return {
      kind: "polyline",
      points,
      closed,
      fill: parseFill(node),
      strokeWidthMm: parseStrokeWidth(node),
    };
  }

  if (tag === "bezier") {
    const points = parsePointsNode(node);
    if (points.length !== 4) {
      warnings.push({
        code: "bezier_points_invalid",
        message: "Bezier element without four control points was skipped",
      });
      return null;
    }
    return {
      kind: "bezier",
      points: [points[0]!, points[1]!, points[2]!, points[3]!],
      strokeWidthMm: parseStrokeWidth(node),
    };
  }

  if (tag === "circle") {
    const center = parsePointFromChild(node, "center");
    const radiusNode = childNode(node, "radius");
    const radius = valueAt(radiusNode, 1);
    if (!center || radius === null) {
      return null;
    }
    return {
      kind: "circle",
      center,
      radiusMm: Math.abs(radius),
      fill: parseFill(node),
      strokeWidthMm: parseStrokeWidth(node),
    };
  }

  if (tag === "arc") {
    const start = parsePointFromChild(node, "start");
    const mid = parsePointFromChild(node, "mid");
    const end = parsePointFromChild(node, "end");
    if (!start || !mid || !end) {
      warnings.push({
        code: "arc_format_unsupported",
        message: "Arc without start/mid/end was skipped",
      });
      return null;
    }
    return {
      kind: "arc3",
      start,
      mid,
      end,
      strokeWidthMm: parseStrokeWidth(node),
    };
  }

  if (tag === "text") {
    return null;
  }

  warnings.push({
    code: "symbol_graphic_unsupported",
    message: `Unsupported symbol graphic '${tag}' was skipped`,
  });
  return null;
}

function pointFromUnknown(value: unknown): PointMm | null {
  if (Array.isArray(value)) {
    const x = toNumber(value[0]);
    const y = toNumber(value[1]);
    if (x === null || y === null) {
      return null;
    }
    return { x, y };
  }
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const x = toNumber(record.x);
  const y = toNumber(record.y);
  if (x === null || y === null) {
    return null;
  }
  return { x, y };
}

/**
 * A footprint-local point, read from a parsed KiCad node (frame K, Y-down) and
 * mapped to the canonical Y-up frame. Every footprint graphic and label point
 * goes through here — the one K→C boundary (KF1); the symbol path never does.
 */
function fp(value: unknown): PointMm | null {
  const point = pointFromUnknown(value);
  return point ? kicadPointToCanonical(point) : null;
}

function footprintGraphicFromParsed(
  graphic: ParsedKicadFootprint["graphics"][number],
  warnings: PreviewWarning[],
): { graphic: PreviewGraphic | null; label: PreviewLabel | null } {
  const layer = graphic.layer;

  if (graphic.type === "line") {
    const start = fp(graphic.data.start);
    const end = fp(graphic.data.end);
    if (!start || !end) {
      return { graphic: null, label: null };
    }
    return {
      graphic: {
        kind: "line",
        a: start,
        b: end,
        strokeWidthMm: toNumber(graphic.data.width) ?? 0.12,
        layer,
      },
      label: null,
    };
  }

  if (graphic.type === "rect") {
    // Corners are converted BEFORE the min/abs below, so the rect's origin is
    // its canonical bottom-left corner, not the image of KiCad's top-left one.
    const start = fp(graphic.data.start);
    const end = fp(graphic.data.end);
    if (!start || !end) {
      return { graphic: null, label: null };
    }
    return {
      graphic: {
        kind: "rect",
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width: Math.abs(end.x - start.x),
        height: Math.abs(end.y - start.y),
        fill: "none",
        strokeWidthMm: toNumber(graphic.data.width) ?? 0.12,
        layer,
      },
      label: null,
    };
  }

  if (graphic.type === "circle") {
    const center = fp(graphic.data.center);
    const end = fp(graphic.data.end);
    if (!center || !end) {
      return { graphic: null, label: null };
    }
    return {
      graphic: {
        kind: "circle",
        center,
        radiusMm: Math.hypot(end.x - center.x, end.y - center.y),
        fill: "none",
        strokeWidthMm: toNumber(graphic.data.width) ?? 0.12,
        layer,
      },
      label: null,
    };
  }

  if (graphic.type === "arc") {
    // Mapped pointwise: the reflection reverses the arc's signed turn, which
    // is exactly what a mirrored arc must do.
    const start = fp(graphic.data.start);
    const mid = fp(graphic.data.mid);
    const end = fp(graphic.data.end);
    if (!start || !mid || !end) {
      warnings.push({
        code: "footprint_arc_format_unsupported",
        message: "Footprint arc without start/mid/end was skipped",
      });
      return { graphic: null, label: null };
    }
    return {
      graphic: {
        kind: "arc3",
        start,
        mid,
        end,
        strokeWidthMm: toNumber(graphic.data.width) ?? 0.12,
        layer,
      },
      label: null,
    };
  }

  if (graphic.type === "poly") {
    const rawPoints = Array.isArray(graphic.data.pts) ? graphic.data.pts : [];
    const points: PointMm[] = [];
    for (const rawPoint of rawPoints) {
      if (!Array.isArray(rawPoint)) {
        continue;
      }
      if (rawPoint[0] !== "xy") {
        continue;
      }
      const x = toNumber(rawPoint[1]);
      const y = toNumber(rawPoint[2]);
      if (x === null || y === null) {
        continue;
      }
      points.push(kicadPointToCanonical({ x, y }));
    }
    if (points.length < 2) {
      return { graphic: null, label: null };
    }
    return {
      graphic: {
        kind: "polyline",
        points,
        closed: true,
        fill: "none",
        strokeWidthMm: toNumber(graphic.data.width) ?? 0.12,
        layer,
      },
      label: null,
    };
  }

  if (graphic.type === "text") {
    // Prefer structured `text` payload from the parser (covers fp_text and
    // KiCad 8+ `(property "Reference"|"Value" ...)`); fall back to the legacy
    // freeform path for parser builds that don't populate it.
    const parsed = graphic.text;
    if (parsed) {
      if (parsed.hidden) {
        // KiCad `hide` flag: never display, never contribute to bounds.
        return { graphic: null, label: null };
      }
      const role: PreviewLabel["role"] =
        parsed.kind === "reference"
          ? "reference"
          : parsed.kind === "value"
            ? "value"
            : "footprint-text";
      // The id embeds the CONVERTED anchor; the rotation is a KiCad angle,
      // which is already math-CCW in the Y-up frame (unchanged by KF1).
      const at = kicadPointToCanonical(parsed.position);
      return {
        graphic: null,
        label: {
          id: `fp-text:${layer}:${at.x}:${at.y}:${parsed.content}`,
          text: normalizeFootprintText(parsed.content),
          at,
          fontSizeMm: parsed.fontSizeMm ?? 1.0,
          rotationDeg: parsed.rotation,
          anchorX: parsed.justifyH,
          anchorY:
            parsed.justifyV === "top"
              ? "top"
              : parsed.justifyV === "bottom"
                ? "bottom"
                : "middle",
          layer,
          role,
        },
      };
    }

    const args = Array.isArray(graphic.data.__args) ? graphic.data.__args : [];
    const contentRaw = args[1] ?? args[0];
    const content = typeof contentRaw === "string" ? contentRaw : "";
    const atNode = Array.isArray(graphic.data.at) ? graphic.data.at : [];
    const at = kicadPointToCanonical({
      x: toNumber(atNode[0]) ?? 0,
      y: toNumber(atNode[1]) ?? 0,
    });
    const rotationDeg = toNumber(atNode[2]) ?? 0;
    return {
      graphic: null,
      label: {
        id: `fp-text:${layer}:${at.x}:${at.y}:${content}`,
        text: normalizeFootprintText(content),
        at,
        fontSizeMm: 1.0,
        rotationDeg,
        anchorX: "center",
        anchorY: "middle",
        layer,
        role: "footprint-text",
      },
    };
  }

  warnings.push({
    code: "footprint_graphic_unsupported",
    message: `Unsupported footprint graphic '${graphic.type}' was skipped`,
  });
  return { graphic: null, label: null };
}

function normalizeFootprintText(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return "";
  }

  return trimmed
    .replace(/\$\{REFERENCE\}/g, "REF**")
    .replace(/\$\{VALUE\}/g, "VALUE")
    .replace(/\$\{[^}]+\}/g, "TEXT");
}

export function buildSymbolPreviewFromParsed(
  symbol: ParsedKicadSymbol,
): SymbolRenderModel {
  const warnings: PreviewWarning[] = [...symbol.warnings];

  const pins: SymbolRenderSourcePin[] = symbol.pins.map((pin, index) => {
    const number = pin.number.trim().length > 0 ? pin.number : null;
    const id =
      number !== null
        ? `u${pin.unit}:${number}`
        : `u${pin.unit}:idx${index + 1}`;
    // Honour KiCad visibility: symbol-level `(pin_names hide)` / `(pin_numbers
    // hide)` and per-pin name/number hide. Diodes, LEDs and connectors hide
    // pin names by convention — drawing them produced the K⨯A / Pin_1⨯Pin_2
    // overlaps. Hidden name → empty (the renderer skips empty/`~`); hidden
    // number → null (id keeps the real number for pin-mapping).
    const nameHidden = symbol.hidePinNames || pin.nameHidden;
    const numberHidden = symbol.hidePinNumbers || pin.numberHidden;
    return {
      id,
      name: nameHidden ? "" : pin.name,
      number: numberHidden ? null : number,
      electricalType: pin.electricalType,
      positionMm: {
        x: pin.position.x,
        y: pin.position.y,
      },
      lengthMm: pin.length,
      rotationDeg: pin.rotation,
      unit: pin.unit,
      hidden: pin.hidden,
      nameFontSizeMm: pin.nameFontSizeMm,
      numberFontSizeMm: pin.numberFontSizeMm,
    };
  });

  const graphics: SymbolRenderSourceGraphic[] = [];
  const labels: SymbolRenderSourceLabel[] = [];

  for (const bodyGraphic of symbol.bodyGraphics) {
    const node = asSNode(bodyGraphic.node);
    if (!node) {
      continue;
    }

    const tag = nodeTag(node);
    if (tag === "text") {
      const at = childNode(node, "at");
      const x = valueAt(at, 1) ?? 0;
      const y = valueAt(at, 2) ?? 0;
      const rotationDeg = valueAt(at, 3) ?? 0;
      const content = textAt(node, 1) ?? "";
      if (content.trim().length > 0) {
        labels.push({
          unit: bodyGraphic.unit,
          label: {
            id: `symbol-text:${bodyGraphic.unit}:${x}:${y}:${content}`,
            text: content,
            at: { x, y },
            fontSizeMm: 0.8,
            rotationDeg,
            anchorX: "center",
            anchorY: "middle",
          },
        });
      }
      continue;
    }

    const graphic = symbolGraphicFromNode(node, warnings);
    if (!graphic) {
      continue;
    }

    graphics.push({
      unit: bodyGraphic.unit,
      graphic,
    });
  }

  const source: SymbolRenderSource = {
    name: symbol.name,
    unitCount: Math.max(symbol.units, 1),
    referenceText: symbol.properties.Reference ?? "",
    valueText: symbol.properties.Value ?? symbol.name,
    pins,
    graphics,
    labels,
    warnings,
    referenceFontSizeMm: symbol.referenceFontSizeMm,
    valueFontSizeMm: symbol.valueFontSizeMm,
  };

  // Compose every unit side by side. KiCad draws each unit of a multi-unit part
  // at the SAME local coordinates, so a unit-1-only preview left the remaining
  // units' pins coincident — four LM324 op-amp outputs all landed on (7.62, 0)
  // and any coordinate-based net derivation shorted them together.
  //
  // `preserveOrigin` must be off whenever there is more than one unit: it is
  // what disables the per-unit X translation, and preserving the origin while
  // composing would stack the units right back on top of each other. Single-unit
  // symbols keep the preserved origin so their coordinates stay untouched.
  const composeAllUnits = source.unitCount > 1;
  const model = buildSymbolRenderModel(source, {
    composeAllUnits,
    includeHiddenPins: false,
    preserveOrigin: !composeAllUnits,
  });

  return model;
}

/** Graphic layers admitted into a footprint preview. */
const PREVIEW_GRAPHIC_LAYERS: readonly string[] = [
  "F.SilkS",
  "B.SilkS", // KiCad 7
  "F.Silkscreen",
  "B.Silkscreen", // KiCad 8+
  "F.Fab",
  "B.Fab", // KiCad 7
  "F.Fabrication",
  "B.Fabrication", // KiCad 8+
  // Courtyard is the part's keep-out envelope — the PCB renderer, the
  // assembly view preset and the auto-placer's overlap legality gate all
  // expect it. Note it is also the outermost outline, so admitting it
  // grows the model's bounds (and therefore selection/hit regions) to the
  // true component extent.
  "F.CrtYd",
  "B.CrtYd", // KiCad 7
  "F.Courtyard",
  "B.Courtyard", // KiCad 8+
  // Mask/paste apertures — needed for stencil and gerber fidelity.
  "F.Mask",
  "B.Mask",
  "F.Paste",
  "B.Paste",
];

/** Copper layers a pad can claim. Also the preview's pad allowlist. */
const COPPER_PAD_LAYERS: readonly string[] = ["F.Cu", "B.Cu", "*.Cu"];
const PASTE_PAD_LAYERS: readonly string[] = ["F.Paste", "B.Paste"];

/**
 * A stencil-only sub-aperture: the unnumbered paste windows KiCad uses to
 * segment a thermal/exposed pad. Numbered pads and anything carrying copper
 * are excluded, so nothing electrical can be mistaken for one.
 */
function isPasteOnlyPad(pad: ParsedPad): boolean {
  if ((pad.number ?? "").trim().length > 0) {
    return false;
  }
  return (
    pad.layers.some((layer) => PASTE_PAD_LAYERS.includes(layer)) &&
    !pad.layers.some((layer) => COPPER_PAD_LAYERS.includes(layer))
  );
}

function footprintPadFromParsed(
  pad: ParsedPad,
  index: number,
  warnings: PreviewWarning[],
): FootprintPreviewPad {
  const isRenderedShape =
    pad.shape === "circle" ||
    pad.shape === "rect" ||
    pad.shape === "oval" ||
    pad.shape === "roundrect";

  if (!isRenderedShape) {
    warnings.push({
      code: "footprint_pad_shape_degraded",
      message: `Pad ${pad.number || index + 1} shape '${pad.shape}' rendered as rect`,
    });
  }

  // A `circle` pad is a disc of `widthMm` — the one interpretation DRC, the
  // copper record and the Gerber writer share. KiCad occasionally carries an
  // unequal size on a circle; normalizing it here keeps the ellipse reading
  // from ever reaching a consumer.
  const isCircle = pad.shape === "circle";
  if (isCircle && pad.size.height !== pad.size.width) {
    warnings.push({
      code: "footprint_pad_circle_size_normalized",
      message: `Pad ${pad.number || index + 1} circle size ${pad.size.width} x ${pad.size.height} normalized to a disc of ${pad.size.width}`,
    });
  }

  // A centred drill states nothing: `(offset 0 0)` is the KiCad default, so it
  // must leave the pad's emitted shape exactly as it was.
  const drillOffset =
    pad.drillOffset && (pad.drillOffset.x !== 0 || pad.drillOffset.y !== 0)
      ? pad.drillOffset
      : undefined;
  // KiCad's hole sits at `at` and its copper at `at + RotK(offset, α)`; the
  // canonical pad is the reverse (copper at centerMm, hole offset from it).
  // KF1 §3.1.2 — `kicadPadToCanonical` carries the derivation. The angle is
  // unchanged by the frame conversion.
  const { centerMm, drillOffsetMm } = kicadPadToCanonical({
    position: pad.position,
    rotation: pad.rotation,
    ...(drillOffset ? { drillOffset } : {}),
  });

  const normalizedNumber = (pad.number ?? "").trim();
  return {
    id: `${normalizedNumber || "?"}:${index}`,
    number: normalizedNumber,
    shape: isRenderedShape ? pad.shape : "rect",
    centerMm,
    widthMm: pad.size.width,
    heightMm: isCircle ? pad.size.width : pad.size.height,
    rotationDeg: pad.rotation,
    roundrectRatio: pad.roundrectRatio,
    drillDiameterMm: pad.drillDiameter,
    drillSlotMm: pad.drillSlot && {
      widthMm: pad.drillSlot.width,
      heightMm: pad.drillSlot.height,
    },
    ...(drillOffsetMm ? { drillOffsetMm } : {}),
    // Absent means plated, so only a KiCad `np_thru_hole` states anything:
    // every other pad keeps the exact shape it had before plating existed.
    ...(pad.type === "np_thru_hole" ? { plated: false } : {}),
    role: isPasteOnlyPad(pad) ? "paste" : undefined,
    layer: pad.layers[0],
    layers: pad.layers,
  };
}

export function buildFootprintPreviewFromParsed(
  footprint: ParsedKicadFootprint,
): FootprintPreviewModel {
  const warnings: PreviewWarning[] = [...footprint.warnings];

  const allPads = footprint.pads.map((pad, index) =>
    footprintPadFromParsed(pad, index, warnings),
  );
  // Paste sub-pads carry no copper, so they are held back from the copper-only
  // builder (its pad allowlist would drop them, and its bounds must stay the
  // copper extent) and appended to the finished model instead.
  const pasteSubPads = allPads.filter((pad) => pad.role === "paste");
  const pads: FootprintRenderSourcePad[] = allPads.filter(
    (pad) => pad.role !== "paste",
  );

  const graphics: PreviewGraphic[] = [];
  const labels: PreviewLabel[] = [];

  for (const graphic of footprint.graphics) {
    const parsed = footprintGraphicFromParsed(graphic, warnings);
    if (parsed.graphic) {
      graphics.push(parsed.graphic);
    }
    if (parsed.label) {
      labels.push(parsed.label);
    }
  }

  const source: FootprintRenderSource = {
    name: footprint.name,
    pads,
    graphics,
    labels,
    warnings,
  };

  const model = buildFootprintRenderModel(source, {
    includeLayerNames: PREVIEW_GRAPHIC_LAYERS,
    includePadLayerNames: COPPER_PAD_LAYERS,
  });

  return {
    ...model,
    ...(pasteSubPads.length > 0
      ? { pads: [...model.pads, ...pasteSubPads] }
      : {}),
    frame: KICAD_FOOTPRINT_FRAME_STAMP,
  };
}
