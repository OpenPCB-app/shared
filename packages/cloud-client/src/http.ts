import type { SupabaseClient } from "@supabase/supabase-js";
import { CloudApiError } from "./errors.js";

/**
 * Bearer-authenticated JSON client for cloud-api. The access token is pulled
 * fresh from the supplied Supabase session on every call (so token refresh is
 * transparent). Non-2xx responses throw {@link CloudApiError}.
 */
export class HttpClient {
  readonly #apiUrl: string;
  readonly #supabase: SupabaseClient;

  constructor(apiUrl: string, supabase: SupabaseClient) {
    this.#apiUrl = apiUrl.replace(/\/$/, "");
    this.#supabase = supabase;
  }

  async #authHeader(): Promise<string | null> {
    const { data } = await this.#supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? `Bearer ${token}` : null;
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (init.body !== undefined && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    const auth = await this.#authHeader();
    if (auth) headers.set("authorization", auth);

    const res = await fetch(`${this.#apiUrl}${path}`, { ...init, headers });

    if (!res.ok) {
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = await res.text().catch(() => null);
      }
      throw new CloudApiError(res.status, path, body);
    }

    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET" });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }
}
