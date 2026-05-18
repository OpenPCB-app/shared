# @openpcb/shared

Shared libraries for the [OpenPCB](https://github.com/OpenPCB-app) ecosystem.

## Packages

| Package                                            | Purpose                                                                   | Deps                     |
| -------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------ |
| [`@openpcb/kicad-parsers`](packages/kicad-parsers) | `.kicad_sym`, `.kicad_mod`, KiCad s-expression parsers                    | none                     |
| `@openpcb/rendering-core`                          | Pure render-model builders, IPC-7351B generator, parametric footprints    | none                     |
| `@openpcb/kicad-import`                            | KiCad → normalized library shape (preview models, validation, heuristics) | parsers + rendering-core |
| `@openpcb/step-to-glb`                             | STEP → GLB conversion via occt-import-js (browser worker)                 | three, occt-import-js    |
| `@openpcb/r3f-eda-canvas`                          | React Three Fiber canvas engine, primitives, scene renderers              | react, three, r3f, drei  |

## Install

Packages are distributed via GitHub tags (npm publish later). Subpath installs of this monorepo use [gitpkg](https://gitpkg.vercel.app):

```jsonc
{
  "dependencies": {
    "@openpcb/kicad-parsers": "https://gitpkg.vercel.app/OpenPCB-app/shared/packages/kicad-parsers?v0.1.0",
  },
}
```

## Develop

```bash
npm install
npm test          # bun test across all packages
npm run build     # tsc -p each package
```

## Versioning

Lockstep: all packages share the same tag (`vX.Y.Z`).
