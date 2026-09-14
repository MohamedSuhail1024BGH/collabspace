"use server";

import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getConversations, searchUsers, searchWorkspaces } from "@/lib/db/queries";
import { messageBus } from "@/lib/events/message-bus";
import {
  users,
  calendarEvents,
  conversations,
  messages,
  projectActivity,
  projectMembers,
  projects,
  tasks,
  workspaces,
  workspaceMembers,
} from "@/lib/db/schema";
import {
  ACTIVE_WORKSPACE_COOKIE,
  getActiveWorkspaceId,
} from "@/lib/db/workspace";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  getCurrentUser,
  getUserWorkspaces,
} from "@/lib/db/auth";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Gracefully handle when invoked outside an active Next.js request context (e.g. testing scripts)
  }
}

// --- Authentication Actions ---
export async function signupAction(data: {
  name: string;
  username?: string;
  email: string;
  password: string;
}) {
  try {
    const name = data.name.trim();
    const email = data.email.trim().toLowerCase();
    const password = data.password;
    const rawUsername =
      data.username?.trim().replace(/^@/, "").toLowerCase() ||
      email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");

    if (!name || !email || !password) {
      return { success: false, error: "Please fill in all required fields." };
    }
    if (password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters." };
    }

    const existingEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingEmail.length > 0) {
      return { success: false, error: "An account with this email already exists." };
    }

    let username = rawUsername;
    const existingUser = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (existingUser.length > 0) {
      username = `${rawUsername}_${Date.now().toString(36).slice(-4)}`;
    }

    const userId = `usr-${Date.now()}`;
    const now = new Date().toISOString();
    const passwordHash = hashPassword(password);

    await db.insert(users).values({
      id: userId,
      email,
      username,
      name,
      passwordHash,
      createdAt: now,
    });

    safeRevalidatePath("/login");
    safeRevalidatePath("/start");
    return { success: true, userId, username };
  } catch (err: unknown) {
    console.error("Signup error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to create account. Please try again." };
  }
}

export async function loginAction(data: { email: string; password: string }) {
  const email = data.email.trim().toLowerCase();
  const password = data.password;

  if (!email || !password) {
    return { success: false, error: "Please enter your email and password." };
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    return { success: false, error: "Invalid email or password." };
  }

  const isValid = verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { success: false, error: "Invalid email or password." };
  }

  await createSession(user.id);

  // Set active workspace to user's first workspace if they have one
  const userWorkspaces = await getUserWorkspaces(user.id);
  if (userWorkspaces.length > 0) {
    await switchWorkspaceAction(userWorkspaces[0].id);
  }

  safeRevalidatePath("/");
  safeRevalidatePath("/start");
  return { success: true, userId: user.id };
}

export async function logoutAction() {
  await destroySession();
  safeRevalidatePath("/");
  safeRevalidatePath("/login");
  return { success: true };
}

export async function deleteAccountAction() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please log in first." };
    }

    const userId = user.id;

    // 1. Find all workspaces where this user is an owner
    const memberships = await db
      .select({
        workspaceId: workspaceMembers.workspaceId,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, userId));

    // 2. For each workspace where user is the owner, check if they are the sole member
    for (const m of memberships) {
      if (m.role === "owner") {
        const allMembers = await db
          .select()
          .from(workspaceMembers)
          .where(eq(workspaceMembers.workspaceId, m.workspaceId));

        if (allMembers.length <= 1) {
          // Sole owner and member: delete workspace (cascades to tasks, projects, etc.)
          await db.delete(workspaces).where(eq(workspaces.id, m.workspaceId));
        }
      }
    }

    // 3. Delete user record (foreign keys cascade to sessions and workspaceMembers)
    await db.delete(users).where(eq(users.id, userId));

    // 4. Invalidate session in database & clear cookies
    await destroySession();

    safeRevalidatePath("/");
    safeRevalidatePath("/login");
    return { success: true };
  } catch (err: unknown) {
    console.error("Delete account error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete account." };
  }
}

