/**
 * Public surface of `@openpcb/rendering-core`.
 *
 * Pure render-model builders, geometry helpers, IPC-7351B footprint
 * generator, and parametric component generators. Zero React/Three.js deps —
 * safe in browser, Node, and Bun.
 */
export * from "./types";
export * from "./geometry";
export * from "./constants";
export { buildSymbolRenderModel } from "./symbol-preview-builder";
export { buildFootprintRenderModel } from "./footprint-preview-builder";
export {
  boundsFromPadsAndGraphics,
  footprintGeometryBounds,
  footprintVisualBounds,
} from "./footprint-bounds";
export * from "./ipc7351b";
export * from "./parametric";
