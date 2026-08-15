const navItems = [
  "Overview",
  "Projects",
  "Tasks",
  "Messages",
  "Calendar",
  "Reports",
];

const stats = [
  { label: "Active workspaces", value: "12", change: "+3 this week" },
  { label: "Open tasks", value: "184", change: "18 due today" },
  { label: "Team velocity", value: "92%", change: "+6.4% vs last sprint" },
  { label: "Resolution rate", value: "87%", change: "2 day average" },
];

const projects = [
  { name: "Website redesign", progress: 78, due: "This Friday", owner: "Ava" },
  { name: "Mobile app QA", progress: 56, due: "Next Tuesday", owner: "Leo" },
  { name: "Operations sync", progress: 88, due: "Today", owner: "Mia" },
];

const tasks = [
  { title: "Finalize onboarding checklist", priority: "High", assignee: "Nina", time: "09:30" },
  { title: "Review customer feedback", priority: "Medium", assignee: "Eli", time: "11:00" },
  { title: "Prepare team retro notes", priority: "Low", assignee: "Sara", time: "14:15" },
  { title: "Audit sprint dependencies", priority: "High", assignee: "Omar", time: "16:45" },
];

const team = [
  { name: "Ava Thompson", role: "Product lead", color: "bg-violet-500" },
  { name: "Leo Martin", role: "Design", color: "bg-cyan-500" },
  { name: "Mia Chen", role: "Operations", color: "bg-emerald-500" },
  { name: "Nina Patel", role: "Engineering", color: "bg-amber-500" },
];

const activity = [
  "Ava approved the Q3 launch brief.",
  "Leo shared two new prototype variants.",
  "Mia closed the stakeholder review loop.",
  "Nina updated the release checklist.",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-8">
        <aside className="hidden w-72 shrink-0 rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/30 lg:flex lg:flex-col">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-lg font-semibold text-white">
              C
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Workspace</p>
              <h1 className="text-lg font-semibold text-white">CollabSpace</h1>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item, index) => (
              <button
                key={item}
                type="button"
                className={[
                  "flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm transition",
                  index === 0
                    ? "bg-violet-500/15 text-violet-100 ring-1 ring-inset ring-violet-400/40"
                    : "text-slate-300 hover:bg-white/5 hover:text-white",
                ].join(" ")}
              >
                <span>{item}</span>
                {index === 0 ? <span className="text-xs text-violet-200">Live</span> : null}
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-violet-200">Focus sprint</p>
            <p className="mt-3 text-xl font-semibold text-white">Launch readiness</p>
            <p className="mt-2 text-sm text-slate-300">12 milestones left before the next release.</p>
          </div>
        </aside>

        <main className="flex-1">
          <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/20 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-400">Good morning</p>
              <h2 className="text-2xl font-semibold text-white">Product overview</h2>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto">
              <div className="hidden rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-300 sm:block">
                Search project...
              </div>
              <button
                type="button"
                className="rounded-2xl bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-400"
              >
                New report
              </button>
            </div>
          </header>

          <section className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/70 p-6 shadow-2xl shadow-slate-950/20">
            <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr] lg:items-end">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-violet-200">Quarterly momentum</p>
                <h3 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Ship more, together.
                </h3>
                <p className="mt-4 max-w-xl text-base text-slate-300">
                  Align projects, surface blockers early, and keep teams moving with a shared workspace built for focused execution.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {stats.slice(0, 2).map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-sm text-slate-400">{stat.label}</p>
                    <p className="mt-3 text-3xl font-semibold text-white">{stat.value}</p>
                    <p className="mt-2 text-xs text-emerald-300">{stat.change}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Featured projects</h3>
                <button type="button" className="text-sm text-violet-300 hover:text-violet-200">
                  View all
                </button>
              </div>

              <div className="space-y-4">
                {projects.map((project) => (
                  <div key={project.name} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-base font-medium text-white">{project.name}</p>
                        <p className="mt-1 text-sm text-slate-400">Owner: {project.owner}</p>
                      </div>
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                        {project.due}
                      </span>
                    </div>

                    <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                      <span>Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Team updates</h3>
                <span className="rounded-full bg-violet-500/10 px-2 py-1 text-xs text-violet-200">4 online</span>
              </div>

              <div className="space-y-3">
                {team.map((member) => (
                  <div key={member.name} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${member.color} text-xs font-semibold text-white`}>
                      {member.name
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{member.name}</p>
                      <p className="text-xs text-slate-400">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Priority tasks</h3>
                <button type="button" className="text-sm text-violet-300 hover:text-violet-200">
                  Add task
                </button>
              </div>

              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.title} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-3 w-3 rounded-full bg-cyan-400" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium text-white">{task.title}</p>
                        <p className="text-xs text-slate-400">{task.assignee} · {task.time}</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-amber-200">
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Activity</h3>
                <span className="text-xs text-slate-400">Today</span>
              </div>

              <div className="space-y-3">
                {activity.map((item) => (
                  <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-violet-500" aria-hidden="true" />
                    <p className="text-sm text-slate-200">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
