# @openpcb/step-to-glb

STEP file → GLB conversion via [`occt-import-js`](https://github.com/kovacsv/occt-import-js) WASM in a Web Worker.

## Install

```jsonc
{
  "dependencies": {
    "@openpcb/step-to-glb": "github:OpenPCB-app/shared#step-to-glb-v0.1.0",
    "three": "^0.183.0",
    "occt-import-js": "^0.0.23",
  },
}
```

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
  // result.glbBytes, result.sha256
}
```

## Notes

- Worker ships as raw TypeScript (`src/step-to-glb.worker.ts`) because it depends on Vite-specific `?raw` and `?url` query imports for the occt-import-js WASM bundle. Non-Vite consumers must bundle the worker themselves.
- v0.2 will add a Node.js entrypoint (`@openpcb/step-to-glb/node`) for server-side conversion.
