import { and, desc, eq } from "drizzle-orm";
import { db } from "./index";
import {
  calendarEvents,
  conversations,
  messages,
  projectActivity,
  projectMembers,
  projects,
  tasks,
  teamMembers,
  users,
  workspaceMembers,
  type DbCalendarEvent,
  type DbConversation,
  type DbMessage,
  type DbProject,
  type DbTask,
  type DbTeamMember,
} from "./schema";
import { ensureTables } from "./seed";
import { getActiveWorkspaceId } from "./workspace";

// Ensure tables exist whenever queries are initialized
ensureTables();

export async function getTeamMembers(workspaceId?: string): Promise<DbTeamMember[]> {
  const wsId = workspaceId ?? (await getActiveWorkspaceId());
  const members = await db
    .select({
      user: users,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, wsId));

  if (members.length > 0) {
    return members.map((r) => ({
      id: r.user.id,
      name: r.user.name,
      role: r.role,
      initials: r.user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "TM",
      color: r.user.avatar || "bg-violet-500",
      online: true,
    }));
  }

  return db.select().from(teamMembers);
}

export type FullProject = DbProject & {
  teamMembers: { name: string; role: string; initials: string; color: string }[];
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
      .map((m) => ({ name: m.name, role: m.role, initials: m.initials, color: m.color })),
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
    teamMembers: members.map((m) => ({ name: m.name, role: m.role, initials: m.initials, color: m.color })),
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

export async function getConversations(workspaceId?: string): Promise<FullConversation[]> {
  const wsId = workspaceId ?? (await getActiveWorkspaceId());
  const allConversations = await db
    .select()
    .from(conversations)
    .where(eq(conversations.workspaceId, wsId));

  const allMessages = await db.select().from(messages).orderBy(messages.timestamp);

  return allConversations.map((c) => ({
    ...c,
    messages: allMessages.filter((m) => m.conversationId === c.id),
  }));
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

export async function getDashboardOverview(workspaceId?: string) {
  const wsId = workspaceId ?? (await getActiveWorkspaceId());
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

  const completedTasks = allTasks.filter((t) => t.status === "Completed").length;
  const resolutionRate = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 85;

  const stats = [
    { label: "Active workspaces", value: "12", change: "+3 this week" },
    { label: "Open tasks", value: String(allTasks.length), change: `${allTasks.filter((t) => t.due === "Today").length} due today` },
    { label: "Team velocity", value: "92%", change: "+6.4% vs last sprint" },
    { label: "Resolution rate", value: `${resolutionRate}%`, change: "2 day average" },
  ];

  return {
    stats,
    projects: allProjects.slice(0, 3),
    team: members,
    tasks: allTasks.slice(0, 4),
    activity: activities.map((a) => a.content),
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

  const completedTasks = allTasks.filter((t) => t.status === "Completed").length;
  const inProgressTasks = allTasks.filter((t) => t.status === "In progress").length;
  const notStartedTasks = allTasks.filter((t) => t.status === "Not started").length;
  const blockedTasks = allTasks.filter((t) => t.status === "Blocked").length;

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
    const projDone = projTasks.filter((t) => t.status === "Completed").length;
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
    ...(blockedTasks > 0 ? [{ status: "Blocked", count: blockedTasks, color: "bg-rose-500" }] : []),
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

  const activityTrends = [
    { label: "Mon", value: Math.min(allTasks.length, 2) },
    { label: "Tue", value: Math.min(allTasks.length, 3) },
    { label: "Wed", value: Math.min(allTasks.length, 5) },
    { label: "Thu", value: Math.min(allTasks.length, 4) },
    { label: "Fri", value: completedTasks },
  ];

  return {
    summaryCards,
    projectPerformance,
    taskStatusBreakdown,
    totalTasks,
    teamPerformance,
    activityTrends,
  };
}
