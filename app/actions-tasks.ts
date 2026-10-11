"use server";

import { safeRevalidatePath } from "./actions-shared";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/db/queries";
import { users, projects, tasks, workspaceMembers } from "@/lib/db/schema";
import { getActiveWorkspaceId } from "@/lib/db/workspace";
import { getCurrentUser } from "@/lib/db/auth";
import { newId } from "@/lib/id";

// --- Tasks Actions ---
async function resolveTaskAssignee(
  workspaceId: string,
  assigneeName?: string,
  assigneeUserId?: string
): Promise<{ success: true; assignee: string; assigneeUserId: string | null } | { success: false; error: string }> {
  if (assigneeUserId !== undefined) {
    const trimmedId = assigneeUserId.trim();
    if (!trimmedId) {
      return { success: false, error: "Assignee must be an active member of this workspace." };
    }
    // Validate membership
    const [member] = await db
      .select({ id: users.id, name: users.name })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, trimmedId)))
      .limit(1);

    if (!member) {
      return { success: false, error: "Assignee must be an active member of this workspace." };
    }
    return { success: true, assignee: member.name, assigneeUserId: member.id };
  }

  const rawName = assigneeName?.trim();
  if (!rawName || rawName === "Unassigned") {
    return { success: true, assignee: "Unassigned", assigneeUserId: null };
  }

  // Resolve by name within workspace
  const matches = await db
    .select({ id: users.id, name: users.name })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(users.name, rawName)));

  if (matches.length === 1) {
    return { success: true, assignee: matches[0].name, assigneeUserId: matches[0].id };
  }

  // 0 or multiple matches -> leave assigneeUserId NULL, keep display name
  return { success: true, assignee: rawName, assigneeUserId: null };
}

export async function createTaskAction(data: {
  workspaceId?: string;
  title: string;
  description?: string;
  assignee?: string;
  assigneeUserId?: string;
  priority?: "High" | "Medium" | "Low";
  status?: string;
  due?: string;
  projectId?: string;
  projectName?: string;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Unauthorized." };

  const wsId = data.workspaceId ?? (await getActiveWorkspaceId());

  // Check workspace permission
  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, wsId), eq(workspaceMembers.userId, currentUser.id)))
    .limit(1);

  if (!membership || membership.role === "viewer") {
    return { success: false, error: "Viewers cannot create tasks." };
  }

  let projectId = data.projectId ?? null;
  let projectName = data.projectName ?? "General";
  if (projectId) {
    const [foundProj] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, wsId)))
      .limit(1);
    if (foundProj) {
      projectName = foundProj.name;
    } else {
      projectId = null;
    }
  }

  const resolved = await resolveTaskAssignee(wsId, data.assignee, data.assigneeUserId);
  if (!resolved.success) {
    return { success: false, error: resolved.error };
  }

  const id = newId("task");
  const now = new Date().toISOString();

  await db.insert(tasks).values({
    id,
    workspaceId: wsId,
    title: data.title.trim() || "Untitled task",
    description: data.description?.trim() ?? "",
    assignee: resolved.assignee,
    assigneeUserId: resolved.assigneeUserId,
    priority: data.priority ?? "Medium",
    status: data.status ?? "Not started",
    due: data.due || new Date().toISOString().slice(0, 10),
    projectId,
    projectName,
    createdAt: now,
  });

  if (resolved.assigneeUserId && resolved.assigneeUserId !== currentUser.id) {
    try {
      await createNotification({
        userId: resolved.assigneeUserId,
        workspaceId: wsId,
        type: "task_assigned",
        title: "New Task Assigned",
        message: `${currentUser.name} assigned you to "${data.title.trim() || "Untitled task"}" (${projectName}).`,
        link: "/tasks",
      });
    } catch (notifErr) {
      console.error("Failed to send task notification:", notifErr);
    }
  }

  safeRevalidatePath("/tasks");
  safeRevalidatePath("/");
  if (projectId) safeRevalidatePath(`/projects/${projectId}`);
  return { success: true, id };
}

