/**
 * Canonical role + rank model for OpenPCB sharing/collaboration.
 *
 * SINGLE SOURCE OF TRUTH for role ranks. Mirrored verbatim into cloud-api
 * `src/_vendor/openpcb/roles.ts` (runtime) and into the SQL
 * `public.design_role_rank()` function (designer migration 0003). A
 * cross-language fixture test + the vendor-sync CI guard keep all three in step.
 *
 * Ranks form a total order; effective access on a design = the MAX rank across
 * every source (workspace membership, per-design grant, presented share link).
 *
 * Keep this file dependency-free so the cloud-api vendor copy is byte-identical.
 */

/** Workspace membership roles (one per user per workspace). */
export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";

/** Per-design grant + share-link roles (no admin/owner via grant or link). */
export type GrantRole = "editor" | "commenter" | "viewer";

/** Effective role on a design — the union of every source. */
export type DesignRole = "owner" | "admin" | "editor" | "commenter" | "viewer";

/** Total-order rank for every role. MUST match SQL design_role_rank(). */
export const ROLE_RANK: Record<DesignRole, number> = {
  viewer: 10,
  commenter: 20,
  editor: 30,
  admin: 40,
  owner: 50,
};

export const VIEWER_RANK = 10;
export const COMMENTER_RANK = 20;
export const EDITOR_RANK = 30;
export const ADMIN_RANK = 40;
export const OWNER_RANK = 50;

/** Rank of a role (0 = no access / unknown). */
export function rankOf(role: DesignRole | null | undefined): number {
  return role ? (ROLE_RANK[role] ?? 0) : 0;
}

/** True when `role` meets or exceeds `min`. */
export function atLeast(
  role: DesignRole | null | undefined,
  min: DesignRole,
): boolean {
  return rankOf(role) >= ROLE_RANK[min];
}

/** The higher-ranked of two roles (null-safe; null = no access). */
export function maxRole(
  a: DesignRole | null | undefined,
  b: DesignRole | null | undefined,
): DesignRole | null {
  const ra = rankOf(a);
  const rb = rankOf(b);
  if (ra === 0 && rb === 0) return null;
  return ra >= rb ? (a as DesignRole) : (b as DesignRole);
}

/** The role exactly matching a rank, or null. */
export function roleForRank(rank: number): DesignRole | null {
  for (const role of Object.keys(ROLE_RANK) as DesignRole[]) {
    if (ROLE_RANK[role] === rank) return role;
  }
  return null;
}
