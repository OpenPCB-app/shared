import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
export type Tier = "pro" | null;
export declare function tierOf(user: User | null): Tier;
/**
 * Auth surface over a consumer-supplied Supabase client. The consumer owns
 * client creation (session storage, PKCE config) so the same SDK works in the
 * browser (localStorage) and on desktop (Electron keychain).
 */
export declare class AuthApi {
    #private;
    constructor(supabase: SupabaseClient);
    getSession(): Promise<Session | null>;
    getUser(): Promise<User | null>;
    tier(): Promise<Tier>;
    accessToken(): Promise<string | null>;
    signIn(email: string, password: string): Promise<Session>;
    signOut(): Promise<void>;
    /** Subscribe to auth changes; returns an unsubscribe function. */
    onAuthStateChange(cb: (session: Session | null) => void): () => void;
    /** Accept a GoTrue invite token, then set the user's password. */
    acceptInvite(token: string, newPassword: string): Promise<void>;
}
//# sourceMappingURL=auth.d.ts.map