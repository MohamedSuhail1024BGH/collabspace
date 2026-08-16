import {
  activity,
  navItems,
  projects,
  stats,
  tasks,
  team,
} from "@/data/mock-data";
import { ActivityItem } from "@/components/dashboard/ActivityItem";
import { Header } from "@/components/dashboard/Header";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { StatCard } from "@/components/dashboard/StatCard";
import { TaskRow } from "@/components/dashboard/TaskRow";
import { TeamMember } from "@/components/dashboard/TeamMember";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-8">
        <Sidebar navItems={navItems} />

        <main className="flex-1">
          <Header title="Product overview" />

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
                  <StatCard
                    key={stat.label}
                    label={stat.label}
                    value={stat.value}
                    change={stat.change}
                  />
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
                  <ProjectCard key={project.name} project={project} />
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
                  <TeamMember key={member.name} member={member} />
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
                  <TaskRow key={task.title} task={task} />
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
                  <ActivityItem key={item} item={item} />
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
