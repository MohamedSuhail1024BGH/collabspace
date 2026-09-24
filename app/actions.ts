"use server";

import { and, eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
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
import { sqlite } from "@/lib/db";
import { classifyConversation, validateDirectConversation } from "@/lib/auth/dm-validator";

function isUniqueConstraintError(err: unknown): boolean {
  if (err && typeof err === "object") {
    const e = err as { code?: string; message?: string };
    if (e.code === "SQLITE_CONSTRAINT_UNIQUE" || e.code === "SQLITE_CONSTRAINT") return true;
    if (e.message && e.message.includes("UNIQUE constraint failed")) return true;
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

    const userId = `usr-${Date.now()}`;
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
    const rateCheck = checkLoginRateLimit(email, clientIp);
    if (!rateCheck.allowed) {
      return { success: false, error: "Invalid email or password." };
    }

    // 3. User lookup
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      // Constant-time dummy verification + record failed attempt
      await dummyVerify(password);
      try {
        recordFailedLogin(email, clientIp);
      } catch (recordErr) {
        console.error("[Auth] Storage error recording failed attempt:", recordErr);
      }
      return { success: false, error: "Invalid email or password." };
    }

    // 4. Dual-format password verification (async scrypt)
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      try {
        recordFailedLogin(email, clientIp);
      } catch (recordErr) {
        console.error("[Auth] Storage error recording failed attempt:", recordErr);
      }
      return { success: false, error: "Invalid email or password." };
    }

    // 5. Successful authentication: reset both account and IP rate limit counters
    try {
      resetLoginRateLimit(email, clientIp);
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
    const ownedWorkspaces = sqlite
      .prepare(`
        SELECT w.id, w.name, (
          SELECT COUNT(*) FROM workspace_members wm2 WHERE wm2.workspace_id = w.id
        ) as member_count
        FROM workspaces w
        JOIN workspace_members wm ON w.id = wm.workspace_id
        WHERE wm.user_id = ? AND wm.role = 'owner'
      `)
      .all(userId) as { id: string; name: string; member_count: number }[];

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
        const targetMember = sqlite
          .prepare("SELECT id, role FROM workspace_members WHERE workspace_id = ? AND user_id = ?")
          .get(w.id, replacementUserId) as { id: string; role: string } | undefined;

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
    sqlite.transaction(() => {
      // Process multi-member workspaces
      for (const w of multiMemberWorkspaces) {
        const repUserId = options!.replacementOwners![w.id];

        // Verify starting single-owner cardinality
        const startingOwners = sqlite
          .prepare("SELECT id, user_id FROM workspace_members WHERE workspace_id = ? AND role = 'owner'")
          .all(w.id) as { id: string; user_id: string }[];

        if (startingOwners.length !== 1 || startingOwners[0].user_id !== userId) {
          throw new Error(`Workspace invariant violation: workspace '${w.id}' must start with exactly one owner.`);
        }

        // Promote replacement
        sqlite
          .prepare("UPDATE workspace_members SET role = 'owner' WHERE workspace_id = ? AND user_id = ?")
          .run(w.id, repUserId);

        // Explicitly delete caller's membership
        sqlite
          .prepare("DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?")
          .run(w.id, userId);

        // Verify ending single-owner cardinality
        const endOwners = sqlite
          .prepare("SELECT COUNT(*) as cnt FROM workspace_members WHERE workspace_id = ? AND role = 'owner'")
          .get(w.id) as { cnt: number };

        if (endOwners.cnt !== 1) {
          throw new Error(`Workspace invariant violation: workspace '${w.id}' must end with exactly one owner.`);
        }
      }

      // Delete sole-member workspaces
      for (const w of soleMemberWorkspaces) {
        sqlite.prepare("DELETE FROM workspaces WHERE id = ?").run(w.id);
      }

      // Delete user sessions & user record
      sqlite.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
      sqlite.prepare("DELETE FROM users WHERE id = ?").run(userId);

      // Verify no remaining memberships for caller
      const lingeringMemberships = sqlite
        .prepare("SELECT COUNT(*) as cnt FROM workspace_members WHERE user_id = ?")
        .get(userId) as { cnt: number };

      if (lingeringMemberships.cnt !== 0) {
        throw new Error("Account deletion failed: lingering memberships detected.");
      }
    })();

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

  const wsId = `ws-${Date.now()}`;
  const baseSlug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workspace";
  let slug = baseSlug;
  const existingWs = await db.select().from(workspaces).where(eq(workspaces.slug, slug)).limit(1);
  if (existingWs.length > 0) {
    slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;
  }
  const now = new Date().toISOString();

  sqlite.transaction(() => {
    sqlite.prepare(`
      INSERT INTO workspaces (id, name, slug, description, is_public, plan, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      wsId,
      data.name.trim() || "Untitled Workspace",
      slug,
      data.description?.trim() ?? "",
      data.isPublic ?? true ? 1 : 0,
      data.plan ?? "Pro",
      now
    );

    // Assign user as workspace owner
    sqlite.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at)
      VALUES (?, ?, ?, 'owner', ?)
    `).run(
      `wm-${wsId}-owner`,
      wsId,
      user.id,
      now
    );

    const ownerCount = (
      sqlite
        .prepare("SELECT COUNT(*) as cnt FROM workspace_members WHERE workspace_id = ? AND role = 'owner'")
        .get(wsId) as { cnt: number }
    ).cnt;
    if (ownerCount !== 1) {
      throw new Error("Failed to initialize workspace owner.");
    }
  })();

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
    });
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

    sqlite.transaction(() => {
      const startingOwners = sqlite
        .prepare("SELECT id, user_id FROM workspace_members WHERE workspace_id = ? AND role = 'owner'")
        .all(workspaceId) as { id: string; user_id: string }[];

      if (startingOwners.length !== 1) {
        throw new Error("Workspace invariant violation: workspace must have exactly one owner.");
      }
      if (startingOwners[0].user_id !== currentUser.id) {
        throw new Error("Only the workspace owner can delete this workspace.");
      }

      // Delete workspace (cascades to related tables via foreign keys)
      sqlite.prepare("DELETE FROM workspaces WHERE id = ?").run(workspaceId);
    })();

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

    sqlite.transaction(() => {
      const membership = sqlite
        .prepare("SELECT id, role FROM workspace_members WHERE workspace_id = ? AND user_id = ?")
        .get(workspaceId, currentUser.id) as { id: string; role: string } | undefined;

      if (!membership) {
        throw new Error("You are not a member of this workspace.");
      }

      if (membership.role === "owner") {
        const memberCount = (
          sqlite
            .prepare("SELECT COUNT(*) as cnt FROM workspace_members WHERE workspace_id = ?")
            .get(workspaceId) as { cnt: number }
        ).cnt;

        if (memberCount > 1) {
          throw new Error("Workspace owners cannot leave while other members exist. Transfer ownership or delete workspace.");
        }

        sqlite.prepare("DELETE FROM workspaces WHERE id = ?").run(workspaceId);
      } else {
        sqlite
          .prepare("DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?")
          .run(workspaceId, currentUser.id);

        const endOwners = (
          sqlite
            .prepare("SELECT COUNT(*) as cnt FROM workspace_members WHERE workspace_id = ? AND role = 'owner'")
            .get(workspaceId) as { cnt: number }
        ).cnt;

        if (endOwners !== 1) {
          throw new Error("Workspace invariant violation: workspace must have exactly one owner.");
        }
      }
    })();

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

    sqlite.transaction(() => {
      const ws = sqlite.prepare("SELECT id FROM workspaces WHERE id = ?").get(workspaceId);
      if (!ws) {
        throw new Error("Workspace not found.");
      }

      // Starting cardinality check: must start with exactly 1 owner, and caller must be that owner
      const startingOwners = sqlite
        .prepare("SELECT id, user_id FROM workspace_members WHERE workspace_id = ? AND role = 'owner'")
        .all(workspaceId) as { id: string; user_id: string }[];

      if (startingOwners.length !== 1) {
        throw new Error("Workspace invariant violation: workspace must start with exactly one owner.");
      }
      if (startingOwners[0].user_id !== currentUser.id) {
        throw new Error("Only the current workspace owner can transfer ownership.");
      }

      if (currentUser.id === newOwnerUserId) {
        throw new Error("You are already the owner of this workspace.");
      }

      // Verify target user is a member of this workspace
      const targetMembership = sqlite
        .prepare("SELECT id, role FROM workspace_members WHERE workspace_id = ? AND user_id = ?")
        .get(workspaceId, newOwnerUserId) as { id: string; role: string } | undefined;

      if (!targetMembership) {
        throw new Error("Target user is not a member of this workspace.");
      }

      // Demote caller to admin
      sqlite
        .prepare("UPDATE workspace_members SET role = 'admin' WHERE id = ?")
        .run(startingOwners[0].id);

      // Promote target to owner
      sqlite
        .prepare("UPDATE workspace_members SET role = 'owner' WHERE id = ?")
        .run(targetMembership.id);

      // Ending cardinality check: must end with exactly 1 owner
      const endOwners = (
        sqlite
          .prepare("SELECT COUNT(*) as cnt FROM workspace_members WHERE workspace_id = ? AND role = 'owner'")
          .get(workspaceId) as { cnt: number }
      ).cnt;

      if (endOwners !== 1) {
        throw new Error("Workspace invariant violation: workspace must end with exactly one owner.");
      }
    })();

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
    sqlite.transaction(() => {
      // 1. Look up project
      const project = sqlite
        .prepare("SELECT id, workspace_id as workspaceId FROM projects WHERE id = ?")
        .get(data.projectId) as { id: string; workspaceId: string } | undefined;
      if (!project) {
        throw new Error("Project not found.");
      }

      // 2. Caller authorization: must be workspace owner/admin or current project lead
      const callerWs = sqlite
        .prepare("SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?")
        .get(project.workspaceId, currentUser.id) as { role: string } | undefined;
      if (!callerWs) {
        throw new Error("You are not a member of this workspace.");
      }

      const isWsAdmin = callerWs.role === "owner" || callerWs.role === "admin";
      const callerProj = sqlite
        .prepare("SELECT role FROM project_members WHERE project_id = ? AND user_id = ?")
        .get(data.projectId, currentUser.id) as { role: string } | undefined;
      const isProjectLead = callerProj?.role === "lead";

      if (!isWsAdmin && !isProjectLead) {
        throw new Error("Permission denied. Only workspace owners, admins, or the current project lead can manage the project roster.");
      }

      // 3. Starting lead invariant check: project must start with exactly 1 lead
      const startingLeads = sqlite
        .prepare("SELECT id, user_id, name, role FROM project_members WHERE project_id = ? AND role = 'lead'")
        .all(data.projectId) as { id: string; user_id: string; name: string; role: string }[];

      if (startingLeads.length !== 1) {
        throw new Error("Project invariant violation: project must start with exactly one lead.");
      }
      const currentLead = startingLeads[0];

      // 4. Target user validation: must belong to this workspace
      const targetWs = sqlite
        .prepare("SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?")
        .get(project.workspaceId, data.userId) as { id: string } | undefined;
      if (!targetWs) {
        throw new Error("User is not a member of this workspace.");
      }

      const targetUser = sqlite
        .prepare("SELECT id, name, avatar FROM users WHERE id = ?")
        .get(data.userId) as { id: string; name: string; avatar: string | null } | undefined;
      if (!targetUser) {
        throw new Error("User not found.");
      }

      const targetMember = sqlite
        .prepare("SELECT id, role FROM project_members WHERE project_id = ? AND user_id = ?")
        .get(data.projectId, data.userId) as { id: string; role: string } | undefined;

      const initials =
        (targetUser.name.split(" ")[0]?.[0] ?? "") +
        (targetUser.name.split(" ")[1]?.[0] ?? targetUser.name[1] ?? "").toUpperCase();
      const color = targetUser.avatar || "bg-violet-500";

      // 5. Apply role changes
      if (data.role === "lead") {
        // Ordinary lead transfer / promotion
        if (data.userId !== currentLead.user_id) {
          // Demote current lead to contributor
          sqlite
            .prepare("UPDATE project_members SET role = 'contributor' WHERE id = ?")
            .run(currentLead.id);

          // Promote or insert target user as lead
          if (targetMember) {
            sqlite
              .prepare("UPDATE project_members SET role = 'lead' WHERE id = ?")
              .run(targetMember.id);
          } else {
            const id = `pm-${data.projectId}-${data.userId}`;
            sqlite
              .prepare("INSERT INTO project_members (id, project_id, user_id, name, role, initials, color) VALUES (?, ?, ?, ?, 'lead', ?, ?)")
              .run(id, data.projectId, data.userId, targetUser.name, initials || "TM", color);
          }
        }
      } else {
        // Assigning a non-lead role
        if (data.userId === currentLead.user_id) {
          // Demotion of the sole project lead!
          if (!data.replacementUserId) {
            throw new Error("Cannot demote the sole project lead without promoting a replacement lead in the same transaction.");
          }
          if (data.replacementUserId === data.userId) {
            throw new Error("Replacement lead must be a different user.");
          }

          const repWs = sqlite
            .prepare("SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?")
            .get(project.workspaceId, data.replacementUserId) as { id: string } | undefined;
          if (!repWs) {
            throw new Error("Replacement user is not a member of this workspace.");
          }

          const repUser = sqlite
            .prepare("SELECT id, name, avatar FROM users WHERE id = ?")
            .get(data.replacementUserId) as { id: string; name: string; avatar: string | null } | undefined;
          if (!repUser) {
            throw new Error("Replacement user not found.");
          }

          const repMember = sqlite
            .prepare("SELECT id, role FROM project_members WHERE project_id = ? AND user_id = ?")
            .get(data.projectId, data.replacementUserId) as { id: string; role: string } | undefined;

          const repInitials =
            (repUser.name.split(" ")[0]?.[0] ?? "") +
            (repUser.name.split(" ")[1]?.[0] ?? repUser.name[1] ?? "").toUpperCase();
          const repColor = repUser.avatar || "bg-violet-500";

          // Promote replacement to lead
          if (repMember) {
            sqlite
              .prepare("UPDATE project_members SET role = 'lead' WHERE id = ?")
              .run(repMember.id);
          } else {
            const repId = `pm-${data.projectId}-${data.replacementUserId}`;
            sqlite
              .prepare("INSERT INTO project_members (id, project_id, user_id, name, role, initials, color) VALUES (?, ?, ?, ?, 'lead', ?, ?)")
              .run(repId, data.projectId, data.replacementUserId, repUser.name, repInitials || "TM", repColor);
          }

          // Demote target (current lead) to requested non-lead role
          sqlite
            .prepare("UPDATE project_members SET role = ? WHERE id = ?")
            .run(data.role, currentLead.id);
        } else {
          // Target is not current lead: update or insert non-lead role
          if (targetMember) {
            sqlite
              .prepare("UPDATE project_members SET role = ? WHERE id = ?")
              .run(data.role, targetMember.id);
          } else {
            const id = `pm-${data.projectId}-${data.userId}`;
            sqlite
              .prepare("INSERT INTO project_members (id, project_id, user_id, name, role, initials, color) VALUES (?, ?, ?, ?, ?, ?, ?)")
              .run(id, data.projectId, data.userId, targetUser.name, data.role, initials || "TM", color);
          }
        }
      }

      // 6. Ending lead invariant check: project must end with exactly 1 lead
      const endingLeads = sqlite
        .prepare("SELECT COUNT(*) as cnt FROM project_members WHERE project_id = ? AND role = 'lead'")
        .get(data.projectId) as { cnt: number };

      if (endingLeads.cnt !== 1) {
        throw new Error("Project invariant violation: project must end with exactly one lead.");
      }

      // 7. Insert audit activity log
      sqlite
        .prepare("INSERT INTO project_activity (id, project_id, content, created_at) VALUES (?, ?, ?, ?)")
        .run(
          `pa-${Date.now()}`,
          data.projectId,
          `${targetUser.name} was assigned as ${data.role}.`,
          new Date().toISOString()
        );
    })();

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

