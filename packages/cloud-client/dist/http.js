import { CloudApiError } from "./errors.js";
/**
 * Bearer-authenticated JSON client for cloud-api. The access token is pulled
 * fresh from the supplied Supabase session on every call (so token refresh is
 * transparent). Non-2xx responses throw {@link CloudApiError}.
 */
export class HttpClient {
    #apiUrl;
    #supabase;
    constructor(apiUrl, supabase) {
        this.#apiUrl = apiUrl.replace(/\/$/, "");
        this.#supabase = supabase;
    }
    async #authHeader() {
        const { data } = await this.#supabase.auth.getSession();
        const token = data.session?.access_token;
        return token ? `Bearer ${token}` : null;
    }
    async request(path, init = {}) {
        const headers = new Headers(init.headers);
        if (init.body !== undefined && !headers.has("content-type")) {
            headers.set("content-type", "application/json");
        }
        const auth = await this.#authHeader();
        if (auth)
            headers.set("authorization", auth);
        const res = await fetch(`${this.#apiUrl}${path}`, { ...init, headers });
        if (!res.ok) {
            let body;
            try {
                body = await res.json();
            }
            catch {
                body = await res.text().catch(() => null);
            }
            throw new CloudApiError(res.status, path, body);
        }
        if (res.status === 204)
            return undefined;
        const text = await res.text();
        return (text ? JSON.parse(text) : undefined);
    }
    get(path) {
        return this.request(path, { method: "GET" });
    }
    post(path, body) {
        return this.request(path, {
            method: "POST",
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    }
    patch(path, body) {
        return this.request(path, {
            method: "PATCH",
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    }
    delete(path) {
        return this.request(path, { method: "DELETE" });
    }
}
//# sourceMappingURL=http.js.map