// --- Workspace Tenant Actions ---
export async function switchWorkspaceAction(workspaceId: string) {
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
}

export async function createWorkspaceAction(data: {
  name: string;
  description?: string;
  isPublic?: boolean;
  plan?: "Free" | "Pro" | "Enterprise";
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Must be logged in to create a workspace." };
  }

  const wsId = `ws-${Date.now()}`;
  const baseSlug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workspace";
  let slug = baseSlug;
  const existingWs = await db.select().from(workspaces).where(eq(workspaces.slug, slug)).limit(1);
  if (existingWs.length > 0) {
    slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;
  }
  const now = new Date().toISOString();

  await db.insert(workspaces).values({
    id: wsId,
    name: data.name.trim() || "Untitled Workspace",
    slug,
    description: data.description?.trim() ?? "",
    isPublic: data.isPublic ?? true,
    plan: data.plan ?? "Pro",
    createdAt: now,
  });

  // Assign user as workspace owner
  await db.insert(workspaceMembers).values({
    id: `wm-${wsId}-owner`,
    workspaceId: wsId,
    userId: user.id,
    role: "owner",
    joinedAt: now,
  });

  // Switch to newly created workspace
  await switchWorkspaceAction(wsId);
  safeRevalidatePath("/start");

  return { success: true, id: wsId };
}

export async function joinWorkspaceAction(workspaceId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Must be logged in to join a workspace." };
  }

  const [existing] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
    .limit(1);

  if (!existing) {
    const now = new Date().toISOString();
    await db.insert(workspaceMembers).values({
      id: `wm-${workspaceId}-${user.id}`,
      workspaceId,
      userId: user.id,
      role: "member",
      joinedAt: now,
    });
  }

  await switchWorkspaceAction(workspaceId);
  safeRevalidatePath("/start");
  safeRevalidatePath("/");
  return { success: true };
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
    });
  }

  safeRevalidatePath("/");
  safeRevalidatePath("/start");
  safeRevalidatePath("/settings");
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

    const [membership] = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, currentUser.id)))
      .limit(1);

    if (!membership || membership.role !== "owner") {
      return { success: false, error: "Only the workspace owner can delete this workspace." };
    }

    // Delete workspace (cascades to related tables via foreign keys)
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));

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

    const [membership] = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, currentUser.id)))
      .limit(1);

    if (!membership) {
      return { success: false, error: "You are not a member of this workspace." };
    }

    if (membership.role === "owner") {
      const allMembers = await db
        .select()
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, workspaceId));
      if (allMembers.length > 1) {
        return {
          success: false,
          error: "Workspace owners cannot leave while other members exist. Transfer ownership or delete workspace.",
        };
      }
      await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    } else {
      await db
        .delete(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, currentUser.id)));
    }

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

    if (currentUser.id === newOwnerUserId) {
      return { success: false, error: "You are already the owner of this workspace." };
    }

    // Verify caller is owner
    const [callerMembership] = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, currentUser.id)))
      .limit(1);

    if (!callerMembership || callerMembership.role !== "owner") {
      return { success: false, error: "Only the current workspace owner can transfer ownership." };
    }

    // Verify target user is an existing member of this workspace
    const [targetMembership] = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, newOwnerUserId)))
      .limit(1);

    if (!targetMembership) {
      return { success: false, error: "Target user is not a member of this workspace." };
    }

    // Promote target to owner
    await db
      .update(workspaceMembers)
      .set({ role: "owner" })
      .where(eq(workspaceMembers.id, targetMembership.id));

    // Demote caller to admin
    await db
      .update(workspaceMembers)
      .set({ role: "admin" })
      .where(eq(workspaceMembers.id, callerMembership.id));

    safeRevalidatePath("/");
    safeRevalidatePath("/start");
    safeRevalidatePath("/settings");
    return { success: true };
  } catch (err: unknown) {
    console.error("Transfer workspace ownership error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to transfer ownership." };
  }
}

