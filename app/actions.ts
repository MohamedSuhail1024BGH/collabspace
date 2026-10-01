"use server";

import { and, eq, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  getConversations,
  searchUsers,
  searchUsersForInvite,
  searchWorkspaces,
  getUserNotifications,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/db/queries";
import { messageBus } from "@/lib/events/message-bus";
import {
  users,
  sessions,
  calendarEvents,
  conversations,
  messages,
  projectActivity,
  projectMembers,
  projects,
  tasks,
  workspaces,
  workspaceMembers,
  notifications,
} from "@/lib/db/schema";
import {
  ACTIVE_WORKSPACE_COOKIE,
  getActiveWorkspace,
  getActiveWorkspaceId,
} from "@/lib/db/workspace";
import {
  hashPassword,
  verifyPassword,
  needsRehash,
  dummyVerify,
  createSession,
  destroySession,
  revokeAllUserSessions,
  AUTH_COOKIE_NAME,
  getCurrentUser,
  getUserWorkspaces,
  AuthError,
  requireUser,
  requireWorkspaceMember,
  requireWorkspaceRole,
  getTargetWorkspaceMembership,
} from "@/lib/db/auth";
import {
  checkLoginRateLimit,
  recordFailedLogin,
  resetLoginRateLimit,
  extractClientIp,
} from "@/lib/auth/rate-limiter";
import { classifyConversation, validateDirectConversation } from "@/lib/auth/dm-validator";
import { newId } from "@/lib/id";

function isUniqueConstraintError(err: unknown): boolean {
  if (err && typeof err === "object") {
    const e = err as { code?: string; message?: string };
    if (e.code === "SQLITE_CONSTRAINT_UNIQUE" || e.code === "SQLITE_CONSTRAINT" || e.code === "23505") return true;
    if (e.message && (e.message.includes("UNIQUE constraint failed") || e.message.includes("duplicate key value"))) return true;
  }
  return false;
}

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

    const userId = newId("usr");
    const now = new Date().toISOString();
    const passwordHash = await hashPassword(password);

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
  try {
    const email = data.email.trim().toLowerCase();
    const password = data.password;

    if (!email || !password) {
      return { success: false, error: "Please enter your email and password." };
    }

    // 1. Extract client IP safely (rightmost entry / proxy hop)
    let clientIp = "127.0.0.1";
    try {
      const headersList = await headers();
      clientIp = extractClientIp(headersList);
    } catch {
      // Non-request or testing context
    }

    // 2. Pre-auth rate limit check (per-account primary defense, per-IP secondary defense)
    // Fail-Closed: if locked or if storage fails, checkLoginRateLimit returns allowed: false
    const rateCheck = await checkLoginRateLimit(email, clientIp);
    if (!rateCheck.allowed) {
      return { success: false, error: "Invalid email or password." };
    }

    // 3. User lookup
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      // Constant-time dummy verification + record failed attempt
      await dummyVerify(password);
      try {
        await recordFailedLogin(email, clientIp);
      } catch (recordErr) {
        console.error("[Auth] Storage error recording failed attempt:", recordErr);
      }
      return { success: false, error: "Invalid email or password." };
    }

    // 4. Dual-format password verification (async scrypt)
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      try {
        await recordFailedLogin(email, clientIp);
      } catch (recordErr) {
        console.error("[Auth] Storage error recording failed attempt:", recordErr);
      }
      return { success: false, error: "Invalid email or password." };
    }

    // 5. Successful authentication: reset both account and IP rate limit counters
    try {
      await resetLoginRateLimit(email, clientIp);
    } catch (resetErr) {
      console.error("[Auth] Failed to reset rate limits:", resetErr);
    }

    // 6. Transparent Auto-Upgrade to modern $scrypt$ PHC format if needed
    if (needsRehash(user.passwordHash)) {
      try {
        const upgradedHash = await hashPassword(password);
        await db
          .update(users)
          .set({ passwordHash: upgradedHash })
          .where(eq(users.id, user.id));
      } catch (rehashErr) {
        console.error("[Auth] Transparent rehash error:", rehashErr);
      }
    }

    // 7. Fixation-Resistant Session Rotation (creates fresh session after revoking prior)
    await createSession(user.id);

    // Set active workspace to user's first workspace if they have one
    const userWorkspaces = await getUserWorkspaces(user.id);
    if (userWorkspaces.length > 0) {
      await switchWorkspaceAction(userWorkspaces[0].id);
    }

    safeRevalidatePath("/");
    safeRevalidatePath("/start");
    return { success: true, userId: user.id };
  } catch (err: unknown) {
    console.error("[Auth] Fail-closed login error:", err);
    return { success: false, error: "Invalid email or password." };
  }
}

