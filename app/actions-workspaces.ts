"use server";

import { safeRevalidatePath, isUniqueConstraintError } from "./actions-shared";

import { and, eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers } from "@/lib/db/schema";
import { createNotification } from "@/lib/db/queries";
import { ACTIVE_WORKSPACE_COOKIE, getActiveWorkspaceId } from "@/lib/db/workspace";
import {
  getCurrentUser,
  AuthError,
  requireUser,
  requireWorkspaceMember,
  getUserWorkspaces,
} from "@/lib/db/auth";
import { newId } from "@/lib/id";

export async function switchWorkspaceAction(workspaceId: string) {
  try {
    if (!workspaceId || typeof workspaceId !== "string") {
      return { success: false, error: "A valid workspace ID is required." };
    }

    await requireWorkspaceMember(workspaceId);

    try {
      const cookieStore = await cookies();
      cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: "lax",
      });
    } catch {
      // Non-request context
    }

    safeRevalidatePath("/");
    safeRevalidatePath("/projects");
    safeRevalidatePath("/tasks");
    safeRevalidatePath("/messages");
    safeRevalidatePath("/calendar");
    safeRevalidatePath("/reports");

    return { success: true, activeWorkspaceId: workspaceId };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "You are not a member of this workspace." };
  }
}

export async function createWorkspaceAction(data: {
  name: string;
  description?: string;
  isPublic?: boolean;
  plan?: "Free" | "Pro" | "Enterprise";
  avatar?: string | null;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Must be logged in to create a workspace." };
  }

  const wsId = newId("ws");
  const baseSlug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workspace";
  let slug = baseSlug;
  const existingWs = await db.select().from(workspaces).where(eq(workspaces.slug, slug)).limit(1);
  if (existingWs.length > 0) {
    slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;
  }
  const now = new Date().toISOString();

  await db.transaction(async (tx) => {
    await tx.insert(workspaces).values({
      id: wsId,
      name: data.name.trim() || "Untitled Workspace",
      slug,
      description: data.description?.trim() ?? "",
      isPublic: data.isPublic ?? true,
      plan: data.plan ?? "Pro",
      avatar: data.avatar ?? null,
      createdAt: now,
    });

    // Assign user as workspace owner
    await tx.insert(workspaceMembers).values({
      id: `wm-${wsId}-owner`,
      workspaceId: wsId,
      userId: user.id,
      role: "owner",
      joinedAt: now,
    });

    const ownerCountRes = await tx.execute(
      sql`SELECT COUNT(*) as cnt FROM workspace_members WHERE workspace_id = ${wsId} AND role = 'owner'`
    );
    const ownerCount = Number((ownerCountRes[0] as unknown as { cnt: number | string }).cnt);
    if (ownerCount !== 1) {
      throw new Error("Failed to initialize workspace owner.");
    }
  });

  // Switch to newly created workspace
  await switchWorkspaceAction(wsId);
  safeRevalidatePath("/start");
  safeRevalidatePath("/");
  safeRevalidatePath("/preferences");
  safeRevalidatePath("/settings");
  safeRevalidatePath("/projects");
  safeRevalidatePath("/tasks");
  safeRevalidatePath("/messages");

  return { success: true, id: wsId };
}

export async function joinWorkspaceAction(workspaceId: string) {
  try {
    const user = await requireUser();

    if (!workspaceId || typeof workspaceId !== "string") {
      return { success: false, error: "A valid workspace ID is required." };
    }

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspace) {
      return { success: false, error: "Workspace not found." };
    }

    if (!workspace.isPublic) {
      return { success: false, error: "Private workspaces cannot be self-joined." };
    }

    const [existing] = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
      .limit(1);

    if (!existing) {
      const now = new Date().toISOString();
      try {
        await db.insert(workspaceMembers).values({
          id: `wm-${workspaceId}-${user.id}`,
          workspaceId,
          userId: user.id,
          role: "member",
          joinedAt: now,
        });
      } catch (insertErr) {
        if (!isUniqueConstraintError(insertErr)) {
          throw insertErr;
        }
      }
    }

    await switchWorkspaceAction(workspaceId);
    safeRevalidatePath("/start");
    safeRevalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: err instanceof Error ? err.message : "Failed to join workspace." };
  }
}

