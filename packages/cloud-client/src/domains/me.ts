import type { HttpClient } from "../http.js";
import type { MeResponse, UserSettings } from "../types.js";

export class MeApi {
  readonly #http: HttpClient;

  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Current authenticated user (`GET /v1/me`). */
  get(): Promise<MeResponse> {
    return this.#http.get<MeResponse>("/v1/me");
  }

  async getSettings(): Promise<UserSettings> {
    const res = await this.#http.get<{ settings: UserSettings }>(
      "/v1/me/settings",
    );
    return res.settings;
  }

  /** Shallow-merge a patch into the user's settings; returns the merged result. */
  async updateSettings(patch: UserSettings): Promise<UserSettings> {
    const res = await this.#http.request<{ settings: UserSettings }>(
      "/v1/me/settings",
      { method: "PUT", body: JSON.stringify({ settings: patch }) },
    );
    return res.settings;
  }
}