export async function logoutAction() {
  await destroySession();
  safeRevalidatePath("/");
  safeRevalidatePath("/login");
  return { success: true };
}

export async function deleteAccountAction(options?: {
  replacementOwners?: Record<string, string>;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please log in first." };
    }

    const userId = user.id;

    // 1. Find all workspaces where this user is an owner
    const ownedWorkspacesRaw = await db.execute(sql`
      SELECT w.id, w.name, (
        SELECT COUNT(*) FROM workspace_members wm2 WHERE wm2.workspace_id = w.id
      ) as member_count
      FROM workspaces w
      JOIN workspace_members wm ON w.id = wm.workspace_id
      WHERE wm.user_id = ${userId} AND wm.role = 'owner'
    `);
    const ownedWorkspaces = (ownedWorkspacesRaw as unknown as Array<{ id: string; name: string; member_count: number | string }>).map((w) => ({
      ...w,
      member_count: Number(w.member_count),
    }));

    const soleMemberWorkspaces = ownedWorkspaces.filter((w) => w.member_count <= 1);
    const multiMemberWorkspaces = ownedWorkspaces.filter((w) => w.member_count > 1);

    if (multiMemberWorkspaces.length > 0) {
      // If replacement mappings are absent, return interim blocker error
      if (!options?.replacementOwners) {
        const wsNames = multiMemberWorkspaces.map((w) => `'${w.name}'`).join(", ");
        return {
          success: false,
          error: `Cannot delete account: you are the sole owner of active multi-member workspace(s) (${wsNames}). Please transfer ownership in Workspace Settings before deleting your account.`,
        };
      }

      // If replacement mappings are provided, validate each required workspace
      for (const w of multiMemberWorkspaces) {
        const replacementUserId = options.replacementOwners[w.id];
        if (!replacementUserId || typeof replacementUserId !== "string") {
          return {
            success: false,
            error: `Cannot delete account: replacement owner required for workspace '${w.name}' (${w.id}).`,
          };
        }

        if (replacementUserId === userId) {
          return {
            success: false,
            error: `Cannot assign yourself as replacement owner for workspace '${w.name}'.`,
          };
        }

        // Verify replacement is a member of that workspace
        const [targetMember] = await db
          .select({ id: workspaceMembers.id, role: workspaceMembers.role })
          .from(workspaceMembers)
          .where(and(eq(workspaceMembers.workspaceId, w.id), eq(workspaceMembers.userId, replacementUserId)))
          .limit(1);

        if (!targetMember) {
          return {
            success: false,
            error: `Replacement user ${replacementUserId} is not a member of workspace '${w.name}'.`,
          };
        }
      }

      // Reject extraneous / cross-workspace mappings that do not correspond to owned multi-member workspaces
      for (const mappedWsId of Object.keys(options.replacementOwners)) {
        if (!multiMemberWorkspaces.some((w) => w.id === mappedWsId)) {
          return {
            success: false,
            error: `Invalid replacement mapping for workspace '${mappedWsId}': user is not the sole owner of a multi-member workspace with this ID.`,
          };
        }
      }
    }

    // 2. Atomic transaction: promote replacements, explicitly delete caller memberships, delete sole-member workspaces, delete user
    await db.transaction(async (tx) => {
      // Process multi-member workspaces
      for (const w of multiMemberWorkspaces) {
        const repUserId = options!.replacementOwners![w.id];

        // Verify starting single-owner cardinality
        const startingOwners = await tx
          .select({ id: workspaceMembers.id, userId: workspaceMembers.userId })
          .from(workspaceMembers)
          .where(and(eq(workspaceMembers.workspaceId, w.id), eq(workspaceMembers.role, "owner")));

        if (startingOwners.length !== 1 || startingOwners[0].userId !== userId) {
          throw new Error(`Workspace invariant violation: workspace '${w.id}' must start with exactly one owner.`);
        }

        // Promote replacement
        await tx
          .update(workspaceMembers)
          .set({ role: "owner" })
          .where(and(eq(workspaceMembers.workspaceId, w.id), eq(workspaceMembers.userId, repUserId)));

        // Explicitly delete caller's membership
        await tx
          .delete(workspaceMembers)
          .where(and(eq(workspaceMembers.workspaceId, w.id), eq(workspaceMembers.userId, userId)));

        // Verify ending single-owner cardinality
        const endOwnersRes = await tx.execute(sql`SELECT COUNT(*) as cnt FROM workspace_members WHERE workspace_id = ${w.id} AND role = 'owner'`);
        const endOwners = Number((endOwnersRes[0] as unknown as { cnt: number | string }).cnt);

        if (endOwners !== 1) {
          throw new Error(`Workspace invariant violation: workspace '${w.id}' must end with exactly one owner.`);
        }
      }

      // Delete sole-member workspaces
      for (const w of soleMemberWorkspaces) {
        await tx.delete(workspaces).where(eq(workspaces.id, w.id));
      }

      // Delete user sessions & user record
      await tx.delete(sessions).where(eq(sessions.userId, userId));
      await tx.delete(users).where(eq(users.id, userId));

      // Verify no remaining memberships for caller
      const lingeringRes = await tx.execute(sql`SELECT COUNT(*) as cnt FROM workspace_members WHERE user_id = ${userId}`);
      const lingeringMemberships = Number((lingeringRes[0] as unknown as { cnt: number | string }).cnt);

      if (lingeringMemberships !== 0) {
        throw new Error("Account deletion failed: lingering memberships detected.");
      }
    });

    // Invalidate session in database & clear cookies
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

export async function assignProjectMemberAction(data: {
  projectId: string;
  userId: string;
  role: "lead" | "contributor" | "reviewer" | "viewer";
  replacementUserId?: string;
}) {
  try {
    const currentUser = await requireUser();

    if (!data.projectId || !data.userId) {
      return { success: false, error: "Project ID and User ID are required." };
    }

    const VALID_ROLES = ["lead", "contributor", "reviewer", "viewer"];
    if (!VALID_ROLES.includes(data.role)) {
      return { success: false, error: `Invalid project role: ${data.role}` };
    }

    // 100% synchronous execution of all authorization, state reads, lead invariants, and writes inside one transaction
    await db.transaction(async (tx) => {
      // 1. Look up project
      const [project] = await tx
        .select({ id: projects.id, workspaceId: projects.workspaceId })
        .from(projects)
        .where(eq(projects.id, data.projectId))
        .limit(1);
      if (!project) {
        throw new Error("Project not found.");
      }

      // 2. Caller authorization: must be workspace owner/admin or current project lead
      const [callerWs] = await tx
        .select({ role: workspaceMembers.role })
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, project.workspaceId), eq(workspaceMembers.userId, currentUser.id)))
        .limit(1);
      if (!callerWs) {
        throw new Error("You are not a member of this workspace.");
      }

      const isWsAdmin = callerWs.role === "owner" || callerWs.role === "admin";
      const [callerProj] = await tx
        .select({ role: projectMembers.role })
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, data.projectId), eq(projectMembers.userId, currentUser.id)))
        .limit(1);
      const isProjectLead = callerProj?.role === "lead";

      if (!isWsAdmin && !isProjectLead) {
        throw new Error("Permission denied. Only workspace owners, admins, or the current project lead can manage the project roster.");
      }

      // 3. Starting lead invariant check: project must start with exactly 1 lead
      const startingLeads = await tx
        .select({ id: projectMembers.id, userId: projectMembers.userId, name: projectMembers.name, role: projectMembers.role })
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, data.projectId), eq(projectMembers.role, "lead")));

      if (startingLeads.length !== 1) {
        throw new Error("Project invariant violation: project must start with exactly one lead.");
      }
      const currentLead = startingLeads[0];

      // 4. Target user validation: must belong to this workspace
      const [targetWs] = await tx
        .select({ id: workspaceMembers.id })
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, project.workspaceId), eq(workspaceMembers.userId, data.userId)))
        .limit(1);
      if (!targetWs) {
        throw new Error("User is not a member of this workspace.");
      }

      const [targetUser] = await tx
        .select({ id: users.id, name: users.name, avatar: users.avatar })
        .from(users)
        .where(eq(users.id, data.userId))
        .limit(1);
      if (!targetUser) {
        throw new Error("User not found.");
      }

      const [targetMember] = await tx
        .select({ id: projectMembers.id, role: projectMembers.role })
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, data.projectId), eq(projectMembers.userId, data.userId)))
        .limit(1);

      const initials =
        (targetUser.name.split(" ")[0]?.[0] ?? "") +
        (targetUser.name.split(" ")[1]?.[0] ?? targetUser.name[1] ?? "").toUpperCase();
      const color = targetUser.avatar || "bg-violet-500";

      // 5. Apply role changes
      if (data.role === "lead") {
        // Ordinary lead transfer / promotion
        if (data.userId !== currentLead.userId) {
          // Demote current lead to contributor
          await tx
            .update(projectMembers)
            .set({ role: "contributor" })
            .where(eq(projectMembers.id, currentLead.id));

          // Promote or insert target user as lead
          if (targetMember) {
            await tx
              .update(projectMembers)
              .set({ role: "lead" })
              .where(eq(projectMembers.id, targetMember.id));
          } else {
            const id = `pm-${data.projectId}-${data.userId}`;
            await tx.insert(projectMembers).values({
              id,
              projectId: data.projectId,
              userId: data.userId,
              name: targetUser.name,
              role: "lead",
              initials: initials || "TM",
              color,
            });
          }
        }
      } else {
        // Assigning a non-lead role
        if (data.userId === currentLead.userId) {
          // Demotion of the sole project lead!
          if (!data.replacementUserId) {
            throw new Error("Cannot demote the sole project lead without promoting a replacement lead in the same transaction.");
          }
          if (data.replacementUserId === data.userId) {
            throw new Error("Replacement lead must be a different user.");
          }

          const [repWs] = await tx
            .select({ id: workspaceMembers.id })
            .from(workspaceMembers)
            .where(and(eq(workspaceMembers.workspaceId, project.workspaceId), eq(workspaceMembers.userId, data.replacementUserId)))
            .limit(1);
          if (!repWs) {
            throw new Error("Replacement user is not a member of this workspace.");
          }

          const [repUser] = await tx
            .select({ id: users.id, name: users.name, avatar: users.avatar })
            .from(users)
            .where(eq(users.id, data.replacementUserId))
            .limit(1);
          if (!repUser) {
            throw new Error("Replacement user not found.");
          }

          const [repMember] = await tx
            .select({ id: projectMembers.id, role: projectMembers.role })
            .from(projectMembers)
            .where(and(eq(projectMembers.projectId, data.projectId), eq(projectMembers.userId, data.replacementUserId)))
            .limit(1);

          const repInitials =
            (repUser.name.split(" ")[0]?.[0] ?? "") +
            (repUser.name.split(" ")[1]?.[0] ?? repUser.name[1] ?? "").toUpperCase();
          const repColor = repUser.avatar || "bg-violet-500";

          // Promote replacement to lead
          if (repMember) {
            await tx
              .update(projectMembers)
              .set({ role: "lead" })
              .where(eq(projectMembers.id, repMember.id));
          } else {
            const repId = `pm-${data.projectId}-${data.replacementUserId}`;
            await tx.insert(projectMembers).values({
              id: repId,
              projectId: data.projectId,
              userId: data.replacementUserId,
              name: repUser.name,
              role: "lead",
              initials: repInitials || "TM",
              color: repColor,
            });
          }

          // Demote target (current lead) to requested non-lead role
          await tx
            .update(projectMembers)
            .set({ role: data.role })
            .where(eq(projectMembers.id, currentLead.id));
        } else {
          // Target is not current lead: update or insert non-lead role
          if (targetMember) {
            await tx
              .update(projectMembers)
              .set({ role: data.role })
              .where(eq(projectMembers.id, targetMember.id));
          } else {
            const id = `pm-${data.projectId}-${data.userId}`;
            await tx.insert(projectMembers).values({
              id,
              projectId: data.projectId,
              userId: data.userId,
              name: targetUser.name,
              role: data.role,
              initials: initials || "TM",
              color,
            });
          }
        }
      }

      // 6. Ending lead invariant check: project must end with exactly 1 lead
      const endingLeadsRes = await tx.execute(
        sql`SELECT COUNT(*) as cnt FROM project_members WHERE project_id = ${data.projectId} AND role = 'lead'`
      );
      const endingLeads = Number((endingLeadsRes[0] as unknown as { cnt: number | string }).cnt);

      if (endingLeads !== 1) {
        throw new Error("Project invariant violation: project must end with exactly one lead.");
      }

      // 7. Insert audit activity log
      await tx.insert(projectActivity).values({
        id: newId("pa"),
        projectId: data.projectId,
        content: `${targetUser.name} was assigned as ${data.role}.`,
        createdAt: new Date().toISOString(),
      });
    });

    safeRevalidatePath("/projects");
    safeRevalidatePath(`/projects/${data.projectId}`);
    return { success: true };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    if (isUniqueConstraintError(err)) {
      return { success: false, error: "User is already assigned to this project." };
    }
    return { success: false, error: err instanceof Error ? err.message : "Failed to assign project member." };
  }
}

