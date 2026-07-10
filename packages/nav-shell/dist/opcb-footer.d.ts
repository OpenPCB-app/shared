/**
 * `<opcb-footer>` — the unified 5-column footer (Product / Community /
 * Resources / License + brand), identical on both sites. On the SPA host,
 * internal app links dispatch `opcb-nav:navigate` so a footer click routes
 * client-side; cross-origin links are plain navigations.
 */
export declare class OpcbFooter extends HTMLElement {
    static get observedAttributes(): string[];
    private readonly root;
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(): void;
    private get marketingBase();
    private get appBase();
    private mk;
    private app;
    private render;
    private readonly handleClick;
}
//# sourceMappingURL=opcb-footer.d.ts.map