export async function addWorkspaceMemberAction(data: {
  workspaceId: string;
  userId: string;
  role: "admin" | "member" | "viewer";
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Unauthorized." };
  }

  // Verify caller membership and role in this workspace
  const [callerMembership] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, data.workspaceId), eq(workspaceMembers.userId, currentUser.id)))
    .limit(1);

  if (!callerMembership || (callerMembership.role !== "owner" && callerMembership.role !== "admin")) {
    return { success: false, error: "Permission denied. Only workspace owners and admins can manage members." };
  }

  // Admins cannot assign admin role (only owner can designate admins)
  if (callerMembership.role === "admin" && data.role === "admin") {
    return { success: false, error: "Only the workspace owner can designate new admins." };
  }

  const [existing] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, data.workspaceId), eq(workspaceMembers.userId, data.userId)))
    .limit(1);

  // Cannot modify owner role
  if (existing?.role === "owner") {
    return { success: false, error: "Cannot change the workspace owner's role." };
  }

  // Admins cannot modify another admin
  if (callerMembership.role === "admin" && existing?.role === "admin") {
    return { success: false, error: "Admins cannot change roles of other admins." };
  }

  const now = new Date().toISOString();
  if (existing) {
    await db
      .update(workspaceMembers)
      .set({ role: data.role })
      .where(eq(workspaceMembers.id, existing.id));
  } else {
    await db.insert(workspaceMembers).values({
      id: `wm-${data.workspaceId}-${data.userId}`,
      workspaceId: data.workspaceId,
      userId: data.userId,
      role: data.role,
      joinedAt: now,
      status: "pending",
    });

    try {
      const [ws] = await db
        .select({ name: workspaces.name })
        .from(workspaces)
        .where(eq(workspaces.id, data.workspaceId))
        .limit(1);
      const wsName = ws?.name || "a workspace";
      await createNotification({
        userId: data.userId,
        workspaceId: data.workspaceId,
        type: "invite",
        title: `Invited to ${wsName}`,
        message: `${currentUser.name} invited you to join workspace "${wsName}" as ${data.role}.`,
        link: "/start",
        data: JSON.stringify({
          workspaceId: data.workspaceId,
          workspaceName: wsName,
          inviterName: currentUser.name,
          role: data.role,
          status: "pending",
        }),
      });
    } catch (notifErr) {
      console.error("Failed to send invite notification:", notifErr);
    }
  }

  safeRevalidatePath("/");
  safeRevalidatePath("/start");
  safeRevalidatePath("/settings");
  safeRevalidatePath("/preferences");
  return { success: true };
}

export async function removeWorkspaceMemberAction(workspaceId: string, memberUserId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Unauthorized." };

  const [callerMembership] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, currentUser.id)))
    .limit(1);

  if (!callerMembership || (callerMembership.role !== "owner" && callerMembership.role !== "admin")) {
    return { success: false, error: "Permission denied. Only workspace owners and admins can remove members." };
  }

  const [target] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, memberUserId)))
    .limit(1);

  if (!target) {
    return { success: false, error: "Member not found." };
  }

  if (target.role === "owner") {
    return { success: false, error: "Cannot remove workspace owner." };
  }

  if (callerMembership.role === "admin" && target.role === "admin") {
    return { success: false, error: "Admins cannot remove other admins." };
  }

  await db
    .delete(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, memberUserId)));

  safeRevalidatePath("/");
  safeRevalidatePath("/start");
  safeRevalidatePath("/settings");
  return { success: true };
}

export async function deleteWorkspaceAction(workspaceId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Unauthorized." };

    if (!workspaceId || typeof workspaceId !== "string") {
      return { success: false, error: "A valid workspace ID is required." };
    }

    await db.transaction(async (tx) => {
      const startingOwners = await tx
        .select({ id: workspaceMembers.id, userId: workspaceMembers.userId })
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.role, "owner")));

      if (startingOwners.length !== 1) {
        throw new Error("Workspace invariant violation: workspace must have exactly one owner.");
      }
      if (startingOwners[0].userId !== currentUser.id) {
        throw new Error("Only the workspace owner can delete this workspace.");
      }

      // Delete workspace (cascades to related tables via foreign keys)
      await tx.delete(workspaces).where(eq(workspaces.id, workspaceId));
    });

    const remainingWorkspaces = await getUserWorkspaces(currentUser.id);
    if (remainingWorkspaces.length > 0) {
      await switchWorkspaceAction(remainingWorkspaces[0].id);
    }

    safeRevalidatePath("/");
    safeRevalidatePath("/start");
    safeRevalidatePath("/settings");
    return { success: true, remainingCount: remainingWorkspaces.length };
  } catch (err: unknown) {
    console.error("Delete workspace error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete workspace." };
  }
}

