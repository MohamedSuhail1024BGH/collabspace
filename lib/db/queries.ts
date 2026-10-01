import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "./index";
import {
  calendarEvents,
  conversations,
  messages,
  projectActivity,
  projectMembers,
  projects,
  tasks,
  users,
  workspaceMembers,
  workspaces,
  notifications,
  type DbCalendarEvent,
  type DbConversation,
  type DbMessage,
  type DbProject,
  type DbTask,
  type DbTeamMember,
  type DbNotification,
} from "./schema";
import { getActiveWorkspaceId } from "./workspace";
import { classifyConversation, validateDirectConversation } from "@/lib/auth/dm-validator";
import { presenceTracker } from "@/lib/events/presence";

export async function getTeamMembers(workspaceId?: string): Promise<DbTeamMember[]> {
  const wsId = workspaceId ?? (await getActiveWorkspaceId());
  const members = await db
    .select({
      user: users,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(and(eq(workspaceMembers.workspaceId, wsId), eq(workspaceMembers.status, "active")));

  return members.map((r) => ({
    id: r.user.id,
    name: r.user.name,
    role: r.role,
    initials: r.user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "TM",
    color: r.user.avatar || "bg-violet-500",
    online: presenceTracker.isUserOnline(wsId, r.user.id),
  }));
}

export type FullProject = DbProject & {
  teamMembers: { id?: string; userId?: string | null; name: string; role: string; initials: string; color: string }[];
  recentActivity: string[];
  tasks: DbTask[];
};

export async function getProjects(workspaceId?: string): Promise<FullProject[]> {
  const wsId = workspaceId ?? (await getActiveWorkspaceId());
  const allProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.workspaceId, wsId))
    .orderBy(desc(projects.createdAt));

  const allMembers = await db.select().from(projectMembers);
  const allActivities = await db.select().from(projectActivity).orderBy(desc(projectActivity.createdAt));
  const allTasks = await db.select().from(tasks).where(eq(tasks.workspaceId, wsId));

  return allProjects.map((p) => ({
    ...p,
    teamMembers: allMembers
      .filter((m) => m.projectId === p.id)
      .map((m) => ({ id: m.id, userId: m.userId, name: m.name, role: m.role, initials: m.initials, color: m.color })),
    recentActivity: allActivities
      .filter((a) => a.projectId === p.id)
      .map((a) => a.content),
    tasks: allTasks.filter((t) => t.projectId === p.id),
  }));
}

export async function getProjectById(id: string, workspaceId?: string): Promise<FullProject | null> {
  const wsId = workspaceId ?? (await getActiveWorkspaceId());
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.workspaceId, wsId)))
    .limit(1);

  if (!project) return null;

  const members = await db
    .select()
    .from(projectMembers)
    .where(eq(projectMembers.projectId, id));

  const activities = await db
    .select()
    .from(projectActivity)
    .where(eq(projectActivity.projectId, id))
    .orderBy(desc(projectActivity.createdAt));

  const projectTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, id))
    .orderBy(desc(tasks.createdAt));

  return {
    ...project,
    teamMembers: members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.name,
      role: m.role,
      initials: m.initials,
      color: m.color,
    })),
    recentActivity: activities.map((a) => a.content),
    tasks: projectTasks,
  };
}

export async function getTasks(workspaceId?: string): Promise<DbTask[]> {
  const wsId = workspaceId ?? (await getActiveWorkspaceId());
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.workspaceId, wsId))
    .orderBy(desc(tasks.createdAt));
}

export type FullConversation = DbConversation & {
  messages: DbMessage[];
};

