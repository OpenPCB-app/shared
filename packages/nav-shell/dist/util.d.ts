/**
 * Cross-subdomain state helpers shared by the shell and its consumers.
 *
 * `localStorage` is origin-scoped, so theme/auth never cross openpcb.app ↔
 * app.openpcb.app on their own. We carry them in cookies scoped to the parent
 * registrable domain (`.openpcb.app`). The session cookie is a **cosmetic hint
 * only** — the real auth gate lives in the cloud app; a stale hint at worst
 * shows "Open workspace", which the app re-validates.
 */
export type Theme = "dark" | "light";
export interface SessionHint {
    /** Display name, e.g. "Ada Vance". May be empty. */
    name: string;
    /** Up to 2 uppercase initials shown in the avatar, e.g. "AV". */
    initials: string;
}
export declare function readCookie(name: string): string | null;
export declare function writeCookie(name: string, value: string, days?: number): void;
export declare function deleteCookie(name: string): void;
export declare function getTheme(): Theme;
/** Apply a theme via BOTH host mechanisms (landing uses the attr, the app the class). */
export declare function applyTheme(theme: Theme): void;
/** Persist to the shared `.openpcb.app` cookie + every host's legacy LS key. */
export declare function persistTheme(theme: Theme): void;
export declare function getSession(): SessionHint | null;
/**
 * Called by the cloud app on login to publish the cosmetic hint that the
 * marketing site reads. Pass a display name and/or email; initials are derived.
 */
export declare function setSessionHint(input: {
    name?: string;
    email?: string;
}): void;
/** Called by the cloud app on logout. */
export declare function clearSessionHint(): void;
export declare function initialsOf(nameOrEmail: string): string;
//# sourceMappingURL=util.d.ts.map