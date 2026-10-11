"use server";

import { safeRevalidatePath } from "./actions-shared";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/db/queries";
import { workspaceMembers, notifications } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/db/auth";

export async function getNotificationsAction() {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, notifications: [] };
    const notifs = await getUserNotifications(user.id);
    return { success: true, notifications: notifs };
  } catch (error) {
    console.error("Failed to get notifications:", error);
    return { success: false, notifications: [] };
  }
}

export async function markNotificationReadAction(id: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };
    await markNotificationAsRead(id, user.id);
    return { success: true };
  } catch (error) {
    console.error("Failed to mark notification read:", error);
    return { success: false, error: "Failed to mark notification read." };
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };
    await markAllNotificationsAsRead(user.id);
    return { success: true };
  } catch (error) {
    console.error("Failed to mark all notifications read:", error);
    return { success: false, error: "Failed to mark all notifications read." };
  }
}

export async function acceptWorkspaceInviteAction(notificationId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const [notif] = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, user.id)))
      .limit(1);

    if (!notif) return { success: false, error: "Notification not found." };
    if (notif.type !== "invite") return { success: false, error: "This notification is not an invitation." };

    let notifData: { workspaceId?: string; role?: string; status?: string; workspaceName?: string } = {};
    try {
      if (notif.data) notifData = JSON.parse(notif.data);
    } catch {}

    const wsId = notif.workspaceId || notifData.workspaceId;
    if (!wsId) return { success: false, error: "Workspace information missing." };

    const [membership] = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, wsId), eq(workspaceMembers.userId, user.id)))
      .limit(1);

    const now = new Date().toISOString();
    if (membership) {
      await db
        .update(workspaceMembers)
        .set({ status: "active", joinedAt: now })
        .where(eq(workspaceMembers.id, membership.id));
    } else {
      await db.insert(workspaceMembers).values({
        id: `wm-${wsId}-${user.id}`,
        workspaceId: wsId,
        userId: user.id,
        role: (notifData.role as "admin" | "member" | "viewer") || "member",
        joinedAt: now,
        status: "active",
      });
    }

    const updatedData = { ...notifData, status: "accepted" };
    await db
      .update(notifications)
      .set({
        isRead: true,
        data: JSON.stringify(updatedData),
      })
      .where(eq(notifications.id, notif.id));

    safeRevalidatePath("/");
    safeRevalidatePath("/start");
    safeRevalidatePath("/settings");
    safeRevalidatePath("/preferences");

    return {
      success: true,
      workspaceId: wsId,
      workspaceName: notifData.workspaceName || "the workspace",
    };
  } catch (error) {
    console.error("Failed to accept invitation:", error);
    return { success: false, error: "Failed to accept invitation." };
  }
}

export async function declineWorkspaceInviteAction(notificationId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const [notif] = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, user.id)))
      .limit(1);

    if (!notif) return { success: false, error: "Notification not found." };
    if (notif.type !== "invite") return { success: false, error: "This notification is not an invitation." };

    let notifData: { workspaceId?: string; role?: string; status?: string; workspaceName?: string } = {};
    try {
      if (notif.data) notifData = JSON.parse(notif.data);
    } catch {}

    const wsId = notif.workspaceId || notifData.workspaceId;
    if (wsId) {
      await db
        .delete(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, wsId),
            eq(workspaceMembers.userId, user.id),
            eq(workspaceMembers.status, "pending")
          )
        );
    }

    const updatedData = { ...notifData, status: "declined" };
    await db
      .update(notifications)
      .set({
        isRead: true,
        data: JSON.stringify(updatedData),
      })
      .where(eq(notifications.id, notif.id));

    safeRevalidatePath("/");
    safeRevalidatePath("/start");
    safeRevalidatePath("/settings");
    safeRevalidatePath("/preferences");

    return { success: true };
  } catch (error) {
    console.error("Failed to decline invitation:", error);
    return { success: false, error: "Failed to decline invitation." };
  }
}
