import type Database from "better-sqlite3";

/**
 * Legacy SQLite schema fixtures for tests that exercise the better-sqlite3
 * migration scripts (`scripts/migrate-uniqueness.ts`) directly against temp
 * SQLite files.
 *
 * This DDL was restored from `lib/db/seed.ts` as it existed before the
 * Supabase/Postgres migration (commit 765141a), where `ensureTablesBasic` and
 * `createCanonicalIndexes` were reduced to no-op stubs. The production code no
 * longer creates SQLite schemas, so the fixture lives with the tests.
 */

export function ensureTablesBasic(sqliteInstance: Database.Database): void {
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

  const safeAlter = (alterSql: string) => {
    try {
      sqliteInstance.exec(alterSql);
    } catch {
      /* column already exists */
    }
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

export function createCanonicalIndexes(sqliteInstance: Database.Database): void {
  sqliteInstance.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_members_ws_user
    ON workspace_members(workspace_id, user_id);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_project_members_proj_user
    ON project_members(project_id, user_id) WHERE user_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id
    ON sessions(user_id);

    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
    ON sessions(expires_at);
  `);
}
