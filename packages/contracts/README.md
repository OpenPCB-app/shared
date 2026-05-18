# @openpcb/contracts

Wire-format contracts for OpenPCB modules. Pure TypeScript types + a minimal `AppError` hierarchy. Consumed by the desktop app, Cloud, and CoreLibrary admin.

## What's inside

- `sdks/` — `LibrarySDK`, `DesignerSDK`, `TasksSDK`, `AssistantSDK` types plus `MODULE_SDK_TOKENS`. Covers commands, projections, library shapes, PCB layer constants, etc.
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
