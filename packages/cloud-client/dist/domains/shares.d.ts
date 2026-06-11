import type { HttpClient } from "../http.js";
import type { GrantRole, PublicDesign, ShareCreated, ShareRedeemed, ShareSummary } from "../types.js";
export interface CreateShareOptions {
    /** Link role. Editor links always require sign-in. Defaults to viewer. */
    role?: GrantRole;
    label?: string;
    expiresAt?: string;
}
export declare class SharesApi {
    #private;
    constructor(http: HttpClient);
    /** Create a share link. The returned `token` is shown only once. */
    create(designId: string, opts?: CreateShareOptions): Promise<ShareCreated>;
    /** Redeem a share link into a durable per-design grant (requires sign-in). */
    redeem(token: string): Promise<ShareRedeemed>;
    list(designId: string): Promise<ShareSummary[]>;
    revoke(shareId: string): Promise<void>;
    /** Resolve a public share token → view-only design (no auth required). */
    resolvePublic(token: string): Promise<PublicDesign>;
}
//# sourceMappingURL=shares.d.ts.map