export async function updateTaskAction(
  id: string,
  data: {
    title?: string;
    description?: string;
    assignee?: string;
    assigneeUserId?: string;
    priority?: "High" | "Medium" | "Low";
    status?: string;
    due?: string;
    projectId?: string;
    projectName?: string;
  }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Unauthorized." };

  const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!task) return { success: false, error: "Task not found." };

  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, task.workspaceId), eq(workspaceMembers.userId, currentUser.id)))
    .limit(1);

  if (!membership || membership.role === "viewer") {
    return { success: false, error: "Permission denied." };
  }

  const projectId = data.projectId !== undefined ? data.projectId : task.projectId;
  let projectName = data.projectName !== undefined ? data.projectName : task.projectName;
  if (projectId) {
    const [foundProj] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, task.workspaceId)))
      .limit(1);
    if (foundProj) {
      projectName = foundProj.name;
    }
  }

  let resolvedAssignee: { assignee: string; assigneeUserId: string | null } | undefined;
  const hasAssigneeUserId = data.assigneeUserId !== undefined;
  const hasAssigneeName = data.assignee !== undefined;

  if (hasAssigneeUserId) {
    const res = await resolveTaskAssignee(task.workspaceId, undefined, data.assigneeUserId);
    if (!res.success) {
      return { success: false, error: res.error };
    }
    resolvedAssignee = { assignee: res.assignee, assigneeUserId: res.assigneeUserId };
  } else if (hasAssigneeName) {
    const isNameChanged = data.assignee!.trim() !== task.assignee;
    if (isNameChanged) {
      const res = await resolveTaskAssignee(task.workspaceId, data.assignee, undefined);
      if (!res.success) {
        return { success: false, error: res.error };
      }
      resolvedAssignee = { assignee: res.assignee, assigneeUserId: res.assigneeUserId };
    } else {
      resolvedAssignee = { assignee: task.assignee, assigneeUserId: task.assigneeUserId ?? null };
    }
  }

  await db
    .update(tasks)
    .set({
      ...(data.title ? { title: data.title.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description.trim() } : {}),
      ...(resolvedAssignee
        ? { assignee: resolvedAssignee.assignee, assigneeUserId: resolvedAssignee.assigneeUserId }
        : {}),
      ...(data.priority ? { priority: data.priority } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.due ? { due: data.due } : {}),
      ...(data.projectId !== undefined ? { projectId } : {}),
      ...(data.projectName !== undefined || projectId ? { projectName } : {}),
    })
    .where(eq(tasks.id, id));

  if (
    resolvedAssignee?.assigneeUserId &&
    resolvedAssignee.assigneeUserId !== task.assigneeUserId &&
    resolvedAssignee.assigneeUserId !== currentUser.id
  ) {
    try {
      const finalTitle = data.title?.trim() || task.title;
      await createNotification({
        userId: resolvedAssignee.assigneeUserId,
        workspaceId: task.workspaceId,
        type: "task_assigned",
        title: "Task Assigned",
        message: `${currentUser.name} assigned you to "${finalTitle}".`,
        link: "/tasks",
      });
    } catch (notifErr) {
      console.error("Failed to send task update notification:", notifErr);
    }
  }

  safeRevalidatePath("/tasks");
  safeRevalidatePath("/");
  if (task.projectId) safeRevalidatePath(`/projects/${task.projectId}`);
  if (projectId && projectId !== task.projectId) safeRevalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function updateTaskStatusAction(id: string, status: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Unauthorized." };

  const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!task) return { success: false, error: "Task not found." };

  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, task.workspaceId), eq(workspaceMembers.userId, currentUser.id)))
    .limit(1);

  if (!membership || membership.role === "viewer") {
    return { success: false, error: "Permission denied." };
  }

  await db.update(tasks).set({ status }).where(eq(tasks.id, id));
  safeRevalidatePath("/tasks");
  safeRevalidatePath("/");
  if (task.projectId) safeRevalidatePath(`/projects/${task.projectId}`);
  return { success: true };
}

export async function deleteTaskAction(id: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Unauthorized." };

  const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!task) return { success: false, error: "Task not found." };

  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, task.workspaceId), eq(workspaceMembers.userId, currentUser.id)))
    .limit(1);

  if (!membership) {
    return { success: false, error: "Permission denied to delete task." };
  }
  if (membership.role === "viewer") {
    return { success: false, error: "Permission denied to delete task." };
  }

  const isWsAdmin = membership.role === "owner" || membership.role === "admin";
  const isAssignee = task.assigneeUserId ? task.assigneeUserId === currentUser.id : false;

  if (!isWsAdmin && !isAssignee) {
    return { success: false, error: "Permission denied to delete task." };
  }

  await db.delete(tasks).where(eq(tasks.id, id));

  safeRevalidatePath("/tasks");
  safeRevalidatePath("/");
  if (task.projectId) safeRevalidatePath(`/projects/${task.projectId}`);
  return { success: true };
}
