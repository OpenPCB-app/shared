/** Org workspaces + membership management (`/v1/workspaces`). */
export class WorkspacesApi {
    #http;
    constructor(http) {
        this.#http = http;
    }
    /** Every workspace the caller owns or is an active member of, with role. */
    async listMine() {
        const res = await this.#http.get("/v1/workspaces/me");
        return res.workspaces;
    }
    /** Create an org workspace (caller becomes owner). */
    createOrg(name) {
        return this.#http.post("/v1/workspaces", { name });
    }
    get(id) {
        return this.#http.get(`/v1/workspaces/${id}`);
    }
    async listMembers(id) {
        const res = await this.#http.get(`/v1/workspaces/${id}/members`);
        return res.members;
    }
    setMemberRole(id, userId, role) {
        return this.#http.patch(`/v1/workspaces/${id}/members/${userId}`, { role });
    }
    /** Remove a member, or leave (pass your own user id). */
    removeMember(id, userId) {
        return this.#http.delete(`/v1/workspaces/${id}/members/${userId}`);
    }
    async listInvites(id) {
        const res = await this.#http.get(`/v1/workspaces/${id}/invites`);
        return res.invites;
    }
    /** Create an email invite. The returned `token` is shown only once. */
    invite(id, opts) {
        return this.#http.post(`/v1/workspaces/${id}/invites`, {
            email: opts.email,
            role: opts.role ?? "viewer",
            ...(opts.expiresAt ? { expiresAt: opts.expiresAt } : {}),
        });
    }
    revokeInvite(id, inviteId) {
        return this.#http.delete(`/v1/workspaces/${id}/invites/${inviteId}`);
    }
    /** Accept an invite by its token (requires sign-in + matching email). */
    acceptInvite(token) {
        return this.#http.post(`/v1/workspaces/invites/${encodeURIComponent(token)}/accept`);
    }
}
//# sourceMappingURL=workspaces.js.map