export async function assignProjectMemberAction(data: {
  projectId: string;
  userId: string;
  role: "lead" | "contributor" | "reviewer" | "viewer";
}) {
  const [user] = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
  if (!user) return { success: false, error: "User not found." };

  const id = `pm-${data.projectId}-${data.userId}`;
  const initials =
    (user.name.split(" ")[0]?.[0] ?? "") +
    (user.name.split(" ")[1]?.[0] ?? user.name[1] ?? "").toUpperCase();
  const color = user.avatar || "bg-violet-500";

  const [existing] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, data.projectId), eq(projectMembers.userId, data.userId)))
    .limit(1);

  if (existing) {
    await db
      .update(projectMembers)
      .set({ role: data.role })
      .where(eq(projectMembers.id, existing.id));
  } else {
    await db.insert(projectMembers).values({
      id,
      projectId: data.projectId,
      userId: data.userId,
      name: user.name,
      role: data.role,
      initials: initials || "TM",
      color,
    });
  }

  await db.insert(projectActivity).values({
    id: `pa-${Date.now()}`,
    projectId: data.projectId,
    content: `${user.name} was assigned as ${data.role}.`,
    createdAt: new Date().toISOString(),
  });

  safeRevalidatePath("/projects");
  safeRevalidatePath(`/projects/${data.projectId}`);
  return { success: true };
}

export async function removeProjectMemberAction(projectId: string, memberId: string) {
  await db
    .delete(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.id, memberId)));
  safeRevalidatePath("/projects");
  safeRevalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function searchUsersAction(query: string) {
  return searchUsers(query);
}

export async function searchWorkspacesAction(query: string) {
  return searchWorkspaces(query);
}

