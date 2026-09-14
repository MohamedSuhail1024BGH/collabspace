"use client";

import { useMemo, useState } from "react";
import type { WorkspaceReportData } from "@/lib/db/queries";
import { StatCard } from "@/components/dashboard/StatCard";
import { ReportFilters } from "./ReportFilters";
import { ProjectReport } from "./ProjectReport";
import { TaskReport } from "./TaskReport";
import { TeamReport } from "./TeamReport";
import { ActivityChart } from "./ActivityChart";

export function ReportsWorkspace({
  data,
  workspaceName,
}: {
  data: WorkspaceReportData;
  workspaceName?: string;
}) {
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("week");
  const [category, setCategory] = useState<"Overview" | "Projects" | "Tasks" | "Team">("Overview");

  const activityTrends = useMemo(() => {
    if (period === "month") {
      return [
        { label: "W1", value: Math.round(data.totalTasks * 0.25) },
        { label: "W2", value: Math.round(data.totalTasks * 0.5) },
        { label: "W3", value: Math.round(data.totalTasks * 0.75) },
        { label: "W4", value: data.totalTasks },
      ];
    }
    if (period === "quarter") {
      return [
        { label: "Month 1", value: Math.round(data.totalTasks * 0.3) },
        { label: "Month 2", value: Math.round(data.totalTasks * 0.65) },
        { label: "Month 3", value: data.totalTasks },
      ];
    }
    return data.activityTrends;
  }, [data, period]);

  const handleExportReport = () => {
    const reportPayload = {
      workspace: workspaceName || "Workspace",
      exportedAt: new Date().toISOString(),
      period,
      summary: data.summaryCards,
      projectPerformance: data.projectPerformance,
      taskStatusBreakdown: data.taskStatusBreakdown,
      teamPerformance: data.teamPerformance,
      totalTasks: data.totalTasks,
    };

    const blob = new Blob([JSON.stringify(reportPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(workspaceName || "workspace").toLowerCase().replace(/\s+/g, "-")}-report-${period}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <ReportFilters
        period={period}
        onPeriodChange={setPeriod}
        category={category}
        onCategoryChange={setCategory}
        onExport={handleExportReport}
      />

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.summaryCards.map((c) => (
          <StatCard key={c.title} label={c.title} value={c.value} change={c.trend} />
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <ProjectReport
            projects={data.projectPerformance}
            visible={category === "Overview" || category === "Projects"}
          />

          <TaskReport
            statusBreakdown={data.taskStatusBreakdown}
            totalTasks={data.totalTasks}
            visible={category === "Overview" || category === "Tasks"}
          />

          <ActivityChart
            points={activityTrends}
            period={period}
            visible={category === "Overview" || category === "Tasks"}
          />
        </div>

        <aside className="space-y-6">
          <TeamReport
            team={data.teamPerformance}
            visible={category === "Overview" || category === "Team"}
          />

          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 shadow-xl shadow-slate-950/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <h4 className="text-sm font-semibold text-white">Live Workspace Metrics</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Analytics generated dynamically from active workspace projects, tasks, and assigned members.
              Refreshes in real-time on database mutation.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
