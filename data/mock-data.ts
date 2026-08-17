export const navItems = [
  "Overview",
  "Projects",
  "Tasks",
  "Messages",
  "Calendar",
  "Reports",
];

export const stats = [
  { label: "Active workspaces", value: "12", change: "+3 this week" },
  { label: "Open tasks", value: "184", change: "18 due today" },
  { label: "Team velocity", value: "92%", change: "+6.4% vs last sprint" },
  { label: "Resolution rate", value: "87%", change: "2 day average" },
];

export type ProjectMember = {
  name: string;
  role: string;
  initials: string;
  color: string;
};

export type ProjectTask = {
  id: string;
  title: string;
  assignee: string;
  priority: "High" | "Medium" | "Low";
  status: string;
  due: string;
};

export type Project = {
  id: string;
  name: string;
  progress: number;
  due: string;
  owner: string;
  status: string;
  overview: string;
  teamMembers: ProjectMember[];
  recentActivity: string[];
  tasks: ProjectTask[];
};

export const projects = [
  { id: "website-redesign", name: "Website redesign", progress: 78, due: "This Friday", owner: "Ava", status: "On track" },
  { id: "mobile-app-qa", name: "Mobile app QA", progress: 56, due: "Next Tuesday", owner: "Leo", status: "Review" },
  { id: "operations-sync", name: "Operations sync", progress: 88, due: "Today", owner: "Mia", status: "Ready" },
];

export const tasks = [
  { title: "Finalize onboarding checklist", priority: "High", assignee: "Nina", time: "09:30" },
  { title: "Review customer feedback", priority: "Medium", assignee: "Eli", time: "11:00" },
  { title: "Prepare team retro notes", priority: "Low", assignee: "Sara", time: "14:15" },
  { title: "Audit sprint dependencies", priority: "High", assignee: "Omar", time: "16:45" },
];

export const team = [
  { name: "Ava Thompson", role: "Product lead", color: "bg-violet-500" },
  { name: "Leo Martin", role: "Design", color: "bg-cyan-500" },
  { name: "Mia Chen", role: "Operations", color: "bg-emerald-500" },
  { name: "Nina Patel", role: "Engineering", color: "bg-amber-500" },
];

export const activity = [
  "Ava approved the Q3 launch brief.",
  "Leo shared two new prototype variants.",
  "Mia closed the stakeholder review loop.",
  "Nina updated the release checklist.",
];

