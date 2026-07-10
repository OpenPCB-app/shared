import { FOOTER_CSS } from "./styles.js";
import { LOGO_SVG } from "./svg.js";
const DEFAULT_MARKETING_BASE = "https://openpcb.app";
const DEFAULT_APP_BASE = "https://app.openpcb.app";
const REPO = "https://github.com/OpenPCB-app/OpenPCB";
/**
 * `<opcb-footer>` — the unified 5-column footer (Product / Community /
 * Resources / License + brand), identical on both sites. On the SPA host,
 * internal app links dispatch `opcb-nav:navigate` so a footer click routes
 * client-side; cross-origin links are plain navigations.
 */
export class OpcbFooter extends HTMLElement {
    static get observedAttributes() {
        return ["marketing-base", "app-base"];
    }
    root;
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
        this.render();
        this.root.addEventListener("click", this.handleClick);
    }
    attributeChangedCallback() {
        if (this.isConnected)
            this.render();
    }
    get marketingBase() {
        return (this.getAttribute("marketing-base") ?? DEFAULT_MARKETING_BASE).replace(/\/$/, "");
    }
    get appBase() {
        return (this.getAttribute("app-base") ?? DEFAULT_APP_BASE).replace(/\/$/, "");
    }
    mk(path) {
        return this.marketingBase + path;
    }
    app(path) {
        return this.appBase + path;
    }
    render() {
        this.root.innerHTML = `<style>${FOOTER_CSS}</style>
<footer class="footer">
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand">
        <a class="brand" href="${this.mk("/")}" aria-label="OpenPCB home">${LOGO_SVG}<span>Open<b>PCB</b></span></a>
        <p>Open-source PCB design — on your machine, in the cloud, with AI. Local-first &amp; KiCad-compatible.</p>
      </div>
      <div class="foot-col">
        <h5>Product</h5>
        <a href="${this.mk("/#features")}">Features</a>
        <a href="${this.mk("/#download")}">Download</a>
        <a href="${this.mk("/#roadmap")}">Roadmap</a>
        <a href="${this.mk("/#compare")}">Compare</a>
        <a href="${this.mk("/#commercial")}">Commercial</a>
      </div>
      <div class="foot-col">
        <h5>Community</h5>
        <a href="${this.app("/")}" data-app>Explore</a>
        <a href="${this.app("/")}" data-app>Projects</a>
        <a href="${this.app("/")}" data-app>Components</a>
      </div>
      <div class="foot-col">
        <h5>Resources</h5>
        <a href="${REPO}" target="_blank" rel="noopener noreferrer">GitHub</a>
        <a href="${REPO}/issues" target="_blank" rel="noopener noreferrer">Issues</a>
        <a href="${REPO}/blob/main/ROADMAP.md" target="_blank" rel="noopener noreferrer">Roadmap</a>
        <a href="${this.app("/sign-in")}" data-app>Sign in</a>
      </div>
      <div class="foot-col">
        <h5>License</h5>
        <a href="${REPO}/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">AGPL-3.0</a>
        <a href="${this.mk("/#commercial")}">Commercial</a>
        <a href="${REPO}/security/policy" target="_blank" rel="noopener noreferrer">Security</a>
      </div>
    </div>
    <div class="foot-bottom">
      <span>© 2026 OpenPCB · AGPL-3.0-or-later + Commercial</span>
      <span class="mono">Local-first &amp; open · desktop · cloud · community</span>
    </div>
  </div>
</footer>`;
    }
    handleClick = (e) => {
        const el = e.target?.closest("a");
        if (!el)
            return;
        const href = el.getAttribute("href");
        if (!href || !el.hasAttribute("data-app"))
            return;
        const resolved = new URL(href, location.href);
        if (resolved.origin === location.origin) {
            e.preventDefault();
            this.dispatchEvent(new CustomEvent("opcb-nav:navigate", {
                detail: { path: resolved.pathname + resolved.search + resolved.hash },
                bubbles: true,
                composed: true,
            }));
        }
    };
}
//# sourceMappingURL=opcb-footer.js.map