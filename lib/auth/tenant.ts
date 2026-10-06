import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/db/auth";
import {
  workspaceMembers,
  type DbUser,
  type DbWorkspaceMember,
  type UserRole,
} from "@/lib/db/schema";

export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 403) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

/**
 * Resolves the authenticated caller from the active session.
 * Always resolves from caller cookies — never accepts a parameter for user identity.
 */
export async function requireUser(): Promise<Omit<DbUser, "passwordHash">> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("Authentication required.", 401);
  }
  return user;
}

/**
 * Verifies that the authenticated caller is an active member of the given workspace.
 * Always resolves caller identity internally.
 */
export async function requireWorkspaceMember(workspaceId: string): Promise<{
  user: Omit<DbUser, "passwordHash">;
  membership: DbWorkspaceMember;
}> {
  if (!workspaceId || typeof workspaceId !== "string") {
    throw new AuthError("A valid workspaceId is required.", 400);
  }

  const user = await requireUser();

  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, user.id)
      )
    )
    .limit(1);

  if (!membership || membership.status !== "active") {
    throw new AuthError("You are not a member of this workspace.", 403);
  }

  return { user, membership };
}

/**
 * Verifies that the authenticated caller has one of the allowed roles in the given workspace.
 * Always resolves caller identity internally.
 */
export async function requireWorkspaceRole(
  workspaceId: string,
  allowedRoles: UserRole[]
): Promise<{
  user: Omit<DbUser, "passwordHash">;
  membership: DbWorkspaceMember;
}> {
  const { user, membership } = await requireWorkspaceMember(workspaceId);

  if (!allowedRoles.includes(membership.role as UserRole)) {
    throw new AuthError(
      "Access denied. Insufficient permissions for this workspace.",
      403
    );
  }

  return { user, membership };
}

/**
 * Separate helper for looking up a target user's membership in a workspace.
 * Explicitly separate from caller authorization to prevent impersonation.
 */
export async function getTargetWorkspaceMembership(
  workspaceId: string,
  targetUserId: string
): Promise<DbWorkspaceMember | null> {
  if (!workspaceId || !targetUserId) return null;

  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, targetUserId),
        eq(workspaceMembers.status, "active")
      )
    )
    .limit(1);

  return membership ?? null;
}

/**
 * Separate helper requiring a target user to be a member of a workspace.
 */
export async function requireTargetWorkspaceMember(
  workspaceId: string,
  targetUserId: string
): Promise<DbWorkspaceMember> {
  const membership = await getTargetWorkspaceMembership(workspaceId, targetUserId);
  if (!membership) {
    throw new AuthError("Target user is not a member of this workspace.", 400);
  }
  return membership;
}
