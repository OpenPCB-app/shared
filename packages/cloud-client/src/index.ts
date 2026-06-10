/**
 * `@openpcb/cloud-client` — typed client SDK for the OpenPCB Cloud API.
 *
 * Wraps Supabase auth over a consumer-supplied client and a bearer-fetch JSON
 * client for cloud-api (`/v1`). Wire types are reused from `@openpcb/contracts`.
 *
 * ```ts
 * import { createClient } from "@supabase/supabase-js";
 * import { createCloudClient } from "@openpcb/cloud-client";
 *
 * const supabase = createClient(url, anonKey, { auth: { flowType: "pkce" } });
 * const cloud = createCloudClient({ apiUrl: "https://api.openpcb.app", supabase });
 * const me = await cloud.me.get();
 * const designs = await cloud.designs.listPersonal();
 * ```
 */
export { createCloudClient } from "./client.js";
export type { CloudClient, CloudClientOptions } from "./client.js";
export { HttpClient } from "./http.js";
export { AuthApi, tierOf } from "./auth.js";
export type { Tier } from "./auth.js";
export { MeApi } from "./domains/me.js";
export { DesignsApi } from "./domains/designs.js";
export type {
  ListDesignsOptions,
  RevisionsOptions,
} from "./domains/designs.js";
export { CommentsApi } from "./domains/comments.js";
export type { ListCommentsOptions } from "./domains/comments.js";
export { SharesApi } from "./domains/shares.js";
export { LibraryApi } from "./domains/library.js";
export type { BrowseOptions } from "./domains/library.js";
export { CloudApiError } from "./errors.js";
export type { ProblemDetails } from "./errors.js";
export type {
  MeResponse,
  PersonalWorkspace,
  DesignSummary,
  DesignRecord,
  CreatedDesign,
  DesignProjectionResponse,
  DesignRevision,
  CommentAnchor,
  CommentAttachment,
  CommentCommand,
  CommentCommandEnvelope,
  CommentCommandResult,
  CommentMessage,
  CommentSurface,
  CommentThread,
  CommentThreadStatus,
  CommentTodoStatus,
  ShareCreated,
  ShareSummary,
  PublicDesign,
  UserSettings,
  LibraryComponent,
  AiComponentMatch,
  AiSearchResult,
  Page,
  CoreLibLatest,
} from "./types.js";
