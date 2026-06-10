export class CommentsApi {
    #http;
    constructor(http) {
        this.#http = http;
    }
    list(designId, opts = {}) {
        const qs = new URLSearchParams();
        if (opts.surface)
            qs.set("surface", opts.surface);
        const suffix = qs.toString() ? `?${qs.toString()}` : "";
        return this.#http.get(`/v1/designs/${designId}/comments${suffix}`);
    }
    getThread(designId, threadId) {
        return this.#http.get(`/v1/designs/${designId}/comments/${threadId}`);
    }
    dispatch(designId, envelope) {
        return this.#http.post(`/v1/designs/${designId}/comments/commands`, envelope);
    }
    uploadScreenshot(designId, input) {
        return this.#http.post(`/v1/designs/${designId}/comments/attachments`, input);
    }
}
//# sourceMappingURL=comments.js.map