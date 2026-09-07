"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
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
  email: string;
  password: string;
  workspaceName?: string;
}) {
  try {
    const name = data.name.trim();
    const email = data.email.trim().toLowerCase();
    const password = data.password;
    const workspaceName = data.workspaceName?.trim() || `${name}'s Workspace`;

    if (!name || !email || !password) {
      return { success: false, error: "Please fill in all required fields." };
    }
    if (password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters." };
    }

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return { success: false, error: "An account with this email already exists." };
    }

    const userId = `usr-${Date.now()}`;
    const now = new Date().toISOString();
    const passwordHash = hashPassword(password);

    await db.insert(users).values({
      id: userId,
      email,
      name,
      passwordHash,
      createdAt: now,
    });

    try {
      // Create initial workspace for user with guaranteed unique slug
      const wsId = `ws-${Date.now()}`;
      const baseSlug = workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workspace";
      let slug = baseSlug;
      const existingWs = await db.select().from(workspaces).where(eq(workspaces.slug, slug)).limit(1);
      if (existingWs.length > 0) {
        slug = `${baseSlug}-${Date.now().toString(36)}`;
      }

      await db.insert(workspaces).values({
        id: wsId,
        name: workspaceName,
        slug,
        plan: "Pro",
        createdAt: now,
      });

      await db.insert(workspaceMembers).values({
        id: `wm-${wsId}-owner`,
        workspaceId: wsId,
        userId,
        role: "owner",
        joinedAt: now,
      });
    } catch (wsErr) {
      // Clean up user record if workspace insertion failed to prevent orphaned/broken state
      await db.delete(users).where(eq(users.id, userId));
      throw wsErr;
    }

    // User and initial workspace created without automatically establishing session
    safeRevalidatePath("/login");
    return { success: true, userId };
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

  // Set active workspace to user's first workspace
  const userWorkspaces = await getUserWorkspaces(user.id);
  if (userWorkspaces.length > 0) {
    await switchWorkspaceAction(userWorkspaces[0].id);
  }

  safeRevalidatePath("/");
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
  plan?: "Free" | "Pro" | "Enterprise";
}) {
  const user = await getCurrentUser();
  const wsId = `ws-${Date.now()}`;
  const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const now = new Date().toISOString();

  await db.insert(workspaces).values({
    id: wsId,
    name: data.name.trim() || "Untitled Workspace",
    slug: slug || wsId,
    plan: data.plan ?? "Pro",
    createdAt: now,
  });

  // Assign user as workspace owner
  await db.insert(workspaceMembers).values({
    id: `wm-${wsId}-owner`,
    workspaceId: wsId,
    userId: user?.id ?? "usr-ava",
    role: "owner",
    joinedAt: now,
  });

  // Switch to newly created workspace
  await switchWorkspaceAction(wsId);

  return { success: true, id: wsId };
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
  const id = `task-${Date.now()}`;
  const now = new Date().toISOString();
  const wsId = data.workspaceId ?? (await getActiveWorkspaceId());

  await db.insert(tasks).values({
    id,
    workspaceId: wsId,
    title: data.title.trim() || "Untitled task",
    description: data.description?.trim() ?? "",
    assignee: data.assignee?.trim() || "Unassigned",
    priority: data.priority ?? "Medium",
    status: data.status ?? "Not started",
    due: data.due || new Date().toISOString().slice(0, 10),
    projectId: data.projectId ?? null,
    projectName: data.projectName ?? "General",
    createdAt: now,
  });

  safeRevalidatePath("/tasks");
  safeRevalidatePath("/");
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
  await db
    .update(tasks)
    .set({
      ...(data.title ? { title: data.title.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description.trim() } : {}),
      ...(data.assignee ? { assignee: data.assignee.trim() } : {}),
      ...(data.priority ? { priority: data.priority } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.due ? { due: data.due } : {}),
      ...(data.projectId !== undefined ? { projectId: data.projectId } : {}),
      ...(data.projectName !== undefined ? { projectName: data.projectName } : {}),
    })
    .where(eq(tasks.id, id));

  safeRevalidatePath("/tasks");
  safeRevalidatePath("/");
  return { success: true };
}

export async function updateTaskStatusAction(id: string, status: string) {
  await db.update(tasks).set({ status }).where(eq(tasks.id, id));
  safeRevalidatePath("/tasks");
  safeRevalidatePath("/");
  return { success: true };
}

export async function deleteTaskAction(id: string) {
  await db.delete(tasks).where(eq(tasks.id, id));
  safeRevalidatePath("/tasks");
  safeRevalidatePath("/");
  return { success: true };
}

// --- Projects Actions ---
export async function createProjectAction(data: {
  workspaceId?: string;
  name: string;
  owner?: string;
  status?: string;
  due?: string;
  progress?: number;
  overview?: string;
}) {
  const id = `project-${Date.now()}`;
  const now = new Date().toISOString();
  const owner = data.owner?.trim() || "Unassigned";
  const wsId = data.workspaceId ?? (await getActiveWorkspaceId());

  await db.insert(projects).values({
    id,
    workspaceId: wsId,
    name: data.name.trim() || "Untitled project",
    owner,
    status: data.status || "Planning",
    due: data.due || "Next week",
    progress: data.progress ?? 0,
    overview: data.overview?.trim() || "Add project context, timeline, and key milestones.",
    createdAt: now,
  });

  await db.insert(projectMembers).values({
    id: `pm-${id}-0`,
    projectId: id,
    name: owner,
    role: "Project owner",
    initials: owner.slice(0, 2).toUpperCase(),
    color: "bg-violet-500",
  });

  await db.insert(projectActivity).values({
    id: `pa-${id}-0`,
    projectId: id,
    content: "Project created in workspace.",
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

  safeRevalidatePath("/projects");
  safeRevalidatePath(`/projects/${id}`);
  safeRevalidatePath("/");
  return { success: true };
}

export async function deleteProjectAction(id: string) {
  await db.delete(projects).where(eq(projects.id, id));
  safeRevalidatePath("/projects");
  safeRevalidatePath("/");
  return { success: true };
}

// --- Messages Actions ---
export async function sendMessageAction(conversationId: string, sender: string, content: string) {
  const msgId = `m-${Date.now()}`;
  const timestamp = new Date().toISOString();

  await db.insert(messages).values({
    id: msgId,
    conversationId,
    sender,
    content: content.trim(),
    timestamp,
  });

  await db
    .update(conversations)
    .set({
      lastMessage: content.trim(),
      lastTimestamp: timestamp,
      unread: 0,
    })
    .where(eq(conversations.id, conversationId));

  safeRevalidatePath("/messages");
  return { success: true, id: msgId, timestamp };
}

// --- Calendar Actions ---
export async function createCalendarEventAction(data: {
  workspaceId?: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  category: string;
  description?: string;
  attendees?: string[];
}) {
  const id = `ev-${Date.now()}`;
  const wsId = data.workspaceId ?? (await getActiveWorkspaceId());

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

export async function deleteCalendarEventAction(id: string) {
  await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  safeRevalidatePath("/calendar");
  return { success: true };
}

// --- Settings & Profile Actions ---
export async function updateWorkspaceAction(data: {
  name: string;
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

    await db
      .update(workspaces)
      .set({
        name: trimmedName,
        ...(data.plan ? { plan: data.plan } : {}),
      })
      .where(eq(workspaces.id, wsId));

    safeRevalidatePath("/");
    safeRevalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to update workspace:", error);
    return { success: false, error: "Failed to update workspace." };
  }
}

export async function updateUserProfileAction(data: {
  name: string;
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

    await db
      .update(users)
      .set({
        name: trimmedName,
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

