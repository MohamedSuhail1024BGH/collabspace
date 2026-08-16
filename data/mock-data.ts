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

export const projects = [
  { name: "Website redesign", progress: 78, due: "This Friday", owner: "Ava" },
  { name: "Mobile app QA", progress: 56, due: "Next Tuesday", owner: "Leo" },
  { name: "Operations sync", progress: 88, due: "Today", owner: "Mia" },
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

export const projectDirectory = [
  { name: "Brand refresh", progress: 72, due: "This Friday", owner: "Ava", status: "On track" },
  { name: "Customer portal", progress: 64, due: "Next Monday", owner: "Nina", status: "Review" },
  { name: "Ops automation", progress: 81, due: "Today", owner: "Mia", status: "Ready" },
  { name: "Research sprint", progress: 46, due: "Next Wednesday", owner: "Leo", status: "Planning" },
];

export const taskBoard = [
  { title: "Create onboarding email", priority: "High", assignee: "Nina", due: "Today", status: "In review" },
  { title: "Polish launch checklist", priority: "Medium", assignee: "Mia", due: "Tomorrow", status: "Queued" },
  { title: "Review support findings", priority: "High", assignee: "Eli", due: "Thu", status: "Blocked" },
  { title: "Prepare roadmap update", priority: "Low", assignee: "Ava", due: "Fri", status: "Draft" },
  { title: "Audit handoff notes", priority: "Medium", assignee: "Sara", due: "Mon", status: "Pending" },
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
