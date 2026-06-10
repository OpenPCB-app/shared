import type { HttpClient } from "../http.js";
import type { PublicDesign, ShareCreated, ShareSummary } from "../types.js";
export declare class SharesApi {
    #private;
    constructor(http: HttpClient);
    /** Create a view-only share link. The returned `token` is shown only once. */
    create(designId: string, opts?: {
        expiresAt?: string;
    }): Promise<ShareCreated>;
    list(designId: string): Promise<ShareSummary[]>;
    revoke(shareId: string): Promise<void>;
    /** Resolve a public share token → view-only design (no auth required). */
    resolvePublic(token: string): Promise<PublicDesign>;
}
//# sourceMappingURL=shares.d.ts.map