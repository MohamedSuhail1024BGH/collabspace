import { sqlite } from "@/lib/db";

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
 * Fail-Closed: If any SQLite error occurs, it denies login.
 */
export function checkLoginRateLimit(
  email: string,
  clientIp: string
): RateLimitCheckResult {
  try {
    const now = Date.now();
    const accountKey = `account:${normalizeEmail(email)}`;
    const ipKey = `ip:${clientIp.trim()}`;

    const stmt = sqlite.prepare(`
      SELECT key, locked_until
      FROM auth_rate_limits
      WHERE key IN (?, ?)
    `);

    const rows = stmt.all(accountKey, ipKey) as {
      key: string;
      locked_until: string | null;
    }[];

    for (const row of rows) {
      if (row.locked_until) {
        const lockedTime = new Date(row.locked_until).getTime();
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
    // Fail-closed on storage error
    return { allowed: false, retryAfterSeconds: 60 };
  }
}

/**
 * Records a failed login attempt for both the account and the client IP.
 * Enforces sliding window logic from first_attempt_at and sets lockout if threshold reached.
 * Fail-Closed: Throws on failure so the caller cannot ignore storage integrity.
 */
export function recordFailedLogin(email: string, clientIp: string): void {
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

  const updateTx = sqlite.transaction(() => {
    for (const t of targets) {
      const existing = sqlite
        .prepare(`
          SELECT key, attempt_count, first_attempt_at, locked_until
          FROM auth_rate_limits
          WHERE key = ?
        `)
        .get(t.key) as
        | {
            key: string;
            attempt_count: number;
            first_attempt_at: string;
            locked_until: string | null;
          }
        | undefined;

      if (!existing) {
        sqlite
          .prepare(`
            INSERT INTO auth_rate_limits (key, type, identifier, attempt_count, first_attempt_at, last_attempt_at, locked_until)
            VALUES (?, ?, ?, 1, ?, ?, NULL)
          `)
          .run(t.key, t.type, t.identifier, nowIso, nowIso);
        continue;
      }

      const firstAttemptTime = new Date(existing.first_attempt_at).getTime();
      const isWindowExpired = now - firstAttemptTime > RATE_LIMIT_CONFIG.WINDOW_MS;
      const isLockExpired =
        !existing.locked_until ||
        new Date(existing.locked_until).getTime() <= now;

      if (isWindowExpired && isLockExpired) {
        // Window expired: slide and reset counter
        sqlite
          .prepare(`
            UPDATE auth_rate_limits
            SET attempt_count = 1, first_attempt_at = ?, last_attempt_at = ?, locked_until = NULL
            WHERE key = ?
          `)
          .run(nowIso, nowIso, t.key);
      } else {
        // Within window: increment counter
        const newCount = existing.attempt_count + 1;
        const lockedUntil =
          newCount >= t.max
            ? new Date(now + RATE_LIMIT_CONFIG.LOCKOUT_MS).toISOString()
            : existing.locked_until && new Date(existing.locked_until).getTime() > now
            ? existing.locked_until
            : null;

        sqlite
          .prepare(`
            UPDATE auth_rate_limits
            SET attempt_count = ?, last_attempt_at = ?, locked_until = ?
            WHERE key = ?
          `)
          .run(newCount, nowIso, lockedUntil, t.key);
      }
    }
  });

  updateTx();
}

/**
 * Resets both the account and IP rate-limiting counters upon successful authentication.
 */
export function resetLoginRateLimit(email: string, clientIp: string): void {
  try {
    const accountKey = `account:${normalizeEmail(email)}`;
    const ipKey = `ip:${clientIp.trim()}`;

    sqlite
      .prepare(`
        DELETE FROM auth_rate_limits
        WHERE key IN (?, ?)
      `)
      .run(accountKey, ipKey);
  } catch (error) {
    console.error("[RateLimiter] Error resetting rate limits:", error);
  }
}

/**
 * Clears all rate limits (used by seed-test and explicit test cleanup).
 */
export function clearAllRateLimits(): void {
  try {
    sqlite.exec("DELETE FROM auth_rate_limits;");
  } catch {}
}

