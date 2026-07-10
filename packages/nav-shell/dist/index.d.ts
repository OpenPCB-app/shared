/**
 * @openpcb/nav-shell — the single source of truth for OpenPCB's unified
 * navigation. Importing this module (ESM, in the cloud app) or loading the
 * standalone bundle (`<script src="opcb-nav.js">` on the marketing landing)
 * registers `<opcb-nav>` and `<opcb-footer>` and is enough to use them.
 *
 * Consumers that publish login state (the cloud app) also import
 * `setSessionHint` / `clearSessionHint` so the marketing header can reflect it.
 */
export { OpcbNav } from "./opcb-nav.js";
export { OpcbFooter } from "./opcb-footer.js";
export { OpcbZoneSwitch } from "./opcb-zoneswitch.js";
export { setSessionHint, clearSessionHint, getSession, getTheme, applyTheme, persistTheme, initialsOf, } from "./util.js";
export type { Theme, SessionHint } from "./util.js";
/** Idempotently register the custom elements. Safe to call multiple times. */
export declare function defineOpcbShell(): void;
//# sourceMappingURL=index.d.ts.map