"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { searchUsers, searchUsersForInvite, searchWorkspaces } from "@/lib/db/queries";
import { workspaceMembers } from "@/lib/db/schema";
import { getActiveWorkspace } from "@/lib/db/workspace";
import { getCurrentUser } from "@/lib/db/auth";

export async function searchUsersAction(query: string, workspaceId?: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return [];

    let targetWsId = workspaceId;
    if (!targetWsId) {
      const activeWs = await getActiveWorkspace();
      if (!activeWs) return [];
      targetWsId = activeWs.id;
    }

    // Verify caller is an active member of this workspace (rejects tampered workspace cookie)
    const [membership] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, targetWsId),
          eq(workspaceMembers.userId, currentUser.id)
        )
      )
      .limit(1);

    if (!membership) {
      return [];
    }

    return searchUsers(query, targetWsId);
  } catch {
    return [];
  }
}

export async function searchUsersForInviteAction(query: string, workspaceId?: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return [];

    let targetWsId = workspaceId;
    if (!targetWsId) {
      const activeWs = await getActiveWorkspace();
      if (!activeWs) return [];
      targetWsId = activeWs.id;
    }

    // Verify caller is an active owner/admin of this workspace
    const [membership] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, targetWsId),
          eq(workspaceMembers.userId, currentUser.id)
        )
      )
      .limit(1);

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      return [];
    }

    return searchUsersForInvite(query, targetWsId);
  } catch {
    return [];
  }
}

export async function searchWorkspacesAction(query: string) {
  return searchWorkspaces(query);
}
