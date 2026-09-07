import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import * as schema from "./schema";

const dbPath = path.resolve(process.cwd(), "collabspace.db");

// Maintain singleton instance in development to avoid connection leaks across hot reloads
const globalForDb = globalThis as unknown as {
  sqlite: Database.Database | undefined;
};

const sqlite = globalForDb.sqlite ?? new Database(dbPath);

// Enable WAL mode and foreign key enforcement for high performance and integrity
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

if (process.env.NODE_ENV !== "production") {
  globalForDb.sqlite = sqlite;
}

process.on("exit", () => {
  try {
    if (sqlite.open) sqlite.close();
  } catch {}
});

export const db = drizzle(sqlite, { schema });
export { sqlite };

