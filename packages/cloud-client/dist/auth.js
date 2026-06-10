export function tierOf(user) {
    const t = user?.app_metadata?.tier;
    return t === "pro" ? "pro" : null;
}
/**
 * Auth surface over a consumer-supplied Supabase client. The consumer owns
 * client creation (session storage, PKCE config) so the same SDK works in the
 * browser (localStorage) and on desktop (Electron keychain).
 */
export class AuthApi {
    #supabase;
    constructor(supabase) {
        this.#supabase = supabase;
    }
    async getSession() {
        const { data } = await this.#supabase.auth.getSession();
        return data.session;
    }
    async getUser() {
        return (await this.getSession())?.user ?? null;
    }
    async tier() {
        return tierOf(await this.getUser());
    }
    async accessToken() {
        return (await this.getSession())?.access_token ?? null;
    }
    async signIn(email, password) {
        const { data, error } = await this.#supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error)
            throw error;
        if (!data.session)
            throw new Error("Sign-in returned no session");
        return data.session;
    }
    async signOut() {
        const { error } = await this.#supabase.auth.signOut();
        if (error)
            throw error;
    }
    /** Subscribe to auth changes; returns an unsubscribe function. */
    onAuthStateChange(cb) {
        const { data } = this.#supabase.auth.onAuthStateChange((_event, session) => cb(session));
        return () => data.subscription.unsubscribe();
    }
    /** Accept a GoTrue invite token, then set the user's password. */
    async acceptInvite(token, newPassword) {
        const { error: verifyErr } = await this.#supabase.auth.verifyOtp({
            token_hash: token,
            type: "invite",
        });
        if (verifyErr)
            throw verifyErr;
        const { error: updateErr } = await this.#supabase.auth.updateUser({
            password: newPassword,
        });
        if (updateErr)
            throw updateErr;
    }
}
//# sourceMappingURL=auth.js.map