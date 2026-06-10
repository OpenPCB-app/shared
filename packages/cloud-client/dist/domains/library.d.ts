import type { SupabaseClient } from "@supabase/supabase-js";
import type { HttpClient } from "../http.js";
import type { AiSearchResult, LibraryComponent } from "../types.js";
export interface BrowseOptions {
    query?: string;
    category?: string;
    limit?: number;
}
export declare class LibraryApi {
    #private;
    constructor(supabase: SupabaseClient, http: HttpClient);
    /** Browse the public component library (PostgREST, anon-readable). */
    browse(opts?: BrowseOptions): Promise<LibraryComponent[]>;
    /**
     * Pro semantic search via cloud-api (`/v1/ai/component-search`). Requires the
     * AI plane to be deployed; until then this rejects and callers surface it.
     */
    aiSearch(query: string): Promise<AiSearchResult>;
}
//# sourceMappingURL=library.d.ts.map