import crypto from "crypto";
import { cookies } from "next/headers";
import { AsyncLocalStorage } from "async_hooks";
import { eq, and, gt, ne, lte } from "drizzle-orm";
import { db, sqlite } from "./index";
import {
  users,
  sessions,
  workspaces,
  workspaceMembers,
  type DbUser,
  type DbWorkspace,
} from "./schema";
import { ACTIVE_WORKSPACE_COOKIE } from "./workspace";
export {
  hashPassword,
  hashPasswordSync,
  verifyPassword,
  verifyPasswordSync,
  needsRehash,
  dummyVerify,
} from "@/lib/auth/password";

export const AUTH_COOKIE_NAME = "collabspace_session";

export const testAuthStorage =
  process.env.NODE_ENV !== "production"
    ? new AsyncLocalStorage<{ userId: string }>()
    : null;

/**
 * Creates a fresh session for the user with session fixation resistance.
 * Inactivates/destroys any prior active session for this client cookie,
 * generates 256 bits of cryptographic entropy, and sets hardened cookie flags.
 */
export async function createSession(userId: string): Promise<string> {
  // 1. Session Fixation Rotation: Invalidate any existing session from caller cookie first
  try {
    const cookieStore = await cookies();
    const existingToken = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (existingToken) {
      await db.delete(sessions).where(eq(sessions.id, existingToken));
    }
  } catch {
    // Non-request context
  }

  // 2. Generate 256 bits of cryptographic entropy (base64url-safe)
  const token = `sess_${crypto.randomBytes(32).toString("base64url")}`;
  const now = new Date();
  const maxAgeSeconds = 30 * 24 * 60 * 60; // 30 days
  const expiresAtDate = new Date(now.getTime() + maxAgeSeconds * 1000);
  const expiresAtIso = expiresAtDate.toISOString();

  await db.insert(sessions).values({
    id: token,
    userId,
    expiresAt: expiresAtIso,
    createdAt: now.toISOString(),
  });

  // 3. Set hardened cookie attributes with explicit expires Date
  try {
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: maxAgeSeconds,
      expires: expiresAtDate,
    });
  } catch {
    // Non-request context
  }

  // 4. Opportunistic expired session cleanup (non-blocking)
  cleanupExpiredSessions().catch(() => {});

  return token;
}

export async function getCurrentUser(): Promise<Omit<DbUser, "passwordHash"> | null> {
  if (process.env.NODE_ENV !== "production" && testAuthStorage) {
    const testStore = testAuthStorage.getStore();
    if (testStore?.userId) {
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          username: users.username,
          bio: users.bio,
          name: users.name,
          avatar: users.avatar,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, testStore.userId))
        .limit(1);
      return user || null;
    }
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;

    const nowIso = new Date().toISOString();
    const sessionRows = await db
      .select({
        user: users,
        session: sessions,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.id, token), gt(sessions.expiresAt, nowIso)))
      .limit(1);

    if (!sessionRows || sessionRows.length === 0) {
      return null;
    }

    const { user } = sessionRows[0];
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      bio: user.bio,
      name: user.name,
      avatar: user.avatar,
      createdAt: user.createdAt,
    };
  } catch {
    return null;
  }
}

/**
 * Destroys the current active session in SQLite and clears the authentication cookies.
 */
export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (token) {
      await db.delete(sessions).where(eq(sessions.id, token));
    }
    cookieStore.delete(AUTH_COOKIE_NAME);
    cookieStore.delete(ACTIVE_WORKSPACE_COOKIE);
  } catch {
    // Non-request context
  }
}

/**
 * Revokes all sessions for a user, optionally keeping a specific session alive
 * (e.g. keeping the current browser session alive during password change).
 */
export async function revokeAllUserSessions(
  userId: string,
  exceptSessionId?: string
): Promise<void> {
  try {
    if (exceptSessionId) {
      await db
        .delete(sessions)
        .where(and(eq(sessions.userId, userId), ne(sessions.id, exceptSessionId)));
    } else {
      await db.delete(sessions).where(eq(sessions.userId, userId));
    }
  } catch (error) {
    console.error("[Session] Error revoking user sessions:", error);
  }
}

/**
 * Purges expired sessions from the database.
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const nowIso = new Date().toISOString();
    const result = await db
      .delete(sessions)
      .where(lte(sessions.expiresAt, nowIso));
    return result.changes ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Synchronous version of expired session cleanup for startup / CLI seeds.
 */
export function cleanupExpiredSessionsSync(): number {
  try {
    const nowIso = new Date().toISOString();
    const info = sqlite
      .prepare("DELETE FROM sessions WHERE expires_at <= ?")
      .run(nowIso);
    return info.changes;
  } catch {
    return 0;
  }
}

export async function getUserWorkspaces(userId: string): Promise<DbWorkspace[]> {
  const memberships = await db
    .select({
      workspace: workspaces,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId));

  return memberships.map((m) => m.workspace);
}

export {
  AuthError,
  requireUser,
  requireWorkspaceMember,
  requireWorkspaceRole,
  getTargetWorkspaceMembership,
  requireTargetWorkspaceMember,
} from "@/lib/auth/tenant";
