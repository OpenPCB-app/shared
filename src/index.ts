/**
 * Public surface of `@openpcb/command-pattern`.
 *
 * Generic ECS world + command-sourcing infrastructure used by OpenPCB's
 * designer. Pure logic — no DB, no HTTP, no DOM. Browser- and Node-safe.
 */
export * from "./commands/index.js";
export * from "./ecs/index.js";
export * from "./events/invalidation-event.js";
export * from "./revision/revision.js";