export async function getConversations(workspaceId?: string, currentUserId?: string): Promise<FullConversation[]> {
  const wsId = workspaceId ?? (await getActiveWorkspaceId());
  const [allConversations, allMessages, members, teamList] = await Promise.all([
    db.select().from(conversations).where(eq(conversations.workspaceId, wsId)),
    db.select().from(messages).orderBy(messages.timestamp),
    getWorkspaceMembers(wsId),
    getTeamMembers(wsId),
  ]);

  const results: FullConversation[] = [];

  for (const c of allConversations) {
    const classification = classifyConversation(c);

    // 1. Unknown or malformed type fails closed (omitted)
    if (classification === "invalid") {
      continue;
    }

    // 2. Direct message requires canonical validation
    if (classification === "direct") {
      if (!currentUserId) {
        continue;
      }

      const dmCheck = await validateDirectConversation(c, currentUserId);
      if (!dmCheck.valid) {
        continue;
      }

      const counterpartyId = dmCheck.otherUserId;
      const counterparty = members.find((m) => m.user.id === counterpartyId);

      if (counterparty) {
        const cpName = counterparty.user.name;
        const nameParts = cpName.trim().split(/\s+/);
        const cpInitials = (
          (nameParts[0]?.[0] ?? "") +
          (nameParts[1]?.[0] ?? nameParts[0]?.[1] ?? "")
        ).toUpperCase();

        const tm = teamList.find((t) => t.name.toLowerCase() === cpName.toLowerCase());
        const displayRole =
          tm?.role ||
          (counterparty.role === "owner"
            ? "Workspace Owner"
            : counterparty.role === "admin"
            ? "Administrator"
            : "Team Member");
        const displayColor = tm?.color || "bg-cyan-500";

        results.push({
          ...c,
          name: cpName,
          initials: cpInitials,
          role: displayRole,
          color: displayColor,
          online: presenceTracker.isUserOnline(wsId, counterpartyId),
          messages: allMessages.filter((m) => m.conversationId === c.id),
        });
      } else {
        results.push({
          ...c,
          online: counterpartyId ? presenceTracker.isUserOnline(wsId, counterpartyId) : false,
          messages: allMessages.filter((m) => m.conversationId === c.id),
        });
      }
    } else {
      // 3. Channels are visible to all workspace members
      results.push({
        ...c,
        online: false,
        messages: allMessages.filter((m) => m.conversationId === c.id),
      });
    }
  }

  return results;
}

export type ParsedCalendarEvent = Omit<DbCalendarEvent, "attendees"> & {
  attendees: string[];
};

export async function getCalendarEvents(workspaceId?: string): Promise<ParsedCalendarEvent[]> {
  const wsId = workspaceId ?? (await getActiveWorkspaceId());
  const events = await db
    .select()
    .from(calendarEvents)
    .where(eq(calendarEvents.workspaceId, wsId));

  return events.map((ev) => {
    let parsedAttendees: string[] = [];
    try {
      parsedAttendees = JSON.parse(ev.attendees);
    } catch {
      parsedAttendees = [];
    }
    return {
      ...ev,
      attendees: parsedAttendees,
    };
  });
}

export async function getDashboardOverview(workspaceId: string, userName?: string) {
  const wsId = workspaceId;
  const allProjects = await db.select().from(projects).where(eq(projects.workspaceId, wsId));
  const allTasks = await db.select().from(tasks).where(eq(tasks.workspaceId, wsId));
  const members = await getTeamMembers(wsId);
  const activities = await db
    .select({
      content: projectActivity.content,
      createdAt: projectActivity.createdAt,
    })
    .from(projectActivity)
    .innerJoin(projects, eq(projectActivity.projectId, projects.id))
    .where(eq(projects.workspaceId, wsId))
    .orderBy(desc(projectActivity.createdAt))
    .limit(5);

  const activeProjects = allProjects.filter((p) => p.status !== "Completed").length;
  const openTasks = allTasks.filter((t) => t.status !== "Completed").length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const tasksDueToday = allTasks.filter((t) => t.status !== "Completed" && t.due === todayStr).length;
  const completedTasks = allTasks.filter((t) => t.status === "Completed").length;
  const completionRate = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0;

  const stats = [
    { label: "Active Projects", value: String(activeProjects), change: "Current workload" },
    { label: "Open Tasks", value: String(openTasks), change: "Needs attention" },
    { label: "Due Today", value: String(tasksDueToday), change: "Priority items" },
    { label: "Completion Rate", value: `${completionRate}%`, change: "Overall progress" },
  ];

  // Filter tasks for the dashboard Priority Tasks section
  let priorityTasks = allTasks;
  if (userName) {
    priorityTasks = allTasks.filter((t) => t.assignee === userName);
  }
  // Sort by High priority first, then by due date
  priorityTasks.sort((a, b) => {
    if (a.priority === "High" && b.priority !== "High") return -1;
    if (b.priority === "High" && a.priority !== "High") return 1;
    return new Date(a.due).getTime() - new Date(b.due).getTime();
  });

  return {
    stats,
    projects: allProjects.slice(0, 3),
    team: members,
    tasks: priorityTasks.slice(0, 4),
    allTasks,
    activity: activities.map((a) => ({ content: a.content, createdAt: a.createdAt })),
  };
}

