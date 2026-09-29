import Database from "better-sqlite3";
import path from "path";

export function ensureNotificationsSchema(sqliteInstance: Database.Database): void {
  sqliteInstance.exec(`
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
}

function main() {
  const dbPath = path.resolve(process.cwd(), "collabspace.db");
  const sqlite = new Database(dbPath);
  ensureNotificationsSchema(sqlite);
  sqlite.close();
  console.log("Notifications schema applied successfully to", dbPath);
}

if (require.main === module) {
  main();
}