// --- Tasks Actions ---
export async function createTaskAction(data: {
  workspaceId?: string;
  title: string;
  description?: string;
  assignee?: string;
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

  const id = `task-${Date.now()}`;
  const now = new Date().toISOString();

  await db.insert(tasks).values({
    id,
    workspaceId: wsId,
    title: data.title.trim() || "Untitled task",
    description: data.description?.trim() ?? "",
    assignee: data.assignee?.trim() || "Unassigned",
    priority: data.priority ?? "Medium",
    status: data.status ?? "Not started",
    due: data.due || new Date().toISOString().slice(0, 10),
    projectId,
    projectName,
    createdAt: now,
  });

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

  let projectId = data.projectId !== undefined ? data.projectId : task.projectId;
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

  await db
    .update(tasks)
    .set({
      ...(data.title ? { title: data.title.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description.trim() } : {}),
      ...(data.assignee ? { assignee: data.assignee.trim() } : {}),
      ...(data.priority ? { priority: data.priority } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.due ? { due: data.due } : {}),
      ...(data.projectId !== undefined ? { projectId } : {}),
      ...(data.projectName !== undefined || projectId ? { projectName } : {}),
    })
    .where(eq(tasks.id, id));

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

  const isAssignee = task.assignee === currentUser.name;
  if (!membership || membership.role === "viewer" || (membership.role === "member" && !isAssignee)) {
    return { success: false, error: "Permission denied to delete task." };
  }

  await db.delete(tasks).where(eq(tasks.id, id));
  safeRevalidatePath("/tasks");
  safeRevalidatePath("/");
  if (task.projectId) safeRevalidatePath(`/projects/${task.projectId}`);
  return { success: true };
}

// --- Projects Actions ---
export async function createProjectAction(data: {
  workspaceId?: string;
  name: string;
  owner?: string;
  ownerUserId?: string;
  status?: string;
  due?: string;
  progress?: number;
  overview?: string;
  members?: { userId?: string; name: string; role: string }[];
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
    return { success: false, error: "Viewers cannot create projects." };
  }

  const id = `project-${Date.now()}`;
  const now = new Date().toISOString();

  let ownerName = data.owner?.trim() || currentUser.name || "Unassigned";
  let ownerUserId = data.ownerUserId;
  let ownerColor = currentUser.avatar || "bg-violet-500";
  let ownerInitials =
    (currentUser.name.split(" ")[0]?.[0] ?? "") +
    (currentUser.name.split(" ")[1]?.[0] ?? currentUser.name[1] ?? "").toUpperCase() || "PO";

  if (ownerUserId) {
    const [targetUser] = await db.select().from(users).where(eq(users.id, ownerUserId)).limit(1);
    if (targetUser) {
      ownerName = targetUser.name;
      ownerColor = targetUser.avatar || "bg-violet-500";
      ownerInitials =
        (targetUser.name.split(" ")[0]?.[0] ?? "") +
        (targetUser.name.split(" ")[1]?.[0] ?? targetUser.name[1] ?? "").toUpperCase() || "PO";
    }
  } else if (data.owner?.trim()) {
    ownerName = data.owner.trim();
    ownerInitials = ownerName.slice(0, 2).toUpperCase() || "PO";
  } else {
    ownerUserId = currentUser.id;
  }

  await db.insert(projects).values({
    id,
    workspaceId: wsId,
    name: data.name.trim() || "Untitled project",
    owner: ownerName,
    status: data.status || "Planning",
    due: data.due || "Next week",
    progress: data.progress ?? 0,
    overview: data.overview?.trim() || "Add project context, timeline, and key milestones.",
    createdAt: now,
  });

  await db.insert(projectMembers).values({
    id: `pm-${id}-0`,
    projectId: id,
    userId: ownerUserId || null,
    name: ownerName,
    role: "lead",
    initials: ownerInitials,
    color: ownerColor,
  });

  if (data.members && data.members.length > 0) {
    for (let i = 0; i < data.members.length; i++) {
      const m = data.members[i];
      if (m.name === ownerName || (m.userId && m.userId === ownerUserId)) continue;
      await db.insert(projectMembers).values({
        id: `pm-${id}-${i + 1}`,
        projectId: id,
        userId: m.userId || null,
        name: m.name,
        role: m.role || "contributor",
        initials: m.name.slice(0, 2).toUpperCase() || "TM",
        color: "bg-cyan-500",
      });
    }
  }

  await db.insert(projectActivity).values({
    id: `pa-${id}-0`,
    projectId: id,
    content: `${currentUser.name} created project '${data.name.trim() || "Untitled project"}'.`,
    createdAt: now,
  });

  safeRevalidatePath("/projects");
  safeRevalidatePath("/");
  return { success: true, id };
}

export async function updateProjectAction(
  id: string,
  data: {
    name?: string;
    owner?: string;
    status?: string;
    due?: string;
    progress?: number;
    overview?: string;
  }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Unauthorized." };

  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) return { success: false, error: "Project not found." };

  const [wsMembership] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, project.workspaceId), eq(workspaceMembers.userId, currentUser.id)))
    .limit(1);

  if (!wsMembership || wsMembership.role === "viewer") {
    return { success: false, error: "Permission denied." };
  }

  await db
    .update(projects)
    .set({
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.owner ? { owner: data.owner.trim() } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.due ? { due: data.due } : {}),
      ...(data.progress !== undefined ? { progress: Math.min(100, Math.max(0, data.progress)) } : {}),
      ...(data.overview !== undefined ? { overview: data.overview.trim() } : {}),
    })
    .where(eq(projects.id, id));

  if (data.status && data.status !== project.status) {
    await db.insert(projectActivity).values({
      id: `pa-${id}-${Date.now()}`,
      projectId: id,
      content: `Status updated to ${data.status} by ${currentUser.name}.`,
      createdAt: new Date().toISOString(),
    });
  }

  safeRevalidatePath("/projects");
  safeRevalidatePath(`/projects/${id}`);
  safeRevalidatePath("/");
  return { success: true };
}

