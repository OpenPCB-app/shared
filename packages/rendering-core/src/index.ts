/**
 * Public surface of `@openpcb/rendering-core`.
 *
 * Pure render-model builders, geometry helpers, IPC-7351B footprint
 * generator, and parametric component generators. Zero React/Three.js deps —
 * safe in browser, Node, and Bun.
 */
export * from "./types.js";
export * from "./geometry.js";
export * from "./constants.js";
export { buildSymbolRenderModel } from "./symbol-preview-builder.js";
export { buildFootprintRenderModel } from "./footprint-preview-builder.js";
export {
  boundsFromPadsAndGraphics,
  footprintGeometryBounds,
  footprintVisualBounds,
} from "./footprint-bounds.js";
export * from "./ipc7351b/index.js";
export * from "./parametric/index.js";