export const projectDirectory: Project[] = [
  {
    id: "brand-refresh",
    name: "Brand refresh",
    progress: 72,
    due: "This Friday",
    owner: "Ava",
    status: "On track",
    overview:
      "Refresh the product story and digital touchpoints to align the next launch with stronger conversion and clearer positioning across key customer segments.",
    teamMembers: [
      { name: "Ava Thompson", role: "Product lead", initials: "AT", color: "bg-violet-500" },
      { name: "Leo Martin", role: "Design", initials: "LM", color: "bg-cyan-500" },
      { name: "Nina Patel", role: "Engineering", initials: "NP", color: "bg-amber-500" },
      { name: "Mia Chen", role: "Operations", initials: "MC", color: "bg-emerald-500" },
    ],
    recentActivity: [
      "Ava approved the revised launch brief and release checkpoints.",
      "Leo shipped two final hero concepts for stakeholder review.",
      "Nina updated the implementation checklist for the marketing site rework.",
      "Mia closed the vendor dependency review for production assets.",
    ],
    tasks: [
      { id: "brand-task-1", title: "Finalize homepage messaging", assignee: "Ava", priority: "High", status: "In review", due: "Today" },
      { id: "brand-task-2", title: "Align CTA hierarchy", assignee: "Leo", priority: "Medium", status: "Queued", due: "Tomorrow" },
      { id: "brand-task-3", title: "QA landing page flow", assignee: "Nina", priority: "High", status: "Active", due: "Thu" },
      { id: "brand-task-4", title: "Confirm asset handoff", assignee: "Mia", priority: "Low", status: "Pending", due: "Fri" },
    ],
  },
  {
    id: "customer-portal",
    name: "Customer portal",
    progress: 64,
    due: "Next Monday",
    owner: "Nina",
    status: "Review",
    overview:
      "Improve the self-serve portal experience with clearer dashboards, faster status updates, and richer case resolution flows for active customers.",
    teamMembers: [
      { name: "Nina Patel", role: "Engineering", initials: "NP", color: "bg-amber-500" },
      { name: "Sara Kim", role: "Customer success", initials: "SK", color: "bg-pink-500" },
      { name: "Omar Singh", role: "QA", initials: "OS", color: "bg-indigo-500" },
      { name: "Leo Martin", role: "Design", initials: "LM", color: "bg-cyan-500" },
    ],
    recentActivity: [
      "Customer feedback review surfaced two high-value navigation gaps.",
      "Omar flagged copy inconsistencies across the support dashboard.",
      "Sara shared updated onboarding notes from the latest cohort.",
      "Nina completed the API contract sync for the status widgets.",
    ],
    tasks: [
      { id: "portal-task-1", title: "Refine dashboard cards", assignee: "Leo", priority: "High", status: "In review", due: "Today" },
      { id: "portal-task-2", title: "Patch support flows", assignee: "Omar", priority: "Medium", status: "Blocked", due: "Tomorrow" },
      { id: "portal-task-3", title: "Review feature parity", assignee: "Sara", priority: "High", status: "Active", due: "Thu" },
      { id: "portal-task-4", title: "Finalize launch notes", assignee: "Nina", priority: "Low", status: "Pending", due: "Fri" },
    ],
  },
  {
    id: "ops-automation",
    name: "Ops automation",
    progress: 81,
    due: "Today",
    owner: "Mia",
    status: "Ready",
    overview:
      "Automate the handoff rhythm between operations, reporting, and stakeholder updates to reduce manual follow-ups and accelerate decision loops.",
    teamMembers: [
      { name: "Mia Chen", role: "Operations", initials: "MC", color: "bg-emerald-500" },
      { name: "Ava Thompson", role: "Product lead", initials: "AT", color: "bg-violet-500" },
      { name: "Eli Park", role: "Analytics", initials: "EP", color: "bg-rose-500" },
      { name: "Sara Kim", role: "Customer success", initials: "SK", color: "bg-pink-500" },
    ],
    recentActivity: [
      "Mia synced the stakeholder status brief with the latest workflow map.",
      "Ava approved the automation thresholds for reporting triggers.",
      "Eli completed the dashboard refresh for weekly operations rollups.",
      "Sara validated the escalation logic for workflow handoffs.",
    ],
    tasks: [
      { id: "ops-task-1", title: "Confirm alert thresholds", assignee: "Mia", priority: "High", status: "Ready", due: "Today" },
      { id: "ops-task-2", title: "Review dashboard signals", assignee: "Eli", priority: "Medium", status: "Queued", due: "Tomorrow" },
      { id: "ops-task-3", title: "Build stakeholder summary", assignee: "Ava", priority: "High", status: "Active", due: "Thu" },
      { id: "ops-task-4", title: "Audit workflow dependencies", assignee: "Sara", priority: "Low", status: "Pending", due: "Fri" },
    ],
  },
  {
    id: "research-sprint",
    name: "Research sprint",
    progress: 46,
    due: "Next Wednesday",
    owner: "Leo",
    status: "Planning",
    overview:
      "Capture the next round of user research and synthesize signal from interviews to shape the roadmap and prioritization for the next iteration.",
    teamMembers: [
      { name: "Leo Martin", role: "Design", initials: "LM", color: "bg-cyan-500" },
      { name: "Ava Thompson", role: "Product lead", initials: "AT", color: "bg-violet-500" },
      { name: "Eli Park", role: "Analytics", initials: "EP", color: "bg-rose-500" },
      { name: "Omar Singh", role: "QA", initials: "OS", color: "bg-indigo-500" },
    ],
    recentActivity: [
      "Leo captured three new interview themes from the latest customer roundtable.",
      "Ava refined the research question set before the next synthesis workshop.",
      "Eli mapped the top friction signals against current roadmap priorities.",
      "Omar prepared the issue tracker for validation follow-ups.",
    ],
    tasks: [
      { id: "research-task-1", title: "Draft research questions", assignee: "Leo", priority: "High", status: "Planning", due: "Today" },
      { id: "research-task-2", title: "Review interview notes", assignee: "Ava", priority: "Medium", status: "Queued", due: "Tomorrow" },
      { id: "research-task-3", title: "Map customer pain points", assignee: "Eli", priority: "High", status: "Active", due: "Thu" },
      { id: "research-task-4", title: "Prepare synthesis deck", assignee: "Omar", priority: "Low", status: "Pending", due: "Fri" },
    ],
  },
];

