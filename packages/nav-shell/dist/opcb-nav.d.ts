/**
 * `<opcb-nav>` — the unified OpenPCB top bar. Identical on the marketing site
 * and the cloud app; `mode` drives context (area-switch + search appear only on
 * the app). Internal app links dispatch a cancelable `opcb-nav:navigate`
 * CustomEvent so a SPA host can route without a full reload; everything else is
 * a real `<a href>`.
 */
export declare class OpcbNav extends HTMLElement {
    static get observedAttributes(): string[];
    private readonly root;
    private menuOpen;
    private lastSessionKey;
    private readonly onFocus;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    private get navMode();
    private get activeKey();
    private get marketingBase();
    private get appBase();
    private url;
    private render;
    private navLinksHtml;
    private searchHtml;
    private ctaHtml;
    private readonly handleClick;
    private readonly handleSubmit;
    private toggleTheme;
    private setMenu;
    /** Re-read cross-subdomain state on tab focus (cookies fire no events). */
    private syncDynamic;
}
//# sourceMappingURL=opcb-nav.d.ts.map