import type { HttpClient } from "../http.js";
import type { CreatedDesign, DesignAccess, DesignGrant, DesignProjectionResponse, DesignRecord, DesignRevision, DesignSummary, GrantRole, Page, PersonalWorkspace, SharedDesign } from "../types.js";
export interface ListDesignsOptions {
    includeArchived?: boolean;
}
export interface RevisionsOptions {
    cursor?: string;
    limit?: number;
}
export declare class DesignsApi {
    #private;
    constructor(http: HttpClient);
    /** Get-or-create the caller's personal workspace. */
    personalWorkspace(): Promise<PersonalWorkspace>;
    /** List designs in a specific workspace (active only unless includeArchived). */
    listInWorkspace(workspaceId: string, opts?: ListDesignsOptions): Promise<DesignSummary[]>;
    /** Convenience: list designs in the caller's personal workspace. */
    listPersonal(opts?: ListDesignsOptions): Promise<DesignSummary[]>;
    get(id: string): Promise<DesignRecord>;
    getProjection(id: string): Promise<DesignProjectionResponse>;
    /** Paginated revision history (command log, newest first). */
    getRevisions(id: string, opts?: RevisionsOptions): Promise<Page<DesignRevision>>;
    create(workspaceId: string, name: string): Promise<CreatedDesign>;
    /** Convenience: create a design in the caller's personal workspace. */
    createInPersonal(name: string): Promise<CreatedDesign>;
    /** Rename a design. */
    rename(id: string, name: string): Promise<CreatedDesign>;
    /** Archive (soft-delete) a design. */
    archive(id: string): Promise<void>;
    /** Designs explicitly shared with the caller via per-design grants. */
    listSharedWithMe(): Promise<SharedDesign[]>;
    /** The caller's effective access to a design (role + source). */
    access(id: string): Promise<DesignAccess>;
    /** Move a design to another workspace (admin on both ends). */
    transfer(id: string, targetWorkspaceId: string): Promise<{
        ok: boolean;
        fromWorkspaceId: string;
        toWorkspaceId: string;
    }>;
    listGrants(id: string): Promise<DesignGrant[]>;
    grant(id: string, email: string, role: GrantRole): Promise<DesignGrant>;
    revokeGrant(id: string, grantId: string): Promise<void>;
}
//# sourceMappingURL=designs.d.ts.map