import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

export type Tier = "pro" | null;

export function tierOf(user: User | null): Tier {
  const t = (user?.app_metadata as { tier?: string } | undefined)?.tier;
  return t === "pro" ? "pro" : null;
}

/**
 * Auth surface over a consumer-supplied Supabase client. The consumer owns
 * client creation (session storage, PKCE config) so the same SDK works in the
 * browser (localStorage) and on desktop (Electron keychain).
 */
export class AuthApi {
  readonly #supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.#supabase = supabase;
  }

  async getSession(): Promise<Session | null> {
    const { data } = await this.#supabase.auth.getSession();
    return data.session;
  }

  async getUser(): Promise<User | null> {
    return (await this.getSession())?.user ?? null;
  }

  async tier(): Promise<Tier> {
    return tierOf(await this.getUser());
  }

  async accessToken(): Promise<string | null> {
    return (await this.getSession())?.access_token ?? null;
  }

  async signIn(email: string, password: string): Promise<Session> {
    const { data, error } = await this.#supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (!data.session) throw new Error("Sign-in returned no session");
    return data.session;
  }

  async signOut(): Promise<void> {
    const { error } = await this.#supabase.auth.signOut();
    if (error) throw error;
  }

  /** Subscribe to auth changes; returns an unsubscribe function. */
  onAuthStateChange(cb: (session: Session | null) => void): () => void {
    const { data } = this.#supabase.auth.onAuthStateChange((_event, session) =>
      cb(session),
    );
    return () => data.subscription.unsubscribe();
  }

  /** Accept a GoTrue invite token, then set the user's password. */
  async acceptInvite(token: string, newPassword: string): Promise<void> {
    const { error: verifyErr } = await this.#supabase.auth.verifyOtp({
      token_hash: token,
      type: "invite",
    });
    if (verifyErr) throw verifyErr;
    const { error: updateErr } = await this.#supabase.auth.updateUser({
      password: newPassword,
    });
    if (updateErr) throw updateErr;
  }
}
