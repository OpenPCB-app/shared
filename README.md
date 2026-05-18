# @openpcb/shared

Shared libraries for the [OpenPCB](https://github.com/OpenPCB-app) ecosystem. Independent npm packages, distributed via GitHub tags.

## Packages

| Package                                              | Purpose                                                                   | Latest tag              | Runtime deps            |
| ---------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------- | ----------------------- |
| [`@openpcb/kicad-parsers`](packages/kicad-parsers)   | `.kicad_sym`, `.kicad_mod`, KiCad s-expression parsers                    | `kicad-parsers-v0.1.2`  | none                    |
| [`@openpcb/rendering-core`](packages/rendering-core) | Pure render-model builders, IPC-7351B generator, parametric footprints    | `rendering-core-v0.1.1` | none                    |
| [`@openpcb/kicad-import`](packages/kicad-import)     | KiCad → normalized library shape (preview models, validation, heuristics) | `kicad-import-v0.1.0`   | kicad-parsers + core    |
| [`@openpcb/step-to-glb`](packages/step-to-glb)       | STEP → GLB conversion via occt-import-js (browser worker, Vite-only)      | `step-to-glb-v0.1.3`    | three, occt-import-js   |
| [`@openpcb/r3f-eda-canvas`](packages/r3f-eda-canvas) | React Three Fiber canvas engine, primitives, scene renderers              | `r3f-eda-canvas-v0.1.2` | react, three, r3f, drei |

## Install (consumer)

Each package is published as its own per-package tag on the monorepo. The release workflow runs `git subtree split` to expose the package contents at the repo root of a `release/<pkg>-vX.Y.Z` branch; the tag (`<pkg>-vX.Y.Z`) points at the same commit, so `npm install` resolves the subdirectory automatically.

```jsonc
{
  "dependencies": {
    "@openpcb/kicad-parsers": "github:OpenPCB-app/shared#kicad-parsers-v0.1.2",
    "@openpcb/rendering-core": "github:OpenPCB-app/shared#rendering-core-v0.1.1",
    "@openpcb/kicad-import": "github:OpenPCB-app/shared#kicad-import-v0.1.0",
    "@openpcb/step-to-glb": "github:OpenPCB-app/shared#step-to-glb-v0.1.3",
    "@openpcb/r3f-eda-canvas": "github:OpenPCB-app/shared#r3f-eda-canvas-v0.1.2",
  },
}
```

Each package's `prepare` script builds `dist/` on install, so consumers don't need to ship pre-built artifacts.

## Versioning

**Independent semver per package.** Each package bumps when its own surface changes; cross-package deps are pinned by tag. When a downstream package needs a newer upstream, the downstream bumps its own version and re-pins. No "lockstep" — bumping one package never forces a sibling re-release.

## Local development against a consumer

When you're iterating on a shared package and want to see changes in OpenPCB (or any consumer) immediately, use the **local link** workflow instead of waiting for tag releases.

From a workspace layout like:

```
~/workspace/openpcb/
├── shared/            ← this repo
├── OpenPCB/           ← consumer
├── Cloud/             ← consumer (future)
└── CoreLibrary/       ← consumer
```

### One-time setup

```bash
# 1. Build all packages once
cd shared
npm install
npm run build

# 2. Watch source for changes (separate terminal)
npm run dev
```

### Link from a consumer

```bash
# From the consumer (OpenPCB / CoreLibrary / Cloud)
npm run shared:link                 # links all 5 packages
# ...edit packages under ~/workspace/openpcb/shared/packages/<pkg>/src/
# tsc --watch in shared/ rebuilds dist/ → linked consumer picks it up instantly

npm run shared:unlink               # restore github-tag installs
```

Behind the scenes `shared:link` uses `npm link` to symlink each `@openpcb/*` package from the consumer's `node_modules/` to the local source tree. `shared:unlink` re-installs from the pinned github tags. The exact scripts live in each consumer's `package.json`.

### Manual link (if your consumer doesn't have the helper scripts yet)

```bash
# From each package directory you want to link
cd ~/workspace/openpcb/shared/packages/kicad-parsers
npm link

# From the consumer
cd ~/workspace/openpcb/OpenPCB
npm link @openpcb/kicad-parsers
```

To restore: `npm unlink @openpcb/kicad-parsers && npm install`.

## Develop (inside this repo)

```bash
npm install        # install workspace deps
npm test           # bun test across all packages
npm run build      # tsc per package, emits dist/
npm run dev        # tsc --watch per package (use with consumer link)
npm run typecheck  # composite project typecheck
```

## Release

Releases are automated by the GitHub Actions workflow `.github/workflows/release.yml`. To cut a new version:

1. Bump `version` in the relevant `packages/<pkg>/package.json` (and any downstream that needs to consume it).
2. Commit + push to `main`.
3. Push a tag `<pkg>-vX.Y.Z`. The workflow subtree-splits the package into a release branch, retags, and tidies up.

Old manual ritual (still works if needed):

```bash
git subtree split --prefix=packages/<pkg> -b release/<pkg>-vX.Y.Z
git push origin release/<pkg>-vX.Y.Z
git tag <pkg>-vX.Y.Z release/<pkg>-vX.Y.Z
git push origin <pkg>-vX.Y.Z
```

## License

MIT.