export async function searchWorkspacesAction(query: string) {
  return searchWorkspaces(query);
}

// --- Tasks Actions ---
function resolveTaskAssignee(
  workspaceId: string,
  assigneeName?: string,
  assigneeUserId?: string
): { success: true; assignee: string; assigneeUserId: string | null } | { success: false; error: string } {
  if (assigneeUserId !== undefined) {
    const trimmedId = assigneeUserId.trim();
    if (!trimmedId) {
      return { success: false, error: "Assignee must be an active member of this workspace." };
    }
    // Validate membership
    const member = sqlite
      .prepare(`
        SELECT u.id, u.name FROM workspace_members wm
        JOIN users u ON wm.user_id = u.id
        WHERE wm.workspace_id = ? AND wm.user_id = ?
      `)
      .get(workspaceId, trimmedId) as { id: string; name: string } | undefined;

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
  const matches = sqlite
    .prepare(`
      SELECT u.id, u.name FROM workspace_members wm
      JOIN users u ON wm.user_id = u.id
      WHERE wm.workspace_id = ? AND u.name = ?
    `)
    .all(workspaceId, rawName) as { id: string; name: string }[];

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

  const resolved = resolveTaskAssignee(wsId, data.assignee, data.assigneeUserId);
  if (!resolved.success) {
    return { success: false, error: resolved.error };
  }

  const id = `task-${Date.now()}`;
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
    const res = resolveTaskAssignee(task.workspaceId, undefined, data.assigneeUserId);
    if (!res.success) {
      return { success: false, error: res.error };
    }
    resolvedAssignee = { assignee: res.assignee, assigneeUserId: res.assigneeUserId };
  } else if (hasAssigneeName) {
    const isNameChanged = data.assignee!.trim() !== task.assignee;
    if (isNameChanged) {
      const res = resolveTaskAssignee(task.workspaceId, data.assignee, undefined);
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

  sqlite.transaction(() => {
    sqlite.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  })();

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

    const projectId = `project-${Date.now()}`;
    const now = new Date().toISOString();

    // Atomic execution of project creation + roster insertion + initial activity in single transaction
    sqlite.transaction(() => {
      sqlite.prepare(`
        INSERT INTO projects (id, workspace_id, name, owner, owner_user_id, status, due, progress, overview, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        projectId,
        wsId,
        trimmedName,
        leadName,
        leadUserId,
        data.status || "Planning",
        data.due || "Next week",
        data.progress ?? 0,
        data.overview?.trim() || "Add project context, timeline, and key milestones.",
        now
      );

      const insertMemberStmt = sqlite.prepare(`
        INSERT INTO project_members (id, project_id, user_id, name, role, initials, color)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < rosterToInsert.length; i++) {
        const item = rosterToInsert[i];
        insertMemberStmt.run(
          `pm-${projectId}-${i}`,
          projectId,
          item.userId,
          item.name,
          item.role,
          item.initials,
          item.color
        );
      }

      sqlite.prepare(`
        INSERT INTO project_activity (id, project_id, content, created_at)
        VALUES (?, ?, ?, ?)
      `).run(
        `pa-${projectId}-0`,
        projectId,
        `${currentUser.name} created project '${trimmedName}'.`,
        now
      );
    })();

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
    const target = sqlite
      .prepare(`
        SELECT u.id, u.name FROM workspace_members wm
        JOIN users u ON wm.user_id = u.id
        WHERE wm.workspace_id = ? AND u.id = ?
      `)
      .get(project.workspaceId, data.ownerUserId) as { id: string; name: string } | undefined;

    if (!target) {
      return { success: false, error: "Project owner must be an active member of this workspace." };
    }
    resolvedOwner = target.name;
    resolvedOwnerUserId = target.id;
  } else if (data.owner !== undefined) {
    const rawOwner = data.owner.trim();
    const matches = sqlite
      .prepare(`
        SELECT u.id, u.name FROM workspace_members wm
        JOIN users u ON wm.user_id = u.id
        WHERE wm.workspace_id = ? AND u.name = ?
      `)
      .all(project.workspaceId, rawOwner) as { id: string; name: string }[];

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

  if (!wsMembership) {
    return { success: false, error: "Only workspace owners, admins, or the project lead can delete this project." };
  }

  const isWsAdmin = wsMembership.role === "owner" || wsMembership.role === "admin";
  const leadMember = sqlite
    .prepare("SELECT id FROM project_members WHERE project_id = ? AND user_id = ? AND role = 'lead'")
    .get(id, currentUser.id);
  const isLeadMember = Boolean(leadMember);
  const isProjectOwner = project.ownerUserId ? project.ownerUserId === currentUser.id : false;

  if (!isWsAdmin && !isLeadMember && !isProjectOwner) {
    return { success: false, error: "Only workspace owners, admins, or the project lead can delete this project." };
  }

  sqlite.transaction(() => {
    sqlite.prepare("DELETE FROM project_members WHERE project_id = ?").run(id);
    sqlite.prepare("DELETE FROM project_activity WHERE project_id = ?").run(id);
    sqlite.prepare("UPDATE tasks SET project_id = NULL, project_name = 'General' WHERE project_id = ?").run(id);
    sqlite.prepare("DELETE FROM projects WHERE id = ?").run(id);
  })();

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
    const msgId = `m-${Date.now()}`;
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

      const id = `conv-${Date.now()}`;
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

    const id = `conv-${Date.now()}`;
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
      online: true,
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

