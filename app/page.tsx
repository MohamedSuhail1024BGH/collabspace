import Link from "next/link";
import { ActivityItem } from "@/components/dashboard/ActivityItem";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { TaskRow } from "@/components/dashboard/TaskRow";
import { TeamMember } from "@/components/dashboard/TeamMember";
import { ProjectTimelineWidget } from "@/components/dashboard/ProjectTimelineWidget";
import { WorkloadChartWidget } from "@/components/dashboard/WorkloadChartWidget";
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

  const mappedTeam = team.map((m) => ({
    name: m.name,
    role: m.role,
    initials: m.initials,
    color: m.color,
  }));

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Top Command Action Bar (Stitch Precision Engineering Dark) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-outline/10">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface">Welcome to {activeWorkspace.name}</h1>
            <span className="font-mono text-[11px] text-on-surface-variant">SPRINT-34 · CYCLE ACTIVE</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-high text-secondary font-mono text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            <span>All systems nominal</span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto text-xs">
          <Link
            href="/tasks"
            className="flex items-center gap-1.5 bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-3 py-1 rounded font-medium text-xs transition shadow-sm"
          >
            <span>Quick Issue</span>
            <kbd className="px-1 bg-surface-container-lowest text-primary text-[10px] rounded font-mono">C</kbd>
          </Link>
        </div>
      </div>

      {/* Metric Strips (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            change={stat.change}
          />
        ))}
      </div>

      {/* Primary Row: Project Timeline Gantt & Workload Distribution */}
      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <ProjectTimelineWidget
          tasks={tasks.map((t) => ({
            id: t.id,
            title: t.title,
            assignee: t.assignee,
            priority: t.priority as "High" | "Medium" | "Low",
            status: t.status,
            due: t.due,
          }))}
          teamMembers={mappedTeam}
        />
        <WorkloadChartWidget members={mappedTeam} />
      </section>

      {/* Secondary Row: Priority Tasks & Featured Projects */}
      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        {/* Priority Tasks */}
        <div className="rounded bg-surface-container-low border border-outline/20 p-4 transition-all">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-on-surface">Priority tasks</h2>
              <p className="text-[11px] font-mono text-on-surface-variant">Immediate action items requiring focus</p>
            </div>
            <Link
              href="/tasks"
              className="text-xs font-mono font-medium text-primary hover:underline transition"
            >
              Add task &rarr;
            </Link>
          </div>

          <div className="space-y-2">
            {formattedTasks.length > 0 ? (
              formattedTasks.slice(0, 5).map((task) => (
                <TaskRow key={task.id} task={task} />
              ))
            ) : (
              <div
                data-testid="no-priority-tasks"
                className="rounded border border-dashed border-outline/20 bg-surface-container-lowest p-6 text-center text-xs text-on-surface-variant font-mono"
              >
                No Priority Tasks here
              </div>
            )}
          </div>
        </div>

        {/* Featured Projects */}
        <div className="rounded bg-surface-container-low border border-outline/20 p-4 transition-all">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-on-surface">Featured projects</h2>
              <p className="text-[11px] font-mono text-on-surface-variant">High-priority organizational initiatives</p>
            </div>
            <Link
              href="/projects"
              className="text-xs font-mono font-medium text-primary hover:underline transition"
            >
              View all &rarr;
            </Link>
          </div>

          <div className="space-y-2.5">
            {projects.length > 0 ? (
              projects.slice(0, 3).map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))
            ) : (
              <div
                data-testid="no-featured-projects"
                className="rounded border border-dashed border-outline/20 bg-surface-container-lowest p-6 text-center text-xs text-on-surface-variant font-mono"
              >
                No Featured Projects here
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Bento Row 4: Team Updates & Activity */}
      <section className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        {/* Team Updates */}
        <div className="rounded bg-surface-container-low border border-outline/20 p-4 transition-all">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-on-surface">Team updates</h2>
            <span className="rounded bg-surface-container-high px-2 py-0.5 text-xs font-mono text-secondary">
              {team.filter((m) => m.online).length} online
            </span>
          </div>

          <div className="space-y-2">
            {team.length > 0 ? (
              team.slice(0, 4).map((member) => (
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
                className="rounded border border-dashed border-outline/20 bg-surface-container-lowest p-6 text-center text-xs text-on-surface-variant font-mono"
              >
                No Team Members here
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="rounded bg-surface-container-low border border-outline/20 p-4 transition-all">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-on-surface">Activity</h2>
            <span className="text-xs font-mono text-on-surface-variant">Today</span>
          </div>

          <div className="space-y-2">
            {activity.length > 0 ? (
              activity.slice(0, 5).map((item, idx) => (
                <ActivityItem key={`${item}-${idx}`} item={item} />
              ))
            ) : (
              <div
                data-testid="no-activity"
                className="rounded border border-dashed border-outline/20 bg-surface-container-lowest p-6 text-center text-xs text-on-surface-variant font-mono"
              >
                No Activity here
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