export type WorkspaceReportData = {
  summaryCards: { title: string; value: string; trend: string }[];
  projectPerformance: {
    id: string;
    name: string;
    status: string;
    progress: number;
    tasksCompleted: number;
    totalTasks: number;
    due: string;
    owner: string;
  }[];
  taskStatusBreakdown: { status: string; count: number; color?: string }[];
  totalTasks: number;
  teamPerformance: {
    name: string;
    role: string;
    initials: string;
    color: string;
    assigned: number;
    completed: number;
    completedPct: number;
  }[];
  activityTrends: { label: string; value: number }[];
};

export async function getWorkspaceReportsData(workspaceId?: string): Promise<WorkspaceReportData> {
  const wsId = workspaceId ?? (await getActiveWorkspaceId());
  const allProjects = await db.select().from(projects).where(eq(projects.workspaceId, wsId));
  const allTasks = await db.select().from(tasks).where(eq(tasks.workspaceId, wsId));
  const members = await getTeamMembers(wsId);

  const completedTasks = allTasks.filter((t) => t.status.toLowerCase() === "completed").length;
  const inProgressTasks = allTasks.filter((t) => t.status.toLowerCase() === "in progress").length;
  const notStartedTasks = allTasks.filter((t) => t.status.toLowerCase() === "not started").length;
  const reviewTasks = allTasks.filter((t) => t.status.toLowerCase() === "review").length;
  const pendingTasks = allTasks.filter((t) => t.status.toLowerCase() === "pending").length;
  const blockedTasks = allTasks.filter((t) => t.status.toLowerCase() === "blocked").length;

  const todayStr = new Date().toISOString().slice(0, 10);
  const overdueTasks = allTasks.filter(
    (t) => t.status.toLowerCase() !== "completed" && t.due && t.due < todayStr
  ).length;

  const totalTasks = allTasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const summaryCards = [
    { title: "Completion rate", value: `${completionRate}%`, trend: `${completedTasks}/${totalTasks} tasks` },
    { title: "Total projects", value: String(allProjects.length), trend: `${allProjects.filter((p) => p.progress === 100).length} finished` },
    { title: "Open tasks", value: String(totalTasks - completedTasks), trend: `${inProgressTasks} in progress` },
    { title: "Team members", value: String(members.length), trend: `${members.filter((m) => m.online).length} online` },
  ];

  const projectPerformance = allProjects.map((p) => {
    const projTasks = allTasks.filter((t) => t.projectId === p.id);
    const projDone = projTasks.filter((t) => t.status.toLowerCase() === "completed").length;
    return {
      id: p.id,
      name: p.name,
      status: p.status,
      progress: p.progress,
      tasksCompleted: projDone,
      totalTasks: projTasks.length,
      due: p.due,
      owner: p.owner,
    };
  });

  const taskStatusBreakdown = [
    { status: "Completed", count: completedTasks, color: "bg-emerald-500" },
    { status: "In progress", count: inProgressTasks, color: "bg-amber-500" },
    { status: "Not started", count: notStartedTasks, color: "bg-slate-600" },
    ...(reviewTasks > 0 ? [{ status: "Review", count: reviewTasks, color: "bg-purple-500" }] : []),
    ...(pendingTasks > 0 ? [{ status: "Pending", count: pendingTasks, color: "bg-blue-500" }] : []),
    ...(blockedTasks > 0 ? [{ status: "Blocked", count: blockedTasks, color: "bg-rose-500" }] : []),
    ...(overdueTasks > 0 ? [{ status: "Overdue", count: overdueTasks, color: "bg-red-500" }] : []),
  ];

  const teamPerformance = members.map((m) => {
    const assignedTasks = allTasks.filter(
      (t) =>
        t.assignee.toLowerCase().includes(m.name.toLowerCase()) ||
        m.name.toLowerCase().includes(t.assignee.toLowerCase())
    );
    const done = assignedTasks.filter((t) => t.status === "Completed").length;
    return {
      name: m.name,
      role: m.role,
      initials: m.initials,
      color: m.color,
      assigned: assignedTasks.length,
      completed: done,
      completedPct: assignedTasks.length > 0 ? Math.round((done / assignedTasks.length) * 100) : 100,
    };
  });

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const dayCounts: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 };

  for (const t of allTasks) {
    if (t.status.toLowerCase() === "completed" && t.createdAt) {
      const d = new Date(t.createdAt);
      if (!isNaN(d.getTime())) {
        const dayKey = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
        if (dayKey in dayCounts) {
          dayCounts[dayKey] = (dayCounts[dayKey] || 0) + 1;
        }
      }
    }
  }

  const activityTrends = weekdays.map((label) => ({
    label,
    value: dayCounts[label] || 0,
  }));

  return {
    summaryCards,
    projectPerformance,
    taskStatusBreakdown,
    totalTasks,
    teamPerformance,
    activityTrends,
  };
}

