/**
 * Cross-subdomain state helpers shared by the shell and its consumers.
 *
 * `localStorage` is origin-scoped, so theme/auth never cross openpcb.app ↔
 * app.openpcb.app on their own. We carry them in cookies scoped to the parent
 * registrable domain (`.openpcb.app`). The session cookie is a **cosmetic hint
 * only** — the real auth gate lives in the cloud app; a stale hint at worst
 * shows "Open workspace", which the app re-validates.
 */
const APEX = "openpcb.app";
const THEME_COOKIE = "opcb_theme";
const SESSION_COOKIE = "opcb_session";
/** Legacy per-origin theme keys kept in sync so each host's own loader agrees. */
const THEME_LS_KEYS = ["opcb-theme", "openpcb.cloud.theme"];
function onApexDomain() {
    const h = location.hostname;
    return h === APEX || h.endsWith("." + APEX);
}
function cookieAttrs() {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    const domain = onApexDomain() ? "; Domain=." + APEX : "";
    return `; Path=/; SameSite=Lax${secure}${domain}`;
}
export function readCookie(name) {
    const escaped = name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1");
    const match = document.cookie.match(new RegExp("(?:^|; )" + escaped + "=([^;]*)"));
    const value = match?.[1];
    return value != null ? decodeURIComponent(value) : null;
}
export function writeCookie(name, value, days = 365) {
    const maxAge = Math.round(days * 86400);
    document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}${cookieAttrs()}`;
}
export function deleteCookie(name) {
    document.cookie = `${name}=; Max-Age=0${cookieAttrs()}`;
}
/* ----------------------------- theme ----------------------------- */
export function getTheme() {
    const cookie = readCookie(THEME_COOKIE);
    if (cookie === "dark" || cookie === "light")
        return cookie;
    for (const key of THEME_LS_KEYS) {
        try {
            const v = localStorage.getItem(key);
            if (v === "dark" || v === "light")
                return v;
        }
        catch {
            /* storage may be blocked */
        }
    }
    const root = document.documentElement;
    if (root.classList.contains("dark"))
        return "dark";
    const attr = root.getAttribute("data-theme");
    if (attr === "dark" || attr === "light")
        return attr;
    return "dark";
}
/** Apply a theme via BOTH host mechanisms (landing uses the attr, the app the class). */
export function applyTheme(theme) {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.classList.toggle("dark", theme === "dark");
}
/** Persist to the shared `.openpcb.app` cookie + every host's legacy LS key. */
export function persistTheme(theme) {
    writeCookie(THEME_COOKIE, theme);
    for (const key of THEME_LS_KEYS) {
        try {
            localStorage.setItem(key, theme);
        }
        catch {
            /* storage may be blocked */
        }
    }
}
/* ---------------------------- session ---------------------------- */
export function getSession() {
    const raw = readCookie(SESSION_COOKIE);
    if (!raw)
        return null;
    try {
        const obj = JSON.parse(raw);
        if (obj && typeof obj.initials === "string" && obj.initials.length > 0) {
            return {
                name: typeof obj.name === "string" ? obj.name : "",
                initials: obj.initials.slice(0, 2).toUpperCase(),
            };
        }
    }
    catch {
        /* malformed cookie → treat as logged out */
    }
    return null;
}
/**
 * Called by the cloud app on login to publish the cosmetic hint that the
 * marketing site reads. Pass a display name and/or email; initials are derived.
 */
export function setSessionHint(input) {
    const name = (input.name ?? "").trim();
    const hint = {
        name,
        initials: initialsOf(name || input.email || ""),
    };
    writeCookie(SESSION_COOKIE, JSON.stringify(hint));
}
/** Called by the cloud app on logout. */
export function clearSessionHint() {
    deleteCookie(SESSION_COOKIE);
}
export function initialsOf(nameOrEmail) {
    const source = (nameOrEmail || "").trim();
    if (!source)
        return "·";
    const local = source.includes("@")
        ? (source.split("@")[0] ?? source)
        : source;
    const parts = local.split(/[\s._-]+/).filter(Boolean);
    if (parts.length === 0)
        return "·";
    if (parts.length === 1) {
        return (parts[0] ?? "").slice(0, 2).toUpperCase() || "·";
    }
    const first = parts[0] ?? "";
    const last = parts[parts.length - 1] ?? "";
    return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase() || "·";
}
//# sourceMappingURL=util.js.map