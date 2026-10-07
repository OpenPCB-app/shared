# @openpcb/contracts

Wire-format contracts for OpenPCB modules. Pure TypeScript types + a minimal `AppError` hierarchy. Consumed by the desktop app, Cloud, and CoreLibrary admin.

## What's inside

- `sdks/` — `LibrarySDK`, `DesignerSDK`, `TasksSDK`, cloud Copilot and billing types plus `MODULE_SDK_TOKENS`. Covers commands, projections, library shapes, PCB layer constants, etc.
- `library/import.ts` — KiCad inspect/commit request/response types, model3D candidate metadata.
- `errors/` — `ProblemDetails` (RFC 7807), `AppError`, `ValidationError`, `NotFoundError`, `MethodNotAllowedError`.

## Install

```jsonc
{
  "dependencies": {
    "@openpcb/contracts": "github:OpenPCB-app/shared#contracts-v0.1.0",
  },
}
```

Pulls `@openpcb/command-pattern` and `@openpcb/rendering-core` transitively.

## Candidate release boundary

`1.0.0-candidate.0` is an unpublished breaking candidate. Publication and consumer
release pins remain pending; this version does not identify a published GitHub tag.

The candidate removes the obsolete assistant SDK and generic AI type exports,
including the assistant subpath. OpenPCB owns its assistant DTOs and composes
AgentKit's canonical generic contracts locally. Historical contracts tags retain
their existing API. Library, designer, tasks, cloud Copilot, billing, sharing,
import, and error contracts remain available. This package has no dependency on
an AI runtime or AgentKit.

## Local candidate verification

From the shared repository root:

```bash
node scripts/pack-domain-candidates.mjs --out /tmp/openpcb-domain-candidates
npm run gen:check --workspace packages/contracts
bun test packages/contracts/tests packages/opclib-pack/tests
```

The packaging script starts with clean temporary source copies, runs each
package's canonical `npm pack` lifecycle, verifies the contracts runtime boundary,
and records tarball paths, versions, file counts, dependencies, and SHA-256 hashes
in `shared-candidate-artifacts.json` under the chosen output directory. Build-only
paths use already installed shared dependencies; repository `node_modules`,
package locks, canvas packages, and release tags remain untouched. The script
packs only contracts and opclib-pack. The outputs are local verification artifacts,
not evidence of publication.