export async function searchUsers(query: string, workspaceId?: string) {
  const cleanQuery = query.trim().toLowerCase().replace(/^@/, "");
  if (!cleanQuery || !workspaceId) return [];

  const wsUsers = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      avatar: users.avatar,
      bio: users.bio,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId));

  return wsUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(cleanQuery) ||
      (u.username && u.username.toLowerCase().includes(cleanQuery)) ||
      u.email.toLowerCase().includes(cleanQuery)
  );
}

export async function searchWorkspaces(query: string) {
  const cleanQuery = query.trim().toLowerCase().replace(/^#/, "");
  const allWs = await db.select().from(workspaces);
  const allMembers = await db.select().from(workspaceMembers);

  const matched = cleanQuery
    ? allWs.filter(
        (w) =>
          w.isPublic &&
          (w.name.toLowerCase().includes(cleanQuery) ||
            w.slug.toLowerCase().includes(cleanQuery) ||
            (w.description && w.description.toLowerCase().includes(cleanQuery)))
      )
    : allWs.filter((w) => w.isPublic);

  return matched.map((w) => ({
    ...w,
    memberCount: allMembers.filter((m) => m.workspaceId === w.id).length,
  }));
}

export async function getWorkspaceMembers(workspaceId: string) {
  const rows = await db
    .select({
      membershipId: workspaceMembers.id,
      role: workspaceMembers.role,
      status: workspaceMembers.status,
      joinedAt: workspaceMembers.joinedAt,
      user: {
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        avatar: users.avatar,
      },
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(asc(workspaceMembers.joinedAt));

  return rows;
}

export async function getUserWorkspacesWithDetails(userId: string) {
  const userMemberships = await db
    .select({
      workspace: workspaces,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.status, "active")));

  const allMembers = await db.select().from(workspaceMembers);
  const allProjects = await db.select().from(projects);

  return userMemberships.map(({ workspace, role }) => ({
    ...workspace,
    userRole: role,
    memberCount: allMembers.filter((m) => m.workspaceId === workspace.id && m.status === "active").length,
    projectCount: allProjects.filter((p) => p.workspaceId === workspace.id).length,
  }));
}

export async function searchUsersForInvite(query: string, workspaceId: string) {
  const cleanQuery = query.trim().toLowerCase().replace(/^@/, "");
  if (!cleanQuery || !workspaceId) return [];

  const currentMembers = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId));

  const existingMemberIds = new Set(currentMembers.map((m) => m.userId));

  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      avatar: users.avatar,
      bio: users.bio,
    })
    .from(users);

  return allUsers.filter(
    (u) =>
      !existingMemberIds.has(u.id) &&
      (u.name.toLowerCase().includes(cleanQuery) ||
        (u.username && u.username.toLowerCase().includes(cleanQuery)) ||
        u.email.toLowerCase().includes(cleanQuery))
  );
}

export async function getUserNotifications(userId: string): Promise<DbNotification[]> {
  if (!userId) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));
}

export async function createNotification(data: {
  userId: string;
  workspaceId?: string;
  type: "invite" | "task_assigned" | "info" | "system";
  title: string;
  message: string;
  link?: string;
  data?: string;
}) {
  const notifId = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  await db.insert(notifications).values({
    id: notifId,
    userId: data.userId,
    workspaceId: data.workspaceId,
    type: data.type,
    title: data.title,
    message: data.message,
    link: data.link,
    data: data.data,
    isRead: false,
    createdAt: now,
  });
  return notifId;
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllNotificationsAsRead(userId: string) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, userId));
}

