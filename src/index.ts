/**
 * Public surface of `@openpcb/step-to-glb`.
 *
 * STEP-file tessellation to GLB via the occt-import-js WASM module, running
 * in a Web Worker. THREE.js scene construction + GLTFExporter.
 *
 * Worker entry must be imported separately by the consumer via Vite's
 * `?worker` query, since the worker source references Vite-specific
 * `?raw` / `?url` imports for the occt-import-js bundle:
 *
 * ```ts
 * import StepToGlbWorker from "@openpcb/step-to-glb/worker?worker";
 * convertStepToGlb(bytes, params, ref, signal, () => new StepToGlbWorker());
 * ```
 */
export {
  convertStepToGlb,
  type TessellationParams,
  type Model3DRef,
  type StepToGlbRequest,
  type StepToGlbOkResult,
  type StepToGlbErrorResult,
  type ConversionResult,
  type StepToGlbWorkerRequest,
  type StepToGlbWorkerCancelRequest,
  type StepToGlbWorkerResponse,
} from "./step-to-glb.js";
export { getCategoryMaterial } from "./category-materials.js";
export { applyCategoryMaterial } from "./apply-category-material.js";
export { convertStepToGlbNode } from "./node.js";
