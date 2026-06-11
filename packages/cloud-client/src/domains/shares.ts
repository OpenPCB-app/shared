import type { HttpClient } from "../http.js";
import type {
  GrantRole,
  PublicDesign,
  ShareCreated,
  ShareRedeemed,
  ShareSummary,
} from "../types.js";

export interface CreateShareOptions {
  /** Link role. Editor links always require sign-in. Defaults to viewer. */
  role?: GrantRole;
  label?: string;
  expiresAt?: string;
}

export class SharesApi {
  readonly #http: HttpClient;

  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Create a share link. The returned `token` is shown only once. */
  create(
    designId: string,
    opts: CreateShareOptions = {},
  ): Promise<ShareCreated> {
    return this.#http.post<ShareCreated>(`/v1/designs/${designId}/shares`, {
      role: opts.role ?? "viewer",
      ...(opts.label ? { label: opts.label } : {}),
      ...(opts.expiresAt ? { expiresAt: opts.expiresAt } : {}),
    });
  }

  /** Redeem a share link into a durable per-design grant (requires sign-in). */
  redeem(token: string): Promise<ShareRedeemed> {
    return this.#http.post<ShareRedeemed>(
      `/v1/shares/${encodeURIComponent(token)}/redeem`,
    );
  }

  async list(designId: string): Promise<ShareSummary[]> {
    const res = await this.#http.get<{ shares: ShareSummary[] }>(
      `/v1/designs/${designId}/shares`,
    );
    return res.shares;
  }

  revoke(shareId: string): Promise<void> {
    return this.#http.delete<void>(`/v1/shares/${shareId}`);
  }

  /** Resolve a public share token → view-only design (no auth required). */
  resolvePublic(token: string): Promise<PublicDesign> {
    return this.#http.get<PublicDesign>(
      `/v1/shares/${encodeURIComponent(token)}`,
    );
  }
}
