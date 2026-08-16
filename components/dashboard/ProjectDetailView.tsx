import Link from "next/link";

import type { Project } from "@/data/mock-data";

const priorityStyles = {
  High: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  Medium: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  Low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
} as const;

export function ProjectDetailView({ project }: { project: Project }) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-violet-200">Project detail</p>
            <h3 className="mt-3 text-3xl font-semibold text-white">{project.name}</h3>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/projects"
              className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 transition hover:border-violet-500/40 hover:text-white"
            >
              Back to projects
            </Link>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              {project.status}
            </span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Owner</p>
            <p className="mt-3 text-xl font-semibold text-white">{project.owner}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Progress</p>
            <p className="mt-3 text-xl font-semibold text-white">{project.progress}%</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Due date</p>
            <p className="mt-3 text-xl font-semibold text-white">{project.due}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Health</p>
            <p className="mt-3 text-xl font-semibold text-white">{project.progress >= 70 ? "Strong" : project.progress >= 50 ? "Steady" : "Needs focus"}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Project overview</h3>
              <span className="text-xs text-slate-400">Summary</span>
            </div>
            <p className="text-base leading-7 text-slate-300">{project.overview}</p>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                <span>Overall progress</span>
                <span>{project.progress}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Recent activity</h3>
              <span className="text-xs text-slate-400">Updated today</span>
            </div>

            <div className="space-y-3">
              {project.recentActivity.map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-300">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-violet-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Team members</h3>
              <span className="text-xs text-slate-400">{project.teamMembers.length} people</span>
            </div>

            <div className="space-y-3">
              {project.teamMembers.map((member) => (
                <div key={member.name} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium text-white ${member.color}`}>
                      {member.initials}
                    </div>
                    <div>
                      <p className="font-medium text-white">{member.name}</p>
                      <p className="text-xs text-slate-400">{member.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Associated tasks</h3>
              <span className="text-xs text-slate-400">{project.tasks.length} tasks</span>
            </div>

            <div className="space-y-3">
              {project.tasks.map((task) => (
                <div key={task.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-medium text-white">{task.title}</p>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${priorityStyles[task.priority]}`}>
                      {task.priority}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{task.assignee}</span>
                    <span>{task.status}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">Due {task.due}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
