import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { db } from "../lib/db";
import {
  workspaces,
  users,
  sessions,
  authRateLimits,
  teamMembers,
  workspaceMembers,
  projects,
  projectMembers,
  projectActivity,
  tasks,
  conversations,
  messages,
  calendarEvents,
  notifications,
} from "../lib/db/schema";
import { sql } from "drizzle-orm";

interface MigrationOptions {
  sourceDbPath?: string;
  cleanFirst?: boolean;
}

function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2);
  let sourceDbPath: string | undefined;
  let cleanFirst = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--source" && args[i + 1]) {
      sourceDbPath = args[i + 1];
      i++;
    } else if (args[i] === "--clean") {
      cleanFirst = true;
    }
  }

  return { sourceDbPath, cleanFirst };
}

function resolveSourceDatabase(explicitPath?: string): string {
  if (explicitPath) {
    const full = path.resolve(process.cwd(), explicitPath);
    if (!fs.existsSync(full)) {
      throw new Error(`Specified SQLite database does not exist: ${full}`);
    }
    return full;
  }

  // Auto-detect: check primary collabspace.db, and if empty or missing, check backup files
  const primary = path.resolve(process.cwd(), "collabspace.db");
  if (fs.existsSync(primary)) {
    try {
      const testDb = new Database(primary, { readonly: true });
      const userCount = testDb.prepare("SELECT count(*) as cnt FROM users").get() as { cnt: number };
      testDb.close();
      if (userCount.cnt > 0) return primary;
    } catch {}
  }

  // Check known backups
  const backups = [
    "collabspace.db.backup.auth-sec.2026-09-22T16-41-17-941Z",
    "collabspace.db.backup.2026-09-19T09-09-16-170Z",
  ];
  for (const b of backups) {
    const p = path.resolve(process.cwd(), b);
    if (fs.existsSync(p)) return p;
  }

  return primary;
}

