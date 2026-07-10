import { NAV_CSS } from "./styles.js";
import { LOGO_SVG, GITHUB_SVG, MOON_SVG, SUN_SVG, SEARCH_SVG, MENU_SVG, } from "./svg.js";
import { getSession, getTheme, applyTheme, persistTheme, } from "./util.js";
const DEFAULT_MARKETING_BASE = "https://openpcb.app";
const DEFAULT_APP_BASE = "https://app.openpcb.app";
const NAV_LINKS = [
    { key: "features", label: "Product", area: "marketing", path: "/#features" },
    { key: "community", label: "Community", area: "app", path: "/" },
    { key: "roadmap", label: "Roadmap", area: "marketing", path: "/#roadmap" },
    { key: "compare", label: "Compare", area: "marketing", path: "/#compare" },
];
/**
 * `<opcb-nav>` — the unified OpenPCB top bar. Identical on the marketing site
 * and the cloud app; `mode` drives context (area-switch + search appear only on
 * the app). Internal app links dispatch a cancelable `opcb-nav:navigate`
 * CustomEvent so a SPA host can route without a full reload; everything else is
 * a real `<a href>`.
 */
export class OpcbNav extends HTMLElement {
    static get observedAttributes() {
        return ["mode", "active", "marketing-base", "app-base"];
    }
    root;
    menuOpen = false;
    lastSessionKey = "";
    onFocus = () => this.syncDynamic();
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
        applyTheme(getTheme());
        this.render();
        this.root.addEventListener("click", this.handleClick);
        this.root.addEventListener("submit", this.handleSubmit);
        window.addEventListener("focus", this.onFocus);
        document.addEventListener("visibilitychange", this.onFocus);
    }
    disconnectedCallback() {
        window.removeEventListener("focus", this.onFocus);
        document.removeEventListener("visibilitychange", this.onFocus);
    }
    attributeChangedCallback() {
        if (this.isConnected)
            this.render();
    }
    /* --------------------------- attributes --------------------------- */
    // NB: these accessors must NOT be named `mode`/`active` — those collide with
    // the like-named attributes. A getter-only property by that name makes React
    // (which assigns custom-element props) throw "Cannot set property … only a
    // getter". Different names → React sets the attributes instead (which
    // `observedAttributes` already handles).
    get navMode() {
        const m = this.getAttribute("mode");
        return m === "community" || m === "workspace" ? m : "marketing";
    }
    get activeKey() {
        return this.getAttribute("active") ?? "";
    }
    get marketingBase() {
        return (this.getAttribute("marketing-base") ?? DEFAULT_MARKETING_BASE).replace(/\/$/, "");
    }
    get appBase() {
        return (this.getAttribute("app-base") ?? DEFAULT_APP_BASE).replace(/\/$/, "");
    }
    url(area, path) {
        const base = area === "marketing" ? this.marketingBase : this.appBase;
        return base + (path.startsWith("/") ? path : "/" + path);
    }
    /* ----------------------------- render ----------------------------- */
    render() {
        const session = getSession();
        this.lastSessionKey = session ? session.initials + "|" + session.name : "";
        const isApp = this.navMode !== "marketing";
        this.root.innerHTML = `<style>${NAV_CSS}</style>
<header class="nav">
  <div class="wrap nav-row">
    <a class="brand" href="${this.url("marketing", "/")}" aria-label="OpenPCB home">${LOGO_SVG}<span>Open<b>PCB</b></span></a>
    <nav class="nav-links" aria-label="Primary">${this.navLinksHtml()}</nav>
    <div class="nav-right">
      ${isApp ? this.searchHtml() : ""}
      <a class="gh-pill" href="https://github.com/OpenPCB-app/OpenPCB" target="_blank" rel="noopener noreferrer">${GITHUB_SVG}<span>GitHub</span></a>
      <button class="icon-btn" type="button" data-theme-toggle aria-label="Toggle theme" title="Toggle theme">${getTheme() === "light" ? SUN_SVG : MOON_SVG}</button>
      ${this.ctaHtml(session)}
      <button class="icon-btn hamburger" type="button" data-hamburger aria-label="Menu" aria-expanded="${this.menuOpen}">${MENU_SVG}</button>
    </div>
  </div>
  <div class="menu${this.menuOpen ? " open" : ""}">
    <div class="wrap">${this.navLinksHtml()}</div>
  </div>
</header>`;
    }
    navLinksHtml() {
        return NAV_LINKS.map((l) => {
            const cls = l.key === this.activeKey ? ' class="active"' : "";
            const internal = l.area === "app" ? " data-app" : "";
            return `<a${cls} href="${this.url(l.area, l.path)}"${internal}>${l.label}</a>`;
        }).join("");
    }
    searchHtml() {
        return `<form class="header-search" data-search role="search">${SEARCH_SVG}<input name="q" type="search" placeholder="Search components…" aria-label="Search components" /></form>`;
    }
    ctaHtml(session) {
        if (session) {
            return `<span class="cta">
        <a class="btn btn-primary btn-sm" href="${this.url("app", "/app")}" data-app>Open workspace</a>
        <a class="avatar" href="${this.url("app", "/app/settings")}" data-app title="${escapeAttr(session.name || "Account")}">${escapeHtml(session.initials)}</a>
      </span>`;
        }
        return `<span class="cta">
      <a class="btn btn-primary btn-sm" href="${this.url("marketing", "/#download")}">Download</a>
      <a class="btn btn-ghost btn-sm" href="${this.url("app", "/sign-in")}" data-app>Sign in</a>
    </span>`;
    }
    /* ----------------------------- events ----------------------------- */
    handleClick = (e) => {
        const target = e.target;
        const el = target?.closest("a,button");
        if (!el)
            return;
        if (el.matches("[data-theme-toggle]")) {
            e.preventDefault();
            this.toggleTheme();
            return;
        }
        if (el.matches("[data-hamburger]")) {
            e.preventDefault();
            this.setMenu(!this.menuOpen);
            return;
        }
        const href = el.getAttribute("href");
        if (!href)
            return;
        if (el.hasAttribute("data-app") && this.navMode !== "marketing") {
            const resolved = new URL(href, location.href);
            if (resolved.origin === location.origin) {
                e.preventDefault();
                this.setMenu(false);
                this.dispatchEvent(new CustomEvent("opcb-nav:navigate", {
                    detail: {
                        path: resolved.pathname + resolved.search + resolved.hash,
                    },
                    bubbles: true,
                    composed: true,
                }));
            }
        }
    };
    handleSubmit = (e) => {
        const form = e.target;
        if (!(form instanceof HTMLFormElement) || !form.matches("[data-search]"))
            return;
        e.preventDefault();
        const input = form.querySelector("input[name=q]");
        const q = input?.value.trim() ?? "";
        const base = this.navMode === "workspace" ? "/app/library" : "/";
        const path = q ? `${base}?q=${encodeURIComponent(q)}` : base;
        const full = this.url("app", path);
        if (this.navMode !== "marketing" &&
            new URL(full, location.href).origin === location.origin) {
            this.dispatchEvent(new CustomEvent("opcb-nav:navigate", {
                detail: { path },
                bubbles: true,
                composed: true,
            }));
        }
        else {
            location.href = full;
        }
    };
    toggleTheme() {
        const next = getTheme() === "dark" ? "light" : "dark";
        applyTheme(next);
        persistTheme(next);
        const btn = this.root.querySelector("[data-theme-toggle]");
        if (btn)
            btn.innerHTML = next === "light" ? SUN_SVG : MOON_SVG;
        this.dispatchEvent(new CustomEvent("opcb-nav:theme", {
            detail: { theme: next },
            bubbles: true,
            composed: true,
        }));
    }
    setMenu(open) {
        if (this.menuOpen === open)
            return;
        this.menuOpen = open;
        const menu = this.root.querySelector(".menu");
        if (menu)
            menu.classList.toggle("open", open);
        const burger = this.root.querySelector("[data-hamburger]");
        if (burger)
            burger.setAttribute("aria-expanded", String(open));
    }
    /** Re-read cross-subdomain state on tab focus (cookies fire no events). */
    syncDynamic() {
        if (!this.isConnected)
            return;
        applyTheme(getTheme());
        const btn = this.root.querySelector("[data-theme-toggle]");
        if (btn)
            btn.innerHTML = getTheme() === "light" ? SUN_SVG : MOON_SVG;
        const session = getSession();
        const key = session ? session.initials + "|" + session.name : "";
        if (key !== this.lastSessionKey)
            this.render();
    }
}
function escapeHtml(s) {
    return s.replace(/[&<>]/g, (c) => c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;");
}
function escapeAttr(s) {
    return s.replace(/["&<>]/g, (c) => c === '"' ? "&quot;" : c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;");
}
//# sourceMappingURL=opcb-nav.js.map