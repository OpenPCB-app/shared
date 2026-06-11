# shared/ — Teams / Sharing / Collaboration TODO

Plan: `~/.claude/plans/act-as-senior-software-atomic-lightning.md`. Handoff: `CURRENT_STATE.md`.
Cross-repo tracker: workspace-root `TODO.md`. Legend: [ ] todo · [x] done

## DONE 2026-06-10

- [x] `@openpcb/contracts` `src/sharing/{roles,types,index}.ts` (canonical role+rank model) + re-export from `src/index.ts`; builds clean
- [x] `@openpcb/cloud-client`: `WorkspacesApi`; `DesignsApi` sharedWithMe/access/grants/transfer;
      `SharesApi` role+label+redeem; sharing types in `types.ts`; wired + exported; 2/2 tests

## What's MISSING

- [ ] **P2 realtime contracts** — `contracts/src/realtime/*` (WS message schema) +
      `cloud-client` `RealtimeApi` + `realtime/apply-projection-patch.ts` (when custom WS lands)
- [ ] **Publish/tag** when releasing: `contracts-vX.Y.Z` + `cloud-client-vX.Y.Z`; bump the
      github-tag pins in consumers (cloud-client→contracts; OpenPCB desktop→contracts) so they
      pick up the sharing types. (Dashboard already sees them via the local `file:` link.)
- [ ] Desktop consumes these (no change here) — see `OpenPCB/CURRENT_STATE.md`.
