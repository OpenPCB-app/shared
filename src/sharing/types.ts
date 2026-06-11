/**
 * Wire DTOs for OpenPCB sharing/teams. Pure types — consumed by the desktop
 * app, the cloud dashboard (@openpcb/cloud-client), and cloud-api routes.
 */
import type { DesignRole, GrantRole, WorkspaceRole } from "./roles.js";

export type WorkspaceKind = "personal" | "org";
export type MemberStatus = "invited" | "active" | "suspended" | "removed";
export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";
export type GrantStatus = "pending" | "active" | "revoked";

/** Invitable workspace roles (an owner is established at creation, not invited). */
export type InvitableWorkspaceRole = Exclude<WorkspaceRole, "owner">;

export interface WorkspaceDTO {
  id: string;
  slug: string;
  kind: WorkspaceKind;
  name: string | null;
  /** The requesting user's role in this workspace. */
  role: WorkspaceRole;
  createdAt: string;
}

export interface WorkspaceMemberDTO {
  workspaceId: string;
  userId: string;
  email: string | null;
  role: WorkspaceRole;
  status: MemberStatus;
  invitedAt: string | null;
  acceptedAt: string | null;
}

export interface WorkspaceInviteDTO {
  id: string;
  workspaceId: string;
  email: string;
  role: InvitableWorkspaceRole;
  status: InviteStatus;
  expiresAt: string | null;
  createdAt: string;
}

export interface DesignGrantDTO {
  id: string;
  designId: string;
  userId: string | null;
  email: string | null;
  role: GrantRole;
  status: GrantStatus;
  invitedAt: string;
  acceptedAt: string | null;
}

export interface ShareLinkDTO {
  id: string;
  designId: string;
  role: GrantRole;
  label: string | null;
  requireAuth: boolean;
  /** Plaintext token — returned ONCE on create, never on subsequent reads. */
  token?: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

/** An entry in the caller's "shared with me" list. */
export interface SharedWithMeDTO {
  designId: string;
  name: string;
  workspaceId: string;
  role: DesignRole;
  revision: number;
}

/** Resolved access for a design (server's authz verdict for the caller). */
export interface DesignAccessDTO {
  designId: string;
  role: DesignRole | null;
  /** Which source granted the effective role. */
  source: "owner" | "member" | "grant" | "link" | null;
}