export async function removeProjectMemberAction(projectId: string, memberId: string) {
  try {
    const currentUser = await requireUser();

    if (!projectId || !memberId) {
      return { success: false, error: "Project ID and Member ID are required." };
    }

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) {
      return { success: false, error: "Project not found." };
    }

    // Verify caller is a workspace member
    const { membership: callerWsMembership } = await requireWorkspaceMember(project.workspaceId);

    const isWsAdmin = callerWsMembership.role === "owner" || callerWsMembership.role === "admin";
    const [callerProjectRole] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, currentUser.id)))
      .limit(1);
    const isProjectLead = callerProjectRole?.role === "lead";

    if (!isWsAdmin && !isProjectLead) {
      return {
        success: false,
        error: "Permission denied. Only workspace owners, admins, or the current project lead can manage the project roster.",
      };
    }

    // Scoped member lookup: membership ID must belong to this specific project
    const [member] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.id, memberId)))
      .limit(1);

    if (!member) {
      return { success: false, error: "Project member not found in this project." };
    }

    // Sole-Lead Protection: cannot remove the project lead
    if (member.role === "lead") {
      return {
        success: false,
        error: "Cannot remove the project lead. Reassign the project lead before removing.",
      };
    }

    await db
      .delete(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.id, memberId)));

    safeRevalidatePath("/projects");
    safeRevalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: err instanceof Error ? err.message : "Failed to remove project member." };
  }
}

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
  try {
    const currentUser = await requireUser();
    const wsId = data.workspaceId ?? (await getActiveWorkspaceId());

    // Check workspace permission (viewers cannot create projects)
    await requireWorkspaceRole(wsId, ["owner", "admin", "member"]);

    const trimmedName = data.name?.trim();
    if (!trimmedName) {
      return { success: false, error: "Project name is required." };
    }

    const VALID_ROLES = ["lead", "contributor", "reviewer", "viewer"];

    // Owner / Lead user validation
    const leadUserId = data.ownerUserId || currentUser.id;
    const leadMembership = await getTargetWorkspaceMembership(wsId, leadUserId);
    if (!leadMembership) {
      return { success: false, error: "Project lead must be a member of this workspace." };
    }

    const [leadUser] = await db.select().from(users).where(eq(users.id, leadUserId)).limit(1);
    const leadName = leadUser?.name || data.owner?.trim() || currentUser.name;
    const leadColor = leadUser?.avatar || "bg-violet-500";
    const leadInitials =
      (leadName.split(" ")[0]?.[0] ?? "") +
      (leadName.split(" ")[1]?.[0] ?? leadName[1] ?? "").toUpperCase() || "PL";

    // Validate members roster
    const rosterToInsert: {
      userId: string | null;
      name: string;
      role: "lead" | "contributor" | "reviewer" | "viewer";
      initials: string;
      color: string;
    }[] = [];

    // Lead is always index 0
    rosterToInsert.push({
      userId: leadUserId,
      name: leadName,
      role: "lead",
      initials: leadInitials,
      color: leadColor,
    });

    const seenUserIds = new Set<string>([leadUserId]);

    if (data.members && data.members.length > 0) {
      for (const m of data.members) {
        if (!m.userId || !m.userId.trim()) {
          return {
            success: false,
            error: "Member roster entries must have a valid user ID.",
          };
        }

        const memberUserId = m.userId.trim();

        // Check if secondary lead is attempted
        if (m.role === "lead") {
          return {
            success: false,
            error: "Project can only have one lead. Additional members cannot be assigned the lead role during creation.",
          };
        }

        const memberRole = (m.role || "contributor") as "lead" | "contributor" | "reviewer" | "viewer";
        if (!VALID_ROLES.includes(memberRole)) {
          return { success: false, error: `Invalid project role: ${m.role}` };
        }

        // Check duplicate
        if (seenUserIds.has(memberUserId)) {
          return { success: false, error: `Duplicate member in roster: ${memberUserId}` };
        }

        // Verify user belongs to workspace
        const mWs = await getTargetWorkspaceMembership(wsId, memberUserId);
        if (!mWs) {
          return { success: false, error: `Member ${m.name || memberUserId} must belong to this workspace.` };
        }

        const [mUser] = await db.select().from(users).where(eq(users.id, memberUserId)).limit(1);
        if (!mUser) {
          return { success: false, error: `User ${memberUserId} not found.` };
        }

        seenUserIds.add(memberUserId);

        const memberName = mUser.name || m.name?.trim() || "Team Member";
        const memberInitials =
          (memberName.split(" ")[0]?.[0] ?? "") +
          (memberName.split(" ")[1]?.[0] ?? memberName[1] ?? "").toUpperCase();
        const memberColor = mUser.avatar || "bg-cyan-500";

        rosterToInsert.push({
          userId: memberUserId,
          name: memberName,
          role: memberRole,
          initials: memberInitials || "TM",
          color: memberColor,
        });
      }
    }

    const projectId = newId("project");
    const now = new Date().toISOString();

    // Atomic execution of project creation + roster insertion + initial activity in single transaction
    await db.transaction(async (tx) => {
      await tx.insert(projects).values({
        id: projectId,
        workspaceId: wsId,
        name: trimmedName,
        owner: leadName,
        ownerUserId: leadUserId,
        status: data.status || "Planning",
        due: data.due || "Next week",
        progress: data.progress ?? 0,
        overview: data.overview?.trim() || "Add project context, timeline, and key milestones.",
        createdAt: now,
      });

      for (let i = 0; i < rosterToInsert.length; i++) {
        const item = rosterToInsert[i];
        await tx.insert(projectMembers).values({
          id: `pm-${projectId}-${i}`,
          projectId,
          userId: item.userId,
          name: item.name,
          role: item.role,
          initials: item.initials,
          color: item.color,
        });
      }

      await tx.insert(projectActivity).values({
        id: newId("pa"),
        projectId,
        content: `${currentUser.name} created project '${trimmedName}'.`,
        createdAt: now,
      });
    });

    safeRevalidatePath("/projects");
    safeRevalidatePath("/");
    return { success: true, id: projectId };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    if (isUniqueConstraintError(err)) {
      return { success: false, error: "A project member or project with this identity already exists." };
    }
    return { success: false, error: err instanceof Error ? err.message : "Failed to create project." };
  }
}

