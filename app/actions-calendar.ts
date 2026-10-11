"use server";

import { safeRevalidatePath } from "./actions-shared";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { calendarEvents, workspaceMembers } from "@/lib/db/schema";
import { getActiveWorkspaceId } from "@/lib/db/workspace";
import { getCurrentUser } from "@/lib/db/auth";
import { newId } from "@/lib/id";

// --- Calendar Actions ---
export async function createCalendarEventAction(data: {
  id?: string;
  workspaceId?: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  category: string;
  description?: string;
  attendees?: string[];
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Unauthorized." };

  const wsId = data.workspaceId ?? (await getActiveWorkspaceId());
  if (!wsId) return { success: false, error: "No active workspace." };

  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, wsId), eq(workspaceMembers.userId, currentUser.id)))
    .limit(1);

  if (!membership || membership.role === "viewer") {
    return { success: false, error: "Viewers cannot create calendar events." };
  }

  const id = newId("ev");

  await db.insert(calendarEvents).values({
    id,
    workspaceId: wsId,
    title: data.title.trim() || "Untitled Event",
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime ?? null,
    category: data.category,
    description: data.description?.trim() ?? "",
    attendees: JSON.stringify(data.attendees ?? []),
  });

  safeRevalidatePath("/calendar");
  return { success: true, id };
}

export async function updateCalendarEventAction(
  id: string,
  data: {
    title: string;
    date: string;
    startTime: string;
    endTime?: string;
    category: string;
    description?: string;
    attendees?: string[];
  }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Unauthorized." };

  const [existing] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).limit(1);
  if (!existing) return { success: false, error: "Event not found." };

  const wsId = existing.workspaceId;
  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, wsId), eq(workspaceMembers.userId, currentUser.id)))
    .limit(1);

  if (!membership || membership.role === "viewer") {
    return { success: false, error: "Viewers cannot edit calendar events." };
  }

  await db
    .update(calendarEvents)
    .set({
      title: data.title.trim() || "Untitled Event",
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime ?? null,
      category: data.category,
      description: data.description?.trim() ?? "",
      attendees: JSON.stringify(data.attendees ?? []),
    })
    .where(eq(calendarEvents.id, id));

  safeRevalidatePath("/calendar");
  return { success: true };
}

export async function deleteCalendarEventAction(id: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Unauthorized." };

  const [existing] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).limit(1);
  if (!existing) return { success: false, error: "Event not found." };

  const wsId = existing.workspaceId;
  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, wsId), eq(workspaceMembers.userId, currentUser.id)))
    .limit(1);

  if (!membership || membership.role === "viewer") {
    return { success: false, error: "Viewers cannot delete calendar events." };
  }

  await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  safeRevalidatePath("/calendar");
  return { success: true };
}
