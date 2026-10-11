"use server";

import { safeRevalidatePath } from "./actions-shared";
import { switchWorkspaceAction } from "./actions-workspaces";

import { and, eq, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { users, sessions, workspaces, workspaceMembers } from "@/lib/db/schema";
import { hashPassword, verifyPassword, needsRehash, dummyVerify, createSession, destroySession, revokeAllUserSessions, AUTH_COOKIE_NAME, getCurrentUser, getUserWorkspaces } from "@/lib/db/auth";
import {
  checkLoginRateLimit,
  recordFailedLogin,
  resetLoginRateLimit,
  extractClientIp,
} from "@/lib/auth/rate-limiter";
import { newId } from "@/lib/id";

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
