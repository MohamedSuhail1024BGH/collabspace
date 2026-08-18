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

export type Message = {
  id: string;
  sender: string; // 'Me' or participant name
  content: string;
  timestamp: string; // ISO or human-friendly string
};

export type Conversation = {
  id: string;
  name: string;
  initials: string;
  color: string; // tailwind bg color class
  role: string;
  online: boolean;
  lastMessage: string;
  lastTimestamp: string;
  unread: number;
  messages: Message[];
};

export const conversations: Conversation[] = [
  {
    id: "conv-design",
    name: "Design team",
    initials: "DT",
    color: "bg-cyan-500",
    role: "Design",
    online: true,
    lastMessage: "Updated Figma prototypes are ready for review.",
    lastTimestamp: "2026-08-18T12:30:00.000Z",
    unread: 3,
    messages: [
      { id: "m1", sender: "Ava Thompson", content: "Hey team — updated the hero exploration in Figma.", timestamp: "2026-08-18T11:40:00.000Z" },
      { id: "m2", sender: "Leo Martin", content: "Nice — I left comments on the spacing and CTA.", timestamp: "2026-08-18T12:05:00.000Z" },
      { id: "m3", sender: "Me", content: "I'll review and push fixes by EOD.", timestamp: "2026-08-18T12:18:00.000Z" },
      { id: "m4", sender: "Ava Thompson", content: "Updated Figma prototypes are ready for review.", timestamp: "2026-08-18T12:30:00.000Z" },
    ],
  },
  {
    id: "conv-product",
    name: "Product crew",
    initials: "PC",
    color: "bg-violet-500",
    role: "Product",
    online: false,
    lastMessage: "Launch milestones are aligned for Friday delivery.",
    lastTimestamp: "2026-08-18T12:10:00.000Z",
    unread: 1,
    messages: [
      { id: "p1", sender: "Mia Chen", content: "Is the launch checklist final?", timestamp: "2026-08-18T09:40:00.000Z" },
      { id: "p2", sender: "Ava Thompson", content: "Almost — just waiting on analytics sign-off.", timestamp: "2026-08-18T10:05:00.000Z" },
      { id: "p3", sender: "Me", content: "I'll sync with Eli and confirm before noon.", timestamp: "2026-08-18T11:01:00.000Z" },
      { id: "p4", sender: "Mia Chen", content: "Launch milestones are aligned for Friday delivery.", timestamp: "2026-08-18T12:10:00.000Z" },
    ],
  },
  {
    id: "conv-eng",
    name: "Engineering",
    initials: "EN",
    color: "bg-amber-500",
    role: "Engineering",
    online: true,
    lastMessage: "We landed the API contract updates for shipping.",
    lastTimestamp: "2026-08-18T11:05:00.000Z",
    unread: 5,
    messages: [
      { id: "e1", sender: "Omar Singh", content: "PR queued for review.", timestamp: "2026-08-18T09:05:00.000Z" },
      { id: "e2", sender: "Nina Patel", content: "I ran the integration tests locally — all green.", timestamp: "2026-08-18T09:42:00.000Z" },
      { id: "e3", sender: "Me", content: "Great — I'll merge after the last sign-off.", timestamp: "2026-08-18T10:12:00.000Z" },
      { id: "e4", sender: "Omar Singh", content: "We landed the API contract updates for shipping.", timestamp: "2026-08-18T11:05:00.000Z" },
    ],
  },
  {
    id: "conv-ops",
    name: "Customer ops",
    initials: "CO",
    color: "bg-emerald-500",
    role: "Customer success",
    online: false,
    lastMessage: "Feedback clusters are summarized for the weekly brief.",
    lastTimestamp: "2026-08-17T16:20:00.000Z",
    unread: 0,
    messages: [
      { id: "o1", sender: "Sara Kim", content: "Can we add a section for sentiment trends?", timestamp: "2026-08-17T14:05:00.000Z" },
      { id: "o2", sender: "Me", content: "Yes — I'll draft a template this afternoon.", timestamp: "2026-08-17T15:12:00.000Z" },
      { id: "o3", sender: "Sara Kim", content: "Feedback clusters are summarized for the weekly brief.", timestamp: "2026-08-17T16:20:00.000Z" },
    ],
  },
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
