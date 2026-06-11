import type { DesignerSchematicProjection } from "@openpcb/contracts";

/** `GET /v1/me` — current user (cloud-api forwards GoTrue's record). */
export interface MeResponse {
  id: string;
  email: string | null;
  tier: string | null;
  appMetadata: Record<string, unknown>;
  userMetadata: Record<string, unknown>;
  createdAt: string | null;
}

/** `GET /v1/workspaces/me/personal`. */
export interface PersonalWorkspace {
  id: string;
  slug: string;
}

/** One row of `GET /v1/designs/workspaces/:workspaceId`. */
export interface DesignSummary {
  id: string;
  name: string;
  revision: number;
  updatedAt: string;
  archivedAt: string | null;
}

/** A page of results from a keyset-paginated list endpoint. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** One row of `GET /v1/designs/:id/revisions` (the command log, newest first). */
export interface DesignRevision {
  commandId: string;
  appliedRevision: number;
  commandType: string;
  userId: string;
  issuedAt: string;
  appliedAt: string;
}

/** `GET /v1/designs/:id`. */
export interface DesignRecord {
  id: string;
  name: string;
  revision: number;
  workspaceId: string;
}

/** `POST /v1/designs/workspaces/:workspaceId`. */
export interface CreatedDesign {
  id: string;
  name: string;
  revision: number;
}

/**
 * `GET /v1/designs/:id/projection`. `projection` is the live `projection_json`.
 * New/empty designs return `{}`; schematic designs return a
 * {@link DesignerSchematicProjection}. Typed loosely until the viewer (P2)
 * narrows it. NOTE: symbol bodies are persisted as placeholders server-side.
 */
export interface DesignProjectionResponse {
  id: string;
  name: string;
  revision: number;
  projection: DesignerSchematicProjection | Record<string, never>;
}

export type CommentSurface = "schematic" | "pcb" | "design";
export type CommentThreadStatus = "open" | "resolved" | "archived";
export type CommentTodoStatus = "none" | "todo" | "in_progress" | "done";

export interface CommentAnchor {
  surface: CommentSurface;
  pointNm: { x: number; y: number };
  entity?: { kind: string; id: string; subId?: string };
  layerId?: string;
  netId?: string | null;
  sourceRevision?: number;
}

export interface CommentAttachment {
  id: string;
  designId: string;
  threadId: string;
  messageId: string | null;
  fileName: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  byteSize: number;
  storageKey?: string;
  createdAt: string;
  deletedAt: string | null;
}

