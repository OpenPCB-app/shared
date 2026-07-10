/**
 * `<opcb-zoneswitch>` — the Community ⇄ Workspace segmented control. It lives in
 * the page BODY on the cloud app (not the top bar), exactly like the prototype,
 * so the shared `<opcb-nav>` header stays identical on every surface. Emits a
 * cancelable `opcb-nav:navigate` event for same-origin SPA routing.
 *
 * Attributes: `active` ("community" | "workspace"), `app-base`.
 */
export declare class OpcbZoneSwitch extends HTMLElement {
    static get observedAttributes(): string[];
    private readonly root;
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(): void;
    private get appBase();
    private render;
    private readonly handleClick;
}
//# sourceMappingURL=opcb-zoneswitch.d.ts.map