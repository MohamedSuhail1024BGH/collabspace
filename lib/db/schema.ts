import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

// --- Workspaces (Organizations) ---
export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").default(""),
  plan: text("plan").notNull().default("Pro"), // "Free" | "Pro" | "Enterprise"
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

// --- Users & Authentication ---
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").unique(),
  bio: text("bio"),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  createdAt: text("created_at").notNull(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_sessions_user_id").on(table.userId),
    index("idx_sessions_expires_at").on(table.expiresAt),
  ]
);

// --- Auth Rate Limits (Brute-Force & Lockout Protection) ---
export const authRateLimits = sqliteTable("auth_rate_limits", {
  key: text("key").primaryKey(), // "account:<email>" | "ip:<ip>"
  type: text("type").notNull(), // "account" | "ip"
  identifier: text("identifier").notNull(),
  attemptCount: integer("attempt_count").notNull().default(1),
  firstAttemptAt: text("first_attempt_at").notNull(),
  lastAttemptAt: text("last_attempt_at").notNull(),
  lockedUntil: text("locked_until"),
});

// --- Team Members ---
export const teamMembers = sqliteTable("team_members", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  initials: text("initials").notNull(),
  color: text("color").notNull(),
  online: integer("online", { mode: "boolean" }).notNull().default(false),
});

// --- Workspace Membership & RBAC ---
export const workspaceMembers = sqliteTable(
  "workspace_members",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"), // "owner" | "admin" | "member" | "viewer"
    joinedAt: text("joined_at").notNull(),
    status: text("status").notNull().default("active"), // "active" | "pending"
  },
  (table) => [
    uniqueIndex("idx_workspace_members_ws_user").on(
      table.workspaceId,
      table.userId
    ),
  ]
);

// --- Projects ---
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  progress: integer("progress").notNull().default(0),
  due: text("due").notNull(),
  owner: text("owner").notNull(),
  ownerUserId: text("owner_user_id").references(() => users.id, { onDelete: "set null" }),
  status: text("status").notNull().default("Planning"),
  overview: text("overview").notNull(),
  createdAt: text("created_at").notNull(),
});

export const projectMembers = sqliteTable(
  "project_members",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role").notNull().default("contributor"),
    initials: text("initials").notNull(),
    color: text("color").notNull(),
  },
  (table) => [
    uniqueIndex("idx_project_members_proj_user")
      .on(table.projectId, table.userId)
      .where(sql`user_id IS NOT NULL`),
  ]
);

export const projectActivity = sqliteTable("project_activity", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
});

// --- Tasks ---
export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  assignee: text("assignee").notNull().default("Unassigned"),
  assigneeUserId: text("assignee_user_id").references(() => users.id, { onDelete: "set null" }),
  priority: text("priority").notNull().default("Medium"), // "High" | "Medium" | "Low"
  status: text("status").notNull().default("Not started"),
  due: text("due").notNull(),
  projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
  projectName: text("project_name"),
  createdAt: text("created_at").notNull(),
});

// --- Conversations & Messages ---
export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("channel"), // "channel" | "direct"
  participantIds: text("participant_ids").default("[]"), // JSON array of user IDs for direct messages
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  color: text("color").notNull(),
  role: text("role").notNull(),
  online: integer("online", { mode: "boolean" }).notNull().default(false),
  lastMessage: text("last_message").notNull().default(""),
  lastTimestamp: text("last_timestamp").notNull(),
  unread: integer("unread").notNull().default(0),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  sender: text("sender").notNull(),
  content: text("content").notNull(),
  timestamp: text("timestamp").notNull(),
});

// --- Calendar Events ---
export const calendarEvents = sqliteTable("calendar_events", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    
    .references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  startTime: text("start_time").notNull(), // HH:MM
  endTime: text("end_time"),
  category: text("category").notNull(),
  description: text("description").default(""),
  attendees: text("attendees").notNull().default("[]"), // JSON string array
});

// --- Relations ---
export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  projects: many(projects),
  tasks: many(tasks),
  conversations: many(conversations),
  calendarEvents: many(calendarEvents),
}));

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  workspaces: many(workspaceMembers),
  projectMemberships: many(projectMembers),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [projects.workspaceId],
    references: [workspaces.id],
  }),
  members: many(projectMembers),
  activities: many(projectActivity),
  tasks: many(tasks),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
}));

export const projectActivityRelations = relations(projectActivity, ({ one }) => ({
  project: one(projects, {
    fields: [projectActivity.projectId],
    references: [projects.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [tasks.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [conversations.workspaceId],
    references: [workspaces.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

// --- Notifications ---
export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // "invite" | "task_assigned" | "info" | "system"
    title: text("title").notNull(),
    message: text("message").notNull(),
    link: text("link"),
    data: text("data"), // optional JSON metadata
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_notifications_user_id").on(table.userId),
    index("idx_notifications_is_read").on(table.isRead),
  ]
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [notifications.workspaceId],
    references: [workspaces.id],
  }),
}));

// --- Inferred Types ---
export const USER_ROLES = ["owner", "admin", "member", "viewer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PROJECT_ROLES = ["lead", "contributor", "reviewer", "viewer"] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

export type DbUser = typeof users.$inferSelect;
export type DbSession = typeof sessions.$inferSelect;
export type DbWorkspace = typeof workspaces.$inferSelect;
export type DbWorkspaceMember = typeof workspaceMembers.$inferSelect;
export type DbTeamMember = typeof teamMembers.$inferSelect;
export type DbProject = typeof projects.$inferSelect;
export type DbProjectMember = typeof projectMembers.$inferSelect;
export type DbProjectActivity = typeof projectActivity.$inferSelect;
export type DbTask = typeof tasks.$inferSelect;
export type DbConversation = typeof conversations.$inferSelect;
export type DbMessage = typeof messages.$inferSelect;
export type DbCalendarEvent = typeof calendarEvents.$inferSelect;
export type DbAuthRateLimit = typeof authRateLimits.$inferSelect;
export type DbNotification = typeof notifications.$inferSelect;

export type InsertUser = typeof users.$inferInsert;
export type InsertSession = typeof sessions.$inferInsert;
export type InsertWorkspace = typeof workspaces.$inferInsert;
export type InsertTask = typeof tasks.$inferInsert;
export type InsertProject = typeof projects.$inferInsert;
export type InsertMessage = typeof messages.$inferInsert;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;
export type InsertAuthRateLimit = typeof authRateLimits.$inferInsert;
export type InsertNotification = typeof notifications.$inferInsert;
