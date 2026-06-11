import type { HttpClient } from "../http.js";
import type { WorkspaceInvite, WorkspaceInviteCreated, WorkspaceMember, WorkspaceRole, WorkspaceSummary } from "../types.js";
export interface CreateInviteOptions {
    email: string;
    role?: Exclude<WorkspaceRole, "owner">;
    expiresAt?: string;
}
/** Org workspaces + membership management (`/v1/workspaces`). */
export declare class WorkspacesApi {
    #private;
    constructor(http: HttpClient);
    /** Every workspace the caller owns or is an active member of, with role. */
    listMine(): Promise<WorkspaceSummary[]>;
    /** Create an org workspace (caller becomes owner). */
    createOrg(name: string): Promise<WorkspaceSummary>;
    get(id: string): Promise<WorkspaceSummary>;
    listMembers(id: string): Promise<WorkspaceMember[]>;
    setMemberRole(id: string, userId: string, role: Exclude<WorkspaceRole, "owner">): Promise<{
        ok: boolean;
    }>;
    /** Remove a member, or leave (pass your own user id). */
    removeMember(id: string, userId: string): Promise<void>;
    listInvites(id: string): Promise<WorkspaceInvite[]>;
    /** Create an email invite. The returned `token` is shown only once. */
    invite(id: string, opts: CreateInviteOptions): Promise<WorkspaceInviteCreated>;
    revokeInvite(id: string, inviteId: string): Promise<void>;
    /** Accept an invite by its token (requires sign-in + matching email). */
    acceptInvite(token: string): Promise<{
        ok: boolean;
        workspaceId: string;
        role: WorkspaceRole;
    }>;
}
//# sourceMappingURL=workspaces.d.ts.map