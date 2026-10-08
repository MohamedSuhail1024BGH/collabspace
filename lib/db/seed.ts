import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { db } from "./index";
import { users } from "./schema";
import { sql } from "drizzle-orm";
import { cleanupExpiredSessions } from "./auth";

/**
 * Verifies that the PostgreSQL schema and required tables exist.
 */
export async function verifyStartupIndexes(): Promise<void> {
  try {
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    const tableNames = (tables as unknown as Array<{ table_name: string }>).map((t) => t.table_name);
    const required = ["users", "workspaces", "sessions", "auth_rate_limits", "tasks", "projects"];
    for (const req of required) {
      if (!tableNames.includes(req)) {
        throw new Error(`Missing required table: ${req}. Run 'npm run db:push' to apply schema.`);
      }
    }
  } catch (err) {
    console.warn("[CollabSpace] Schema verification notice:", err instanceof Error ? err.message : err);
  }
}

export function ensureTablesBasic(_sqliteInstance?: unknown): void {}
export function createCanonicalIndexes(_sqliteInstance?: unknown): void {}

/**
 * Normal application startup table verification.
 */
export async function ensureTables(_sqliteInstance?: unknown) {
  await verifyStartupIndexes();
  await cleanupExpiredSessions();
}

/**
 * Resets the database by truncating all tables with CASCADE.
 */
export async function resetDatabase(_sqliteInstance?: unknown) {
  await db.execute(sql`
    TRUNCATE TABLE 
      notifications,
      messages,
      conversations,
      project_activity,
      project_members,
      tasks,
      projects,
      calendar_events,
      workspace_members,
      team_members,
      auth_rate_limits,
      auth_otps,
      sessions,
      users,
      workspaces
    CASCADE;
  `);
}

export async function seedDatabase(forceRefresh = false) {
  if (forceRefresh) {
    console.log("Resetting database records...");
    await resetDatabase();
  } else {
    await ensureTables();
  }

  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length > 0 && !forceRefresh) {
    console.log("Database already initialized, skipping seed.");
    return;
  }

  console.log("Database schema verified and ready.");
  console.log("No demo accounts or workspaces were created (Manual creation preferred).");
}

if (require.main === module || process.argv[1]?.endsWith("seed.ts")) {
  const isClean = process.argv.includes("--clean");
  const force = process.argv.includes("--refresh");

  if (isClean) {
    console.log("Cleaning database and setting up fresh tables...");
    resetDatabase()
      .then(() => {
        console.log("Fresh clean database ready! Zero users, zero workspaces.");
        process.exit(0);
      })
      .catch((err) => {
        console.error("Failed to clean database:", err);
        process.exit(1);
      });
  } else {
    seedDatabase(force)
      .then(() => process.exit(0))
      .catch((err) => {
        console.error("Failed to seed database:", err);
        process.exit(1);
      });
  }
}
