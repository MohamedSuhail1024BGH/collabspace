import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "./index";
import { workspaces, workspaceMembers, type DbWorkspace, type UserRole } from "./schema";
import { getCurrentUser, getUserWorkspaces } from "./auth";

export const ACTIVE_WORKSPACE_COOKIE = "collabspace_active_workspace";
export const DEFAULT_WORKSPACE_ID = "ws-acme";

export const getActiveWorkspaceId = cache(async (): Promise<string> => {
  try {
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
    if (cookieVal) return cookieVal;
  } catch {
    // Non-request context fallback (CLI/tests)
  }
  return DEFAULT_WORKSPACE_ID;
});

export const getAllWorkspaces = cache(async (): Promise<DbWorkspace[]> => {
  const user = await getCurrentUser();
  if (user) {
    const userWs = await getUserWorkspaces(user.id);
    if (userWs.length > 0) return userWs;
  }
  return db.select().from(workspaces);
});

export const getActiveWorkspace = cache(async (): Promise<DbWorkspace | null> => {
  const user = await getCurrentUser();

  if (user) {
    const userWs = await getUserWorkspaces(user.id);
    if (userWs.length > 0) {
      const activeId = await getActiveWorkspaceId();
      const match = userWs.find((w) => w.id === activeId);
      if (match) return match;
      return userWs[0];
    }
    return null;
  }

  const activeId = await getActiveWorkspaceId();
  if (activeId && activeId !== DEFAULT_WORKSPACE_ID) {
    const [found] = await db.select().from(workspaces).where(eq(workspaces.id, activeId)).limit(1);
    if (found) return found;
  }

  return null;
});

export async function getUserRoleInWorkspace(workspaceId: string, userId: string): Promise<UserRole | null> {
  const [membership] = await db
    .select({ role: workspaceMembers.role, status: workspaceMembers.status })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  if (!membership || membership.status !== "active") return null;
  return (membership?.role as UserRole) ?? null;
}
