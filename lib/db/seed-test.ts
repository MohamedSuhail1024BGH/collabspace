import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { resetDatabase } from "./seed";
import { db } from "./index";
import { users, workspaces, teamMembers, workspaceMembers, projects, projectMembers, projectActivity, tasks, conversations, messages, calendarEvents, notifications } from "./schema";
import { team, projectDirectory, taskBoard, conversations as initialConversations, calendarEvents as initialEvents } from "../../data/mock-data";
import { hashPasswordSync } from "./auth";
import { clearAllRateLimits } from "@/lib/auth/rate-limiter";

/**
 * seed-test.ts TRUNCATEs every table in its target database. Refuse to run
 * against the shared Supabase database unless explicitly forced, so a local
 * `npm run test:e2e` can never wipe shared data.
 */
function assertSafeDatabaseTarget(): void {
  let host = "";
  try {
    host = new URL(process.env.DATABASE_URL ?? "").host;
  } catch {
    // Missing or unparsable URL: the connection itself will fail later.
  }
  if (host.includes("supabase") && process.env.E2E_ALLOW_TRUNCATE !== "1") {
    console.error(
      `Refusing to truncate the shared database at ${host}.\n` +
        `Point DATABASE_URL at a disposable database, or set E2E_ALLOW_TRUNCATE=1 if destroying its data is intended.`
    );
    process.exit(1);
  }
}

