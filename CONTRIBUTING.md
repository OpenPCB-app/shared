# Contributing to OpenPCB shared/

`shared/` hosts the `@openpcb/*` npm packages consumed by OpenPCB (and any other downstream): KiCad parsers, rendering primitives, `.opclib` pack/unpack, STEP→GLB, command pattern, contracts.

## Quick start

```bash
git clone https://github.com/OpenPCB-app/shared.git
cd shared
npm install
npm run build       # build every package's dist/
npm run test        # bun test across packages
npm run typecheck
```

Requirements: Node 22+, Bun ≥1.3 (for tests), npm 10+.

## Layout

```
shared/
└── packages/
    ├── kicad-parsers/
    ├── rendering-core/
    ├── kicad-import/
    ├── step-to-glb/
    ├── r3f-eda-canvas/
    ├── opclib-pack/
    ├── command-pattern/
    └── contracts/
```

Each package is independent: own `package.json`, own version, own GitHub tag. Cross-package deps inside `shared/` go through the workspace.

## Local development against OpenPCB

```bash
cd ../OpenPCB
npm run shared:link    # symlinks node_modules/@openpcb/* to ../shared/packages/*
npm run shared:status  # show current link state
npm run shared:unlink  # restore github-tag installs
```

`shared/packages/*` build on install (`prepare` scripts). If `dist/` is missing after `npm install`, run `npm run build` in `shared/`.

## Before opening a PR

```bash
npm run typecheck
npm run test
npm run build      # verify all dist/ rebuild cleanly
```

## Release ritual

Per-package semver tags drive subtree-split publishing:

```
git tag <package>-vX.Y.Z       # e.g. opclib-pack-v0.2.1
git push origin <package>-vX.Y.Z
```

The release workflow subtree-splits the package into a temporary branch and retags it at the split commit. Downstream consumers install via `github:OpenPCB-app/shared#<package>-v<X.Y.Z>`.

When bumping a package that OpenPCB depends on, also update the matching `package.json` entry in `OpenPCB/package.json`.

## License

All `@openpcb/*` packages are licensed under **AGPL-3.0-or-later**. By contributing, you agree your contributions are licensed under AGPL-3.0-or-later.
