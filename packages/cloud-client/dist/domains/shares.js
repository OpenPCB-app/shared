export class SharesApi {
    #http;
    constructor(http) {
        this.#http = http;
    }
    /** Create a share link. The returned `token` is shown only once. */
    create(designId, opts = {}) {
        return this.#http.post(`/v1/designs/${designId}/shares`, {
            role: opts.role ?? "viewer",
            ...(opts.label ? { label: opts.label } : {}),
            ...(opts.expiresAt ? { expiresAt: opts.expiresAt } : {}),
        });
    }
    /** Redeem a share link into a durable per-design grant (requires sign-in). */
    redeem(token) {
        return this.#http.post(`/v1/shares/${encodeURIComponent(token)}/redeem`);
    }
    async list(designId) {
        const res = await this.#http.get(`/v1/designs/${designId}/shares`);
        return res.shares;
    }
    revoke(shareId) {
        return this.#http.delete(`/v1/shares/${shareId}`);
    }
    /** Resolve a public share token → view-only design (no auth required). */
    resolvePublic(token) {
        return this.#http.get(`/v1/shares/${encodeURIComponent(token)}`);
    }
}
//# sourceMappingURL=shares.js.map