async function seedTestData() {
  assertSafeDatabaseTarget();
  console.log("Setting up E2E test database...");
  await resetDatabase();
  await clearAllRateLimits();

  const now = new Date().toISOString();
  const defaultPasswordHash = hashPasswordSync("password123");

  await db.insert(users).values([
    { id: "usr-ava", email: "ava@acme.com", name: "Ava Thompson", passwordHash: defaultPasswordHash, avatar: "from-violet-500 to-indigo-600", createdAt: now, username: "avathompson", bio: "Product Director & Systems Architect" },
    { id: "usr-leo", email: "leo@starlight.com", name: "Leo Martin", passwordHash: defaultPasswordHash, avatar: "from-cyan-500 to-blue-600", createdAt: now, username: "leomartin", bio: "Full-stack Architect & Core Engineer" },
    { id: "usr-mia", email: "mia@acme.com", name: "Mia Chen", passwordHash: defaultPasswordHash, avatar: "from-violet-500 to-pink-600", createdAt: now, username: "miachen", bio: "Lead Product Designer & UX Researcher" },
    { id: "usr-omar", email: "omar@acme.com", name: "Omar Singh", passwordHash: defaultPasswordHash, avatar: "from-amber-500 to-orange-600", createdAt: now, username: "omarsingh", bio: "Principal Backend Systems Lead" },
    { id: "usr-sara", email: "sara@acme.com", name: "Sara Kim", passwordHash: defaultPasswordHash, avatar: "from-emerald-500 to-teal-600", createdAt: now, username: "sarakim", bio: "Customer Success & Operations Lead" },
    { id: "usr-useranon1", email: "useranon1@cspace.com", name: "USER_ANON", username: "useranon1", passwordHash: defaultPasswordHash, createdAt: now },
    { id: "usr-useradm1", email: "useradm1@cspace.com", name: "USER_ADMIN1", username: "useradm1", passwordHash: defaultPasswordHash, createdAt: now },
    { id: "usr-usermem1", email: "usermem1@cspace.com", name: "USER_MEMBER_1", username: "usermem1", passwordHash: defaultPasswordHash, createdAt: now },
    { id: "usr-usermem2", email: "usermem2@cspace.com", name: "USER_MEMBER_2", username: "usermem2", passwordHash: defaultPasswordHash, createdAt: now },
    { id: "usr-userview1", email: "userview1@cspace.com", name: "USER_VIEW_1", username: "userview1", passwordHash: defaultPasswordHash, createdAt: now },
    { id: "usr-anand", email: "anand@cspace.com", name: "Anand Verma", username: "anand", passwordHash: defaultPasswordHash, createdAt: now }
  ]);

  await db.insert(workspaces).values([
    { id: "ws-acme", name: "Acme Corporation", slug: "acme", plan: "Pro", createdAt: now, description: "Enterprise flagship workspace", isPublic: true },
    { id: "ws-starlight", name: "Starlight Studios", slug: "starlight", plan: "Enterprise", createdAt: now, description: "Creative studio workspace", isPublic: true },
    { id: "ws-collabspace", name: "CollabSpace", slug: "collabspace", description: "Main workspace", isPublic: true, plan: "Pro", createdAt: now }
  ]);

  for (const member of team) {
    const initials = (member.name.split(" ")[0]?.[0] ?? "") + (member.name.split(" ")[1]?.[0] ?? "");
    const id = `tm-${member.name.toLowerCase().replace(/\s+/g, "-")}`;
    await db.insert(teamMembers).values({
      id, name: member.name, role: member.role, initials, color: member.color, online: true,
    });
  }

  await db.insert(workspaceMembers).values([
    { id: "wm-acme-1", workspaceId: "ws-acme", userId: "usr-ava", role: "owner", joinedAt: now },
    { id: "wm-acme-2", workspaceId: "ws-acme", userId: "usr-leo", role: "admin", joinedAt: now },
    { id: "wm-acme-3", workspaceId: "ws-acme", userId: "usr-mia", role: "member", joinedAt: now },
    { id: "wm-acme-4", workspaceId: "ws-acme", userId: "usr-omar", role: "member", joinedAt: now },
    { id: "wm-acme-5", workspaceId: "ws-acme", userId: "usr-sara", role: "member", joinedAt: now },
    { id: "wm-star-1", workspaceId: "ws-starlight", userId: "usr-leo", role: "owner", joinedAt: now },
    { id: "wm-star-2", workspaceId: "ws-starlight", userId: "usr-ava", role: "member", joinedAt: now },
    { id: "wm-cs-1", workspaceId: "ws-collabspace", userId: "usr-useranon1", role: "owner", joinedAt: now },
    { id: "wm-cs-2", workspaceId: "ws-collabspace", userId: "usr-useradm1", role: "admin", joinedAt: now },
    { id: "wm-cs-3", workspaceId: "ws-collabspace", userId: "usr-usermem1", role: "member", joinedAt: now },
    { id: "wm-cs-3b", workspaceId: "ws-collabspace", userId: "usr-usermem2", role: "member", joinedAt: now },
    { id: "wm-cs-4", workspaceId: "ws-collabspace", userId: "usr-userview1", role: "viewer", joinedAt: now },
  ]);

  for (const proj of projectDirectory) {
    const ownerUserId =
      proj.owner === "Ava Thompson" ? "usr-ava" : proj.owner === "Leo Martin" ? "usr-leo" : null;
    await db.insert(projects).values({
      id: proj.id,
      workspaceId: "ws-acme",
      name: proj.name,
      progress: proj.progress,
      due: proj.due,
      owner: proj.owner,
      ownerUserId,
      status: proj.status,
      overview: proj.overview,
      createdAt: now,
    });
    for (let i = 0; i < proj.teamMembers.length; i++) {
      const tm = proj.teamMembers[i];
      const role = tm.role.toLowerCase().includes("lead") ? "lead" : "contributor";
      const userId = tm.name === "Ava Thompson" ? "usr-ava" : tm.name === "Leo Martin" ? "usr-leo" : tm.name === "Mia Chen" ? "usr-mia" : null;
      await db.insert(projectMembers).values({ id: `pm-${proj.id}-${i}`, projectId: proj.id, userId, name: tm.name, role, initials: tm.initials, color: tm.color });
    }
    for (let i = 0; i < proj.recentActivity.length; i++) {
      await db.insert(projectActivity).values({ id: `pa-${proj.id}-${i}`, projectId: proj.id, content: proj.recentActivity[i], createdAt: now });
    }
  }

  for (const task of taskBoard) {
    const assigneeUserId =
      task.assignee === "Ava Thompson"
        ? "usr-ava"
        : task.assignee === "Leo Martin"
        ? "usr-leo"
        : task.assignee === "Mia Chen"
        ? "usr-mia"
        : null;
    await db.insert(tasks).values({
      id: task.id,
      workspaceId: "ws-acme",
      title: task.title,
      description: task.description,
      assignee: task.assignee,
      assigneeUserId,
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
      type: "channel",
      participantIds: "[]",
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
      await db.insert(messages).values({ id: msg.id, conversationId: conv.id, sender: msg.sender, content: msg.content, timestamp: msg.timestamp });
    }
  }

  const directMessages = [
    {
      conv: {
        id: "conv-dm-leo",
        workspaceId: "ws-acme",
        type: "direct" as const,
        participantIds: JSON.stringify(["usr-ava", "usr-leo"]),
        name: "Leo Martin",
        initials: "LM",
        color: "bg-cyan-500",
        role: "Full-stack Architect",
        online: false,
        lastMessage: "Ready to test the sync engine!",
        lastTimestamp: "2026-08-18T13:00:00.000Z",
        unread: 0,
      },
      messages: [
        { id: "dm-l1", sender: "Leo Martin", content: "Hey Ava, do you have a moment to review the real-time sync pr?", timestamp: "2026-08-18T12:45:00.000Z" },
        { id: "dm-l2", sender: "Ava Thompson", content: "Sure Leo! Checking it now.", timestamp: "2026-08-18T12:50:00.000Z" },
        { id: "dm-l3", sender: "Leo Martin", content: "Ready to test the sync engine!", timestamp: "2026-08-18T13:00:00.000Z" },
      ],
    },
    {
      conv: {
        id: "conv-dm-mia",
        workspaceId: "ws-acme",
        type: "direct" as const,
        participantIds: JSON.stringify(["usr-ava", "usr-mia"]),
        name: "Mia Chen",
        initials: "MC",
        color: "bg-violet-500",
        role: "Lead Product Designer",
        online: false,
        lastMessage: "The new UI components look awesome.",
        lastTimestamp: "2026-08-18T14:10:00.000Z",
        unread: 1,
      },
      messages: [
        { id: "dm-m1", sender: "Mia Chen", content: "The new UI components look awesome.", timestamp: "2026-08-18T14:10:00.000Z" },
      ],
    },
  ];

  for (const dm of directMessages) {
    await db.insert(conversations).values(dm.conv);
    for (const msg of dm.messages) {
      await db.insert(messages).values({ id: msg.id, conversationId: dm.conv.id, sender: msg.sender, content: msg.content, timestamp: msg.timestamp });
    }
  }

  for (const ev of initialEvents) {
    await db.insert(calendarEvents).values({
      id: ev.id, workspaceId: "ws-acme", title: ev.title, date: ev.date, startTime: ev.startTime, endTime: ev.endTime ?? null, category: ev.category, description: ev.description ?? "", attendees: JSON.stringify(ev.attendees ?? []),
    });
  }

  await db.insert(projects).values([
    { id: "mobile-app-launch", workspaceId: "ws-starlight", name: "Mobile App Launch", progress: 85, due: "Next Friday", owner: "Ava Thompson", ownerUserId: "usr-ava", status: "On track", overview: "Launch the native iOS and Android companion app with offline sync.", createdAt: now },
    { id: "design-system-v2", workspaceId: "ws-starlight", name: "Design System v2", progress: 42, due: "End of month", owner: "Leo Martin", ownerUserId: "usr-leo", status: "Review", overview: "Upgrade component library to Tailwind v4 and unified dark mode theme.", createdAt: now },
  ]);

  await db.insert(notifications).values([
    {
      id: "notif-seed-1",
      userId: "usr-ava",
      workspaceId: "ws-acme",
      type: "invite",
      title: "Added to Acme Corporation",
      message: "Leo Martin added you to workspace Acme Corporation as owner.",
      link: "/start",
      isRead: false,
      createdAt: now,
    },
    {
      id: "notif-seed-2",
      userId: "usr-ava",
      workspaceId: "ws-acme",
      type: "task_assigned",
      title: "New Task Assigned",
      message: "Leo Martin assigned you to 'Design System audit' (Platform Infrastructure).",
      link: "/tasks",
      isRead: false,
      createdAt: now,
    },
    {
      id: "notif-seed-3",
      userId: "usr-ava",
      workspaceId: "ws-starlight",
      type: "info",
      title: "System Maintenance Notice",
      message: "CollabSpace scheduled maintenance will occur at 02:00 UTC.",
      link: "/",
      isRead: true,
      createdAt: now,
    },
  ]);

  console.log("Test database seeded!");
}

seedTestData().catch(console.error);
