import type { HttpClient } from "../http.js";
import type {
  CreatedDesign,
  DesignAccess,
  DesignGrant,
  DesignProjectionResponse,
  DesignRecord,
  DesignRevision,
  DesignSummary,
  GrantRole,
  Page,
  PersonalWorkspace,
  SharedDesign,
} from "../types.js";

export interface ListDesignsOptions {
  includeArchived?: boolean;
}

export interface RevisionsOptions {
  cursor?: string;
  limit?: number;
}

export class DesignsApi {
  readonly #http: HttpClient;

  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Get-or-create the caller's personal workspace. */
  personalWorkspace(): Promise<PersonalWorkspace> {
    return this.#http.get<PersonalWorkspace>("/v1/workspaces/me/personal");
  }

  /** List designs in a specific workspace (active only unless includeArchived). */
  async listInWorkspace(
    workspaceId: string,
    opts: ListDesignsOptions = {},
  ): Promise<DesignSummary[]> {
    const qs = opts.includeArchived ? "?includeArchived=true" : "";
    const res = await this.#http.get<{ designs: DesignSummary[] }>(
      `/v1/designs/workspaces/${workspaceId}${qs}`,
    );
    return res.designs;
  }

  /** Convenience: list designs in the caller's personal workspace. */
  async listPersonal(opts: ListDesignsOptions = {}): Promise<DesignSummary[]> {
    const ws = await this.personalWorkspace();
    return this.listInWorkspace(ws.id, opts);
  }

  get(id: string): Promise<DesignRecord> {
    return this.#http.get<DesignRecord>(`/v1/designs/${id}`);
  }

  getProjection(id: string): Promise<DesignProjectionResponse> {
    return this.#http.get<DesignProjectionResponse>(
      `/v1/designs/${id}/projection`,
    );
  }

  /** Paginated revision history (command log, newest first). */
  getRevisions(
    id: string,
    opts: RevisionsOptions = {},
  ): Promise<Page<DesignRevision>> {
    const qs = new URLSearchParams();
    if (opts.cursor) qs.set("cursor", opts.cursor);
    if (opts.limit) qs.set("limit", String(opts.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return this.#http.get<Page<DesignRevision>>(
      `/v1/designs/${id}/revisions${suffix}`,
    );
  }

  create(workspaceId: string, name: string): Promise<CreatedDesign> {
    return this.#http.post<CreatedDesign>(
      `/v1/designs/workspaces/${workspaceId}`,
      { name },
    );
  }

  /** Convenience: create a design in the caller's personal workspace. */
  async createInPersonal(name: string): Promise<CreatedDesign> {
    const ws = await this.personalWorkspace();
    return this.create(ws.id, name);
  }

  /** Rename a design. */
  rename(id: string, name: string): Promise<CreatedDesign> {
    return this.#http.patch<CreatedDesign>(`/v1/designs/${id}`, { name });
  }

  /** Archive (soft-delete) a design. */
  archive(id: string): Promise<void> {
    return this.#http.delete<void>(`/v1/designs/${id}`);
  }

  /** Designs explicitly shared with the caller via per-design grants. */
  async listSharedWithMe(): Promise<SharedDesign[]> {
    const res = await this.#http.get<{ designs: SharedDesign[] }>(
      "/v1/designs/shared-with-me",
    );
    return res.designs;
  }

  /** The caller's effective access to a design (role + source). */
  access(id: string): Promise<DesignAccess> {
    return this.#http.get<DesignAccess>(`/v1/designs/${id}/access`);
  }

  /** Move a design to another workspace (admin on both ends). */
  transfer(
    id: string,
    targetWorkspaceId: string,
  ): Promise<{ ok: boolean; fromWorkspaceId: string; toWorkspaceId: string }> {
    return this.#http.post(`/v1/designs/${id}/transfer`, { targetWorkspaceId });
  }

  // ── Per-design grants (admin on the design) ────────────────────────────────
  async listGrants(id: string): Promise<DesignGrant[]> {
    const res = await this.#http.get<{ grants: DesignGrant[] }>(
      `/v1/designs/${id}/grants`,
    );
    return res.grants;
  }

  grant(id: string, email: string, role: GrantRole): Promise<DesignGrant> {
    return this.#http.post<DesignGrant>(`/v1/designs/${id}/grants`, {
      email,
      role,
    });
  }

  revokeGrant(id: string, grantId: string): Promise<void> {
    return this.#http.delete<void>(`/v1/designs/${id}/grants/${grantId}`);
  }
}
