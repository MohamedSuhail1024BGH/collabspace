import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export interface MigrateAuthSecurityOptions {
  dbPath?: string;
  dryRun?: boolean;
  skipBackup?: boolean;
  forcePreCommitFailure?: boolean;
}

export interface MigrateAuthSecurityResult {
  success: boolean;
  dryRun: boolean;
  alreadyApplied: boolean;
  backupPath?: string;
  usersScanned: number;
  modernHashesCount: number;
  legacyHashesCount: number;
  corruptedHashesCount: number;
  activeSessionsCount: number;
  expiredSessionsPurged: number;
  rateLimitsTableCreated: boolean;
  sessionsIndexesCreated: boolean;
  error?: string;
}

const PHC_REGEX =
  /^\$scrypt\$N=(\d+),r=(\d+),p=(\d+)\$([A-Za-z0-9_-]+)\$([A-Za-z0-9_-]+)$/;

export function verifySessionsIndexes(sqlite: Database.Database): {
  ok: boolean;
  hasUserIdIdx: boolean;
  hasExpiresAtIdx: boolean;
  error?: string;
} {
  try {
    const indexes = sqlite
      .prepare("PRAGMA index_list('sessions')")
      .all() as { name: string }[];

    const hasUserIdIdx = indexes.some((i) => i.name === "idx_sessions_user_id");
    const hasExpiresAtIdx = indexes.some(
      (i) => i.name === "idx_sessions_expires_at"
    );

    return {
      ok: hasUserIdIdx && hasExpiresAtIdx,
      hasUserIdIdx,
      hasExpiresAtIdx,
    };
  } catch (err) {
    return {
      ok: false,
      hasUserIdIdx: false,
      hasExpiresAtIdx: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function checkAuthRateLimitsTable(sqlite: Database.Database): boolean {
  const table = sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='auth_rate_limits'"
    )
    .get();
  return Boolean(table);
}

/**
 * Creates an online SQLite backup safely and verifies its integrity.
 */
async function createVerifiedBackup(
  sqlite: Database.Database,
  dbPath: string
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${dbPath}.backup.auth-sec.${timestamp}`;

  await sqlite.backup(backupPath);

  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup creation failed: file not found at ${backupPath}`);
  }

  const backupDb = new Database(backupPath, { readonly: true });
  try {
    const backupCheck = backupDb.prepare("PRAGMA integrity_check").get() as {
      integrity_check: string;
    };
    if (!backupCheck || backupCheck.integrity_check !== "ok") {
      throw new Error(
        `Pre-migration backup integrity check failed: ${JSON.stringify(
          backupCheck
        )}`
      );
    }
  } finally {
    backupDb.close();
  }

  return backupPath;
}

/**
 * Executes the Auth & Session Security hardening migration.
 */
