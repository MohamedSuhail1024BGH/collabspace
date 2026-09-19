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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-1">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="font-label-sm text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
          Period:
        </span>
        <div className="flex items-center p-0.5 bg-surface-container-lowest rounded border border-outline/20">
          <button
            type="button"
            onClick={() => onPeriodChange("week")}
            className={`font-label-sm text-xs px-3 py-1 rounded transition-colors ${
              period === "week"
                ? "bg-surface-container text-on-surface font-medium shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            This week
          </button>
          <button
            type="button"
            onClick={() => onPeriodChange("month")}
            className={`font-label-sm text-xs px-3 py-1 rounded transition-colors ${
              period === "month"
                ? "bg-surface-container text-on-surface font-medium shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            This month
          </button>
          <button
            type="button"
            onClick={() => onPeriodChange("quarter")}
            className={`font-label-sm text-xs px-3 py-1 rounded transition-colors ${
              period === "quarter"
                ? "bg-surface-container text-on-surface font-medium shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            This quarter
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-2">
          <span className="font-label-sm text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            View:
          </span>
          <select
            value={category}
            onChange={(e) =>
              onCategoryChange(e.target.value as "Overview" | "Projects" | "Tasks" | "Team")
            }
            className="rounded border border-outline/20 bg-surface-container-lowest px-3 py-1 text-xs text-on-surface focus:border-primary focus:outline-none"
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
            className="inline-flex items-center gap-1.5 rounded border border-outline/20 bg-surface-container px-3 py-1 text-xs font-medium text-on-surface transition hover:bg-surface-container-high shadow-sm"
          >
            <svg
              className="h-3.5 w-3.5 text-primary"
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
