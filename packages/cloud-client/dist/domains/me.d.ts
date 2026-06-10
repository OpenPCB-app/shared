import type { HttpClient } from "../http.js";
import type { MeResponse, UserSettings } from "../types.js";
export declare class MeApi {
    #private;
    constructor(http: HttpClient);
    /** Current authenticated user (`GET /v1/me`). */
    get(): Promise<MeResponse>;
    getSettings(): Promise<UserSettings>;
    /** Shallow-merge a patch into the user's settings; returns the merged result. */
    updateSettings(patch: UserSettings): Promise<UserSettings>;
}
//# sourceMappingURL=me.d.ts.map