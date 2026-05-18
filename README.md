# @openpcb/step-to-glb

STEP file → GLB conversion via [`occt-import-js`](https://github.com/kovacsv/occt-import-js) WASM running inside a Web Worker. Three.js scene construction + GLTFExporter.

## Status

**Vite-only.** The worker source uses Vite-specific `?raw` and `?url` query imports for the occt-import-js WASM bundle. Vite (with `?worker` query) is the supported bundler. Non-Vite consumers (webpack, esbuild, rollup) must construct the worker themselves from the source files.

Server-side / Node.js conversion is planned as a separate entry (`@openpcb/step-to-glb/node`) for a future release.

## Install

```jsonc
{
  "dependencies": {
    "@openpcb/step-to-glb": "github:OpenPCB-app/shared#step-to-glb-v0.1.3",
    "three": "^0.183.0",
    "occt-import-js": "^0.0.23",
  },
}
```

Peer dependencies (must be installed by the consumer):

| Peer             | Range             |
| ---------------- | ----------------- |
| `three`          | `>=0.180.0 <1`    |
| `occt-import-js` | `>=0.0.22 <0.1.0` |

## Usage (Vite consumer)

```ts
import { convertStepToGlb } from "@openpcb/step-to-glb";
import StepToGlbWorker from "@openpcb/step-to-glb/worker?worker";

const result = await convertStepToGlb(
  stepBytes,
  params,
  modelRef,
  signal,
  () => new StepToGlbWorker(),
);
if (result.status === "ok") {
  // result.glbBytes (ArrayBuffer), result.sha256 (string)
}
```

The 5th argument (`workerFactory`) is optional but recommended for Vite consumers. It lets the test layer inject a mock worker.

## API

- `convertStepToGlb(stepBytes, params, modelRef?, signal?, workerFactory?)` → `Promise<ConversionResult>`
- `getCategoryMaterial(mountType, tags)` → `MeshLambertMaterial` (subpath `@openpcb/step-to-glb/materials`)
- `applyCategoryMaterial(scene, mountType, tags)` → traverses GLTF, swaps materials in place

## Defaults

| Parameter              | Value              |
| ---------------------- | ------------------ |
| `linearUnit`           | `"millimeter"`     |
| `linearDeflectionType` | `"absolute_value"` |
| `linearDeflection`     | `0.05` mm          |
| `angularDeflection`    | `0.5°`             |
| STEP size cap          | 25 MB              |
| GLB size cap           | 10 MB              |