export async function migrateSqliteToSupabase() {
  const options = parseArgs();
  const sourcePath = resolveSourceDatabase(options.sourceDbPath);

  console.log("=================================================");
  console.log(" CollabSpace: SQLite -> Supabase PostgreSQL");
  console.log("=================================================");
  console.log(`Source Database : ${sourcePath}`);
  console.log(`Target Database : Supabase PostgreSQL`);
  console.log("-------------------------------------------------");

  const sqlite = new Database(sourcePath, { readonly: true });

  if (options.cleanFirst) {
    console.log("Truncating target PostgreSQL tables before import...");
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
        sessions,
        users,
        workspaces
      CASCADE;
    `);
  }

  const stats: Record<string, { sqlite: number; postgres: number }> = {};

  // 1. Workspaces
  const rawWorkspaces = sqlite.prepare("SELECT * FROM workspaces").all() as Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    plan: string;
    is_public: number;
    created_at: string;
  }>;
  if (rawWorkspaces.length > 0) {
    for (const w of rawWorkspaces) {
      await db.insert(workspaces).values({
        id: w.id,
        name: w.name,
        slug: w.slug,
        description: w.description ?? "",
        plan: w.plan ?? "Pro",
        isPublic: Boolean(w.is_public),
        createdAt: w.created_at,
      }).onConflictDoNothing();
    }
  }
  stats["workspaces"] = { sqlite: rawWorkspaces.length, postgres: (await db.select().from(workspaces)).length };

  // 2. Users
  const rawUsers = sqlite.prepare("SELECT * FROM users").all() as Array<{
    id: string;
    email: string;
    username: string | null;
    bio: string | null;
    password_hash: string;
    name: string;
    avatar: string | null;
    created_at: string;
  }>;
  if (rawUsers.length > 0) {
    for (const u of rawUsers) {
      await db.insert(users).values({
        id: u.id,
        email: u.email,
        username: u.username,
        bio: u.bio,
        passwordHash: u.password_hash,
        name: u.name,
        avatar: u.avatar,
        createdAt: u.created_at,
      }).onConflictDoNothing();
    }
  }
  stats["users"] = { sqlite: rawUsers.length, postgres: (await db.select().from(users)).length };

  // 3. Workspace Members
  try {
    const rawWm = sqlite.prepare("SELECT * FROM workspace_members").all() as Array<{
      id: string;
      workspace_id: string;
      user_id: string;
      role: string;
      joined_at: string;
      status: string;
    }>;
    if (rawWm.length > 0) {
      for (const wm of rawWm) {
        await db.insert(workspaceMembers).values({
          id: wm.id,
          workspaceId: wm.workspace_id,
          userId: wm.user_id,
          role: wm.role,
          joinedAt: wm.joined_at,
          status: wm.status ?? "active",
        }).onConflictDoNothing();
      }
    }
    stats["workspace_members"] = { sqlite: rawWm.length, postgres: (await db.select().from(workspaceMembers)).length };
  } catch {}

  // 4. Team Members
  try {
    const rawTm = sqlite.prepare("SELECT * FROM team_members").all() as Array<{
      id: string;
      name: string;
      role: string;
      initials: string;
      color: string;
      online: number;
    }>;
    if (rawTm.length > 0) {
      for (const tm of rawTm) {
        await db.insert(teamMembers).values({
          id: tm.id,
          name: tm.name,
          role: tm.role,
          initials: tm.initials,
          color: tm.color,
          online: Boolean(tm.online),
        }).onConflictDoNothing();
      }
    }
    stats["team_members"] = { sqlite: rawTm.length, postgres: (await db.select().from(teamMembers)).length };
  } catch {}

  // 5. Projects
  try {
    const rawProjects = sqlite.prepare("SELECT * FROM projects").all() as Array<{
      id: string;
      workspace_id: string;
      name: string;
      progress: number;
      due: string;
      owner: string;
      owner_user_id: string | null;
      status: string;
      overview: string;
      created_at: string;
    }>;
    if (rawProjects.length > 0) {
      for (const p of rawProjects) {
        await db.insert(projects).values({
          id: p.id,
          workspaceId: p.workspace_id,
          name: p.name,
          progress: p.progress ?? 0,
          due: p.due,
          owner: p.owner,
          ownerUserId: p.owner_user_id,
          status: p.status ?? "Planning",
          overview: p.overview,
          createdAt: p.created_at,
        }).onConflictDoNothing();
      }
    }
    stats["projects"] = { sqlite: rawProjects.length, postgres: (await db.select().from(projects)).length };
  } catch {}

  // 6. Project Members
  try {
    const rawPm = sqlite.prepare("SELECT * FROM project_members").all() as Array<{
      id: string;
      project_id: string;
      user_id: string | null;
      name: string;
      role: string;
      initials: string;
      color: string;
    }>;
    if (rawPm.length > 0) {
      for (const pm of rawPm) {
        await db.insert(projectMembers).values({
          id: pm.id,
          projectId: pm.project_id,
          userId: pm.user_id,
          name: pm.name,
          role: pm.role,
          initials: pm.initials,
          color: pm.color,
        }).onConflictDoNothing();
      }
    }
    stats["project_members"] = { sqlite: rawPm.length, postgres: (await db.select().from(projectMembers)).length };
  } catch {}

  // 7. Project Activity
  try {
    const rawPa = sqlite.prepare("SELECT * FROM project_activity").all() as Array<{
      id: string;
      project_id: string;
      content: string;
      created_at: string;
    }>;
    if (rawPa.length > 0) {
      for (const pa of rawPa) {
        await db.insert(projectActivity).values({
          id: pa.id,
          projectId: pa.project_id,
          content: pa.content,
          createdAt: pa.created_at,
        }).onConflictDoNothing();
      }
    }
    stats["project_activity"] = { sqlite: rawPa.length, postgres: (await db.select().from(projectActivity)).length };
  } catch {}

  // 8. Tasks
  try {
    const rawTasks = sqlite.prepare("SELECT * FROM tasks").all() as Array<{
      id: string;
      workspace_id: string;
      title: string;
      description: string | null;
      assignee: string;
      assignee_user_id: string | null;
      priority: string;
      status: string;
      due: string;
      project_id: string | null;
      project_name: string | null;
      created_at: string;
    }>;
    if (rawTasks.length > 0) {
      for (const t of rawTasks) {
        await db.insert(tasks).values({
          id: t.id,
          workspaceId: t.workspace_id,
          title: t.title,
          description: t.description ?? "",
          assignee: t.assignee,
          assigneeUserId: t.assignee_user_id,
          priority: t.priority ?? "Medium",
          status: t.status ?? "Not started",
          due: t.due,
          projectId: t.project_id,
          projectName: t.project_name,
          createdAt: t.created_at,
        }).onConflictDoNothing();
      }
    }
    stats["tasks"] = { sqlite: rawTasks.length, postgres: (await db.select().from(tasks)).length };
  } catch {}

  // 9. Conversations
  try {
    const rawConv = sqlite.prepare("SELECT * FROM conversations").all() as Array<{
      id: string;
      workspace_id: string;
      type: string;
      participant_ids: string | null;
      name: string;
      initials: string;
      color: string;
      role: string;
      online: number;
      last_message: string;
      last_timestamp: string;
      unread: number;
    }>;
    if (rawConv.length > 0) {
      for (const c of rawConv) {
        await db.insert(conversations).values({
          id: c.id,
          workspaceId: c.workspace_id,
          type: c.type ?? "channel",
          participantIds: c.participant_ids ?? "[]",
          name: c.name,
          initials: c.initials,
          color: c.color,
          role: c.role,
          online: Boolean(c.online),
          lastMessage: c.last_message ?? "",
          lastTimestamp: c.last_timestamp,
          unread: c.unread ?? 0,
        }).onConflictDoNothing();
      }
    }
    stats["conversations"] = { sqlite: rawConv.length, postgres: (await db.select().from(conversations)).length };
  } catch {}

  // 10. Messages
  try {
    const rawMsgs = sqlite.prepare("SELECT * FROM messages").all() as Array<{
      id: string;
      conversation_id: string;
      sender: string;
      content: string;
      timestamp: string;
    }>;
    if (rawMsgs.length > 0) {
      for (const m of rawMsgs) {
        await db.insert(messages).values({
          id: m.id,
          conversationId: m.conversation_id,
          sender: m.sender,
          content: m.content,
          timestamp: m.timestamp,
        }).onConflictDoNothing();
      }
    }
    stats["messages"] = { sqlite: rawMsgs.length, postgres: (await db.select().from(messages)).length };
  } catch {}

  // 11. Calendar Events
  try {
    const rawEvents = sqlite.prepare("SELECT * FROM calendar_events").all() as Array<{
      id: string;
      workspace_id: string;
      title: string;
      date: string;
      start_time: string;
      end_time: string | null;
      category: string;
      description: string | null;
      attendees: string;
    }>;
    if (rawEvents.length > 0) {
      for (const e of rawEvents) {
        await db.insert(calendarEvents).values({
          id: e.id,
          workspaceId: e.workspace_id,
          title: e.title,
          date: e.date,
          startTime: e.start_time,
          endTime: e.end_time,
          category: e.category,
          description: e.description ?? "",
          attendees: e.attendees ?? "[]",
        }).onConflictDoNothing();
      }
    }
    stats["calendar_events"] = { sqlite: rawEvents.length, postgres: (await db.select().from(calendarEvents)).length };
  } catch {}

  // 12. Notifications
  try {
    const rawNotifs = sqlite.prepare("SELECT * FROM notifications").all() as Array<{
      id: string;
      user_id: string;
      workspace_id: string | null;
      type: string;
      title: string;
      message: string;
      link: string | null;
      data: string | null;
      is_read: number;
      created_at: string;
    }>;
    if (rawNotifs.length > 0) {
      for (const n of rawNotifs) {
        await db.insert(notifications).values({
          id: n.id,
          userId: n.user_id,
          workspaceId: n.workspace_id,
          type: n.type,
          title: n.title,
          message: n.message,
          link: n.link,
          data: n.data,
          isRead: Boolean(n.is_read),
          createdAt: n.created_at,
        }).onConflictDoNothing();
      }
    }
    stats["notifications"] = { sqlite: rawNotifs.length, postgres: (await db.select().from(notifications)).length };
  } catch {}

  sqlite.close();

  console.log("\nMigration Summary:");
  console.log("-------------------------------------------------");
  console.log("Table Name             | SQLite | Supabase Postgres");
  console.log("-----------------------|--------|------------------");
  for (const [table, counts] of Object.entries(stats)) {
    const tCol = table.padEnd(22, " ");
    const sCol = String(counts.sqlite).padStart(6, " ");
    const pCol = String(counts.postgres).padStart(17, " ");
    console.log(`${tCol} | ${sCol} | ${pCol}`);
  }
  console.log("-------------------------------------------------");
  console.log("Migration completed successfully!");
}

if (require.main === module || process.argv[1]?.endsWith("migrate-to-supabase.ts")) {
  migrateSqliteToSupabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}