/** A message on a design comment thread. `body` is null for tombstones. */
export interface CommentMessage {
  id: string;
  designId: string;
  threadId: string;
  kind: "user" | "system" | "assistant";
  body: string | null;
  mentions: string[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  revision: number;
  attachments: CommentAttachment[];
}

export interface CommentThread {
  id: string;
  designId: string;
  surface: CommentSurface;
  anchor: CommentAnchor | null;
  status: CommentThreadStatus;
  todoStatus: CommentTodoStatus;
  title: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  messageCount: number;
  revision: number;
  syncState: "synced" | "pending" | "failed" | "conflict" | "local";
  deletedAt: string | null;
  messages?: CommentMessage[];
}

export type CommentCommand =
  | {
      type: "create_thread";
      threadId: string;
      messageId: string;
      surface: CommentSurface;
      anchor: CommentAnchor | null;
      body: string;
      title?: string | null;
      todoStatus?: CommentTodoStatus;
      mentions?: string[];
    }
  | {
      type: "add_message";
      threadId: string;
      messageId: string;
      body: string;
      mentions?: string[];
    }
  | { type: "edit_message"; threadId: string; messageId: string; body: string }
  | { type: "delete_message"; threadId: string; messageId: string }
  | { type: "set_thread_status"; threadId: string; status: CommentThreadStatus }
  | {
      type: "set_thread_todo_status";
      threadId: string;
      todoStatus: CommentTodoStatus;
    }
  | {
      type: "set_thread_anchor";
      threadId: string;
      anchor: CommentAnchor | null;
    };

export interface CommentCommandEnvelope {
  commandId: string;
  sessionId: string;
  aggregateId: string;
  baseRevision: number | null;
  issuedAt: number;
  command: CommentCommand;
}

export interface CommentCommandResult {
  ok: boolean;
  threadRevision?: number;
  thread?: CommentThread;
  code?: string;
  detail?: string;
}

// ── Sharing / teams roles ────────────────────────────────────────────────────
// Canonical source: @openpcb/contracts `sharing/roles` (+ the SQL design_role_rank
// + cloud-api _vendor/openpcb/roles). Mirrored here as types so the SDK does not
// depend on the pinned contracts tag carrying them.
export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";
export type GrantRole = "editor" | "commenter" | "viewer";
export type DesignRole = "owner" | "admin" | "editor" | "commenter" | "viewer";
export type WorkspaceKind = "personal" | "org";
export type MemberStatus = "invited" | "active" | "suspended" | "removed";
export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";
export type GrantStatus = "pending" | "active" | "revoked";

/** Result of creating a share — the `token` is returned exactly once. */
export interface ShareCreated {
  id: string;
  token: string;
  role: GrantRole;
  label: string | null;
  requireAuth: boolean;
  expiresAt: string | null;
  createdAt: string;
}

/** A share link as listed (never includes the token). */
export interface ShareSummary {
  id: string;
  role: GrantRole;
  label: string | null;
  requireAuth: boolean;
  expiresAt: string | null;
  createdAt: string;
}

/** Public, token-resolved view of a shared design. */
export interface PublicDesign {
  id: string;
  name: string;
  revision: number;
  role: GrantRole;
  requireAuth?: boolean;
  projection: DesignProjectionResponse["projection"];
}

/** Result of redeeming a share link into a durable grant. */
export interface ShareRedeemed {
  ok: boolean;
  designId: string;
  role: GrantRole;
}

// ── Workspaces / members / invites / grants ──────────────────────────────────
export interface WorkspaceSummary {
  id: string;
  slug: string;
  kind: WorkspaceKind;
  name: string | null;
  /** The caller's role in this workspace. */
  role: WorkspaceRole;
  createdAt?: string;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  email: string | null;
  role: WorkspaceRole;
  status: MemberStatus;
  invitedAt: string | null;
  acceptedAt: string | null;
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string;
  role: Exclude<WorkspaceRole, "owner">;
  status: InviteStatus;
  expiresAt: string | null;
  createdAt: string;
}

/** Invite create response — the `token` is returned exactly once. */
export interface WorkspaceInviteCreated {
  id: string;
  workspaceId: string;
  email: string;
  role: Exclude<WorkspaceRole, "owner">;
  token: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface DesignGrant {
  id: string;
  designId: string;
  userId: string | null;
  email: string | null;
  role: GrantRole;
  status: GrantStatus;
  invitedAt: string;
  acceptedAt: string | null;
}

/** An entry in the caller's "shared with me" list. */
export interface SharedDesign {
  designId: string;
  name: string;
  workspaceId: string;
  role: DesignRole;
  revision: number;
}

/** The caller's resolved access to a design. */
export interface DesignAccess {
  designId: string;
  role: DesignRole | null;
  source: "owner" | "member" | "grant" | "link" | null;
}

/** Free-form per-user dashboard preferences (`/v1/me/settings`). */
export interface UserSettings {
  theme?: "light" | "dark" | "system";
  [key: string]: unknown;
}

/** A public component-library entry (PostgREST `pub_component`). */
export interface LibraryComponent {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  createdAt: string;
}

/** One match from Pro semantic search (shape firmed up when the AI plane ships). */
export interface AiComponentMatch {
  id: string;
  name: string;
  score: number;
}

export interface AiSearchResult {
  matches: AiComponentMatch[];
}

/** `GET /v1/core-lib/:channel/latest`. */
export interface CoreLibLatest {
  channel: string;
  version: string;
  manifestUrl: string;
}
