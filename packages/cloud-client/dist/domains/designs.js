export class DesignsApi {
    #http;
    constructor(http) {
        this.#http = http;
    }
    /** Get-or-create the caller's personal workspace. */
    personalWorkspace() {
        return this.#http.get("/v1/workspaces/me/personal");
    }
    /** List designs in a specific workspace (active only unless includeArchived). */
    async listInWorkspace(workspaceId, opts = {}) {
        const qs = opts.includeArchived ? "?includeArchived=true" : "";
        const res = await this.#http.get(`/v1/designs/workspaces/${workspaceId}${qs}`);
        return res.designs;
    }
    /** Convenience: list designs in the caller's personal workspace. */
    async listPersonal(opts = {}) {
        const ws = await this.personalWorkspace();
        return this.listInWorkspace(ws.id, opts);
    }
    get(id) {
        return this.#http.get(`/v1/designs/${id}`);
    }
    getProjection(id) {
        return this.#http.get(`/v1/designs/${id}/projection`);
    }
    /** Paginated revision history (command log, newest first). */
    getRevisions(id, opts = {}) {
        const qs = new URLSearchParams();
        if (opts.cursor)
            qs.set("cursor", opts.cursor);
        if (opts.limit)
            qs.set("limit", String(opts.limit));
        const suffix = qs.toString() ? `?${qs.toString()}` : "";
        return this.#http.get(`/v1/designs/${id}/revisions${suffix}`);
    }
    create(workspaceId, name) {
        return this.#http.post(`/v1/designs/workspaces/${workspaceId}`, { name });
    }
    /** Convenience: create a design in the caller's personal workspace. */
    async createInPersonal(name) {
        const ws = await this.personalWorkspace();
        return this.create(ws.id, name);
    }
    /** Rename a design. */
    rename(id, name) {
        return this.#http.patch(`/v1/designs/${id}`, { name });
    }
    /** Archive (soft-delete) a design. */
    archive(id) {
        return this.#http.delete(`/v1/designs/${id}`);
    }
    /** Designs explicitly shared with the caller via per-design grants. */
    async listSharedWithMe() {
        const res = await this.#http.get("/v1/designs/shared-with-me");
        return res.designs;
    }
    /** The caller's effective access to a design (role + source). */
    access(id) {
        return this.#http.get(`/v1/designs/${id}/access`);
    }
    /** Move a design to another workspace (admin on both ends). */
    transfer(id, targetWorkspaceId) {
        return this.#http.post(`/v1/designs/${id}/transfer`, { targetWorkspaceId });
    }
    // ── Per-design grants (admin on the design) ────────────────────────────────
    async listGrants(id) {
        const res = await this.#http.get(`/v1/designs/${id}/grants`);
        return res.grants;
    }
    grant(id, email, role) {
        return this.#http.post(`/v1/designs/${id}/grants`, {
            email,
            role,
        });
    }
    revokeGrant(id, grantId) {
        return this.#http.delete(`/v1/designs/${id}/grants/${grantId}`);
    }
}
//# sourceMappingURL=designs.js.map