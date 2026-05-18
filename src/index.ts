/**
 * Public surface of `@openpcb/r3f-eda-canvas`.
 *
 * React Three Fiber canvas engine, primitives, scene renderers, preview
 * canvases, camera, interaction, and theme. Browser-only.
 *
 * Peer deps: react, react-dom, three, @react-three/fiber, @react-three/drei.
 */
export * from "./coords.js";
export * from "./layers.js";
export * from "./interaction/index.js";
export * from "./utils/index.js";
export * from "./primitives/index.js";
export * from "./preview/index.js";
export * from "./scene/index.js";
export * from "./camera/use-eda-camera.js";
export * from "./theme/index.js";
export * from "./selection/index.js";
export { snapPointToGrid } from "./tools/index.js";
export type { EditorTool, ToolFactory } from "./tools/types.js";
