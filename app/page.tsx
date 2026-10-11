import Link from "next/link";
import { ActivityItem } from "@/components/dashboard/ActivityItem";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { TaskRow } from "@/components/dashboard/TaskRow";
import { TeamMember } from "@/components/dashboard/TeamMember";
import { ProjectTimelineWidget } from "@/components/dashboard/ProjectTimelineWidget";
import { WorkloadChartWidget } from "@/components/dashboard/WorkloadChartWidget";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DashboardTask, TaskPriority } from "@/data/mock-data";
import { getDashboardOverview } from "@/lib/db/queries";
import { getActiveWorkspace } from "@/lib/db/workspace";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/auth";
import { formatTimeShort } from "@/lib/format-time";
import { Plus, ArrowRight } from "lucide-react";
import { LandingPage } from "@/components/marketing/LandingPage";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const user = await getCurrentUser();

  if (user) {
    return {
      title: "Dashboard Overview",
      description:
        "Monitor active projects, sprint velocity, priority tasks, and team workload in real time.",
    };
  }

  // Public landing page for visitors who are not signed in.
  return {
    title: {
      absolute: "CollabSpace — The collaborative workspace for product teams",
    },
    description:
      "Explore CollabSpace: organize projects, track tasks, coordinate schedules, chat in real time, and ship faster together. Note: the project is currently insecure and incomplete — a preview for evaluation only.",
  };
}

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) {
    return <LandingPage />;
  }

  const activeWorkspace = await getActiveWorkspace();
  if (!activeWorkspace) {
    redirect("/start");
  }

  const { stats, projects, team, tasks, allTasks, activity } = await getDashboardOverview(
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
    avatar: m.avatar || null,
  }));

  // Activity trend points for Contribution History
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const activityPoints = daysOfWeek.map((day, idx) => {
    const completedForDay = allTasks.filter(
      (t, i) => i % 7 === idx && t.status === "Completed"
    ).length;
    return {
      label: day,
      value: completedForDay,
    };
  });

  return (
    <div className="flex flex-col gap-5 sm:gap-6 pb-12 w-full max-w-full overflow-hidden">
      {/* Top Header Command Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80 w-full min-w-0">
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
            Welcome to {activeWorkspace.name}
          </h1>
          <p className="text-xs text-muted-foreground truncate">
            Workspace overview and active team progress
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <Button variant="outline" size="sm" asChild className="gap-1.5 h-8 rounded-full shadow-xs text-xs">
            <Link href="/projects">
              <Plus className="size-3.5" />
              <span>New Project</span>
            </Link>
          </Button>
          <Button size="sm" asChild className="gap-1.5 h-8 rounded-full shadow-xs text-xs">
            <Link href="/tasks">
              <Plus className="size-3.5" />
              <span>Quick Issue</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Metric Stat Cards (2-col mobile, 4-col desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full min-w-0">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            change={stat.change}
          />
        ))}
      </div>

      {/* Row 1: Contribution History & Workload Distribution */}
      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr] w-full min-w-0">
        <ActivityChart points={activityPoints} period="week" />
        <WorkloadChartWidget members={mappedTeam} tasks={allTasks} />
      </section>

      {/* Row 2: Project Timeline */}
      <section className="w-full min-w-0">
        <ProjectTimelineWidget
          tasks={allTasks.map((t) => ({
            id: t.id,
            title: t.title,
            assignee: t.assignee,
            priority: t.priority as "High" | "Medium" | "Low",
            status: t.status,
            due: t.due,
          }))}
          teamMembers={mappedTeam}
        />
      </section>

      {/* Row 3: Priority Tasks & Featured Projects */}
      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr] w-full min-w-0">
        {/* Priority Tasks */}
        <Card className="min-w-0 overflow-hidden rounded-2xl border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex flex-col gap-0.5">
              <CardTitle className="text-base font-semibold">Priority Tasks</CardTitle>
              <CardDescription className="text-xs">
                Immediate action items requiring focus
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="gap-1 text-xs text-foreground hover:bg-secondary">
              <Link href="/tasks">
                Add task
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="flex flex-col gap-2 pt-0">
            {formattedTasks.length > 0 ? (
              formattedTasks.slice(0, 5).map((task) => (
                <TaskRow key={task.id} task={task} />
              ))
            ) : (
              <div
                data-testid="no-priority-tasks"
                className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-center text-xs text-muted-foreground font-mono"
              >
                No Priority Tasks here
              </div>
            )}
          </CardContent>
        </Card>

        {/* Featured Projects */}
        <Card className="min-w-0 overflow-hidden rounded-2xl border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex flex-col gap-0.5">
              <CardTitle className="text-base font-semibold">Featured Projects</CardTitle>
              <CardDescription className="text-xs">
                High-priority organizational initiatives
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="gap-1 text-xs text-foreground hover:bg-secondary">
              <Link href="/projects">
                View all
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="flex flex-col gap-2.5 pt-0">
            {projects.length > 0 ? (
              projects.slice(0, 3).map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))
            ) : (
              <div
                data-testid="no-featured-projects"
                className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-center text-xs text-muted-foreground font-mono"
              >
                No Featured Projects here
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Row 4: Team Updates & Activity */}
      <section className="grid gap-4 xl:grid-cols-[1fr_1.4fr] w-full min-w-0">
        {/* Team Updates */}
        <Card className="min-w-0 overflow-hidden rounded-2xl border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Team Members</CardTitle>
            <Badge variant="secondary" className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 rounded-full">
              {team.filter((m) => m.online).length} online
            </Badge>
          </CardHeader>

          <CardContent className="flex flex-col gap-1.5 pt-0">
            {team.length > 0 ? (
              team.slice(0, 4).map((member) => (
                <TeamMember
                  key={member.id}
                  member={{
                    name: member.name,
                    role: member.role,
                    color: member.color,
                    avatar: member.avatar || null,
                  }}
                />
              ))
            ) : (
              <div
                data-testid="no-team-members"
                className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-center text-xs text-muted-foreground font-mono"
              >
                No Team Members here
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="min-w-0 overflow-hidden rounded-2xl border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
            <Badge variant="secondary" className="text-[10px] font-mono rounded-full">
              Today
            </Badge>
          </CardHeader>

          <CardContent className="flex flex-col gap-1 pt-0">
            {activity.length > 0 ? (
              activity.slice(0, 5).map((item, idx) => (
                <ActivityItem
                  key={`${item.content}-${idx}`}
                  item={item.content}
                  time={item.createdAt ? formatTimeShort(item.createdAt) : undefined}
                />
              ))
            ) : (
              <div
                data-testid="no-activity"
                className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-center text-xs text-muted-foreground font-mono"
              >
                No Activity here
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