export async function deleteProjectAction(id: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Unauthorized." };

  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) return { success: false, error: "Project not found." };

  const [wsMembership] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, project.workspaceId), eq(workspaceMembers.userId, currentUser.id)))
    .limit(1);

  const isLead = project.owner === currentUser.name;
  if (!wsMembership || (wsMembership.role !== "owner" && wsMembership.role !== "admin" && !isLead)) {
    return { success: false, error: "Only workspace owners, admins, or the project lead can delete this project." };
  }

  await db.delete(projectMembers).where(eq(projectMembers.projectId, id));
  await db.delete(projectActivity).where(eq(projectActivity.projectId, id));
  await db.delete(projects).where(eq(projects.id, id));

  safeRevalidatePath("/projects");
  safeRevalidatePath("/");
  return { success: true };
}

// --- Messages Actions ---
export async function sendMessageAction(conversationId: string, sender: string, content: string) {
  const currentUser = await getCurrentUser();
  const effectiveSender = currentUser?.name || sender || "Me";
  const msgId = `m-${Date.now()}`;
  const timestamp = new Date().toISOString();

  await db.insert(messages).values({
    id: msgId,
    conversationId,
    sender: effectiveSender,
    content: content.trim(),
    timestamp,
  });

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  await db
    .update(conversations)
    .set({
      lastMessage: content.trim(),
      lastTimestamp: timestamp,
      unread: 0,
    })
    .where(eq(conversations.id, conversationId));

  // Broadcast real-time message event to connected workspace clients
  if (conv?.workspaceId) {
    let pIds: string[] | undefined = undefined;
    try {
      pIds = JSON.parse(conv.participantIds || "[]");
    } catch {
      pIds = undefined;
    }

    messageBus.publishMessage({
      type: "new_message",
      workspaceId: conv.workspaceId,
      conversationId,
      message: {
        id: msgId,
        sender: effectiveSender,
        content: content.trim(),
        timestamp,
      },
      participantIds: pIds && pIds.length > 0 ? pIds : undefined,
    });
  }

  safeRevalidatePath("/messages");
  return { success: true, id: msgId, sender: effectiveSender, timestamp };
}

export async function getLiveConversationsAction(workspaceId?: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Unauthorized." };

  const wsId = workspaceId ?? (await getActiveWorkspaceId());
  if (!wsId) return { success: false, error: "No active workspace." };

  const convs = await getConversations(wsId, currentUser.id);
  return { success: true, conversations: convs };
}