export type TaskPriority = "High" | "Medium" | "Low";

export type DashboardTask = {
  id: string;
  title: string;
  description: string;
  assignee: string;
  priority: TaskPriority;
  status: string;
  due: string;
  project?: string;
};

export const taskBoard: DashboardTask[] = [
  {
    id: "task-1",
    title: "Finalize onboarding checklist",
    description: "Tighten the customer handoff checklist and align launch copy for the new team cycle.",
    priority: "High",
    assignee: "Nina",
    due: "2026-08-17",
    status: "In progress",
    project: "Brand refresh",
  },
  {
    id: "task-2",
    title: "Review customer feedback",
    description: "Cluster customer sentiment trends and summarize blockers across support and onboarding.",
    priority: "Medium",
    assignee: "Eli",
    due: "2026-08-18",
    status: "Pending",
    project: "Customer portal",
  },
  {
    id: "task-3",
    title: "Prepare team retro notes",
    description: "Capture the sprint wins, friction points, and follow-up actions for the next team review.",
    priority: "Low",
    assignee: "Sara",
    due: "2026-08-15",
    status: "Completed",
    project: "Ops automation",
  },
  {
    id: "task-4",
    title: "Audit sprint dependencies",
    description: "Validate cross-team dependencies and flag any unresolved handoff items for the release board.",
    priority: "High",
    assignee: "Omar",
    due: "2026-08-18",
    status: "Blocked",
    project: "Research sprint",
  },
  {
    id: "task-5",
    title: "Launch readiness checklist",
    description: "Confirm quality gates, stakeholder sign-off, and launch day responsibilities before release.",
    priority: "High",
    assignee: "Ava",
    due: "2026-08-16",
    status: "Review",
    project: "Brand refresh",
  },
  {
    id: "task-6",
    title: "QA dashboard interactions",
    description: "Validate the most important dashboard workflows and capture edge-case notes for QA handoff.",
    priority: "Medium",
    assignee: "Leo",
    due: "2026-08-19",
    status: "In progress",
    project: "Customer portal",
  },
  {
    id: "task-7",
    title: "Refresh stakeholder brief",
    description: "Summarize delivery milestones and blockers into a concise stakeholder-facing brief.",
    priority: "Low",
    assignee: "Mia",
    due: "2026-08-14",
    status: "Completed",
    project: "Ops automation",
  },
];

export const messageThreads = [
  { name: "Design team", preview: "Updated Figma prototypes are ready for review.", time: "2m ago", unread: 3 },
  { name: "Product crew", preview: "Launch milestones are aligned for Friday delivery.", time: "14m ago", unread: 1 },
  { name: "Engineering", preview: "We landed the API contract updates for shipping.", time: "1h ago", unread: 5 },
  { name: "Customer ops", preview: "Feedback clusters are summarized for the weekly brief.", time: "2h ago", unread: 0 },
];

export const calendarEvents = [
  { title: "Sprint planning", date: "May 3", time: "09:30", location: "Studio A", type: "Planning" },
  { title: "Stakeholder review", date: "May 3", time: "13:00", location: "Boardroom", type: "Review" },
  { title: "Design critique", date: "May 5", time: "11:00", location: "Workshop", type: "Design" },
  { title: "Launch rehearsal", date: "May 7", time: "15:30", location: "Ops room", type: "Launch" },
];

export const reportCards = [
  { title: "Delivery efficiency", value: "92%", trend: "+6.4%", summary: "Velocity is trending above the target range." },
  { title: "Customer feedback", value: "4.8/5", trend: "+0.3", summary: "Support sentiment improved after the release cycle." },
  { title: "Open blockers", value: "7", trend: "-2", summary: "Dependency conflicts are down from last week." },
  { title: "Team capacity", value: "84%", trend: "+5%", summary: "Focus time remains balanced across squads." },
];
