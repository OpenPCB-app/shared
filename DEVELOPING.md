# Developing `@openpcb/shared`

Three workflows are supported, picked based on how much you need to iterate:

| Workflow                         | When to use                                                                                      | Setup cost                  | Speed of feedback             |
| -------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------- | ----------------------------- |
| **GitHub-tag install** (default) | You only consume the packages; you don't edit them                                               | none                        | seconds per release           |
| **Local link** (npm link)        | You're actively editing a shared package and want the consumer (e.g. OpenPCB) to pick up changes | one-time `npm link` ritual  | tsc watch + symlink → instant |
| **TypeScript path overlay**      | You're editing both at once and want IDE jump-to-source without dist/ rebuild                    | drop-in `tsconfig.dev.json` | instant (no build at all)     |

## 1. GitHub-tag install (the default)

Consumers add a dependency like:

```jsonc
"@openpcb/kicad-parsers": "github:OpenPCB-app/shared#kicad-parsers-v0.1.2"
```

`npm install` clones the relevant release branch and runs the package's `prepare` script to materialize `dist/`. This is what OpenPCB does today. No setup needed.

## 2. Local link (recommended for active development)

Use this when you're editing a `shared/packages/<pkg>` file and want the change reflected in a consumer immediately, without bumping a version and re-tagging.

### One-time, from `shared/`:

```bash
cd ~/workspace/openpcb/shared
npm install
npm run build          # initial dist/ for every package
npm run link:all       # registers every package with `npm link` globally
```

Keep a watcher running in another terminal so dist/ stays fresh:

```bash
npm run dev            # tsc --watch per package
```

### From each consumer (`OpenPCB/`, eventually `CoreLibrary/` and `Cloud/`):

```bash
cd ~/workspace/openpcb/OpenPCB
npm run shared:link    # symlinks all 5 packages into node_modules
npm run shared:status  # verify
# ... develop ...
npm run shared:unlink  # restore github-tag installs when done
```

`shared:link` expects `shared/` to be a sibling of the consumer directory. Override with `SHARED_DIR=/path/to/shared npm run shared:link`.

### Caveats

- `npm link` symlinks point at the package's `dist/`, so you must keep `npm run dev` running in `shared/` to rebuild on edit.
- Some bundlers (Vite, esbuild) cache resolved paths; restart the dev server after `npm run shared:link` / `unlink`.
- Tests under Vitest sometimes need a one-time cache nuke: `rm -rf node_modules/.vite`.

## 3. TypeScript path overlay (fastest, IDE-friendly)

For an even tighter loop — no `dist/` rebuild needed, even tsc-watch can be off — drop a `tsconfig.dev.json` into your consumer that maps `@openpcb/*` directly to the package's `src/index.ts`.

In OpenPCB this would be `OpenPCB/tsconfig.dev.json`:

```jsonc
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "paths": {
      "@openpcb/kicad-parsers": [
        "../shared/packages/kicad-parsers/src/index.ts",
      ],
      "@openpcb/rendering-core": [
        "../shared/packages/rendering-core/src/index.ts",
      ],
      "@openpcb/kicad-import": ["../shared/packages/kicad-import/src/index.ts"],
      "@openpcb/step-to-glb": ["../shared/packages/step-to-glb/src/index.ts"],
      "@openpcb/r3f-eda-canvas": [
        "../shared/packages/r3f-eda-canvas/src/index.ts",
      ],
    },
  },
}
```

This affects type resolution only — runtime resolution still goes through `node_modules`. Pair with `shared:link` if you want the runtime behavior to follow too.

This file is **not** committed by default — opt-in per developer.

## Releasing a new version

Independent semver per package. When you change a package:

1. Bump `packages/<pkg>/package.json` `version`.
2. Commit + push to `main`.
3. Tag the commit `<pkg>-vX.Y.Z` and push the tag.
4. The GitHub Actions release workflow (`.github/workflows/release.yml`) handles the subtree split + release branch + retag.

Consumers update their pinned tag and run `npm install`.

## Testing matrix

| Package               | Test runner    | Command            |
| --------------------- | -------------- | ------------------ |
| kicad-parsers         | bun            | `bun test tests`   |
| rendering-core        | bun            | `bun test tests`   |
| kicad-import          | bun            | `bun test src`     |
| step-to-glb           | (browser-only) | tested in consumer |
| r3f-eda-canvas        | (browser-only) | tested in consumer |
| opclib-pack (Phase 3) | bun            | `bun test tests`   |