export async function migrateAuthSecurity(
  options: MigrateAuthSecurityOptions = {}
): Promise<MigrateAuthSecurityResult> {
  const dbPath =
    options.dbPath ||
    process.env.DATABASE_URL ||
    path.join(process.cwd(), "collabspace.db");
  const dryRun = Boolean(options.dryRun);

  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file not found at ${dbPath}`);
  }

  // 1. Open database connection. In dry-run mode, strictly readonly: true without modifying journal mode.
  const sqlite = new Database(dbPath, {
    readonly: dryRun,
    fileMustExist: true,
  });

  let backupPath: string | undefined;

  try {
    // 2. Pre-backup safety check & verified backup (Skip if dry-run or skipBackup)
    if (!dryRun) {
      const preCheck = sqlite.prepare("PRAGMA integrity_check").get() as {
        integrity_check: string;
      };
      if (!preCheck || preCheck.integrity_check !== "ok") {
        throw new Error(
          `Initial database integrity check failed before backup: ${JSON.stringify(
            preCheck
          )}`
        );
      }

      if (!options.skipBackup) {
        backupPath = await createVerifiedBackup(sqlite, dbPath);
      }

      // Apply connection pragmas only after verified backup exists
      sqlite.pragma("foreign_keys = ON");
      sqlite.pragma("journal_mode = WAL");
    }

    // 3. Credential Audit: Verify all password hashes are valid (fail-closed against corruption)
    const userRows = sqlite
      .prepare("SELECT id, email, password_hash FROM users")
      .all() as { id: string; email: string; password_hash: string }[];

    let modernHashesCount = 0;
    let legacyHashesCount = 0;
    let corruptedHashesCount = 0;
    const corruptedUsers: string[] = [];

    for (const u of userRows) {
      if (!u.password_hash) {
        corruptedHashesCount++;
        corruptedUsers.push(`${u.id} (empty)`);
        continue;
      }

      if (PHC_REGEX.test(u.password_hash)) {
        modernHashesCount++;
      } else if (u.password_hash.includes(":")) {
        const parts = u.password_hash.split(":");
        if (parts.length === 2 && parts[0].length === 32 && parts[1].length === 128) {
          legacyHashesCount++;
        } else {
          corruptedHashesCount++;
          corruptedUsers.push(`${u.id} (invalid legacy format)`);
        }
      } else {
        corruptedHashesCount++;
        corruptedUsers.push(`${u.id} (unrecognized format)`);
      }
    }

    if (corruptedHashesCount > 0) {
      throw new Error(
        `Credential audit failed: ${corruptedHashesCount} users have corrupted or invalid password hashes: [${corruptedUsers.join(
          ", "
        )}]. Manual resolution required.`
      );
    }

    // 4. Session Scan
    const nowIso = new Date().toISOString();
    const sessionRows = sqlite
      .prepare("SELECT id, expires_at FROM sessions")
      .all() as { id: string; expires_at: string }[];

    let activeSessionsCount = 0;
    let expiredSessionsCount = 0;
    for (const s of sessionRows) {
      if (s.expires_at > nowIso) {
        activeSessionsCount++;
      } else {
        expiredSessionsCount++;
      }
    }

    // 5. Check schema status
    const rateLimitsTableExists = checkAuthRateLimitsTable(sqlite);
    const indexStatus = verifySessionsIndexes(sqlite);

    // 6. Handle Dry-Run
    if (dryRun) {
      const alreadyApplied =
        rateLimitsTableExists &&
        indexStatus.ok &&
        expiredSessionsCount === 0;

      sqlite.close();
      return {
        success: true,
        dryRun: true,
        alreadyApplied,
        usersScanned: userRows.length,
        modernHashesCount,
        legacyHashesCount,
        corruptedHashesCount: 0,
        activeSessionsCount,
        expiredSessionsPurged: expiredSessionsCount,
        rateLimitsTableCreated: !rateLimitsTableExists,
        sessionsIndexesCreated: !indexStatus.ok,
      };
    }

    // Check if already cleanly applied
    if (rateLimitsTableExists && indexStatus.ok && expiredSessionsCount === 0) {
      sqlite.close();
      return {
        success: true,
        dryRun: false,
        alreadyApplied: true,
        backupPath,
        usersScanned: userRows.length,
        modernHashesCount,
        legacyHashesCount,
        corruptedHashesCount: 0,
        activeSessionsCount,
        expiredSessionsPurged: 0,
        rateLimitsTableCreated: false,
        sessionsIndexesCreated: false,
      };
    }

    let purgedCount = 0;

    // 7. Atomic Transaction: DDL & Expired Session Purge
    sqlite.transaction(() => {
      // 7a. Create auth_rate_limits table
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS auth_rate_limits (
          key TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          identifier TEXT NOT NULL,
          attempt_count INTEGER NOT NULL DEFAULT 1,
          first_attempt_at TEXT NOT NULL,
          last_attempt_at TEXT NOT NULL,
          locked_until TEXT
        );
      `);

      // 7b. Create sessions performance indexes
      sqlite.exec(`
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id
        ON sessions(user_id);

        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
        ON sessions(expires_at);
      `);

      // 7c. Purge expired sessions
      const purgeResult = sqlite
        .prepare("DELETE FROM sessions WHERE expires_at <= ?")
        .run(nowIso);
      purgedCount = purgeResult.changes;

      // 7d. Pre-commit failure injection for rollback testing
      if (options.forcePreCommitFailure) {
        throw new Error(
          "Forced pre-commit failure injection for auth security rollback testing."
        );
      }

      // 7e. Foreign key check
      const fkErrors = sqlite.prepare("PRAGMA foreign_key_check").all();
      if (fkErrors.length > 0) {
        throw new Error(
          `Foreign key check failed: ${JSON.stringify(fkErrors)}`
        );
      }

      // 7f. Pre-commit integrity check
      const commitCheck = sqlite.prepare("PRAGMA integrity_check").get() as {
        integrity_check: string;
      };
      if (!commitCheck || commitCheck.integrity_check !== "ok") {
        throw new Error(
          `Pre-commit integrity check failed: ${JSON.stringify(commitCheck)}`
        );
      }
    })();

    // 8. Post-commit verification
    const finalTableExists = checkAuthRateLimitsTable(sqlite);
    const finalIndexStatus = verifySessionsIndexes(sqlite);
    if (!finalTableExists || !finalIndexStatus.ok) {
      throw new Error(
        "Post-commit verification failed: schema objects were not cleanly created."
      );
    }

    sqlite.close();

    return {
      success: true,
      dryRun: false,
      alreadyApplied: false,
      backupPath,
      usersScanned: userRows.length,
      modernHashesCount,
      legacyHashesCount,
      corruptedHashesCount: 0,
      activeSessionsCount,
      expiredSessionsPurged: purgedCount,
      rateLimitsTableCreated: !rateLimitsTableExists,
      sessionsIndexesCreated: !indexStatus.ok,
    };
  } catch (error) {
    sqlite.close();
    return {
      success: false,
      dryRun,
      alreadyApplied: false,
      backupPath,
      usersScanned: 0,
      modernHashesCount: 0,
      legacyHashesCount: 0,
      corruptedHashesCount: 0,
      activeSessionsCount: 0,
      expiredSessionsPurged: 0,
      rateLimitsTableCreated: false,
      sessionsIndexesCreated: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

if (
  require.main === module ||
  process.argv[1]?.endsWith("migrate-auth-security.ts")
) {
  const isDryRun = process.argv.includes("--dry-run");
  const skipBackup = process.argv.includes("--skip-backup");

  migrateAuthSecurity({ dryRun: isDryRun, skipBackup })
    .then((res) => {
      console.log("Auth security migration completed:", res);
      if (!res.success) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error("Auth security migration error:", err);
      process.exit(1);
    });
}

