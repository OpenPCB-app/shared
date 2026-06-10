import type { HttpClient } from "../http.js";
import type { CreatedDesign, DesignProjectionResponse, DesignRecord, DesignRevision, DesignSummary, Page, PersonalWorkspace } from "../types.js";
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
}
//# sourceMappingURL=designs.d.ts.map