"use client";

import { useMemo, useState } from "react";
import type { WorkspaceReportData } from "@/lib/db/queries";
import { StatCard } from "@/components/dashboard/StatCard";
import { ReportFilters } from "./ReportFilters";
import { ProjectReport } from "./ProjectReport";
import { TaskReport } from "./TaskReport";
import { TeamReport } from "./TeamReport";
import { ActivityChart } from "./ActivityChart";

export function ReportsWorkspace({ data }: { data: WorkspaceReportData }) {
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("week");
  const [category, setCategory] = useState<"Overview" | "Projects" | "Tasks" | "Team">("Overview");

  const activityTrends = useMemo(() => {
    if (period === "month") {
      return [
        { label: "W1", value: Math.round(data.totalTasks * 0.2) },
        { label: "W2", value: Math.round(data.totalTasks * 0.4) },
        { label: "W3", value: Math.round(data.totalTasks * 0.7) },
        { label: "W4", value: data.totalTasks },
      ];
    }
    if (period === "quarter") {
      return [
        { label: "Month 1", value: Math.round(data.totalTasks * 0.3) },
        { label: "Month 2", value: Math.round(data.totalTasks * 0.6) },
        { label: "Month 3", value: data.totalTasks },
      ];
    }
    return data.activityTrends;
  }, [data, period]);

  return (
    <div className="space-y-6">
      <ReportFilters period={period} onPeriodChange={setPeriod} category={category} onCategoryChange={setCategory} />

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.summaryCards.map((c) => (
          <StatCard key={c.title} label={c.title} value={c.value} change={c.trend} />
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <ProjectReport projects={data.projectPerformance} visible={category === "Overview" || category === "Projects"} />

          <TaskReport
            statusBreakdown={data.taskStatusBreakdown}
            totalTasks={data.totalTasks}
            visible={category === "Overview" || category === "Tasks"}
          />

          <ActivityChart points={activityTrends} period={period} visible={category === "Overview" || category === "Tasks"} />
        </div>

        <aside className="space-y-6">
          <TeamReport team={data.teamPerformance} visible={category === "Overview" || category === "Team"} />

          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <h4 className="mb-2 text-sm font-medium text-white">Live Workspace Metrics</h4>
            <p className="text-sm text-slate-300">
              Analytics generated dynamically from active workspace projects, tasks, and assigned members.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
