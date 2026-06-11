import type { HttpClient } from "../http.js";
import type {
  WorkspaceInvite,
  WorkspaceInviteCreated,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceSummary,
} from "../types.js";

export interface CreateInviteOptions {
  email: string;
  role?: Exclude<WorkspaceRole, "owner">;
  expiresAt?: string;
}

/** Org workspaces + membership management (`/v1/workspaces`). */
export class WorkspacesApi {
  readonly #http: HttpClient;

  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Every workspace the caller owns or is an active member of, with role. */
  async listMine(): Promise<WorkspaceSummary[]> {
    const res = await this.#http.get<{ workspaces: WorkspaceSummary[] }>(
      "/v1/workspaces/me",
    );
    return res.workspaces;
  }

  /** Create an org workspace (caller becomes owner). */
  createOrg(name: string): Promise<WorkspaceSummary> {
    return this.#http.post<WorkspaceSummary>("/v1/workspaces", { name });
  }

  get(id: string): Promise<WorkspaceSummary> {
    return this.#http.get<WorkspaceSummary>(`/v1/workspaces/${id}`);
  }

  async listMembers(id: string): Promise<WorkspaceMember[]> {
    const res = await this.#http.get<{ members: WorkspaceMember[] }>(
      `/v1/workspaces/${id}/members`,
    );
    return res.members;
  }

  setMemberRole(
    id: string,
    userId: string,
    role: Exclude<WorkspaceRole, "owner">,
  ): Promise<{ ok: boolean }> {
    return this.#http.patch<{ ok: boolean }>(
      `/v1/workspaces/${id}/members/${userId}`,
      { role },
    );
  }

  /** Remove a member, or leave (pass your own user id). */
  removeMember(id: string, userId: string): Promise<void> {
    return this.#http.delete<void>(`/v1/workspaces/${id}/members/${userId}`);
  }

  async listInvites(id: string): Promise<WorkspaceInvite[]> {
    const res = await this.#http.get<{ invites: WorkspaceInvite[] }>(
      `/v1/workspaces/${id}/invites`,
    );
    return res.invites;
  }

  /** Create an email invite. The returned `token` is shown only once. */
  invite(
    id: string,
    opts: CreateInviteOptions,
  ): Promise<WorkspaceInviteCreated> {
    return this.#http.post<WorkspaceInviteCreated>(
      `/v1/workspaces/${id}/invites`,
      {
        email: opts.email,
        role: opts.role ?? "viewer",
        ...(opts.expiresAt ? { expiresAt: opts.expiresAt } : {}),
      },
    );
  }

  revokeInvite(id: string, inviteId: string): Promise<void> {
    return this.#http.delete<void>(`/v1/workspaces/${id}/invites/${inviteId}`);
  }

  /** Accept an invite by its token (requires sign-in + matching email). */
  acceptInvite(
    token: string,
  ): Promise<{ ok: boolean; workspaceId: string; role: WorkspaceRole }> {
    return this.#http.post<{
      ok: boolean;
      workspaceId: string;
      role: WorkspaceRole;
    }>(`/v1/workspaces/invites/${encodeURIComponent(token)}/accept`);
  }
}
