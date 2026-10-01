import { db } from "@/lib/db";
import { authRateLimits } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

export interface RateLimitCheckResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export const RATE_LIMIT_CONFIG = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes sliding window
  LOCKOUT_MS: 15 * 60 * 1000, // 15 minutes lockout duration
  ACCOUNT_MAX_ATTEMPTS: 5, // 5 failed attempts per account
  IP_MAX_ATTEMPTS: 10, // 10 failed attempts per IP
};

/**
 * Normalizes an email address for identity keys.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Safely extracts client IP address from request headers.
 * Leftmost entries in x-forwarded-for are client-controlled and spoofable.
 * Uses the rightmost entry (the immediate upstream hop appended by the reverse proxy),
 * falling back to x-real-ip, or 127.0.0.1.
 */
export function extractClientIp(headers: Headers): string {
  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const parts = xForwardedFor
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (parts.length > 0) {
      return parts[parts.length - 1];
    }
  }

  const xRealIp = headers.get("x-real-ip");
  if (xRealIp && xRealIp.trim()) {
    return xRealIp.trim();
  }

  return "127.0.0.1";
}

/**
 * Pre-auth check evaluating both per-account and per-IP thresholds.
 * Fail-Closed: If any error occurs, it denies login.
 */
export async function checkLoginRateLimit(
  email: string,
  clientIp: string
): Promise<RateLimitCheckResult> {
  try {
    const now = Date.now();
    const accountKey = `account:${normalizeEmail(email)}`;
    const ipKey = `ip:${clientIp.trim()}`;

    const rows = await db
      .select({
        key: authRateLimits.key,
        lockedUntil: authRateLimits.lockedUntil,
      })
      .from(authRateLimits)
      .where(inArray(authRateLimits.key, [accountKey, ipKey]));

    for (const row of rows) {
      if (row.lockedUntil) {
        const lockedTime = new Date(row.lockedUntil).getTime();
        if (lockedTime > now) {
          const retryAfterSeconds = Math.ceil((lockedTime - now) / 1000);
          return {
            allowed: false,
            retryAfterSeconds: Math.max(1, retryAfterSeconds),
          };
        }
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error("[RateLimiter] Fail-closed check error:", error);
    return { allowed: false, retryAfterSeconds: 60 };
  }
}

/**
 * Records a failed login attempt for both the account and the client IP.
 * Enforces sliding window logic from first_attempt_at and sets lockout if threshold reached.
 * Fail-Closed: Throws on failure so the caller cannot ignore storage integrity.
 */
export async function recordFailedLogin(email: string, clientIp: string): Promise<void> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const accountKey = `account:${normalizeEmail(email)}`;
  const ipKey = `ip:${clientIp.trim()}`;

  const targets = [
    {
      key: accountKey,
      type: "account",
      identifier: normalizeEmail(email),
      max: RATE_LIMIT_CONFIG.ACCOUNT_MAX_ATTEMPTS,
    },
    {
      key: ipKey,
      type: "ip",
      identifier: clientIp.trim(),
      max: RATE_LIMIT_CONFIG.IP_MAX_ATTEMPTS,
    },
  ];

  await db.transaction(async (tx) => {
    for (const t of targets) {
      const [existing] = await tx
        .select()
        .from(authRateLimits)
        .where(eq(authRateLimits.key, t.key));

      if (!existing) {
        await tx.insert(authRateLimits).values({
          key: t.key,
          type: t.type,
          identifier: t.identifier,
          attemptCount: 1,
          firstAttemptAt: nowIso,
          lastAttemptAt: nowIso,
          lockedUntil: null,
        });
        continue;
      }

      const firstAttemptTime = new Date(existing.firstAttemptAt).getTime();
      const isWindowExpired = now - firstAttemptTime > RATE_LIMIT_CONFIG.WINDOW_MS;
      const isLockExpired =
        !existing.lockedUntil ||
        new Date(existing.lockedUntil).getTime() <= now;

      if (isWindowExpired && isLockExpired) {
        await tx
          .update(authRateLimits)
          .set({
            attemptCount: 1,
            firstAttemptAt: nowIso,
            lastAttemptAt: nowIso,
            lockedUntil: null,
          })
          .where(eq(authRateLimits.key, t.key));
      } else {
        const newCount = existing.attemptCount + 1;
        const lockedUntil =
          newCount >= t.max
            ? new Date(now + RATE_LIMIT_CONFIG.LOCKOUT_MS).toISOString()
            : existing.lockedUntil && new Date(existing.lockedUntil).getTime() > now
            ? existing.lockedUntil
            : null;

        await tx
          .update(authRateLimits)
          .set({
            attemptCount: newCount,
            lastAttemptAt: nowIso,
            lockedUntil,
          })
          .where(eq(authRateLimits.key, t.key));
      }
    }
  });
}

/**
 * Resets both the account and IP rate-limiting counters upon successful authentication.
 */
export async function resetLoginRateLimit(email: string, clientIp: string): Promise<void> {
  try {
    const accountKey = `account:${normalizeEmail(email)}`;
    const ipKey = `ip:${clientIp.trim()}`;

    await db
      .delete(authRateLimits)
      .where(inArray(authRateLimits.key, [accountKey, ipKey]));
  } catch (error) {
    console.error("[RateLimiter] Error resetting rate limits:", error);
  }
}

/**
 * Clears all rate limits (used by seed-test and explicit test cleanup).
 */
export async function clearAllRateLimits(): Promise<void> {
  try {
    await db.delete(authRateLimits);
  } catch {}
}
