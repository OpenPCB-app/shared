# @openpcb/command-pattern

Generic ECS world + command-sourcing infrastructure. Powers OpenPCB's schematic + PCB designer; reusable for any editor with undo/redo + multi-client revision tracking.

## What's inside

- `ecs/` — `EcsWorld`, `Entity`, `Component`, `System`, `Query` (generic over `TComponent`)
- `commands/` — `CommandEnvelope<TCommand>`, `CommandResult`, `CommandHistory`, patch + invert + apply
- `revision/` — `Revision`, `RevisionConflict`, `nextRevision()`
- `events/` — `InvalidationEvent`

## Install

```jsonc
{
  "dependencies": {
    "@openpcb/command-pattern": "github:OpenPCB-app/shared#command-pattern-v0.1.0",
  },
}
```

## Usage

```ts
import {
  EcsWorld,
  type CommandEnvelope,
  type CommandResult,
} from "@openpcb/command-pattern";

const world = new EcsWorld<MyComponent>();
// dispatch CommandEnvelope → handler → apply patches → emit InvalidationEvent
```

Pure logic — no DB, no HTTP, no DOM. Browser + Node + Bun safe.
