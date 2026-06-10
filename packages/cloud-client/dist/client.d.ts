import type { SupabaseClient } from "@supabase/supabase-js";
import { HttpClient } from "./http.js";
import { AuthApi } from "./auth.js";
import { MeApi } from "./domains/me.js";
import { DesignsApi } from "./domains/designs.js";
import { CommentsApi } from "./domains/comments.js";
import { SharesApi } from "./domains/shares.js";
import { LibraryApi } from "./domains/library.js";
export interface CloudClientOptions {
    /** cloud-api base URL, e.g. https://api.openpcb.app (trailing slash optional). */
    apiUrl: string;
    /** A configured Supabase client (the consumer owns session storage + PKCE). */
    supabase: SupabaseClient;
}
export interface CloudClient {
    readonly auth: AuthApi;
    readonly me: MeApi;
    readonly designs: DesignsApi;
    readonly comments: CommentsApi;
    readonly shares: SharesApi;
    readonly library: LibraryApi;
    /** Low-level bearer-fetch escape hatch for endpoints not yet wrapped. */
    readonly http: HttpClient;
}
/** Construct the OpenPCB Cloud client SDK. */
export declare function createCloudClient(opts: CloudClientOptions): CloudClient;
//# sourceMappingURL=client.d.ts.map