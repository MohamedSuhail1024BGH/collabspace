import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import * as schema from "./schema";

const defaultDbPath = path.resolve(process.cwd(), "collabspace.db");

const globalForDb = globalThis as unknown as {
  sqlite: Database.Database | undefined;
};

function getActiveDbPath(): string {
  if (process.env.NODE_ENV !== "production" && process.env.COLLABSPACE_DB_PATH) {
    return path.resolve(process.cwd(), process.env.COLLABSPACE_DB_PATH);
  }
  return defaultDbPath;
}

function getSqliteInstance(): Database.Database {
  if (process.env.NODE_ENV !== "production" && globalForDb.sqlite) {
    return globalForDb.sqlite;
  }

  const dbPath = getActiveDbPath();
  const instance = new Database(dbPath);
  instance.pragma("journal_mode = WAL");
  instance.pragma("foreign_keys = ON");

  if (process.env.NODE_ENV !== "production") {
    globalForDb.sqlite = instance;
  }

  return instance;
}

let currentDrizzleDb: ReturnType<typeof drizzle> | undefined;
let lastSqliteForDrizzle: Database.Database | undefined;

function getDrizzleInstance() {
  const currentSqlite = getSqliteInstance();
  if (!currentDrizzleDb || lastSqliteForDrizzle !== currentSqlite) {
    currentDrizzleDb = drizzle(currentSqlite, { schema });
    lastSqliteForDrizzle = currentSqlite;
  }
  return currentDrizzleDb;
}

process.on("exit", () => {
  try {
    if (globalForDb.sqlite?.open) globalForDb.sqlite.close();
  } catch {}
});

export const sqlite = new Proxy({} as Database.Database, {
  get(_target, prop) {
    const instance = getSqliteInstance();
    const value = Reflect.get(instance, prop);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(instance) : value;
  },
  set(_target, prop, value) {
    const instance = getSqliteInstance();
    return Reflect.set(instance, prop, value);
  },
});

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const instance = getDrizzleInstance();
    const value = Reflect.get(instance, prop);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(instance) : value;
  },
});

/**
 * Test-only factory to set an isolated Database instance.
 * Strictly forbidden in production.
 */
export function setDatabaseForTesting(customSqlite: Database.Database | undefined) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("setDatabaseForTesting is not available in production.");
  }
  globalForDb.sqlite = customSqlite;
  currentDrizzleDb = undefined;
  lastSqliteForDrizzle = undefined;
}
