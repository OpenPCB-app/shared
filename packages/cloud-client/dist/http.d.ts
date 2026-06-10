import type { SupabaseClient } from "@supabase/supabase-js";
/**
 * Bearer-authenticated JSON client for cloud-api. The access token is pulled
 * fresh from the supplied Supabase session on every call (so token refresh is
 * transparent). Non-2xx responses throw {@link CloudApiError}.
 */
export declare class HttpClient {
    #private;
    constructor(apiUrl: string, supabase: SupabaseClient);
    request<T>(path: string, init?: RequestInit): Promise<T>;
    get<T>(path: string): Promise<T>;
    post<T>(path: string, body?: unknown): Promise<T>;
    patch<T>(path: string, body?: unknown): Promise<T>;
    delete<T>(path: string): Promise<T>;
}
//# sourceMappingURL=http.d.ts.map