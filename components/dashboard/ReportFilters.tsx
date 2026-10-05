"use client";

import { Button } from "@/components/ui/button";
import { Download, SlidersHorizontal } from "lucide-react";

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
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
          Period:
        </span>
        <div className="flex items-center p-0.5 bg-muted/40 rounded-lg border border-border/50 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onPeriodChange("week")}
            className={`flex-1 sm:flex-initial text-center text-xs font-medium px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              period === "week"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            This week
          </button>
          <button
            type="button"
            onClick={() => onPeriodChange("month")}
            className={`flex-1 sm:flex-initial text-center text-xs font-medium px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              period === "month"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            This month
          </button>
          <button
            type="button"
            onClick={() => onPeriodChange("quarter")}
            className={`flex-1 sm:flex-initial text-center text-xs font-medium px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              period === "quarter"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            This quarter
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            View:
          </span>
          <select
            value={category}
            onChange={(e) =>
              onCategoryChange(e.target.value as "Overview" | "Projects" | "Tasks" | "Team")
            }
            className="h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
          >
            <option value="Overview">Overview</option>
            <option value="Projects">Projects</option>
            <option value="Tasks">Tasks</option>
            <option value="Team">Team</option>
          </select>
        </div>

        {onExport && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="export-report-btn"
            onClick={onExport}
            className="h-8 text-xs font-medium cursor-pointer"
          >
            <Download className="size-3.5 mr-1 text-primary" />
            <span>Export report</span>
          </Button>
        )}
      </div>
    </div>
  );
}
