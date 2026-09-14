"use client";

type Props = {
  period: "week" | "month" | "quarter";
  onPeriodChange: (p: "week" | "month" | "quarter") => void;
  category: "Overview" | "Projects" | "Tasks" | "Team";
  onCategoryChange: (c: "Overview" | "Projects" | "Tasks" | "Team") => void;
  onExport?: () => void;
};

export function ReportFilters({
  period,
  onPeriodChange,
  category,
  onCategoryChange,
  onExport,
}: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Period:
        </span>
        <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-slate-950/60 p-1">
          <button
            type="button"
            onClick={() => onPeriodChange("week")}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
              period === "week"
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                : "text-slate-300 hover:text-white"
            }`}
          >
            This week
          </button>
          <button
            type="button"
            onClick={() => onPeriodChange("month")}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
              period === "month"
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                : "text-slate-300 hover:text-white"
            }`}
          >
            This month
          </button>
          <button
            type="button"
            onClick={() => onPeriodChange("quarter")}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
              period === "quarter"
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                : "text-slate-300 hover:text-white"
            }`}
          >
            This quarter
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            View:
          </span>
          <select
            value={category}
            onChange={(e) =>
              onCategoryChange(e.target.value as "Overview" | "Projects" | "Tasks" | "Team")
            }
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-1.5 text-xs text-white focus:border-violet-400/50 focus:outline-none"
          >
            <option value="Overview">Overview</option>
            <option value="Projects">Projects</option>
            <option value="Tasks">Tasks</option>
            <option value="Team">Team</option>
          </select>
        </div>

        {onExport && (
          <button
            type="button"
            data-testid="export-report-btn"
            onClick={onExport}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white"
          >
            <svg
              className="h-3.5 w-3.5 text-violet-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>Export report</span>
          </button>
        )}
      </div>
    </div>
  );
}
