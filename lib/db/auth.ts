import crypto from "crypto";
import { cookies } from "next/headers";
import { eq, and, gt } from "drizzle-orm";
import { db } from "./index";
import { users, sessions, workspaces, workspaceMembers, type DbUser, type DbWorkspace, type UserRole } from "./schema";
import { ACTIVE_WORKSPACE_COOKIE } from "./workspace";

export const AUTH_COOKIE_NAME = "collabspace_session";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(Buffer.from(key, "hex"), derivedKey);
  } catch {
    return false;
  }
}

export async function createSession(userId: string): Promise<string> {
  const token = `sess_${crypto.randomBytes(24).toString("hex")}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  await db.insert(sessions).values({
    id: token,
    userId,
    expiresAt,
    createdAt: now.toISOString(),
  });

  try {
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    });
  } catch {
    // Non-request context
  }

  return token;
}

export async function getCurrentUser(): Promise<Omit<DbUser, "passwordHash"> | null> {
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


