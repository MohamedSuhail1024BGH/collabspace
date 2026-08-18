"use client";

type Props = {
  period: "week" | "month" | "quarter";
  onPeriodChange: (p: "week" | "month" | "quarter") => void;
  category: "Overview" | "Projects" | "Tasks" | "Team";
  onCategoryChange: (c: "Overview" | "Projects" | "Tasks" | "Team") => void;
};

export function ReportFilters({ period, onPeriodChange, category, onCategoryChange }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-slate-300">Time period</label>
        <div className="flex gap-2">
          <button
            onClick={() => onPeriodChange("week")}
            className={`rounded-full px-3 py-1 text-sm ${period === "week" ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-300"}`}>
            This week
          </button>
          <button
            onClick={() => onPeriodChange("month")}
            className={`rounded-full px-3 py-1 text-sm ${period === "month" ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-300"}`}>
            This month
          </button>
          <button
            onClick={() => onPeriodChange("quarter")}
            className={`rounded-full px-3 py-1 text-sm ${period === "quarter" ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-300"}`}>
            This quarter
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-300">Category</label>
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value as "Overview" | "Projects" | "Tasks" | "Team")}
          className="rounded-md bg-slate-800 px-3 py-1 text-sm text-slate-100">
          <option>Overview</option>
          <option>Projects</option>
          <option>Tasks</option>
          <option>Team</option>
        </select>
      </div>
    </div>
  );
}
