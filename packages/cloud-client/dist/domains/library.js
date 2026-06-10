function mapRow(r) {
    return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        description: r.description,
        category: r.category,
        tags: r.tags ?? [],
        createdAt: r.created_at,
    };
}
export class LibraryApi {
    #supabase;
    #http;
    constructor(supabase, http) {
        this.#supabase = supabase;
        this.#http = http;
    }
    /** Browse the public component library (PostgREST, anon-readable). */
    async browse(opts = {}) {
        let q = this.#supabase
            .from("pub_component")
            .select("id,slug,name,description,category,tags,created_at")
            .order("name")
            .limit(opts.limit ?? 60);
        if (opts.category)
            q = q.eq("category", opts.category);
        if (opts.query) {
            // Sanitize to avoid breaking the PostgREST or-filter grammar.
            const safe = opts.query.replace(/[,()*%]/g, " ").trim();
            if (safe)
                q = q.or(`name.ilike.%${safe}%,description.ilike.%${safe}%`);
        }
        const { data, error } = await q;
        if (error)
            throw new Error(error.message);
        return data?.map(mapRow) ?? [];
    }
    /**
     * Pro semantic search via cloud-api (`/v1/ai/component-search`). Requires the
     * AI plane to be deployed; until then this rejects and callers surface it.
     */
    aiSearch(query) {
        return this.#http.post("/v1/ai/component-search", {
            query,
        });
    }
}
//# sourceMappingURL=library.js.map