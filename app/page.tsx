import Link from "next/link";
import { ActivityItem } from "@/components/dashboard/ActivityItem";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { TaskRow } from "@/components/dashboard/TaskRow";
import { TeamMember } from "@/components/dashboard/TeamMember";
import type { DashboardTask, TaskPriority } from "@/data/mock-data";
import { getDashboardOverview } from "@/lib/db/queries";
import { getActiveWorkspace } from "@/lib/db/workspace";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const activeWorkspace = await getActiveWorkspace();
  if (!activeWorkspace) {
    redirect("/start");
  }

  const { stats, projects, team, tasks, activity } = await getDashboardOverview(
    activeWorkspace.id,
    user.name
  );

  const formattedTasks: DashboardTask[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    assignee: t.assignee,
    priority: t.priority as TaskPriority,
    status: t.status,
    due: t.due,
    project: t.projectName ?? "General",
  }));

  return (
    <>
      <section className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/70 p-6 shadow-2xl shadow-slate-950/20">
        <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr] lg:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-violet-200">Workspace Overview</p>
            <h3 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Welcome to {activeWorkspace.name}
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
            <Link href="/projects" className="text-sm text-violet-300 hover:text-violet-200">
              View all
            </Link>
          </div>

          <div className="space-y-4">
            {projects.length > 0 ? (
              projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))
            ) : (
              <div
                data-testid="no-featured-projects"
                className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-6 text-center text-sm text-slate-400"
              >
                No Featured Projects here
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Team updates</h3>
            <span className="rounded-full bg-violet-500/10 px-2 py-1 text-xs text-violet-200">
              {team.filter((m) => m.online).length} online
            </span>
          </div>

          <div className="space-y-3">
            {team.length > 0 ? (
              team.map((member) => (
                <TeamMember
                  key={member.id}
                  member={{
                    name: member.name,
                    role: member.role,
                    color: member.color,
                  }}
                />
              ))
            ) : (
              <div
                data-testid="no-team-members"
                className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-6 text-center text-sm text-slate-400"
              >
                No Team Members here
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Priority tasks</h3>
            <Link href="/tasks" className="text-sm text-violet-300 hover:text-violet-200">
              Add task
            </Link>
          </div>

          <div className="space-y-3">
            {formattedTasks.length > 0 ? (
              formattedTasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))
            ) : (
              <div
                data-testid="no-priority-tasks"
                className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-6 text-center text-sm text-slate-400"
              >
                No Priority Tasks here
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Activity</h3>
            <span className="text-xs text-slate-400">Today</span>
          </div>

          <div className="space-y-3">
            {activity.length > 0 ? (
              activity.map((item, idx) => (
                <ActivityItem key={`${item}-${idx}`} item={item} />
              ))
            ) : (
              <div
                data-testid="no-activity"
                className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-6 text-center text-sm text-slate-400"
              >
                No Activity here
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
