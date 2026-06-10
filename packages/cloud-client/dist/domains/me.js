export class MeApi {
    #http;
    constructor(http) {
        this.#http = http;
    }
    /** Current authenticated user (`GET /v1/me`). */
    get() {
        return this.#http.get("/v1/me");
    }
    async getSettings() {
        const res = await this.#http.get("/v1/me/settings");
        return res.settings;
    }
    /** Shallow-merge a patch into the user's settings; returns the merged result. */
    async updateSettings(patch) {
        const res = await this.#http.request("/v1/me/settings", { method: "PUT", body: JSON.stringify({ settings: patch }) });
        return res.settings;
    }
}
//# sourceMappingURL=me.js.map