export async function leaveWorkspaceAction(workspaceId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Unauthorized." };

    if (!workspaceId || typeof workspaceId !== "string") {
      return { success: false, error: "A valid workspace ID is required." };
    }

    await db.transaction(async (tx) => {
      const [membership] = await tx
        .select({ id: workspaceMembers.id, role: workspaceMembers.role })
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, currentUser.id)))
        .limit(1);

      if (!membership) {
        throw new Error("You are not a member of this workspace.");
      }

      if (membership.role === "owner") {
        const memberCountRes = await tx.execute(
          sql`SELECT COUNT(*) as cnt FROM workspace_members WHERE workspace_id = ${workspaceId}`
        );
        const memberCount = Number((memberCountRes[0] as unknown as { cnt: number | string }).cnt);

        if (memberCount > 1) {
          throw new Error("Workspace owners cannot leave while other members exist. Transfer ownership or delete workspace.");
        }

        await tx.delete(workspaces).where(eq(workspaces.id, workspaceId));
      } else {
        await tx
          .delete(workspaceMembers)
          .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, currentUser.id)));

        const endOwnersRes = await tx.execute(
          sql`SELECT COUNT(*) as cnt FROM workspace_members WHERE workspace_id = ${workspaceId} AND role = 'owner'`
        );
        const endOwners = Number((endOwnersRes[0] as unknown as { cnt: number | string }).cnt);

        if (endOwners !== 1) {
          throw new Error("Workspace invariant violation: workspace must have exactly one owner.");
        }
      }
    });

    const remainingWorkspaces = await getUserWorkspaces(currentUser.id);
    if (remainingWorkspaces.length > 0) {
      await switchWorkspaceAction(remainingWorkspaces[0].id);
    }

    safeRevalidatePath("/");
    safeRevalidatePath("/start");
    safeRevalidatePath("/settings");
    return { success: true, remainingCount: remainingWorkspaces.length };
  } catch (err: unknown) {
    console.error("Leave workspace error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to leave workspace." };
  }
}

export async function transferWorkspaceOwnershipAction(workspaceId: string, newOwnerUserId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Unauthorized." };

    if (!workspaceId || typeof workspaceId !== "string" || !newOwnerUserId || typeof newOwnerUserId !== "string") {
      return { success: false, error: "Workspace ID and new owner user ID are required." };
    }

    await db.transaction(async (tx) => {
      const [ws] = await tx
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1);
      if (!ws) {
        throw new Error("Workspace not found.");
      }

      // Starting cardinality check: must start with exactly 1 owner, and caller must be that owner
      const startingOwners = await tx
        .select({ id: workspaceMembers.id, userId: workspaceMembers.userId })
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.role, "owner")));

      if (startingOwners.length !== 1) {
        throw new Error("Workspace invariant violation: workspace must start with exactly one owner.");
      }
      if (startingOwners[0].userId !== currentUser.id) {
        throw new Error("Only the current workspace owner can transfer ownership.");
      }

      if (currentUser.id === newOwnerUserId) {
        throw new Error("You are already the owner of this workspace.");
      }

      // Verify target user is a member of this workspace
      const [targetMembership] = await tx
        .select({ id: workspaceMembers.id, role: workspaceMembers.role })
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, newOwnerUserId)))
        .limit(1);

      if (!targetMembership) {
        throw new Error("Target user is not a member of this workspace.");
      }

      // Demote caller to admin
      await tx
        .update(workspaceMembers)
        .set({ role: "admin" })
        .where(eq(workspaceMembers.id, startingOwners[0].id));

      // Promote target to owner
      await tx
        .update(workspaceMembers)
        .set({ role: "owner" })
        .where(eq(workspaceMembers.id, targetMembership.id));

      // Ending cardinality check: must end with exactly 1 owner
      const endOwnersRes = await tx.execute(
        sql`SELECT COUNT(*) as cnt FROM workspace_members WHERE workspace_id = ${workspaceId} AND role = 'owner'`
      );
      const endOwners = Number((endOwnersRes[0] as unknown as { cnt: number | string }).cnt);

      if (endOwners !== 1) {
        throw new Error("Workspace invariant violation: workspace must end with exactly one owner.");
      }
    });

    safeRevalidatePath("/");
    safeRevalidatePath("/start");
    safeRevalidatePath("/settings");
    return { success: true };
  } catch (err: unknown) {
    console.error("Transfer workspace ownership error:", err);
    if (isUniqueConstraintError(err)) {
      return { success: false, error: "Failed to transfer ownership: unique constraint violation." };
    }
    return { success: false, error: err instanceof Error ? err.message : "Failed to transfer ownership." };
  }
}

export async function updateWorkspaceAction(data: {
  name: string;
  description?: string;
  isPublic?: boolean;
  plan?: string;
  avatar?: string | null;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please log in first." };
    }

    const wsId = await getActiveWorkspaceId();
    if (!wsId) {
      return { success: false, error: "No active workspace found." };
    }

    const trimmedName = data.name.trim();
    if (!trimmedName) {
      return { success: false, error: "Workspace name cannot be empty." };
    }

    const [membership] = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, wsId), eq(workspaceMembers.userId, user.id)))
      .limit(1);

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      return { success: false, error: "Only workspace owners or admins can update workspace information." };
    }

    await db
      .update(workspaces)
      .set({
        name: trimmedName,
        ...(data.description !== undefined ? { description: data.description.trim() } : {}),
        ...(data.isPublic !== undefined ? { isPublic: data.isPublic } : {}),
        ...(data.plan ? { plan: data.plan } : {}),
        ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
      })
      .where(eq(workspaces.id, wsId));

    safeRevalidatePath("/");
    safeRevalidatePath("/start");
    safeRevalidatePath("/settings");
    safeRevalidatePath("/preferences");
    return { success: true };
  } catch (error) {
    console.error("Failed to update workspace:", error);
    return { success: false, error: "Failed to update workspace." };
  }
}
