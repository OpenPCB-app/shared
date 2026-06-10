import { HttpClient } from "./http.js";
import { AuthApi } from "./auth.js";
import { MeApi } from "./domains/me.js";
import { DesignsApi } from "./domains/designs.js";
import { CommentsApi } from "./domains/comments.js";
import { SharesApi } from "./domains/shares.js";
import { LibraryApi } from "./domains/library.js";
/** Construct the OpenPCB Cloud client SDK. */
export function createCloudClient(opts) {
    const http = new HttpClient(opts.apiUrl, opts.supabase);
    return {
        auth: new AuthApi(opts.supabase),
        me: new MeApi(http),
        designs: new DesignsApi(http),
        comments: new CommentsApi(http),
        shares: new SharesApi(http),
        library: new LibraryApi(opts.supabase, http),
        http,
    };
}
//# sourceMappingURL=client.js.map