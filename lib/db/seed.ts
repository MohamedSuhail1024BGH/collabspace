import { db, sqlite } from "./index";
import { users } from "./schema";
import { verifyUniqueIndexes } from "@/scripts/migrate-uniqueness";
import { cleanupExpiredSessionsSync } from "./auth";

/**
 * Creates canonical unique indexes for workspace and project membership,
 * and performance indexes for sessions.
 * Used strictly during explicit database reset/initialization.
 */
export function createCanonicalIndexes(sqliteInstance = sqlite): void {
  sqliteInstance.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_members_ws_user
    ON workspace_members(workspace_id, user_id);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_project_members_proj_user
    ON project_members(project_id, user_id)
    WHERE user_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id
    ON sessions(user_id);

    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
    ON sessions(expires_at);
  `);
}

/**
 * Verifies that canonical unique indexes and auth security schema exist and are valid.
 * Throws loudly if missing or invalid; does not perform schema repair.
 */
export function verifyStartupIndexes(sqliteInstance = sqlite): void {
  const verif = verifyUniqueIndexes(sqliteInstance);
  if (!verif.ok) {
    throw new Error(
      `[CollabSpace] Database schema error: required unique indexes are missing or invalid (${verif.error}). Migration required. Run: npx tsx scripts/migrate-uniqueness.ts`
    );
  }

  // Verify auth_rate_limits table exists
  const rateLimitTable = sqliteInstance
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='auth_rate_limits'"
    )
    .get();
  if (!rateLimitTable) {
    throw new Error(
      "[CollabSpace] Database schema error: required table auth_rate_limits is missing. Migration required. Run: npx tsx scripts/migrate-auth-security.ts"
    );
  }

  // Verify sessions indexes exist
  const sessionIndexes = sqliteInstance
    .prepare("PRAGMA index_list('sessions')")
    .all() as { name: string }[];
  const hasUserIdIdx = sessionIndexes.some(
    (i) => i.name === "idx_sessions_user_id"
  );
  const hasExpiresAtIdx = sessionIndexes.some(
    (i) => i.name === "idx_sessions_expires_at"
  );
  if (!hasUserIdIdx || !hasExpiresAtIdx) {
    throw new Error(
      "[CollabSpace] Database schema error: required sessions indexes (idx_sessions_user_id, idx_sessions_expires_at) are missing. Migration required. Run: npx tsx scripts/migrate-auth-security.ts"
    );
  }
}

/**
 * Ensures table DDL exists without attempting index repair.
 */
export function ensureTablesBasic(sqliteInstance = sqlite): void {
  sqliteInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      username TEXT UNIQUE,
      bio TEXT,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_rate_limits (
      key TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      identifier TEXT NOT NULL,
      attempt_count INTEGER NOT NULL DEFAULT 1,
      first_attempt_at TEXT NOT NULL,
      last_attempt_at TEXT NOT NULL,
      locked_until TEXT
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      plan TEXT NOT NULL DEFAULT 'Pro',
      is_public INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspace_members (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      initials TEXT NOT NULL,
      color TEXT NOT NULL,
      online INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      owner TEXT NOT NULL,
      owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'Planning',
      due TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      overview TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_members (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'contributor',
      initials TEXT NOT NULL,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_activity (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      assignee TEXT NOT NULL,
      assignee_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      priority TEXT NOT NULL DEFAULT 'Medium',
      status TEXT NOT NULL DEFAULT 'Todo',
      due TEXT NOT NULL,
      project_id TEXT,
      project_name TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'channel',
      participant_ids TEXT DEFAULT '[]',
      name TEXT NOT NULL,
      initials TEXT NOT NULL,
      color TEXT NOT NULL,
      role TEXT NOT NULL,
      online INTEGER NOT NULL DEFAULT 0,
      last_message TEXT NOT NULL DEFAULT '',
      last_timestamp TEXT NOT NULL,
      unread INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      category TEXT NOT NULL,
      description TEXT DEFAULT '',
      attendees TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      data TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_user_id
    ON notifications(user_id);

    CREATE INDEX IF NOT EXISTS idx_notifications_is_read
    ON notifications(is_read);
  `);

  const safeAlter = (sql: string) => {
    try {
      sqliteInstance.exec(sql);
    } catch {}
  };

  safeAlter("ALTER TABLE users ADD COLUMN username TEXT;");
  safeAlter("ALTER TABLE users ADD COLUMN bio TEXT;");
  safeAlter("ALTER TABLE workspaces ADD COLUMN description TEXT DEFAULT '';");
  safeAlter("ALTER TABLE workspaces ADD COLUMN is_public INTEGER NOT NULL DEFAULT 1;");
  safeAlter("ALTER TABLE project_members ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;");
  safeAlter("ALTER TABLE conversations ADD COLUMN type TEXT NOT NULL DEFAULT 'channel';");
  safeAlter("ALTER TABLE conversations ADD COLUMN participant_ids TEXT DEFAULT '[]';");
  safeAlter("ALTER TABLE workspace_members ADD COLUMN status TEXT NOT NULL DEFAULT 'active';");
}

/**
 * Normal application startup table verification.
 * Strictly verification-only: does NOT call ensureTablesBasic, CREATE TABLE, or ALTER TABLE.
 * Fails fast with loud "migration required" if required schema or indexes are missing or invalid.
 */
export function ensureTables(sqliteInstance = sqlite) {
  verifyStartupIndexes(sqliteInstance);
  cleanupExpiredSessionsSync();
}

/**
 * Explicit database reset. Drops tables, creates tables,
 * explicitly creates canonical indexes, and verifies them.
 */
export function resetDatabase(sqliteInstance = sqlite) {
  sqliteInstance.exec(`
    DROP TABLE IF EXISTS notifications;
    DROP TABLE IF EXISTS messages;
    DROP TABLE IF EXISTS conversations;
    DROP TABLE IF EXISTS project_activity;
    DROP TABLE IF EXISTS project_members;
    DROP TABLE IF EXISTS tasks;
    DROP TABLE IF EXISTS projects;
    DROP TABLE IF EXISTS calendar_events;
    DROP TABLE IF EXISTS workspace_members;
    DROP TABLE IF EXISTS team_members;
    DROP TABLE IF EXISTS auth_rate_limits;
    DROP TABLE IF EXISTS sessions;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS workspaces;
  `);
  ensureTablesBasic(sqliteInstance);
  createCanonicalIndexes(sqliteInstance);
  verifyStartupIndexes(sqliteInstance);
}

export async function seedDatabase(forceRefresh = false) {
  if (forceRefresh) {
    console.log("Refreshing database schema...");
    resetDatabase();
  } else {
    ensureTables();
  }

  const existingUsers = await db.select().from(users);
  if (existingUsers.length > 0 && !forceRefresh) {
    console.log("Database already initialized, skipping seed.");
    return;
  }

  console.log("Database schema initialized successfully.");
  console.log("No demo accounts or workspaces were created (Manual creation preferred).");
}

if (require.main === module || process.argv[1]?.endsWith("seed.ts")) {
  const isClean = process.argv.includes("--clean");
  const force = process.argv.includes("--refresh");

  if (isClean) {
    console.log("Cleaning database and setting up fresh tables...");
    resetDatabase();
    console.log("Fresh clean database ready! Zero users, zero workspaces.");
    process.exit(0);
  } else {
    seedDatabase(force)
      .then(() => process.exit(0))
      .catch((err) => {
        console.error("Failed to seed database:", err);
        process.exit(1);
      });
  }
}
