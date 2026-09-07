import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "./index";
import { workspaces, workspaceMembers, type DbWorkspace, type UserRole } from "./schema";
import { getCurrentUser, getUserWorkspaces } from "./auth";

export const ACTIVE_WORKSPACE_COOKIE = "collabspace_active_workspace";
export const DEFAULT_WORKSPACE_ID = "ws-acme";

export async function getActiveWorkspaceId(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
    if (cookieVal) return cookieVal;
  } catch {
    // Non-request context fallback (CLI/tests)
  }
  return DEFAULT_WORKSPACE_ID;
}

export async function getAllWorkspaces(): Promise<DbWorkspace[]> {
  const user = await getCurrentUser();
  if (user) {
    const userWs = await getUserWorkspaces(user.id);
    if (userWs.length > 0) return userWs;
  }
  return db.select().from(workspaces);
}

export async function getActiveWorkspace(): Promise<DbWorkspace> {
  const user = await getCurrentUser();

  if (user) {
    const userWs = await getUserWorkspaces(user.id);
    if (userWs.length > 0) {
      const activeId = await getActiveWorkspaceId();
      const match = userWs.find((w) => w.id === activeId);
      if (match) return match;
      return userWs[0];
    }
  }

  const activeId = await getActiveWorkspaceId();
  const [found] = await db.select().from(workspaces).where(eq(workspaces.id, activeId)).limit(1);

  if (found) return found;

  const all = await db.select().from(workspaces);
  return (
    all[0] ?? {
      id: DEFAULT_WORKSPACE_ID,
      name: "Acme Corp",
      slug: "acme",
      plan: "Pro",
      createdAt: new Date().toISOString(),
    }
  );
}

export async function getWorkspaceMembersWithDetails(workspaceId: string) {
  return db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.workspaceId, workspaceId),
    with: {
      user: true,
    },
  });
}

// --- Role-Based Access Control (RBAC) ---
export const PERMISSIONS = {
  owner: ["create:project", "edit:project", "delete:project", "create:task", "edit:task", "delete:task", "manage:members", "manage:billing"],
  admin: ["create:project", "edit:project", "delete:project", "create:task", "edit:task", "delete:task", "manage:members"],
  member: ["create:project", "edit:project", "create:task", "edit:task", "send:message", "create:event"],
  viewer: ["read:all", "send:message"],
} as const;

export function canUser(role: UserRole, permission: string): boolean {
  const allowed = PERMISSIONS[role] as readonly string[];
  return allowed ? allowed.includes(permission) : false;
}
