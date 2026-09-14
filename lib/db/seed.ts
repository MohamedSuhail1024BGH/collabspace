import { db, sqlite } from "./index";
import {
  users,
  workspaces,
  workspaceMembers,
  teamMembers,
  projects,
  projectMembers,
  projectActivity,
  tasks,
  conversations,
  messages,
  calendarEvents,
} from "./schema";
import {
  team,
  projectDirectory,
  taskBoard,
  conversations as initialConversations,
  calendarEvents as initialEvents,
} from "../../data/mock-data";
import { hashPassword } from "./auth";

export function ensureTables() {
  sqlite.exec(`
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

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      plan TEXT NOT NULL DEFAULT 'Pro',
      is_public INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      initials TEXT NOT NULL,
      color TEXT NOT NULL,
      online INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS workspace_members (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      due TEXT NOT NULL,
      owner TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Planning',
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
      description TEXT NOT NULL DEFAULT '',
      assignee TEXT NOT NULL DEFAULT 'Unassigned',
      priority TEXT NOT NULL DEFAULT 'Medium',
      status TEXT NOT NULL DEFAULT 'Not started',
      due TEXT NOT NULL,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
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
  `);

  // Safe non-destructive migrations for existing database columns
  const safeAlter = (sql: string) => {
    try {
      sqlite.exec(sql);
    } catch {
      // Column already exists
    }
  };

  safeAlter("ALTER TABLE users ADD COLUMN username TEXT;");
  safeAlter("ALTER TABLE users ADD COLUMN bio TEXT;");
  safeAlter("ALTER TABLE workspaces ADD COLUMN description TEXT DEFAULT '';");
  safeAlter("ALTER TABLE workspaces ADD COLUMN is_public INTEGER NOT NULL DEFAULT 1;");
  safeAlter("ALTER TABLE project_members ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;");
  safeAlter("ALTER TABLE conversations ADD COLUMN type TEXT NOT NULL DEFAULT 'channel';");
  safeAlter("ALTER TABLE conversations ADD COLUMN participant_ids TEXT DEFAULT '[]';");

  // Automatically backfill usernames for all existing users if null
  try {
    const userRows = sqlite.prepare("SELECT id, email, username FROM users WHERE username IS NULL").all() as {
      id: string;
      email: string;
      username: string | null;
    }[];
    for (const u of userRows) {
      const handle = u.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
      sqlite.prepare("UPDATE users SET username = ? WHERE id = ?").run(handle, u.id);
    }
  } catch {
    // Ignore migration catch
  }
}

export function resetDatabase() {
  sqlite.exec(`
    DROP TABLE IF EXISTS messages;
    DROP TABLE IF EXISTS conversations;
    DROP TABLE IF EXISTS project_activity;
    DROP TABLE IF EXISTS project_members;
    DROP TABLE IF EXISTS tasks;
    DROP TABLE IF EXISTS projects;
    DROP TABLE IF EXISTS calendar_events;
    DROP TABLE IF EXISTS workspace_members;
    DROP TABLE IF EXISTS team_members;
    DROP TABLE IF EXISTS sessions;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS workspaces;
  `);
  ensureTables();
}

export async function seedDatabase(forceRefresh = false) {
  ensureTables();

  const existingUsers = await db.select().from(users);
  if (existingUsers.length > 0 && !forceRefresh) {
    console.log("Database already initialized, skipping seed.");
    return;
  }

  if (forceRefresh) {
    console.log("Refreshing database schema...");
    resetDatabase();
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
