import { ZONE_CSS } from "./styles.js";
import { GLOBE_SVG, GRID_SVG } from "./svg.js";
const DEFAULT_APP_BASE = "https://app.openpcb.app";
/**
 * `<opcb-zoneswitch>` — the Community ⇄ Workspace segmented control. It lives in
 * the page BODY on the cloud app (not the top bar), exactly like the prototype,
 * so the shared `<opcb-nav>` header stays identical on every surface. Emits a
 * cancelable `opcb-nav:navigate` event for same-origin SPA routing.
 *
 * Attributes: `active` ("community" | "workspace"), `app-base`.
 */
export class OpcbZoneSwitch extends HTMLElement {
    static get observedAttributes() {
        return ["active", "app-base"];
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
    get appBase() {
        return (this.getAttribute("app-base") ?? DEFAULT_APP_BASE).replace(/\/$/, "");
    }
    render() {
        const onCommunity = this.getAttribute("active") !== "workspace";
        this.root.innerHTML = `<style>${ZONE_CSS}</style>
<div class="area-seg" role="tablist" aria-label="Zone">
  <a class="${onCommunity ? "on" : ""}" href="${this.appBase}/" data-app role="tab" aria-selected="${onCommunity}">${GLOBE_SVG}Community</a>
  <a class="${!onCommunity ? "on" : ""}" href="${this.appBase}/app" data-app role="tab" aria-selected="${!onCommunity}">${GRID_SVG}Workspace</a>
</div>`;
    }
    handleClick = (e) => {
        const el = e.target?.closest("a");
        if (!el)
            return;
        const href = el.getAttribute("href");
        if (!href)
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
//# sourceMappingURL=opcb-zoneswitch.js.map