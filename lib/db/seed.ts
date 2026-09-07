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
      plan TEXT NOT NULL DEFAULT 'Pro',
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
      workspace_id TEXT NOT NULL DEFAULT 'ws-acme' REFERENCES workspaces(id) ON DELETE CASCADE,
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
      name TEXT NOT NULL,
      role TEXT NOT NULL,
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
      workspace_id TEXT NOT NULL DEFAULT 'ws-acme' REFERENCES workspaces(id) ON DELETE CASCADE,
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
      workspace_id TEXT NOT NULL DEFAULT 'ws-acme' REFERENCES workspaces(id) ON DELETE CASCADE,
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
      workspace_id TEXT NOT NULL DEFAULT 'ws-acme' REFERENCES workspaces(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      category TEXT NOT NULL,
      description TEXT DEFAULT '',
      attendees TEXT NOT NULL DEFAULT '[]'
    );
  `);
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
    console.log("Refreshing database schema & demo accounts...");
    resetDatabase();
  }

  console.log("Seeding users & multi-tenant workspaces...");

  const now = new Date().toISOString();
  const defaultPasswordHash = hashPassword("password123");

  // 1. Seed Demo Users
  await db.insert(users).values([
    {
      id: "usr-ava",
      email: "ava@acme.com",
      name: "Ava Thompson",
      passwordHash: defaultPasswordHash,
      avatar: "bg-violet-500",
      createdAt: now,
    },
    {
      id: "usr-leo",
      email: "leo@starlight.com",
      name: "Leo Martin",
      passwordHash: defaultPasswordHash,
      avatar: "bg-cyan-500",
      createdAt: now,
    },
  ]);

  // 2. Workspaces
  await db.insert(workspaces).values([
    {
      id: "ws-acme",
      name: "Acme Corporation",
      slug: "acme",
      plan: "Pro",
      createdAt: now,
    },
    {
      id: "ws-starlight",
      name: "Starlight Studios",
      slug: "starlight",
      plan: "Enterprise",
      createdAt: now,
    },
  ]);

  // 3. Team Members (Directory)
  for (const member of team) {
    const initials = (member.name.split(" ")[0]?.[0] ?? "") + (member.name.split(" ")[1]?.[0] ?? "");
    const id = `tm-${member.name.toLowerCase().replace(/\s+/g, "-")}`;
    await db.insert(teamMembers).values({
      id,
      name: member.name,
      role: member.role,
      initials,
      color: member.color,
      online: true,
    });
  }

  // 4. Workspace Membership with Roles (RBAC)
  // Ava owns Acme Corp, Leo owns Starlight Studios; both belong to each workspace for cross-tenant demoing
  await db.insert(workspaceMembers).values([
    { id: "wm-acme-1", workspaceId: "ws-acme", userId: "usr-ava", role: "owner", joinedAt: now },
    { id: "wm-acme-2", workspaceId: "ws-acme", userId: "usr-leo", role: "member", joinedAt: now },
    { id: "wm-star-1", workspaceId: "ws-starlight", userId: "usr-leo", role: "owner", joinedAt: now },
    { id: "wm-star-2", workspaceId: "ws-starlight", userId: "usr-ava", role: "member", joinedAt: now },
  ]);

  // 5. Acme Corp Data (from mock dataset)
  for (const proj of projectDirectory) {
    await db.insert(projects).values({
      id: proj.id,
      workspaceId: "ws-acme",
      name: proj.name,
      progress: proj.progress,
      due: proj.due,
      owner: proj.owner,
      status: proj.status,
      overview: proj.overview,
      createdAt: now,
    });

    for (let i = 0; i < proj.teamMembers.length; i++) {
      const tm = proj.teamMembers[i];
      await db.insert(projectMembers).values({
        id: `pm-${proj.id}-${i}`,
        projectId: proj.id,
        name: tm.name,
        role: tm.role,
        initials: tm.initials,
        color: tm.color,
      });
    }

    for (let i = 0; i < proj.recentActivity.length; i++) {
      await db.insert(projectActivity).values({
        id: `pa-${proj.id}-${i}`,
        projectId: proj.id,
        content: proj.recentActivity[i],
        createdAt: now,
      });
    }
  }

  for (const task of taskBoard) {
    await db.insert(tasks).values({
      id: task.id,
      workspaceId: "ws-acme",
      title: task.title,
      description: task.description,
      assignee: task.assignee,
      priority: task.priority,
      status: task.status,
      due: task.due,
      projectId: task.project?.toLowerCase().replace(/\s+/g, "-"),
      projectName: task.project ?? "General",
      createdAt: now,
    });
  }

  for (const conv of initialConversations) {
    await db.insert(conversations).values({
      id: conv.id,
      workspaceId: "ws-acme",
      name: conv.name,
      initials: conv.initials,
      color: conv.color,
      role: conv.role,
      online: conv.online,
      lastMessage: conv.lastMessage,
      lastTimestamp: conv.lastTimestamp,
      unread: conv.unread,
    });

    for (const msg of conv.messages) {
      await db.insert(messages).values({
        id: msg.id,
        conversationId: conv.id,
        sender: msg.sender,
        content: msg.content,
        timestamp: msg.timestamp,
      });
    }
  }

  for (const ev of initialEvents) {
    await db.insert(calendarEvents).values({
      id: ev.id,
      workspaceId: "ws-acme",
      title: ev.title,
      date: ev.date,
      startTime: ev.startTime,
      endTime: ev.endTime ?? null,
      category: ev.category,
      description: ev.description ?? "",
      attendees: JSON.stringify(ev.attendees ?? []),
    });
  }

  // 6. Starlight Studios Data (Isolated Workspace 2)
  await db.insert(projects).values([
    {
      id: "mobile-app-launch",
      workspaceId: "ws-starlight",
      name: "Mobile App Launch",
      progress: 85,
      due: "Next Friday",
      owner: "Ava Thompson",
      status: "On track",
      overview: "Launch the native iOS and Android companion app with offline sync.",
      createdAt: now,
    },
    {
      id: "design-system-v2",
      workspaceId: "ws-starlight",
      name: "Design System v2",
      progress: 42,
      due: "End of month",
      owner: "Leo Martin",
      status: "Review",
      overview: "Upgrade component library to Tailwind v4 and unified dark mode theme.",
      createdAt: now,
    },
  ]);

  await db.insert(tasks).values([
    {
      id: "star-task-1",
      workspaceId: "ws-starlight",
      title: "Audit Figma design tokens",
      description: "Ensure color variables and typography map 1:1 to Tailwind CSS classes.",
      assignee: "Leo Martin",
      priority: "High",
      status: "In progress",
      due: "2026-09-08",
      projectId: "design-system-v2",
      projectName: "Design System v2",
      createdAt: now,
    },
    {
      id: "star-task-2",
      workspaceId: "ws-starlight",
      title: "Submit TestFlight build",
      description: "Bundle release candidate build and distribute to beta test group.",
      assignee: "Ava Thompson",
      priority: "High",
      status: "Pending",
      due: "2026-09-12",
      projectId: "mobile-app-launch",
      projectName: "Mobile App Launch",
      createdAt: now,
    },
  ]);

  await db.insert(conversations).values([
    {
      id: "conv-star-mobile",
      workspaceId: "ws-starlight",
      name: "Mobile Guild",
      initials: "MG",
      color: "bg-cyan-500",
      role: "Engineering",
      online: true,
      lastMessage: "TestFlight build #44 is approved and live for testers.",
      lastTimestamp: now,
      unread: 1,
    },
  ]);

  await db.insert(messages).values([
    {
      id: "msg-star-1",
      conversationId: "conv-star-mobile",
      sender: "Ava Thompson",
      content: "TestFlight build #44 is approved and live for testers.",
      timestamp: now,
    },
  ]);

  await db.insert(calendarEvents).values([
    {
      id: "ev-star-1",
      workspaceId: "ws-starlight",
      title: "Mobile App Demo",
      date: "2026-09-14",
      startTime: "15:00",
      endTime: "16:00",
      category: "Meeting",
      description: "Live walkthrough of native features for leadership.",
      attendees: JSON.stringify(["Ava Thompson", "Leo Martin"]),
    },
  ]);

  console.log("Database seeded successfully with demo users (ava@acme.com / leo@starlight.com) and workspaces!");
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
