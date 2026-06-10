import type { HttpClient } from "../http.js";
import type { PublicDesign, ShareCreated, ShareSummary } from "../types.js";

export class SharesApi {
  readonly #http: HttpClient;

  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Create a view-only share link. The returned `token` is shown only once. */
  create(
    designId: string,
    opts: { expiresAt?: string } = {},
  ): Promise<ShareCreated> {
    return this.#http.post<ShareCreated>(`/v1/designs/${designId}/shares`, {
      role: "viewer",
      ...(opts.expiresAt ? { expiresAt: opts.expiresAt } : {}),
    });
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
