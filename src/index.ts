/**
 * Public surface of `@openpcb/contracts`.
 *
 * Wire-format contracts for OpenPCB modules. Pure TypeScript interfaces with
 * minimal runtime (just the `AppError` class hierarchy). Consumed by the
 * desktop app, Cloud, and CoreLibrary admin to speak the designer + library
 * APIs without reverse-engineering OpenPCB source.
 */
export * from "./sdks/index.js";
export * from "./library/import.js";
export * from "./errors/index.js";