export async function updateProjectAction(
  id: string,
  data: {
    name?: string;
    owner?: string;
    ownerUserId?: string;
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

  let resolvedOwner: string | undefined;
  let resolvedOwnerUserId: string | null | undefined;

  if (data.ownerUserId !== undefined) {
    const [target] = await db
      .select({ id: users.id, name: users.name })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(and(eq(workspaceMembers.workspaceId, project.workspaceId), eq(users.id, data.ownerUserId)))
      .limit(1);

    if (!target) {
      return { success: false, error: "Project owner must be an active member of this workspace." };
    }
    resolvedOwner = target.name;
    resolvedOwnerUserId = target.id;
  } else if (data.owner !== undefined) {
    const rawOwner = data.owner.trim();
    const matches = await db
      .select({ id: users.id, name: users.name })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(and(eq(workspaceMembers.workspaceId, project.workspaceId), eq(users.name, rawOwner)));

    if (matches.length === 0) {
      return { success: false, error: "Project owner must be an active member of this workspace." };
    }
    if (matches.length > 1) {
      return { success: false, error: "Multiple workspace members match this name. Ambiguous owner change rejected." };
    }
    resolvedOwner = matches[0].name;
    resolvedOwnerUserId = matches[0].id;
  }

  const updateData: Record<string, unknown> = {
    ...(data.name ? { name: data.name.trim() } : {}),
    ...(resolvedOwner !== undefined ? { owner: resolvedOwner, ownerUserId: resolvedOwnerUserId } : {}),
    ...(data.status ? { status: data.status } : {}),
    ...(data.due ? { due: data.due } : {}),
    ...(data.progress !== undefined ? { progress: Math.min(100, Math.max(0, data.progress)) } : {}),
    ...(data.overview !== undefined ? { overview: data.overview.trim() } : {}),
  };

  if (Object.keys(updateData).length > 0) {
    await db.update(projects).set(updateData).where(eq(projects.id, id));
  }

  if (data.status && data.status !== project.status) {
    await db.insert(projectActivity).values({
      id: newId("pa"),
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

  if (!wsMembership) {
    return { success: false, error: "Only workspace owners, admins, or the project lead can delete this project." };
  }

  const isWsAdmin = wsMembership.role === "owner" || wsMembership.role === "admin";
  const [leadMember] = await db
    .select({ id: projectMembers.id })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, currentUser.id), eq(projectMembers.role, "lead")))
    .limit(1);
  const isLeadMember = Boolean(leadMember);
  const isProjectOwner = project.ownerUserId ? project.ownerUserId === currentUser.id : false;

  if (!isWsAdmin && !isLeadMember && !isProjectOwner) {
    return { success: false, error: "Only workspace owners, admins, or the project lead can delete this project." };
  }

  await db.transaction(async (tx) => {
    await tx.delete(projectMembers).where(eq(projectMembers.projectId, id));
    await tx.delete(projectActivity).where(eq(projectActivity.projectId, id));
    await tx
      .update(tasks)
      .set({ projectId: null, projectName: "General" })
      .where(eq(tasks.projectId, id));
    await tx.delete(projects).where(eq(projects.id, id));
  });

  safeRevalidatePath("/projects");
  safeRevalidatePath("/");
  return { success: true };
}

// --- Messages Actions ---
export async function sendMessageAction(conversationId: string, _sender: string, content: string) {
  try {
    const currentUser = await requireUser();

    if (!conversationId || typeof conversationId !== "string") {
      return { success: false, error: "A valid conversation ID is required." };
    }

    if (!content || !content.trim()) {
      return { success: false, error: "Message content cannot be empty." };
    }

    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conv) {
      return { success: false, error: "Conversation not found." };
    }

    const classification = classifyConversation(conv);
    if (classification === "invalid") {
      return { success: false, error: "Invalid conversation type." };
    }

    // Viewers cannot send messages
    await requireWorkspaceRole(conv.workspaceId, ["owner", "admin", "member"]);

    // If DM, enforce shared canonical DM validation fail-closed
    if (classification === "direct") {
      const dmCheck = await validateDirectConversation(conv, currentUser.id);
      if (!dmCheck.valid) {
        return { success: false, error: "Access denied. You are not an authorized participant in this conversation." };
      }
    }

    // Sender identity is strictly bound to authenticated currentUser.name (never trust _sender)
    const effectiveSender = currentUser.name;
    const msgId = newId("m");
    const timestamp = new Date().toISOString();

    await db.insert(messages).values({
      id: msgId,
      conversationId,
      sender: effectiveSender,
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

    // Broadcast real-time message event to connected workspace clients
    let pIds: string[] | undefined = undefined;
    if (conv.type === "direct") {
      try {
        const parsed = JSON.parse(conv.participantIds || "[]");
        if (Array.isArray(parsed)) pIds = parsed;
      } catch {}
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

    safeRevalidatePath("/messages");
    return { success: true, id: msgId, sender: effectiveSender, timestamp };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: err instanceof Error ? err.message : "Failed to send message." };
  }
}

export async function getLiveConversationsAction(workspaceId?: string) {
  try {
    const currentUser = await requireUser();
    const wsId = workspaceId ?? (await getActiveWorkspaceId());
    if (!wsId) return { success: false, error: "No active workspace." };

    await requireWorkspaceMember(wsId);

    const convs = await getConversations(wsId, currentUser.id);
    return { success: true, conversations: convs };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: err instanceof Error ? err.message : "Failed to load conversations." };
  }
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
  try {
    const currentUser = await requireUser();
    const wsId = data.workspaceId ?? (await getActiveWorkspaceId());
    if (!wsId) return { success: false, error: "No active workspace." };

    // Viewers cannot create conversations (channels or DMs)
    await requireWorkspaceRole(wsId, ["owner", "admin", "member"]);

    const convType = data.type || (data.recipientId ? "direct" : "channel");
    if (convType !== "channel" && convType !== "direct") {
      return { success: false, error: "Invalid conversation type." };
    }

    const trimmedName = data.name?.trim() || "";

    if (convType === "channel") {
      if (data.recipientId) {
        return { success: false, error: "Channel conversations cannot specify a recipient." };
      }
      if (!trimmedName) {
        return { success: false, error: "Channel name is required." };
      }

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

      const id = newId("conv");
      const now = new Date().toISOString();
      const initials = (trimmedName.split(" ")[0]?.[0] ?? "").toUpperCase() || "#";

      await db.insert(conversations).values({
        id,
        workspaceId: wsId,
        type: "channel",
        participantIds: "[]",
        name: trimmedName,
        initials,
        color: data.color || "bg-violet-500",
        role: data.role?.trim() || "Team Channel",
        online: false,
        lastMessage: data.initialMessage?.trim() || "",
        lastTimestamp: now,
        unread: 0,
      });

      if (data.initialMessage?.trim()) {
        await sendMessageAction(id, currentUser.name, data.initialMessage.trim());
      }

      safeRevalidatePath("/messages");
      return { success: true, id, isExisting: false };
    }

    // Direct Conversation
    if (!data.recipientId || typeof data.recipientId !== "string" || !data.recipientId.trim()) {
      return { success: false, error: "Direct conversations require a recipient." };
    }

    if (data.recipientId === currentUser.id) {
      return { success: false, error: "Cannot start a direct conversation with yourself." };
    }

    // Recipient must be an active member of this workspace
    const recipientMember = await getTargetWorkspaceMembership(wsId, data.recipientId);
    if (!recipientMember) {
      return { success: false, error: "Recipient is not a member of this workspace." };
    }

    const [recipientUser] = await db.select().from(users).where(eq(users.id, data.recipientId)).limit(1);
    if (!recipientUser) {
      return { success: false, error: "Recipient not found." };
    }

    // Canonical sorted participant array
    const canonicalParticipants = [currentUser.id, data.recipientId].sort();
    const participantsJson = JSON.stringify(canonicalParticipants);

    // Look for existing direct conversation between these exact two participants in wsId
    // Filter candidates through shared classifier and canonical validator
    const wsConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.workspaceId, wsId));

    let existingDm: typeof wsConversations[number] | undefined;
    for (const c of wsConversations) {
      const classification = classifyConversation(c);
      if (classification !== "direct") continue;

      const dmCheck = await validateDirectConversation(c, currentUser.id);
      if (!dmCheck.valid || !dmCheck.participantIds) continue;

      if (
        dmCheck.participantIds.length === 2 &&
        dmCheck.participantIds.includes(currentUser.id) &&
        dmCheck.participantIds.includes(data.recipientId!)
      ) {
        existingDm = c;
        break;
      }
    }

    if (existingDm) {
      if (data.initialMessage?.trim()) {
        await sendMessageAction(existingDm.id, currentUser.name, data.initialMessage.trim());
      }
      return { success: true, id: existingDm.id, isExisting: true };
    }

    const id = newId("conv");
    const now = new Date().toISOString();
    const displayName = recipientUser.name;
    const initials =
      (displayName.split(" ")[0]?.[0] ?? "") +
      (displayName.split(" ")[1]?.[0] ?? displayName[1] ?? "").toUpperCase();

    await db.insert(conversations).values({
      id,
      workspaceId: wsId,
      type: "direct",
      participantIds: participantsJson,
      name: displayName,
      initials: initials || "DM",
      color: recipientUser.avatar || "bg-cyan-500",
      role: recipientMember.role || "Direct Message",
      online: false,
      lastMessage: data.initialMessage?.trim() || "",
      lastTimestamp: now,
      unread: 0,
    });

    if (data.initialMessage?.trim()) {
      await sendMessageAction(id, currentUser.name, data.initialMessage.trim());
    }

    safeRevalidatePath("/messages");
    return { success: true, id, isExisting: false };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: err instanceof Error ? err.message : "Failed to create conversation." };
  }
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
    safeRevalidatePath("/preferences");
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
    safeRevalidatePath("/preferences");
    safeRevalidatePath("/start");
    safeRevalidatePath("/projects");
    safeRevalidatePath("/tasks");
    safeRevalidatePath("/messages");
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

    const isValid = await verifyPassword(data.currentPassword, dbUser.passwordHash);
    if (!isValid) {
      return { success: false, error: "Current password is incorrect." };
    }

    const newHash = await hashPassword(data.newPassword);
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));

    // Multi-session revocation: keep current active session alive while revoking all other sessions
    let currentSessionId: string | undefined;
    try {
      const cookieStore = await cookies();
      currentSessionId = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    } catch {}

    await revokeAllUserSessions(user.id, currentSessionId);

    return { success: true };
  } catch (error) {
    console.error("Failed to change password:", error);
    return { success: false, error: "Failed to change password." };
  }
}

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


