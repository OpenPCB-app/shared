# shared/ — Teams / Sharing / Collaboration: CURRENT STATE

> Feature-scoped note for the `@openpcb/*` packages. Last updated **2026-06-10**.
> **Plan:** `~/.claude/plans/act-as-senior-software-atomic-lightning.md`.
> **Cross-repo tracker:** workspace-root `TODO.md`.

## Status: sharing contracts + SDK DONE

Two packages gained the sharing surface for the cloud teams/collaboration feature
(`contracts` builds clean; `cloud-client` builds + 2/2 tests):

- **`@openpcb/contracts`** — NEW `src/sharing/{roles,types,index}.ts`, re-exported from
  `src/index.ts`. `roles.ts` is the **canonical** role + rank model
  (viewer 10 < commenter 20 < editor 30 < admin 40 < owner 50) with runtime helpers
  (`ROLE_RANK`, `rankOf`, `atLeast`, `maxRole`, `roleForRank`). cloud-api vendors a
  byte-identical copy at `cloud-api/src/_vendor/openpcb/roles.ts` (kept in lockstep by
  `cloud-api/scripts/check-vendor-sync.ts` + a SQL↔TS parity test).
- **`@openpcb/cloud-client`** — NEW `WorkspacesApi` (orgs, members, invites, accept);
  `DesignsApi` gained `listSharedWithMe`/`access`/`listGrants`/`grant`/`revokeGrant`/
  `transfer`; `SharesApi` gained role/label on `create` + `redeem`; sharing wire types in
  `src/types.ts` (defined locally — the package pins `@openpcb/contracts` at a github tag
  that predates the sharing types). Wired in `client.ts` + exported from `index.ts`.

## What's MISSING

- **Desktop will consume these** — when the OpenPCB desktop integration lands (see
  `OpenPCB/CURRENT_STATE.md`), it should consume `@openpcb/contracts` `sharing/roles`
  (or add the role literals locally, as cloud-client does). No change required in `shared/`
  for that.
- **P2 realtime types** — add `@openpcb/contracts` `src/realtime/*` (WS message schema) +
  a `RealtimeApi` + `realtime/apply-projection-patch.ts` in `cloud-client` when the custom
  WebSocket lands.
- **Release ritual (when publishing):** bump + tag `contracts-vX.Y.Z` / `cloud-client-vX.Y.Z`
  per `DEVELOPING.md`; consumers that pin github tags (cloud-client→contracts;
  desktop→contracts) need their pins bumped to pick up the sharing types. Today the dashboard
  uses the local `file:` link, so it already sees them.

## Build

`npm run build -w @openpcb/contracts` · `npm run build -w @openpcb/cloud-client` ·
`npm run test -w @openpcb/cloud-client`.