export async function createConversationAction(data: {
  workspaceId?: string;
  name: string;
  initialMessage?: string;
  role?: string;
  color?: string;
  type?: "channel" | "direct";
  recipientId?: string;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Unauthorized." };

  const wsId = data.workspaceId ?? (await getActiveWorkspaceId());
  if (!wsId) return { success: false, error: "No active workspace." };

  const trimmedName = data.name.trim();
  if (!trimmedName) return { success: false, error: "Conversation name required." };

  const isDirect = data.type === "direct" || Boolean(data.recipientId);

  if (isDirect && data.recipientId) {
    // Look for existing direct conversation between currentUser.id and data.recipientId in this workspace
    const wsConversations = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.workspaceId, wsId), eq(conversations.type, "direct")));

    const existingDm = wsConversations.find((c) => {
      try {
        const pIds = JSON.parse(c.participantIds || "[]") as string[];
        return pIds.includes(currentUser.id) && pIds.includes(data.recipientId!);
      } catch {
        return false;
      }
    });

    if (existingDm) {
      if (data.initialMessage?.trim()) {
        await sendMessageAction(existingDm.id, currentUser.name, data.initialMessage.trim());
      }
      return { success: true, id: existingDm.id, isExisting: true };
    }
  } else if (!isDirect) {
    // Check if channel with this exact name already exists in this workspace
    const [existing] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.workspaceId, wsId), eq(conversations.name, trimmedName)))
      .limit(1);

    if (existing) {
      if (data.initialMessage?.trim()) {
        await sendMessageAction(existing.id, currentUser.name, data.initialMessage.trim());
      }
      return { success: true, id: existing.id, isExisting: true };
    }
  }

  const id = `conv-${Date.now()}`;
  const now = new Date().toISOString();
  const initials =
    (trimmedName.split(" ")[0]?.[0] ?? "") +
    (trimmedName.split(" ")[1]?.[0] ?? trimmedName[1] ?? "").toUpperCase();
  const color = data.color || (isDirect ? "bg-cyan-500" : "bg-violet-500");
  const role = data.role || (isDirect ? "Direct Message" : "Team Channel");
  const participantIds =
    isDirect && data.recipientId
      ? JSON.stringify([currentUser.id, data.recipientId])
      : "[]";

  await db.insert(conversations).values({
    id,
    workspaceId: wsId,
    type: isDirect ? "direct" : "channel",
    participantIds,
    name: trimmedName,
    initials,
    color,
    role,
    online: true,
    lastMessage: data.initialMessage?.trim() || "Conversation started.",
    lastTimestamp: now,
    unread: 0,
  });

  if (data.initialMessage?.trim()) {
    await db.insert(messages).values({
      id: `m-${Date.now()}`,
      conversationId: id,
      sender: currentUser.name,
      content: data.initialMessage.trim(),
      timestamp: now,
    });
  }

  safeRevalidatePath("/messages");
  return { success: true, id, isExisting: false };
}

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

  const id = data.id || `ev-${Date.now()}`;

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

// --- Settings & Profile Actions ---
export async function updateWorkspaceAction(data: {
  name: string;
  description?: string;
  isPublic?: boolean;
  plan?: string;
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
      })
      .where(eq(workspaces.id, wsId));

    safeRevalidatePath("/");
    safeRevalidatePath("/start");
    safeRevalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to update workspace:", error);
    return { success: false, error: "Failed to update workspace." };
  }
}

export async function updateUserProfileAction(data: {
  name: string;
  username?: string;
  bio?: string;
  avatar?: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please log in first." };
    }

    const trimmedName = data.name.trim();
    if (!trimmedName) {
      return { success: false, error: "Name cannot be empty." };
    }

    let cleanUsername: string | null | undefined = undefined;
    if (data.username !== undefined) {
      const sanitized = data.username.trim().replace(/^@/, "").toLowerCase();
      cleanUsername = sanitized || null;
      if (cleanUsername && cleanUsername !== user.username) {
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.username, cleanUsername))
          .limit(1);
        if (existingUser && existingUser.id !== user.id) {
          return { success: false, error: "Username is already taken by another account." };
        }
      }
    }

    await db
      .update(users)
      .set({
        name: trimmedName,
        ...(cleanUsername !== undefined ? { username: cleanUsername } : {}),
        ...(data.bio !== undefined ? { bio: data.bio.trim() } : {}),
        ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
      })
      .where(eq(users.id, user.id));

    safeRevalidatePath("/");
    safeRevalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to update user profile:", error);
    return { success: false, error: "Failed to update user profile." };
  }
}

export async function changePasswordAction(data: {
  currentPassword: string;
  newPassword: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please log in first." };
    }

    if (!data.currentPassword || !data.newPassword) {
      return { success: false, error: "Both current and new passwords are required." };
    }

    if (data.newPassword.length < 6) {
      return { success: false, error: "New password must be at least 6 characters long." };
    }

    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (!dbUser) {
      return { success: false, error: "User not found." };
    }

    const isValid = verifyPassword(data.currentPassword, dbUser.passwordHash);
    if (!isValid) {
      return { success: false, error: "Current password is incorrect." };
    }

    const newHash = hashPassword(data.newPassword);
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));

    return { success: true };
  } catch (error) {
    console.error("Failed to change password:", error);
    return { success: false, error: "Failed to change password." };
  }
}

