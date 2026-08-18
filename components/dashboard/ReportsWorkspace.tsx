"use client";

import { useMemo, useState } from "react";
import { reportDataByPeriod } from "@/data/mock-data";
import { StatCard } from "@/components/dashboard/StatCard";
import { ReportFilters } from "./ReportFilters";
import { ProjectReport } from "./ProjectReport";
import { TaskReport } from "./TaskReport";
import { TeamReport } from "./TeamReport";
import { ActivityChart } from "./ActivityChart";

export function ReportsWorkspace() {
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("week");
  const [category, setCategory] = useState<"Overview" | "Projects" | "Tasks" | "Team">("Overview");

  const reportData = useMemo(() => reportDataByPeriod[period], [period]);

  return (
    <div className="space-y-6">
      <ReportFilters period={period} onPeriodChange={setPeriod} category={category} onCategoryChange={setCategory} />

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {reportData.summaryCards.map((c) => (
          <StatCard key={c.title} label={c.title} value={c.value} change={c.trend} />
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <ProjectReport projects={reportData.projectPerformance} visible={category === "Overview" || category === "Projects"} />

          <TaskReport statusBreakdown={reportData.taskStatusBreakdown} totalTasks={reportData.taskStatusBreakdown.reduce((s, r) => s + r.count, 0)} visible={category === "Overview" || category === "Tasks"} />

          <ActivityChart points={reportData.activityTrends} period={period} visible={category === "Overview" || category === "Tasks"} />
        </div>

        <aside className="space-y-6">
          <TeamReport team={reportData.teamPerformance} visible={category === "Overview" || category === "Team"} />

          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <h4 className="mb-2 text-sm font-medium text-white">Quick notes</h4>
            <p className="text-sm text-slate-300">All reports are generated from deterministic mock data stored in the repository. Filters are client-side only.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
